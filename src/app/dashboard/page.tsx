
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSameMonth, startOfDay, differenceInCalendarDays, isSameDay } from "date-fns";
import { TrendingUp, UserCheck2 } from "lucide-react";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { Soul, UserProfile } from "@/lib/types";
import { useMemo, useEffect } from "react";
import { StatDialog } from "@/components/dashboard/stat-dialog";
import { SoulsWonList } from "@/components/dashboard/dashboard-lists";


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

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`));
  }, [user?.uid, firestore]);
  const { data: soulsWon } = useCollection<Soul>(soulsQuery);

  const soulsWonThisMonth = useMemo(() => {
    if (!soulsWon) return 0;
    return soulsWon.filter(s => {
      if (!s.wonAt) return false;
      const wonDate = s.wonAt.toDate ? s.wonAt.toDate() : new Date(s.wonAt as any);
      return isSameMonth(wonDate, now);
    }).length;
  }, [soulsWon, now]);

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
      
      <div className="grid gap-4 md:grid-cols-2">
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
