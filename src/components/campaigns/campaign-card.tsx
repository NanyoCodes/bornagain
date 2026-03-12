
"use client";

import Link from "next/link";
import { format, parse, isSameDay, differenceInDays } from "date-fns";
import { CalendarDays, MapPin, Users, Share2, Edit, MoreVertical, Loader2, MessagesSquare, UserCheck2, PlayCircle, UserPlus, Newspaper, CheckCircle2 } from "lucide-react";
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
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, serverTimestamp, query, where, limit, getDocs, addDoc, doc, runTransaction, getDoc } from "firebase/firestore";
import { useState, useRef, useEffect, useMemo } from "react";
import { ManageCampaignForm } from "./manage-campaign-form";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { LogSoulForm } from "../souls/log-soul-form";
import { CreateTestimonyForm } from "../testimonies/create-testimony-form";
import { Badge } from "../ui/badge";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { JoinCampaignDialog } from "./join-campaign-dialog";
import { ScrollArea } from "../ui/scroll-area";
import { safeToDate } from "@/lib/utils";


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
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
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
                    <h3 className="text-sm font-semibold text-muted-foreground">PARTICIPANTS ({otherParticipants.length})</h3>
                    <div className="space-y-2">
                      {otherParticipants.map(p => (
                        <div key={p.id} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className='font-medium'>{p.firstName} {p.lastName}</span>
                            {p.email && <span className="text-sm text-muted-foreground">{p.email}</span>}
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

function ScriptureDisplay({ reference, caption }: { reference: string; caption?: string; }) {
  const [scriptureText, setScriptureText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scriptureRef = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [showFullScripture, setShowFullScripture] = useState(false);

  useEffect(() => {
    if (!reference) {
        setIsLoading(false);
        return;
    };

    setIsLoading(true);
    setScriptureText(null);
    setError(null);
    setIsTruncated(false);

    const fetchScripture = async () => {
      try {
        const response = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch scripture. Status: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        setScriptureText(data.text.trim());
      } catch (e: any) {
        console.warn(`Could not fetch scripture for "${reference}":`, e.message);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScripture();
  }, [reference]);

  useEffect(() => {
    const checkTruncation = () => {
      if (scriptureRef.current) {
        setIsTruncated(scriptureRef.current.scrollHeight > scriptureRef.current.clientHeight);
      }
    };
    if (scriptureText) {
      // Delay to allow for rendering
      const timeoutId = setTimeout(checkTruncation, 100);
      window.addEventListener('resize', checkTruncation);
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', checkTruncation);
      };
    }
  }, [scriptureText]);

  if (isLoading) {
    return (
        <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-1/2" />
        </div>
    );
  }

  // Fallback to old display if fetch fails or reference is bad
  if (error || !scriptureText) {
    if (caption) {
        return (
            <blockquote className="mt-4 border-l-2 pl-4 italic">
                &ldquo;{caption}&rdquo;
                <footer className="text-right text-sm not-italic mt-2">- Inspired by {reference}</footer>
            </blockquote>
        );
    }
    return (
         <div className="mt-4 text-sm text-muted-foreground">
            <span className="font-semibold">Inspirational Scripture:</span> {reference}
        </div>
    );
  }

  // Success display
  return (
    <blockquote className="mt-4 border-l-2 pl-4 italic">
        <p ref={scriptureRef} className="line-clamp-3">&ldquo;{scriptureText}&rdquo;</p>
        {isTruncated && (
            <Dialog open={showFullScripture} onOpenChange={setShowFullScripture}>
                <DialogTrigger asChild>
                    <Button variant="link" className="p-0 h-auto text-sm -mt-1" onClick={(e) => e.stopPropagation()}>Read More</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{reference}</DialogTitle>
                        <DialogDescription>Full scripture text.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] pr-4">
                        <p className="whitespace-pre-wrap">&ldquo;{scriptureText}&rdquo;</p>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        )}
        <footer className="text-right text-sm not-italic mt-2">
            - {reference}
            {caption && <div className="mt-1 opacity-80">&ldquo;{caption}&rdquo;</div>}
        </footer>
    </blockquote>
  );
}


export function CampaignCard({ campaign, userId, userProfile, isJoined }: { campaign: Campaign; userId?: string, userProfile?: UserProfile | null, isJoined: boolean }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const isOwner = campaign.organizerId === userId;
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isLogSoulOpen, setIsLogSoulOpen] = useState(false);
  const [isTestimonyDialogOpen, setIsTestimonyDialogOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const [isDescriptionTruncated, setIsDescriptionTruncated] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleViewGroupChat = () => {
    if (!campaign.id) return;
    
    if (campaign.hasGroupChat) {
        router.push(`/dashboard/chats/${campaign.id}`);
    } else {
        toast({
            title: "Group Chat Not Started",
            description: "The organizer has not started the group chat for this campaign yet.",
        });
    }
  };
  
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
                      email: user.email || '',
                  },
                  [campaign.organizerId]: {
                      firstName: campaign.organizerFirstName,
                      lastName: campaign.organizerLastName,
                      photoURL: organizerProfile?.photoURL || '', 
                      email: organizerProfile?.email || '',
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

  const LogSoulDialog = (
    <Dialog open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <UserCheck2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Log Soul</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

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
            defaultCampaign={campaign}
          />
        </div>
      </DialogContent>
    </Dialog>
  );

  const ShareTestimonyDialog = (
    <Dialog open={isTestimonyDialogOpen} onOpenChange={setIsTestimonyDialogOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Newspaper className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Share Testimony</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Testimony for "{campaign.title}"</DialogTitle>
          <DialogDescription>
            Encourage others by sharing what God has done during this campaign.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-2">
          <CreateTestimonyForm
            onTestimonyCreated={() => {
              setIsTestimonyDialogOpen(false);
              toast({ title: "Testimony Shared!", description: "Thank you for sharing." });
            }}
            campaign={campaign}
          />
        </div>
      </DialogContent>
    </Dialog>
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

  const isFull = campaign.maxParticipants && campaign.participants >= campaign.maxParticipants;
  const joinButtonDisabled = !userId || status === 'Past' || isFull;

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
                <CardTitle className="font-bold text-xl truncate">
                  {campaign.title}
                </CardTitle>
                <CardDescription className="text-sm mt-1 truncate">{campaign.goal}</CardDescription>
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
            
            {campaign.scripture && (
                <ScriptureDisplay reference={campaign.scripture} caption={campaign.scriptureTestimony} />
            )}

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
                      {isJoined && (status === 'Ongoing' || status === 'Past') && ShareTestimonyDialog}
                      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Manage Campaign</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
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
                      {shareButton}
                    </div>
                ) : isJoined ? (
                     <div onClick={stopPropagation} className="flex items-center gap-2">
                        {(status === 'Ongoing' || status === 'Past') && ShareTestimonyDialog}
                         <TooltipProvider>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button onClick={handleViewGroupChat} variant="outline" size="icon" disabled={status === 'Past'}>
                                      <Users className="h-4 w-4" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Group Chat</p></TooltipContent>
                          </Tooltip>
                         </TooltipProvider>
                        {shareButton}
                        <Button disabled><CheckCircle2 className="h-4 w-4"/> Joined</Button>
                    </div>
                ) : (
                    <div onClick={stopPropagation} className="flex items-center gap-2">
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
                        <Button onClick={() => setIsJoinDialogOpen(true)} disabled={joinButtonDisabled}>
                           {isFull ? 'Full' : 'Join'}
                        </Button>
                    </div>
                )}
            </div>
        </CardFooter>
        <CardFooter className="p-4 bg-muted/20 text-xs text-muted-foreground flex justify-between">
            <span className="truncate">
                Created by{" "}
                <Link href={`/dashboard/profile/${campaign.organizerId}`} className="font-medium text-primary hover:underline px-1" onClick={stopPropagation}>
                    {campaign.organizerFirstName} {campaign.organizerLastName}
                </Link>
            </span>
            <span className="flex-shrink-0">{footerDateText}</span>
        </CardFooter>
      </Card>
      {userProfile && (
          <JoinCampaignDialog
            campaign={campaign}
            userProfile={userProfile}
            isOpen={isJoinDialogOpen}
            onOpenChange={setIsJoinDialogOpen}
            onCampaignJoined={() => {
              // Re-fetch is handled by useCollection
            }}
          />
      )}
    </>
  );
}
