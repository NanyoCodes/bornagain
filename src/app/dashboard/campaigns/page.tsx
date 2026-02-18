
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
import type { Campaign, JoinedCampaign } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const filteredCampaigns = campaigns?.filter((campaign) => {
    const locationLower = campaign.location.toLowerCase();
    return (
      (!cityFilter || locationLower.includes(cityFilter.toLowerCase())) &&
      (!countryFilter || locationLower.includes(countryFilter.toLowerCase()))
    );
  });

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
          <h1 className="text-3xl font-bold tracking-tight font-headline">Campaigns</h1>
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
            <DialogContent className="sm:max-w-xl">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          placeholder="Filter by city..."
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
        />
        <Input
          placeholder="Filter by country..."
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading && <CampaignSkeletons />}
        {filteredCampaigns?.map((campaign) => (
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
