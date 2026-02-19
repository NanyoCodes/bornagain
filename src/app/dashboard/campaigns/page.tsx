
"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CreateCampaignForm } from "@/components/campaigns/create-campaign-form";
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
import { CampaignCard } from "@/components/campaigns/campaign-card";
import type { Campaign, JoinedCampaign, UserProfile } from "@/lib/types";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useDoc } from "@/firebase/firestore/use-doc";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearch } from "@/context/search-context";

function CampaignSkeletons() {
  return (
    <>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="h-[250px] w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </>
  )
}

export default function CampaignsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsSearchVisible(true);
    setSearchPlaceholder("Search campaigns by title, goal, location...");
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setIsSearchVisible, setSearchPlaceholder, setSearchTerm]);

  const userDocRef = useMemo(() => user?.uid && firestore ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const campaignsQuery = useMemo(() => !userLoading && user && firestore ? query(collection(firestore, 'campaigns'), orderBy('createdAt', 'desc')) : null, [userLoading, user, firestore]);
  const { data: campaigns, loading: campaignsLoading } = useCollection<Campaign>(campaignsQuery);

  const joinedCampaignsQuery = useMemo(() => user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/joinedCampaigns`)) : null, [user, firestore]);
  const { data: joinedCampaigns, loading: joinedCampaignsLoading } = useCollection<JoinedCampaign>(joinedCampaignsQuery);
  
  const loading = userLoading || profileLoading || campaignsLoading || joinedCampaignsLoading;

  const joinedCampaignIds = useMemo(() => {
    if (!joinedCampaigns) return new Set();
    return new Set(joinedCampaigns.map(jc => jc.id));
  }, [joinedCampaigns]);

  const handleCampaignCreated = () => {
    setIsDialogOpen(false);
  };

  const safeToDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value.toDate === 'function') return value.toDate();
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    } catch (e) {}
    try {
      if (typeof value === 'object' && value.seconds) {
         const d = new Date(value.seconds * 1000);
         if(!isNaN(d.getTime())) return d;
      }
    } catch(e) {}
    return null;
  };

  const sortedAndFilteredCampaigns = useMemo(() => {
    const activeCampaigns = campaigns?.filter(c => c.status !== 'deleted');

    const filtered = activeCampaigns?.filter((campaign) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();

      const searchableFields = [
        campaign.title,
        campaign.description,
        campaign.goal,
        campaign.location,
        campaign.organizerName,
        campaign.scripture
      ];

      return searchableFields.some(field => field && field.toLowerCase().includes(term));
    });

    if (!filtered || !mounted) return filtered || [];

    const now = new Date();
    const userLocation = userProfile?.location?.toLowerCase().trim();

    const getStatus = (campaign: Campaign): number => {
      const startDate = safeToDate(campaign.startDate);
      const endDate = safeToDate(campaign.endDate);
      if (!startDate || !endDate) return 3; // Past
      
      const endDateTime = new Date(endDate);
      if (campaign.endTime && /^\d{2}:\d{2}$/.test(campaign.endTime)) {
        const [hours, minutes] = campaign.endTime.split(':').map(Number);
        endDateTime.setHours(hours, minutes, 59, 999);
      } else {
        endDateTime.setHours(23, 59, 59, 999);
      }

      if (endDateTime < now) return 3; // Past

      const startDateTime = new Date(startDate);
      if (campaign.startTime && /^\d{2}:\d{2}$/.test(campaign.startTime)) {
        const [hours, minutes] = campaign.startTime.split(':').map(Number);
        startDateTime.setHours(hours, minutes, 0, 0);
      } else {
        startDateTime.setHours(0, 0, 0, 0);
      }

      if (startDateTime > now) return 2; // Upcoming
      return 1; // Ongoing
    };

    return [...filtered].sort((a, b) => {
      const statusA = getStatus(a);
      const statusB = getStatus(b);
      if (statusA !== statusB) {
        return statusA - statusB;
      }

      if (userLocation) {
        const aLocation = a.location.toLowerCase();
        const bLocation = b.location.toLowerCase();
        const isLocalA = aLocation.includes(userLocation);
        const isLocalB = bLocation.includes(userLocation);

        if (isLocalA && !isLocalB) return -1;
        if (!isLocalA && isLocalB) return 1;
      }

      const startDateA = safeToDate(a.startDate);
      const startDateB = safeToDate(b.startDate);
      if (startDateA && startDateB) {
        return startDateA.getTime() - startDateB.getTime();
      }
      if (startDateA) return -1;
      if (startDateB) return 1;
      return 0;
    });

  }, [campaigns, searchTerm, userProfile, mounted]);

  const triggerButton = (
    <Button disabled={!user}>
      <PlusCircle className="h-4 w-4" />
      <span className="hidden md:inline">Create Campaign</span>
    </Button>
  );

  const formContent = <CreateCampaignForm onCampaignCreated={handleCampaignCreated} />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-headline">Campaigns</h1>
          <p className="text-muted-foreground">Join or create soul-winning campaigns.</p>
        </div>
        {mounted && isMobile ? (
          <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <SheetTrigger asChild>{triggerButton}</SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Create a New Campaign</SheetTitle>
                <SheetDescription>
                  Use our AI assistant to help you craft the perfect campaign to reach souls for Christ.
                </SheetDescription>
              </SheetHeader>
              <div className="max-h-[80vh] overflow-y-auto p-1 mt-4">
                {formContent}
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>{triggerButton}</DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create a New Campaign</DialogTitle>
                <DialogDescription>
                  Use our AI assistant to help you craft the perfect campaign to reach souls for Christ.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                {formContent}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading && <CampaignSkeletons />}
        {sortedAndFilteredCampaigns?.map((campaign) => (
          <CampaignCard 
            key={campaign.id} 
            campaign={campaign} 
            userId={user?.uid}
            isJoined={joinedCampaignIds.has(campaign.id)}
            allCampaigns={campaigns || []}
          />
        ))}
         {!loading && sortedAndFilteredCampaigns?.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center">No campaigns found.</p>
        )}
      </div>
    </div>
  );
}
