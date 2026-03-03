
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { isToday, format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { Heart, BookOpen, Loader2, Church, CheckCircle2 } from 'lucide-react';
import { BibleDialog } from './bible-dialog';
import { PrayerDialog } from './prayer-dialog';
import { AttendChurchDialog } from './attend-church-dialog';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const disciplines = [
  { id: 'pray', label: 'Pray', icon: <Heart className="h-5 w-5 text-muted-foreground" /> },
  { id: 'read_bible', label: 'Read Bible', icon: <BookOpen className="h-5 w-5 text-muted-foreground" /> },
  { id: 'attend_church', label: 'Attend Church', icon: <Church className="h-5 w-5 text-muted-foreground" /> },
];

export function DailyDisciplineCard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [isBibleDialogOpen, setIsBibleDialogOpen] = useState(false);
  const [isPrayerDialogOpen, setIsPrayerDialogOpen] = useState(false);
  const [isAttendChurchDialogOpen, setIsAttendChurchDialogOpen] = useState(false);
  const [attendChurchDialogView, setAttendChurchDialogView] = useState<'confirm' | 'form'>('form');
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

    const today = new Date();
    const dateString = format(today, 'yyyy-MM-dd');

    const batch = writeBatch(firestore);

    const userRef = doc(firestore, 'users', user.uid);
    const updateData = {
      dailyDiscipline: {
        completed: newCompleted,
        lastUpdated: serverTimestamp(),
      },
    };
    batch.update(userRef, updateData);

    const historyRef = doc(firestore, 'users', user.uid, 'disciplineHistory', dateString);
    batch.set(historyRef, {
        completed: newCompleted,
        date: serverTimestamp()
    }, { merge: true });

    await batch.commit()
        .then(() => {
            setCompletedToday(newCompleted);
        })
        .catch((error) => {
            const permissionError = new FirestorePermissionError({
                path: userRef.path, // This is a simplification for the batch
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

  const handleAttendChurch = () => {
    if (!completedToday.includes('attend_church')) {
      updateDisciplineState('attend_church').catch(() => {
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
        if (disciplineId === 'attend_church' && !isCompleted) {
            const today = new Date();
            const dayOfWeek = format(today, 'EEEE');
            const scheduledDays = userProfile?.churchInfo?.schedule?.map(s => s.day) || [];
            
            if (scheduledDays.includes(dayOfWeek)) {
                const hasDefaultChurch = !!userProfile?.churchInfo?.name;
                setAttendChurchDialogView(hasDefaultChurch ? 'confirm' : 'form');
                setIsAttendChurchDialogOpen(true);
                return; 
            }
            // If not a scheduled day, just toggle without dialog
        }

        // For other buttons or for un-checking a button or non-scheduled church day
        await updateDisciplineState(disciplineId);
        
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
    if (!isAttendChurchDialogOpen && togglingId === 'attend_church') {
        setTogglingId(null);
    }
  }, [isBibleDialogOpen, isPrayerDialogOpen, isAttendChurchDialogOpen, togglingId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Discipline</CardTitle>
          <CardDescription>Your spiritual checklist for today.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
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
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Daily Discipline</CardTitle>
              <CardDescription>Your spiritual checklist for today.</CardDescription>
            </div>
            <div className="text-sm font-medium text-muted-foreground sm:pt-1">
              {format(new Date(), 'PPPP')}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2 sm:gap-4">
          {disciplines.map(discipline => {
              const isCompleted = completedToday.includes(discipline.id);
              return (
                <Button
                    key={discipline.id}
                    variant="outline"
                    className="relative flex flex-col items-center justify-center gap-1 px-2 py-4 h-full text-center data-[state=checked]:bg-green-100 dark:data-[state=checked]:bg-green-900/20 data-[state=checked]:border-green-500/50 disabled:opacity-75"
                    data-state={isCompleted ? 'checked' : 'unchecked'}
                    onClick={() => handleDisciplineClick(discipline.id)}
                    disabled={togglingId === discipline.id}
                >
                   {isCompleted && togglingId !== discipline.id && (
                      <div className="absolute top-1 right-1">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                  )}
                    {togglingId === discipline.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
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
      <AttendChurchDialog
        isOpen={isAttendChurchDialogOpen}
        onOpenChange={(open) => {
            setIsAttendChurchDialogOpen(open);
            if (!open) setTogglingId(null);
        }}
        onDisciplineCompleted={handleAttendChurch}
        userProfile={userProfile}
        initialView={attendChurchDialogView}
      />
    </>
  );
}
