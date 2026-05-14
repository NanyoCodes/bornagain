"use client";

import Link from "next/link";
import { format, parse, isSameDay, differenceInDays } from "date-fns";
import { CalendarDays, MapPin, Users, Share2, Edit, MoreVertical, Loader2, MessagesSquare, UserCheck, PlayCircle, Newspaper, UserPlus, ChevronDown } from "lucide-react";
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
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

function ParticipantsDialog({ campaign, children }: { campaign: Campaign; children: React.ReactNode; }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const participantsQuery = useMemo(() => {
    if (!isOpen || !firestore || !user || user.uid !== campaign.organizerId) return null;
    return query(collection(firestore, 'campaigns', campaign.id, 'participants'));
  }, [isOpen, firestore, campaign.id, user, campaign.organizerId]);

  const { data: participants, loading } = useCollection<CampaignParticipant>(participantsQuery);
  
  const organizer = useMemo(() => participants?.find(p => p.id === campaign.organizerId), [participants, campaign.organizerId]);
  const otherParticipants = useMemo(() => participants?.filter(p => p.id !== campaign.organizerId), [participants, campaign.organizerId]);

  const content = (
    <ScrollArea className={cn("pr-4", isMobile ? "h-full" : "max-h-[60vh]")}>
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : participants ? (
         <div className="space-y-6 pb-6">
            {organizer && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Organizer</h3>
                    <div className="flex items-center gap-3 rounded-lg p-3 bg-muted/50 border">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={organizer.photoURL} />
                            <AvatarFallback>{organizer.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className='font-medium'>{organizer.firstName} {organizer.lastName}</span>
                    </div>
                </div>
            )}
            {otherParticipants && otherParticipants.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Members ({otherParticipants.length})</h3>
                <div className="space-y-3">
                  {otherParticipants.map(p => (
                    <div key={p.id} className="p-3 border rounded-lg space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 text-xs">
                            <AvatarImage src={p.photoURL} />
                            <AvatarFallback>{p.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className='font-medium text-sm'>{p.firstName} {p.lastName}</span>
                      </div>
                      {p.joinReason && (
                        <blockquote className="border-l-2 pl-3 text-xs italic text-muted-foreground bg-muted/20 py-1">
                            &ldquo;{p.joinReason}&rdquo;
                        </blockquote>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {otherParticipants?.length === 0 && user?.uid === campaign.organizerId && (
                <p className="text-center text-muted-foreground py-8 text-sm italic">No other participants yet.</p>
            )}
        </div>
      ) : user?.uid !== campaign.organizerId ? (
        <div className="text-center py-10 bg-muted/20 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground px-6">Only the campaign organizer can see the full participant list.</p>
        </div>
      ) : null}
    </ScrollArea>
  );

  if (mounted && isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent side="bottom" className="h-[80dvh] flex flex-col">
          <SheetHeader className="text-left flex-shrink-0">
            <SheetTitle>Participants: {campaign.title}</SheetTitle>
            <SheetDescription>
              {campaign.participants || 0} people have joined this campaign.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-grow min-h-0 pt-6">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Participants for "{campaign.title}"</DialogTitle>
          <DialogDescription>
            {campaign.participants || 0} people have joined this campaign.
          </DialogDescription>
        </DialogHeader>
        {content}
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
  onShareTestimony: () => void;
  onDelete: () => void;
  onLogSoul: () => void;
};


export function CampaignCard({ campaign, userId, userProfile, distance, onManage, onShareTestimony, onDelete, isJoined, onLogSoul }: CampaignCardProps) {
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
      const checkTruncation = () => {
        if (descriptionRef.current) {
          setIsDescriptionTruncated(
            descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight
          );
        }
      };
      setTimeout(checkTruncation, 100);
      window.addEventListener('resize', checkTruncation);
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

      const q = query(
        chatsRef,
        where('participantIds', '==', participantIds),
        where('isGroupChat', '==', false)
      );

      const querySnapshot = await getDocs(q);
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
    const baseUrl = "https://testifyglobal.com";
    const shareUrl = `${baseUrl}/dashboard/campaigns/${campaign.id}`;
    const shareData = {
      title: `Join the '${campaign.title}' campaign on Testify!`,
      text: `Join me in the '${campaign.title}' evangelism campaign. Let's make an impact together!`,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
         handleShareDropdown('link');
      }
    } catch (err) {
      console.error('Share failed:', err);
      handleShareDropdown('link');
    }
  };

  const handleShareDropdown = (platform: "link" | "facebook" | "twitter" | "whatsapp") => {
    const baseUrl = "https://testifyglobal.com";
    const url = `${baseUrl}/dashboard/campaigns/${campaign.id}`;
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

  const LogSoulButton = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); onLogSoul(); }}>
            <UserPlus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Log Soul Won</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );


  const shareButton = (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" onClick={(e) => {
              e.preventDefault();
              handleShare();
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
                        <span className="ml-1">
                            {campaign.participants}
                            {campaign.maxParticipants ? ` / ${campaign.maxParticipants}` : ''} participant{campaign.participants === 1 ? '' : 's'}
                        </span>
                    </Button>
                </ParticipantsDialog>
                {(status === "Ongoing") && (
                    <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
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
                      {status === "Ongoing" && LogSoulButton}
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
                            <Badge variant="secondary" className="flex items-center gap-2 py-2 px-3"><UserCheck className="h-4 w-4" /> Joined</Badge>
                        )}
                        
                        {isJoined && status === 'Ongoing' && LogSoulButton}
                        {isJoined && (status === 'Ongoing' || status === 'Past') && ShareTestimonyButton}
                        
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
