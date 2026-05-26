'use client';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Chat, Notification } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isToday } from 'date-fns';
import { useMemo } from 'react';
import { MessagesSquare, Users, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ChatParticipantsDialog } from '@/components/chat/participants-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

function ChatListItem({ chat, currentUserId, isUnread }: { chat: Chat, currentUserId: string, isUnread: boolean }) {
    const router = useRouter();
    const lastUpdatedAt = useMemo(() => chat.lastUpdatedAt?.toDate ? chat.lastUpdatedAt.toDate() : new Date(), [chat.lastUpdatedAt]);

    const containerClasses = cn(
        "block hover:bg-muted/50 active:bg-muted/80 transition-all cursor-pointer border-b last:border-0",
        isUnread && "bg-primary/5 border-l-4 border-l-primary"
    );

    const dateDisplay = isToday(lastUpdatedAt) ? format(lastUpdatedAt, 'p') : format(lastUpdatedAt, 'MM/dd/yy');

    if (chat.isGroupChat) {
        const relatedLink = chat.campaignId 
            ? `/dashboard/campaigns/${chat.campaignId}` 
            : `/dashboard/fellowship/${chat.fellowshipId}`;
        
        return (
            <div onClick={() => router.push(`/dashboard/chats/${chat.id}`)} className={containerClasses}>
                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                    <div className="relative shrink-0">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border shadow-sm">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs sm:text-sm">
                                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                            </AvatarFallback>
                        </Avatar>
                        {isUnread && <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-background animate-pulse" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                            <div className={cn("font-bold truncate text-sm sm:text-base leading-tight", isUnread && "text-primary")}>
                                {chat.campaignTitle}
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap font-medium mt-0.5">
                                {dateDisplay}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <ChatParticipantsDialog chat={chat}>
                                <button className="text-[10px] sm:text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-semibold uppercase tracking-tighter" onClick={(e) => e.stopPropagation()}>
                                    <Users className="h-3 w-3" />
                                    {chat.participantIds.length} Members
                                </button>
                            </ChatParticipantsDialog>
                            <span className="text-[10px] text-muted-foreground opacity-30">•</span>
                            <span className="text-[10px] sm:text-xs text-primary font-black uppercase tracking-widest">Group</span>
                        </div>
                        <p className={cn("text-xs sm:text-sm truncate mt-1 leading-relaxed", isUnread ? "text-foreground font-medium" : "text-muted-foreground")}>
                            {chat.hasMessages ? 'Tap to view message history...' : 'Start the conversation!'}
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
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                <Dialog>
                    <DialogTrigger asChild onClick={(e) => {e.stopPropagation()}} disabled={!otherParticipantInfo.photoURL}>
                        <div className="relative shrink-0">
                            <Avatar className={cn("h-10 w-10 sm:h-12 sm:w-12 border shadow-sm", otherParticipantInfo.photoURL && "cursor-pointer hover:scale-105 transition-transform")}>
                                <AvatarImage src={otherParticipantInfo.photoURL} className="object-cover" />
                                <AvatarFallback className="font-bold text-xs sm:text-sm">
                                    {otherParticipantInfo.firstName?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            {isUnread && <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-background animate-pulse" />}
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
                    <div className="flex justify-between items-start gap-2">
                        <div className={cn("font-bold truncate text-sm sm:text-base leading-tight", isUnread && "text-primary")}>
                            {otherParticipantInfo.firstName} {otherParticipantInfo.lastName}
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap font-medium mt-0.5">
                            {dateDisplay}
                        </div>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate font-medium flex items-center gap-1.5 mt-0.5">
                       {chat.campaignTitle ? (
                          <>
                            <span className="text-primary font-black uppercase tracking-tighter shrink-0">Regarding:</span>
                            <span className="truncate italic">"{chat.campaignTitle}"</span>
                          </>
                        ) : (
                          <span className="uppercase tracking-widest font-black text-[9px] opacity-60">Accountability Partner</span>
                        )}
                    </p>
                    <p className={cn("text-xs sm:text-sm truncate mt-1 leading-relaxed", isUnread ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {chat.hasMessages ? 'Tap to continue chatting...' : 'Send an encouraging word!'}
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
        <div className="flex flex-col h-full w-full bg-background overflow-hidden">
            <div className="flex-shrink-0 p-4 sm:p-6 md:p-8 pb-4">
                <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight uppercase">
                    Conversations
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1 uppercase tracking-[0.2em]">Kingdom Messages</p>
            </div>

            <div className="flex-1 min-h-0 px-0 sm:px-6 md:px-8 pb-4">
                <Card className="h-full flex flex-col overflow-hidden border-x-0 sm:border-x rounded-none sm:rounded-3xl shadow-xl">
                    <ScrollArea className="flex-1 w-full">
                        <div className="flex flex-col h-full">
                            {loading && (
                                <div className="divide-y">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4">
                                            <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full shrink-0" />
                                            <div className="flex-1 space-y-2 min-w-0">
                                                <Skeleton className="h-4 w-1/2" />
                                                <Skeleton className="h-3 w-3/4" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!loading && chats?.length === 0 && (
                                <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-8">
                                    <div className="h-20 w-20 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                                        <MessageSquare className="h-10 w-10 text-muted-foreground opacity-20" />
                                    </div>
                                    <h3 className="text-xl font-bold font-headline uppercase tracking-tight">Quiet Field</h3>
                                    <p className="mt-2 text-sm text-muted-foreground max-w-[280px] leading-relaxed italic">
                                        Your ministry conversations will appear here. Join a campaign or nudge a partner to start!
                                    </p>
                                </div>
                            )}
                            <div className="flex flex-col">
                                {!loading && user && chats?.map(chat => (
                                    <ChatListItem 
                                        key={chat.id} 
                                        chat={chat} 
                                        currentUserId={user.uid}
                                        isUnread={unreadChatIds.has(chat.id)}
                                    />
                                ))}
                            </div>
                            {/* Safe area padding for bottom nav */}
                            <div className="h-20 md:hidden shrink-0" />
                        </div>
                    </ScrollArea>
                </Card>
            </div>
        </div>
    )
}
