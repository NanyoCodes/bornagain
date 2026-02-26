'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { isToday } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { Heart, BookOpen, Share2, Megaphone, Users, Check, Loader2 } from 'lucide-react';
import { BibleDialog } from './bible-dialog';
import { PrayerDialog } from './prayer-dialog';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [isBibleDialogOpen, setIsBibleDialogOpen] = useState(false);
  const [isPrayerDialogOpen, setIsPrayerDialogOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
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
  
  const updateDisciplineState = async (disciplineId: string) => {
    if (!user || !firestore) return;

    const wasCompleted = completedToday.includes(disciplineId);
    const newCompleted = wasCompleted
      ? completedToday.filter((id) => id !== disciplineId)
      : [...completedToday, disciplineId];

    const userRef = doc(firestore, 'users', user.uid);
    const updateData = {
      dailyDiscipline: {
        completed: newCompleted,
        lastUpdated: serverTimestamp(),
      },
    };

    try {
      await updateDoc(userRef, updateData);
      setCompletedToday(newCompleted);
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: updateData,
      });
      errorEmitter.emit('permission-error', permissionError);
      throw error; // Re-throw to be caught by the caller
    }
  };


  const handleBibleRead = () => {
    if (!completedToday.includes('read_bible')) {
      updateDisciplineState('read_bible').catch(() => {
        // Error is handled in updateDisciplineState
      });
    }
  }

  const handlePray = () => {
    if (!completedToday.includes('pray')) {
      updateDisciplineState('pray').catch(() => {
        // Error is handled in updateDisciplineState
      });
    }
  }

  const handleDisciplineClick = async (disciplineId: string) => {
    const isCompleted = completedToday.includes(disciplineId);
    
    setTogglingId(disciplineId);
    try {
        // If it's already completed, just un-check it.
        if (isCompleted) {
            await updateDisciplineState(disciplineId);
            return;
        }

        // If it's not completed, perform the action.
        if (disciplineId === 'read_bible') {
            setIsBibleDialogOpen(true);
        } else if (disciplineId === 'pray') {
            setIsPrayerDialogOpen(true);
        } else {
            // For navigation disciplines, update DB, then navigate.
            await updateDisciplineState(disciplineId);
            
            if (disciplineId === 'share_testimony') {
                router.push('/dashboard/testimonies');
            } else if (disciplineId === 'evangelize') {
                router.push('/dashboard/campaigns');
            } else if (disciplineId === 'follow_up') {
                router.push('/dashboard/souls-won');
            }
        }
    } catch (e) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Your discipline could not be updated. Please check your connection and try again.",
        });
    } finally {
        // Don't clear togglingId for dialogs, as they control their own closing.
        if (disciplineId !== 'read_bible' && disciplineId !== 'pray') {
            setTogglingId(null);
        } else if (isCompleted) {
             setTogglingId(null);
        }
    }
  };
  
   useEffect(() => {
    if (!isBibleDialogOpen && togglingId === 'read_bible') {
      setTogglingId(null);
    }
    if (!isPrayerDialogOpen && togglingId === 'pray') {
      setTogglingId(null);
    }
  }, [isBibleDialogOpen, isPrayerDialogOpen, togglingId]);

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
                className="relative flex flex-col items-center justify-center gap-2 p-4 h-full text-center data-[state=checked]:bg-accent data-[state=checked]:border-primary disabled:opacity-75"
                data-state={completedToday.includes(discipline.id) ? 'checked' : 'unchecked'}
                onClick={() => handleDisciplineClick(discipline.id)}
                disabled={togglingId === discipline.id}
            >
                {togglingId === discipline.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <>
                        {completedToday.includes(discipline.id) && <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                        {discipline.icon}
                        <span className="text-sm font-medium whitespace-normal">{discipline.label}</span>
                    </>
                )}
            </Button>
          ))}
        </CardContent>
      </Card>
       <BibleDialog 
        isOpen={isBibleDialogOpen}
        onOpenChange={(open) => {
            setIsBibleDialogOpen(open);
            if (!open) setTogglingId(null);
        }}
        onDisciplineCompleted={handleBibleRead}
      />
      <PrayerDialog
        isOpen={isPrayerDialogOpen}
        onOpenChange={(open) => {
            setIsPrayerDialogOpen(open);
            if (!open) setTogglingId(null);
        }}
        onDisciplineCompleted={handlePray}
      />
    </>
  );
}
