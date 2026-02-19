
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow, isSameMonth, startOfDay, differenceInCalendarDays } from "date-fns";
import Link from "next/link";
import { ArrowUpRight, Newspaper, Target, TrendingUp, UserCheck2, Megaphone } from "lucide-react";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, where, doc, updateDoc, serverTimestamp, documentId } from "firebase/firestore";
import type { Testimony, Campaign, Soul, JoinedCampaign, UserProfile } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useEffect } from "react";

function RecentTestimonies() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const testimoniesQuery = useMemo(() => !userLoading && user && firestore ? query(collection(firestore, 'testimonies'), orderBy('createdAt', 'desc'), limit(3)) : null, [userLoading, user, firestore]);
  const { data: testimonies, loading: testimoniesLoading } = useCollection<Testimony>(testimoniesQuery);
  const loading = userLoading || testimoniesLoading;

  return (
    <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center">
          <div className="grid gap-2">
            <CardTitle>Recent Testimonies</CardTitle>
          </div>
          <Button asChild size="sm" className="ml-auto gap-1">
            <Link href="/dashboard/testimonies">
              View All
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
           {loading && (
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
           {!loading && testimonies?.map(testimony => (
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
  const { user, loading: userLoading } = useUser();
  const campaignsQuery = useMemo(() => !userLoading && user && firestore ? query(collection(firestore, 'campaigns'), orderBy('createdAt', 'desc'), limit(2)) : null, [userLoading, user, firestore]);
  const { data: campaigns, loading: campaignsLoading } = useCollection<Campaign>(campaignsQuery);
  const loading = userLoading || campaignsLoading;

  return (
    <Card>
        <CardHeader className="flex flex-row items-center">
            <CardTitle>Active Campaigns</CardTitle>
            <Button asChild size="sm" className="ml-auto gap-1">
            <Link href="/dashboard/campaigns">
              View All
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
            {loading && (
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
            {!loading && campaigns?.map(campaign => (
              <div key={campaign.id} className="flex items-center gap-4">
                <div className="grid gap-1">
                  <p className="text-sm font-medium">{campaign.title}</p>
                  <p className="text-sm text-muted-foreground">{campaign.location}</p>
                </div>
                <div className="ml-auto font-medium">{campaign.participants} joined</div>
              </div>
            ))}
        </CardContent>
    </Card>
  )
}

function MyCampaigns() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();

  const organizedQuery = useMemo(() => 
    !userLoading && user?.uid && firestore 
    ? query(collection(firestore, 'campaigns'), where('organizerId', '==', user.uid), orderBy('createdAt', 'desc'), limit(3)) 
    : null, 
  [user, userLoading, firestore]);
  const { data: organizedCampaigns, loading: organizedLoading } = useCollection<Campaign>(organizedQuery);

  const joinedIdsQuery = useMemo(() => 
    !userLoading && user?.uid && firestore 
    ? query(collection(firestore, `users/${user.uid}/joinedCampaigns`), orderBy('joinedAt', 'desc'), limit(3)) 
    : null,
  [user, userLoading, firestore]);
  const { data: joinedCampaignsDocs, loading: joinedIdsLoading } = useCollection<JoinedCampaign>(joinedIdsQuery);

  const joinedCampaignIds = useMemo(() => joinedCampaignsDocs?.map(j => j.id) ?? [], [joinedCampaignsDocs]);

  const joinedQuery = useMemo(() => {
    if (!firestore || joinedCampaignIds.length === 0) return null;
    
    const organizedIds = new Set(organizedCampaigns?.map(c => c.id));
    const idsToFetch = joinedCampaignIds.filter(id => !organizedIds.has(id));
    
    if (idsToFetch.length === 0) return null;

    return query(collection(firestore, 'campaigns'), where(documentId(), 'in', idsToFetch));
  }, [firestore, joinedCampaignIds, organizedCampaigns]);
  const { data: joinedCampaigns, loading: joinedLoading } = useCollection<Campaign>(joinedQuery);

  const myCampaigns = useMemo(() => {
    const combined = new Map<string, Campaign>();
    (organizedCampaigns || []).forEach(c => combined.set(c.id, c));
    (joinedCampaigns || []).forEach(c => combined.set(c.id, c));
    
    return Array.from(combined.values())
      .sort((a, b) => {
          const dateA = a.createdAt?.seconds ?? 0;
          const dateB = b.createdAt?.seconds ?? 0;
          return dateB - dateA;
      })
      .slice(0, 3);
  }, [organizedCampaigns, joinedCampaigns]);

  const loading = userLoading || organizedLoading || joinedIdsLoading || (joinedCampaignIds.length > 0 && !!joinedQuery && joinedLoading);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <div className="grid gap-2">
            <CardTitle>My Campaigns</CardTitle>
            <CardDescription>Campaigns you've created or joined.</CardDescription>
        </div>
        <Button asChild size="sm" className="ml-auto gap-1">
          <Link href="/dashboard/campaigns">
            View All
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
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
        {!loading && myCampaigns.map(campaign => (
          <div key={campaign.id} className="flex items-center gap-4">
            <div className="grid gap-1">
              <p className="text-sm font-medium">{campaign.title}</p>
              <p className="text-sm text-muted-foreground">{campaign.location}</p>
            </div>
            <div className="ml-auto font-medium">{campaign.participants} joined</div>
          </div>
        ))}
        {!loading && (!myCampaigns || myCampaigns.length === 0) && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">You haven't created or joined any campaigns yet.</p>
            <Button variant="link" asChild><Link href="/dashboard/campaigns">Find One</Link></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const now = useMemo(() => new Date(), []);
  
  const userDocRef = useMemo(() => !userLoading && user?.uid && firestore ? doc(firestore, 'users', user.uid) : null, [userLoading, user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (profileLoading || !user || !userProfile || !firestore) {
      return;
    }

    const today = startOfDay(new Date());
    const lastLogin = userProfile.lastLogin?.toDate ? startOfDay(userProfile.lastLogin.toDate()) : null;

    if (lastLogin && differenceInCalendarDays(today, lastLogin) === 0) {
        return;
    }

    let newStreak = 1;
    if (lastLogin && differenceInCalendarDays(today, lastLogin) === 1) {
        newStreak = (userProfile.currentStreak || 0) + 1;
    }
    
    const userRef = doc(firestore, 'users', user.uid);
    updateDoc(userRef, {
        currentStreak: newStreak,
        lastLogin: serverTimestamp(),
    }).catch(error => {
        console.error("Failed to update streak:", error);
    });

  }, [profileLoading, user, userProfile, firestore]);

  const testimoniesQuery = useMemo(() => !userLoading && user?.uid && firestore ? query(collection(firestore, 'testimonies'), where('authorId', '==', user.uid)) : null, [userLoading, user, firestore]);
  const { data: myTestimonies } = useCollection<Testimony>(testimoniesQuery);

  const soulsQuery = useMemo(() => !userLoading && user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/souls`)) : null, [userLoading, user, firestore]);
  const { data: soulsWon } = useCollection<Soul>(soulsQuery);
  
  const joinedCampaignsQuery = useMemo(() => !userLoading && user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/joinedCampaigns`)) : null, [userLoading, user, firestore]);
  const { data: joinedCampaigns } = useCollection<JoinedCampaign>(joinedCampaignsQuery);
  
  const allMyCampaignsQuery = useMemo(() => !userLoading && user?.uid && firestore ? query(collection(firestore, 'campaigns'), where('organizerId', '==', user.uid)) : null, [userLoading, user, firestore]);
  const { data: allMyCampaigns } = useCollection<Campaign>(allMyCampaignsQuery);


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

  const campaignsJoinedThisMonth = useMemo(() => {
    if (!joinedCampaigns) return 0;
    return joinedCampaigns.filter(c => {
      if (!c.joinedAt) return false;
      const joinedDate = c.joinedAt.toDate ? c.joinedAt.toDate() : new Date(c.joinedAt as any);
      return isSameMonth(joinedDate, now)
    }).length;
  }, [joinedCampaigns, now]);

   const campaignsCreatedThisMonth = useMemo(() => {
    if (!allMyCampaigns) return 0;
    return allMyCampaigns.filter(c => {
      if (!c.createdAt) return false;
      const createdDate = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt as any);
      return isSameMonth(createdDate, now);
    }).length;
  }, [allMyCampaigns, now]);


  const currentStreak = userProfile?.currentStreak || 0;

  const stats = [
    { title: "Testimonies Shared", value: myTestimonies?.length ?? 0, icon: Newspaper, change: `${testimoniesThisMonth} this month` },
    { title: "Campaigns Created", value: allMyCampaigns?.length ?? 0, icon: Megaphone, change: `${campaignsCreatedThisMonth} this month` },
    { title: "Souls Won", value: soulsWon?.length ?? 0, icon: UserCheck2, change: `${soulsWonThisMonth} this month` },
    { title: "Current Streak", value: `${currentStreak} day${currentStreak === 1 ? '' : 's'}`, icon: TrendingUp, change: "Keep going!" },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight font-headline">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.displayName || 'User'}! Here's your ministry overview.</p>
        <blockquote className="border-l-2 pl-6 italic text-muted-foreground pt-2">
          "And they overcame him by the blood of the Lamb, and by the word of their testimony; and they loved not their lives unto the death." - Revelation 12:11
        </blockquote>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
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
