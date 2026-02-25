
"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Target } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const { user } = useUser();
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();
  const [now, setNow] = useState(new Date());
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setMounted(true);
    // Update the 'now' state every minute to re-evaluate campaign statuses
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsSearchVisible(true);
    setSearchPlaceholder("Search campaigns by title, goal, location...");
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setIsSearchVisible, setSearchPlaceholder, setSearchTerm]);

  const userDocRef = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const campaignsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'campaigns'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);
  const { data: campaigns, loading: campaignsLoading } = useCollection<Campaign>(campaignsQuery);

  const joinedCampaignsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/joinedCampaigns`));
  }, [user?.uid, firestore]);
  const { data: joinedCampaigns, loading: joinedCampaignsLoading } = useCollection<JoinedCampaign>(joinedCampaignsQuery);
  
  const loading = profileLoading || campaignsLoading || joinedCampaignsLoading;

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

    const tabFilteredCampaigns = activeCampaigns?.filter(c => {
        if (!user?.uid) return true;
        if (filter === 'created') return c.organizerId === user.uid;
        if (filter === 'joined') return joinedCampaignIds.has(c.id) && c.organizerId !== user.uid;
        return true; // 'all'
    });

    const filtered = tabFilteredCampaigns?.filter((campaign) => {
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

  }, [campaigns, searchTerm, userProfile, mounted, now, filter, user?.uid, joinedCampaignIds]);

  const triggerButton = (
    <Button disabled={!user}>
      <PlusCircle className="h-4 w-4" />
      <span className="hidden md:inline">Create Campaign</span>
    </Button>
  );

  const formContent = <CreateCampaignForm onCampaignCreated={handleCampaignCreated} />;

  let noResultsMessage = "No campaigns found.";
    if (filter === 'created') {
        noResultsMessage = "You haven't created any campaigns.";
    } else if (filter === 'joined') {
        noResultsMessage = "You haven't joined any campaigns.";
    }

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

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
            <TabsTrigger value="all">All Campaigns</TabsTrigger>
            <TabsTrigger value="created">My Created</TabsTrigger>
            <TabsTrigger value="joined">Joined</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading && <CampaignSkeletons />}
        {sortedAndFilteredCampaigns?.map((campaign) => (
          <CampaignCard 
            key={campaign.id} 
            campaign={campaign} 
            userId={user?.uid}
            isJoined={joinedCampaignIds.has(campaign.id)}
          />
        ))}
         {!loading && sortedAndFilteredCampaigns?.length === 0 && (
          <div className="col-span-full text-center py-12 flex flex-col items-center">
            <Target className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">{noResultsMessage}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {filter === 'created'
                ? 'Why not start a new one to reach your community?'
                : filter === 'joined'
                ? 'Explore all campaigns to find one to join.'
                : 'Try a different search term or create a new campaign.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
