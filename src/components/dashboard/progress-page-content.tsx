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
  Newspaper,
  Droplets
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
import type { Soul, UserProfile, Testimony, ReadingHistoryItem, Campaign, Fellowship, SoulRelationship } from '@/lib/types';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { DailyDisciplineCard } from '@/components/dashboard/daily-discipline-card';
import { RelationshipTrackerCard } from '@/components/dashboard/relationship-tracker-card';
import { StrongholdTracker } from '@/components/dashboard/stronghold-tracker';
import { RelationshipCircleTracker } from '@/components/souls/relationship-circle-tracker';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { LogSoulForm } from '@/components/souls/log-soul-form';

const MonthlyStatsChart = dynamic(() => import('@/components/dashboard/monthly-stats-chart'), {
  loading: () => <Skeleton className="h-[300px] w-full" />,
  ssr: false
});

const chartColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

function RecentSoulsList() {
  const { user } = useUser();
  const firestore = useFirestore();
  const soulsQuery = useMemo(() => user?.uid ? query(collection(firestore, 'users', user.uid, 'souls'), orderBy('wonAt', 'desc'), limit(3)) : null, [user?.uid, firestore]);
  const { data: souls, loading } = useCollection<Soul>(soulsQuery);
  
  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1 flex-1"><Skeleton className="h-4 w-2/4" /><Skeleton className="h-3 w-1/4" /></div></div>))}</div>;
  if (!souls || souls.length === 0) return <div className="text-center py-10 border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/30 text-left"><div className="mx-auto h-12 w-12 text-muted-foreground"><UserPlus strokeWidth={1.5} /></div><h3 className="mt-4 text-lg font-semibold text-center">Log Your First Soul</h3><p className="mt-1 text-sm text-muted-foreground text-center">Start tracking the lives you impact.</p><Button asChild size="sm" className="mt-4"><Link href="/dashboard/souls-won">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>;
  
  return (
    <div className="space-y-1 text-left">
      {souls.map((soul) => { 
        const wonAt = safeToDate(soul.wonAt); 
        return (
          <Link href="/dashboard/souls-won" key={soul.id} className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors text-left" prefetch={true}>
            <Avatar className="h-10 w-10 border">
              <AvatarFallback className="font-black bg-primary/5 text-primary text-xs">{soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <p className="font-semibold leading-none truncate text-left">{soul.firstName} {soul.lastName}</p>
              <p className="text-xs text-muted-foreground mt-1 text-left">Won {wonAt ? format(wonAt, 'PPP') : 'Recently'}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        ); 
      })}
    </div>
  );
}

function CityImpactCard({ location, userSouls }: { location: { city?: string; country?: string }; userSouls: Soul[]; }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [cityCount, setCityCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const yourCityCount = useMemo(() => {
    const soulCount = userSouls.filter((s) => s.userLocation?.city_lowercase === location.city?.toLowerCase()).length;
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
        getDocs(soulsQuery),
        getCountFromServer(usersQuery)
      ]);
      
      const uniqueSoulIdentifiers = new Set<string>();
      soulsSnapshot.docs.forEach(doc => {
          const data = doc.data() as Soul;
          const identifier = (data.phone || data.email || `${data.firstName}_${data.lastName}`).toLowerCase().replace(/\s+/g, '');
          uniqueSoulIdentifiers.add(identifier);
      });
      
      setCityCount(uniqueSoulIdentifiers.size + usersSnapshot.data().count);
    } catch (error) { 
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'souls/users', operation: 'list' }, user)); 
    } finally { 
      setLoading(false); 
    }
  }, [firestore, user, location.city]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  
  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b text-left">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="min-w-0 pr-4 text-left">
          <CardTitle className="text-lg text-left">City Impact</CardTitle>
          <CardDescription className="truncate text-left">Unique Kingdom connections in your area.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchCounts} disabled={loading} className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="sr-only">Refresh stats</span>
        </Button>
      </CardHeader>
      <CardContent className="text-left">
        {location.city ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-primary/5 text-left">
            <div className="min-w-0 text-left">
              <span className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-1 text-left">
                <Globe className="h-3 w-3 text-primary text-left" /> Area: {location.city}
              </span>
              <p className="text-sm text-muted-foreground leading-snug text-left">Total Kingdom reach (Mutual connects counted once).</p>
            </div>
            <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-2 text-left">
              <div className="font-black text-3xl text-primary leading-none text-left">
                {loading && cityCount === 0 ? <Skeleton className="h-8 w-10 text-left" /> : cityCount}
              </div>
              <p className="text-[10px] font-bold uppercase text-primary/60 tracking-tighter text-left">
                You: {yourCityCount}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20 text-left">
            <p className="text-xs text-muted-foreground px-4 text-center text-left">Complete your profile with a city to see local Kingdom impact.</p>
            <Button asChild variant="link" size="sm" className="mt-1 h-auto py-0 text-center mx-auto block w-fit text-left">
              <Link href="/dashboard/profile">Update Profile</Link>
            </Button>
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
  const isMobile = useIsMobile();
  
  const [welcomeMessage, setWelcomeMessage] = useState<{text: string, verse: string} | null>(null);
  const [hasAmened, setHasAmened] = useState(false);
  const [hasHallelujah, setHasHallelujah] = useState(false);

  const userDocRef = useMemo(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [user?.uid, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);
  
  const soulsQuery = useMemo(() => user?.uid ? query(collection(firestore, 'users', user.uid, 'souls')) : null, [user?.uid, firestore]);
  const { data: soulsWon, loading: soulsLoading } = useCollection<Soul>(soulsQuery);
  
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

  if (profileLoading || soulsLoading) return <div className="flex justify-center py-20 text-left"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 pb-12 w-full max-w-7xl mx-auto text-left">
        <header className="text-center space-y-4 px-4">
            {welcomeMessage ? (
                <>
                    <h1 className="text-2xl sm:text-4xl font-bold italic font-headline leading-tight animate-in fade-in slide-in-from-top-4 duration-700 text-center">
                    {welcomeMessage.text.replace('{name}', userProfile?.firstName || 'Soldier')}
                    </h1>
                    <p className="text-primary font-black uppercase text-[10px] sm:text-xs tracking-[0.2em] animate-in fade-in slide-in-from-bottom-4 duration-1000 text-center">
                    {welcomeMessage.verse}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4">
                        <Button 
                            variant="outline" 
                            onClick={() => { setHasAmened(true); toast({ title: 'Amen!', description: 'The Word is established in your life.' }); }}
                            className={cn(
                                "rounded-full h-11 px-6 font-black uppercase text-[10px] tracking-widest transition-all",
                                hasAmened ? "bg-red-500/10 border-red-500 text-red-600 shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "border-primary/20 text-primary hover:bg-primary/5"
                            )}
                        >
                            {hasAmened && <Droplets className="mr-2 h-4 w-4 fill-current text-red-600 animate-pulse" />}
                            Amen, I receive in Jesus name.
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => { setHasHallelujah(true); toast({ title: 'Hallelujah!', description: 'Glory be to the Most High!' }); }}
                            className={cn(
                                "rounded-full h-11 px-6 font-black uppercase text-[10px] tracking-widest transition-all",
                                hasHallelujah ? "bg-red-500/10 border-red-500 text-red-600 shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "border-primary/20 text-primary hover:bg-primary/5"
                            )}
                        >
                            {hasHallelujah && <Droplets className="mr-2 h-4 w-4 fill-current text-red-600 animate-pulse" />}
                            Hallelujah
                        </Button>
                    </div>
                </>
            ) : (
                <div className="space-y-3 flex flex-col items-center">
                    <Skeleton className="h-10 w-3/4 sm:w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                </div>
            )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 rounded-none sm:rounded-[2.5rem] overflow-hidden bg-card/50 backdrop-blur-sm border-y sm:border text-left">
            <div className="lg:col-span-2 flex flex-col divide-y text-left">
                <DailyDisciplineCard />
                <StrongholdTracker />
                <RelationshipTrackerCard />
                <RelationshipCircleTracker 
                    souls={soulsWon || []} 
                    campaigns={activeCampaigns || []} 
                    fellowships={activeFellowships || []} 
                    className="rounded-none"
                />
                {userProfile && <ProgressOverview souls={soulsWon || []} userProfile={userProfile} testimonies={userTestimonies || []} />}
                
                <Card className="rounded-none border-x-0 shadow-none border-b-2 sm:border-b-0 overflow-hidden bg-transparent text-left">
                  <CardHeader className="text-left">
                    <CardTitle className="text-lg flex items-center gap-2 text-left">
                      <Target className="h-5 w-5 text-primary text-left" />
                      Monthly Harvest
                    </CardTitle>
                    <CardDescription className="text-left">Souls won in the last 3 months.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 text-left">
                    <MonthlyStatsChart data={progressData} monthlySoulsGoal={userProfile?.monthlySoulsGoal || 10} />
                  </CardContent>
                </Card>
            </div>
            
            <div className="flex flex-col divide-y lg:border-l bg-muted/5 text-left">
                <Card className="rounded-none border-x-0 shadow-none border-b-2 sm:border-b bg-transparent text-left">
                  <CardHeader className="text-left">
                      <CardTitle className="text-lg flex items-center gap-2 text-left">
                      <Heart className="h-5 w-5 text-primary text-left" />
                      Prayer Reminders
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-left">
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
                                  <div key={soul.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 group text-left">
                                      <div className="min-w-0 flex-1 text-left">
                                          <p className="font-bold text-sm truncate text-left">{soul.firstName} {soul.lastName}</p>
                                          <p className="text-[10px] text-muted-foreground text-left">{soul.daysSinceContact} days idle</p>
                                      </div>
                                      <Button asChild variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 text-[10px] uppercase font-bold text-left">
                                          <Link href="/dashboard/souls-won">Follow-up</Link>
                                      </Button>
                                  </div>
                              ))
                      ) : (
                          <p className="text-xs text-muted-foreground italic text-center py-4 text-left">No follow-up required.</p>
                      )}
                  </CardContent>
                </Card>
                
                <Card className="rounded-none border-x-0 shadow-none border-b-2 sm:border-b bg-transparent text-left">
                  <CardHeader className="text-left">
                    <CardTitle className="text-lg text-left">Recent Souls</CardTitle>
                    <CardDescription className="text-left">Your latest harvest entries.</CardDescription>
                  </CardHeader>
                  <CardContent className="text-left">
                    <RecentSoulsList />
                  </CardContent>

                  {userProfile?.location && (
                    <div className="mt-auto text-left">
                      <CityImpactCard location={userProfile.location} userSouls={soulsWon || []} />
                    </div>
                  )}
                </Card>
            </div>
        </div>
    </div>
  );
}
