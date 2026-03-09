'use client';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Chat, Notification } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useMemo } from 'react';
import { MessagesSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

function ChatListItem({ chat, currentUserId, isUnread }: { chat: Chat, currentUserId: string, isUnread: boolean }) {
    const router = useRouter();
    const lastUpdatedAt = chat.lastUpdatedAt?.toDate ? chat.lastUpdatedAt.toDate() : new Date();

    const containerClasses = cn(
        "block hover:bg-muted/50 active:bg-muted/50 transition-colors cursor-pointer",
        isUnread && "bg-primary/5"
    );

    if (chat.isGroupChat) {
        return (
            <div onClick={() => router.push(`/dashboard/chats/${chat.id}`)} className={containerClasses}>
                <div className="flex items-center gap-4 p-4">
                    <div className="relative">
                        <Avatar className="h-12 w-12">
                            <AvatarFallback>{chat.participantIds.length}</AvatarFallback>
                        </Avatar>
                        {isUnread && <div className="absolute top-0 right-0 h-3 w-3 rounded-full bg-primary border-2 border-background" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <div className={cn("font-semibold truncate", isUnread && "text-primary")}>
                                <Link href={`/dashboard/campaigns/${chat.campaignId}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                                    {chat.campaignTitle}
                                </Link>
                                 (Group)
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(lastUpdatedAt, { addSuffix: true })}
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{chat.participantIds.length} participants</p>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                            {chat.hasMessages ? 'Click to view messages' : 'No messages yet.'}
                        </p>
                    </div>
                </div>
            </div>
        )
    }
    
    const otherParticipantId = chat.participantIds.find(id => id !== currentUserId);
    if (!otherParticipantId) return null;

    const otherParticipantInfo = chat.participantInfo[otherParticipantId];
    if (!otherParticipantInfo) return null;

    return (
        <div onClick={() => router.push(`/dashboard/chats/${chat.id}`)} className={containerClasses}>
            <div className="flex items-center gap-4 p-4">
                 <div className="relative">
                    <Link href={`/dashboard/profile/${otherParticipantId}`} onClick={(e) => e.stopPropagation()} className="relative z-10">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={otherParticipantInfo.photoURL} alt={otherParticipantInfo.displayName} />
                            <AvatarFallback>{otherParticipantInfo.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                        </Avatar>
                    </Link>
                    {isUnread && <div className="absolute top-0 right-0 h-3 w-3 rounded-full bg-primary border-2 border-background" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className={cn("font-semibold truncate", isUnread && "text-primary")}>{otherParticipantInfo.displayName}</div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(lastUpdatedAt, { addSuffix: true })}
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                       {chat.campaignTitle && chat.campaignId ? (
                          <>
                            Re: <Link href={`/dashboard/campaigns/${chat.campaignId}`} onClick={(e) => e.stopPropagation()} className="hover:underline">{chat.campaignTitle}</Link>
                          </>
                        ) : (
                          <span>Accountability Chat</span>
                        )}
                    </p>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                        {chat.hasMessages ? 'Click to view messages' : 'No messages yet.'}
                    </p>
                </div>
            </div>
        </div>
    )
}


export default function ChatsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const chatsQuery = useMemo(() => {
        if (!user?.uid) return null;
        return query(
            collection(firestore, 'chats'),
            where('participantIds', 'array-contains', user.uid)
        );
    }, [user?.uid, firestore]);
    const { data: allChats, loading: loadingChats } = useCollection<Chat>(chatsQuery);

    const notificationsQuery = useMemo(() => {
        if (!user?.uid) return null;
        return query(
            collection(firestore, `users/${user.uid}/notifications`),
            where('isRead', '==', false),
            where('type', '==', 'new_chat_message')
        );
    }, [user?.uid, firestore]);
    const { data: unreadNotifications, loading: loadingNotifications } = useCollection<Notification>(notificationsQuery);

    const loading = loadingChats || loadingNotifications;

    const unreadChatIds = useMemo(() => {
        if (!unreadNotifications) return new Set<string>();
        const chatIds = new Set<string>();
        unreadNotifications.forEach(notif => {
            const match = notif.link?.match(/\/dashboard\/chats\/(.*)/);
            if (match && match[1]) {
                chatIds.add(match[1]);
            }
        });
        return chatIds;
    }, [unreadNotifications]);

    const chats = useMemo(() => {
        if (!allChats) return [];
        return allChats
            .filter(chat => chat.hasMessages)
            .sort((a, b) => {
                const isAUnread = unreadChatIds.has(a.id);
                const isBUnread = unreadChatIds.has(b.id);
                if (isAUnread && !isBUnread) return -1;
                if (!isAUnread && isBUnread) return 1;

                const dateA = a.lastUpdatedAt?.toDate ? a.lastUpdatedAt.toDate().getTime() : 0;
                const dateB = b.lastUpdatedAt?.toDate ? b.lastUpdatedAt.toDate().getTime() : 0;
                return dateB - dateA;
            });
    }, [allChats, unreadChatIds]);

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline">
                    Chats
                </h1>
                <p className="text-muted-foreground">
                    Your conversations with campaign organizers and partners.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Conversations</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading && (
                        <div className="divide-y">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 p-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {!loading && chats?.length === 0 && (
                        <div className="p-8 text-center border-t">
                            <MessagesSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No Active Conversations</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                When you join a campaign or chat with someone, your conversations will appear here.
                            </p>
                        </div>
                    )}
                    <div className="divide-y border-t">
                        {!loading && user && chats?.map(chat => (
                             <ChatListItem 
                                key={chat.id} 
                                chat={chat} 
                                currentUserId={user.uid}
                                isUnread={unreadChatIds.has(chat.id)}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
