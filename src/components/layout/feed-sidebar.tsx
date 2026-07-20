'use client';

import React, { useMemo, useState, useEffect } from 'react';
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
    Gift,
    CheckCircle2,
    Quote,
    Group,
    Package,
    Globe
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { isSameMonth, format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import Link from 'next/link';
import type { Soul, Campaign, Fellowship } from '@/lib/types';

const faithSeeds = [
    { text: "Your testimony is a weapon that overcomes the enemy.", ref: "Rev 12:11" },
    { text: "One life reached is a celebration in all of Heaven.", ref: "Luke 15:7" },
    { text: "The Word you share today can anchor a soul forever.", ref: "Heb 6:19" },
    { text: "Stand firm, for your labor in the Lord is never in vain.", ref: "1 Cor 15:58" },
    { text: "God uses the available to reach the unreachable.", ref: "Isa 6:8" },
];

export function FeedSidebar({ mode = 'general', className }: { mode?: SidebarMode, className?: string }) {
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const [now, setNow] = useState(new Date());

    // Update internal clock every minute to ensure accurate month boundaries
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Live query for souls to calculate progress
    const soulsQuery = useMemo(() => {
        if (!user?.uid || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/souls`));
    }, [user?.uid, firestore]);
    const { data: souls } = useCollection<Soul>(soulsQuery);

    const totalSouls = useMemo(() => {
        return souls ? souls.length : 0;
    }, [souls]);

    const monthlyGoal = userProfile?.monthlySoulsGoal || 10;
    const progressValue = Math.min((totalSouls / monthlyGoal) * 100, 100);

    const completedToday = useMemo(() => {
        if (!userProfile?.dailyDiscipline?.lastUpdated) return [];
        const lastUpdated = safeToDate(userProfile.dailyDiscipline.lastUpdated);
        if (lastUpdated && lastUpdated.getDate() === now.getDate() && lastUpdated.getMonth() === now.getMonth() && lastUpdated.getFullYear() === now.getFullYear()) {
            return userProfile.dailyDiscipline.completed || [];
        }
        return [];
    }, [userProfile, now]);

    // LIVE FIGURES: Query active groups and missions
    const activeGroupsQuery = useMemo(() => {
        if (!user?.uid || !firestore) return null;
        return query(
            collection(firestore, 'fellowships'), 
            where('memberIds', 'array-contains', user.uid),
            where('status', '==', 'active')
        );
    }, [user?.uid, firestore]);
    const { data: activeGroups } = useCollection<Fellowship>(activeGroupsQuery);

    const joinedCampaignsQuery = useMemo(() => {
        if (!user?.uid || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/joinedCampaigns`));
    }, [user?.uid, firestore]);
    const { data: joinedCampaignRefs } = useCollection<any>(joinedCampaignsQuery);

    const allActiveCampaignsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'campaigns'), where('status', '==', 'active'));
    }, [firestore]);
    const { data: activeCampaigns } = useCollection<Campaign>(allActiveCampaignsQuery);

    const liveMissionsCount = useMemo(() => {
        if (!activeCampaigns || !joinedCampaignRefs || !user?.uid) return 0;
        const joinedIds = new Set(joinedCampaignRefs.map((r: any) => r.id));
        return activeCampaigns.filter((c: Campaign) => joinedIds.has(c.id) || c.organizerId === user.uid).length;
    }, [activeCampaigns, joinedCampaignRefs, user?.uid]);

    const randomSeed = useMemo(() => faithSeeds[Math.floor(Math.random() * faithSeeds.length)], []);

    return (
        <div className={cn("hidden lg:flex flex-col gap-6 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto no-scrollbar pb-10", className)}>
            
            {/* Goal Widget - Primary Mission Tracker */}
            {mode !== 'fellowships' && (
                <Card className="rounded-3xl border-none shadow-lg bg-primary text-primary-foreground overflow-hidden border-b-8 border-b-black/10 shrink-0">
                    <CardHeader className="p-6 pb-2 text-left">
                        <div className="flex items-center justify-between mb-2 text-left">
                            <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center text-left">
                                <Target className="h-5 w-5 text-white text-left" />
                            </div>
                            <Badge variant="outline" className="bg-white/10 text-white border-white/20 font-black text-[9px] uppercase tracking-widest text-left">Harvest Progress</Badge>
                        </div>
                        <CardTitle className="text-xl font-black font-headline uppercase tracking-tight text-left">HARVEST</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-2 space-y-4 text-left">
                        <div className="space-y-1 text-left">
                            <div className="flex justify-between items-baseline text-left">
                                <span className="text-3xl font-black text-left">{totalSouls}</span>
                                <span className="text-xs font-bold opacity-70 text-left">/{monthlyGoal} SOULS</span>
                            </div>
                            <Progress value={progressValue} className="h-2 bg-white/20 text-left" indicatorClassName="bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed opacity-80 text-balance text-left">
                            Every life logged contributes to the global harvest map and city impact stats.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Daily Rituals Tracker */}
            {(mode === 'harvest' || mode === 'campaigns' || mode === 'general') && (
                <Card className="rounded-3xl border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden shrink-0 text-left">
                    <CardHeader className="p-5 pb-2 text-left">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 text-left">
                            <Zap className="h-4 w-4 text-primary text-left" /> Daily Disciplines
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-4 space-y-3 text-left">
                        {[
                            { id: 'pray', label: 'Prayer Altar', icon: Flame, color: 'text-orange-500' },
                            { id: 'read_bible', label: 'Word Study', icon: BookOpen, color: 'text-blue-500' },
                            { id: 'take_notes', label: 'Journaling', icon: Edit, color: 'text-primary' },
                        ].map(item => (
                            <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-transparent hover:border-primary/10 transition-all text-left">
                                <div className="flex items-center gap-3 text-left">
                                    <item.icon className={cn("h-4 w-4", item.color)} />
                                    <span className="text-[11px] font-bold uppercase tracking-tight text-left">{item.label}</span>
                                </div>
                                {completedToday.includes(item.id) ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 text-left" />
                                ) : (
                                    <div className="h-4 w-4 rounded-full border-2 border-muted text-left" />
                                )}
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter className="p-4 pt-0 text-left">
                        <Button asChild variant="ghost" className="w-full text-[9px] font-black uppercase tracking-widest text-primary h-8 hover:bg-primary/5 text-left">
                            <Link href="/growth">View All Growth <ArrowRight className="ml-1.5 h-3 w-3 text-left" /></Link>
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* Faith Seed - Spiritual Inspiration */}
            {mode === 'testimonies' && (
                <Card className="rounded-3xl border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden shrink-0 text-left">
                    <CardHeader className="p-5 pb-2 text-left">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2 text-left">
                            <Sparkles className="h-4 w-4 text-primary text-left" /> Seed of Faith
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-4 text-left">
                        <div className="p-5 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 relative group text-left">
                            <Quote className="absolute top-2 right-4 h-8 w-8 opacity-5 rotate-12 transition-transform group-hover:scale-110 text-left" />
                            <p className="text-sm font-medium italic leading-relaxed text-muted-foreground text-balance text-left">
                                &ldquo;{randomSeed.text}&rdquo;
                            </p>
                            <p className="text-[9px] font-black text-primary text-right mt-3 uppercase tracking-widest text-left">— {randomSeed.ref}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick Kingdom Sectors Navigation */}
            <Card className="rounded-3xl border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden shrink-0 text-left">
                <CardHeader className="p-5 pb-2 text-left">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground text-left">Kingdom Sectors</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-1 text-left">
                    <Link href="/dashboard/victory-hub" className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted group text-left">
                        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform text-left">
                            <ShieldCheck className="h-4 w-4 text-primary text-left" />
                        </div>
                        <span className="font-black uppercase tracking-widest text-[10px] text-left">Victory Hub</span>
                    </Link>
                    <Link href="/dashboard/marketplace" className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted group text-left">
                        <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform text-left">
                            <Store className="h-4 w-4 text-blue-500 text-left" />
                        </div>
                        <span className="font-black uppercase tracking-widest text-[10px] text-left">Provision Hub</span>
                    </Link>
                    <Link href="/dashboard/marketplace/gifts" className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted group text-left">
                        <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform text-left">
                            <Gift className="h-4 w-4 text-indigo-600 text-left" />
                        </div>
                        <span className="font-black uppercase tracking-widest text-[10px] text-left">Kindness Center</span>
                    </Link>
                </CardContent>
                <CardFooter className="p-5 pt-0 text-left">
                    <div className="p-4 bg-muted/30 rounded-2xl border border-dashed text-center w-full text-left">
                        <p className="text-[9px] font-bold text-muted-foreground leading-relaxed italic text-left">
                            "Equipping the saints for the work of ministry." — Eph 4:12
                        </p>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

type SidebarMode = 'testimonies' | 'campaigns' | 'fellowships' | 'harvest' | 'general';