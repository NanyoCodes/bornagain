
'use client';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Chat, Notification } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isToday } from 'date-fns';
import { useMemo } from 'react';
import { MessagesSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ChatParticipantsDialog } from '@/components/chat/participants-dialog';

function ChatListItem({ chat, currentUserId, isUnread }: { chat: Chat, currentUserId: string, isUnread: boolean }) {
    const router = useRouter();
    const lastUpdatedAt = useMemo(() => chat.lastUpdatedAt?.toDate ? chat.lastUpdatedAt.toDate() : new Date(), [chat.lastUpdatedAt]);

    const containerClasses = cn(
        "block hover:bg-muted/50 active:bg-muted/50 transition-colors cursor-pointer",
        isUnread && "bg-primary/5"
    );

    if (chat.isGroupChat) {
        const relatedLink = chat.campaignId 
            ? `/dashboard/campaigns/${chat.campaignId}` 
            : `/dashboard/fellowship/${chat.fellowshipId}`;
        
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
                                <Link href={relatedLink} onClick={(e) => e.stopPropagation()} className="hover:underline">
                                    {chat.campaignTitle}
                                </Link>
                                 (Group)
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                                {isToday(lastUpdatedAt) ? format(lastUpdatedAt, 'p') : format(lastUpdatedAt, 'P')}
                            </div>
                        </div>
                        <ChatParticipantsDialog chat={chat}>
                            <p className="text-sm text-muted-foreground truncate hover:underline cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                {chat.participantIds.length} participants
                            </p>
                        </ChatParticipantsDialog>
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
                <Dialog>
                    <DialogTrigger asChild onClick={(e) => {e.stopPropagation()}} disabled={!otherParticipantInfo.photoURL}>
                        <div className="relative">
                            <Avatar className={cn("h-12 w-12", otherParticipantInfo.photoURL && "cursor-pointer")}>
                                <AvatarImage src={otherParticipantInfo.photoURL} />
                                <AvatarFallback>{otherParticipantInfo.firstName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {isUnread && <div className="absolute top-0 right-0 h-3 w-3 rounded-full bg-primary border-2 border-background" />}
                        </div>
                    </DialogTrigger>
                    {otherParticipantInfo.photoURL && (
                    <DialogContent className="p-0 bg-transparent border-0 w-auto max-w-lg" onClick={(e) => {e.stopPropagation()}}>
                        <DialogHeader className="sr-only">
                            <DialogTitle>Profile photo of {otherParticipantInfo.firstName} {otherParticipantInfo.lastName}</DialogTitle>
                            <DialogDescription>A larger view of the user's profile photo.</DialogDescription>
                        </DialogHeader>
                        <Image src={otherParticipantInfo.photoURL} alt={`${otherParticipantInfo.firstName} ${otherParticipantInfo.lastName}`} width={600} height={600} className="rounded-lg object-contain" unoptimized/>
                    </DialogContent>
                    )}
                </Dialog>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className={cn("font-semibold truncate", isUnread && "text-primary")}>{otherParticipantInfo.firstName} {otherParticipantInfo.lastName}</div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {isToday(lastUpdatedAt) ? format(lastUpdatedAt, 'p') : format(lastUpdatedAt, 'P')}
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                       {chat.campaignTitle && chat.campaignId ? (
                          <>
                            Re: <Link href={`/dashboard/campaigns/${chat.campaignId}`} onClick={(e) => e.stopPropagation()} className="hover:underline">{chat.campaignTitle}</Link>
                          </>
                        ) : chat.campaignTitle && chat.fellowshipId ? (
                             <>
                                Re: <Link href={`/dashboard/fellowship/${chat.fellowshipId}`} onClick={(e) => e.stopPropagation()} className="hover:underline">{chat.campaignTitle}</Link>
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
    const { user, loading: userLoading } = useUser();
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

    const loading = userLoading || loadingChats || loadingNotifications;

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
