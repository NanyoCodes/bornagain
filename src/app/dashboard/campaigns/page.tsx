"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { mockCampaigns } from "@/lib/data";
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
import { CampaignCard } from "@/components/campaigns/campaign-card";
import type { Campaign } from "@/lib/types";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCampaignCreated = (newCampaign: Campaign) => {
    setCampaigns((prev) => [newCampaign, ...prev]);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline">Campaigns</h1>
          <p className="text-muted-foreground">Join or create soul-winning campaigns.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create a New Campaign</DialogTitle>
              <DialogDescription>
                Use our AI assistant to help you craft the perfect campaign to reach souls for Christ.
              </DialogDescription>
            </DialogHeader>
            <CreateCampaignForm onCampaignCreated={handleCampaignCreated} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
    </div>
  );
}
