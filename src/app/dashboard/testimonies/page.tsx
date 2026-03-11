
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Newspaper, HandHeart } from "lucide-react";
import { CreateTestimonyForm } from "@/components/testimonies/create-testimony-form";
import { TestimonyCard } from "@/components/testimonies/testimony-card";
import { PrayerRequestCard } from "@/components/prayer/PrayerRequestCard";
import { CreatePrayerRequestForm } from "@/components/prayer/CreatePrayerRequestForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Testimony, PrayerRequest } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { useSearch } from "@/context/search-context";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function TestimoniesPage() {
  const [isTestimonyDialogOpen, setIsTestimonyDialogOpen] = useState(false);
  const [isPrayerDialogOpen, setIsPrayerDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();
  const [activeTab, setActiveTab] = useState("testimonies");

  const firestore = useFirestore();
  const { user } = useUser();

  const testimoniesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "testimonies"), orderBy("createdAt", "desc"));
  }, [firestore, user]);

  const { data: testimonies, loading: loadingTestimonies } = useCollection<Testimony>(testimoniesQuery);

  const prayerRequestsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "prayerRequests"), orderBy("createdAt", "desc"));
  }, [firestore, user]);

  const { data: prayerRequests, loading: loadingPrayers } = useCollection<PrayerRequest>(prayerRequestsQuery);

  const loading = loadingTestimonies || loadingPrayers;

  useEffect(() => {
    setMounted(true);
    setIsSearchVisible(true);
    // Placeholder will be updated by active tab effect
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setIsSearchVisible, setSearchTerm]);

  useEffect(() => {
    if (activeTab === 'testimonies') {
      setSearchPlaceholder("Search testimonies by content, author...");
    } else {
      setSearchPlaceholder("Search prayer requests by content, category...");
    }
  }, [activeTab, setSearchPlaceholder]);


  const filteredTestimonies = useMemo(() => {
    if (!testimonies) return [];
    if (activeTab !== 'testimonies' || !searchTerm) return testimonies;
    
    const term = searchTerm.toLowerCase();
    return testimonies.filter(testimony => 
      testimony.content.toLowerCase().includes(term) ||
      `${testimony.authorFirstName} ${testimony.authorLastName}`.toLowerCase().includes(term) ||
      testimony.category.toLowerCase().includes(term)
    );
  }, [testimonies, searchTerm, activeTab]);

  const filteredPrayerRequests = useMemo(() => {
    if (!prayerRequests) return [];
    if (activeTab !== 'prayers' || !searchTerm) return prayerRequests;
    
    const term = searchTerm.toLowerCase();
    return prayerRequests.filter(req => 
      req.content.toLowerCase().includes(term) ||
      req.category.toLowerCase().includes(term)
    );
  }, [prayerRequests, searchTerm, activeTab]);


  const handleTestimonyCreated = () => setIsTestimonyDialogOpen(false);
  const handlePrayerRequestCreated = () => setIsPrayerDialogOpen(false);
  
  const testimonyTrigger = (
    <Button>
      <PlusCircle className="h-4 w-4" />
      <span className="hidden md:inline">Share Testimony</span>
    </Button>
  );

  const prayerTrigger = (
    <Button>
      <PlusCircle className="h-4 w-4" />
      <span className="hidden md:inline">Share Prayer Request</span>
    </Button>
  );

  const testimonyFormContent = <CreateTestimonyForm onTestimonyCreated={handleTestimonyCreated} />;
  const prayerFormContent = <CreatePrayerRequestForm onPrayerRequestCreated={handlePrayerRequestCreated} />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline">
            Testimonies &amp; Prayer Requests
          </h1>
          <p className="text-muted-foreground">
            Read testimonies of what God has done and pray for others' needs.
          </p>
        </div>
        {activeTab === 'testimonies' ? (
          mounted && isMobile ? (
            <Sheet open={isTestimonyDialogOpen} onOpenChange={setIsTestimonyDialogOpen}>
              <SheetTrigger asChild>{testimonyTrigger}</SheetTrigger>
              <SheetContent side="bottom"><SheetHeader><SheetTitle>Share Your Testimony</SheetTitle><DialogDescription>Encourage others by sharing what God has done in your life.</DialogDescription></SheetHeader><div className="max-h-[80vh] overflow-y-auto p-1 mt-4">{testimonyFormContent}</div></SheetContent>
            </Sheet>
          ) : (
            <Dialog open={isTestimonyDialogOpen} onOpenChange={setIsTestimonyDialogOpen}>
              <DialogTrigger asChild>{testimonyTrigger}</DialogTrigger>
              <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Share Your Testimony</DialogTitle><DialogDescription>Encourage others by sharing what God has done in your life.</DialogDescription></DialogHeader><div className="max-h-[70vh] overflow-y-auto pr-2">{testimonyFormContent}</div></DialogContent>
            </Dialog>
          )
        ) : (
           mounted && isMobile ? (
            <Sheet open={isPrayerDialogOpen} onOpenChange={setIsPrayerDialogOpen}>
              <SheetTrigger asChild>{prayerTrigger}</SheetTrigger>
              <SheetContent side="bottom"><SheetHeader><SheetTitle>Share Prayer Request</SheetTitle><DialogDescription>Share your request anonymously with the community.</DialogDescription></SheetHeader><div className="max-h-[80vh] overflow-y-auto p-1 mt-4">{prayerFormContent}</div></SheetContent>
            </Sheet>
          ) : (
            <Dialog open={isPrayerDialogOpen} onOpenChange={setIsPrayerDialogOpen}>
              <DialogTrigger asChild>{prayerTrigger}</DialogTrigger>
              <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Share Prayer Request</DialogTitle><DialogDescription>Share your request anonymously with the community.</DialogDescription></DialogHeader><div className="max-h-[70vh] overflow-y-auto pr-2">{prayerFormContent}</div></DialogContent>
            </Dialog>
          )
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="testimonies">Testimonies</TabsTrigger>
              <TabsTrigger value="prayers">Prayer Requests</TabsTrigger>
          </TabsList>
          <TabsContent value="testimonies" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading && (
                  [...Array(3)].map((_, i) => (
                    <Card key={i}><CardHeader><div className="flex items-center gap-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="w-full space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/5" /></div></div></CardHeader><CardContent className="space-y-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></CardContent><CardFooter><Skeleton className="h-8 w-24 ml-auto" /></CardFooter></Card>
                  ))
                )}
                {!loading && filteredTestimonies?.map((testimony) => (
                  <TestimonyCard key={testimony.id} testimony={testimony} />
                ))}
                 {!loading && filteredTestimonies?.length === 0 && (
                  <div className="col-span-full text-center py-12 flex flex-col items-center">
                    <Newspaper className="h-16 w-16 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">No Testimonies Yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Be the first to share your story and encourage the body of Christ!
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
                  <PrayerRequestCard key={req.id} prayerRequest={req} />
                ))}
                {!loading && filteredPrayerRequests?.length === 0 && (
                  <div className="col-span-full text-center py-12 flex flex-col items-center">
                    <HandHeart className="h-16 w-16 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">No Prayer Requests</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                       Be the first to share a prayer need with the community.
                    </p>
                  </div>
                )}
              </div>
          </TabsContent>
      </Tabs>
    </div>
  );
}

    