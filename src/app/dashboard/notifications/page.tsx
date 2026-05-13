
'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, writeBatch, where } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function NotificationsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Unified notification types list to match AppHeader
  const otherNotificationTypes = [
    'campaign_join', 
    'accountability_nudge', 
    'accountability_request', 
    'request_accepted', 
    'request_declined', 
    'accountability_partner_removed',
    'new_soul_in_fellowship'
  ];

  const notificationsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(
        collection(firestore, `users/${user.uid}/notifications`),
        where('type', 'in', otherNotificationTypes),
        where('isRead', '==', false)
    );
  }, [user?.uid, firestore, otherNotificationTypes]);

  const { data: notificationsData, loading } = useCollection<Notification>(notificationsQuery);

  const notifications = useMemo(() => {
    if (!notificationsData) return null;
    return [...notificationsData].sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
    });
  }, [notificationsData]);

  const handleNotificationClick = (notification: Notification) => {
    if (!user || !firestore) return;
    
    if (!notification.isRead) {
      const notifRef = doc(firestore, `users/${user.uid}/notifications`, notification.id);
      updateDoc(notifRef, { isRead: true }).catch(() => {
         const permissionError = new FirestorePermissionError({
              path: notifRef.path,
              operation: 'update',
              requestResourceData: { isRead: true },
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
    const notificationRefs: string[] = [];
    unreadNotifications.forEach(notification => {
        const notifRef = doc(firestore, `users/${user.uid}/notifications`, notification.id);
        notificationRefs.push(notifRef.path);
        batch.update(notifRef, { isRead: true });
    });
    
    batch.commit().catch(() => {
        const permissionError = new FirestorePermissionError({
            path: `users/${user.uid}/notifications`,
            operation: 'update',
            requestResourceData: { isRead: true, updatedDocs: notificationRefs },
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    });
  };
  
  const unreadCount = useMemo(() => notifications?.filter(n => !n.isRead).length ?? 0, [notifications]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline">
                Notifications
            </h1>
        </div>
        {!loading && notifications && notifications.length > 0 && (
             <Button onClick={handleMarkAllAsRead} disabled={loading || unreadCount === 0}>
                Mark all as read
            </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && (
            <div className="divide-y">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && (!notifications || notifications.length === 0) && (
            <div className="p-12 text-center">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Notifications</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You're all caught up!
              </p>
            </div>
          )}
          <div className="divide-y">
            {!loading && user && notifications?.map(notification => {
                const createdAt = notification.createdAt.toDate();
                return (
                    <button
                        key={notification.id} 
                        onClick={() => handleNotificationClick(notification)}
                        disabled={!notification.link}
                        className={cn(
                            "block w-full text-left p-4 hover:bg-muted/50 active:bg-muted/50 transition-colors",
                            !notification.link && "cursor-default",
                            notification.isRead && "opacity-60"
                        )}
                    >
                        <div className="flex items-start gap-4">
                            <div className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", !notification.isRead ? "bg-primary" : "bg-border")} />
                            <div className="flex-1 space-y-1">
                                <p className="font-semibold">{notification.title}</p>
                                <p className="text-sm text-muted-foreground">{notification.message}</p>
                                <p className="text-xs text-muted-foreground">
                                    {isToday(createdAt) ? format(createdAt, 'p') : format(createdAt, 'P')}
                                </p>
                            </div>
                        </div>
                    </button>
                )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
