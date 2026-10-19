'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, doc, updateDoc, writeBatch, where, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import type { Notification, Soul } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, HeartHandshake, Target, Users, CheckCircle2, MessageSquare, Info, XCircle, ArrowLeft, CircleAlert, UserMinus, Utensils, Gift, Sparkles, X, ShoppingBag, Package, Cake } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn, safeToDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const NOTIFICATION_TYPES = [
  'campaign_join', 
  'new_chat_message', 
  'accountability_nudge', 
  'accountability_request', 
  'request_accepted', 
  'request_declined', 
  'accountability_partner_removed',
  'new_soul_in_fellowship',
  'soul_unassigned_from_fellowship',
  'new_order', 
  'order_update',
  'birthday_reminder',
  'pending_provision'
];

function getNotificationIcon(type: string, actionId?: string) {
    switch (type) {
        case 'birthday_reminder':
            return <Cake className="h-4 w-4 text-primary" />;
        case 'new_order':
            return <ShoppingBag className="h-4 w-4 text-primary" />;
        case 'order_update':
            return <Package className="h-4 w-4 text-primary" />;
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
  const { toast } = useToast();
  const [filter, setFilter] = useState('all');
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  const notificationsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(
        collection(firestore, `users/${user.uid}/notifications`),
        where('type', 'in', NOTIFICATION_TYPES)
    );
  }, [user?.uid, firestore]);

  const { data: notificationsData, loading } = useCollection<Notification>(notificationsQuery);

  const notifications = useMemo(() => {
    if (!notificationsData) return [];
    return [...notificationsData].sort((a, b) => {
        const timeA = safeToDate(a.createdAt)?.getTime() ?? 0;
        const timeB = safeToDate(b.createdAt)?.getTime() ?? 0;
        return timeB - timeA;
    });
  }, [notificationsData]);

  const allDisplayItems = useMemo(() => {
    let combined = [...notifications];

    if (filter === 'unread') {
        return combined.filter(i => !i.isRead);
    }

    if (filter === 'kindness') {
        return combined.filter(i => 
            i.type === 'pending_provision' || 
            i.type === 'new_order' || 
            i.type === 'order_update'
        );
    }

    if (filter === 'general') {
        return combined.filter(i => 
            i.type !== 'pending_provision' && 
            i.type !== 'new_order' && 
            i.type !== 'order_update'
        );
    }

    return combined;
  }, [notifications, filter]);

  const handleNotificationClick = (notification: any) => {
    if (!user || !firestore) return;
    
    if (notification.type !== 'pending_provision' && !notification.isRead) {
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
    const unreadNotificationsList = notifications.filter(n => !n.isRead && n.type !== 'pending_provision');
    if (unreadNotificationsList.length === 0) return;

    const batch = writeBatch(firestore);
    unreadNotificationsList.forEach(notification => {
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
  
  const unreadCount = useMemo(() => notifications?.filter(n => !n.isRead && n.type !== 'pending_provision').length ?? 0, [notifications]);

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden text-left">
      <div className="flex-shrink-0 p-4 sm:p-6 md:p-8 pb-4 text-left">
        <div className="flex flex-col gap-6 text-left">
            <div className="flex items-center justify-between gap-4 text-left">
                <div className="flex items-center gap-4 min-w-0 text-left">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm text-left">
                        <ArrowLeft className="h-6 w-6 text-left" />
                        <span className="sr-only text-left">Back</span>
                    </Button>
                    <div className="space-y-0.5 sm:space-y-1 min-w-0 text-left">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-headline tracking-tight uppercase truncate text-left">
                        Notifications
                        </h1>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] truncate text-left">
                        Kingdom Alerts
                        </p>
                        {!loading && notifications && notifications.length > 0 && unreadCount > 0 && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleMarkAllAsRead} 
                                className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/5 h-10 rounded-full px-6 shrink-0 shadow-sm border border-primary/10 text-left mt-2"
                            >
                                Mark all as read
                            </Button>
                        )}
                    </div>
                </div>
                {logo && (
                    <Link href="/testimonies" className="shrink-0 transition-transform active:scale-95 text-left">
                        <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-lg text-left">
                            <AvatarImage src={logo.imageUrl} alt="Testify" className="object-cover text-left" />
                            <AvatarFallback className="font-black bg-primary/10 text-primary text-left">T</AvatarFallback>
                        </Avatar>
                    </Link>
                )}
            </div>

            <Tabs value={filter} onValueChange={setFilter} className="w-full text-left">
                <TabsList className="grid w-full grid-cols-4 h-11 bg-muted/30 p-1 rounded-2xl text-left">
                    <TabsTrigger value="all" className="text-[10px] font-black uppercase tracking-widest rounded-xl text-left">All</TabsTrigger>
                    <TabsTrigger value="unread" className="text-[10px] font-black uppercase tracking-widest rounded-xl text-left">Unread</TabsTrigger>
                    <TabsTrigger value="kindness" className="text-[10px] font-black uppercase tracking-widest rounded-xl text-left">Kindness</TabsTrigger>
                    <TabsTrigger value="general" className="text-[10px] font-black uppercase tracking-widest rounded-xl text-left">Others</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-0 sm:px-6 md:px-8 pb-4 text-left">
        <Card className="h-full flex flex-col overflow-hidden border-x-0 sm:border-x rounded-none sm:rounded-3xl shadow-xl bg-card border-y sm:border-y-0 text-left">
            <ScrollArea className="flex-1 w-full text-left">
                <div className="flex flex-col text-left">
                    {loading && (
                        <div className="divide-y p-4 text-left">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="py-6 flex items-start gap-4 text-left">
                                <Skeleton className="h-10 w-10 rounded-full shrink-0 text-left" />
                                <div className="flex-1 space-y-2 text-left">
                                    <Skeleton className="h-4 w-3/4 text-left" />
                                    <Skeleton className="h-3 w-1/2 text-left" />
                                </div>
                            </div>
                        ))}
                        </div>
                    )}
                    {!loading && allDisplayItems.length === 0 && (
                        <div className="py-24 text-center px-8 flex flex-col items-center justify-center flex-1 text-left text-left">
                            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-muted/20 rounded-full flex items-center justify-center mb-6 text-left">
                                {filter === 'kindness' ? <Gift className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground opacity-20 text-left" /> : <Bell className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground opacity-20 text-left" />}
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold font-headline uppercase tracking-tight text-left text-left">No {filter !== 'all' ? filter : ''} Alerts</h3>
                            <p className="mt-2 text-xs sm:text-sm text-muted-foreground italic max-w-[280px] leading-relaxed text-left text-left text-left">
                                Stay focused on the harvest. We'll notify you here about activities in the Kingdom Network.
                            </p>
                        </div>
                    )}
                    <div className="divide-y text-left">
                        {!loading && user && allDisplayItems.map(notification => {
                            const createdAt = safeToDate(notification.createdAt);
                            const isPendingAction = notification.type === 'pending_provision';
                            
                            return (
                                <div key={notification.id} className="relative text-left">
                                    <button
                                        onClick={() => handleNotificationClick(notification)}
                                        className={cn(
                                            "w-full text-left p-3.5 sm:p-6 transition-all hover:bg-muted/50 active:bg-muted/80 relative border-l-4 overflow-hidden text-left",
                                            isPendingAction ? "bg-primary/[0.05] border-l-primary shadow-inner" : (!notification.isRead ? "bg-primary/[0.03] border-l-primary" : "opacity-60 border-l-transparent")
                                        )}
                                    >
                                        <div className="flex items-start gap-2.5 sm:gap-5 text-left">
                                            <div className={cn(
                                                "mt-0.5 shrink-0 p-2 sm:p-2.5 rounded-xl border shadow-sm text-left",
                                                isPendingAction ? "bg-primary text-white border-none scale-110 shadow-lg" : "bg-background"
                                            )}>
                                                {getNotificationIcon(notification.type, (notification as any).actionId)}
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-1 text-left">
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 sm:gap-3 mb-1 text-left text-left">
                                                    <p className={cn(
                                                        "font-bold text-sm sm:text-base leading-snug break-words pr-8 sm:pr-0 text-left", 
                                                        isPendingAction ? "text-primary" : (!notification.isRead ? "text-foreground" : "text-muted-foreground")
                                                    )}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tighter text-muted-foreground whitespace-nowrap shrink-0 text-left">
                                                        {isPendingAction ? 'ACTION REQUIRED' : (createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : '')}
                                                    </span>
                                                </div>
                                                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium line-clamp-3 text-balance text-left">
                                                    {notification.message}
                                                </p>
                                                {createdAt && (
                                                    <p className="text-[9px] text-muted-foreground/50 uppercase font-black tracking-widest pt-1.5 text-left">
                                                        {format(createdAt, 'PPP')}
                                                    </p>
                                                )}
                                            </div>
                                            {(!notification.isRead || isPendingAction) && (
                                                <div className="shrink-0 flex items-center h-full pt-1.5 sm:pt-2 text-left">
                                                    <div className={cn(
                                                        "h-2 w-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(249,116,22,0.5)] text-left",
                                                        isPendingAction ? "bg-primary scale-125" : "bg-primary"
                                                    )} />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                    
                    <footer className="p-8 text-center space-y-2 border-t mt-auto text-left">
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground/40 font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 text-left">
                          <CircleAlert className="h-3 w-3 text-left" /> Notifications are purged after 30 days of inactivity
                        </p>
                    </footer>
                </div>
            </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
