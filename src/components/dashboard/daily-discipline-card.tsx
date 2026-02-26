
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { isToday } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { Heart, BookOpen, Share2, Megaphone, Users, Check } from 'lucide-react';
import { BibleDialog } from './bible-dialog';
import { PrayerDialog } from './prayer-dialog';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';

const disciplines = [
  { id: 'pray', label: 'Pray', icon: <Heart className="h-5 w-5 text-muted-foreground" /> },
  { id: 'read_bible', label: 'Read the Bible', icon: <BookOpen className="h-5 w-5 text-muted-foreground" /> },
  { id: 'follow_up', label: 'Follow-up Soul', icon: <Users className="h-5 w-5 text-muted-foreground" /> },
  { id: 'share_testimony', label: 'Share Testimony', icon: <Share2 className="h-5 w-5 text-muted-foreground" /> },
  { id: 'evangelize', label: 'Evangelize', icon: <Megaphone className="h-5 w-5 text-muted-foreground" /> },
];

export function DailyDisciplineCard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [isBibleDialogOpen, setIsBibleDialogOpen] = useState(false);
  const [isPrayerDialogOpen, setIsPrayerDialogOpen] = useState(false);
  const router = useRouter();
  
  const userDocRef = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);
  const { data: userProfile, loading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (userProfile?.dailyDiscipline) {
      const lastUpdatedDate = userProfile.dailyDiscipline.lastUpdated?.toDate();
      if (lastUpdatedDate && isToday(lastUpdatedDate)) {
        setCompletedToday(userProfile.dailyDiscipline.completed || []);
      } else {
        // Reset if it's a new day
        setCompletedToday([]);
      }
    }
  }, [userProfile]);

  const handleDisciplineToggle = async (disciplineId: string) => {
    if (!user || !firestore) return;

    const oldCompleted = [...completedToday];
    const wasCompleted = oldCompleted.includes(disciplineId);
    const newCompleted = wasCompleted
      ? oldCompleted.filter((id) => id !== disciplineId)
      : [...oldCompleted, disciplineId];

    setCompletedToday(newCompleted); // Optimistic update

    const userRef = doc(firestore, 'users', user.uid);
    const updateData = {
      dailyDiscipline: {
        completed: newCompleted,
        lastUpdated: serverTimestamp(),
      },
    };

    try {
      await updateDoc(userRef, updateData);
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: updateData,
      });
      errorEmitter.emit('permission-error', permissionError);
      // Revert optimistic update on failure
      setCompletedToday(oldCompleted);
      // Re-throw the error so the caller knows it failed
      throw error;
    }
  };

  const handleBibleRead = () => {
    if (!completedToday.includes('read_bible')) {
      handleDisciplineToggle('read_bible').catch(() => {
        // Error is handled in handleDisciplineToggle
      });
    }
  }

  const handlePray = () => {
    if (!completedToday.includes('pray')) {
      handleDisciplineToggle('pray').catch(() => {
        // Error is handled in handleDisciplineToggle
      });
    }
  }

  const handleDisciplineClick = (disciplineId: string) => {
    const isCompleted = completedToday.includes(disciplineId);

    // Always allow un-checking, and don't navigate
    if (isCompleted) {
      handleDisciplineToggle(disciplineId).catch(() => { /* Error is handled, no further action needed */ });
      return;
    }

    // Handle actions for completing a discipline for the first time
    if (disciplineId === 'read_bible') {
      setIsBibleDialogOpen(true);
    } else if (disciplineId === 'pray') {
      setIsPrayerDialogOpen(true);
    } else {
      // For disciplines that navigate, await the toggle first
      handleDisciplineToggle(disciplineId)
        .then(() => {
          // Only navigate after the toggle is successful
          if (disciplineId === 'share_testimony') {
            router.push('/dashboard/testimonies');
          } else if (disciplineId === 'evangelize') {
            router.push('/dashboard/campaigns');
          } else if (disciplineId === 'follow_up') {
            router.push('/dashboard/souls-won');
          }
        })
        .catch(() => {
          // If toggle fails, do not navigate. Error is already handled.
        });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Discipline</CardTitle>
          <CardDescription>Your spiritual checklist for today.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Daily Discipline</CardTitle>
          <CardDescription>Your spiritual checklist for today.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {disciplines.map(discipline => (
             <Button
                key={discipline.id}
                variant="outline"
                className="relative flex flex-col items-center justify-center gap-2 p-4 h-full text-center data-[state=checked]:bg-accent data-[state=checked]:border-primary"
                data-state={completedToday.includes(discipline.id) ? 'checked' : 'unchecked'}
                onClick={() => handleDisciplineClick(discipline.id)}
            >
                {completedToday.includes(discipline.id) && <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                {discipline.icon}
                <span className="text-sm font-medium whitespace-normal">{discipline.label}</span>
            </Button>
          ))}
        </CardContent>
      </Card>
       <BibleDialog 
        isOpen={isBibleDialogOpen}
        onOpenChange={setIsBibleDialogOpen}
        onDisciplineCompleted={handleBibleRead}
      />
      <PrayerDialog
        isOpen={isPrayerDialogOpen}
        onOpenChange={setIsPrayerDialogOpen}
        onDisciplineCompleted={handlePray}
      />
    </>
  );
}
