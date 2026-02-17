import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockCampaigns } from "@/lib/data";
import Image from "next/image";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from 'date-fns';
import { Users, MapPin, PlusCircle } from "lucide-react";
import { CreateCampaignForm } from "@/components/campaigns/create-campaign-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function CampaignCard({ campaign }: { campaign: (typeof mockCampaigns)[0] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="p-0">
        <Image
          src={campaign.imageUrl}
          alt={campaign.title}
          width={600}
          height={400}
          className="rounded-t-lg object-cover aspect-[3/2]"
        />
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        <CardTitle className="mb-2">{campaign.title}</CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <MapPin className="h-4 w-4" />
          <span>{campaign.location}</span>
        </div>
        <p className="text-muted-foreground text-sm mb-4">{campaign.description}</p>
        <div>
          <div className="flex justify-between items-center mb-1 text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">{campaign.progress}%</span>
          </div>
          <Progress value={campaign.progress} />
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0 flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{campaign.participants} participants</span>
        </div>
        <Button>Join Campaign</Button>
      </CardFooter>
      <CardFooter className="p-6 pt-0 border-t">
        <p className="text-xs text-muted-foreground">
          Created by {campaign.organizer.name} • {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
        </p>
      </CardFooter>
    </Card>
  );
}

export default function CampaignsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline">Campaigns</h1>
          <p className="text-muted-foreground">Join or create soul-winning campaigns.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
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
            <CreateCampaignForm />
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockCampaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
    </div>
  );
}
