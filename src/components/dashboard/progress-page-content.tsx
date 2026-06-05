'use client';

import dynamic from 'next/dynamic';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  format,
  differenceInDays,
  isSameMonth,
} from 'date-fns';
import {
  ArrowRight,
  UserPlus,
  Loader2,
  RefreshCw,
  Heart,
  Target,
  Flame,
  Globe,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Info,
  Users,
  Home,
  PlusCircle,
} from 'lucide-react';
import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import {
  collection,
  query,
  doc,
  orderBy,
  limit,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import type { Soul, UserProfile, Testimony, ReadingHistoryItem, Campaign, Fellowship, SoulRelationship } from '@/lib/types';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { DailyDisciplineCard } from '@/components/dashboard/daily-discipline-card';
import { RelationshipTrackerCard } from '@/components/dashboard/relationship-tracker-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { safeToDate, cn } from '@/lib/utils';
import { actionItems } from '@/lib/follow-up-data';
import { welcomeScriptures } from '@/lib/verses';
import { ProgressOverview } from '@/components/dashboard/progress-overview';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { LogSoulForm } from '@/components/souls/log-soul-form';

const MonthlyStatsChart = dynamic(() => import('@/components/dashboard/monthly-stats-chart').then(m => m.MonthlyStatsChart), {
  loading: () => <Skeleton className="h-[300px] w-full" />,
  ssr: false
});

const chartColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

function RecentSoulsList() {
  const { user } = useUser();
  const firestore = useFirestore();
  const soulsQuery = useMemo(() => user?.uid ? query(collection(firestore, 'users', user.uid, 'souls'), orderBy('wonAt', 'desc'), limit(3)) : null, [user?.uid, firestore]);
  const { data: souls, loading } = useCollection<Soul>( soulsQuery);
  
  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1 flex-1"><Skeleton className="h-4 w-2/4" /><Skeleton className="h-3 w-1/4" /></div></div>))}</div>;
  if (!souls || souls.length === 0) return <div className="text-center py-10 border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/30"><div className="mx-auto h-12 w-12 text-muted-foreground"><UserPlus strokeWidth={1.5} /></div><h3 className="mt-4 text-lg font-semibold">Log Your First Soul</h3><p className="mt-1 text-sm text-muted-foreground">Start tracking the lives you impact.</p><Button asChild size="sm" className="mt-4"><Link href="/dashboard/souls-won">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>;
  
  return (
    <div className="space-y-1">
      {souls.map((soul) => { 
        const wonAt = safeToDate(soul.wonAt); 
        return (
          <Link href="/dashboard/souls-won" key={soul.id} className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors">
            <Avatar className="h-10 w-10 border">
              <AvatarFallback className="font-bold bg-primary/5">{soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold leading-none truncate">{soul.firstName} {soul.lastName}</p>
              <p className="text-xs text-muted-foreground mt-1">Won {wonAt ? format(wonAt, 'PPP') : 'Recently'}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        ); 
      })}
    </div>
  );
}

function PrayerRemindersCard({ souls }: { souls: Soul[] }) {
  const reminders = useMemo(() => {
    if (!souls) return [];
    const now = new Date();

    return souls
      .filter(soul => soul.status !== 'Established')
      .map(soul => {
        const lastFollowUp = (soul.followUpLog && soul.followUpLog.length > 0)
          ? [...soul.followUpLog].sort((a, b) => (safeToDate(b.date)?.getTime() ?? 0) - (safeToDate(a.date)?.getTime() ?? 0))[0]
          : null;
        
        const lastContactDate = lastFollowUp ? safeToDate(lastFollowUp.date) : safeToDate(soul.wonAt);
        const daysSinceContact = lastContactDate ? differenceInDays(now, lastContactDate) : 0;
        
        return { ...soul, daysSinceContact };
      })
      .filter(soul => soul.daysSinceContact > 1)
      .sort((a, b) => b.daysSinceContact - a.daysSinceContact)
      .slice(0, 3);
  }, [souls]);

  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          Prayer Reminders
        </CardTitle>
        <CardDescription>
          Brothers and sisters to reach out to today.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {reminders.length > 0 ? (
          reminders.map(soul => (
            <div key={soul.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 transition-colors hover:bg-muted/60 group">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{[soul.firstName, soul.lastName].filter(Boolean).join(' ')}</p>
                <p className="text-xs text-muted-foreground">No contact for {soul.daysSinceContact} days</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href="/dashboard/souls-won">Follow-up</Link>
              </Button>
            </div>
          ))
        ) : (
          <div className="text-center py-8 bg-muted/10 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground italic px-4">Everyone has been contacted recently. Keep up the good work!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CityImpactCard({ location, userSouls }: { location: { city?: string; country?: string }; userSouls: Soul[]; }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [cityCount, setCityCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const yourCityCount = useMemo(() => {
    const soulCount = userSouls.filter((s) => s.userLocation?.city_lowercase === location.city?.toLowerCase()).length;
    // Including current user as a believer
    return soulCount + 1;
  }, [userSouls, location.city]);

  const fetchCounts = useCallback(async () => {
    if (!firestore || !user || !location.city) { setLoading(false); return; }
    setLoading(true);
    try {
      const cityLower = location.city.toLowerCase();
      
      const soulsQuery = query(collection(firestore, 'souls'), where('userLocation.city_lowercase', '==', cityLower));
      const usersQuery = query(collection(firestore, 'users'), where('location.city_lowercase', '==', cityLower));
      
      const [soulsSnapshot, usersSnapshot] = await Promise.all([
        getCountFromServer(soulsQuery),
        getCountFromServer(usersQuery)
      ]);
      
      setCityCount(soulsSnapshot.data().count + usersSnapshot.data().count);
    } catch (error) { 
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'souls/users', operation: 'list' }, user)); 
    } finally { 
      setLoading(false); 
    }
  }, [firestore, user, location.city]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  
  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="min-w-0 pr-4">
          <CardTitle className="text-lg">City Impact</CardTitle>
          <CardDescription className="truncate">Souls and Believers in your area.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchCounts} disabled={loading} className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="sr-only">Refresh stats</span>
        </Button>
      </CardHeader>
      <CardContent>
        {location.city ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-primary/5">
            <div className="min-w-0">
              <span className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-1">
                <Globe className="h-3 w-3" /> Area: {location.city}
              </span>
              <p className="text-sm text-muted-foreground leading-snug">Total Kingdom force (Souls & Believers).</p>
            </div>
            <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-2">
              <div className="font-black text-3xl text-primary leading-none">
                {loading && cityCount === 0 ? <Skeleton className="h-8 w-10" /> : cityCount}
              </div>
              <p className="text-[10px] font-bold uppercase text-primary/60 tracking-tighter">
                You: {yourCityCount}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
            <p className="text-xs text-muted-foreground px-4">Complete your profile with a city to see local Kingdom impact.</p>
            <Button asChild variant="link" size="sm" className="mt-1 h-auto py-0">
              <Link href="/dashboard/profile">Update Profile</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionAnalyticsCard({ souls }: { souls: Soul[] }) {
  const actionData = useMemo(() => {
    if (!souls) return [];
    const now = new Date();
    const actionCounts: { [key: string]: number } = {};
    actionItems.forEach((item) => (actionCounts[item.id] = 0));
    
    souls.forEach((soul) => soul.followUpLog?.forEach((log) => { 
      const logDate = safeToDate(log.date);
      if (logDate && isSameMonth(logDate, now)) {
        log.actions?.forEach((a) => {
          if (actionCounts[a] !== undefined) actionCounts[a]++;
        });
      }
    }));

    return actionItems
      .map((item, index) => ({ 
        id: item.id, 
        label: item.label, 
        count: actionCounts[item.id], 
        color: chartColors[index % chartColors.length] 
      }))
      .sort((a, b) => b.count - a.count);
  }, [souls]);

  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b">
      <CardHeader>
        <CardTitle className="text-lg">Follow-up Tracker</CardTitle>
        <CardDescription>Interaction types logged this month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {actionData.some(i => i.count > 0) ? (
          actionData.map(i => i.count > 0 && (
            <div key={i.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: i.color }} />
                <span className="text-sm font-medium">{i.label}</span>
              </div>
              <span className="text-sm font-bold">{i.count}</span>
            </div>
          ))
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/10">
            <p className="text-sm text-muted-foreground italic px-6">No interactions logged this month. Start follow-up to see your activity break down.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CategorySoulList({ souls }: { souls: Soul[] }) {
  if (!souls || souls.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-muted-foreground italic">No souls logged in this category yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-4">
      {souls.map((soul) => {
        const wonAt = safeToDate(soul.wonAt);
        return (
          <Link 
            href="/dashboard/souls-won" 
            key={soul.id} 
            className="flex items-center gap-4 p-3 rounded-2xl hover:bg-primary/5 transition-all border bg-background/50 group"
          >
            <Avatar className="h-10 w-10 border shadow-sm shrink-0 group-hover:border-primary/30 transition-colors">
              <AvatarFallback className="font-black bg-primary/5 text-primary text-xs">{soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-black text-sm truncate uppercase tracking-tight">{soul.firstName} {soul.lastName}</p>
                <Badge variant="outline" className="text-[8px] h-4 px-1 uppercase font-black tracking-tighter shrink-0">{soul.status}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                Won {wonAt ? format(wonAt, 'PPP') : 'Recently'}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}

function FamilyFriendsTrackerCard({ 
  souls,
  campaigns,
  fellowships
}: { 
  souls: Soul[],
  campaigns: Campaign[],
  fellowships: Fellowship[]
}) {
    const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
    const [isLogSoulOpen, setIsLogSoulOpen] = useState(false);
    const isMobile = useIsMobile();

    const stats = useMemo(() => {
        const family = souls.filter(s => s.relationship === 'Family');
        const friends = souls.filter(s => ['Friend', 'Colleague', 'Neighbor'].includes(s.relationship || ''));
        const outreach = souls.filter(s => ['Stranger', 'Other'].includes(s.relationship || '') || !s.relationship);
        
        return {
            family: { count: family.length, list: family },
            friends: { count: friends.length, list: friends },
            outreach: { count: outreach.length, list: outreach },
        };
    }, [souls]);

    const activeCategorySouls = useMemo(() => {
        if (!selectedCategoryName) return [];
        if (selectedCategoryName === 'Family') return stats.family.list;
        if (selectedCategoryName === 'Friends') return stats.friends.list;
        if (selectedCategoryName === 'Outreach') return stats.outreach.list;
        return [];
    }, [selectedCategoryName, stats]);

    const handleCategoryClick = (name: string) => {
        setSelectedCategoryName(name);
    };

    const handleOpenLogFromCircle = (e: React.MouseEvent, name: string) => {
        e.stopPropagation();
        setSelectedCategoryName(name);
        setIsLogSoulOpen(true);
    };

    const relationshipType = useMemo(() => {
        const map: Record<string, SoulRelationship> = {
            'Family': 'Family',
            'Friends': 'Friend',
            'Outreach': 'Stranger'
        };
        return map[selectedCategoryName || ''] || 'Other';
    }, [selectedCategoryName]);

    const dialogContent = selectedCategoryName && (
        <>
            {isMobile ? (
                <Sheet open={!!selectedCategoryName && !isLogSoulOpen} onOpenChange={(open) => !open && setSelectedCategoryName(null)}>
                    <SheetContent side="bottom" className="h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                        <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users className="h-4 w-4 text-primary" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Relationship Directory</span>
                                    </div>
                                    <SheetTitle className="text-2xl font-black font-headline tracking-tight uppercase leading-tight">{selectedCategoryName} Circle</SheetTitle>
                                    <SheetDescription className="text-sm font-medium mt-1">Viewing all converts in your {selectedCategoryName.toLowerCase()} group.</SheetDescription>
                                </div>
                                <Button 
                                    onClick={(e) => handleOpenLogFromCircle(e, selectedCategoryName)}
                                    size="icon"
                                    className="shrink-0 rounded-full shadow-lg h-10 w-10"
                                    title={`Log ${selectedCategoryName}`}
                                >
                                    <PlusCircle className="h-5 w-5" />
                                    <span className="sr-only">Log {selectedCategoryName}</span>
                                </Button>
                            </div>
                        </div>
                        <div className="flex-grow overflow-hidden relative">
                            <ScrollArea className="h-full px-8 pt-6">
                                <CategorySoulList souls={activeCategorySouls} />
                                <div className="h-24" />
                            </ScrollArea>
                        </div>
                    </SheetContent>
                </Sheet>
            ) : (
                <Dialog open={!!selectedCategoryName && !isLogSoulOpen} onOpenChange={(open) => !open && setSelectedCategoryName(null)}>
                    <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
                        <div className="p-8 border-b bg-muted/10">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">{selectedCategoryName} Directory</DialogTitle>
                                        <DialogDescription className="text-sm font-medium">Souls won within your {selectedCategoryName.toLowerCase()} circle.</DialogDescription>
                                    </DialogHeader>
                                </div>
                                <Button 
                                    onClick={(e) => handleOpenLogFromCircle(e, selectedCategoryName)}
                                    size="icon"
                                    className="shrink-0 rounded-full shadow-lg h-10 w-10"
                                    title={`Log ${selectedCategoryName}`}
                                >
                                    <PlusCircle className="h-5 w-5" />
                                    <span className="sr-only">Log {selectedCategoryName}</span>
                                </Button>
                            </div>
                        </div>
                        <ScrollArea className="max-h-[60vh] p-6">
                            <CategorySoulList souls={activeCategorySouls} />
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );

    const logSoulView = isLogSoulOpen && (
        isMobile ? (
            <Sheet open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
                <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                        <SheetHeader className="text-left">
                            <SheetTitle className="text-2xl font-black font-headline">Log {selectedCategoryName} Soul</SheetTitle>
                            <SheetDescription className="text-sm font-medium">Record a new life won in your {selectedCategoryName?.toLowerCase()} circle.</SheetDescription>
                        </SheetHeader>
                    </div>
                    <div className="flex-grow overflow-y-auto p-8">
                        <LogSoulForm 
                            onSoulLogged={() => setIsLogSoulOpen(false)} 
                            fellowships={fellowships} 
                            campaigns={campaigns}
                            defaultRelationship={relationshipType}
                        />
                    </div>
                </SheetContent>
            </Sheet>
        ) : (
            <Dialog open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Log {selectedCategoryName} Soul</DialogTitle>
                        <DialogDescription>Record a new life won in your {selectedCategoryName?.toLowerCase()} circle.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto pr-2">
                        <LogSoulForm 
                            onSoulLogged={() => setIsLogSoulOpen(false)} 
                            fellowships={fellowships} 
                            campaigns={campaigns}
                            defaultRelationship={relationshipType}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        )
    );

    return (
        <>
            <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b overflow-hidden">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Home className="h-5 w-5 text-primary" />
                        Relationship Circle Tracker
                    </CardTitle>
                    <CardDescription>
                        Ensuring your closest circles are saved and nurtured in faith.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-3 gap-2">
                        <div 
                            className="p-3 rounded-2xl bg-muted/30 border text-center space-y-1 cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all active:scale-95 group shadow-sm"
                            onClick={() => handleCategoryClick('Family')}
                        >
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter group-hover:text-primary">Family</p>
                            <p className="text-xl font-black text-primary">{stats.family.count}</p>
                        </div>
                        <div 
                            className="p-3 rounded-2xl bg-muted/30 border text-center space-y-1 cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all active:scale-95 group shadow-sm"
                            onClick={() => handleCategoryClick('Friends')}
                        >
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter group-hover:text-primary">Friends</p>
                            <p className="text-xl font-black text-primary">{stats.friends.count}</p>
                        </div>
                        <div 
                            className="p-3 rounded-2xl bg-muted/30 border text-center space-y-1 cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all active:scale-95 group shadow-sm"
                            onClick={() => handleCategoryClick('Outreach')}
                        >
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter group-hover:text-primary">Outreach</p>
                            <p className="text-xl font-black text-foreground">{stats.outreach.count}</p>
                        </div>
                    </div>

                    {stats.family.count === 0 && (
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 flex items-start gap-3 shadow-inner">
                            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <p className="text-xs text-primary font-medium leading-relaxed">
                                Have you shared the Gospel with your household? Log your family members here to prioritize their spiritual growth.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
            {dialogContent}
            {logSoulView}
        </>
    );
}

function LastBibleReadCard({ history }: { history: ReadingHistoryItem[] }) {
  const lastRead = useMemo(() => {
    if (!history || history.length === 0) return null;
    return [...history].sort((a, b) => (safeToDate(b.readAt)?.getTime() ?? 0) - (safeToDate(a.readAt)?.getTime() ?? 0))[0];
  }, [history]);

  if (!lastRead) {
    return (
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-muted/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Resume Study
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">You haven't logged any Bible reading yet. Start today!</p>
          <Button asChild variant="secondary" size="sm" className="w-full">
            <Link href="/dashboard/bible">Open Bible</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const readDate = safeToDate(lastRead.readAt);

  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b border-l-4 border-l-chart-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-chart-2" />
          Last Read
        </CardTitle>
        <CardDescription className="text-[10px] uppercase font-bold tracking-wider">
          {readDate ? format(readDate, 'PPP') : 'Recently'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-3 rounded-lg bg-muted/40 mb-4">
          <p className="text-lg font-bold font-headline leading-tight">
            {lastRead.book} {lastRead.chapter}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">resuming where you left off...</p>
        </div>
        <Button asChild variant="default" size="sm" className="w-full h-9 font-bold">
          <Link href={`/dashboard/bible?book=${encodeURIComponent(lastRead.book)}&chapter=${lastRead.chapter}`}>
            Continue Reading
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function AffirmationButton({ 
  onClick, 
  children, 
  className 
}: { 
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; 
  children: React.ReactNode; 
  className?: string;
}) {
  const [imprints, setImprints] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const id = Date.now();
    setImprints(prev => [...prev, { id, x, y }]);
    
    setTimeout(() => {
      setImprints(prev => prev.filter(i => i.id !== id));
    }, 1000);
    
    onClick(e);
  };

  return (
    <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }} className="relative">
      <Button 
        variant="outline" 
        size="sm" 
        className={cn("relative overflow-hidden h-8 text-[10px] uppercase font-bold tracking-widest border-primary/20 text-primary hover:bg-primary/10", className)}
        onClick={handleClick}
      >
        <AnimatePresence>
          {imprints.map((imprint) => (
            <motion.div
              key={imprint.id}
              initial={{ opacity: 0, scale: 0.2, rotate: -30 }}
              animate={{ opacity: 0.5, scale: 1.5, rotate: 0 }}
              exit={{ opacity: 0, scale: 2, filter: 'blur(4px)' }}
              transition={{ duration: 0.8 }}
              style={{
                position: 'absolute',
                left: imprint.x,
                top: imprint.y,
                width: '30px',
                height: '30px',
                marginLeft: '-15px',
                marginTop: '-15px',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            >
              <svg viewBox="0 0 100 100" fill="currentColor" className="text-red-700 dark:text-red-600">
                <path d="M50,85 C25,85 10,60 10,40 C10,25 30,10 50,10 C70,10 90,25 90,40 C90,60 75,85 50,85" />
              </svg>
            </motion.div>
          ))}
        </AnimatePresence>
        <span className="relative z-10 flex items-center gap-1.5">
          {children}
        </span>
      </Button>
    </motion.div>
  );
}

export function ProgressPageContent() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [welcomeMessage, setWelcomeMessage] = useState<{text: string, verse: string} | null>(null);

  const userDocRef = useMemo(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [user?.uid, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);
  
  const soulsQuery = useMemo(() => user?.uid ? query(collection(firestore, 'users', user.uid, 'souls')) : null, [user?.uid, firestore]);
  const { data: soulsWon, loading: soulsLoading } = useCollection<Soul>( soulsQuery);
  
  const testimoniesQuery = useMemo(() => user?.uid ? query(collection(firestore, 'testimonies'), where('authorId', '==', user.uid)) : null, [user?.uid, firestore]);
  const { data: userTestimonies } = useCollection<Testimony>(testimoniesQuery);

  const fellowshipsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'fellowships'), where('status', '==', 'active'));
  }, [firestore]);
  const { data: activeFellowships } = useCollection<Fellowship>(fellowshipsQuery);

  const campaignsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'campaigns'), where('status', '==', 'active'));
  }, [firestore]);
  const { data: activeCampaigns } = useCollection<Campaign>(campaignsQuery);

  useEffect(() => { 
    const randomMsg = welcomeScriptures[Math.floor(Math.random() * welcomeScriptures.length)];
    setWelcomeMessage(randomMsg);
  }, []);

  const progressData = useMemo(() => {
    if (!soulsWon) return [];
    const monthlyData: { [key: string]: { date: string; soulsWon: number } } = {};
    const threeMonthsAgo = new Date(); 
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2); 
    threeMonthsAgo.setDate(1);

    for (let i = 0; i < 3; i++) { 
        const d = new Date(threeMonthsAgo.getFullYear(), threeMonthsAgo.getMonth() + i, 1); 
        const k = format(d, 'MMM'); 
        monthlyData[k] = { date: k, soulsWon: 0 }; 
    }

    soulsWon.forEach(s => { 
        const d = safeToDate(s.wonAt); 
        if (d && d >= threeMonthsAgo) { 
            const k = format(d, 'MMM'); 
            if (monthlyData[k]) monthlyData[k].soulsWon++; 
        } 
    });
    return Object.values(monthlyData);
  }, [soulsWon]);

  const handleAffirmation = (type: 'hallelujah' | 'amen' | 'receive') => {
    let title = '';
    let description = '';

    switch (type) {
        case 'hallelujah':
            title = 'Hallelujah!';
            description = 'Let the praises of God fill your heart today.';
            break;
        case 'amen':
            title = 'Amen!';
            description = 'Agreeing with the Word in faith.';
            break;
        case 'receive':
            title = 'I Receive!';
            description = 'Claiming this promise in the mighty name of Jesus.';
            break;
    }

    toast({ title: title, description: description });
  };

  if (profileLoading || soulsLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 pb-12">
        <header className="text-center space-y-4 px-4">
            {welcomeMessage ? (
                <>
                    <h1 className="text-2xl sm:text-4xl font-bold italic font-headline leading-tight animate-in fade-in slide-in-from-top-4 duration-700">
                    {welcomeMessage.text.replace('{name}', userProfile?.firstName || 'Soldier')}
                    </h1>
                    <p className="text-primary font-black uppercase text-[10px] sm:text-xs tracking-[0.2em] animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    {welcomeMessage.verse}
                    </p>
                </>
            ) : (
                <div className="space-y-3 flex flex-col items-center">
                    <Skeleton className="h-10 w-3/4 sm:w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                </div>
            )}
            
            <div className="flex flex-wrap justify-center gap-2 pt-2">
                <AffirmationButton onClick={() => handleAffirmation('hallelujah')}>
                    <Sparkles className="mr-1.5 h-3 w-3" />
                    Hallelujah
                </AffirmationButton>
                <AffirmationButton onClick={() => handleAffirmation('amen')}>
                    <CheckCircle2 className="mr-1.5 h-3 w-3" />
                    Amen
                </AffirmationButton>
                <AffirmationButton onClick={() => handleAffirmation('receive')}>
                    <Heart className="mr-1.5 h-3 w-3" />
                    I RECEIVE IN THE NAME OF JESUS
                </AffirmationButton>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 rounded-none sm:rounded-[2.5rem] overflow-hidden bg-card/50 backdrop-blur-sm border-y sm:border">
            <div className="lg:col-span-2 flex flex-col divide-y">
                <DailyDisciplineCard />
                <RelationshipTrackerCard />
                <FamilyFriendsTrackerCard 
                    souls={soulsWon || []} 
                    campaigns={activeCampaigns || []} 
                    fellowships={activeFellowships || []} 
                />
                {userProfile && <ProgressOverview souls={soulsWon || []} userProfile={userProfile} testimonies={userTestimonies || []} />}
                
                <Card className="rounded-none border-x-0 shadow-none border-b-2 sm:border-b-0 overflow-hidden bg-transparent">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Monthly Harvest
                    </CardTitle>
                    <CardDescription>Souls won in the last 3 months.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <MonthlyStatsChart data={progressData} monthlySoulsGoal={userProfile?.monthlySoulsGoal || 10} />
                  </CardContent>
                </Card>

                <ActionAnalyticsCard souls={soulsWon || []} />
            </div>
            
            <div className="flex flex-col divide-y lg:border-l bg-muted/5">
                <LastBibleReadCard history={userProfile?.readingHistory || []} />

                <Card className="rounded-none border-x-0 shadow-none border-b-2 sm:border-b bg-transparent">
                  <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                      <Heart className="h-5 w-5 text-primary" />
                      Prayer Reminders
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                      {soulsWon && soulsWon.length > 0 ? (
                          soulsWon
                              .filter(soul => soul.status !== 'Established')
                              .map(soul => {
                                  const lastFollowUp = (soul.followUpLog && soul.followUpLog.length > 0)
                                      ? [...soul.followUpLog].sort((a, b) => (safeToDate(b.date)?.getTime() ?? 0) - (safeToDate(a.date)?.getTime() ?? 0))[0]
                                      : null;
                                  const lastContactDate = lastFollowUp ? safeToDate(lastFollowUp.date) : safeToDate(soul.wonAt);
                                  const daysSinceContact = lastContactDate ? differenceInDays(new Date(), lastContactDate) : 0;
                                  return { ...soul, daysSinceContact };
                              })
                              .filter(soul => soul.daysSinceContact > 1)
                              .sort((a, b) => b.daysSinceContact - a.daysSinceContact)
                              .slice(0, 3)
                              .map(soul => (
                                  <div key={soul.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 group">
                                      <div className="min-w-0 flex-1">
                                          <p className="font-bold text-sm truncate">{soul.firstName} {soul.lastName}</p>
                                          <p className="text-[10px] text-muted-foreground">Idle for {soul.daysSinceContact} days</p>
                                      </div>
                                      <Button asChild variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 text-[10px] uppercase font-bold">
                                          <Link href="/dashboard/souls-won">Follow-up</Link>
                                      </Button>
                                  </div>
                              ))
                      ) : (
                          <p className="text-xs text-muted-foreground italic text-center py-4">No follow-up required.</p>
                      )}
                  </CardContent>
                </Card>
                
                <Card className="rounded-none border-x-0 shadow-none border-b-2 sm:border-b bg-transparent">
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Souls</CardTitle>
                    <CardDescription>Your latest harvest entries.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentSoulsList />
                  </CardContent>
                </Card>

                {userProfile?.location && (
                  <CityImpactCard location={userProfile.location} userSouls={soulsWon || []} />
                )}
            </div>
        </div>
    </div>
  );
}
