
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useStorage } from '@/firebase';
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
import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
} from 'firebase/storage';
import type { Chat, ChatMessage } from '@/lib/types';
import { Loader2, Send, ArrowLeft, Paperclip } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export default function ChatPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const chatId = params.chatId as string;

    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const chatDocRef = useMemo(() => !userLoading && user && firestore && chatId ? doc(firestore, 'chats', chatId) : null, [userLoading, user, firestore, chatId]);
    const { data: chat, loading: loadingChat } = useDoc<Chat>(chatDocRef);
    
    const messagesQuery = useMemo(() => !userLoading && user && firestore && chatId ? query(collection(firestore, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc')) : null, [userLoading, user, firestore, chatId]);
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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !firestore || !storage || !chatId || !chat) return;

        setIsSending(true);
        setUploadProgress(0);

        const storageRef = ref(storage, `chat_media/${chatId}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error("Upload failed:", error);
                toast({ variant: "destructive", title: "Upload failed", description: "Could not upload the file." });
                setIsSending(false);
                setUploadProgress(null);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    const messagesRef = collection(firestore, 'chats', chatId, 'messages');
                    const messageData: Partial<ChatMessage> = {
                        senderId: user.uid,
                        createdAt: serverTimestamp(),
                    };

                    if (file.type.startsWith('image/')) {
                        messageData.imageUrl = downloadURL;
                    } else if (file.type.startsWith('video/')) {
                        messageData.videoUrl = downloadURL;
                    }

                    await addDoc(messagesRef, messageData);
                    const chatRef = doc(firestore, 'chats', chatId);
                    await updateDoc(chatRef, {
                        lastUpdatedAt: serverTimestamp(),
                        hasMessages: true,
                    });
                    
                    const otherParticipantIds = chat.participantIds.filter(id => id !== user.uid);
                    if (otherParticipantIds.length > 0) {
                        const batch = writeBatch(firestore);
                        otherParticipantIds.forEach(participantId => {
                            const notificationsCollectionRef = collection(firestore, 'users', participantId, 'notifications');
                            const notificationRef = doc(notificationsCollectionRef);
                            batch.set(notificationRef, {
                                userId: participantId,
                                type: 'new_chat_message',
                                title: chat.isGroupChat 
                                    ? `New File in ${chat.campaignTitle}`
                                    : `New File from ${user.displayName || 'User'}`,
                                message: `Sent by ${user.displayName || 'User'}`,
                                link: `/dashboard/chats/${chatId}`,
                                isRead: false,
                                createdAt: serverTimestamp()
                            });
                        });
                        await batch.commit();
                    }

                } catch (error) {
                    console.error("Error sending file message:", error);
                } finally {
                    setIsSending(false);
                    setUploadProgress(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                }
            }
        );
    };


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
                otherParticipantIds.forEach(participantId => {
                    const notificationsCollectionRef = collection(firestore, 'users', participantId, 'notifications');
                    const notificationRef = doc(notificationsCollectionRef);
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
                });
                await batch.commit();
            }

            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
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
                            <h2 className="font-semibold">{chat.campaignTitle} (Group)</h2>
                            <p className="text-sm text-muted-foreground">{chat.participantIds.length} participants</p>
                        </div>
                    </div>
                ) : otherParticipantInfo ? (
                    <div className="flex items-center gap-3">
                         <Avatar>
                            <AvatarImage src={otherParticipantInfo.photoURL} />
                            <AvatarFallback>{otherParticipantInfo.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="font-semibold">{otherParticipantInfo.displayName}</h2>
                            <p className="text-sm text-muted-foreground">Regarding: {chat.campaignTitle}</p>
                        </div>
                    </div>
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
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={senderInfo.photoURL} />
                                                                    <AvatarFallback>{senderInfo.displayName.charAt(0)}</AvatarFallback>
                                                                </Avatar>
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
                                                        <p className="text-xs font-bold mb-1">{senderInfo.displayName}</p>
                                                    )}
                                                    {msg.imageUrl && <Image src={msg.imageUrl} alt="Uploaded image" width={300} height={200} className="rounded-md object-cover" />}
                                                    {msg.videoUrl && <video src={msg.videoUrl} controls className="rounded-md max-w-full" />}
                                                    {msg.text && <p className={cn("text-sm", (msg.imageUrl || msg.videoUrl) && 'mt-2')}>{msg.text}</p>}
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
                     {uploadProgress !== null && (
                        <Progress value={uploadProgress} className="w-full h-1" />
                    )}
                    <form onSubmit={handleSendMessage} className="flex gap-2 w-full items-center p-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" disabled={isSending} />
                        <Button type="button" size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={isSending}>
                            <Paperclip className="h-4 w-4" />
                        </Button>
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            disabled={isSending}
                            autoComplete="off"
                        />
                        <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                            {isSending && !uploadProgress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    )
}
