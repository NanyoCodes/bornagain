
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    Zap, 
    Target, 
    Flame, 
    Heart, 
    BookOpen, 
    Edit, 
    ShieldCheck, 
    Store,
    ArrowRight,
    TrendingUp,
    Sparkles,
    Users,
    Gift
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { isSameMonth, format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import Link from 'next/link';

export function FeedSidebar({ className }: { className?: string }) {
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();

    const soulsQuery = useMemo(() => {
        if (!user?.uid || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/souls`));
    }, [user?.uid, firestore]);
    const { data: souls } = useCollection<any>(soulsQuery);

    const soulsThisMonth = useMemo(() => {
        if (!souls) return 0;
        const now = new Date();
        return souls.filter((s: any) => {
            const wonAt = safeToDate(s.wonAt);
            return wonAt && isSameMonth(wonAt, now);
        }).length;
    }, [souls]);

    const monthlyGoal = userProfile?.monthlySoulsGoal || 10;
    const progress = Math.min((soulsThisMonth / monthlyGoal) * 100, 100);

    const completedToday = useMemo(() => {
        if (!userProfile?.dailyDiscipline?.lastUpdated) return [];
        const lastUpdated = safeToDate(userProfile.dailyDiscipline.lastUpdated);
        if (lastUpdated && isSameMonth(lastUpdated, new Date())) {
            return userProfile.dailyDiscipline.completed || [];
        }
        return [];
    }, [userProfile]);

    return (
        <div className={cn("hidden lg:flex flex-col gap-6 sticky top-24 h-fit", className)}>
            {/* Kingdom Progress Widget */}
            <Card className="rounded-3xl border-none shadow-lg bg-primary text-primary-foreground overflow-hidden border-b-8 border-b-black/10">
                <CardHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between mb-2">
                        <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                            <Target className="h-5 w-5 text-white" />
                        </div>
                        <Badge variant="outline" className="bg-white/10 text-white border-white/20 font-black text-[9px] uppercase tracking-widest">{format(new Date(), 'MMMM')} Progress</Badge>
                    </div>
                    <CardTitle className="text-xl font-black font-headline uppercase tracking-tight">Harvest Goal</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-2 space-y-4">
                    <div className="space-y-1">
                        <div className="flex justify-between items-baseline">
                            <span className="text-3xl font-black">{soulsThisMonth}</span>
                            <span className="text-xs font-bold opacity-70">/ {monthlyGoal} SOULS</span>
                        </div>
                        <Progress value={progress} className="h-2 bg-white/20" indicatorClassName="bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed opacity-80">
                        Every life logged contributes to the global harvest map.
                    </p>
                </CardContent>
            </Card>

            {/* Daily Rituals Widget */}
            <Card className="rounded-3xl border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="p-5 pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" /> Daily Disciplines
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-4 space-y-3">
                    {[
                        { id: 'pray', label: 'Prayer Altar', icon: Flame, color: 'text-orange-500' },
                        { id: 'read_bible', label: 'Word Study', icon: BookOpen, color: 'text-blue-500' },
                        { id: 'take_notes', label: 'Journaling', icon: Edit, color: 'text-primary' },
                    ].map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-transparent hover:border-primary/10 transition-all">
                            <div className="flex items-center gap-3">
                                <item.icon className={cn("h-4 w-4", item.color)} />
                                <span className="text-xs font-bold uppercase tracking-tight">{item.label}</span>
                            </div>
                            {completedToday.includes(item.id) ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                                <div className="h-4 w-4 rounded-full border-2 border-muted" />
                            )}
                        </div>
                    ))}
                    <Button asChild variant="ghost" className="w-full h-8 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 mt-2">
                        <Link href="/growth">View All Growth <ArrowRight className="ml-1.5 h-3 w-3" /></Link>
                    </Button>
                </CardContent>
            </Card>

            {/* Quick Sectors Widget */}
            <Card className="rounded-3xl border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="p-5 pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Kingdom Sectors</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-1">
                    <Link href="/dashboard/victory-hub" className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted group">
                        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-black uppercase tracking-widest text-[10px]">Victory Hub</span>
                    </Link>
                    <Link href="/dashboard/marketplace" className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted group">
                        <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <Store className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="font-black uppercase tracking-widest text-[10px]">Provision Hub</span>
                    </Link>
                    <Link href="/dashboard/marketplace/gifts" className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted group">
                        <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <Gift className="h-4 w-4 text-indigo-600" />
                        </div>
                        <span className="font-black uppercase tracking-widest text-[10px]">Kindness Center</span>
                    </Link>
                </CardContent>
                <CardFooter className="p-5 pt-0">
                    <div className="p-4 bg-muted/30 rounded-2xl border border-dashed text-center w-full">
                        <p className="text-[9px] font-bold text-muted-foreground leading-relaxed italic">
                            "Equipping the saints for the work of ministry." — Eph 4:12
                        </p>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
