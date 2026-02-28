
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSameDay, startOfDay, differenceInCalendarDays, format } from "date-fns";
import { TrendingUp, UserCheck2, Trophy, ArrowRight, UserPlus, Globe, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, doc, updateDoc, serverTimestamp, orderBy, limit, where, getCountFromServer } from "firebase/firestore";
import type { Soul, UserProfile } from "@/lib/types";
import { useMemo, useEffect, useState, useCallback } from "react";
import { DailyDisciplineCard } from "@/components/dashboard/daily-discipline-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";


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
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <div className="mx-auto h-12 w-12 text-muted-foreground">
                    <UserPlus />
                </div>
                <h3 className="mt-2 text-sm font-semibold">No souls logged yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">Start tracking the lives you impact.</p>
                <Button asChild variant="secondary" size="sm" className="mt-4">
                    <Link href="/dashboard/souls-won">
                        Log Your First Soul
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {souls.map(soul => (
                <div key={soul.id} className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 border">
                         <AvatarFallback>{soul.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <p className="text-sm font-medium leading-none">{soul.name}</p>
                        <p className="text-sm text-muted-foreground">
                            Won on {soul.wonAt ? format(soul.wonAt.toDate(), "PPP") : 'N/A'}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}

function GlobalSoulsCard({ location }: { location: { city?: string, country?: string } }) {
    const firestore = useFirestore();
    const [cityCount, setCityCount] = useState(0);
    const [countryCount, setCountryCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCounts = useCallback(async () => {
        if (!firestore || (!location.city && !location.country)) {
            setLoading(false);
            return;
        };

        try {
            setLoading(true);
            setError(null);
            const soulsCollection = collection(firestore, 'souls');
            
            const promises = [];

            if (location.city) {
                const cityQuery = query(soulsCollection, where('userLocation.city', '==', location.city));
                promises.push(getCountFromServer(cityQuery));
            } else {
                promises.push(Promise.resolve(null));
            }

            if (location.country) {
                const countryQuery = query(soulsCollection, where('userLocation.country', '==', location.country));
                promises.push(getCountFromServer(countryQuery));
            } else {
                promises.push(Promise.resolve(null));
            }

            const [citySnapshot, countrySnapshot] = await Promise.all(promises);
            
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
    }, [fetchCounts]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Community Impact</CardTitle>
                    <CardDescription>Souls won by all users in your area.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={fetchCounts} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="sr-only">Refresh stats</span>
                </Button>
            </CardHeader>
            <CardContent className="space-y-6">
                {error && (
                    <div className="text-destructive text-sm p-3 rounded-md border border-destructive/50 bg-destructive/10 flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        <p>{error} Please try again.</p>
                    </div>
                )}
                {loading && !error ? (
                    <div className="flex items-center gap-4">
                         <div className="flex h-12 w-12 items-center justify-center rounded-lg">
                            <Loader2 className="h-6 w-6 animate-spin"/>
                        </div>
                         <div>
                            <p className="text-muted-foreground">Loading stats...</p>
                        </div>
                    </div>
                ) : !error && (
                    <>
                        {location.city && (
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                                    <Globe className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-muted-foreground">In {location.city}</p>
                                    <p className="text-2xl font-bold">{cityCount}</p>
                                </div>
                            </div>
                        )}
                        {location.country && (
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                                    <Globe className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-muted-foreground">In {location.country}</p>
                                    <p className="text-2xl font-bold">{countryCount}</p>
                                </div>
                            </div>
                        )}
                        {!location.city && !location.country && (
                            <p className="text-sm text-center text-muted-foreground py-4">
                                Add your location in your profile to see community stats.
                            </p>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const [streakUpdated, setStreakUpdated] = useState(false);
  
  const userDocRef = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (streakUpdated || profileLoading || !user || !userProfile || !firestore) return;

    const today = startOfDay(new Date());
    const lastLogin = userProfile.lastLogin?.toDate ? startOfDay(userProfile.lastLogin.toDate()) : null;

    if (lastLogin && isSameDay(today, lastLogin)) {
      setStreakUpdated(true);
      return;
    }

    let newStreak = 1;
    if (lastLogin && differenceInCalendarDays(today, lastLogin) === 1) {
        newStreak = (userProfile.currentStreak || 0) + 1;
    }
    
    const currentLongestStreak = userProfile.longestStreak || 0;
    const newLongestStreak = Math.max(currentLongestStreak, newStreak);

    const userRef = doc(firestore, 'users', user.uid);
    const updateData = {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastLogin: serverTimestamp(),
    };

    updateDoc(userRef, updateData)
      .then(() => {
        setStreakUpdated(true);
      })
      .catch(() => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: {
            currentStreak: newStreak,
            longestStreak: newLongestStreak,
          },
        });
        errorEmitter.emit('permission-error', permissionError);
        setStreakUpdated(true); // Prevent infinite loops on error
      });

  }, [profileLoading, user, userProfile, firestore, streakUpdated]);

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`));
  }, [user?.uid, firestore]);
  const { data: soulsWon, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

  const soulsWonCount = soulsWon?.length ?? 0;
  const currentStreak = userProfile?.currentStreak || 0;
  const longestStreak = userProfile?.longestStreak || 0;

  const loading = authLoading || profileLoading || soulsLoading;


  return (
    <div className="space-y-8">
        <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline">
                Welcome back, {user?.displayName || 'User'}!
            </h1>
            <p className="text-muted-foreground">Here's your ministry overview.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
                <DailyDisciplineCard />

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

            <div className="lg:col-span-1 space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Statistics</CardTitle>
                        <CardDescription>Your personal ministry impact.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <UserCheck2 className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-muted-foreground">Total Souls Won</p>
                                {loading ? <Skeleton className="h-6 w-12 mt-1" /> : <p className="text-2xl font-bold">{soulsWonCount}</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-muted-foreground">Current Streak</p>
                                {loading ? <Skeleton className="h-6 w-12 mt-1" /> : <p className="text-2xl font-bold">{currentStreak} day{currentStreak === 1 ? '' : 's'}</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Trophy className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-muted-foreground">Longest Streak</p>
                                {loading ? <Skeleton className="h-6 w-12 mt-1" /> : <p className="text-2xl font-bold">{longestStreak} day{longestStreak === 1 ? '' : 's'}</p>}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                {userProfile?.location && <GlobalSoulsCard location={userProfile.location} />}

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
    </div>
  );
}
