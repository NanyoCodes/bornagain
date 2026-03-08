
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { isSameMonth, format, differenceInHours, subDays } from "date-fns";
import { ArrowRight, UserPlus, Globe, Loader2, RefreshCw, XCircle, Edit, UserCheck2 } from "lucide-react";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, doc, updateDoc, serverTimestamp, orderBy, limit, where, getCountFromServer, getDocs } from "firebase/firestore";
import type { Soul, UserProfile } from "@/lib/types";
import { useMemo, useEffect, useState, useCallback } from "react";
import { DailyDisciplineCard } from "@/components/dashboard/daily-discipline-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { WelcomeBackDialog } from "@/components/dashboard/welcome-back-dialog";


function RecentSoulsList() {
    const { user } = useUser();
    const firestore = useFirestore();

    const soulsQuery = useMemo(() => {
        if (!user?.uid || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/souls`), orderBy("wonAt", "desc"), limit(3));
    }, [user?.uid, firestore]);
    const { data: souls, loading } = useCollection<Soul>(soulsQuery);

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
        )
    }

    if (!souls || souls.length === 0) {
        return (
            <div className="text-center py-10 border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/30">
                <div className="mx-auto h-12 w-12 text-muted-foreground">
                    <UserPlus strokeWidth={1.5} />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Log Your First Soul</h3>
                <p className="mt-1 text-sm text-muted-foreground">Start tracking the lives you impact.</p>
                <Button asChild size="sm" className="mt-4">
                    <Link href="/dashboard/souls-won">
                        Get Started <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-1">
            {souls.map(soul => (
                <Link href="/dashboard/souls-won" key={soul.id} className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="h-10 w-10 border">
                         <AvatarFallback>{soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <p className="font-semibold leading-none">{soul.firstName || 'Unknown'} {soul.lastName || ''}</p>
                        <p className="text-sm text-muted-foreground">
                            Won on {soul.wonAt ? format(soul.wonAt.toDate(), "PPP") : 'N/A'}
                        </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
            ))}
        </div>
    )
}

function GlobalSoulsCard({ location, userSouls }: { location: { city?: string, country?: string }, userSouls: Soul[] }) {
    const firestore = useFirestore();
    const [cityCount, setCityCount] = useState(0);
    const [countryCount, setCountryCount] = useState(0);
    const [globalCount, setGlobalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const yourCityCount = useMemo(() => 
        userSouls.filter(s => s.userLocation?.city_lowercase === location.city?.toLowerCase()).length
    , [userSouls, location.city]);

    const yourCountryCount = useMemo(() =>
        userSouls.filter(s => s.userLocation?.country_lowercase === location.country?.toLowerCase()).length
    , [userSouls, location.country]);

    const yourGlobalCount = userSouls.length;

    const fetchCounts = useCallback(async () => {
        if (!firestore) {
            setLoading(false);
            return;
        };

        setLoading(true);
        try {
            setError(null);
            const soulsCollection = collection(firestore, 'souls');
            
            const promises = [];

            // Global query
            promises.push(getCountFromServer(soulsCollection));

            // City query
            if (location.city) {
                const cityQuery = query(soulsCollection, where('userLocation.city_lowercase', '==', location.city.toLowerCase()));
                promises.push(getCountFromServer(cityQuery));
            } else {
                promises.push(Promise.resolve(null));
            }

            // Country query
            if (location.country) {
                const countryQuery = query(soulsCollection, where('userLocation.country_lowercase', '==', location.country.toLowerCase()));
                promises.push(getCountFromServer(countryQuery));
            } else {
                promises.push(Promise.resolve(null));
            }

            const [globalSnapshot, citySnapshot, countrySnapshot] = await Promise.all(promises);
            
            setGlobalCount(globalSnapshot?.data().count ?? 0);
            setCityCount(citySnapshot?.data().count ?? 0);
            setCountryCount(countrySnapshot?.data().count ?? 0);

        } catch (error) {
            console.error("Error fetching global soul counts:", error);
            setError("Could not load community stats.");
        } finally {
            setLoading(false);
        }
    }, [firestore, location.city, location.country]);

    useEffect(() => {
        fetchCounts();
        const intervalId = setInterval(fetchCounts, 30000); // Refresh every 30 seconds

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, [fetchCounts]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between pb-4">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        Community Impact
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                    </CardTitle>
                    <CardDescription>Souls won by all users.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={fetchCounts} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="sr-only">Refresh stats</span>
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {error ? (
                    <div className="text-destructive text-sm p-3 rounded-md border border-destructive/50 bg-destructive/10 flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        <p>{error} Please try again.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {location.city && (
                             <div className="flex items-center justify-between">
                                <span className="font-medium text-muted-foreground">In {location.city}</span>
                                <div className="text-right">
                                    <p className="font-bold text-lg">{loading && cityCount === 0 ? <Skeleton className="h-6 w-10"/> : cityCount}</p>
                                    <p className="text-xs text-muted-foreground">You: {yourCityCount}</p>
                                </div>
                            </div>
                        )}
                        {location.country && (
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-muted-foreground">In {location.country}</span>
                                <div className="text-right">
                                    <p className="font-bold text-lg">{loading && countryCount === 0 ? <Skeleton className="h-6 w-12"/> : countryCount}</p>
                                    <p className="text-xs text-muted-foreground">You: {yourCountryCount}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-muted-foreground">Globally</span>
                            <div className="text-right">
                                <p className="font-bold text-lg">{loading && globalCount === 0 ? <Skeleton className="h-6 w-16"/> : globalCount}</p>
                                <p className="text-xs text-muted-foreground">You: {yourGlobalCount}</p>
                            </div>
                        </div>
                    </div>
                )}
                {!location.city && !location.country && !loading && (
                    <p className="text-sm text-center text-muted-foreground py-4">
                        Add your location in your profile to see community stats.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

const chartConfig = {
  soulsWon: {
    label: "Souls Won",
    color: "hsl(var(--primary))",
  },
} satisfies import("@/components/ui/chart").ChartConfig;

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function DashboardPage() {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const userDocRef = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`));
  }, [user?.uid, firestore]);
  const { data: soulsWon, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

  // State and logic from progress page
  const [monthlyGoal, setMonthlyGoal] = useState(50);
  const [goalDate, setGoalDate] = useState<Date | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState(monthlyGoal);
  const [newGoalDate, setNewGoalDate] = useState<Date | null>(null);
  
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    newTestimoniesCount: number;
    soulsWonCount: number;
    recentDisciplines: { date: string; completed: boolean }[];
  } | null>(null);

  useEffect(() => {
    const today = new Date();
    setGoalDate(today);
    setNewGoalDate(today);
  }, []);

  const loading = authLoading || profileLoading || soulsLoading;

  useEffect(() => {
    if (loading || !userProfile || !firestore || !user) return;

    const lastActive = userProfile.lastActive?.toDate();
    const now = new Date();

    // Show summary if last active was more than 48 hours ago
    if (lastActive && differenceInHours(now, lastActive) > 48) {
      const fetchSummaryData = async () => {
        try {
          // 1. Get new testimonies count
          const testimoniesQuery = query(
            collection(firestore, 'testimonies'),
            where('createdAt', '>', lastActive)
          );
          const testimoniesSnapshot = await getCountFromServer(testimoniesQuery);
          const newTestimoniesCount = testimoniesSnapshot.data().count;

          // 2. Get souls won count (already available from page data)
          const soulsWonCount = soulsWon?.length ?? 0;

          // 3. Get recent discipline history
          const recentDisciplines: { date: string; completed: boolean }[] = [];
          const threeDaysAgo = subDays(now, 4); // Go back a bit further to be safe
          const disciplineHistoryQuery = query(
            collection(firestore, `users/${user.uid}/disciplineHistory`),
            where('date', '>=', threeDaysAgo)
          );
          const disciplineSnapshot = await getDocs(disciplineHistoryQuery);
          const historyMap = new Map(disciplineSnapshot.docs.map(d => [format(d.data().date.toDate(), 'yyyy-MM-dd'), d.data().completed.length > 0]));
          
          for (let i = 1; i <= 3; i++) {
              const date = subDays(now, i);
              const dateString = format(date, 'yyyy-MM-dd');
              const prettyDate = format(date, 'MMM d');
              recentDisciplines.push({
                  date: prettyDate,
                  completed: historyMap.get(dateString) || false
              });
          }
          recentDisciplines.reverse(); // Show oldest first

          setSummaryData({
            newTestimoniesCount,
            soulsWonCount,
            recentDisciplines
          });
          setShowWelcomeBack(true);

        } catch (error) {
          console.error("Failed to fetch welcome back summary:", error);
          // Don't show the dialog if data fetching fails.
        }
      };

      fetchSummaryData();
    }
  }, [loading, userProfile, firestore, user, soulsWon]);


  const handleGoalDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value) {
      const [year, month] = value.split('-').map(Number);
      setNewGoalDate(new Date(year, month - 1, 1));
    }
  };

  const newGoalDateValue = newGoalDate ? format(newGoalDate, "yyyy-MM") : "";
  
  const soulsThisMonth = useMemo(() => {
    if (!soulsWon || !goalDate) return 0;
    return soulsWon.filter(soul => {
      if (!soul.wonAt) return false;
      const wonDate = soul.wonAt.toDate ? soul.wonAt.toDate() : new Date(soul.wonAt as any);
      return isSameMonth(wonDate, goalDate);
    }).length;
  }, [soulsWon, goalDate]);

  const progressData = useMemo(() => {
    if (!soulsWon) return [];
    const monthlyData: { [key: string]: { date: string, soulsWon: number } } = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    for (let i = 0; i < 6; i++) {
        const date = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
        const monthKey = format(date, "MMM");
        monthlyData[monthKey] = { date: monthKey, soulsWon: 0 };
    }

    soulsWon.forEach(soul => {
      if (soul.wonAt) {
        const wonDate = soul.wonAt.toDate ? soul.wonAt.toDate() : new Date(soul.wonAt as any);
        if (wonDate >= sixMonthsAgo) {
            const monthKey = format(wonDate, "MMM");
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].soulsWon++;
            }
        }
      }
    });
    return Object.values(monthlyData);
  }, [soulsWon]);

  const handleSaveGoal = () => {
    if (newGoal > 0 && newGoalDate) {
      setMonthlyGoal(newGoal);
      setGoalDate(newGoalDate);
      setGoalDialogOpen(false);
      toast({
        title: "Monthly Goal Updated",
        description: `Your new goal for ${format(newGoalDate, "MMMM yyyy")} is ${newGoal} souls.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Invalid Goal",
        description: "Please enter a number greater than 0.",
      });
    }
  };

  const soulsWonCount = soulsWon?.length ?? 0;

  return (
    <div className="space-y-8">
        <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-headline">
                Welcome back, {user?.displayName || 'User'}!
            </h1>
            <p className="text-muted-foreground">Here's your ministry overview.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <DailyDisciplineCard />

                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Statistics</CardTitle>
                        <CardDescription>Souls won in the last 6 months.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={progressData} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis
                            dataKey="date"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => value.slice(0, 3)}
                            />
                            <YAxis domain={[0, (dataMax: number) => Math.max(dataMax || 0, monthlyGoal)]} />
                            <Tooltip cursor={false} content={<ChartTooltipContent />} />
                            <Bar dataKey="soulsWon" radius={8}>
                                {progressData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1.5">
                            <CardTitle>Recent Souls Won</CardTitle>
                            <CardDescription>The latest additions to your follow-up list.</CardDescription>
                        </div>
                        <Button asChild variant="outline" size="sm">
                           <Link href="/dashboard/souls-won">
                                View All
                           </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <RecentSoulsList />
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Monthly Goal</CardTitle>
                                <CardDescription>{goalDate ? format(goalDate, 'MMMM yyyy') : '...'}</CardDescription>
                            </div>
                            <Dialog 
                                open={goalDialogOpen} 
                                onOpenChange={(isOpen) => {
                                if(isOpen) {
                                    setNewGoal(monthlyGoal);
                                    setNewGoalDate(goalDate);
                                }
                                setGoalDialogOpen(isOpen);
                                }}
                            >
                                <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4 text-muted-foreground" />
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
                    </CardHeader>
                    <CardContent>
                    {goalDate ? (
                        <div className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <div className="text-2xl font-bold">{soulsThisMonth}</div>
                                <div className="text-sm text-muted-foreground">/ {monthlyGoal} souls</div>
                            </div>
                            <Progress value={monthlyGoal > 0 ? (soulsThisMonth / monthlyGoal) * 100 : 0} className="h-2" />
                            <p className="text-xs text-muted-foreground text-right">{`${monthlyGoal > 0 ? Math.round((soulsThisMonth / monthlyGoal) * 100) : 0}% complete`}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-1/2" />
                            <Skeleton className="h-2 w-full" />
                            <Skeleton className="h-3 w-1/4 ml-auto" />
                        </div>
                    )}
                    </CardContent>
                    <CardFooter className="pt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <UserCheck2 className="h-4 w-4" />
                        <span>Total souls won: <span className="font-bold text-foreground">{soulsWonCount}</span></span>
                    </CardFooter>
                </Card>
                
                {userProfile?.location && <GlobalSoulsCard location={userProfile.location} userSouls={soulsWon || []} />}

                 <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                    <CardHeader>
                        <CardTitle>Share Your Story</CardTitle>
                        <CardDescription className="text-primary-foreground/80">Encourage the body of Christ with what God has done.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="secondary" className="w-full">
                           <Link href="/dashboard/testimonies">
                                Share Testimony <ArrowRight className="ml-2 h-4 w-4" />
                           </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
        {summaryData && userProfile && (
            <WelcomeBackDialog 
                isOpen={showWelcomeBack}
                onClose={() => setShowWelcomeBack(false)}
                userProfile={userProfile}
                summaryData={summaryData}
            />
        )}
    </div>
  );
}
