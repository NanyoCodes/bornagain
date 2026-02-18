
"use client";

import Link from "next/link";
import { format, formatDistanceToNow, parse, isSameDay } from "date-fns";
import { CalendarDays, MapPin, Users, Share2, Clock, Edit, Trash2, MoreVertical, Loader2, MessageSquare } from "lucide-react";
import type { Campaign } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFirestore, useUser } from "@/firebase";
import { doc, serverTimestamp, setDoc, updateDoc, increment } from "firebase/firestore";
import { useState } from "react";
import { ManageCampaignForm } from "./manage-campaign-form";
import { Textarea } from "../ui/textarea";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { LogSoulForm } from "../souls/log-soul-form";
import { Badge } from "../ui/badge";
import { PrivateChatDialog } from "./private-chat-dialog";

export function CampaignCard({ campaign, userId, isJoined, allCampaigns }: { campaign: Campaign; userId?: string, isJoined: boolean, allCampaigns?: Campaign[] }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const isOwner = campaign.organizerId === userId;
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLogSoulOpen, setIsLogSoulOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleJoin = async () => {
    if (!user || !firestore) return;

    const campaignRef = doc(firestore, 'campaigns', campaign.id);
    const joinedRef = doc(firestore, 'users', user.uid, 'joinedCampaigns', campaign.id);
    const participantRef = doc(firestore, 'campaigns', campaign.id, 'participants', user.uid);

    const participantData = {
        userId: user.uid,
        displayName: user.displayName,
        email: user.email,
        joinedAt: serverTimestamp()
    };

    try {
      // Write to the user's private subcollection
      await setDoc(joinedRef, {
        campaignId: campaign.id,
        joinedAt: serverTimestamp(),
      }).catch((serverError) => {
          const permissionError = new FirestorePermissionError({ path: joinedRef.path, operation: 'create', requestResourceData: { campaignId: campaign.id } });
          errorEmitter.emit('permission-error', permissionError);
          throw permissionError;
      });

      // Write to the campaign's public participant list
      await setDoc(participantRef, participantData).catch((serverError) => {
          const permissionError = new FirestorePermissionError({ path: participantRef.path, operation: 'create', requestResourceData: participantData });
          errorEmitter.emit('permission-error', permissionError);
          throw permissionError;
      });

      // Increment the participant count
      await updateDoc(campaignRef, {
        participants: increment(1)
      }).catch((serverError) => {
          const permissionError = new FirestorePermissionError({ path: campaignRef.path, operation: 'update', requestResourceData: { participants: 'increment(1)' } });
          errorEmitter.emit('permission-error', permissionError);
          throw permissionError;
      });

      toast({
        title: "Campaign Joined!",
        description: `You have successfully joined the "${campaign.title}" campaign.`,
      });
    } catch (error: any) {
      console.error("Join campaign error:", error);
      if (error.name !== 'FirestorePermissionError') {
        toast({ variant: 'destructive', title: "Error", description: "Could not join the campaign. Please try again." });
      }
    }
  };
  
  const handleDeleteCampaign = async () => {
    if (!user || !firestore) return;
    if (deleteReason.length < 10) {
        toast({ variant: 'destructive', title: 'Reason Required', description: 'Please provide a deletion reason of at least 10 characters.' });
        return;
    }
    setIsDeleting(true);
    try {
        const campaignRef = doc(firestore, 'campaigns', campaign.id);
        const deleteData = {
            status: 'deleted',
            deletionReason: deleteReason,
            deletedAt: serverTimestamp(),
        };
        await updateDoc(campaignRef, deleteData);

        toast({ title: 'Campaign Deleted', description: 'The campaign has been successfully deleted.' });
    } catch (error) {
        console.error('Delete error:', error);
        toast({ variant: 'destructive', title: 'Delete Error', description: 'Could not delete the campaign.' });
    } finally {
        setIsDeleting(false);
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

  const startDate = safeToDate(campaign.startDate);
  const endDate = safeToDate(campaign.endDate);

  const startTimeFormatted = campaign.startTime && /^\d{2}:\d{2}$/.test(campaign.startTime)
    ? format(parse(campaign.startTime, 'HH:mm', new Date()), 'p')
    : campaign.startTime;

  const endTimeFormatted = campaign.endTime && /^\d{2}:\d{2}$/.test(campaign.endTime)
    ? format(parse(campaign.endTime, 'HH:mm', new Date()), 'p')
    : campaign.endTime;

  let dateString;
  if (startDate && endDate) {
      const startFormatted = format(startDate, "PPP");
      if (isSameDay(startDate, endDate)) {
          dateString = startFormatted;
      } else {
          const endFormatted = format(endDate, "PPP");
          dateString = `${startFormatted} to ${endFormatted}`;
      }
  } else {
      dateString = "Date not set";
  }
  
  const timeString = campaign.startTime && campaign.endTime ? `${startTimeFormatted} - ${endTimeFormatted}` : "Time not set";
  
  const getStatus = (): "Ongoing" | "Upcoming" | "Past" => {
    const now = new Date();
    if (!startDate || !endDate) return "Past";
    
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    if (endOfDay < now) return "Past";
    if (startDate > now) return "Upcoming";
    return "Ongoing";
  };
  const status = getStatus();

  const footerDateText = (() => {
    const createdAtDate = safeToDate(campaign.createdAt);
    if (!createdAtDate) return '';
    if (status === 'Past' && endDate) {
        return `Ended ${formatDistanceToNow(endDate, { addSuffix: true })}`;
    }
    return `Created ${formatDistanceToNow(createdAtDate, { addSuffix: true })}`;
  })();

  const LogSoulDialog = (
    <Dialog open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
      <DialogTrigger asChild>
        <Button>Log Soul</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log a Soul Won in "{campaign.title}"</DialogTitle>
          <DialogDescription>
            Record the details of the person ministered to during this campaign. This will appear on your personal dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-2">
          <LogSoulForm
            onSoulLogged={() => {
              setIsLogSoulOpen(false);
              toast({ title: "Soul Logged!", description: "The new soul has been added to your personal dashboard." });
            }}
            campaigns={allCampaigns || []}
            campaign={campaign}
          />
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderOwnerActions = () => (
    <div className="flex items-center gap-2">
      {LogSoulDialog}
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DialogTrigger asChild>
                    <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Manage
                    </DropdownMenuItem>
                </DialogTrigger>
                <DropdownMenuSeparator />
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                             <Trash2 className="mr-2 h-4 w-4" />
                             Delete
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                     <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will mark the campaign as deleted and hide it from public view. Please provide a reason for deleting this campaign.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Textarea 
                            placeholder="Reason for deletion..."
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value)}
                        />
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteCampaign} disabled={isDeleting}>
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Deletion
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DropdownMenuContent>
        </DropdownMenu>

        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Campaign</DialogTitle>
            <DialogDescription>
              Update the progress and details of your campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <ManageCampaignForm
              campaign={campaign}
              onCampaignUpdated={() => setIsManageOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
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
  );

  const renderParticipantActions = () => (
    <div className="flex items-center gap-2">
      {LogSoulDialog}
      <Button onClick={() => setIsChatOpen(true)} variant="outline">
        <MessageSquare className="mr-2 h-4 w-4" />
        Chat
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
  );

  const renderVisitorActions = () => (
    <div className="flex items-center gap-2">
        <Button onClick={() => setIsChatOpen(true)} variant="outline" disabled={!userId}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat with Owner
        </Button>
        <Button onClick={handleJoin} disabled={!userId}>Join Campaign</Button>
    </div>
  );


  return (
    <>
        <Card className="flex flex-col h-full overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="p-6 flex flex-row items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
                <CardTitle className="font-bold text-xl truncate">{campaign.title}</CardTitle>
                <CardDescription className="text-sm mt-1 truncate">{campaign.goal}</CardDescription>
            </div>
            <Badge variant={status === 'Ongoing' ? 'default' : status === 'Upcoming' ? 'secondary' : 'outline'}>
                {status}
            </Badge>
        </CardHeader>
        <CardContent className="p-6 pt-0 flex-grow space-y-4">
            
            <p className="text-muted-foreground text-sm line-clamp-3">{campaign.description}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="border rounded-lg p-3 flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="font-medium truncate">{campaign.location}</p>
                    </div>
                </div>
                <div className="border rounded-lg p-3 flex items-start gap-3">
                    <CalendarDays className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                        <p className="text-xs text-muted-foreground">Date & Time</p>
                        <p className="font-medium">{dateString}</p>
                        <p className="font-medium">{timeString}</p>
                    </div>
                </div>
            </div>

            <div>
            <div className="flex justify-between items-center mb-1 text-sm">
                <span className="font-medium">Progress</span>
                <span className="text-muted-foreground">{campaign.progress || 0}%</span>
            </div>
            <Progress value={campaign.progress || 0} />
            </div>
        </CardContent>
        <CardFooter className="p-6 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-auto border-t bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{campaign.participants} participant{campaign.participants === 1 ? '' : 's'}</span>
            </div>
            {isOwner
            ? renderOwnerActions()
            : isJoined
            ? renderParticipantActions()
            : renderVisitorActions()
            }
        </CardFooter>
        <CardFooter className="p-4 bg-muted/20 text-xs text-muted-foreground flex justify-between">
            <span className="truncate">
                Created by{" "}
                <Link href={`/dashboard/profile/${campaign.organizerId}`} className="font-medium text-primary hover:underline px-1">
                    {campaign.organizerName}
                </Link>
            </span>
            <span className="flex-shrink-0">{footerDateText}</span>
        </CardFooter>
        </Card>
        {user && user.uid !== campaign.organizerId && (
            <PrivateChatDialog 
                isOpen={isChatOpen}
                onOpenChange={setIsChatOpen}
                ownerId={campaign.organizerId}
                ownerName={campaign.organizerName}
                campaign={campaign}
            />
        )}
    </>
  );
}

    
