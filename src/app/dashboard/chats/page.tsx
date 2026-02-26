
'use client';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Chat } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

function ChatListItem({ chat, currentUserId }: { chat: Chat, currentUserId: string }) {
    const router = useRouter();
    const lastUpdatedAt = chat.lastUpdatedAt?.toDate ? chat.lastUpdatedAt.toDate() : new Date();

    if (chat.isGroupChat) {
        return (
            <div onClick={() => router.push(`/dashboard/chats/${chat.id}`)} className="block hover:bg-muted/50 active:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4 p-4">
                    <Avatar className="h-12 w-12">
                        <AvatarFallback>{chat.participantIds.length}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <div className="font-semibold truncate">
                                <Link href={`/dashboard/campaigns#${chat.campaignId}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
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
        <div onClick={() => router.push(`/dashboard/chats/${chat.id}`)} className="block hover:bg-muted/50 active:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-4 p-4">
                <Link href={`/dashboard/profile/${otherParticipantId}`} onClick={(e) => e.stopPropagation()} className="relative z-10">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={otherParticipantInfo.photoURL} alt={otherParticipantInfo.displayName} />
                        <AvatarFallback>{otherParticipantInfo.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className="font-semibold truncate">{otherParticipantInfo.displayName}</div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(lastUpdatedAt, { addSuffix: true })}
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                        Re: <Link href={`/dashboard/campaigns#${chat.campaignId}`} onClick={(e) => e.stopPropagation()} className="hover:underline">{chat.campaignTitle}</Link>
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

    const { data: allChats, loading } = useCollection<Chat>(chatsQuery);

    const chats = useMemo(() => {
        if (!allChats) return [];
        return allChats
            .filter(chat => chat.hasMessages)
            .sort((a, b) => {
                const dateA = a.lastUpdatedAt?.toDate ? a.lastUpdatedAt.toDate().getTime() : 0;
                const dateB = b.lastUpdatedAt?.toDate ? b.lastUpdatedAt.toDate().getTime() : 0;
                return dateB - dateA;
            });
    }, [allChats]);

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline">
                    Chats
                </h1>
                <p className="text-muted-foreground">
                    Your conversations with campaign organizers and participants.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Conversations</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading && (
                        <div className="space-y-2 p-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 p-2">
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
                        <div className="p-8 text-center">
                            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No Active Conversations</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                When you join a campaign or chat with an organizer, your conversations will appear here.
                            </p>
                        </div>
                    )}
                    <div className="border-t">
                        {!loading && user && chats?.map(chat => (
                            <ChatListItem key={chat.id} chat={chat} currentUserId={user.uid} />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
