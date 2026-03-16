
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { isToday, format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { Zap, BookOpen, Loader2, Church, CheckCircle2 } from 'lucide-react';
import { BibleDialog } from './bible-dialog';
import { PrayerDialog } from './prayer-dialog';
import { AttendChurchDialog } from './attend-church-dialog';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const disciplines = [
  { id: 'pray', label: 'Pray', Icon: Zap, color: 'text-chart-5' },
  { id: 'read_bible', label: 'Read Bible', Icon: BookOpen, color: 'text-chart-2' },
  { id: 'attend_church', label: 'Attend Church', Icon: Church, color: 'text-chart-4' },
];

export function DailyDisciplineCard() {
  const { user, loading: userLoading } = useUser();
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
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const loading = userLoading || profileLoading;

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
    if (!user || !firestore) {
        throw new Error("User not authenticated or Firestore not available.");
    }

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

    return batch.commit()
        .then(() => {
            setCompletedToday(newCompleted);
        })
        .catch((serverError) => {
            const permissionError = new FirestorePermissionError({
                path: userRef.path, // This is a simplification for the batch
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw serverError; // Re-throw to be caught by handleDisciplineClick
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
    setTogglingId(disciplineId);
    try {
        if (disciplineId === 'read_bible') {
            setIsBibleDialogOpen(true);
            return; 
        }
        if (disciplineId === 'pray') {
            setIsPrayerDialogOpen(true);
            return;
        }
        if (disciplineId === 'attend_church') {
            const today = new Date();
            const dayOfWeek = format(today, 'EEEE');
            const isScheduledDay = userProfile?.churchInfo?.schedule?.some(s => s.day === dayOfWeek) ?? false;
            const hasDefaultChurch = !!userProfile?.churchInfo?.name;

            if (isScheduledDay && hasDefaultChurch) {
                setAttendChurchDialogView('confirm');
            } else {
                setAttendChurchDialogView('form');
            }
            
            setIsAttendChurchDialogOpen(true);
            return;
        }
    } catch (e) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not open discipline activity.",
        });
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
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
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
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {disciplines.map(discipline => {
              const isCompleted = completedToday.includes(discipline.id);
              const { Icon, color } = discipline;
              return (
                <Button
                    key={discipline.id}
                    variant="outline"
                    className="relative flex flex-col items-center justify-center gap-2 p-4 h-28 text-center transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-primary/20 data-[state=checked]:to-primary/10 data-[state=checked]:border-primary/40 dark:data-[state=checked]:from-primary/30 dark:data-[state=checked]:to-primary/15 data-[state=checked]:shadow-lg disabled:opacity-75"
                    data-state={isCompleted ? 'checked' : 'unchecked'}
                    onClick={() => handleDisciplineClick(discipline.id)}
                    disabled={togglingId === discipline.id}
                >
                   {isCompleted && togglingId !== discipline.id && (
                      <div className="absolute top-2 right-2">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                  )}
                    {togglingId === discipline.id ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                        <>
                            <Icon className={cn("h-8 w-8 transition-colors", isCompleted ? "text-primary" : color)} />
                            <span className="text-base font-medium">{discipline.label}</span>
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
        userProfile={userProfile}
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
