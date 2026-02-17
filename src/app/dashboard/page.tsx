"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockCampaigns, mockSoulsWon } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ArrowUpRight, Newspaper, Target, TrendingUp, UserCheck2 } from "lucide-react";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import type { Testimony } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

function RecentTestimonies() {
  const firestore = useFirestore();
  const testimoniesQuery = query(collection(firestore, 'testimonies'), orderBy('createdAt', 'desc'), limit(3));
  const { data: testimonies, loading } = useCollection<Testimony>(testimoniesQuery);

  return (
    <Card className="col-span-12 lg:col-span-4">
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
           {testimonies?.map(testimony => (
             <div key={testimony.id} className="flex items-start gap-4">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={testimony.authorAvatarUrl} alt="Avatar" />
                  <AvatarFallback>{testimony.authorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                  <p className="text-sm font-medium leading-none">{testimony.authorName}</p>
                  <p className="text-sm text-muted-foreground truncate">{testimony.title}</p>
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


export default function DashboardPage() {
  const stats = [
    { title: "Testimonies Shared", value: "12", icon: Newspaper, change: "+2 this month" },
    { title: "Campaigns Joined", value: "5", icon: Target, change: "+1 this month" },
    { title: "Souls Won", value: mockSoulsWon.length, icon: UserCheck2, change: "+8 this month" },
    { title: "Current Streak", value: "7 days", icon: TrendingUp, change: "Keep going!" },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your ministry overview.</p>
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <RecentTestimonies />
        <Card className="col-span-12 lg:col-span-3">
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
                {mockCampaigns.slice(0, 2).map(campaign => (
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
      </div>

    </div>
  );
}
