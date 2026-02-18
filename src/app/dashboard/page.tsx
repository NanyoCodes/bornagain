
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow, isSameMonth } from "date-fns";
import Link from "next/link";
import { ArrowUpRight, Newspaper, Target, TrendingUp, UserCheck2 } from "lucide-react";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy, limit, where } from "firebase/firestore";
import type { Testimony, Campaign, Soul, JoinedCampaign } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

function RecentTestimonies() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const testimoniesQuery = firestore ? query(collection(firestore, 'testimonies'), orderBy('createdAt', 'desc'), limit(3)) : null;
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
  const campaignsQuery = firestore ? query(collection(firestore, 'campaigns'), orderBy('createdAt', 'desc'), limit(2)) : null;
  const { data: campaigns, loading: campaignsLoading } = useCollection<Campaign>(campaignsQuery);
  const loading = campaignsLoading;

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


export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const now = useMemo(() => new Date(), []);

  const testimoniesQuery = !userLoading && user?.uid && firestore ? query(collection(firestore, 'testimonies'), where('authorId', '==', user.uid)) : null;
  const { data: myTestimonies } = useCollection<Testimony>(testimoniesQuery);

  const soulsQuery = !userLoading && user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/souls`)) : null;
  const { data: soulsWon } = useCollection<Soul>(soulsQuery);
  
  const joinedCampaignsQuery = !userLoading && user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/joinedCampaigns`)) : null;
  const { data: joinedCampaigns } = useCollection<JoinedCampaign>(joinedCampaignsQuery);

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

  // TODO: Streak needs to be implemented

  const stats = [
    { title: "Testimonies Shared", value: myTestimonies?.length ?? 0, icon: Newspaper, change: `${testimoniesThisMonth} this month` },
    { title: "Campaigns Joined", value: joinedCampaigns?.length ?? 0, icon: Target, change: `${campaignsJoinedThisMonth} this month` },
    { title: "Souls Won", value: soulsWon?.length ?? 0, icon: UserCheck2, change: `${soulsWonThisMonth} this month` },
    { title: "Current Streak", value: "0 days", icon: TrendingUp, change: "Keep going!" },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight font-headline">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.displayName || 'User'}! Here's your ministry overview.</p>
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
        <ActiveCampaigns />
      </div>

    </div>
  );
}
