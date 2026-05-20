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
  isSameMonth,
  format,
  differenceInHours,
  subDays,
  isToday,
  isAfter,
  startOfWeek,
  differenceInDays,
} from 'date-fns';
import {
  ArrowRight,
  UserPlus,
  Loader2,
  RefreshCw,
  XCircle,
  Heart,
  Users,
  CalendarCheck,
  Target,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import {
  collection,
  query,
  doc,
  serverTimestamp,
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
import { WelcomeBackDialog } from '@/components/dashboard/welcome-back-dialog';
import { safeToDate } from '@/lib/utils';
import { actionItems } from '@/lib/follow-up-data';
import { useIsMobile } from '@/hooks/use-mobile';
import { LogSoulForm } from '@/components/souls/log-soul-form';
import { useRouter } from 'next/navigation';
import { welcomeScriptures } from '@/lib/verses';
import AdsenseAd from '@/components/common/adsense-ad';
import { ProgressOverview } from '@/components/dashboard/progress-overview';
import { useToast } from '@/hooks/use-toast';

// Performance: Dynamically import heavy components
const MonthlyStatsChart = dynamic(() => import('@/components/dashboard/monthly-stats-chart').then(m => m.MonthlyStatsChart), {
  loading: () => <Skeleton className="h-[300px] w-full" />,
  ssr: false
});

const chartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function RecentSoulsList() {
  const { user } = useUser();
  const firestore = useFirestore();

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/souls`),
      orderBy('wonAt', 'desc'),
      limit(3)
    );
  }, [user?.uid, firestore]);
  const { data: souls, loading } = useCollection<Soul>( soulsQuery);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-2/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!souls || souls.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/30">
        <div className="mx-auto h-12 w-12 text-muted-foreground">
          <UserPlus strokeWidth={1.5} />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Log Your First Soul</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Start tracking the lives you impact.
        </p>
        <Button asChild size="sm" className="mt-4">
          <Link href="/dashboard/souls-won">
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {souls.map((soul) => {
        const wonAt = safeToDate(soul.wonAt);
        return (
          <Link
            href="/dashboard/souls-won"
            key={soul.id}
            className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-10 w-10 border">
              <AvatarFallback>{soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold leading-none">
                {soul.firstName || 'Unknown'} {soul.lastName || ''}
              </p>
              <p className="text-sm text-muted-foreground">
                Won on {wonAt ? format(wonAt, 'PPP') : 'N/A'}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        );
      })}
    </div>
  );
}

function CityImpactCard({
  location,
  userSouls,
}: {
  location: { city?: string; country?: string };
  userSouls: Soul[];
}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [cityCount, setCityCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const yourCityCount = useMemo(
    () =>
      userSouls.filter(
        (s) => s.userLocation?.city_lowercase === location.city?.toLowerCase()
      ).length,
    [userSouls, location.city]
  );

  const fetchCounts = useCallback(async () => {
    if (!firestore || !user || !location.city) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setError(null);
      const soulsCollection = collection(firestore, 'souls');
      const cityQuery = query(
        soulsCollection,
        where('userLocation.city_lowercase', '==', location.city.toLowerCase())
      );
      const citySnapshot = await getCountFromServer(cityQuery);
      setCityCount(citySnapshot.data().count);
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: 'souls',
        operation: 'list',
      }, user);
      errorEmitter.emit('permission-error', permissionError);
      setError('Could not load city stats.');
    } finally {
      setLoading(false);
    }
  }, [firestore, user, location.city]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div>
          <CardTitle>City Impact</CardTitle>
          <CardDescription>Souls won in your city.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchCounts} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="sr-only">Refresh stats</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="text-destructive text-sm p-3 rounded-md border border-destructive/50 bg-destructive/10 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            <p>{error}</p>
          </div>
        ) : (
          <div>
            {location.city && (
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">
                  In {location.city}
                </span>
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {loading && cityCount === 0 ? (
                      <Skeleton className="h-6 w-10" />
                    ) : (
                      cityCount
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You: {yourCityCount}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {!location.city && !loading && (
          <p className="text-sm text-center text-muted-foreground py-4">
            Add your location in your profile.
          </p>
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

    souls.forEach((soul) => {
      soul.followUpLog?.forEach((log) => {
        const logDate = safeToDate(log.date);
        if (logDate && isSameMonth(logDate, now)) {
          log.actions?.forEach((actionId) => {
            if (actionCounts[actionId] !== undefined) {
              actionCounts[actionId]++;
            }
          });
        }
      });
    });

    return actionItems
      .map((item, index) => ({
        id: item.id,
        label: item.label,
        count: actionCounts[item.id],
        color: chartColors[index % chartColors.length]
      }))
      .sort((a, b) => b.count - a.count);
  }, [souls]);

  if (!souls || souls.length === 0) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-up Actions Tracker</CardTitle>
        <CardDescription>
          Frequency of actions taken this month.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2 space-y-2">
        {actionData.some(item => item.count > 0) ? (
            actionData.map((item) => (
              item.count > 0 && (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold">{item.count}</span>
                </div>
              )
            ))
        ) : (
            <p className="text-sm text-center text-muted-foreground py-4">No actions logged this month.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const userDocRef = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);
  const { data: userProfile, loading: profileLoading } =
    useDoc<UserProfile>(userDocRef);

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`));
  }, [user?.uid, firestore]);
  const { data: soulsWon, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

  const testimoniesQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'testimonies'), where('authorId', '==', user.uid));
  }, [user?.uid, firestore]);
  const { data: userTestimonies, loading: testimoniesLoading } = useCollection<Testimony>(testimoniesQuery);

  const [isLogSoulOpen, setIsLogSoulOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    newTestimoniesCount: number;
    soulsWonCount: number;
    recentDisciplines: { date: string; completed: boolean }[];
  } | null>(null);

  const [welcomeMessage, setWelcomeMessage] = useState<{
    text: string;
    verse: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    const randomScripture =
      welcomeScriptures[Math.floor(Math.random() * welcomeScriptures.length)];
    setWelcomeMessage(randomScripture);
  }, []);

  const loading = authLoading || profileLoading || soulsLoading || testimoniesLoading;

  useEffect(() => {
    if (loading || !userProfile || !firestore || !user) return;

    const lastActive = safeToDate(userProfile.lastActive);
    const now = new Date();

    if (lastActive && differenceInHours(now, lastActive) > 48) {
      const fetchSummaryData = async () => {
        try {
          const testimoniesQuery = query(
            collection(firestore, 'testimonies'),
            where('createdAt', '>', lastActive)
          );
          const testimoniesSnapshot = await getCountFromServer(testimoniesQuery);
          const newTestimoniesCount = testimoniesSnapshot.data().count;
          const soulsWonCount = soulsWon?.length ?? 0;
          const recentDisciplines: { date: string; completed: boolean }[] = [];
          const threeDaysAgo = subDays(now, 4);
          const disciplineHistoryQuery = query(
            collection(firestore, `users/${user.uid}/disciplineHistory`),
            where('date', '>=', threeDaysAgo)
          );
          const disciplineSnapshot = await getDocs(disciplineHistoryQuery);
          const historyMap = new Map(
            disciplineSnapshot.docs.map((d) => [
              format(safeToDate(d.data().date)!, 'yyyy-MM-dd'),
              d.data().completed.length > 0,
            ])
          );

          for (let i = 1; i <= 3; i++) {
            const date = subDays(now, i);
            const dateString = format(date, 'yyyy-MM-dd');
            const prettyDate = format(date, 'MMM d');
            recentDisciplines.push({
              date: prettyDate,
              completed: historyMap.get(dateString) || false,
            });
          }
          recentDisciplines.reverse();

          setSummaryData({
            newTestimoniesCount,
            soulsWonCount,
            recentDisciplines,
          });
          setShowWelcomeBack(true);
        } catch (error) {
          console.error('Failed to fetch welcome back summary:', error);
        }
      };

      fetchSummaryData();
    }
  }, [loading, userProfile, firestore, user, soulsWon]);

  const soulsToday = useMemo(() => {
    if (!soulsWon) return 0;
    return soulsWon.filter(s => {
      const d = safeToDate(s.wonAt);
      return d && isToday(d);
    }).length;
  }, [soulsWon]);

  const soulsThisWeek = useMemo(() => {
    if (!soulsWon) return 0;
    const start = startOfWeek(new Date(), { weekStartsOn: 0 });
    return soulsWon.filter(s => {
      const d = safeToDate(s.wonAt);
      return d && isAfter(d, start);
    }).length;
  }, [soulsWon]);

  const progressData = useMemo(() => {
    if (!soulsWon) return [];
    const monthlyData: { [key: string]: { date: string; soulsWon: number } } = {};
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2);
    threeMonthsAgo.setDate(1);

    for (let i = 0; i < 3; i++) {
      const date = new Date(
        threeMonthsAgo.getFullYear(),
        threeMonthsAgo.getMonth() + i,
        1
      );
      const monthKey = format(date, 'MMM');
      monthlyData[monthKey] = { date: monthKey, soulsWon: 0 };
    }

    soulsWon.forEach((soul) => {
      const wonDate = safeToDate(soul.wonAt);
      if (wonDate && wonDate >= threeMonthsAgo) {
        const monthKey = format(wonDate, 'MMM');
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].soulsWon++;
        }
      }
    });
    return Object.values(monthlyData);
  }, [soulsWon]);

  const displayName = userProfile?.firstName || user?.displayName || 'User';

  const handleSoulLogged = () => {
    setIsLogSoulOpen(false);
    toast({ title: "Soul Logged!" });
  };

  if (loading || !userProfile) {
      return (
        <div className="space-y-8">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
        </div>
      )
  }

  return (
    <div className="space-y-8">
      <Card className="bg-transparent border-none shadow-none text-center py-4">
        <CardContent className="p-6">
          <h1 className="text-2xl sm:text-4xl font-medium font-headline text-white drop-shadow-md italic leading-tight">
            {welcomeMessage?.text.replace('{name}', displayName) ||
              `Welcome back, ${displayName}!`}
          </h1>
          <p className="text-white font-headline mt-4 text-sm sm:base font-semibold tracking-wide drop-shadow-sm uppercase">
            {welcomeMessage?.verse || ''}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Lives Changed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{soulsToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Glory to God for these lives!</p>
          </CardContent>
        </Card>
        <Card className="bg-chart-2/10 border-chart-2/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-chart-2" />
              Souls Won This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{soulsThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">The harvest is truly plenteous.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <DailyDisciplineCard />

          {mounted && <ProgressOverview souls={soulsWon || []} userProfile={userProfile} testimonies={userTestimonies || []} />}

          <Card>
            <CardHeader>
              <CardTitle>Monthly Harvest Statistics</CardTitle>
              <CardDescription>Tracking your progress across the last 3 months.</CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyStatsChart 
                data={progressData} 
                monthlySoulsGoal={userProfile?.monthlySoulsGoal || 10} 
              />
            </CardContent>
          </Card>

          <AdsenseAd adSlot="dashboard-middle-ad" />

          <ActionAnalyticsCard souls={soulsWon || []} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle>Recent Souls Won</CardTitle>
                <CardDescription>
                  Individuals recently led to Christ.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/souls-won">View All</Link>
                </Button>
                <Button size="sm" onClick={() => setIsLogSoulOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Log Soul
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <RecentSoulsList />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Follow-up Funnel</CardTitle>
              <CardDescription>
                Progress of souls from conversion to established discipleship.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 space-y-2">
                {[
                  { status: 'New', count: soulsWon?.filter(s => s.status === 'New').length || 0, color: 'hsl(var(--status-new))' },
                  { status: 'Contacted', count: soulsWon?.filter(s => s.status === 'Contacted').length || 0, color: 'hsl(var(--status-contacted))' },
                  { status: 'Established', count: soulsWon?.filter(s => s.status === 'Established').length || 0, color: 'hsl(var(--status-established))' },
                ].map((item) => (
                    <div key={item.status} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                        <div className="flex items-center gap-3">
                            <span
                                className="flex h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm font-medium">{item.status}</span>
                        </div>
                        <span className="text-sm font-bold">{item.count}</span>
                    </div>
                ))}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Prayer Reminders
                </CardTitle>
                <CardDescription>
                    Souls needing intercession and follow-up.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {soulsWon?.filter(s => s.status !== 'Established').slice(0, 3).map(soul => (
                    <div key={soul.id} className="flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-muted/50">
                        <div>
                            <p className="font-semibold text-sm">{[soul.firstName, soul.lastName].filter(Boolean).join(' ') || 'Unnamed Soul'}</p>
                            <p className="text-xs text-muted-foreground">Needs prayer</p>
                        </div>
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/dashboard/souls-won">View</Link>
                        </Button>
                    </div>
                )) || <p className="text-sm text-center text-muted-foreground py-4">No reminders.</p>}
            </CardContent>
          </Card>

          {userProfile?.location && (
            <CityImpactCard
              location={userProfile.location}
              userSouls={soulsWon || []}
            />
          )}

          <Card
            className="cursor-pointer bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
            onClick={() => router.push('/dashboard/testimonies')}
          >
            <CardHeader>
              <CardTitle>Share Your Glory Story</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                "Go home to your own people and tell them how much the Lord has done for you..."
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full bg-white/20 text-white hover:bg-white/30" onClick={(e) => { e.stopPropagation(); }}>
                <Link href="/dashboard/testimonies">
                  Share Testimony <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <WelcomeBackDialog
        isOpen={showWelcomeBack && !!summaryData && !!userProfile}
        onClose={() => setShowWelcomeBack(false)}
        userProfile={userProfile!}
        summaryData={summaryData}
      />
      
      <Dialog open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Log a New Soul</DialogTitle>
            <DialogDescription>
                Record the details of the person you've ministered to.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <LogSoulForm onSoulLogged={handleSoulLogged} fellowships={[]} campaigns={[]} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}