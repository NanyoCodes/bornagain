
'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import type { UserProfile, DailyDisciplineLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, HeartHandshake, Send, CheckCircle2, MessagesSquare } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AccountabilitySettingsCard } from '@/components/settings/accountability-settings-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function AccountabilityPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isChatLoading, setIsChatLoading] = useState<string | null>(null);

  const userDocRef = useMemo(() => {
    if (!user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);

  const { data: userProfile, loading: loadingProfile } = useDoc<UserProfile>(userDocRef);

  const handleInitiateChat = async (partner: { userId: string, firstName: string, lastName: string, photoURL?: string }) => {
    if (!user || !firestore || !userProfile) return;
    setIsChatLoading(partner.userId);

    try {
        const participantIds = [user.uid, partner.userId].sort();
        const chatsRef = collection(firestore, 'chats');
        
        const q = query(
            chatsRef,
            where('participantIds', '==', participantIds),
            where('isGroupChat', '==', false)
        );

        const querySnapshot = await getDocs(q);
        let existingChat = querySnapshot.docs.find(doc => !doc.data().campaignId);
        
        let chatId: string;

        if (existingChat) {
            chatId = existingChat.id;
        } else {
            const newChatData = {
                participantIds,
                participantInfo: {
                    [user.uid]: {
                        firstName: userProfile.firstName || '',
                        lastName: userProfile.lastName || '',
                        photoURL: userProfile.photoURL || '',
                        email: userProfile.email || '',
                    },
                    [partner.userId]: {
                        firstName: partner.firstName,
                        lastName: partner.lastName,
                        photoURL: partner.photoURL || '', 
                        email: '', // Not available here, but that's ok
                    },
                },
                lastUpdatedAt: serverTimestamp(),
                isGroupChat: false,
                hasMessages: false,
            };
            const chatDocRef = await addDoc(chatsRef, newChatData);
            chatId = chatDocRef.id;
        }
        router.push(`/dashboard/chats/${chatId}`);

    } catch (error) {
        const permissionError = new FirestorePermissionError({
          path: `chats`,
          operation: 'create',
          requestResourceData: { action: 'initiate partner chat', userId: user.uid }
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsChatLoading(null);
    }
  };

  const isLoading = userLoading || loadingProfile;

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading accountability...</p>
      </div>
    );
  }
  
  const partners = userProfile?.accountabilityPartners || [];

  if (partners.length === 0) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto">
        <div className="flex h-full w-full flex-col items-center justify-center text-center rounded-lg border-2 border-dashed p-6 sm:p-12">
            <HeartHandshake className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-6 text-2xl font-semibold">Find an Accountability Partner</h2>
            <p className="mt-2 max-w-md text-muted-foreground">
            An accountability partner can help you stay on track with your spiritual goals. Send a request to get started!
            </p>
        </div>
        {userProfile && user && <AccountabilitySettingsCard userProfile={userProfile} userId={user.uid} />}
      </div>
    );
  }
  
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
        <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight font-headline">Your Accountability Partners</h1>
            <p className="text-muted-foreground">Your partners in faith. Encourage them and keep each other on track.</p>
        </div>
        <div className="space-y-4">
            {partners.map(partner => (
                <Card key={partner.userId}>
                    <CardHeader className="flex flex-row items-center justify-between">
                         <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border">
                                <AvatarImage src={partner.photoURL} />
                                <AvatarFallback>{partner.firstName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-xl font-semibold">{partner.firstName} {partner.lastName}</h2>
                            </div>
                        </div>
                        <Button onClick={() => handleInitiateChat(partner)} disabled={isChatLoading === partner.userId}>
                            {isChatLoading === partner.userId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessagesSquare className="mr-2 h-4 w-4" />}
                            Chat
                        </Button>
                    </CardHeader>
                </Card>
            ))}
        </div>
      {userProfile && user && <AccountabilitySettingsCard userProfile={userProfile} userId={user.uid} />}
    </div>
  );
}
