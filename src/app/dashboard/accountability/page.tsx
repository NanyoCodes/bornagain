
'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import type { UserProfile, DailyDisciplineLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, HeartHandshake, Check, ShieldAlert, TrendingUp, Trophy } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';

const disciplines = [
  { id: 'pray', label: 'Pray' },
  { id: 'read_bible', label: 'Read Bible' },
  { id: 'attend_church', label: 'Attend Church' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'share_testimony', label: 'Share Testimony' },
  { id: 'evangelize', label: 'Evangelize' },
];

export default function AccountabilityPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isNudging, setIsNudging] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());

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

  const completedDays = useMemo(() => {
    return partnerHistory?.filter(h => h.completed.length > 0).map(h => h.date.toDate()) ?? [];
  }, [partnerHistory]);
  
  const completedOnSelectedDate = useMemo(() => {
    if (!date || !partnerHistory) return [];
    const historyForDay = partnerHistory.find(h => isSameDay(h.date.toDate(), date));
    return historyForDay?.completed || [];
  }, [date, partnerHistory]);


  const handleNudge = async () => {
    if (!user || !firestore || !partnerId || !userProfile) return;
    setIsNudging(true);
    try {
      const notificationsCollectionRef = collection(firestore, 'users', partnerId, 'notifications');
      await addDoc(notificationsCollectionRef, {
        userId: partnerId,
        type: 'accountability_nudge',
        title: `${userProfile.displayName} sent you a nudge!`,
        message: 'Keep up with your daily disciplines! You can do it.',
        link: '/dashboard/accountability',
        isRead: false,
        createdAt: serverTimestamp()
      });
      toast({
        title: 'Nudge Sent!',
        description: `You've sent an encouragement to ${partnerProfile?.displayName}.`
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not send nudge. Please try again.'
      });
    } finally {
      setIsNudging(false);
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
        <div className="flex h-full w-full flex-col items-center justify-center text-center rounded-lg border-2 border-dashed p-12">
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
      <div className="flex items-center gap-6">
        <Avatar className="h-20 w-20 border">
          <AvatarImage src={partnerProfile.photoURL ?? undefined} alt={partnerProfile.displayName} />
          <AvatarFallback className="text-3xl">{partnerProfile.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm text-muted-foreground">Your Accountability Partner</p>
          <h1 className="text-3xl font-bold tracking-tight font-headline">{partnerProfile.displayName}</h1>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Partner's Discipline History</CardTitle>
          <CardDescription>
            Select a date to view {partnerProfile.displayName}'s progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-2">
            <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) => d > new Date() || d < new Date("2020-01-01")}
                modifiers={{ completed: completedDays }}
                modifiersStyles={{ completed: { color: 'hsl(var(--primary-foreground))', backgroundColor: 'hsl(var(--primary))' } }}
                className="rounded-md border not-prose"
            />
            <div className="space-y-4">
                <p className="font-semibold text-center">{date ? format(date, 'PPP') : 'Select a day'}</p>
                <div className="grid grid-cols-2 gap-4">
                    {disciplines.map(discipline => (
                        <div
                        key={discipline.id}
                        className={cn(
                            "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                            completedOnSelectedDate.includes(discipline.id)
                            ? "bg-primary/10 border-primary/20 text-primary-foreground"
                            : "bg-muted/50"
                        )}
                        >
                        <div
                            className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full",
                            completedOnSelectedDate.includes(discipline.id) ? "bg-primary text-primary-foreground" : "bg-background"
                            )}
                        >
                            {completedOnSelectedDate.includes(discipline.id) ? (
                            <Check className="h-5 w-5" />
                            ) : (
                            <div className="h-5 w-5 text-muted-foreground" />
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
        <CardFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
               <Button variant="outline" disabled={isNudging}>
                {isNudging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                Send a Nudge
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Send a Nudge?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will send a friendly notification to {partnerProfile.displayName} to encourage them.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleNudge}>Send</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Partner's Streaks</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-muted-foreground">Current Streak</p>
              <p className="text-2xl font-bold">{partnerProfile.currentStreak || 0} day{partnerProfile.currentStreak === 1 ? '' : 's'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-muted-foreground">Longest Streak</p>
              <p className="text-2xl font-bold">{partnerProfile.longestStreak || 0} day{partnerProfile.longestStreak === 1 ? '' : 's'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {userProfile && user && <AccountabilitySettingsCard userProfile={userProfile} userId={user.uid} />}
    </div>
  );
}
