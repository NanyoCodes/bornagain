
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { isToday, format } from 'date-fns';
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

    await updateDoc(userRef, updateData)
        .then(() => {
            setCompletedToday(newCompleted);
        })
        .catch((error) => {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw error; // Re-throw to be caught by handleDisciplineClick
        });
  };


  const handleBibleRead = () => {
    if (!completedToday.includes('read_bible')) {
      updateDisciplineState('read_bible').catch(() => {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Your discipline could not be updated. Please check your connection and try again.",
        });
      });
    }
  }

  const handlePray = () => {
    if (!completedToday.includes('pray')) {
      updateDisciplineState('pray').catch(() => {
         toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Your discipline could not be updated. Please check your connection and try again.",
        });
      });
    }
  }

  const handleDisciplineClick = async (disciplineId: string) => {
    const isCompleted = completedToday.includes(disciplineId);
    
    setTogglingId(disciplineId);
    try {
        if (disciplineId === 'read_bible' && !isCompleted) {
            setIsBibleDialogOpen(true);
            return; 
        }
        if (disciplineId === 'pray' && !isCompleted) {
            setIsPrayerDialogOpen(true);
            return;
        }

        await updateDisciplineState(disciplineId);
        
        if (!isCompleted) {
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
        setTogglingId(null);
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
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Daily Discipline</CardTitle>
              <CardDescription>Your spiritual checklist for today.</CardDescription>
            </div>
            <div className="text-sm font-medium text-muted-foreground pt-1 whitespace-nowrap">
              {format(new Date(), 'PPP')}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {disciplines.map(discipline => {
              const isCompleted = completedToday.includes(discipline.id);
              return (
                <Button
                    key={discipline.id}
                    variant="outline"
                    className="relative flex flex-col items-center justify-center gap-2 p-4 h-full text-center data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground data-[state=checked]:border-primary disabled:opacity-75"
                    data-state={isCompleted ? 'checked' : 'unchecked'}
                    onClick={() => handleDisciplineClick(discipline.id)}
                    disabled={togglingId === discipline.id}
                >
                    {togglingId === discipline.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            {isCompleted && (
                                <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                    <Check className="h-3 w-3" />
                                </div>
                            )}
                            {discipline.icon}
                            <span className="text-sm font-medium whitespace-normal">{discipline.label}</span>
                        </>
                    )}
                </Button>
              )
          })}
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
