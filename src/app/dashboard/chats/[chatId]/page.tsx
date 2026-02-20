
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
} from 'firebase/firestore';
import type { Chat, ChatMessage } from '@/lib/types';
import { Loader2, Send, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export default function ChatPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const chatId = params.chatId as string;

    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const chatDocRef = useMemo(() => {
        if (!user?.uid || !firestore || !chatId) return null;
        return doc(firestore, 'chats', chatId);
    }, [user?.uid, firestore, chatId]);
    const { data: chat, loading: loadingChat } = useDoc<Chat>(chatDocRef);
    
    const messagesQuery = useMemo(() => {
        if (!user?.uid || !firestore || !chatId) return null;
        return query(collection(firestore, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    }, [user?.uid, firestore, chatId]);
    const { data: messages, loading: loadingMessages } = useCollection<ChatMessage>(messagesQuery);
    
    const loading = userLoading || loadingChat || loadingMessages;

    const messageGroups = useMemo(() => {
        if (!messages) return [];
        const groups: { date: Date; messages: ChatMessage[] }[] = [];
        messages.forEach(message => {
            if (!message.createdAt) return;
            const messageDate = message.createdAt.toDate();
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
        if (scrollAreaRef.current) {
            const scrollableView = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (scrollableView) {
                setTimeout(() => {
                     scrollableView.scrollTop = scrollableView.scrollHeight;
                }, 100);
            }
        }
    }, [messageGroups]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !firestore || !chatId || isSending || !chat) return;
        
        setIsSending(true);

        try {
            const messagesRef = collection(firestore, 'chats', chatId, 'messages');
            await addDoc(messagesRef, {
                senderId: user.uid,
                text: newMessage,
                createdAt: serverTimestamp(),
            });

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
                    
                    // In-app notification
                    batch.set(notificationRef, {
                        userId: participantId,
                        type: 'new_chat_message',
                        title: chat.isGroupChat 
                            ? `New Message in ${chat.campaignTitle}`
                            : `New Message from ${user.displayName || 'User'}`,
                        message: chat.isGroupChat
                            ? `${user.displayName || 'User'}: ${newMessage.substring(0, 50)}${newMessage.length > 50 ? '...' : ''}`
                            : `Regarding: ${chat.campaignTitle}`,
                        link: `/dashboard/chats/${chatId}`,
                        isRead: false,
                        createdAt: serverTimestamp()
                    });

                    // Email notification
                    const mailCollectionRef = collection(firestore, 'mail');
                    const mailRef = doc(mailCollectionRef);
                    const subject = chat.isGroupChat
                        ? `New Message in "${chat.campaignTitle}" Group Chat`
                        : `New Message from ${user.displayName || 'User'} | Testify Global`;

                    const html = `
                        <p>Hi ${recipientInfo?.displayName || 'there'},</p>
                        <p>You have a new message from <strong>${user.displayName || 'a user'}</strong> in the chat for the campaign "<strong>${chat.campaignTitle}</strong>".</p>
                        <p><em>${newMessage}</em></p>
                        <p>You can view the full conversation and reply by clicking the button below:</p>
                        <a href="${link}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; background-color: #3b82f6; text-decoration: none; border-radius: 5px;">View Chat</a>
                        <br><br>
                        <p>God bless,</p>
                        <p>The Testify Global Team</p>
                    `;

                    batch.set(mailRef, {
                        toUids: [participantId],
                        message: { subject, html },
                    });
                });
                await batch.commit();
            }

            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
            toast({
              variant: "destructive",
              title: "Error Sending Message",
              description: "Could not send your message. Please try again.",
            });
        } finally {
            setIsSending(false);
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
        <div className="flex flex-col h-full max-h-[calc(100vh-10rem)] w-full">
            <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                {chat.isGroupChat ? (
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarFallback>{chat.participantIds.length}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="font-semibold">
                                <Link href={`/dashboard/campaigns#${chat.campaignId}`} className="hover:underline">
                                    {chat.campaignTitle}
                                </Link>
                                 (Group)
                            </h2>
                            <p className="text-sm text-muted-foreground">{chat.participantIds.length} participants</p>
                        </div>
                    </div>
                ) : otherParticipantInfo && otherParticipantId ? (
                    <Link href={`/dashboard/profile/${otherParticipantId}`} className="flex items-center gap-3 hover:bg-muted/50 p-2 rounded-lg -mx-2 transition-colors">
                         <Avatar>
                            <AvatarImage src={otherParticipantInfo.photoURL} />
                            <AvatarFallback>{otherParticipantInfo.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="font-semibold">{otherParticipantInfo.displayName}</h2>
                            <p className="text-sm text-muted-foreground">
                                Regarding: <Link href={`/dashboard/campaigns#${chat.campaignId}`} onClick={(e) => e.stopPropagation()} className="hover:underline">{chat.campaignTitle}</Link>
                            </p>
                        </div>
                    </Link>
                ) : null}
            </div>

            <Card className="flex flex-col flex-grow">
                <CardContent className="p-0 flex-grow flex flex-col">
                    <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
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
                                            return (
                                            <div key={msg.id} className={cn(
                                                "flex items-end gap-2 w-full",
                                                msg.senderId === user?.uid ? "justify-end" : "justify-start"
                                            )}>
                                                {msg.senderId !== user?.uid && senderInfo && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Link href={`/dashboard/profile/${msg.senderId}`}>
                                                                    <Avatar className="h-8 w-8">
                                                                        <AvatarImage src={senderInfo.photoURL} />
                                                                        <AvatarFallback>{senderInfo.displayName.charAt(0)}</AvatarFallback>
                                                                    </Avatar>
                                                                </Link>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{senderInfo.displayName}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                                <div className={cn(
                                                    "rounded-lg px-3 py-2 max-w-sm sm:max-w-md break-words flex flex-col",
                                                    msg.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-muted"
                                                )}>
                                                    {chat.isGroupChat && msg.senderId !== user?.uid && senderInfo && (
                                                        <Link href={`/dashboard/profile/${msg.senderId}`} className="text-xs font-bold mb-1 hover:underline">
                                                          {senderInfo.displayName}
                                                        </Link>
                                                    )}
                                                    {msg.text && <p className="text-sm">{msg.text}</p>}
                                                    {msg.createdAt && (
                                                        <p className={cn(
                                                            "text-xs mt-1 self-end",
                                                            msg.senderId === user?.uid ? "text-primary-foreground/70" : "text-muted-foreground/70"
                                                        )}>
                                                            {format(msg.createdAt.toDate(), 'p')}
                                                        </p>
                                                    )}
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
                    </ScrollArea>
                </CardContent>

                <CardFooter className="p-2 border-t bg-background flex flex-col items-stretch gap-1">
                    <form onSubmit={handleSendMessage} className="flex gap-2 w-full items-center p-2">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            disabled={isSending}
                            autoComplete="off"
                        />
                        <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    )
}
