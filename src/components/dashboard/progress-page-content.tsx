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
  getDocs,
} from 'firebase/firestore';
import type { Soul, UserProfile, Testimony } from '@/lib/types';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { DailyDisciplineCard } from '@/components/dashboard/daily-discipline-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { safeToDate } from '@/lib/utils';
import { actionItems } from '@/lib/follow-up-data';
import { welcomeScriptures } from '@/lib/verses';
import { ProgressOverview } from '@/components/dashboard/progress-overview';
import AdsenseAd from '@/components/common/adsense-ad';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const MonthlyStatsChart = dynamic(() => import('@/components/dashboard/monthly-stats-chart').then(m => m.MonthlyStatsChart), {
  loading: () => <Skeleton className="h-[300px] w-full" />,
  ssr: false
});

const chartColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

function RecentSoulsList() {
  const { user } = useUser();
  const firestore = useFirestore();
  const soulsQuery = useMemo(() => user?.uid ? query(collection(firestore, `users/${user.uid}/souls`), orderBy('wonAt', 'desc'), limit(3)) : null, [user?.uid, firestore]);
  const { data: souls, loading } = useCollection<Soul>(soulsQuery);
  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1 flex-1"><Skeleton className="h-4 w-2/4" /><Skeleton className="h-3 w-1/4" /></div></div>))}</div>;
  if (!souls || souls.length === 0) return <div className="text-center py-10 border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/30"><div className="mx-auto h-12 w-12 text-muted-foreground"><UserPlus strokeWidth={1.5} /></div><h3 className="mt-4 text-lg font-semibold">Log Your First Soul</h3><p className="mt-1 text-sm text-muted-foreground">Start tracking the lives you impact.</p><Button asChild size="sm" className="mt-4"><Link href="/souls-won">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>;
  return (<div className="space-y-1">{souls.map((soul) => { const wonAt = safeToDate(soul.wonAt); return (<Link href="/souls-won" key={soul.id} className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"><Avatar className="h-10 w-10 border"><AvatarFallback>{soul.firstName?.charAt(0) || 'S'}</AvatarFallback></Avatar><div className="flex-1 min-w-0"><p className="font-semibold leading-none truncate">{soul.firstName} {soul.lastName}</p><p className="text-sm text-muted-foreground">Won on {wonAt ? format(wonAt, 'PPP') : 'N/A'}</p></div><ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" /></Link>); })}</div>);
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
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
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
                <Link href="/souls-won">Follow-up</Link>
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
  const yourCityCount = useMemo(() => userSouls.filter((s) => s.userLocation?.city_lowercase === location.city?.toLowerCase()).length, [userSouls, location.city]);
  const fetchCounts = useCallback(async () => {
    if (!firestore || !user || !location.city) { setLoading(false); return; }
    setLoading(true);
    try {
      const cityQuery = query(collection(firestore, 'souls'), where('userLocation.city_lowercase', '==', location.city.toLowerCase()));
      const citySnapshot = await getCountFromServer(cityQuery);
      setCityCount(citySnapshot.data().count);
    } catch (error) { errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'souls', operation: 'list' }, user)); }
    finally { setLoading(false); }
  }, [firestore, user, location.city]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  
  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="min-w-0 pr-4">
          <CardTitle className="text-lg">City Impact</CardTitle>
          <CardDescription className="truncate">Souls won in your area.</CardDescription>
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
              <p className="text-sm text-muted-foreground">Total harvest in this city.</p>
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
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
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

export function ProgressPageContent() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [welcomeMessage, setWelcomeMessage] = useState(welcomeScriptures[0]);

  const userDocRef = useMemo(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [user?.uid, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);
  const soulsQuery = useMemo(() => user?.uid ? query(collection(firestore, `users/${user.uid}/souls`)) : null, [user?.uid, firestore]);
  const { data: soulsWon, loading: soulsLoading } = useCollection<Soul>(soulsQuery);
  const testimoniesQuery = useMemo(() => user?.uid ? query(collection(firestore, 'testimonies'), where('authorId', '==', user.uid)) : null, [user?.uid, firestore]);
  const { data: userTestimonies } = useCollection<Testimony>(testimoniesQuery);

  useEffect(() => { setWelcomeMessage(welcomeScriptures[Math.floor(Math.random() * welcomeScriptures.length)]); }, []);

  const progressData = useMemo(() => {
    if (!soulsWon) return [];
    const monthlyData: { [key: string]: { date: string; soulsWon: number } } = {};
    const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2); threeMonthsAgo.setDate(1);
    for (let i = 0; i < 3; i++) { const d = new Date(threeMonthsAgo.getFullYear(), threeMonthsAgo.getMonth() + i, 1); const k = format(d, 'MMM'); monthlyData[k] = { date: k, soulsWon: 0 }; }
    soulsWon.forEach(s => { const d = safeToDate(s.wonAt); if (d && d >= threeMonthsAgo) { const k = format(d, 'MMM'); if (monthlyData[k]) monthlyData[k].soulsWon++; } });
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

    toast({
        title: title,
        description: description,
    });
  };

  if (profileLoading || soulsLoading) return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 pb-12">
        <header className="text-center space-y-4 px-4">
            <h1 className="text-2xl sm:text-4xl font-bold italic font-headline leading-tight">
              {welcomeMessage.text.replace('{name}', userProfile?.firstName || 'Soldier')}
            </h1>
            <p className="text-primary font-black uppercase text-[10px] sm:text-xs tracking-[0.2em]">
              {welcomeMessage.verse}
            </p>
            
            <div className="flex flex-wrap justify-center gap-2 pt-2">
                <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-[10px] uppercase font-bold tracking-widest border-primary/20 text-primary hover:bg-primary/10"
                        onClick={() => handleAffirmation('hallelujah')}
                    >
                        <Sparkles className="mr-1.5 h-3 w-3" />
                        Hallelujah
                    </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-[10px] uppercase font-bold tracking-widest border-primary/20 text-primary hover:bg-primary/10"
                        onClick={() => handleAffirmation('amen')}
                    >
                        <CheckCircle2 className="mr-1.5 h-3 w-3" />
                        Amen
                    </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-[10px] uppercase font-bold tracking-widest border-primary/20 text-primary hover:bg-primary/10"
                        onClick={() => handleAffirmation('receive')}
                    >
                        <Heart className="mr-1.5 h-3 w-3" />
                        I RECEIVE IN THE NAME OF JESUS
                    </Button>
                </motion.div>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2 space-y-6 md:space-y-8">
                <div className="-mx-4 sm:mx-0"><DailyDisciplineCard /></div>
                {userProfile && <div className="-mx-4 sm:mx-0"><ProgressOverview souls={soulsWon || []} userProfile={userProfile} testimonies={userTestimonies || []} /></div>}
                
                <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-sm">
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

                <div className="-mx-4 sm:mx-0"><ActionAnalyticsCard souls={soulsWon || []} /></div>
            </div>
            
            <div className="space-y-6 md:space-y-8 pb-16 lg:pb-0">
                <div className="-mx-4 sm:mx-0">
                  <PrayerRemindersCard souls={soulsWon || []} />
                </div>
                
                <div className="-mx-4 sm:mx-0">
                  <AdsenseAd adSlot="progress-sidebar-ad" className="h-auto" />
                </div>

                <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Souls</CardTitle>
                    <CardDescription>Your latest harvest entries.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentSoulsList />
                  </CardContent>
                </Card>

                {userProfile?.location && (
                  <div className="-mx-4 sm:mx-0">
                    <CityImpactCard location={userProfile.location} userSouls={soulsWon || []} />
                  </div>
                )}
                <div className="h-20 sm:hidden"></div>
            </div>
        </div>
    </div>
  );
}
