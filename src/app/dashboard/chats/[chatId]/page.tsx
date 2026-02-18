
'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import {
  collection,
  query,
  addDoc,
  serverTimestamp,
  orderBy,
  doc,
  updateDoc,
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

export default function ChatPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const params = useParams();
    const router = useRouter();
    const chatId = params.chatId as string;

    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const chatDocRef = firestore && chatId ? doc(firestore, 'chats', chatId) : null;
    const { data: chat, loading: loadingChat } = useDoc<Chat>(chatDocRef);
    
    const messagesQuery = firestore && chatId ? query(collection(firestore, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc')) : null;
    const { data: messages, loading: loadingMessages } = useCollection<ChatMessage>(messagesQuery);
    
    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollableView = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (scrollableView) {
                scrollableView.scrollTop = scrollableView.scrollHeight;
            }
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !firestore || !chatId) return;
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
                lastMessageText: newMessage,
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

    if (loadingChat || loadingMessages) {
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
                                            {msg.text}
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

                <CardFooter className="p-4 border-t bg-background">
                    <form onSubmit={handleSendMessage} className="flex gap-2 w-full">
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
