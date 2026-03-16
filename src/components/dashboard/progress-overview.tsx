
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import type { Soul, UserProfile } from '@/lib/types';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { format, isSameMonth } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Flame, Edit, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { safeToDate } from '@/lib/utils';
import { useCollection } from '@/firebase/firestore/use-collection';

export function ProgressOverview({ souls, userProfile }: { souls: Soul[], userProfile: UserProfile }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    // Goal State
    const [monthlyGoal, setMonthlyGoal] = useState(10);
    const [goalDialogOpen, setGoalDialogOpen] = useState(false);
    const [newGoal, setNewGoal] = useState(10);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
      // Set date on client to avoid hydration mismatch.
      setCurrentDate(new Date());
    }, []);
    
    // Souls Won this month for the goal
    const soulsThisMonth = useMemo(() => {
      if (!souls) return 0;
      return souls.filter((soul) => {
        const wonDate = safeToDate(soul.wonAt);
        if (!wonDate) return false;
        return isSameMonth(wonDate, currentDate);
      }).length;
    }, [souls, currentDate]);
    
    // Evangelism Streak
    const evangelismStreak = useMemo(() => {
        if (!souls || souls.length === 0) return 0;
        const wonDates = new Set(
            souls.map(s => format(safeToDate(s.wonAt)!, 'yyyy-MM-dd'))
        );

        let streak = 0;
        let checkDate = new Date();
        if (!wonDates.has(format(checkDate, 'yyyy-MM-dd'))) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        while (wonDates.has(format(checkDate, 'yyyy-MM-dd'))) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }

        return streak;
  }, [souls]);

    // Discipline Streak
    const disciplineHistoryQuery = useMemo(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'users', user.uid, 'disciplineHistory'),
            orderBy('date', 'desc'),
            limit(60) // Look back up to 60 days
        );
    }, [user, firestore]);
    const { data: disciplineHistory, loading: loadingDiscipline } = useCollection<DailyDisciplineLog>(disciplineHistoryQuery);

    const disciplineStreak = useMemo(() => {
        if (!disciplineHistory || disciplineHistory.length === 0) return 0;
        
        let streak = 0;
        let checkDate = new Date();
        const historyMap = new Map(disciplineHistory.map(log => [format(safeToDate(log.date)!, 'yyyy-MM-dd'), log.completed]));

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
    const handleSaveGoal = () => {
        if (newGoal > 0) {
            setMonthlyGoal(newGoal);
            setGoalDialogOpen(false);
            toast({
                title: 'Monthly Goal Updated',
                description: `Your new goal for ${format(
                currentDate,
                'MMMM yyyy'
                )} is ${newGoal} souls.`,
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Invalid Goal',
                description: 'Please enter a number greater than 0.',
            });
        }
    };


    return (
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Your Progress</CardTitle>
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
                              className="col-span-3"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveGoal}>Save Goal</Button>
                        </DialogFooter>
                    </DialogContent>
                    </Dialog>
                </div>
                <CardDescription className="text-primary-foreground/80">
                  Your goal for {format(currentDate, 'MMMM yyyy')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <div className="text-2xl font-bold">{soulsThisMonth}</div>
                    <div className="text-sm text-primary-foreground/80">
                      / {monthlyGoal} souls
                    </div>
                  </div>
                  <Progress
                    value={
                      monthlyGoal > 0 ? (soulsThisMonth / monthlyGoal) * 100 : 0
                    }
                    className="h-2 bg-white/30"
                    indicatorClassName="bg-white"
                  />
                </div>
                
                <div className="flex items-center justify-around text-center">
                     <div>
                        <div className="text-4xl font-bold flex items-center justify-center gap-2">
                           {evangelismStreak} <Flame className="h-8 w-8" />
                        </div>
                        <p className="text-sm opacity-80">Evangelism Streak</p>
                    </div>
                    <div className="h-16 w-px bg-primary-foreground/30"></div>
                     <div>
                        <div className="text-4xl font-bold flex items-center justify-center gap-2">
                           {loadingDiscipline ? <Skeleton className="h-10 w-12 bg-white/20"/> : disciplineStreak} <Zap className="h-8 w-8" />
                        </div>
                        <p className="text-sm opacity-80">Discipline Streak</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
