
"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useDoc } from "@/firebase/firestore/use-doc";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";

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
  const [cityFilter, setCityFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
  }, []);

  const userDocRef = user ? doc(firestore, 'users', user.uid) : null;
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const campaignsQuery = query(collection(firestore, 'campaigns'), orderBy('createdAt', 'desc'));
  const { data: campaigns, loading } = useCollection<Campaign>(campaignsQuery);

  const joinedCampaignsQuery = user ? query(collection(firestore, `users/${user.uid}/joinedCampaigns`)) : null;
  const { data: joinedCampaigns } = useCollection<JoinedCampaign>(joinedCampaignsQuery);

  const joinedCampaignIds = useMemo(() => {
    if (!joinedCampaigns) return new Set();
    return new Set(joinedCampaigns.map(jc => jc.id));
  }, [joinedCampaigns]);

  const handleCampaignCreated = () => {
    setIsDialogOpen(false);
  };

  const sortedAndFilteredCampaigns = useMemo(() => {
    const filtered = campaigns?.filter((campaign) => {
      const locationLower = campaign.location.toLowerCase();
      if (!campaign.startDate || !campaign.endDate) return false;

      const campaignStartDate = campaign.startDate.toDate ? campaign.startDate.toDate() : new Date(campaign.startDate as any);
      const campaignEndDate = campaign.endDate.toDate ? campaign.endDate.toDate() : new Date(campaign.endDate as any);
      
      // Normalize campaign dates to midnight for day-level comparison
      const campaignStartDay = new Date(campaignStartDate.getFullYear(), campaignStartDate.getMonth(), campaignStartDate.getDate());
      const campaignEndDay = new Date(campaignEndDate.getFullYear(), campaignEndDate.getMonth(), campaignEndDate.getDate());

      const dateFilterDay = dateFilter ? new Date(dateFilter.getFullYear(), dateFilter.getMonth(), dateFilter.getDate()) : null;

      const dateMatch = !dateFilterDay || (dateFilterDay >= campaignStartDay && dateFilterDay <= campaignEndDay);

      return (
        (!cityFilter || locationLower.includes(cityFilter.toLowerCase())) &&
        (!countryFilter || locationLower.includes(countryFilter.toLowerCase())) &&
        dateMatch
      );
    });

    if (!filtered) return [];

    const now = new Date();
    const userLocation = userProfile?.location?.toLowerCase().trim();

    const getStatus = (campaign: Campaign): number => {
      if (!campaign.startDate || !campaign.endDate) return 3; // Past
      const startDate = campaign.startDate.toDate ? campaign.startDate.toDate() : new Date(campaign.startDate as any);
      const endDate = campaign.endDate.toDate ? campaign.endDate.toDate() : new Date(campaign.endDate as any);
      
      // Set time to end of day for end date to include the whole day
      endDate.setHours(23, 59, 59, 999);

      if (endDate < now) return 3; // Past
      if (startDate > now) return 2; // Upcoming
      return 1; // Ongoing
    };

    return filtered.sort((a, b) => {
      // 1. Sort by status (Ongoing > Upcoming > Past)
      const statusA = getStatus(a);
      const statusB = getStatus(b);
      if (statusA !== statusB) {
        return statusA - statusB;
      }

      // 2. Within each status, sort by location proximity
      if (userLocation) {
        const aLocation = a.location.toLowerCase();
        const bLocation = b.location.toLowerCase();
        const isLocalA = aLocation.includes(userLocation);
        const isLocalB = bLocation.includes(userLocation);

        if (isLocalA && !isLocalB) return -1;
        if (!isLocalA && isLocalB) return 1;
      }

      // 3. Finally, sort by start date (ascending, sooner campaigns first)
      const startDateA = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate as any);
      const startDateB = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate as any);
      return startDateA.getTime() - startDateB.getTime();
    });

  }, [campaigns, cityFilter, countryFilter, dateFilter, userProfile]);

  const triggerButton = (
    <Button disabled={!user}>
      <PlusCircle className="mr-2 h-4 w-4" />
      Create Campaign
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Input
          placeholder="Filter by city..."
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="text-base"
        />
        <Input
          placeholder="Filter by country..."
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="text-base"
        />
        <div className="relative">
          <Input
            type="date"
            value={dateFilter ? format(dateFilter, "yyyy-MM-dd") : ""}
            onChange={(e) =>
              setDateFilter(e.target.value ? new Date(e.target.value + "T00:00:00") : null)
            }
            className="text-base"
          />
           {dateFilter && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-8 w-8"
              onClick={() => setDateFilter(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
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
      </div>
    </div>
  );
}
