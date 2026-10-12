'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useAuth, useDoc, useCollection, useFirestore } from '@/firebase';
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
  arrayRemove
} from 'firebase/firestore';
import type { Chat, ChatMessage, Campaign, Fellowship, UserProfile, Event } from '@/lib/types';
import { Loader2, Send, ArrowLeft, Reply, X, ChevronDown, MessagesSquare, MoreHorizontal, Edit, Trash2, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, safeToDate } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, differenceInMinutes, isSameDay } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChatParticipantsDialog } from '@/components/chat/participants-dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/error-emitter';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Image from 'next/image';

/**
 * Ensures the profile photo displayed in the chat is always the most recent version.
 */
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

    // Editing State
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [isUpdatingMessage, setIsUpdatingMessage] = useState(false);

    // Auto-resize textarea
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
            if (swipeState.deltaX !== 0) {
                setSwipeState(s => ({ ...s, deltaX: 0 }));
            }
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
    const { data: campaign, loading: loadingCampaign } = useDoc<Campaign>(campaignDocRef);

    const fellowshipDocRef = useMemo(() => {
        if (!firestore || !chat?.fellowshipId) return null;
        return doc(firestore, 'fellowships', chat.fellowshipId);
    }, [firestore, chat?.fellowshipId]);
    const { data: fellowship, loading: loadingFellowship } = useDoc<Fellowship>(fellowshipDocRef);

    const eventDocRef = useMemo(() => {
        if (!firestore || !chat?.eventId) return null;
        return doc(firestore, 'events', chat.eventId);
    }, [firestore, chat?.eventId]);
    const { data: event, loading: loadingEvent } = useDoc<Event>(eventDocRef);

    const messagesQuery = useMemo(() => {
        if (!user?.uid || !firestore || !chatId) return null;
        return query(collection(firestore, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    }, [user?.uid, firestore, chatId]);
    
    const { data: messages, loading: loadingMessages } = useCollection<ChatMessage>(messagesQuery, {
        snapshotOptions: { serverTimestamps: 'estimate' }
    });
    
    const loading = userLoading || loadingChat || loadingMessages || loadingCampaign || loadingFellowship || loadingEvent;

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
                querySnapshot.forEach(doc => {
                    batch.update(doc.ref, { isRead: true });
                });
                await batch.commit();
            } catch (error) {
                console.warn("Failed to mark chat notifications as read:", error);
            }
        };

        markNotificationsAsRead();
    }, [user?.uid, firestore, chatId]);

    const isChatFrozen = useMemo(() => {
        if (!chat || !campaign) return false;
        if (!chat.isGroupChat || !chat.campaignId) return false;

        const endDate = safeToDate(campaign.endDate);
        if (!endDate) return false;

        const endDateTime = new Date(endDate);
        if (campaign.endTime && /^\d{2}:\d{2}$/.test(campaign.endTime)) {
            const [hours, minutes] = campaign.endTime.split(':').map(Number);
            endDateTime.setHours(hours, minutes, 59, 999);
        } else {
            endDateTime.setHours(23, 59, 59, 999);
        }

        const now = new Date();
        if (endDateTime > now) return false;

        return differenceInMinutes(now, endDateTime) > 1440; // 24h freeze
    }, [chat, campaign]);

    const messageGroups = useMemo(() => {
        if (!messages) return [];
        const groups: { date: Date; messages: ChatMessage[] }[] = [];
        messages.forEach(message => {
            if (!message.createdAt) return;
            const messageDate = safeToDate(message.createdAt);
            if (!messageDate) return;

            const lastGroup = groups[groups.length - 1];
            if (lastGroup && isSameDay(lastGroup.date, messageDate)) {
                lastGroup.messages.push(message);
            } else {
                groups.push({ date: messageDate, messages: [message] });
            }
        });
        return groups;
    }, [messages]);

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
                if (isNearBottom) {
                    scrollToBottom("smooth");
                } else {
                    setShowScrollBottom(true);
                }
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
        if (soulIdParam) {
            router.push(`/souls-won?soulId=${soulIdParam}`);
        } else {
            router.push('/chats');
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !user || !firestore || !chatId || isSending || !chat || isChatFrozen) return;
        
        setIsSending(true);

        try {
            const messagesRef = collection(firestore, 'chats', chatId, 'messages');
            
            const newDocData: any = {
                senderId: user.uid,
                text: newMessage.trim(),
                createdAt: serverTimestamp(),
            };

            if (replyingTo) {
                newDocData.replyTo = {
                    messageId: replyingTo.id,
                    text: replyingTo.text?.substring(0, 100) || '',
                    senderFirstName: chat.participantInfo[replyingTo.senderId]?.firstName || 'User',
                    senderLastName: chat.participantInfo[replyingTo.senderId]?.lastName || '',
                };
            }

            await addDoc(messagesRef, newDocData);

            const chatRef = doc(firestore, 'chats', chatId);
            await updateDoc(chatRef, {
                lastUpdatedAt: serverTimestamp(),
                hasMessages: true,
            });

            const otherParticipantIds = chat.participantIds.filter(id => id !== user.uid);
            if (otherParticipantIds.length > 0) {
                const batch = writeBatch(firestore);

                otherParticipantIds.forEach(participantId => {
                    const recipientInfo = chat.participantInfo[participantId];
                    const notificationsCollectionRef = collection(firestore, 'users', participantId, 'notifications');
                    const notificationRef = doc(notificationsCollectionRef);
                    
                    const title = chat.isGroupChat
                        ? `New ${replyingTo ? 'reply' : 'message'} in ${chat.campaignTitle}`
                        : `New Message from ${user.displayName || 'User'}`;
                    const messageText = chat.campaignTitle
                        ? `${user.displayName || 'User'}: ${newMessage.substring(0, 50)}${newMessage.length > 50 ? '...' : ''}`
                        : `You have a new message from your accountability partner.`;

                    batch.set(notificationRef, {
                        userId: participantId,
                        type: 'new_chat_message',
                        title: title,
                        message: messageText,
                        link: `/chats/${chatId}`,
                        isRead: false,
                        createdAt: serverTimestamp()
                    });

                    if (recipientInfo?.email) {
                        const logo = PlaceHolderImages.find(img => img.id === 'logo');
                        const logoUrl = logo ? logo.imageUrl : '';
                        const mailCollectionRef = collection(firestore, 'mail');
                        const mailRef = doc(mailCollectionRef);
                        const subject = chat.campaignTitle
                            ? `New ${replyingTo ? 'reply' : 'message'} in "${chat.campaignTitle}" Chat`
                            : `New Message from ${user.displayName || 'User'} | Testify`;

                        const html = `
                            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                              <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                                <div style="text-align: center; margin-bottom: 20px;">
                                  <img src="${logoUrl}" alt="Testify Logo" style="width: 80px; height: 80px; border-radius: 50%; border: 2px solid #f97416;">
                                </div>
                                <p>Hi ${recipientInfo?.firstName || 'there'},</p>
                                <p>You have a new ${replyingTo ? 'reply' : 'message'} from <strong>${user.displayName || 'a user'}</strong> ${chat.campaignTitle ? `in the chat for the campaign "<strong>${chat.campaignTitle}</strong>"` : ''}.</p>
                                <blockquote style="border-left: 4px solid #ccc; padding-left: 1rem; margin-left: 0; font-style: italic; color: #666;">${newMessage}</blockquote>
                                <p>God bless,</p>
                                <p><strong>The Testify Team</strong></p>
                              </div>
                            </div>
                        `;

                        batch.set(mailRef, {
                            to: [recipientInfo.email],
                            message: { subject, html },
                        });
                    }
                });
                await batch.commit();
            }

            setNewMessage('');
            setReplyingTo(null);
            setTimeout(() => scrollToBottom("smooth"), 100);
        } catch (error) {
            const permissionError = new FirestorePermissionError({
                path: `chats/${chatId}/messages`,
                operation: 'create',
                requestResourceData: { text: newMessage, sender: user.uid }
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSending(false);
        }
    };

    const handleUpdateMessage = async () => {
        if (!editingMessageId || !newMessage.trim() || !user || !firestore || isUpdatingMessage) return;
        
        setIsUpdatingMessage(true);
        const messageRef = doc(firestore, 'chats', chatId, 'messages', editingMessageId);
        const updateData = {
            text: newMessage.trim(),
            updatedAt: serverTimestamp()
        };

        updateDoc(messageRef, updateData)
            .then(() => {
                setEditingMessageId(null);
                setNewMessage('');
                toast({ title: 'Message Updated' });
            })
            .catch((err: any) => {
                const message = err.code === 'permission-denied' 
                    ? 'Could not update message. Time window may have expired (24h max).' 
                    : 'An unexpected error occurred. Please try again.';
                toast({ variant: 'destructive', title: 'Edit Failed', description: message });
            })
            .finally(() => setIsUpdatingMessage(false));
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (!user || !firestore) return;
        
        const messageRef = doc(firestore, 'chats', chatId, 'messages', msgId);
        deleteDoc(messageRef)
            .then(() => {
                toast({ title: 'Message Removed' });
            })
            .catch((err: any) => {
                const message = err.code === 'permission-denied' 
                    ? 'Could not delete message. Time window may have expired (24h max).' 
                    : 'An unexpected error occurred.';
                toast({ variant: 'destructive', title: 'Delete Failed', description: message });
            });
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingMessageId) {
            handleUpdateMessage();
        } else {
            sendMessage();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Escape' && editingMessageId) {
            setEditingMessageId(null);
            setNewMessage('');
        }
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (editingMessageId) {
                handleUpdateMessage();
            } else {
                sendMessage();
            }
        }
    };

    if (loading) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading chat...</p>
            </div>
        );
    }
    
    if (!chat) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center bg-background text-left">
                <p className="text-muted-foreground text-left">Chat not found.</p>
                 <Button variant="outline" asChild className="mt-4 text-left text-left">
                    <Link href="/chats"><ArrowLeft className="mr-2 h-4 w-4 text-left text-left" />Back to Conversations</Link>
                </Button>
            </div>
        );
    }
    
    if (!user || !chat.participantIds.includes(user.uid)) {
        const backUrl = chat.fellowshipId ? `/fellowship/${chat.fellowshipId}` : chat.campaignId ? `/campaigns/${chat.campaignId}` : chat.eventId ? "/events" : "/chats";
        const backLabel = chat.fellowshipId || chat.campaignId || chat.eventId ? "Return to Group" : "Back to Conversations";
        return (
            <div className="flex h-full w-full flex-col items-center justify-center bg-background text-left">
                <p className="text-muted-foreground text-left text-left">You do not have permission to view this chat.</p>
                <Button variant="outline" asChild className="mt-4 text-left text-left">
                    <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4 text-left text-left" />{backLabel}</Link>
                </Button>
            </div>
        );
    }

    const otherParticipantId = !chat.isGroupChat ? chat.participantIds.find(id => id !== user.uid) : null;
    const otherParticipantInfo = otherParticipantId ? chat.participantInfo[otherParticipantId] : null;

    return (
        <div className="flex flex-col w-full h-full min-h-0 bg-background overflow-hidden relative text-left">
            <div className="flex items-center gap-4 p-4 shrink-0 border-b bg-background/80 backdrop-blur-md z-20 text-left">
                <Button variant="outline" size="icon" onClick={handleBack} className="rounded-full text-left">
                    <ArrowLeft className="h-4 w-4 text-left" />
                    <span className="sr-only text-left">Back</span>
                </Button>
                {chat.isGroupChat ? (
                    <div className="flex items-center gap-3 text-left text-left">
                        <Avatar className="border-2 border-primary/20 shadow-sm text-left">
                            <AvatarFallback className="font-black bg-primary/10 text-primary text-left">{chat.participantIds.length}</AvatarFallback>
                        </Avatar>
                        <div className="text-left text-left text-left text-left">
                            <h2 className="font-black text-sm sm:text-base leading-tight uppercase tracking-tight truncate max-w-[180px] sm:max-w-xs text-left text-left">
                                {chat.campaignId && campaign ? (
                                    <Link href={`/campaigns/${chat.campaignId}`} className="hover:underline text-left text-left">
                                        {chat.campaignTitle}
                                    </Link>
                                ) : chat.fellowshipId && fellowship ? (
                                    <Link href={`/fellowship/${chat.fellowshipId}`} className="hover:underline text-left text-left text-left">
                                        {chat.campaignTitle}
                                    </Link>
                                ) : chat.eventId && event ? (
                                    <Link href={`/events`} className="hover:underline text-left text-left text-left">
                                        {chat.campaignTitle}
                                    </Link>
                                ) : (
                                    <span className="text-left text-left">{chat.campaignTitle}</span>
                                )}
                            </h2>
                            <ChatParticipantsDialog chat={chat}>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors cursor-pointer text-left text-left text-left">{chat.participantIds.length} members</p>
                            </ChatParticipantsDialog>
                        </div>
                    </div>
                ) : otherParticipantInfo && otherParticipantId ? (
                   <div className="flex items-center gap-3 flex-grow text-left text-left text-left text-left">
                        <Dialog>
                            <DialogTrigger asChild disabled={!otherParticipantInfo.photoURL}>
                                <div className="relative text-left text-left text-left text-left">
                                    <LiveChatAvatar 
                                        userId={otherParticipantId} 
                                        fallbackUrl={otherParticipantInfo.photoURL} 
                                        fallbackInitials={otherParticipantInfo.firstName?.charAt(0) || 'U'}
                                        className={cn("h-11 w-11 sm:h-12 sm:w-12 border shadow-sm text-left text-left", otherParticipantInfo.photoURL && "cursor-pointer hover:scale-105 active:scale-95 transition-transform text-left text-left")}
                                    />
                                </div>
                            </DialogTrigger>
                            {otherParticipantInfo.photoURL && (
                                <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-left text-left">
                                    <DialogHeader className="sr-only text-left text-left">
                                        <DialogTitle className="text-left text-left">Profile photo of {otherParticipantInfo.firstName} {otherParticipantInfo.lastName}</DialogTitle>
                                        <DialogDescription className="text-left text-left text-left">Full screen view of the user's profile photo.</DialogDescription>
                                    </DialogHeader>
                                    <div className="relative h-full w-full flex items-center justify-center p-4 text-left text-left text-left">
                                        <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-left text-left text-left">
                                            <Image 
                                                src={otherParticipantInfo.photoURL} 
                                                alt={`${otherParticipantInfo.firstName} ${otherParticipantInfo.lastName}`} 
                                                fill 
                                                className="object-contain shadow-2xl ring-4 ring-white/10 text-left text-left text-left text-left" 
                                                unoptimized 
                                            />
                                        </div>
                                    </div>
                                </DialogContent>
                            )}
                        </Dialog>
                        <div className="flex-grow min-w-0 text-left text-left text-left text-left">
                            <h2 className="font-black text-sm sm:text-base uppercase tracking-tight truncate leading-tight text-left text-left">
                                <Link href={`/profile/${otherParticipantId}`} className="hover:underline text-left text-left">
                                    {otherParticipantInfo.firstName} {otherParticipantInfo.lastName}
                                </Link>
                            </h2>
                            {chat.campaignTitle ? (
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate max-w-[150px] sm:max-w-xs text-left text-left">
                                    RE: <span className="italic text-left text-left">"{chat.campaignTitle}"</span>
                                </p>
                            ) : (
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-left text-left">Accountability Partner</p>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>

            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto min-h-0 bg-muted/5 relative overscroll-contain text-left text-left"
            >
                <div className="px-4 py-6 space-y-2 text-left text-left">
                    <TooltipProvider>
                        {messageGroups.length > 0 ? (
                           <div className="space-y-2 text-left text-left text-left text-left">
                                {messageGroups.map((group) => (
                                <div key={group.date.toISOString()} className="relative text-left text-left text-left">
                                    <div className="sticky top-0 z-10 flex justify-center my-4 text-left text-left">
                                        <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/80 backdrop-blur-sm rounded-full border shadow-sm text-left text-left">
                                            {format(group.date, 'PPP')}
                                        </div>
                                    </div>
                                    <div className="space-y-4 text-left text-left">
                                        {group.messages.map(msg => {
                                            const senderInfo = chat.participantInfo[msg.senderId];
                                            const isOwnMessage = msg.senderId === user?.uid;
                                            const createdAtDate = safeToDate(msg.createdAt);
                                            const canEdit = isOwnMessage && createdAtDate && differenceInMinutes(new Date(), createdAtDate) < 1440;
                                            const isEditing = editingMessageId === msg.id;

                                            return (
                                            <div key={msg.id} id={`message-${msg.id}`} className={cn(
                                                "group flex w-full items-end gap-2 text-left text-left",
                                                isOwnMessage ? "justify-end" : "justify-start"
                                            )}>
                                                {!isOwnMessage && senderInfo && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="shrink-0 mb-1 text-left text-left">
                                                                <LiveChatAvatar 
                                                                    userId={msg.senderId} 
                                                                    fallbackUrl={senderInfo.photoURL} 
                                                                    fallbackInitials={senderInfo.firstName?.charAt(0) || 'U'}
                                                                    className="h-7 w-7 border shadow-sm text-left text-left"
                                                                />
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="rounded-xl border-primary/20 shadow-xl text-left text-left">
                                                            <p className="font-bold text-xs text-left text-left">{senderInfo.firstName} {senderInfo.lastName}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                                
                                                <div className="relative flex items-center gap-1 group/bubble text-left text-left">
                                                    <div className={cn(
                                                        "absolute top-0 flex h-full items-center justify-center transition-opacity text-left text-left",
                                                        isOwnMessage ? "right-full pr-3" : "left-full pl-3"
                                                    )}>
                                                        <Reply
                                                            className="h-5 w-5 text-muted-foreground text-left text-left"
                                                            style={{
                                                                opacity: Math.min(Math.abs(swipeState.id === msg.id ? swipeState.deltaX : 0) / swipeThreshold, 1)
                                                            }}
                                                        />
                                                    </div>

                                                    {!isOwnMessage && (
                                                        <button
                                                            className="h-7 w-7 text-muted-foreground hover:text-primary transition-all rounded-full opacity-0 group-hover/bubble:opacity-100 order-last shrink-0 text-left text-left"
                                                            onClick={() => setReplyingTo(msg)}
                                                            title="Reply"
                                                        >
                                                            <Reply className="h-3.5 w-3.5 text-left text-left" />
                                                        </button>
                                                    )}

                                                    {canEdit && !isEditing && (
                                                        <div className={cn(
                                                            "opacity-0 group-hover/bubble:opacity-100 transition-opacity text-left text-left",
                                                            isOwnMessage ? "order-first" : "order-last"
                                                        )}>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary text-left text-left">
                                                                        <MoreHorizontal className="h-3.5 w-3.5 text-left text-left" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align={isOwnMessage ? "end" : "start"} className="rounded-xl text-left text-left">
                                                                    <DropdownMenuItem onSelect={() => { 
                                                                        setEditingMessageId(msg.id); 
                                                                        setNewMessage(msg.text || '');
                                                                        setReplyingTo(null);
                                                                    }} className="text-left text-left">
                                                                        <Edit className="mr-2 h-4 w-4 text-primary text-left text-left" /> Edit
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onSelect={() => handleDeleteMessage(msg.id)} className="text-destructive focus:text-destructive text-left text-left">
                                                                        <Trash2 className="mr-2 h-4 w-4 text-left text-left" /> Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    )}

                                                    <div
                                                        style={{
                                                            touchAction: 'pan-y',
                                                            transform: swipeState.id === msg.id ? `translateX(${swipeState.deltaX}px)` : 'translateX(0px)',
                                                            transition: swipeState.id === msg.id && swipeState.deltaX === 0 ? 'transform 0.2s ease-out' : 'none'
                                                        }}
                                                        onTouchStart={(e) => handleTouchStart(e, msg)}
                                                        onTouchMove={(e) => handleTouchMove(e, msg)}
                                                        onTouchEnd={() => handleTouchEnd(msg)}
                                                        className={cn(
                                                            "relative z-10 rounded-2xl px-4 py-2.5 max-w-[280px] sm:max-w-md break-words flex flex-col shadow-sm whitespace-pre-wrap text-left text-left",
                                                            isOwnMessage ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-background border rounded-bl-sm",
                                                            isEditing && "ring-2 ring-primary border-transparent"
                                                        )}>
                                                            {msg.replyTo && (
                                                                <div className="flex items-center gap-1 text-[9px] font-black text-muted-foreground/60 mb-1.5 uppercase tracking-widest text-left text-left">
                                                                    <Reply className="h-2.5 w-2.5 text-left text-left" />
                                                                    Reply
                                                                </div>
                                                            )}

                                                            {msg.replyTo && (
                                                                <div 
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        const repliedMsgEl = document.getElementById(`message-${msg.replyTo!.messageId}`);
                                                                        if (repliedMsgEl) {
                                                                            repliedMsgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                            const parentGroup = repliedMsgEl.closest('.group');
                                                                            parentGroup?.classList.add('animate-pulse-once');
                                                                            setTimeout(() => {
                                                                                parentGroup?.classList.remove('animate-pulse-once');
                                                                            }, 600);
                                                                        }
                                                                    }}
                                                                    className="mb-2 rounded-xl border-l-4 border-primary/50 bg-black/5 p-2 text-xs dark:bg-white/5 block hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer text-left text-left text-left"
                                                                >
                                                                    <p className="font-black text-[9px] uppercase tracking-wider mb-0.5 text-left text-left">{msg.replyTo.senderFirstName} {msg.replyTo.senderLastName}</p>
                                                                    <p className="line-clamp-2 opacity-80 leading-snug text-left text-left">{msg.replyTo.text}</p>
                                                                </div>
                                                            )}

                                                            {chat.isGroupChat && !isOwnMessage && senderInfo && (
                                                                <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 text-left text-left">
                                                                    {senderInfo.firstName} {senderInfo.lastName}
                                                                </div>
                                                            )}

                                                            <p className="text-sm leading-relaxed text-left text-left">{msg.text}</p>

                                                            {createdAtDate && (
                                                                <div className={cn(
                                                                    "flex items-center gap-1.5 mt-1 self-end text-left text-left",
                                                                    isOwnMessage ? "text-primary-foreground/60" : "text-muted-foreground/60"
                                                                )}>
                                                                    {msg.updatedAt && <span className="text-[8px] font-black uppercase tracking-tighter text-left text-left">Edited</span>}
                                                                    <p className="text-[9px] font-bold text-left text-left">
                                                                        {format(createdAtDate, 'p')}
                                                                    </p>
                                                                </div>
                                                            )}
                                                    </div>

                                                    {isOwnMessage && (
                                                        <button
                                                            className="h-7 w-7 text-muted-foreground hover:text-primary transition-all rounded-full opacity-0 group-hover/bubble:opacity-100 order-first shrink-0 text-left text-left"
                                                            onClick={() => setReplyingTo(msg)}
                                                            title="Reply"
                                                        >
                                                            <Reply className="h-3.5 w-3.5 text-left text-left" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </div>
                            ))}
                           </div>
                        ) : (
                            <div className="flex flex-col justify-center items-center h-[50vh] text-center px-8 text-left text-left text-left">
                                <MessagesSquare className="h-12 w-12 text-muted-foreground opacity-20 mb-4 text-left text-left text-left" />
                                <p className="text-muted-foreground text-sm font-medium text-left text-left">No messages yet. Start the conversation to encourage the body of Christ.</p>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="text-left text-left text-left" />
                    </TooltipProvider>
                </div>

                {showScrollBottom && (
                    <Button 
                        size="icon" 
                        variant="secondary" 
                        className="fixed bottom-24 right-6 h-10 w-10 rounded-full shadow-2xl z-30 animate-in fade-in zoom-in duration-200 text-left text-left"
                        onClick={() => scrollToBottom("smooth")}
                    >
                        <ChevronDown className="h-5 w-5 text-left text-left" />
                    </Button>
                )}
            </div>

            <div className="shrink-0 border-t p-4 bg-background pb-[calc(4rem+1rem+env(safe-area-inset-bottom))] md:pb-6 relative z-30 text-left text-left">
                {isChatFrozen ? (
                    <div className="p-4 text-center text-xs font-bold text-muted-foreground bg-muted/30 rounded-2xl border border-dashed text-left text-left">
                        THIS CONVERSATION IS FROZEN (CAMPAIGN ENDED)
                    </div>
                ) : (
                    <>
                    {replyingTo && (
                        <div className="relative rounded-t-[1.5rem] border-x border-t bg-muted/40 p-4 pt-3 pb-4 mb-0 animate-in slide-in-from-bottom-2 duration-200 text-left text-left">
                            <div className="flex items-center justify-between mb-1.5 text-left text-left text-left">
                                <div className="flex items-center gap-2 text-left text-left">
                                    <Reply className="h-3 w-3 text-primary text-left text-left" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary text-left text-left">
                                        Replying to {chat.participantInfo[replyingTo.senderId]?.firstName || 'User'}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full hover:bg-background shadow-sm text-left text-left"
                                    onClick={() => setReplyingTo(null)}
                                >
                                    <X className="h-3.5 w-3.5 text-left text-left" />
                                </Button>
                            </div>
                            <p className="line-clamp-1 text-sm text-muted-foreground italic text-left text-left">&ldquo;{replyingTo.text}&rdquo;</p>
                        </div>
                    )}
                    {editingMessageId && (
                        <div className="relative rounded-t-[1.5rem] border-x border-t bg-primary/10 p-4 pt-3 pb-4 mb-0 animate-in slide-in-from-bottom-2 duration-200 border-primary/20 text-left text-left">
                            <div className="flex items-center justify-between mb-1.5 text-left text-left text-left text-left">
                                <div className="flex items-center gap-2 text-left text-left">
                                    <Edit className="h-3 w-3 text-primary text-left text-left" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary text-left text-left">
                                        Editing Message
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full hover:bg-background shadow-sm text-left text-left"
                                    onClick={() => {
                                        setEditingMessageId(null);
                                        setNewMessage('');
                                    }}
                                >
                                    <X className="h-3.5 w-3.5 text-left text-left" />
                                </Button>
                            </div>
                            <p className="line-clamp-1 text-sm text-muted-foreground italic text-left text-left">&ldquo;{messages?.find(m => m.id === editingMessageId)?.text}&rdquo;</p>
                        </div>
                    )}
                    <form onSubmit={handleFormSubmit} className="flex gap-3 w-full items-center text-left text-left text-left">
                        <Textarea
                            ref={textareaRef}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={editingMessageId ? "Edit your message..." : (replyingTo ? "Type your reply..." : "Type a message...")}
                            disabled={isSending || isUpdatingMessage}
                            className={cn(
                                "min-h-[3rem] max-h-32 py-3 px-4 rounded-2xl shadow-inner border-muted-foreground/20 text-base resize-none overflow-y-auto text-left text-left", 
                                (replyingTo || editingMessageId) && "rounded-t-none border-t-0"
                            )}
                        />
                        <Button type="submit" size="icon" className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-2xl shadow-xl transition-all active:scale-90 bg-primary hover:shadow-primary/20 text-left text-left" disabled={!newMessage.trim() || isSending || isUpdatingMessage}>
                            {isSending || isUpdatingMessage ? <Loader2 className="h-5 w-5 animate-spin text-left text-left" /> : (editingMessageId ? <Check className="h-5 w-5 text-left text-left" /> : <Send className="h-5 w-5 fill-current text-left text-left" />)}
                        </Button>
                    </form>
                    </>
                )}
            </div>
        </div>
    )
}
