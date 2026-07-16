'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import type { Soul, UserProfile, Testimony } from '@/lib/types';
import { collection, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { format, isSameMonth } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Flame, Edit, Zap, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { safeToDate } from '@/lib/utils';
import { useCollection } from '@/firebase/firestore/use-collection';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function ProgressOverview({ souls, userProfile, testimonies }: { souls: Soul[], userProfile: UserProfile, testimonies: Testimony[] }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    // Goal State
    const [monthlyGoal, setMonthlyGoal] = useState(userProfile.monthlySoulsGoal ?? 10);
    const [goalDialogOpen, setGoalDialogOpen] = useState(false);
    const [newGoal, setNewGoal] = useState(userProfile.monthlySoulsGoal ?? 10);
    const [isSavingGoal, setIsSavingGoal] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
      const timer = setInterval(() => setCurrentDate(new Date()), 60000);
      return () => clearInterval(timer);
    }, []);

    // Sync state when prop changes
    useEffect(() => {
        setMonthlyGoal(userProfile.monthlySoulsGoal ?? 10);
        setNewGoal(userProfile.monthlySoulsGoal ?? 10);
    }, [userProfile.monthlySoulsGoal]);
    
    // Souls Won - Total count including all relationships (Family, Friends, Outreach)
    const totalSouls = useMemo(() => {
      return souls ? souls.length : 0;
    }, [souls]);
    
    // Testimony Streak
    const testimonyStreak = useMemo(() => {
        if (!testimonies || testimonies.length === 0) return 0;
        const sharedDates = new Set(
            testimonies.map(t => format(safeToDate(t.createdAt)!, 'yyyy-MM-dd'))
        );

        let streak = 0;
        let checkDate = new Date();
        if (!sharedDates.has(format(checkDate, 'yyyy-MM-dd'))) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        while (sharedDates.has(format(checkDate, 'yyyy-MM-dd'))) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }

        return streak;
  }, [testimonies]);

    // Discipline Streak
    const disciplineHistoryQuery = useMemo(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'users', user.uid, 'disciplineHistory'),
            orderBy('date', 'desc'),
            limit(60) // Look back up to 60 days
        );
    }, [user, firestore]);
    const { data: disciplineHistory, loading: loadingDiscipline } = useCollection<{ date: any, completed: string[] }>(disciplineHistoryQuery);

    const disciplineStreak = useMemo(() => {
        if (!disciplineHistory || disciplineHistory.length === 0) return 0;
        
        let streak = 0;
        let checkDate = new Date();
        
        const historyMap = new Map<string, string[]>();
        disciplineHistory.forEach(log => {
            const date = safeToDate(log.date);
            if (date) {
                historyMap.set(format(date, 'yyyy-MM-dd'), log.completed);
            }
        });

        const todayString = format(checkDate, 'yyyy-MM-dd');
        const todaysLog = historyMap.get(todayString);
        
        if (!todaysLog || todaysLog.length < 3) {
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        while (true) {
            const dateString = format(checkDate, 'yyyy-MM-dd');
            const log = historyMap.get(dateString);
            if (log && log.length >= 3) { // Assuming 3 disciplines
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }, [disciplineHistory]);


    // Goal Dialog Logic
    const handleSaveGoal = async () => {
        if (newGoal <= 0) {
            toast({
                variant: 'destructive',
                title: 'Invalid Goal',
                description: 'Please enter a number greater than 0.',
            });
            return;
        }
        if (!user || !firestore) return;

        setIsSavingGoal(true);
        const userRef = doc(firestore, 'users', user.uid);
        const payload = { monthlySoulsGoal: newGoal };
    
        updateDoc(userRef, payload)
          .then(() => {
            setGoalDialogOpen(false);
            toast({
                title: 'Monthly Goal Updated',
                description: `Your new goal for ${format(
                currentDate,
                'MMMM yyyy'
                )} is ${newGoal} souls.`,
            });
          })
          .catch(() => {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: payload,
            }, user);
            errorEmitter.emit('permission-error', permissionError);
          })
          .finally(() => {
            setIsSavingGoal(false);
          });
      };


    return (
        <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">Your Growth</CardTitle>
                        <div className="relative flex h-3 w-3">
                            <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></div>
                            <div className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></div>
                        </div>
                    </div>
                    <Dialog
                    open={goalDialogOpen}
                    onOpenChange={(isOpen) => {
                        if (isOpen) {
                          setNewGoal(monthlyGoal);
                        }
                        setGoalDialogOpen(isOpen);
                    }}
                    >
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/20">
                            <Edit className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Set Goal for {format(currentDate, 'MMMM')}</DialogTitle>
                            <DialogDescription>
                                Set your personal goal for souls won for the current month.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="goal" className="text-right">
                              Souls
                            </Label>
                            <Input
                              id="goal"
                              type="number"
                              value={newGoal}
                              onChange={(e) => setNewGoal(Number(e.target.value))}
                              className="col-span-3 text-foreground"
                              disabled={isSavingGoal}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveGoal} disabled={isSavingGoal}>
                                {isSavingGoal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Goal
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                    </Dialog>
                </div>
                <CardDescription className="text-primary-foreground/80 font-medium">
                  Your mission goal for {format(currentDate, 'MMMM yyyy')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <div className="text-2xl font-bold">{totalSouls}</div>
                    <div className="text-sm text-primary-foreground/80 font-black uppercase tracking-widest">
                      /{monthlyGoal} SOULS
                    </div>
                  </div>
                  <Progress
                    value={
                      monthlyGoal > 0 ? (totalSouls / monthlyGoal) * 100 : 0
                    }
                    className="h-2 bg-white/30"
                    indicatorClassName="bg-white"
                  />
                </div>
                
                <div className="flex items-center justify-around text-center">
                     <div className="flex flex-col items-center gap-1">
                        <div className="text-4xl font-bold flex items-center justify-center gap-2">
                           {testimonyStreak} <Flame className="h-8 w-8" />
                        </div>
                        <p className="text-sm opacity-80 font-medium uppercase tracking-tight">Testimony Streak</p>
                    </div>
                    <div className="h-16 w-px bg-primary-foreground/30"></div>
                     <div className="flex flex-col items-center gap-1">
                        <div className="text-4xl font-bold flex items-center justify-center gap-2">
                           {loadingDiscipline ? <div className="animate-pulse rounded-md h-8 w-10 bg-white/20" /> : disciplineStreak} <Zap className="h-8 w-8" />
                        </div>
                        <p className="text-sm opacity-80 uppercase tracking-tight">Discipline Streak</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
