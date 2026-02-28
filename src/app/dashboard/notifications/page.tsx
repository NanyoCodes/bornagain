'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function NotificationsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const notificationsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/notifications`), orderBy('createdAt', 'desc'));
  }, [user?.uid, firestore]);

  const { data: notifications, loading } = useCollection<Notification>(notificationsQuery);

  const handleNotificationClick = async (notification: Notification) => {
    if (!user || !firestore) return;
    
    try {
      if (!notification.isRead) {
        const notifRef = doc(firestore, `users/${user.uid}/notifications`, notification.id);
        await updateDoc(notifRef, { isRead: true });
      }
    } catch (error) {
       const permissionError = new FirestorePermissionError({
            path: `users/${user.uid}/notifications/${notification.id}`,
            operation: 'update',
            requestResourceData: { isRead: true },
        });
        errorEmitter.emit('permission-error', permissionError);
        // Continue to navigate even if marking as read fails
    }

    if (notification.link) {
      router.push(notification.link);
    }
  };
  
  const handleMarkAllAsRead = async () => {
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
            requestResourceData: { isRead: true },
        });
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
            <p className="text-muted-foreground">
                All your recent updates and alerts.
            </p>
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
            {!loading && user && notifications?.map(notification => (
                <button
                    key={notification.id} 
                    onClick={() => handleNotificationClick(notification)}
                    disabled={!notification.link}
                    className={cn(
                        "block w-full text-left p-4 hover:bg-muted/50 active:bg-muted/50 transition-colors",
                        !notification.link && "cursor-default"
                    )}
                >
                    <div className="flex items-start gap-4">
                        <div className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", !notification.isRead ? "bg-primary" : "")} />
                        <div className="flex-1 space-y-1">
                            <p className="font-semibold">{notification.title}</p>
                            <p className="text-sm text-muted-foreground">{notification.message}</p>
                            <p className="text-xs text-muted-foreground">
                                {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : ''}
                            </p>
                        </div>
                    </div>
                </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
