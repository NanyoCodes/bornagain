'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, doc, updateDoc, writeBatch, where, getDoc, serverTimestamp, arrayRemove } from 'firebase/firestore';
import type { Notification, Soul } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, HeartHandshake, Target, Users, CheckCircle2, MessageSquare, Info, XCircle, ArrowLeft, CircleAlert, UserMinus, Utensils, Gift, Sparkles, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn, safeToDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ScrollArea } from '@/components/ui/scroll-area';

const NOTIFICATION_TYPES = [
  'campaign_join', 
  'new_chat_message', 
  'accountability_nudge', 
  'accountability_request', 
  'request_accepted', 'request_declined', 
  'accountability_partner_removed',
  'new_soul_in_fellowship',
  'soul_unassigned_from_fellowship'
];

function getNotificationIcon(type: string, actionId?: string) {
    switch (type) {
        case 'pending_provision':
            return actionId === 'shared_meal' 
                ? <Utensils className="h-4 w-4 text-primary animate-pulse" />
                : <Gift className="h-4 w-4 text-primary animate-pulse" />;
        case 'campaign_join':
            return <Target className="h-4 w-4 text-orange-500" />;
        case 'accountability_request':
        case 'accountability_nudge':
            return <HeartHandshake className="h-4 w-4 text-primary" />;
        case 'request_accepted':
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case 'request_declined':
        case 'accountability_partner_removed':
            return <XCircle className="h-4 w-4 text-destructive" />;
        case 'new_soul_in_fellowship':
            return <Users className="h-4 w-4 text-blue-500" />;
        case 'new_chat_message':
            return <MessageSquare className="h-4 w-4 text-primary" />;
        case 'soul_unassigned_from_fellowship':
            return <UserMinus className="h-4 w-4 text-destructive" />;
        default:
            return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
}

export default function NotificationsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [pendingProvisions, setPendingProvisions] = useState<any[]>([]);

  const checkPending = useCallback(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('testify_pending_provisions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPendingProvisions(Array.isArray(parsed) ? parsed : []);
      } catch (e) { setPendingProvisions([]); }
    } else { setPendingProvisions([]); }
  }, []);

  useEffect(() => {
    checkPending();
    window.addEventListener('testify_pending_action_update', checkPending);
    window.addEventListener('storage', checkPending);
    return () => {
      window.removeEventListener('testify_pending_action_update', checkPending);
      window.removeEventListener('storage', checkPending);
    };
  }, [checkPending]);

  const handleRemovePending = async (e: React.MouseEvent, soulId: string, actionId: string) => {
    e.stopPropagation();
    
    // 1. Update local storage
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('testify_pending_provisions');
        if (stored) {
            try {
                let provisions = JSON.parse(stored);
                if (Array.isArray(provisions)) {
                    provisions = provisions.filter((p: any) => !(p.soulId === soulId && p.actionId === actionId));
                    if (provisions.length === 0) {
                        localStorage.removeItem('testify_pending_provisions');
                    } else {
                        localStorage.setItem('testify_pending_provisions', JSON.stringify(provisions));
                    }
                    window.dispatchEvent(new Event('testify_pending_action_update'));
                }
            } catch (e) {
                localStorage.removeItem('testify_pending_provisions');
            }
        }
    }

    // 2. Sync with Firestore - Remove only the "Initiated" soul history record
    if (!user || !firestore) return;

    try {
        const soulUserRef = doc(firestore, 'users', user.uid, 'souls', soulId);
        const globalSoulRef = doc(firestore, 'souls', soulId);

        const soulDoc = await getDoc(soulUserRef);
        if (soulDoc.exists()) {
            const soulData = soulDoc.data() as Soul;
            const updatedLog = (soulData.followUpLog || []).filter(log => 
                !(log.actions?.includes(actionId) && log.note?.includes('Initiated'))
            );
            
            await updateDoc(soulUserRef, { followUpLog: updatedLog, lastUpdatedAt: serverTimestamp() });
            await updateDoc(globalSoulRef, { followUpLog: updatedLog, lastUpdatedAt: serverTimestamp() });
        }
    } catch (error) {
        console.error("Failed to sync pending removal:", error);
    }
  };

  const notificationsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(
        collection(firestore, `users/${user.uid}/notifications`),
        where('type', 'in', NOTIFICATION_TYPES)
    );
  }, [user?.uid, firestore]);

  const { data: notificationsData, loading } = useCollection<Notification>(notificationsQuery);

  const notifications = useMemo(() => {
    if (!notificationsData) return null;
    return [...notificationsData].sort((a, b) => {
        const timeA = safeToDate(a.createdAt)?.getTime() ?? 0;
        const timeB = safeToDate(b.createdAt)?.getTime() ?? 0;
        return timeB - timeA;
    });
  }, [notificationsData]);

  const allDisplayItems = useMemo(() => {
    const items = notifications ? [...notifications] : [];
    
    const virtualNotifs = pendingProvisions.map(p => ({
        id: `pending-${p.soulId}-${p.actionId}`,
        userId: user?.uid || '',
        type: 'pending_provision',
        title: `Pending act of kindness: ${p.soulName}`,
        message: `You initiated a ${p.actionId === 'shared_meal' ? 'meal' : 'gift'} provision but haven't fulfilled it yet. Click to finish the order.`,
        link: p.actionId === 'shared_meal' 
            ? `/dashboard/marketplace?soulId=${p.soulId}&soulName=${encodeURIComponent(p.soulName)}&actionId=${p.actionId}`
            : `/dashboard/marketplace/gifts?soulId=${p.soulId}&soulName=${encodeURIComponent(p.soulName)}&actionId=${p.actionId}`,
        isRead: false,
        createdAt: { toDate: () => new Date(p.timestamp || Date.now()) } as any,
        isVirtual: true,
        actionId: p.actionId,
        soulId: p.soulId
    }));

    return [...virtualNotifs, ...items];
  }, [notifications, pendingProvisions, user?.uid]);

  const handleNotificationClick = (notification: any) => {
    if (!user || !firestore) return;
    
    if (!notification.isVirtual && !notification.isRead) {
      const notifRef = doc(firestore, `users/${user.uid}/notifications`, notification.id);
      updateDoc(notifRef, { isRead: true }).catch(() => {
         const permissionError = new FirestorePermissionError({
              path: notifRef.path,
              operation: 'update',
          }, user);
          errorEmitter.emit('permission-error', permissionError);
      });
    }

    if (notification.link) {
      router.push(notification.link);
    }
  };
  
  const handleMarkAllAsRead = () => {
    if (!user || !firestore || !notifications) return;
    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;

    const batch = writeBatch(firestore);
    unreadNotifications.forEach(notification => {
        const notifRef = doc(firestore, `users/${user.uid}/notifications`, notification.id);
        batch.update(notifRef, { isRead: true });
    });
    
    batch.commit().catch(() => {
        const permissionError = new FirestorePermissionError({
            path: `users/${user.uid}/notifications`,
            operation: 'update',
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    });
  };
  
  const unreadCount = useMemo(() => notifications?.filter(n => !n.isRead).length ?? 0, [notifications]);

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <div className="flex-shrink-0 p-4 sm:p-6 md:p-8 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0">
                <ArrowLeft className="h-6 w-6" />
                <span className="sr-only">Back</span>
            </Button>
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-headline tracking-tight uppercase truncate">
                Notifications
                </h1>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] truncate">
                Kingdom Alerts
                </p>
            </div>
          </div>
          {!loading && notifications && notifications.length > 0 && unreadCount > 0 && (
               <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleMarkAllAsRead} 
                  className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/5 h-8 rounded-full px-3 sm:px-4 shrink-0 shadow-sm border border-primary/10 sm:border-none"
              >
                  Mark all as read
              </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 px-0 sm:px-6 md:px-8 pb-4">
        <Card className="h-full flex flex-col overflow-hidden border-x-0 sm:border-x rounded-none sm:rounded-3xl shadow-xl bg-card border-y sm:border-y-0">
            <ScrollArea className="flex-1 w-full">
                <div className="flex flex-col">
                    {loading && (
                        <div className="divide-y p-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="py-6 flex items-start gap-4">
                                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                        </div>
                    )}
                    {!loading && allDisplayItems.length === 0 && (
                        <div className="py-24 text-center px-8 flex flex-col items-center justify-center flex-1">
                            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                                <Bell className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground opacity-20" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold font-headline uppercase tracking-tight">No Alerts Yet</h3>
                            <p className="mt-2 text-xs sm:text-sm text-muted-foreground italic max-w-[280px] leading-relaxed">
                                Stay focused on the harvest. We'll notify you here about campaign activity and partner requests.
                            </p>
                        </div>
                    )}
                    <div className="divide-y">
                        {!loading && user && allDisplayItems.map(notification => {
                            const createdAt = safeToDate(notification.createdAt);
                            const isVirtual = (notification as any).isVirtual;
                            
                            return (
                                <div key={notification.id} className="relative">
                                    <button
                                        onClick={() => handleNotificationClick(notification)}
                                        className={cn(
                                            "w-full text-left p-3.5 sm:p-6 transition-all hover:bg-muted/50 active:bg-muted/80 relative border-l-4 overflow-hidden",
                                            isVirtual ? "bg-primary/[0.05] border-l-primary shadow-inner" : (!notification.isRead ? "bg-primary/[0.03] border-l-primary" : "opacity-60 border-l-transparent")
                                        )}
                                    >
                                        <div className="flex items-start gap-2.5 sm:gap-5">
                                            <div className={cn(
                                                "mt-0.5 shrink-0 p-2 sm:p-2.5 rounded-xl border shadow-sm",
                                                isVirtual ? "bg-primary text-white border-none scale-110 shadow-lg" : "bg-background"
                                            )}>
                                                {getNotificationIcon(notification.type, (notification as any).actionId)}
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 sm:gap-3 mb-1">
                                                    <p className={cn(
                                                        "font-bold text-sm sm:text-base leading-snug break-words pr-8 sm:pr-0", 
                                                        isVirtual ? "text-primary" : (!notification.isRead ? "text-foreground" : "text-muted-foreground")
                                                    )}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tighter text-muted-foreground whitespace-nowrap shrink-0">
                                                        {isVirtual ? 'ACTION REQUIRED' : (createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : '')}
                                                    </span>
                                                </div>
                                                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium line-clamp-3 text-balance">
                                                    {notification.message}
                                                </p>
                                                {createdAt && (
                                                    <p className="text-[9px] text-muted-foreground/50 uppercase font-black tracking-widest pt-1.5">
                                                        {format(createdAt, 'PPP')}
                                                    </p>
                                                )}
                                            </div>
                                            {(!notification.isRead || isVirtual) && (
                                                <div className="shrink-0 flex items-center h-full pt-1.5 sm:pt-2">
                                                    <div className={cn(
                                                        "h-2 w-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(249,116,22,0.5)]",
                                                        isVirtual ? "bg-primary scale-125" : "bg-primary"
                                                    )} />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                    
                                    {isVirtual && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="absolute top-2 right-2 sm:top-4 sm:right-4 h-8 w-8 rounded-full text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 z-10"
                                            onClick={(e) => handleRemovePending(e, (notification as any).soulId, (notification as any).actionId)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    
                    <div className="h-20 md:hidden shrink-0" />
                    
                    <footer className="p-8 text-center space-y-2 border-t mt-auto">
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground/40 font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                          <CircleAlert className="h-3 w-3" /> Notifications are purged after 30 days of inactivity
                        </p>
                    </footer>
                </div>
            </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
