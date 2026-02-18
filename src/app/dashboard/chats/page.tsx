
'use client';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Chat } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

function ChatListItem({ chat, currentUserId }: { chat: Chat, currentUserId: string }) {
    const otherParticipantId = chat.participantIds.find(id => id !== currentUserId);
    if (!otherParticipantId) return null;

    const otherParticipantInfo = chat.participantInfo[otherParticipantId];
    if (!otherParticipantInfo) return null;
    
    const lastUpdatedAt = chat.lastUpdatedAt?.toDate ? chat.lastUpdatedAt.toDate() : new Date();

    return (
        <Link href={`/dashboard/chats/${chat.id}`} className="block hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4 p-4">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={otherParticipantInfo.photoURL} alt={otherParticipantInfo.displayName} />
                    <AvatarFallback>{otherParticipantInfo.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className="font-semibold truncate">{otherParticipantInfo.displayName}</div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(lastUpdatedAt, { addSuffix: true })}
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{chat.campaignTitle}</p>
                    <p className="text-sm text-muted-foreground truncate mt-1">{chat.lastMessageText || "No messages yet."}</p>
                </div>
            </div>
        </Link>
    )
}


export default function ChatsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const chatsQuery = user ? query(
        collection(firestore, 'chats'),
        where('participantIds', 'array-contains', user.uid),
        orderBy('lastUpdatedAt', 'desc')
    ) : null;

    const { data: chats, loading } = useCollection<Chat>(chatsQuery);

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline">
                    Chats
                </h1>
                <p className="text-muted-foreground">
                    Your conversations with campaign owners and participants.
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
                        <div className="p-8 text-center text-muted-foreground">
                            You have no active conversations.
                        </div>
                    )}
                    <div className="border-t">
                        {user && chats?.map(chat => (
                            <ChatListItem key={chat.id} chat={chat} currentUserId={user.uid} />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
