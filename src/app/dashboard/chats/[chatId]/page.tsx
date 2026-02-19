
'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useStorage } from '@/firebase';
import {
  collection,
  query,
  addDoc,
  serverTimestamp,
  orderBy,
  doc,
  updateDoc,
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

    const chatDocRef = !userLoading && user && firestore && chatId ? doc(firestore, 'chats', chatId) : null;
    const { data: chat, loading: loadingChat } = useDoc<Chat>(chatDocRef);
    
    const messagesQuery = !userLoading && user && firestore && chatId ? query(collection(firestore, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc')) : null;
    const { data: messages, loading: loadingMessages } = useCollection<ChatMessage>(messagesQuery);
    
    const loading = userLoading || loadingChat || loadingMessages;
    
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollableView = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (scrollableView) {
                scrollableView.scrollTop = scrollableView.scrollHeight;
            }
        }
    }, [messages]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !firestore || !storage || !chatId) return;

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
        if (!newMessage.trim() || !user || !firestore || !chatId || isSending) return;
        
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

    const otherParticipantId = chat.participantIds.find(id => id !== user.uid);
    const otherParticipantInfo = otherParticipantId ? chat.participantInfo[otherParticipantId] : null;

    return (
        <div className="flex flex-col h-full max-h-[calc(100vh-10rem)] w-full">
            <div className="flex items-center gap-4 mb-4">
                 <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                {otherParticipantInfo && (
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
                )}
            </div>

            <Card className="flex flex-col flex-grow">
                <CardContent className="p-0 flex-grow flex flex-col">
                    <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
                        {messages && messages.length > 0 ? (
                            <div className="space-y-4">
                                {messages.map(msg => (
                                    <div key={msg.id} className={cn(
                                        "flex items-end gap-2",
                                        msg.senderId === user?.uid ? "justify-end" : "justify-start"
                                    )}>
                                        {msg.senderId !== user?.uid && otherParticipantInfo && <Avatar className="h-8 w-8"><AvatarImage src={otherParticipantInfo.photoURL} /><AvatarFallback>{otherParticipantInfo.displayName.charAt(0)}</AvatarFallback></Avatar>}
                                        <div className={cn(
                                            "rounded-lg px-3 py-2 max-w-sm sm:max-w-md break-words",
                                            msg.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-muted"
                                        )}>
                                            {msg.imageUrl && <Image src={msg.imageUrl} alt="Uploaded image" width={300} height={200} className="rounded-md object-cover" />}
                                            {msg.videoUrl && <video src={msg.videoUrl} controls className="rounded-md max-w-full" />}
                                            {msg.text && <p className={cn((msg.imageUrl || msg.videoUrl) && 'mt-2')}>{msg.text}</p>}
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
