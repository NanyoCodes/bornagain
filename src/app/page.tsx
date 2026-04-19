
'use client';

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusCircle, Newspaper, HandHeart, Loader2 } from "lucide-react";
import { TestimonyCard } from "@/components/testimonies/testimony-card";
import { PrayerRequestCard } from "@/components/prayer/PrayerRequestCard";
import type { Testimony, PrayerRequest, UserProfile } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PublicHeader } from "@/components/common/public-header";

// This is the new landing page
export default function PublicLandingPage() {
  const [activeTab, setActiveTab] = useState("testimonies");
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemo(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const [searchTerm, setSearchTerm] = useState('');
  
  const testimoniesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "testimonies"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data: testimonies, loading: loadingTestimonies } = useCollection<Testimony>(testimoniesQuery);

  const prayerRequestsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "prayerRequests"), orderBy("createdAt", "desc"));
  }, [firestore]);
  const { data: prayerRequests, loading: loadingPrayers } = useCollection<PrayerRequest>(prayerRequestsQuery);

  const loading = loadingTestimonies || loadingPrayers || userLoading || profileLoading;

  const handleAuthAction = () => {
    if (user) {
      router.push('/dashboard/testimonies');
    } else {
      router.push('/login');
    }
  };
  
  const filteredTestimonies = useMemo(() => {
    if (!testimonies) return [];
    if (!searchTerm) return testimonies;
    const term = searchTerm.toLowerCase();
    return testimonies.filter(testimony => 
      testimony.content.toLowerCase().includes(term) ||
      `${testimony.authorFirstName} ${testimony.authorLastName}`.toLowerCase().includes(term) ||
      testimony.category.toLowerCase().includes(term)
    );
  }, [testimonies, searchTerm]);

  const filteredPrayerRequests = useMemo(() => {
    if (!prayerRequests) return [];
    if (!searchTerm) return prayerRequests;
    const term = searchTerm.toLowerCase();
    return prayerRequests.filter(req => 
      req.content.toLowerCase().includes(term) ||
      req.category.toLowerCase().includes(term)
    );
  }, [prayerRequests, searchTerm]);

  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow container mx-auto py-8 px-4 md:px-6">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-headline">
                Testimonies &amp; Prayer Requests
              </h1>
              <p className="text-sm text-muted-foreground">
                Read testimonies of what God has done and pray for others' needs.
              </p>
            </div>
            <Button onClick={handleAuthAction}>
              <PlusCircle className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">{activeTab === 'testimonies' ? 'Share Testimony' : 'Share Prayer Request'}</span>
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <TabsList className="grid w-full sm:w-auto grid-cols-2">
                    <TabsTrigger value="testimonies">Testimonies</TabsTrigger>
                    <TabsTrigger value="prayers">Prayer Requests</TabsTrigger>
                </TabsList>
                <div className="w-full sm:flex-1">
                    <Input
                        placeholder={activeTab === 'testimonies' ? "Search testimonies..." : "Search prayer requests..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <TabsContent value="testimonies" className="mt-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {loading && (
                      [...Array(3)].map((_, i) => (
                        <Card key={i}><CardHeader><div className="flex items-center gap-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="w-full space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/5" /></div></div></CardHeader><CardContent className="space-y-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></CardContent><CardFooter><Skeleton className="h-8 w-24 ml-auto" /></CardFooter></Card>
                      ))
                    )}
                    {!loading && filteredTestimonies.map((testimony) => {
                        return (
                            <TestimonyCard 
                                key={testimony.id} 
                                testimony={testimony} 
                                distance={null}
                                onDelete={() => { /* no-op */ }} 
                                onEdit={() => { /* no-op */ }}
                            />
                        );
                    })}
                     {!loading && filteredTestimonies?.length === 0 && (
                      <div className="col-span-full text-center py-12 flex flex-col items-center">
                        <Newspaper className="h-16 w-16 text-muted-foreground" />
                        <h3 className="mt-4 text-xl font-semibold">No Testimonies Yet</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Log in to be the first to share your story!
                        </p>
                      </div>
                    )}
                </div>
            </TabsContent>
            <TabsContent value="prayers" className="mt-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {loading && (
                      [...Array(3)].map((_, i) => (
                        <Card key={i}><CardHeader><div className="flex items-center gap-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="w-full space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/5" /></div></div></CardHeader><CardContent className="space-y-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></CardContent><CardFooter><Skeleton className="h-8 w-24 ml-auto" /></CardFooter></Card>
                      ))
                    )}
                    {!loading && filteredPrayerRequests?.map((req) => (
                      <PrayerRequestCard 
                        key={req.id} 
                        prayerRequest={req}
                        onDelete={() => { /* no-op */ }}
                      />
                    ))}
                    {!loading && filteredPrayerRequests?.length === 0 && (
                      <div className="col-span-full text-center py-12 flex flex-col items-center">
                        <HandHeart className="h-16 w-16 text-muted-foreground" />
                        <h3 className="mt-4 text-xl font-semibold">No Prayer Requests</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                           Log in to share a prayer need with the community.
                        </p>
                      </div>
                    )}
                </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
