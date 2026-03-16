
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import type { Soul, UserProfile, DailyDisciplineLog } from '@/lib/types';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { format, isSameDay, subDays, differenceInDays } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Flame, Edit, TrendingUp, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { safeToDate } from '@/lib/utils';

export function ProgressOverview({ souls, userProfile }: { souls: Soul[], userProfile: UserProfile }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    // Goal State
    const [monthlyGoal, setMonthlyGoal] = useState(10);
    const [goalDate, setGoalDate] = useState<Date | null>(new Date());
    const [goalDialogOpen, setGoalDialogOpen] = useState(false);
    const [newGoal, setNewGoal] = useState(10);
    const [newGoalDate, setNewGoalDate] = useState<Date | null>(new Date());
    
    // Souls Won this month for the goal
    const soulsThisMonth = useMemo(() => {
      if (!souls || !goalDate) return 0;
      return souls.filter((soul) => {
        const wonDate = safeToDate(soul.wonAt);
        if (!wonDate) return false;
        return isSameDay(wonDate, goalDate) || (wonDate > goalDate && wonDate < new Date(goalDate.getFullYear(), goalDate.getMonth() + 1, 1));
      }).length;
    }, [souls, goalDate]);
    
    // Evangelism Streak
    const evangelismStreak = useMemo(() => {
        if (!souls || souls.length === 0) return 0;
        const wonDates = new Set(
            souls.map(s => format(safeToDate(s.wonAt)!, 'yyyy-MM-dd'))
        );

        let streak = 0;
        let currentDate = new Date();
        if (!wonDates.has(format(currentDate, 'yyyy-MM-dd'))) {
            currentDate.setDate(currentDate.getDate() - 1);
        }

        while (wonDates.has(format(currentDate, 'yyyy-MM-dd'))) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
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
        let currentDate = new Date();
        const historyMap = new Map(disciplineHistory.map(log => [format(safeToDate(log.date)!, 'yyyy-MM-dd'), log.completed]));

        const todayString = format(currentDate, 'yyyy-MM-dd');
        const todaysLog = historyMap.get(todayString);
        
        // If today's disciplines are not complete, start checking from yesterday
        if (!todaysLog || todaysLog.length < 3) {
            currentDate.setDate(currentDate.getDate() - 1);
        }
        
        while (true) {
            const dateString = format(currentDate, 'yyyy-MM-dd');
            const log = historyMap.get(dateString);
            if (log && log.length >= 3) { // Assuming 3 disciplines
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break; // Streak broken
            }
        }
        return streak;
    }, [disciplineHistory]);


    // Goal Dialog Logic
    const handleGoalDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        if (value) {
            const [year, month] = value.split('-').map(Number);
            setNewGoalDate(new Date(year, month - 1, 1));
        }
    };
    const newGoalDateValue = newGoalDate ? format(newGoalDate, 'yyyy-MM') : '';

    const handleSaveGoal = () => {
        if (newGoal > 0 && newGoalDate) {
            setMonthlyGoal(newGoal);
            setGoalDate(newGoalDate);
            setGoalDialogOpen(false);
            toast({
                title: 'Monthly Goal Updated',
                description: `Your new goal for ${format(
                newGoalDate,
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
                        setNewGoalDate(goalDate);
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
                            <DialogTitle>Set Monthly Goal</DialogTitle>
                            <DialogDescription>
                                Set your personal goal for souls won for a specific month.
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
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="goal-month" className="text-right">
                            For Month
                            </Label>
                            <Input
                            id="goal-month"
                            type="month"
                            value={newGoalDateValue}
                            onChange={handleGoalDateChange}
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
                    {goalDate ? format(goalDate, 'MMMM yyyy') : '...'}
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
                           {loadingDiscipline ? <Skeleton className="h-8 w-10 bg-white/20"/> : disciplineStreak} <Zap className="h-8 w-8" />
                        </div>
                        <p className="text-sm opacity-80">Discipline Streak</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
