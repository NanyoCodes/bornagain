'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useDoc, useCollection, useFirestore } from '@/firebase';
import {
  collection,
  query,
  addDoc,
  serverTimestamp,
  orderBy,
  doc,
  updateDoc,
  writeBatch,
  where,
  getDocs,
  deleteDoc,
  getDoc,
  arrayUnion,
} from 'firebase/firestore';
import type { Chat, ChatMessage, Campaign, Fellowship, UserProfile, Event } from '@/lib/types';
import { Loader2, Send, ArrowLeft, Reply, X, ChevronDown, MessagesSquare, MoreHorizontal, Edit, Trash2, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, safeToDate } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, differenceInMinutes, isSameDay } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChatParticipantsDialog } from '@/components/chat/participants-dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Image from 'next/image';

function LiveChatAvatar({ userId, fallbackUrl, fallbackInitials, className }: { userId: string, fallbackUrl?: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userRef = useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const currentPhotoUrl = profile?.photoURL || fallbackUrl;
    
    return (
        <Avatar className={className}>
            <AvatarImage src={currentPhotoUrl} className="object-cover" />
            <AvatarFallback className="font-bold bg-primary/10 text-primary">{fallbackInitials}</AvatarFallback>
        </Avatar>
    );
}

export default function ChatPageClient({ chatId }: { chatId: string }) {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const [swipeState, setSwipeState] = useState<{ id: string | null; startX: number; startY: number; deltaX: number }>({ id: null, startX: 0, startY: 0, deltaX: 0 });
    const swipeThreshold = 60;

    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [isUpdatingMessage, setIsUpdatingMessage] = useState(false);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [newMessage]);

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, msg: ChatMessage) => {
        if (e.touches.length === 1) {
            setSwipeState({ id: msg.id, startX: e.touches[0].clientX, startY: e.touches[0].clientY, deltaX: 0 });
        }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>, msg: ChatMessage) => {
        if (swipeState.id !== msg.id || e.touches.length === 1) return;
        const deltaX = e.touches[0].clientX - swipeState.startX;
        const deltaY = e.touches[0].clientY - swipeState.startY;
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            if (swipeState.deltaX !== 0) setSwipeState(s => ({ ...s, deltaX: 0 }));
            return;
        }
        const isOwnMessage = msg.senderId === user?.uid;
        const maxSwipe = 80;
        if ((!isOwnMessage && deltaX > 0 && deltaX < maxSwipe) || (isOwnMessage && deltaX < 0 && deltaX > -maxSwipe)) {
            setSwipeState(s => ({ ...s, deltaX }));
        }
    };

    const handleTouchEnd = (msg: ChatMessage) => {
        if (swipeState.id !== msg.id) return;
        const isOwnMessage = msg.senderId === user?.uid;
        const triggerThreshold = isOwnMessage ? -swipeThreshold : swipeThreshold;
        if ((isOwnMessage && swipeState.deltaX < triggerThreshold) || (!isOwnMessage && swipeState.deltaX > triggerThreshold)) {
            setReplyingTo(msg);
        }
        setSwipeState(s => ({ ...s, deltaX: 0 }));
        setTimeout(() => setSwipeState({ id: null, startX: 0, startY: 0, deltaX: 0 }), 200);
    };

    const chatDocRef = useMemo(() => {
        if (!user?.uid || !firestore || !chatId) return null;
        return doc(firestore, 'chats', chatId);
    }, [user?.uid, firestore, chatId]);
    const { data: chat, loading: loadingChat } = useDoc<Chat>(chatDocRef);
    
    const campaignDocRef = useMemo(() => {
        if (!firestore || !chat?.campaignId) return null;
        return doc(firestore, 'campaigns', chat.campaignId);
    }, [firestore, chat?.campaignId]);
    const { data: campaign } = useDoc<Campaign>(campaignDocRef);

    const fellowshipDocRef = useMemo(() => {
        if (!firestore || !chat?.fellowshipId) return null;
        return doc(firestore, 'fellowships', chat.fellowshipId);
    }, [firestore, chat?.fellowshipId]);
    const { data: fellowship } = useDoc<Fellowship>(fellowshipDocRef);

    const eventDocRef = useMemo(() => {
        if (!firestore || !chat?.eventId) return null;
        return doc(firestore, 'events', chat.eventId);
    }, [firestore, chat?.eventId]);
    const { data: event } = useDoc<Event>(eventDocRef);

    const messagesQuery = useMemo(() => {
        if (!user?.uid || !firestore || !chatId) return null;
        return query(collection(firestore, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    }, [user?.uid, firestore, chatId]);
    const { data: messages, loading: loadingMessages } = useCollection<ChatMessage>(messagesQuery, {
        snapshotOptions: { serverTimestamps: 'estimate' }
    });
    
    const loading = userLoading || loadingChat || loadingMessages;

    useEffect(() => {
        if (!user?.uid || !firestore || !chatId) return;
        const markNotificationsAsRead = async () => {
            try {
                const notificationsRef = collection(firestore, `users/${user.uid}/notifications`);
                const q = query(
                    notificationsRef,
                    where('link', 'in', [`/dashboard/chats/${chatId}`, `/chats/${chatId}`]),
                    where('isRead', '==', false)
                );
                const querySnapshot = await getDocs(q);
                if (querySnapshot.empty) return;
                const batch = writeBatch(firestore);
                querySnapshot.forEach(doc => batch.update(doc.ref, { isRead: true }));
                await batch.commit();
            } catch (error) { console.warn("Failed to mark chat notifications as read:", error); }
        };
        markNotificationsAsRead();
    }, [user?.uid, firestore, chatId]);

    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            container.scrollTop = container.scrollHeight;
        }
    };

    useEffect(() => {
        if (messages && messages.length > 0) {
            const container = scrollContainerRef.current;
            if (container) {
                const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
                if (isNearBottom) scrollToBottom("smooth");
                else setShowScrollBottom(true);
            }
        }
    }, [messages]);

    useEffect(() => {
        if (!loading && messages) {
            const timer = setTimeout(() => scrollToBottom("auto"), 100);
            return () => clearTimeout(timer);
        }
    }, [loading, !!messages]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const isNearBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
        setShowScrollBottom(!isNearBottom);
    };

    const handleBack = () => {
        const soulIdParam = searchParams?.get('soulId');
        if (soulIdParam) router.push(`/souls-won?soulId=${soulIdParam}`);
        else router.push('/chats');
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !user || !firestore || !chatId || isSending || !chat) return;
        setIsSending(true);
        try {
            const messagesRef = collection(firestore, 'chats', chatId, 'messages');
            const newDocData: any = { senderId: user.uid, text: newMessage.trim(), createdAt: serverTimestamp() };
            if (replyingTo) {
                newDocData.replyTo = {
                    messageId: replyingTo.id,
                    text: replyingTo.text?.substring(0, 100) || '',
                    senderFirstName: chat.participantInfo[replyingTo.senderId]?.firstName || 'User',
                    senderLastName: chat.participantInfo[replyingTo.senderId]?.lastName || '',
                };
            }
            await addDoc(messagesRef, newDocData);
            await updateDoc(doc(firestore, 'chats', chatId), { lastUpdatedAt: serverTimestamp(), hasMessages: true });
            setNewMessage('');
            setReplyingTo(null);
            setTimeout(() => scrollToBottom("smooth"), 100);
        } catch (error) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `chats/${chatId}/messages`, operation: 'create' }, user));
        } finally { setIsSending(false); }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage();
    };

    const handleUpdateMessage = async () => {
        if (!editingMessageId || !newMessage.trim() || !user || !firestore || isUpdatingMessage) return;
        setIsUpdatingMessage(true);
        const messageRef = doc(firestore, 'chats', chatId, 'messages', editingMessageId);
        updateDoc(messageRef, { text: newMessage.trim(), updatedAt: serverTimestamp() })
            .then(() => { setEditingMessageId(null); setNewMessage(''); toast({ title: 'Message Updated' }); })
            .catch(() => toast({ variant: 'destructive', title: 'Edit Failed' }))
            .finally(() => setIsUpdatingMessage(false));
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (!user || !firestore) return;
        deleteDoc(doc(firestore, 'chats', chatId, 'messages', msgId))
            .then(() => toast({ title: 'Message Removed' }))
            .catch(() => toast({ variant: 'destructive', title: 'Delete Failed' }));
    };

    const messageGroups = useMemo(() => {
        if (!messages) return [];
        const groups: { date: Date; messages: ChatMessage[] }[] = [];
        messages.forEach(message => {
            const date = safeToDate(message.createdAt);
            if (!date) return;
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && isSameDay(lastGroup.date, date)) lastGroup.messages.push(message);
            else groups.push({ date, messages: [message] });
        });
        return groups;
    }, [messages]);

    if (loading) return <div className="flex h-full w-full items-center justify-center py-20 text-left"><Loader2 className="animate-spin text-primary" /></div>;
    if (!chat) return <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center text-left"><p>Chat not found.</p><Button asChild variant="outline" className="mt-4 text-left"><Link href="/chats">Back to Conversations</Link></Button></div>;

    const otherParticipantId = !chat.isGroupChat ? chat.participantIds.find(id => id !== user?.uid) : null;
    const otherParticipantInfo = otherParticipantId ? chat.participantInfo[otherParticipantId] : null;

    return (
        <div className="flex flex-col w-full h-full min-h-0 bg-background overflow-hidden relative text-left">
            <div className="flex items-center gap-4 p-4 shrink-0 border-b bg-background/80 backdrop-blur-md z-20 text-left">
                <Button variant="outline" size="icon" onClick={handleBack} className="rounded-full text-left text-left"><ArrowLeft className="h-4 w-4 text-left text-left" /></Button>
                {chat.isGroupChat ? (
                    <div className="flex items-center gap-3 text-left">
                        <Avatar className="border-2 border-primary/20 shadow-sm text-left"><AvatarFallback className="font-black bg-primary/10 text-primary text-left text-left">{chat.participantIds.length}</AvatarFallback></Avatar>
                        <div className="min-w-0 text-left">
                            <h2 className="font-black text-sm sm:text-base leading-tight uppercase tracking-tight text-left text-left"> {chat.campaignTitle}</h2>
                            <ChatParticipantsDialog chat={chat}>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors cursor-pointer text-left text-left">{chat.participantIds.length} members</p>
                            </ChatParticipantsDialog>
                        </div>
                    </div>
                ) : otherParticipantInfo && otherParticipantId ? (
                   <div className="flex items-center gap-3 flex-grow text-left">
                        <LiveChatAvatar userId={otherParticipantId} fallbackUrl={otherParticipantInfo.photoURL} fallbackInitials={otherParticipantInfo.firstName?.charAt(0) || 'U'} className="h-11 w-11 sm:h-12 sm:w-12 border shadow-sm text-left" />
                        <div className="flex-grow min-w-0 text-left">
                            <h2 className="font-black text-sm sm:text-base uppercase tracking-tight text-left leading-tight"> {otherParticipantInfo.firstName} {otherParticipantInfo.lastName}</h2>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate text-left text-left">{chat.campaignTitle ? `RE: "${chat.campaignTitle}"` : "Accountability Partner"}</p>
                        </div>
                    </div>
                ) : null}
            </div>

            <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0 bg-muted/5 relative overscroll-contain text-left">
                <div className="px-4 py-6 space-y-2 text-left">
                    <TooltipProvider>
                        {messageGroups.map((group) => (
                        <div key={group.date.toISOString()} className="relative text-left">
                            <div className="sticky top-0 z-10 flex justify-center my-4 text-left"><div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/80 backdrop-blur-sm rounded-full border shadow-sm text-left">{format(group.date, 'PPP')}</div></div>
                            <div className="space-y-4 text-left">
                                {group.messages.map(msg => {
                                    const senderInfo = chat.participantInfo[msg.senderId];
                                    const isOwnMessage = msg.senderId === user?.uid;
                                    return (
                                    <div key={msg.id} id={`message-${msg.id}`} className={cn("group flex w-full items-end gap-2 text-left", isOwnMessage ? "justify-end" : "justify-start")}>
                                        {!isOwnMessage && senderInfo && (<LiveChatAvatar userId={msg.senderId} fallbackUrl={senderInfo.photoURL} fallbackInitials={senderInfo.firstName?.charAt(0) || 'U'} className="h-7 w-7 border shadow-sm text-left" />)}
                                        <div className="relative flex items-center gap-1 group/bubble text-left">
                                            <div className={cn("relative z-10 rounded-2xl px-4 py-2.5 max-w-[280px] sm:max-w-md break-words flex flex-col shadow-sm whitespace-pre-wrap text-left", isOwnMessage ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-background border rounded-bl-sm")}>
                                                    {msg.replyTo && (<div className="mb-2 rounded-xl border-l-4 border-primary/50 bg-black/5 p-2 text-xs text-left"><p className="font-black text-[9px] uppercase tracking-wider mb-0.5 text-left">{msg.replyTo.senderFirstName}</p><p className="line-clamp-2 opacity-80 leading-snug text-left">{msg.replyTo.text}</p></div>)}
                                                    {chat.isGroupChat && !isOwnMessage && senderInfo && (<div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 text-left">{senderInfo.firstName} {senderInfo.lastName}</div>)}
                                                    <p className="text-sm leading-relaxed text-left">{msg.text}</p>
                                                    <div className="text-[9px] font-bold opacity-60 self-end mt-1 text-left">{format(safeToDate(msg.createdAt)!, 'p')}</div>
                                            </div>
                                            {isOwnMessage && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground opacity-0 group-hover/bubble:opacity-100 transition-opacity"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent className="text-left"><DropdownMenuItem onSelect={() => { setEditingMessageId(msg.id); setNewMessage(msg.text || ''); }} className="text-left"><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem><DropdownMenuItem onSelect={() => handleDeleteMessage(msg.id)} className="text-destructive text-left"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                )})}
                            </div>
                        </div>
                        ))}
                        <div ref={messagesEndRef} className="text-left" />
                    </TooltipProvider>
                </div>
            </div>

            <div className="shrink-0 border-t p-4 bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)] relative z-30 text-left">
                <form onSubmit={handleFormSubmit} className="flex gap-3 w-full items-center text-left">
                    <Textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        disabled={isSending || isUpdatingMessage}
                        className="min-h-[3rem] max-h-32 py-3 px-4 rounded-2xl shadow-inner border-muted-foreground/20 text-base resize-none overflow-y-auto text-left"
                    />
                    <Button type="submit" size="icon" className="h-12 w-12 shrink-0 rounded-2xl shadow-xl transition-all active:scale-90 bg-primary text-left" disabled={!newMessage.trim() || isSending || isUpdatingMessage}>
                        {isSending || isUpdatingMessage ? <Loader2 className="h-5 w-5 animate-spin text-left" /> : <Send className="h-5 w-5 fill-current text-left" />}
                    </Button>
                </form>
            </div>
        </div>
    )
}