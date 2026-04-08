'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import {
  collection,
  query,
  addDoc,
  serverTimestamp,
  orderBy,
  doc,
  updateDoc,
  writeBatch,
  type FieldValue,
  where,
  getDocs,
} from 'firebase/firestore';
import type { Chat, ChatMessage, Campaign } from '@/lib/types';
import { Loader2, Send, ArrowLeft, Reply, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, differenceInHours } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { safeToDate } from '@/lib/utils';
import { ChatParticipantsDialog } from '@/components/chat/participants-dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { PlaceHolderImages } from '@/lib/placeholder-images';


export default function ChatPageClient({ chatId }: { chatId: string }) {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [swipeState, setSwipeState] = useState<{ id: string | null; startX: number; startY: number; deltaX: number }>({ id: null, startX: 0, startY: 0, deltaX: 0 });
    const swipeThreshold = 60;

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, msg: ChatMessage) => {
        if (e.touches.length === 1) {
            setSwipeState({ id: msg.id, startX: e.touches[0].clientX, startY: e.touches[0].clientY, deltaX: 0 });
        }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>, msg: ChatMessage) => {
        if (swipeState.id !== msg.id || e.touches.length !== 1) return;

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

    const messagesQuery = useMemo(() => {
        if (!user?.uid || !firestore || !chatId) return null;
        return query(collection(firestore, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    }, [user?.uid, firestore, chatId]);
    const { data: messages, loading: loadingMessages } = useCollection<ChatMessage>(messagesQuery);
    
    const loading = userLoading || loadingChat || loadingMessages || loadingCampaign;

    useEffect(() => {
        if (!user?.uid || !firestore || !chatId) return;

        const markNotificationsAsRead = async () => {
            try {
                const notificationsRef = collection(firestore, `users/${user.uid}/notifications`);
                const q = query(
                    notificationsRef,
                    where('link', '==', `/dashboard/chats/${chatId}`),
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
                // This can fail silently as it's not critical. The user can clear them from the notifications page.
                console.warn("Failed to mark chat notifications as read:", error);
            }
        };

        markNotificationsAsRead();
    }, [user?.uid, firestore, chatId]);

    const isChatFrozen = useMemo(() => {
        if (!chat || !campaign) return false;
        if (!chat.isGroupChat) return false;

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

        return differenceInHours(now, endDateTime) > 24;
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
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messageGroups]);

    const sendMessage = async () => {
        if (!newMessage.trim() || !user || !firestore || !chatId || isSending || !chat || isChatFrozen) return;
        
        setIsSending(true);

        try {
            const messagesRef = collection(firestore, 'chats', chatId, 'messages');
            
            const newDocData: {
                senderId: string;
                text: string;
                createdAt: FieldValue;
                replyTo?: {
                    messageId: string;
                    text: string;
                    senderFirstName: string;
                    senderLastName: string;
                }
            } = {
                senderId: user.uid,
                text: newMessage,
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
                const link = `${window.location.origin}/dashboard/chats/${chatId}`;

                otherParticipantIds.forEach(participantId => {
                    const recipientInfo = chat.participantInfo[participantId];
                    const notificationsCollectionRef = collection(firestore, 'users', participantId, 'notifications');
                    const notificationRef = doc(notificationsCollectionRef);
                    
                    const title = chat.isGroupChat
                        ? `New ${replyingTo ? 'reply' : 'message'} in ${chat.campaignTitle}`
                        : `New Message from ${user.displayName || 'User'}`;
                    const message = chat.campaignTitle
                        ? `${user.displayName || 'User'}: ${newMessage.substring(0, 50)}${newMessage.length > 50 ? '...' : ''}`
                        : `You have a new message from your accountability partner.`;

                    // In-app notification
                    batch.set(notificationRef, {
                        userId: participantId,
                        type: 'new_chat_message',
                        title: title,
                        message: message,
                        link: `/dashboard/chats/${chatId}`,
                        isRead: false,
                        createdAt: serverTimestamp()
                    });

                    // Email notification
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
                                  <img src="${logoUrl}" alt="Testify Logo" style="width: 80px; height: 80px; border-radius: 8px;">
                                </div>
                                <p>Hi ${recipientInfo?.firstName || 'there'},</p>
                                <p>You have a new ${replyingTo ? 'reply' : 'message'} from <strong>${user.displayName || 'a user'}</strong> ${chat.campaignTitle ? `in the chat for the campaign "<strong>${chat.campaignTitle}</strong>"` : ''}.</p>
                                <blockquote style="border-left: 4px solid #ccc; padding-left: 1rem; margin-left: 0; font-style: italic; color: #666;">${newMessage}</blockquote>
                                <p>You can view the full conversation and reply by clicking the button below:</p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${link}" style="background-color: #3b82f6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">View Chat</a>
                                </div>
                                <p>God bless,</p>
                                <p><strong>The Testify Team</strong></p>
                              </div>
                               <div style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
                                <p>You received this email because you have notifications enabled for Testify chats.</p>
                                <p>&copy; Testify. All rights reserved.</p>
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
        } catch (error) {
            console.error("Error sending message:", error);
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

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
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
            <div className="flex h-full w-full flex-col items-center justify-center bg-background">
                <p className="text-muted-foreground">Chat not found.</p>
                 <Button variant="outline" asChild className="mt-4">
                    <Link href="/dashboard/chats"><ArrowLeft className="mr-2 h-4 w-4" />Back to Chats</Link>
                </Button>
            </div>
        );
    }
    
    if (!user || !chat.participantIds.includes(user.uid)) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center bg-background">
                <p className="text-muted-foreground">You do not have permission to view this chat.</p>
                <Button variant="outline" asChild className="mt-4">
                    <Link href="/dashboard/chats"><ArrowLeft className="mr-2 h-4 w-4" />Back to Chats</Link>
                </Button>
            </div>
        );
    }

    const otherParticipantId = !chat.isGroupChat ? chat.participantIds.find(id => id !== user.uid) : null;
    const otherParticipantInfo = otherParticipantId ? chat.participantInfo[otherParticipantId] : null;

    return (
        <div className="flex flex-col w-full h-full">
            <div className="flex items-center gap-4 p-4 shrink-0 border-b">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                {chat.isGroupChat && campaign ? (
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarFallback>{chat.participantIds.length}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="font-semibold">
                                <Link href={`/dashboard/campaigns/${chat.campaignId}`} className="hover:underline">
                                    {chat.campaignTitle}
                                </Link>
                                 (Group)
                            </h2>
                            <ChatParticipantsDialog chat={chat}>
                                <p className="text-sm text-muted-foreground hover:underline cursor-pointer">{chat.participantIds.length} participants</p>
                            </ChatParticipantsDialog>
                        </div>
                    </div>
                ) : otherParticipantInfo && otherParticipantId ? (
                   <div className="flex items-center gap-3 flex-grow">
                        <div className="relative">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={otherParticipantInfo.photoURL} />
                                <AvatarFallback>{otherParticipantInfo.firstName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="flex-grow">
                            <h2 className="font-semibold">
                                {otherParticipantInfo.firstName} {otherParticipantInfo.lastName}
                            </h2>
                            {chat.campaignTitle && chat.campaignId ? (
                                <p className="text-sm text-muted-foreground">
                                    Regarding: <Link href={`/dashboard/campaigns/${chat.campaignId}`} className="hover:underline">{chat.campaignTitle}</Link>
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">Accountability Partner</p>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="flex-1 px-4 py-4 overflow-y-auto min-h-0">
                <TooltipProvider>
                    {messageGroups.length > 0 ? (
                       <div className="space-y-2">
                            {messageGroups.map((group) => (
                            <div key={group.date.toISOString()} className="relative">
                                <div className="sticky top-0 z-10 flex justify-center my-4">
                                    <div className="px-3 py-1 text-xs text-muted-foreground bg-muted/80 backdrop-blur-sm rounded-full">
                                        {format(group.date, 'PPP')}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {group.messages.map(msg => {
                                        const senderInfo = chat.participantInfo[msg.senderId];
                                        const isOwnMessage = msg.senderId === user?.uid;
                                        const createdAtDate = safeToDate(msg.createdAt);
                                        return (
                                        <div key={msg.id} id={`message-${msg.id}`} className={cn(
                                            "group flex w-full items-end gap-2",
                                            isOwnMessage ? "justify-end" : "justify-start"
                                        )}>
                                            {!isOwnMessage && senderInfo && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div>
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={senderInfo.photoURL} />
                                                                <AvatarFallback>{senderInfo.firstName?.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{senderInfo.firstName} {senderInfo.lastName}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            
                                            <div className="relative flex items-center">
                                                <div className={cn(
                                                    "absolute top-0 flex h-full items-center justify-center transition-opacity",
                                                    isOwnMessage ? "right-full pr-3" : "left-full pl-3"
                                                )}>
                                                    <Reply
                                                        className="h-5 w-5 text-muted-foreground"
                                                        style={{
                                                            opacity: Math.min(Math.abs(swipeState.id === msg.id ? swipeState.deltaX : 0) / swipeThreshold, 1)
                                                        }}
                                                    />
                                                </div>

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
                                                        "relative z-10 rounded-lg px-3 py-2 max-w-sm sm:max-w-md break-words flex flex-col",
                                                        isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
                                                    )}>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={cn(
                                                                "absolute top-0 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 hidden sm:flex",
                                                                isOwnMessage ? "-left-8" : "-right-8"
                                                            )}
                                                            onClick={() => setReplyingTo(msg)}
                                                        >
                                                            <Reply className="h-3 w-3" />
                                                        </Button>

                                                        {msg.replyTo && (
                                                            <a 
                                                                href={`#message-${msg.replyTo.messageId}`} 
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    const repliedMsgEl = document.getElementById(`message-${msg.replyTo.messageId}`);
                                                                    if (repliedMsgEl) {
                                                                        repliedMsgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                        const parentGroup = repliedMsgEl.closest('.group');
                                                                        parentGroup?.classList.add('animate-pulse-once');
                                                                        setTimeout(() => {
                                                                            parentGroup?.classList.remove('animate-pulse-once');
                                                                        }, 600);
                                                                    }
                                                                }}
                                                                className="mb-1.5 rounded-md border-l-2 border-primary/50 bg-black/10 p-2 text-xs dark:bg-white/10 block hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                                                            >
                                                                <p className="font-bold">{msg.replyTo.senderFirstName} {msg.replyTo.senderLastName}</p>
                                                                <p className="line-clamp-2">{msg.replyTo.text}</p>
                                                            </a>
                                                        )}

                                                        {chat.isGroupChat && !isOwnMessage && senderInfo && (
                                                            <div className="text-xs font-bold mb-1">
                                                                {senderInfo.firstName} {senderInfo.lastName}
                                                            </div>
                                                        )}
                                                        {msg.text && <p className="text-sm">{msg.text}</p>}
                                                        {createdAtDate && (
                                                            <p className={cn(
                                                                "text-xs mt-1 self-end",
                                                                isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground/70"
                                                            )}>
                                                                {format(createdAtDate, 'p')}
                                                            </p>
                                                        )}
                                                </div>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        ))}
                       </div>
                    ) : (
                        <div className="flex justify-center items-center h-full">
                            <p className="text-muted-foreground text-sm">Send a message to start the conversation.</p>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </TooltipProvider>
            </div>

            <div className="shrink-0 border-t p-4 bg-background pb-20 md:pb-4">
                {isChatFrozen ? (
                    <div className="p-3 text-center text-sm text-muted-foreground bg-muted/50">
                        This group chat has been frozen as the campaign ended more than 24 hours ago.
                    </div>
                ) : (
                    <>
                    {replyingTo && (
                        <div className="relative rounded-t-lg border bg-muted/50 p-3 pt-2 pb-3 mb-2">
                            <p className="text-xs font-bold">
                                Replying to {chat.participantInfo[replyingTo.senderId]?.firstName || 'User'}
                            </p>
                            <p className="line-clamp-1 text-sm text-muted-foreground">{replyingTo.text}</p>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1 h-6 w-6"
                                onClick={() => setReplyingTo(null)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    <form onSubmit={handleFormSubmit} className="flex gap-2 w-full items-center">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            disabled={isSending}
                            autoComplete="off"
                        />
                        <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                    </>
                )}
            </div>
        </div>
    )
}

    