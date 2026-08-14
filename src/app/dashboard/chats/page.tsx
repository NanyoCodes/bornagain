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
import { MessagesSquare, Users, MessageSquare, ArrowLeft, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ChatParticipantsDialog } from '@/components/chat/participants-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

function ChatListItem({ chat, currentUserId, isUnread }: { chat: Chat, currentUserId: string, isUnread: boolean }) {
    const router = useRouter();
    const lastUpdatedAt = useMemo(() => chat.lastUpdatedAt?.toDate ? chat.lastUpdatedAt.toDate() : new Date(), [chat.lastUpdatedAt]);

    const containerClasses = cn(
        "block hover:bg-muted/50 active:bg-muted/80 transition-all cursor-pointer border-b last:border-0 text-left",
        isUnread ? "bg-primary/[0.03] border-l-4 border-l-primary" : "border-l-4 border-l-transparent opacity-60"
    );

    const dateDisplay = isToday(lastUpdatedAt) ? format(lastUpdatedAt, 'p') : format(lastUpdatedAt, 'MM/dd/yy');

    if (chat.isGroupChat) {
        return (
            <div onClick={() => router.push(`/chats/${chat.id}`)} className={containerClasses}>
                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 text-left">
                    <div className="relative shrink-0 text-left text-left">
                        <Avatar className={cn(
                            "h-10 w-10 sm:h-12 sm:w-12 border shadow-sm transition-transform group-hover:scale-105 text-left text-left",
                            !isUnread && "grayscale"
                        )}>
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs sm:text-sm text-left text-left">
                                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-left text-left" />
                            </AvatarFallback>
                        </Avatar>
                        {isUnread && <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-background shadow-sm animate-pulse text-left text-left" />}
                    </div>
                    <div className="flex-1 min-w-0 text-left text-left">
                        <div className="flex justify-between items-baseline gap-2 mb-0.5 text-left text-left text-left">
                            <h3 className={cn(
                                "font-bold truncate text-sm sm:text-base leading-none text-left text-left", 
                                isUnread ? "text-primary" : "text-foreground"
                            )}>
                                {chat.campaignTitle}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2 mb-1 text-left text-left text-left">
                            <ChatParticipantsDialog chat={chat}>
                                <button className="text-[10px] sm:text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-semibold uppercase tracking-tighter text-left text-left" onClick={(e) => e.stopPropagation()}>
                                    <Users className="h-2.5 w-2.5 text-left text-left" />
                                    {chat.participantIds.length} Members
                                </button>
                            </ChatParticipantsDialog>
                            <span className="text-[10px] text-muted-foreground opacity-30 text-left text-left">•</span>
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground text-left text-left">Group</span>
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-muted-foreground whitespace-nowrap font-medium uppercase tracking-tighter mb-1 text-left text-left">
                            {dateDisplay}
                        </div>
                        <p className={cn(
                            "text-xs sm:text-sm truncate leading-relaxed text-left text-left", 
                            isUnread ? "text-foreground font-bold" : "text-muted-foreground font-medium"
                        )}>
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
        <div onClick={() => router.push(`/chats/${chat.id}`)} className={containerClasses}>
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 text-left">
                <Dialog>
                    <DialogTrigger asChild onClick={(e) => {e.stopPropagation()}} disabled={!otherParticipantInfo.photoURL}>
                        <div className="relative shrink-0 text-left text-left">
                            <Avatar className={cn(
                                "h-10 w-10 sm:h-12 sm:w-12 border shadow-sm transition-transform active:scale-95 text-left text-left text-left", 
                                otherParticipantInfo.photoURL && "cursor-pointer hover:scale-105",
                                !isUnread && "grayscale"
                            )}>
                                <AvatarImage src={otherParticipantInfo.photoURL} className="object-cover text-left text-left text-left" />
                                <AvatarFallback className="font-bold text-xs sm:text-sm text-left text-left">
                                    {otherParticipantInfo.firstName?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            {isUnread && <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-background shadow-sm animate-pulse text-left text-left" />}
                        </div>
                    </DialogTrigger>
                    {otherParticipantInfo.photoURL && (
                    <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-left text-left" onClick={(e) => {e.stopPropagation()}}>
                        <DialogHeader className="sr-only text-left text-left text-left">
                            <DialogTitle className="text-left text-left text-left">Profile photo of {otherParticipantInfo.firstName} {otherParticipantInfo.lastName}</DialogTitle>
                            <DialogDescription className="text-left text-left text-left">Full screen view of the user's profile photo.</DialogDescription>
                        </DialogHeader>
                        <div className="relative h-full w-full flex items-center justify-center p-4 text-left text-left">
                            <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-left text-left">
                                <Image 
                                    src={otherParticipantInfo.photoURL} 
                                    alt={`${otherParticipantInfo.firstName} ${otherParticipantInfo.lastName}`} 
                                    fill 
                                    className="object-contain shadow-2xl ring-4 ring-white/10 text-left text-left text-left" 
                                    unoptimized 
                                />
                            </div>
                        </div>
                    </DialogContent>
                    )}
                </Dialog>
                <div className="flex-1 min-w-0 text-left text-left text-left">
                    <div className="flex justify-between items-baseline gap-2 mb-0.5 text-left text-left text-left">
                        <h3 className={cn(
                            "font-bold truncate text-sm sm:text-base leading-none text-left text-left text-left", 
                            isUnread ? "text-primary" : "text-foreground"
                        )}>
                            {otherParticipantInfo.firstName} {otherParticipantInfo.lastName}
                        </h3>
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground truncate font-medium flex items-center gap-1.5 mb-1 uppercase tracking-tighter text-left text-left text-left">
                       {chat.vendorId ? (
                          <>
                            <Store className="h-2.5 w-2.5 text-primary text-left text-left text-left" />
                            <span className="truncate italic text-left text-left">"{chat.campaignTitle}" Provider</span>
                          </>
                       ) : chat.campaignTitle ? (
                          <>
                            <span className="font-black shrink-0 text-left text-left text-left">RE:</span>
                            <span className="truncate italic text-left text-left">"{chat.campaignTitle}"</span>
                          </>
                        ) : (
                          <span className="font-black opacity-60 text-left text-left">Accountability Partner</span>
                        )}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground whitespace-nowrap font-medium uppercase tracking-tighter mb-1 text-left text-left text-left">
                        {dateDisplay}
                    </div>
                    <p className={cn(
                        "text-xs sm:text-sm truncate leading-relaxed text-left text-left text-left", 
                        isUnread ? "text-foreground font-bold" : "text-muted-foreground font-medium"
                    )}>
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
    const router = useRouter();

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
            const match = notif.link?.match(/\/(?:dashboard\/)?chats\/(.*)/);
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
        <div className="flex flex-col h-full w-full bg-background overflow-hidden text-left">
            <div className="flex-shrink-0 p-4 sm:p-6 md:p-8 pb-4 text-left">
                <div className="flex items-center gap-4 text-left text-left">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm text-left">
                        <ArrowLeft className="h-6 w-6 text-left text-left" />
                        <span className="sr-only text-left text-left">Back</span>
                    </Button>
                    <div className="min-w-0 text-left text-left">
                        <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight uppercase truncate text-left text-left">
                            Conversations
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1 uppercase tracking-[0.2em] truncate text-left text-left">Kingdom Messages</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 px-0 sm:px-6 md:px-8 pb-4 text-left">
                <Card className="h-full flex flex-col overflow-hidden border-x-0 sm:border-x rounded-none sm:rounded-3xl shadow-xl text-left">
                    <ScrollArea className="flex-1 w-full text-left">
                        <div className="flex flex-col text-left">
                            {loading && (
                                <div className="divide-y text-left">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 text-left">
                                            <Skeleton className="h-10 w-10 rounded-full shrink-0 text-left" />
                                            <div className="flex-1 space-y-2 min-w-0 text-left">
                                                <Skeleton className="h-4 w-1/2 text-left" />
                                                <Skeleton className="h-3 w-3/4 text-left" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!loading && chats?.length === 0 && (
                                <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-8 text-left">
                                    <div className="h-20 w-20 bg-muted/20 rounded-full flex items-center justify-center mb-6 text-left">
                                        <MessageSquare className="h-10 w-10 text-muted-foreground opacity-20 text-left" />
                                    </div>
                                    <h3 className="text-xl font-bold font-headline uppercase tracking-tight text-left">Quiet Field</h3>
                                    <p className="mt-2 text-sm text-muted-foreground max-w-[280px] leading-relaxed italic text-left">
                                        Your ministry conversations will appear here. Join a campaign or nudge a partner to start!
                                    </p>
                                </div>
                            )}
                            <div className="flex flex-col text-left">
                                {!loading && user && chats?.map(chat => (
                                    <ChatListItem 
                                        key={chat.id} 
                                        chat={chat} 
                                        currentUserId={user.uid}
                                        isUnread={unreadChatIds.has(chat.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    </ScrollArea>
                </Card>
            </div>
        </div>
    )
}
