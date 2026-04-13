
"use client";

import Link from "next/link";
import { format, parse, isSameDay, differenceInDays } from "date-fns";
import { CalendarDays, MapPin, Users, Share2, Edit, MoreVertical, Loader2, MessagesSquare, UserCheck2, PlayCircle, UserPlus, Newspaper } from "lucide-react";
import type { Campaign, CampaignParticipant, UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, serverTimestamp, query, where, limit, getDocs, addDoc, doc, runTransaction, getDoc } from "firebase/firestore";
import { useState, useRef, useEffect, useMemo } from "react";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Badge } from "../ui/badge";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { safeToDate } from "@/lib/utils";
import { JoinCampaignDialog } from "./join-campaign-dialog";


function ParticipantsDialog({ campaign, children }: { campaign: Campaign; children: React.ReactNode; }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  const participantsQuery = useMemo(() => {
    // Only create query when dialog is open and user is organizer to avoid unnecessary fetches/permission errors
    if (!isOpen || !firestore || !user || user.uid !== campaign.organizerId) return null;
    return query(collection(firestore, 'campaigns', campaign.id, 'participants'));
  }, [isOpen, firestore, campaign.id, user, campaign.organizerId]);

  const { data: participants, loading } = useCollection<CampaignParticipant>(participantsQuery);
  
  const organizer = useMemo(() => participants?.find(p => p.id === campaign.organizerId), [participants, campaign.organizerId]);
  const otherParticipants = useMemo(() => participants?.filter(p => p.id !== campaign.organizerId), [participants, campaign.organizerId]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Participants for "{campaign.title}"</DialogTitle>
          <DialogDescription>
            {loading ? 'Loading...' : `${campaign.participants || 0} people have joined this campaign.`}
            <br/>
             {user?.uid !== campaign.organizerId && (
                <span className="text-xs">Note: Only the campaign organizer can see the full participant list.</span>
             )}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          {loading && (
            <div className="space-y-2">
              <div className="h-10 w-full" />
              <div className="h-10 w-full" />
              <div className="h-10 w-full" />
            </div>
          )}
          {!loading && participants && (
             <div className="space-y-4">
                {organizer && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground">ORGANIZER</h3>
                        <div className="flex items-center justify-between rounded-lg p-3 bg-muted/50">
                            <span className='font-medium'>{organizer.firstName} {organizer.lastName}</span>
                        </div>
                    </div>
                )}
                {otherParticipants && otherParticipants.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">MEMBERS ({otherParticipants.length})</h3>
                    <div className="space-y-2">
                      {otherParticipants.map(p => (
                        <div key={p.id} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className='font-medium'>{p.firstName} {p.lastName}</span>
                          </div>
                          {p.joinReason && (
                            <blockquote className="border-l-2 pl-3 text-sm italic text-muted-foreground">
                                {p.joinReason}
                            </blockquote>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
           {!loading && (!participants || participants.length === 0) && user?.uid === campaign.organizerId && (
                <p className="text-center text-muted-foreground py-4">No other participants yet.</p>
           )}
           {!loading && !participants && user?.uid !== campaign.organizerId && (
            <p className="text-center text-muted-foreground py-4">You do not have permission to view the participant list.</p>
           )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type CampaignCardProps = {
  campaign: Campaign;
  userId?: string;
  userProfile?: UserProfile | null;
  distance: number | null;
  isJoined?: boolean;
  onManage: () => void;
  onLogSoul: () => void;
  onShareTestimony: () => void;
  onDelete: () => void;
};


export function CampaignCard({ campaign, userId, userProfile, distance, onManage, onLogSoul, onShareTestimony, onDelete, isJoined }: CampaignCardProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const isOwner = campaign.organizerId === userId;
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const [isDescriptionTruncated, setIsDescriptionTruncated] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent navigation if a button, link or interactive element was clicked
    if (
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('a') ||
      (e.target as HTMLElement).closest('[role="dialog"]') ||
      (e.target as HTMLElement).closest('[role="menu"]')
    ) {
      return;
    }
    router.push(`/dashboard/campaigns/${campaign.id}`);
  };

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const startDate = useMemo(() => safeToDate(campaign.startDate), [campaign.startDate]);
  const endDate = useMemo(() => safeToDate(campaign.endDate), [campaign.endDate]);

  const status = useMemo(() => {
    const now = new Date();
    if (!startDate || !endDate) return "Past";
    
    const endDateTime = new Date(endDate);
    if (campaign.endTime && /^\d{2}:\d{2}$/.test(campaign.endTime)) {
        const [hours, minutes] = campaign.endTime.split(':').map(Number);
        endDateTime.setHours(hours, minutes, 59, 999);
    } else {
        endDateTime.setHours(23, 59, 59, 999);
    }

    if (endDateTime < now) return "Past";
    
    const startDateTime = new Date(startDate);
    if (campaign.startTime && /^\d{2}:\d{2}$/.test(campaign.startTime)) {
        const [hours, minutes] = campaign.startTime.split(':').map(Number);
        startDateTime.setHours(hours, minutes, 0, 0);
    } else {
        startDateTime.setHours(0, 0, 0, 0);
    }

    if (startDateTime > now) return "Upcoming";
    return "Ongoing";
  }, [startDate, endDate, campaign.startTime, campaign.endTime]);


  const borderColorClass = useMemo(() => {
    switch (status) {
      case 'Ongoing':
        return 'border-t-blue-500';
      case 'Upcoming':
        return 'border-t-green-500';
      case 'Past':
        return 'border-t-red-500';
      default:
        return 'border-t-border';
    }
  }, [status]);


  useEffect(() => {
    if (descriptionRef.current) {
      // We need to check after a small delay to ensure rendering is complete
      const checkTruncation = () => {
        if (descriptionRef.current) {
          setIsDescriptionTruncated(
            descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight
          );
        }
      };
      setTimeout(checkTruncation, 100); // A small delay
      window.addEventListener('resize', checkTruncation); // Re-check on resize
      return () => window.removeEventListener('resize', checkTruncation);
    }
  }, [campaign.description]);
  
  const handleInitiateChat = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Please log in', description: 'You must be logged in to start a chat.' });
      return;
    }
    setIsChatLoading(true);
    try {
      const participantIds = [user.uid, campaign.organizerId].sort();
      const chatsRef = collection(firestore, 'chats');

      // Simplified query
      const q = query(
        chatsRef,
        where('participantIds', '==', participantIds),
        where('isGroupChat', '==', false)
      );

      const querySnapshot = await getDocs(q);
      
      // Find the specific one for this campaign, or the one without a campaignId (accountability chat)
      let existingChat = querySnapshot.docs.find(doc => doc.data().campaignId === campaign.id);

      let chatId: string;

      if (existingChat) {
        chatId = existingChat.id;
      } else {
         const organizerDoc = await getDoc(doc(firestore, "users", campaign.organizerId));
         const organizerProfile = organizerDoc.data() as UserProfile | undefined;
         const [userFirstName, ...userLastNameParts] = user.displayName?.split(' ') || ['User', ''];
         const newChatData = {
              participantIds,
              participantInfo: {
                  [user.uid]: {
                      firstName: userFirstName,
                      lastName: userLastNameParts.join(' '),
                      photoURL: user.photoURL || '',
                  },
                  [campaign.organizerId]: {
                      firstName: campaign.organizerFirstName,
                      lastName: campaign.organizerLastName,
                      photoURL: organizerProfile?.photoURL || '', 
                  },
              },
              campaignId: campaign.id,
              campaignTitle: campaign.title,
              lastUpdatedAt: serverTimestamp(),
              hasMessages: false,
              isGroupChat: false,
          };
          const chatDocRef = await addDoc(chatsRef, newChatData);
          chatId = chatDocRef.id;
      }
      router.push(`/dashboard/chats/${chatId}`);

    } catch (error) {
       console.error("Error initiating chat:", error);
       toast({ variant: 'destructive', title: 'Chat Error', description: 'Could not start the chat session.'});
    } finally {
      setIsChatLoading(false);
    }
  }


  const handleShare = async () => {
    const shareData = {
      title: `Join the '${campaign.title}' campaign on Testify!`,
      text: `Join me in the '${campaign.title}' evangelism campaign. Let's make an impact together!`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback for desktop browsers
         handleShareDropdown('link');
      }
    } catch (err) {
      console.error('Share failed:', err);
      // Fallback for when navigator.share fails
      handleShareDropdown('link');
    }
  };

  const handleShareDropdown = (platform: "link" | "facebook" | "twitter" | "whatsapp") => {
    const url = typeof window !== "undefined" ? window.location.origin + '/dashboard/campaigns' : '';
    const titleText = `Join the '${campaign.title}' campaign on Testify!`;
    const shareTextWithUrl = `${titleText} ${url}`;
    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(titleText)}`;
        window.open(shareUrl, "_blank");
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(titleText)}`;
        window.open(shareUrl, "_blank");
        break;
      case "whatsapp":
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareTextWithUrl)}`;
        window.open(shareUrl, "_blank");
        break;
      case "link":
        navigator.clipboard.writeText(shareTextWithUrl);
        toast({
          title: 'Link Copied!',
          description: 'Campaign link has been copied to your clipboard.',
        });
        break;
    }
  };


  const startTimeFormatted = useMemo(() => campaign.startTime && /^\d{2}:\d{2}$/.test(campaign.startTime)
    ? format(parse(campaign.startTime, 'HH:mm', new Date()), 'p')
    : campaign.startTime, [campaign.startTime]);

  const endTimeFormatted = useMemo(() => campaign.endTime && /^\d{2}:\d{2}$/.test(campaign.endTime)
    ? format(parse(campaign.endTime, 'HH:mm', new Date()), 'p')
    : campaign.endTime, [campaign.endTime]);

  const dateString = useMemo(() => {
    if (startDate && endDate) {
        const startFormatted = format(startDate, "PPP");
        if (isSameDay(startDate, endDate)) {
            return startFormatted;
        } else {
            const endFormatted = format(endDate, "PPP");
            const days = differenceInDays(endDate, startDate) + 1;
            return `${startFormatted} to ${endFormatted} (${days} days)`;
        }
    } else {
        return "Date not set";
    }
  }, [startDate, endDate]);
  
  const timeString = useMemo(() => campaign.startTime && campaign.endTime ? `${startTimeFormatted} - ${endTimeFormatted}` : "Time not set", [startTimeFormatted, endTimeFormatted, campaign.startTime, campaign.endTime]);
  
  const footerDateText = useMemo(() => {
    const createdAtDate = safeToDate(campaign.createdAt);
    if (!createdAtDate) return '';
    if (status === 'Past' && endDate) {
        return `Ended on ${format(endDate, 'PPP')}`;
    }
    return `Created on ${format(createdAtDate, 'PPP')}`;
  }, [campaign.createdAt, status, endDate]);
  
  const LogSoulButton = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); onLogSoul(); }}>
            <UserCheck2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Log Soul</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
  
  const ShareTestimonyButton = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); onShareTestimony(); }}>
            <Newspaper className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Share Testimony</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );


  const shareButton = (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" onClick={(e) => {
              e.preventDefault();
              if (navigator.share) {
                handleShare();
              }
            }} disabled={status === 'Past'}>
                <Share2 className="h-4 w-4" />
                <span className="sr-only">Share Campaign</span>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => handleShareDropdown('link')}>
                Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleShareDropdown('whatsapp')}>
                Share on WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleShareDropdown('facebook')}>
                Share on Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleShareDropdown('twitter')}>
                Share on Twitter (X)
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );


  return (
    <>
      <Card
        id={campaign.id}
        className={cn(
          "flex flex-col h-full overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 scroll-mt-20 border-t-4 cursor-pointer",
          borderColorClass
        )}
        onClick={handleCardClick}
      >
        <CardHeader className="p-6 flex flex-row items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
                <CardTitle className="font-bold text-lg md:text-xl truncate">
                  {campaign.title}
                </CardTitle>
                <CardDescription className="text-sm mt-1 truncate">{campaign.goal}</CardDescription>
                {distance != null && (
                    <CardDescription className="text-xs text-primary font-semibold mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {distance.toFixed(1)} km away
                    </CardDescription>
                )}
            </div>
            <Badge variant={status === 'Ongoing' ? 'default' : status === 'Upcoming' ? 'secondary' : 'outline'}>
                {status}
            </Badge>
        </CardHeader>
        <CardContent className="p-6 pt-0 flex-grow space-y-4">
            
            <div className="space-y-1">
                <p ref={descriptionRef} className="text-muted-foreground text-sm line-clamp-3">{campaign.description}</p>
                {isDescriptionTruncated && (
                    <Dialog open={showFullDescription} onOpenChange={setShowFullDescription}>
                        <DialogTrigger asChild>
                          <Button variant="link" className="p-0 h-auto text-sm" onClick={stopPropagation}>Read More</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{campaign.title}</DialogTitle>
                            <DialogDescription>Full Campaign Description</DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto pr-4">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{campaign.description}</p>
                        </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
            
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border p-3 flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-1" />
                    <div>
                        <p className="font-medium">Location</p>
                        <p className="text-muted-foreground break-words">{campaign.location}</p>
                    </div>
                </div>
                <div className="rounded-lg border p-3 flex items-start gap-3">
                    <CalendarDays className="h-5 w-5 text-primary shrink-0 mt-1" />
                    <div>
                        <p className="font-medium">Date & Time</p>
                        <p className="text-muted-foreground">{dateString}</p>
                        <p className="text-muted-foreground">{timeString}</p>
                    </div>
                </div>
            </div>

        </CardContent>
        <CardFooter className="p-6 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-auto border-t bg-muted/50">
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <ParticipantsDialog campaign={campaign}>
                    <Button variant="ghost" className="h-auto p-0 justify-start text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-primary" onClick={stopPropagation}>
                        <Users className="h-4 w-4" />
                        <span>
                            {campaign.participants}
                            {campaign.maxParticipants ? ` / ${campaign.maxParticipants}` : ''} participant{campaign.participants === 1 ? '' : 's'}
                        </span>
                    </Button>
                </ParticipantsDialog>
                {(status === "Ongoing") && (
                    <div className="flex items-center gap-2">
                        <UserCheck2 className="h-4 w-4" />
                        <span>{campaign.soulsLogged || 0} soul{campaign.soulsLogged === 1 ? '' : 's'} won</span>
                    </div>
                )}
            </div>

            <div className="w-full sm:w-auto flex items-center flex-wrap justify-end gap-2" onClick={stopPropagation}>
                {status === 'Ongoing' && campaign.streamUrl && (
                    <Button asChild className="w-full sm:w-auto">
                        <Link href={campaign.streamUrl} target="_blank" rel="noopener noreferrer">
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Watch Live
                        </Link>
                    </Button>
                )}

                {isOwner ? (
                    <div onClick={stopPropagation} className="flex items-center gap-2">
                      {status === 'Ongoing' && LogSoulButton}
                      {(status === 'Ongoing' || status === 'Past') && ShareTestimonyButton}
                      <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); onManage(); }}>
                        <Edit className="h-4 w-4" /><span className="sr-only">Manage Campaign</span>
                      </Button>
                      {shareButton}
                    </div>
                ) : (
                    <div onClick={stopPropagation} className="flex items-center gap-2">
                        {!isJoined && status !== 'Past' && (
                            <Button onClick={(e) => {
                                e.stopPropagation();
                                if (!userProfile) {
                                    toast({ variant: 'destructive', title: 'Please log in to join.' });
                                    return;
                                }
                                setIsJoinDialogOpen(true);
                            }}>
                                Join Campaign
                            </Button>
                        )}
                        {isJoined && (
                            <Badge variant="secondary" className="flex items-center gap-2 py-2 px-3"><UserCheck2 className="h-4 w-4" /> Joined</Badge>
                        )}

                        {status === 'Ongoing' && LogSoulButton}
                        {(status === 'Ongoing' || status === 'Past') && ShareTestimonyButton}
                        
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={handleInitiateChat} variant="outline" size="icon" disabled={!userId || isChatLoading}>
                                         {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessagesSquare className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Chat with Organizer</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        {shareButton}
                    </div>
                )}
            </div>
        </CardFooter>
        <CardFooter className="p-4 bg-muted/20 text-xs text-muted-foreground flex justify-between">
            <span className="truncate">
                Created by{" "}
                <Link href={isOwner ? '/dashboard/profile' : `/dashboard/profile/${campaign.organizerId}`} onClick={stopPropagation} className="font-medium text-primary px-1 hover:underline">
                    {campaign.organizerFirstName} {campaign.organizerLastName}
                </Link>
            </span>
            <span className="flex-shrink-0">{footerDateText}</span>
        </CardFooter>
      </Card>
      {userProfile && !isOwner && (
        <JoinCampaignDialog
          campaign={campaign}
          userProfile={userProfile}
          isOpen={isJoinDialogOpen}
          onOpenChange={setIsJoinDialogOpen}
          onCampaignJoined={() => {}}
        />
      )}
    </>
  );
}
