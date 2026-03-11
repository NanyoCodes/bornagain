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

const disciplines = [
  { id: 'pray', label: 'Pray' },
  { id: 'read_bible', label: 'Read Bible' },
  { id: 'attend_church', label: 'Attend Church' },
];

export default function AccountabilityPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isNudging, setIsNudging] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [prayerMessage, setPrayerMessage] = useState('');

  const userDocRef = useMemo(() => {
    if (!user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, loading: loadingProfile } = useDoc<UserProfile>(userDocRef);

  const partnerId = userProfile?.accountabilityPartnerId;

  const partnerDocRef = useMemo(() => {
    if (!partnerId) return null;
    return doc(firestore, 'users', partnerId);
  }, [partnerId, firestore]);

  const { data: partnerProfile, loading: loadingPartner } = useDoc<UserProfile>(partnerDocRef);

  const partnerHistoryQuery = useMemo(() => {
    if (!partnerId) return null;
    return query(
      collection(firestore, 'users', partnerId, 'disciplineHistory'),
      orderBy('date', 'desc'),
      limit(90) // Fetch last 90 days for history
    );
  }, [partnerId, firestore]);

  const { data: partnerHistory, loading: loadingHistory } = useCollection<DailyDisciplineLog>(partnerHistoryQuery);
  
  const completedOnSelectedDate = useMemo(() => {
    if (!date || !partnerHistory) return [];
    const historyForDay = partnerHistory.find(h => isSameDay(h.date.toDate(), date));
    return historyForDay?.completed || [];
  }, [date, partnerHistory]);


  const handleNudge = () => {
    if (!user || !firestore || !partnerId || !userProfile || !partnerProfile) return;
    
    setIsNudging(true);
    
    const notificationsCollectionRef = collection(firestore, 'users', partnerId, 'notifications');
    const message = prayerMessage.trim() ? prayerMessage.trim() : 'Keep up with your daily disciplines! You can do it.';
    const title = prayerMessage.trim() 
      ? `${userProfile.firstName} sent you a prayer!` 
      : `${userProfile.firstName} sent you a nudge!`;
    
    const notificationData = {
      userId: partnerId,
      type: 'accountability_nudge' as const,
      title: title,
      message: message,
      link: '/dashboard/accountability',
      isRead: false,
      createdAt: serverTimestamp()
    };

    addDoc(notificationsCollectionRef, notificationData)
      .then(() => {
        toast({
          title: 'Encouragement Sent!',
          description: `You've sent a message to ${partnerProfile.firstName} ${partnerProfile.lastName}.`
        });
        setPrayerMessage('');
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: notificationsCollectionRef.path,
          operation: 'create',
          requestResourceData: notificationData
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsNudging(false);
      });
  };
  
  const handleInitiateChat = async () => {
    if (!user || !firestore || !partnerId || !userProfile || !partnerProfile) return;
    setIsChatLoading(true);

    try {
        const participantIds = [user.uid, partnerId].sort();
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
                    [partnerId]: {
                        firstName: partnerProfile.firstName,
                        lastName: partnerProfile.lastName,
                        photoURL: partnerProfile.photoURL || '', 
                        email: partnerProfile.email || '',
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
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsChatLoading(false);
    }
  };


  if (loadingProfile || (partnerId && (loadingPartner || loadingHistory))) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading accountability partner...</p>
      </div>
    );
  }

  if (!partnerId || !partnerProfile) {
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
  
  const partnerFullName = [partnerProfile.firstName, partnerProfile.lastName].filter(Boolean).join(' ');

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <Link href={`/dashboard/profile/${partnerId}`}>
          <Avatar className="h-24 w-24 sm:h-20 sm:w-20 border cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarImage src={partnerProfile.photoURL ?? undefined} alt={partnerFullName} />
            <AvatarFallback className="text-4xl sm:text-3xl">{partnerProfile.firstName?.charAt(0)}</AvatarFallback>
          </Avatar>
        </Link>
        <div>
          <p className="text-sm text-muted-foreground">Your Accountability Partner</p>
          <Link href={`/dashboard/profile/${partnerId}`}>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline hover:underline">{partnerFullName}</h1>
          </Link>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Partner's Discipline History</CardTitle>
          <CardDescription>
            Select a date to view {partnerFullName}'s progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-2">
            <div className="space-y-2 self-start">
                <Label htmlFor="history-date">Select a Date</Label>
                <Input
                    id="history-date"
                    type="date"
                    value={date ? format(date, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                        if (e.target.value) {
                            const [year, month, day] = e.target.value.split('-').map(Number);
                            setDate(new Date(year, month - 1, day));
                        } else {
                            setDate(undefined);
                        }
                    }}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full"
                />
            </div>

            <div className="space-y-4">
                <p className="font-semibold text-center">{date ? format(date, 'PPP') : 'Select a day'}</p>
                <div className="grid grid-cols-2 gap-4">
                    {disciplines.map(discipline => (
                        <div
                        key={discipline.id}
                        className={cn(
                            "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                            completedOnSelectedDate.includes(discipline.id)
                            ? "bg-green-100 dark:bg-green-900/20 border-green-500/20"
                            : "bg-muted/50"
                        )}
                        >
                          <div className="h-8 w-8 shrink-0 flex items-center justify-center">
                              {completedOnSelectedDate.includes(discipline.id) ? (
                                  <CheckCircle2 className="h-7 w-7 text-green-600" />
                              ) : (
                                  <div className="h-7 w-7 rounded-full bg-muted border-2" />
                              )}
                          </div>
                          <span className="font-medium text-sm">{discipline.label}</span>
                        </div>
                    ))}
                </div>
                {date && completedOnSelectedDate.length === 0 && (
                    <p className="text-sm text-center text-muted-foreground pt-4">No disciplines completed on this day.</p>
                )}
            </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
               <Button variant="outline" disabled={isNudging} className="w-full sm:w-auto">
                {isNudging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Encouragement
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Send Encouragement</AlertDialogTitle>
                    <AlertDialogDescription>
                        Send a prayer or an encouraging message to {partnerFullName}.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Textarea 
                    placeholder="Type your prayer or message here... (optional)"
                    value={prayerMessage}
                    onChange={(e) => setPrayerMessage(e.target.value)}
                  />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setPrayerMessage('')}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleNudge} disabled={isNudging}>
                        {isNudging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={handleInitiateChat} disabled={isChatLoading} className="w-full sm:w-auto">
              {isChatLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessagesSquare className="mr-2 h-4 w-4" />}
              Chat with Partner
          </Button>
        </CardFooter>
      </Card>

      {userProfile && user && <AccountabilitySettingsCard userProfile={userProfile} userId={user.uid} />}
    </div>
  );
}
