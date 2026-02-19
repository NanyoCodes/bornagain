
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow, isSameMonth, startOfDay, differenceInCalendarDays, isSameDay } from "date-fns";
import Link from "next/link";
import { ArrowRight, Newspaper, Target, TrendingUp, UserCheck2, Megaphone, CheckSquare } from "lucide-react";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, where, doc, updateDoc, serverTimestamp, documentId } from "firebase/firestore";
import type { Testimony, Campaign, Soul, JoinedCampaign, UserProfile } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useEffect } from "react";
import { StatDialog } from "@/components/dashboard/stat-dialog";
import { JoinedCampaignsList, TestimoniesList, CampaignsCreatedList, SoulsWonList } from "@/components/dashboard/dashboard-lists";

function RecentTestimonies() {
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const testimoniesQuery = useMemo(() => {
    if (authLoading || !user || !firestore) return null;
    return query(collection(firestore, 'testimonies'), orderBy('createdAt', 'desc'), limit(3));
  }, [authLoading, user, firestore]);
  const { data: testimonies, loading } = useCollection<Testimony>(testimoniesQuery);

  return (
    <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center">
          <div className="grid gap-2">
            <CardTitle>Recent Testimonies</CardTitle>
          </div>
          <Button asChild size="sm" className="ml-auto gap-1">
            <Link href="/dashboard/testimonies">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
           {(loading || authLoading) && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="grid gap-1 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
           )}
           {!loading && !authLoading && testimonies?.map(testimony => (
             <div key={testimony.id} className="flex items-start gap-4">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={testimony.authorAvatarUrl ?? undefined} alt="Avatar" />
                  <AvatarFallback>{testimony.authorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                  <p className="text-sm font-medium leading-none">{testimony.authorName}</p>
                  <p className="text-sm text-muted-foreground truncate">{testimony.content.substring(0, 40)}</p>
                </div>
                <div className="ml-auto text-sm text-muted-foreground">
                  {testimony.createdAt ? formatDistanceToNow(new Date(testimony.createdAt.seconds * 1000), { addSuffix: true }) : 'just now'}
                </div>
             </div>
           ))}
        </CardContent>
    </Card>
  );
}

function ActiveCampaigns() {
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const campaignsQuery = useMemo(() => {
    if (authLoading || !user || !firestore) return null;
    return query(collection(firestore, 'campaigns'), orderBy('createdAt', 'desc'), limit(5));
  }, [authLoading, user, firestore]);
  const { data: recentCampaigns, loading } = useCollection<Campaign>(campaignsQuery);

  const campaigns = useMemo(() => {
    if (!recentCampaigns) return [];
    return recentCampaigns.filter(c => c.status !== 'deleted').slice(0, 2);
  }, [recentCampaigns]);

  return (
    <Card>
        <CardHeader className="flex flex-row items-center">
            <CardTitle>Active Campaigns</CardTitle>
            <Button asChild size="sm" className="ml-auto gap-1">
            <Link href="/dashboard/campaigns">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
            {(loading || authLoading) && (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="grid gap-1 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            )}
            {!loading && !authLoading && campaigns.map(campaign => (
              <div key={campaign.id} className="flex items-center gap-4">
                <div className="grid gap-1">
                  <p className="text-sm font-medium">{campaign.title}</p>
                  <p className="text-sm text-muted-foreground">{campaign.location}</p>
                </div>
                <div className="ml-auto font-medium">{campaign.participants} joined</div>
              </div>
            ))}
            {!loading && !authLoading && campaigns.length === 0 && (
                <div className="text-center text-muted-foreground py-4 text-sm">
                    No active campaigns found.
                </div>
            )}
        </CardContent>
    </Card>
  )
}

function MyCampaigns() {
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();

  const organizedQuery = useMemo(() => {
    if (authLoading || !user?.uid || !firestore) return null;
    return query(collection(firestore, 'campaigns'), where('organizerId', '==', user.uid), orderBy('createdAt', 'desc'), limit(3));
  }, [authLoading, user?.uid, firestore]);
  const { data: organizedCampaigns, loading } = useCollection<Campaign>(organizedQuery);

  const myCampaigns = useMemo(() => {
    return (organizedCampaigns || [])
      .filter(c => c.status !== 'deleted')
      .slice(0, 3);
  }, [organizedCampaigns]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <div className="grid gap-2">
            <CardTitle>My Campaigns</CardTitle>
            <CardDescription>Campaigns you've created as an organizer.</CardDescription>
        </div>
        <Button asChild size="sm" className="ml-auto gap-1">
          <Link href="/dashboard/campaigns">
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {(loading || authLoading) && (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="grid gap-1 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        )}
        {!loading && !authLoading && myCampaigns.map(campaign => (
          <div key={campaign.id} className="flex items-center gap-4">
            <div className="grid gap-1">
              <p className="text-sm font-medium">{campaign.title}</p>
              <p className="text-sm text-muted-foreground">{campaign.location}</p>
            </div>
            <div className="ml-auto font-medium">{campaign.participants} joined</div>
          </div>
        ))}
        {!loading && !authLoading && (!myCampaigns || myCampaigns.length === 0) && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">You haven't created any campaigns yet.</p>
            <Button variant="link" asChild><Link href="/dashboard/campaigns">Create One</Link></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export default function DashboardPage() {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const now = useMemo(() => new Date(), []);
  
  const userDocRef = useMemo(() => {
    if (authLoading || !user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [authLoading, user?.uid, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (profileLoading || !user || !userProfile || !firestore) {
      return;
    }

    const today = startOfDay(new Date());
    const lastLogin = userProfile.lastLogin?.toDate ? startOfDay(userProfile.lastLogin.toDate()) : null;

    if (lastLogin && isSameDay(today, lastLogin)) {
        return;
    }

    let newStreak = 1;
    if (lastLogin && differenceInCalendarDays(today, lastLogin) === 1) {
        newStreak = (userProfile.currentStreak || 0) + 1;
    }
    
    const currentLongestStreak = userProfile.longestStreak || 0;
    const newLongestStreak = Math.max(currentLongestStreak, newStreak);

    const userRef = doc(firestore, 'users', user.uid);
    updateDoc(userRef, {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastLogin: serverTimestamp(),
    }).catch(error => {
        console.error("Failed to update streak:", error);
    });

  }, [profileLoading, user, userProfile, firestore]);

  const testimoniesQuery = useMemo(() => {
    if (authLoading || !user?.uid || !firestore) return null;
    return query(collection(firestore, 'testimonies'), where('authorId', '==', user.uid));
  }, [authLoading, user?.uid, firestore]);
  const { data: myTestimonies } = useCollection<Testimony>(testimoniesQuery);

  const soulsQuery = useMemo(() => {
    if (authLoading || !user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`));
  }, [authLoading, user?.uid, firestore]);
  const { data: soulsWon } = useCollection<Soul>(soulsQuery);
  
  const allMyCampaignsQuery = useMemo(() => {
    if (authLoading || !user?.uid || !firestore) return null;
    return query(collection(firestore, 'campaigns'), where('organizerId', '==', user.uid));
  }, [authLoading, user?.uid, firestore]);
  const { data: allMyCampaigns } = useCollection<Campaign>(allMyCampaignsQuery);

  const activeMyCampaigns = useMemo(() => {
    if (!allMyCampaigns) return [];
    return allMyCampaigns.filter(c => c.status !== 'deleted');
  }, [allMyCampaigns]);

  const myCreatedCampaignIds = useMemo(() => new Set(allMyCampaigns?.map(c => c.id)), [allMyCampaigns]);

  const joinedCampaignsQuery = useMemo(() => {
    if (authLoading || !user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/joinedCampaigns`));
  }, [authLoading, user?.uid, firestore]);
  const { data: joinedCampaignsDocs, loading: joinedLoading } = useCollection<JoinedCampaign>(joinedCampaignsQuery);

  const joinedCampaignsIds = useMemo(() => joinedCampaignsDocs?.map(c => c.id), [joinedCampaignsDocs]);

  const joinedCampaignsFullQuery = useMemo(() => {
    if (authLoading || !user || !firestore || !joinedCampaignsIds || joinedCampaignsIds.length === 0) return null;
    return query(collection(firestore, 'campaigns'), where(documentId(), 'in', joinedCampaignsIds));
  }, [authLoading, user, firestore, joinedCampaignsIds]);
  const { data: joinedCampaignsFull, loading: joinedFullLoading } = useCollection<Campaign>(joinedCampaignsFullQuery);


  const campaignsJoinedThisMonth = useMemo(() => {
    if (!joinedCampaignsFull) return 0;
    
    return joinedCampaignsFull.filter(c => {
      if (!c.createdAt || myCreatedCampaignIds.has(c.id) || c.status === 'deleted') return false;
      const createdDate = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt as any);
      return isSameMonth(createdDate, now);
    }).length;
  }, [joinedCampaignsFull, myCreatedCampaignIds, now]);
  
  const campaignsJoinedCount = useMemo(() => {
    if (!joinedCampaignsFull) return 0;
    return joinedCampaignsFull.filter(c => c.status !== 'deleted' && !myCreatedCampaignIds.has(c.id)).length;
  }, [joinedCampaignsFull, myCreatedCampaignIds]);


  const campaignsCreatedThisMonth = useMemo(() => {
    if (!activeMyCampaigns) return 0;
    return activeMyCampaigns.filter(c => {
      if (!c.createdAt) return false;
      const createdDate = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt as any);
      return isSameMonth(createdDate, now);
    }).length;
  }, [activeMyCampaigns, now]);

  const testimoniesThisMonth = useMemo(() => {
    if (!myTestimonies) return 0;
    return myTestimonies.filter(t => {
      if (!t.createdAt) return false;
      const createdAtDate = t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.createdAt as any);
      return isSameMonth(createdAtDate, now);
    }).length;
  }, [myTestimonies, now]);

  const soulsWonThisMonth = useMemo(() => {
    if (!soulsWon) return 0;
    return soulsWon.filter(s => {
      if (!s.wonAt) return false;
      const wonDate = s.wonAt.toDate ? s.wonAt.toDate() : new Date(s.wonAt as any);
      return isSameMonth(wonDate, now);
    }).length;
  }, [soulsWon, now]);

  const campaignsCreatedCount = activeMyCampaigns.length;
  const testimoniesCount = myTestimonies?.length ?? 0;
  const soulsWonCount = soulsWon?.length ?? 0;
  const currentStreak = userProfile?.currentStreak || 0;


  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight font-headline">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.displayName || 'User'}! Here's your ministry overview.</p>
        <blockquote className="border-l-2 pl-6 italic text-muted-foreground pt-2">
          "And they overcame him by the blood of the Lamb, and by the word of their testimony; and they loved not their lives unto the death." - Revelation 12:11
        </blockquote>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatDialog
            title="Testimonies Shared"
            value={testimoniesCount}
            change={`${testimoniesThisMonth} this month`}
            icon={Newspaper}
            dialogTitle="My Testimonies"
            dialogDescription="A list of all the testimonies you have shared."
        >
            {user && <TestimoniesList userId={user.uid} />}
        </StatDialog>

        <StatDialog
            title="Campaigns Created"
            value={campaignsCreatedCount}
            change={`${campaignsCreatedThisMonth} this month`}
            icon={Megaphone}
            dialogTitle="My Created Campaigns"
            dialogDescription="A list of all the campaigns you have organized."
        >
            {user && <CampaignsCreatedList userId={user.uid} />}
        </StatDialog>
        
        <StatDialog
            title="Campaigns Joined"
            value={campaignsJoinedCount}
            change={`${campaignsJoinedThisMonth} this month`}
            icon={Target}
            dialogTitle="My Joined Campaigns"
            dialogDescription="A list of all the campaigns you have joined."
        >
            {user && <JoinedCampaignsList userId={user.uid} />}
        </StatDialog>

        <StatDialog
            title="Souls Won"
            value={soulsWonCount}
            change={`${soulsWonThisMonth} this month`}
            icon={UserCheck2}
            dialogTitle="My Souls Won"
            dialogDescription="A list of all the souls you have won for Christ."
        >
            {user && <SoulsWonList userId={user.uid} />}
        </StatDialog>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{`${currentStreak} day${currentStreak === 1 ? '' : 's'}`}</div>
                <p className="text-xs text-muted-foreground">Keep going!</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RecentTestimonies />
        <div className="space-y-6 lg:col-span-1">
          <ActiveCampaigns />
          <MyCampaigns />
        </div>
      </div>

    </div>
  );
}
