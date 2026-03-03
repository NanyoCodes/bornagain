
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


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

const safeToDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  return null;
};

const getStatus = (campaign: { _startDate: Date | null, _endDate: Date | null, startTime?: string, endTime?: string }, now: Date): number => {
    const { _startDate, _endDate } = campaign;
    if (!_startDate || !_endDate) return 3; // Past
    
    const endDateTime = new Date(_endDate);
    if (campaign.endTime && /^\d{2}:\d{2}$/.test(campaign.endTime)) {
        const [hours, minutes] = campaign.endTime.split(':').map(Number);
        endDateTime.setHours(hours, minutes, 59, 999);
    } else {
        endDateTime.setHours(23, 59, 59, 999);
    }

    if (endDateTime < now) return 3; // Past

    const startDateTime = new Date(_startDate);
    if (campaign.startTime && /^\d{2}:\d{2}$/.test(campaign.startTime)) {
        const [hours, minutes] = campaign.startTime.split(':').map(Number);
        startDateTime.setHours(hours, minutes, 0, 0);
    } else {
        startDateTime.setHours(0, 0, 0, 0);
    }

    if (startDateTime > now) return 2; // Upcoming
    return 1; // Ongoing
  };


export default function CampaignsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();
  const [now, setNow] = useState<Date | null>(null);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
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

  const processedCampaigns = useMemo(() => {
    if (!campaigns || !now) return [];
    return campaigns.map(c => {
      const _startDate = safeToDate(c.startDate);
      const _endDate = safeToDate(c.endDate);
      const tempCampaign = { ...c, _startDate, _endDate };
      return {
        ...tempCampaign,
        _status: getStatus(tempCampaign, now),
      }
    });
  }, [campaigns, now]);

  const sortedAndFilteredCampaigns = useMemo(() => {
    const activeCampaigns = processedCampaigns.filter(c => c.status !== 'deleted');

    const tabFilteredCampaigns = activeCampaigns.filter(c => {
        if (!user?.uid) return true;
        if (filter === 'created') return c.organizerId === user.uid;
        if (filter === 'joined') return joinedCampaignIds.has(c.id) && c.organizerId !== user.uid;
        return true; // 'all'
    });

    const statusFilteredCampaigns = tabFilteredCampaigns.filter(c => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'ongoing') return c._status === 1;
        if (statusFilter === 'upcoming') return c._status === 2;
        if (statusFilter === 'past') return c._status === 3;
        return true;
    });

    const filtered = statusFilteredCampaigns.filter((campaign) => {
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

    if (!filtered || !mounted) return filtered;

    return [...filtered].sort((a, b) => {
        // Status is primary sort key: Ongoing (1) < Upcoming (2) < Past (3)
        if (a._status !== b._status) {
            return a._status - b._status;
        }

        const getFullStartDate = (campaign: typeof a) => {
            if (!campaign._startDate) return null;
            const d = new Date(campaign._startDate);
            if (campaign.startTime && /^\d{2}:\d{2}$/.test(campaign.startTime)) {
                const [hours, minutes] = campaign.startTime.split(':').map(Number);
                d.setHours(hours, minutes, 0, 0);
            } else {
                d.setHours(0, 0, 0, 0);
            }
            return d;
        };
        const getFullEndDate = (campaign: typeof b) => {
            if (!campaign._endDate) return null;
            const d = new Date(campaign._endDate);
            if (campaign.endTime && /^\d{2}:\d{2}$/.test(campaign.endTime)) {
                const [hours, minutes] = campaign.endTime.split(':').map(Number);
                d.setHours(hours, minutes, 59, 999);
            } else {
                d.setHours(23, 59, 59, 999);
            }
            return d;
        };
        
        // For Ongoing and Upcoming, sort by start date ascending (soonest first)
        if (a._status === 1 || a._status === 2) {
            const fullStartDateA = getFullStartDate(a);
            const fullStartDateB = getFullStartDate(b);

            if (fullStartDateA && fullStartDateB) {
                const timeDiff = fullStartDateA.getTime() - fullStartDateB.getTime();
                if (timeDiff !== 0) return timeDiff;
            }
            if (fullStartDateA) return -1;
            if (fullStartDateB) return 1;
        }

        // For Past, sort by end date descending (most recently ended first)
        if (a._status === 3) {
            const fullEndDateA = getFullEndDate(a);
            const fullEndDateB = getFullEndDate(b);

            if (fullEndDateA && fullEndDateB) {
                const timeDiff = fullEndDateB.getTime() - fullEndDateA.getTime();
                if (timeDiff !== 0) return timeDiff;
            }
            if (fullEndDateA) return -1;
            if (fullEndDateB) return 1;
        }

        // Fallback sort
        const createdAtA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const createdAtB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return createdAtB - createdAtA;
    });

  }, [processedCampaigns, searchTerm, mounted, filter, user?.uid, joinedCampaignIds, statusFilter]);

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

      <div className="flex flex-wrap gap-4 items-center">
        <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
                <TabsTrigger value="all">All Campaigns</TabsTrigger>
                <TabsTrigger value="created">My Created</TabsTrigger>
                <TabsTrigger value="joined">Joined</TabsTrigger>
            </TabsList>
        </Tabs>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
            </SelectContent>
        </Select>
      </div>


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
