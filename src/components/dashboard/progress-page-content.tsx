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
  if (!souls || souls.length === 0) return <div className="text-center py-10 border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/30"><div className="mx-auto h-12 w-12 text-muted-foreground"><UserPlus strokeWidth={1.5} /></div><h3 className="mt-4 text-lg font-semibold text-center">Log Your First Soul</h3><p className="mt-1 text-sm text-muted-foreground text-center">Start tracking the lives you impact.</p><Button asChild size="sm" className="mt-4"><Link href="/dashboard/souls-won">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>;
  
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
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b text-left">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-left">
          <Heart className="h-5 w-5 text-primary text-left text-left" />
          Prayer Reminders
        </CardTitle>
        <CardDescription className="text-left text-left">
          Brothers and sisters to reach out to today.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-left text-left">
        {reminders.length > 0 ? (
          reminders.map(soul => (
            <div key={soul.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 transition-colors hover:bg-muted/60 group text-left text-left">
              <div className="min-w-0 flex-1 text-left text-left">
                <p className="font-bold text-sm truncate text-left text-left">{[soul.firstName, soul.lastName].filter(Boolean).join(' ')}</p>
                <p className="text-xs text-muted-foreground text-left text-left">No contact for {soul.daysSinceContact} days</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href="/dashboard/souls-won">Follow-up</Link>
              </Button>
            </div>
          ))
        ) : (
          <div className="text-center py-8 bg-muted/10 rounded-lg border border-dashed text-left text-left">
            <p className="text-sm text-muted-foreground italic px-4 text-center text-left">Everyone has been contacted recently. Keep up the good work!</p>
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
        getDocs(soulsQuery),
        getCountFromServer(usersQuery)
      ]);
      
      // De-duplicate souls by unique identifiers (phone, email, or normalized name)
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
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b text-left text-left">
      <CardHeader className="flex flex-row items-start justify-between pb-4 text-left text-left">
        <div className="min-w-0 pr-4 text-left text-left">
          <CardTitle className="text-lg text-left text-left">City Impact</CardTitle>
          <CardDescription className="truncate text-left text-left">Unique Kingdom connections in your area.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchCounts} disabled={loading} className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-left text-left" /> : <RefreshCw className="h-4 w-4 text-left text-left" />}
          <span className="sr-only">Refresh stats</span>
        </Button>
      </CardHeader>
      <CardContent className="text-left text-left">
        {location.city ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-primary/5 text-left text-left">
            <div className="min-w-0 text-left text-left">
              <span className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-1 text-left text-left">
                <Globe className="h-3 w-3 text-primary text-left text-left" /> Area: {location.city}
              </span>
              <p className="text-sm text-muted-foreground leading-snug text-left text-left">Total Kingdom reach (Mutual connects counted once).</p>
            </div>
            <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-2 text-left text-left">
              <div className="font-black text-3xl text-primary leading-none text-left text-left">
                {loading && cityCount === 0 ? <Skeleton className="h-8 w-10 text-left text-left" /> : cityCount}
              </div>
              <p className="text-[10px] font-bold uppercase text-primary/60 tracking-tighter text-left text-left">
                You: {yourCityCount}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20 text-left text-left">
            <p className="text-xs text-muted-foreground px-4 text-center text-left">Complete your profile with a city to see local Kingdom impact.</p>
            <Button asChild variant="link" size="sm" className="mt-1 h-auto py-0 text-center mx-auto block w-fit">
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
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b text-left text-left">
      <CardHeader className="text-left text-left">
        <CardTitle className="text-lg text-left text-left">Follow-up Tracker</CardTitle>
        <CardDescription className="text-left text-left">Interaction types logged this month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-left text-left">
        {actionData.some(i => i.count > 0) ? (
          actionData.map(i => i.count > 0 && (
            <div key={i.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-left text-left">
              <div className="flex items-center gap-3 text-left text-left">
                <span className="flex h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: i.color }} />
                <span className="text-sm font-medium text-left text-left">{i.label}</span>
              </div>
              <span className="text-sm font-bold text-left text-left">{i.count}</span>
            </div>
          ))
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/10 text-left text-left">
            <p className="text-sm text-muted-foreground italic px-6 text-center text-left">No interactions logged this month. Start follow-up to see your activity break down.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LastBibleReadCard({ history }: { history: ReadingHistoryItem[] }) {
  const lastRead = useMemo(() => {
    if (!history || history.length === 0) return null;
    return [...history].sort((a, b) => (safeToDate(b.readAt)?.getTime() ?? 0) - (safeToDate(a.readAt)?.getTime() ?? 0))[0];
  }, [history]);

  if (!lastRead) {
    return (
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-muted/10 text-left text-left">
        <CardHeader className="pb-3 text-left text-left">
          <CardTitle className="text-base flex items-center gap-2 text-left text-left">
            <BookOpen className="h-4 w-4 text-primary text-left text-left" />
            Resume Study
          </CardTitle>
        </CardHeader>
        <CardContent className="text-left text-left">
          <p className="text-xs text-muted-foreground mb-4 text-left text-left">You haven't logged any Bible reading yet. Start today!</p>
          <Button asChild variant="secondary" size="sm" className="w-full text-left text-left">
            <Link href="/dashboard/bible">Open Bible</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const readDate = safeToDate(lastRead.readAt);

  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b border-l-4 border-l-chart-2 text-left text-left">
      <CardHeader className="pb-3 text-left text-left">
        <CardTitle className="text-base flex items-center gap-2 text-left text-left">
          <BookOpen className="h-4 w-4 text-chart-2 text-left text-left" />
          Last Read
        </CardTitle>
        <CardDescription className="text-[10px] uppercase font-bold tracking-wider text-left text-left">
          {readDate ? format(readDate, 'PPP') : 'Recently'}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-left text-left text-left">
        <div className="p-3 rounded-lg bg-muted/40 mb-4 text-left text-left">
          <p className="text-lg font-bold font-headline leading-tight text-left text-left text-left">
            {lastRead.book} {lastRead.chapter}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 text-left text-left text-left">resuming where you left off...</p>
        </div>
        <Button asChild variant="default" size="sm" className="w-full h-9 font-bold text-left text-left text-left">
          <Link href={`/dashboard/bible?book=${encodeURIComponent(lastRead.book)}&chapter=${lastRead.chapter}`}>
            Continue Reading
            <ArrowRight className="ml-2 h-3.5 w-3.5 text-left text-left text-left" />
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
    <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }} className="relative text-left text-left text-left text-left text-left">
      <Button 
        variant="outline" 
        size="sm" 
        className={cn("relative overflow-hidden h-8 text-[10px] uppercase font-bold tracking-widest border-primary/20 text-primary hover:bg-primary/10 text-left text-left text-left text-left text-left", className)}
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
        <span className="relative z-10 flex items-center gap-1.5 text-left text-left text-left text-left text-left">
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

  if (profileLoading || soulsLoading) return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 pb-12 w-full max-w-7xl mx-auto text-left text-left text-left text-left text-left">
        <header className="text-center space-y-4 px-4 text-left text-left text-left text-left text-left">
            {welcomeMessage ? (
                <>
                    <h1 className="text-2xl sm:text-4xl font-bold italic font-headline leading-tight animate-in fade-in slide-in-from-top-4 duration-700 text-center text-left text-left text-left text-left text-left">
                    {welcomeMessage.text.replace('{name}', userProfile?.firstName || 'Soldier')}
                    </h1>
                    <p className="text-primary font-black uppercase text-[10px] sm:text-xs tracking-[0.2em] animate-in fade-in slide-in-from-bottom-4 duration-1000 text-center text-left text-left text-left text-left text-left">
                    {welcomeMessage.verse}
                    </p>
                </>
            ) : (
                <div className="space-y-3 flex flex-col items-center text-left text-left text-left text-left text-left">
                    <Skeleton className="h-10 w-3/4 sm:w-1/2 text-left text-left text-left text-left text-left" />
                    <Skeleton className="h-4 w-1/3 text-left text-left text-left text-left text-left" />
                </div>
            )}
            
            <div className="flex flex-wrap justify-center gap-2 pt-2 text-left text-left text-left text-left text-left">
                <AffirmationButton onClick={() => handleAffirmation('hallelujah')}>
                    <Sparkles className="mr-1.5 h-3 w-3 text-left text-left text-left text-left text-left" />
                    Hallelujah
                </AffirmationButton>
                <AffirmationButton onClick={() => handleAffirmation('amen')}>
                    <CheckCircle2 className="mr-1.5 h-3 w-3 text-left text-left text-left text-left text-left" />
                    Amen
                </AffirmationButton>
                <AffirmationButton onClick={() => handleAffirmation('receive')}>
                    <Heart className="mr-1.5 h-3 w-3 text-left text-left text-left text-left text-left" />
                    I RECEIVE IN THE NAME OF JESUS
                </AffirmationButton>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 rounded-none sm:rounded-[2.5rem] overflow-hidden bg-card/50 backdrop-blur-sm border-y sm:border text-left text-left text-left text-left text-left">
            <div className="lg:col-span-2 flex flex-col divide-y text-left text-left text-left text-left text-left">
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
                
                <Card className="rounded-none border-x-0 shadow-none border-b-2 sm:border-b-0 overflow-hidden bg-transparent text-left text-left text-left text-left text-left">
                  <CardHeader className="text-left text-left text-left text-left text-left text-left text-left">
                    <CardTitle className="text-lg flex items-center gap-2 text-left text-left text-left text-left text-left text-left text-left text-left">
                      <Target className="h-5 w-5 text-primary text-left text-left text-left text-left text-left text-left text-left text-left text-left" />
                      Monthly Harvest
                    </CardTitle>
                    <CardDescription className="text-left text-left text-left text-left text-left text-left text-left">Souls won in the last 3 months.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 text-left text-left text-left text-left text-left text-left text-left">
                    <MonthlyStatsChart data={progressData} monthlySoulsGoal={userProfile?.monthlySoulsGoal || 10} />
                  </CardContent>
                </Card>

                <ActionAnalyticsCard souls={soulsWon || []} />
                
                <div className="p-8 sm:p-12 text-center bg-primary/5 text-left text-left text-left text-left text-left text-left">
                    <h3 className="text-2xl font-black font-headline uppercase tracking-tight mb-4 text-center text-left text-left text-left text-left text-left">Support the Body</h3>
                    <p className="text-sm text-muted-foreground font-medium max-w-md mx-auto mb-8 leading-relaxed italic text-center text-left text-left text-left text-left text-left">
                        "Carry each other's burdens, and in this way you will fulfill the law of Christ." Choose a center to start your act of kindness.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 w-full px-4 text-left text-left text-left text-left text-left text-left">
                        <Button variant="outline" asChild className="w-full sm:w-auto rounded-2xl h-12 px-8 font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 shadow-lg text-left text-left text-left text-left text-left text-left text-left">
                            <Link href="/dashboard/marketplace">MEALS CENTER</Link>
                        </Button>
                        <Button variant="outline" asChild className="w-full sm:w-auto rounded-2xl h-12 px-8 font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 shadow-lg text-left text-left text-left text-left text-left text-left text-left">
                            <Link href="/dashboard/marketplace/gifts">KINDNESS CENTER</Link>
                        </Button>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col divide-y lg:border-l bg-muted/5 text-left text-left text-left text-left text-left text-left">
                <LastBibleReadCard history={userProfile?.readingHistory || []} />

                <Card className="rounded-none border-x-0 shadow-none border-b-2 sm:border-b bg-transparent text-left text-left text-left text-left text-left text-left">
                  <CardHeader className="text-left text-left text-left text-left text-left text-left text-left text-left">
                      <CardTitle className="text-lg flex items-center gap-2 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                      <Heart className="h-5 w-5 text-primary text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left" />
                      Prayer Reminders
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-left text-left text-left text-left text-left text-left text-left">
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
                                  <div key={soul.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 group text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                      <div className="min-w-0 flex-1 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                          <p className="font-bold text-sm truncate text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{soul.firstName} {soul.lastName}</p>
                                          <p className="text-[10px] text-muted-foreground text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{soul.daysSinceContact} days idle</p>
                                      </div>
                                      <Button asChild variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 text-[10px] uppercase font-bold text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                          <Link href="/dashboard/souls-won">Follow-up</Link>
                                      </Button>
                                  </div>
                              ))
                      ) : (
                          <p className="text-xs text-muted-foreground italic text-center py-4 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">No follow-up required.</p>
                      )}
                  </CardContent>
                </Card>
                
                <Card className="rounded-none border-x-0 shadow-none border-b-2 sm:border-b bg-transparent text-left text-left text-left text-left text-left text-left text-left">
                  <CardHeader className="text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                    <CardTitle className="text-lg text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Recent Souls</CardTitle>
                    <CardDescription className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Your latest harvest entries.</CardDescription>
                  </CardHeader>
                  <CardContent className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                    <RecentSoulsList />
                  </CardContent>
                </Card>

                {userProfile?.location && (
                  <div className="mt-auto text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                    <CityImpactCard location={userProfile.location} userSouls={soulsWon || []} />
                  </div>
                )}
            </div>
        </div>
    </div>
  );
}
