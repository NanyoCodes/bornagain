"use client";

import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Users, Share2 } from "lucide-react";
import type { Campaign } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFirestore, useUser } from "@/firebase";
import { doc, serverTimestamp, setDoc, updateDoc, increment } from "firebase/firestore";

export function CampaignCard({ campaign, userId, isJoined }: { campaign: Campaign; userId?: string, isJoined: boolean }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const isOwner = campaign.organizerId === userId;

  const handleJoin = async () => {
    if (!user || !firestore) return;
    
    const campaignRef = doc(firestore, 'campaigns', campaign.id);
    const joinedRef = doc(firestore, 'users', user.uid, 'joinedCampaigns', campaign.id);

    try {
      await setDoc(joinedRef, {
        campaignId: campaign.id,
        joinedAt: serverTimestamp(),
      });
      await updateDoc(campaignRef, {
        participants: increment(1)
      });

      toast({
        title: "Campaign Joined!",
        description: `You have successfully joined the "${campaign.title}" campaign.`,
      });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Error", description: "Could not join campaign." });
    }
  };

  const handleShare = (platform: "link" | "facebook" | "twitter") => {
    const url = typeof window !== "undefined" ? window.location.origin + '/dashboard/campaigns' : '';
    const text = `Join the '${campaign.title}' campaign on Testify Global!`;
    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(shareUrl, "_blank");
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        window.open(shareUrl, "_blank");
        break;
      case "link":
        navigator.clipboard.writeText(`${text} ${url}`);
        toast({
          title: "Link Copied!",
          description: "Campaign link has been copied to your clipboard.",
        });
        break;
    }
  };

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
        {isOwner ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled>Your Campaign</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleShare("link")}>
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare("facebook")}>
                  Share on Facebook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare("twitter")}>
                  Share on Twitter (X)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : !isJoined ? (
          <Button onClick={handleJoin} disabled={!userId}>Join Campaign</Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled>
              Joined
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleShare("link")}>
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare("facebook")}>
                  Share on Facebook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare("twitter")}>
                  Share on Twitter (X)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardFooter>
      <CardFooter className="p-6 pt-0 border-t">
        <p className="text-xs text-muted-foreground">
          Created by {campaign.organizerName} •{" "}
          {campaign.createdAt ? formatDistanceToNow(new Date(campaign.createdAt.seconds * 1000), { addSuffix: true }) : 'just now'}
        </p>
      </CardFooter>
    </Card>
  );
}
