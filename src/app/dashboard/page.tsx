"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSameMonth, startOfDay, differenceInCalendarDays, isSameDay } from "date-fns";
import { Newspaper, Target, TrendingUp, UserCheck2, Megaphone } from "lucide-react";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, where, doc, updateDoc, serverTimestamp, documentId, getDocs } from "firebase/firestore";
import type { Testimony, Campaign, Soul, JoinedCampaign, UserProfile } from "@/lib/types";
import { useMemo, useEffect, useState } from "react";
import { StatDialog } from "@/components/dashboard/stat-dialog";
import { JoinedCampaignsList, TestimoniesList, CampaignsCreatedList, SoulsWonList } from "@/components/dashboard/dashboard-lists";


export default function DashboardPage() {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const now = useMemo(() => new Date(), []);
  
  const userDocRef = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);
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

  }, [profileLoading, user?.uid, userProfile, firestore, user]);

  const testimoniesQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'testimonies'), where('authorId', '==', user.uid));
  }, [user?.uid, firestore]);
  const { data: myTestimonies } = useCollection<Testimony>(testimoniesQuery);

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`));
  }, [user?.uid, firestore]);
  const { data: soulsWon } = useCollection<Soul>(soulsQuery);
  
  const allMyCampaignsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'campaigns'), where('organizerId', '==', user.uid));
  }, [user?.uid, firestore]);
  const { data: allMyCampaigns } = useCollection<Campaign>(allMyCampaignsQuery);

  const activeMyCampaigns = useMemo(() => {
    return (allMyCampaigns || []).filter(c => c.status !== 'deleted');
  }, [allMyCampaigns]);

  const myCreatedCampaignIds = useMemo(() => new Set(allMyCampaigns?.map(c => c.id)), [allMyCampaigns]);

  const joinedCampaignsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/joinedCampaigns`));
  }, [user?.uid, firestore]);
  const { data: joinedCampaignsDocs } = useCollection<JoinedCampaign>(joinedCampaignsQuery);

  const joinedCampaignsIds = useMemo(() => joinedCampaignsDocs?.map(c => c.id), [joinedCampaignsDocs]);

  const [joinedCampaignsFull, setJoinedCampaignsFull] = useState<Campaign[] | null>(null);
  const [joinedCampaignsFullLoading, setJoinedCampaignsFullLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !joinedCampaignsIds) {
      setJoinedCampaignsFullLoading(false);
      return;
    }
    if (joinedCampaignsIds.length === 0) {
      setJoinedCampaignsFull([]);
      setJoinedCampaignsFullLoading(false);
      return;
    }

    const fetchJoinedCampaigns = async () => {
      setJoinedCampaignsFullLoading(true);
      try {
        const chunks = [];
        for (let i = 0; i < joinedCampaignsIds.length; i += 30) {
          chunks.push(joinedCampaignsIds.slice(i, i + 30));
        }

        const campaignPromises = chunks.map(chunk => {
          if (chunk.length === 0) return Promise.resolve(null);
          const q = query(collection(firestore, 'campaigns'), where(documentId(), 'in', chunk));
          return getDocs(q);
        });

        const campaignSnapshots = await Promise.all(campaignPromises);
        const campaigns: Campaign[] = [];
        campaignSnapshots.forEach(snapshot => {
          if (snapshot) {
            snapshot.docs.forEach(doc => {
              campaigns.push({ id: doc.id, ...doc.data() } as Campaign);
            });
          }
        });
        setJoinedCampaignsFull(campaigns);
      } catch (e) {
        console.error("Error fetching joined campaigns in chunks:", e);
        setJoinedCampaignsFull(null);
      } finally {
        setJoinedCampaignsFullLoading(false);
      }
    };

    fetchJoinedCampaigns();
  }, [firestore, joinedCampaignsIds]);


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
    </div>
  );
}
