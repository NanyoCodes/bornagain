
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore, useCollection } from '@/firebase';
import {
  collection,
  query,
  where,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
  doc,
  setDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import type { Chat, ChatMessage, Campaign } from '@/lib/types';
import { Loader2, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

interface PrivateChatDialogProps {
  ownerId: string;
  ownerName: string;
  campaign: Campaign;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function PrivateChatDialog({ ownerId, ownerName, campaign, isOpen, onOpenChange }: PrivateChatDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [chatId, setChatId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !user || !firestore) return;

    const findOrCreateChat = async () => {
      setIsLoading(true);
      const participantIds = [user.uid, ownerId].sort();
      const chatsRef = collection(firestore, 'chats');
      const q = query(
        chatsRef,
        where('participantIds', '==', participantIds),
        where('campaignId', '==', campaign.id),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const chatDoc = querySnapshot.docs[0];
        setChatId(chatDoc.id);
      } else {
        setChatId(null); // No chat exists yet, will be created on first message
      }
      setIsLoading(false);
    };

    findOrCreateChat();
  }, [isOpen, user, firestore, ownerId, campaign.id]);
  
  const messagesQuery = chatId && firestore ? query(collection(firestore, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc')) : null;
  const { data: messages } = useCollection<ChatMessage>(messagesQuery);
  
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
    if (!newMessage.trim() || !user || !firestore) return;

    setIsSending(true);
    
    let currentChatId = chatId;

    try {
        // If chat doesn't exist, create it first
        if (!currentChatId) {
            const chatsRef = collection(firestore, 'chats');
            const newChatData = {
                participantIds: [user.uid, ownerId].sort(),
                participantInfo: {
                    [user.uid]: {
                        displayName: user.displayName || 'User',
                        photoURL: user.photoURL || '',
                    },
                    [ownerId]: {
                        displayName: ownerName,
                        photoURL: '', // We might not have this, can be updated later
                    },
                },
                campaignId: campaign.id,
                campaignTitle: campaign.title,
                lastMessageText: newMessage,
                lastUpdatedAt: serverTimestamp(),
            };
            const chatDocRef = await addDoc(chatsRef, newChatData);
            currentChatId = chatDocRef.id;
            setChatId(currentChatId);
        }

        // Add the message
        const messagesRef = collection(firestore, 'chats', currentChatId!, 'messages');
        await addDoc(messagesRef, {
            senderId: user.uid,
            text: newMessage,
            createdAt: serverTimestamp(),
        });

        // Update the last message on the chat document
        const chatRef = doc(firestore, 'chats', currentChatId!);
        await updateDoc(chatRef, {
            lastMessageText: newMessage,
            lastUpdatedAt: serverTimestamp(),
        });

        setNewMessage('');
    } catch (error) {
        console.error("Error sending message:", error);
    } finally {
        setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col h-[70vh]">
        <DialogHeader>
          <DialogTitle>Chat with {ownerName}</DialogTitle>
          <DialogDescription>Regarding campaign: {campaign.title}</DialogDescription>
        </DialogHeader>
        <div className="flex-grow flex flex-col border rounded-lg overflow-hidden">
            <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
                 {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : messages && messages.length > 0 ? (
                    <div className="space-y-4">
                        {messages.map(msg => (
                            <div key={msg.id} className={cn(
                                "flex items-end gap-2",
                                msg.senderId === user?.uid ? "justify-end" : "justify-start"
                            )}>
                                {msg.senderId !== user?.uid && <Avatar className="h-8 w-8"><AvatarFallback>{ownerName.charAt(0)}</AvatarFallback></Avatar>}
                                <div className={cn(
                                    "rounded-lg px-3 py-2 max-w-xs break-words",
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

            <div className="p-4 border-t bg-background">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        disabled={isSending || isLoading}
                        autoComplete="off"
                    />
                    <Button type="submit" size="icon" disabled={isSending || isLoading || !newMessage.trim()}>
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
