"use client";

import Link from "next/link";
import { format, parse, isSameDay, differenceInDays } from "date-fns";
import { CalendarDays, MapPin, Users, Share2, Edit, MoreHorizontal, Loader2, MessagesSquare, UserCheck, PlayCircle, Newspaper, UserPlus, ChevronDown, BarChart3, Target, Info, X } from "lucide-react";
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
  SheetTrigger,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, serverTimestamp, query, where, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import { useState, useRef, useEffect, useMemo } from "react";
import { Badge } from "../ui/badge";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn, safeToDate, haversineDistance } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { JoinCampaignDialog } from "./join-campaign-dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";

/**
 * Ensures the profile photo displayed in the directory is always the most recent version.
 */
function LiveParticipantAvatar({ userId, fallbackUrl, fallbackInitials, className }: { userId: string, fallbackUrl?: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userRef = useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const currentPhotoUrl = profile?.photoURL || fallbackUrl;
    
    return (
        <Dialog>
            <DialogTrigger asChild disabled={!currentPhotoUrl}>
                <Avatar className={cn(className, currentPhotoUrl && "cursor-pointer active:scale-95 transition-transform hover:scale-105")}>
                    <AvatarImage src={currentPhotoUrl} className="object-cover" />
                    <AvatarFallback className="font-bold bg-primary/10 text-primary">{fallbackInitials}</AvatarFallback>
                </Avatar>
            </DialogTrigger>
            {currentPhotoUrl && (
                <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Profile Photo</DialogTitle>
                        <DialogDescription>Full screen view of participant's photo.</DialogDescription>
                    </DialogHeader>
                    <div className="relative h-full w-full flex items-center justify-center p-4">
                        <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center">
                            <Image 
                                src={currentPhotoUrl} 
                                alt="Participant" 
                                fill 
                                className="object-contain shadow-2xl ring-4 ring-white/10" 
                                unoptimized 
                            />
                        </div>
                    </div>
                </DialogContent>
            )}
        </Dialog>
    );
}

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
    if (!isOpen || !firestore || !user) return null;
    return query(collection(firestore, 'campaigns', campaign.id, 'participants'));
  }, [isOpen, firestore, campaign.id, user]);

  const { data: participants, loading } = useCollection<CampaignParticipant>(participantsQuery);
  
  const organizer = useMemo(() => participants?.find(p => p.userId === campaign.organizerId), [participants, campaign.organizerId]);
  const otherParticipants = useMemo(() => participants?.filter(p => p.userId !== campaign.organizerId), [participants, campaign.organizerId]);

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const content = (
    <ScrollArea className={cn("pr-4", isMobile ? "h-full" : "max-h-[60vh]")}>
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-2xl" />
        </div>
      ) : participants ? (
         <div className="space-y-6 pb-6 px-1">
            {organizer && (
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Organizer</h3>
                    <div className="flex items-center gap-3 rounded-2xl p-4 bg-muted/30 border border-dashed hover:bg-muted/40 transition-colors group relative">
                        <LiveParticipantAvatar userId={organizer.userId} fallbackUrl={organizer.photoURL} fallbackInitials={organizer.firstName?.charAt(0)} className="h-10 w-10 border shadow-sm group-hover:scale-105 transition-transform" />
                        <Link 
                            href={organizer.userId === user?.uid ? '/dashboard/profile' : `/dashboard/profile/${organizer.userId}`}
                            className='font-bold text-sm sm:text-base hover:underline uppercase tracking-tight'
                            onClick={stopPropagation}
                        >
                            {organizer.firstName} {organizer.lastName}
                        </Link>
                        {organizer.userId === user?.uid && <span className="text-[10px] text-muted-foreground ml-auto opacity-60">You</span>}
                    </div>
                </div>
            )}
            {otherParticipants && otherParticipants.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Members ({otherParticipants.length})</h3>
                <div className="space-y-3">
                  {otherParticipants.map(p => (
                    <div key={p.id} className="p-4 border rounded-2xl space-y-3 bg-background shadow-sm">
                      <div className="flex items-center gap-3 group relative">
                        <LiveParticipantAvatar userId={p.userId} fallbackUrl={p.photoURL} fallbackInitials={p.firstName?.charAt(0)} className="h-9 w-9 text-xs border group-hover:scale-105 transition-transform" />
                        <Link 
                            href={p.userId === user?.uid ? '/dashboard/profile' : `/dashboard/profile/${p.userId}`}
                            className='font-bold text-sm hover:underline uppercase tracking-tight'
                            onClick={stopPropagation}
                        >
                            {p.firstName} {p.lastName}
                        </Link>
                        {p.userId === user?.uid && <span className="text-[10px] text-muted-foreground ml-auto opacity-60">You</span>}
                      </div>
                      {p.joinReason && (
                        <blockquote className="border-l-4 border-primary/20 pl-4 text-xs italic text-muted-foreground bg-primary/[0.02] py-2 rounded-r-xl">
                            &ldquo;{p.joinReason}&rdquo;
                        </blockquote>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {otherParticipants?.length === 0 && participants?.length > 0 && (
                <p className="text-center text-muted-foreground py-12 text-sm italic px-8">No other believers have joined this mission yet. Share the campaign to invite others!</p>
            )}
        </div>
      ) : (
        <div className="text-center py-16 bg-muted/20 rounded-[2rem] border-2 border-dashed mx-1">
            <p className="text-sm text-muted-foreground px-10 leading-relaxed font-medium">Join this campaign to connect with the full participant directory.</p>
        </div>
      )}
    </ScrollArea>
  );

  if (mounted && isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent side="bottom" className="h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem]">
          <div className="p-8 border-b flex-shrink-0 bg-muted/10">
            <SheetHeader className="text-left flex-shrink-0">
                <SheetTitle className="text-xl sm:text-2xl font-black font-headline leading-tight text-balance">Participants Directory</SheetTitle>
                <SheetDescription className="text-sm font-medium">
                {campaign.participants || 0} believers mobilized for "{campaign.title}".
                </SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-grow min-h-0 pt-6 px-8">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="rounded-3xl overflow-hidden p-0 max-w-md border-none shadow-2xl">
        <div className="p-8 border-b bg-muted/10">
            <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl font-black font-headline leading-tight text-balance">Participants for "{campaign.title}"</DialogTitle>
                <DialogDescription className="text-sm font-medium">
                    {campaign.participantCount || 0} people have joined this mission.
                </DialogDescription>
            </DialogHeader>
        </div>
        <div className="p-8">
            {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FullDescriptionDialog({ campaign, children }: { campaign: Campaign, children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const startDate = safeToDate(campaign.startDate);
    const endDate = safeToDate(campaign.endDate);
    const dateStr = useMemo(() => {
        if (startDate && endDate) {
            if (isSameDay(startDate, endDate)) return format(startDate, "PPP");
            return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
        }
        return "Date not set";
    }, [startDate, endDate]);

    const stopPropagation = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const dialogContent = (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-dashed flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Meeting Point</p>
                        <p className="text-xs font-bold leading-snug text-balance break-words [overflow-wrap:anywhere]">{campaign.location}</p>
                    </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-dashed flex items-start gap-3">
                    <CalendarDays className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Campaign Dates</p>
                        <p className="text-xs font-bold leading-snug">{dateStr}</p>
                    </div>
                </div>
            </div>
            
            <div className="p-6 rounded-[2rem] bg-background border shadow-inner relative overflow-hidden group/text">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                    <Newspaper className="h-20 w-20 text-primary rotate-12" />
                </div>
                <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-wrap leading-relaxed font-medium relative z-10 text-balance break-words [overflow-wrap:anywhere]">
                    {campaign.description}
                </p>
            </div>

            {campaign.scripture && (
                <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 relative">
                    <span className="absolute -top-3 left-6 bg-background px-3 text-[10px] font-black text-primary uppercase tracking-[0.2em]">Inspirational Word</span>
                    <p className="italic text-base text-primary font-serif leading-relaxed text-left text-balance break-words [overflow-wrap:anywhere]">&ldquo;{campaign.scriptureTestimony || campaign.scripture}&rdquo;</p>
                    <p className="text-[10px] font-black uppercase text-primary/60 text-right mt-3 tracking-widest break-words [overflow-wrap:anywhere]">— {campaign.scripture}</p>
                </div>
            )}
        </div>
    );

    if (!mounted) return <>{children}</>;

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild onClick={stopPropagation}>{children}</SheetTrigger>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                    <div className="p-8 border-b bg-muted/10 flex-shrink-0">
                        <div className="flex items-center gap-3 mb-2">
                            <Target className="h-5 w-5 text-primary" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Mission Overview</span>
                        </div>
                        <SheetHeader className="text-left">
                            <SheetTitle className="text-xl sm:text-2xl font-black font-headline leading-tight text-balance break-words [overflow-wrap:anywhere]">{campaign.title}</SheetTitle>
                            <SheetDescription className="text-sm font-medium">Full Mission Details & Vision</SheetDescription>
                        </SheetHeader>
                    </div>
                    <ScrollArea className="flex-grow">
                        <div className="p-8 pb-32">
                            {dialogContent}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                <div className="p-8 border-b bg-muted/10">
                    <div className="flex items-center gap-3 mb-2">
                        <Target className="h-5 w-5 text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Mission Overview</span>
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase leading-tight text-balance break-words [overflow-wrap:anywhere]">{campaign.title}</DialogTitle>
                        <DialogDescription className="text-sm font-medium">Full Campaign Description</DialogDescription>
                    </DialogHeader>
                </div>
                <ScrollArea className="max-h-[70vh]">
                    <div className="p-8">
                        {dialogContent}
                    </div>
                </ScrollArea>
                <div className="p-6 border-t bg-muted/5 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-full px-8 font-bold">Close Details</Button>
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
         const ownerDoc = await getDoc(doc(firestore, "users", campaign.organizerId));
         const organizerProfile = ownerDoc.data() as UserProfile | undefined;
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


  const handleShare = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const shareUrl = `${window.location.origin}/campaigns/${campaign.id}`;
    const shareData = {
      title: `Join the '${campaign.title}' campaign on Testify!`,
      text: `Join me in the '${campaign.title}' evangelism campaign. Let's make an impact together!`,
      url: shareUrl,
    };

    try {
      if (navigator && navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Share API not supported');
      }
    } catch (err: any) {
        if (err.name === 'AbortError') return;
        
        try {
          await navigator.clipboard.writeText(`${shareData.title} ${shareUrl}`);
          toast({ title: 'Link Copied!', description: 'Campaign link has been copied to your clipboard.' });
        } catch (clipErr) {
          console.error("Clipboard fallback failed", clipErr);
        }
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
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm" onClick={(e) => { e.stopPropagation(); onShareTestimony(); }}>
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
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm" onClick={(e) => { e.stopPropagation(); onLogSoul(); }}>
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
    <Button 
        variant="outline" 
        size="icon" 
        className="h-9 w-9 rounded-full shadow-sm"
        onClick={handleShare} 
        disabled={status === 'Past'}
    >
        <Share2 className="h-4 w-4" />
        <span className="sr-only">Share Campaign</span>
    </Button>
  );


  return (
    <>
      <Card
        id={campaign.id}
        className={cn(
          "flex flex-col h-full w-full overflow-hidden transition-all duration-300 scroll-mt-48 border-t-4 cursor-pointer rounded-2xl border shadow-md sm:shadow-lg bg-card/50 backdrop-blur-sm",
          borderColorClass
        )}
        onClick={handleCardClick}
      >
        <CardHeader className="p-4 sm:p-6 flex flex-col sm:flex-row items-start justify-between gap-4 pb-3 sm:pb-6">
            <div className="flex-1 min-w-0 w-full">
                <CardTitle className="font-bold text-lg md:text-xl leading-tight break-words [overflow-wrap:anywhere] text-balance">
                  {campaign.title}
                </CardTitle>
                <CardDescription className="text-sm mt-1 line-clamp-2 font-medium break-words [overflow-wrap:anywhere]">{campaign.goal}</CardDescription>
                {distance != null && (
                    <CardDescription className="text-xs text-primary font-black mt-2 flex items-center gap-1 uppercase tracking-widest">
                        <MapPin className="h-3 w-3" />
                        {distance.toFixed(1)} km away
                    </CardDescription>
                )}
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-none pt-3 sm:pt-0">
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-9 w-9 sm:h-10 sm:w-10 border-primary/20 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-full shadow-md bg-background" 
                        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/campaigns/${campaign.id}`); }}
                      >
                        <BarChart3 className="h-4 w-4 sm:h-5 w-5" />
                        <span className="sr-only">View Insights</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-[10px] font-bold uppercase">Kingdom Insights</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Badge variant={status === 'Ongoing' ? 'default' : status === 'Upcoming' ? 'secondary' : 'outline'} className="uppercase font-bold tracking-widest text-[9px] sm:text-[10px] h-6 px-2">
                  {status}
              </Badge>
            </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 flex-grow space-y-4">
            
            <div className="space-y-1">
                <p ref={descriptionRef} className="text-muted-foreground text-sm line-clamp-3 leading-relaxed font-medium break-words [overflow-wrap:anywhere] text-left">{campaign.description}</p>
                {isDescriptionTruncated && (
                    <FullDescriptionDialog campaign={campaign}>
                        <Button variant="link" className="p-0 h-auto text-sm font-bold text-primary">Read More</Button>
                    </FullDescriptionDialog>
                )}
            </div>
            
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border-2 border-dashed p-3.5 flex items-start gap-3 bg-background/30 min-h-[6rem] h-auto">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                        <p className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Location</p>
                        <p className="font-bold text-foreground break-words [overflow-wrap:anywhere] leading-snug line-clamp-3 text-left">{campaign.location}</p>
                    </div>
                </div>
                <div className="rounded-2xl border-2 border-dashed p-3.5 flex items-start gap-3 bg-background/30 min-h-[6rem] h-auto">
                    <CalendarDays className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                        <p className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Schedule</p>
                        <p className="font-bold text-foreground leading-snug line-clamp-2">{dateString}</p>
                        <p className="text-[10px] font-black uppercase text-primary/70 mt-1 truncate">{timeString}</p>
                    </div>
                </div>
            </div>

        </CardContent>
        <CardFooter className="p-4 sm:p-6 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-auto border-t bg-background/20 backdrop-blur-sm">
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs font-bold uppercase tracking-tighter text-muted-foreground">
                <ParticipantsDialog campaign={campaign}>
                    <Button variant="ghost" className="h-auto p-0 justify-start text-xs font-bold text-muted-foreground hover:bg-transparent hover:text-primary transition-colors" onClick={stopPropagation}>
                        <Users className="h-4 w-4" />
                        <span className="ml-1.5">
                            {campaign.participants} {campaign.participants === 1 ? 'MEMBER' : 'MEMBERS'}
                        </span>
                    </Button>
                </ParticipantsDialog>
                {(status === "Ongoing") && (
                    <div className="flex items-center gap-1.5 text-primary">
                        <UserCheck className="h-4 w-4" />
                        <span>{campaign.soulsLogged || 0} SOULS WON</span>
                    </div>
                )}
            </div>

            <div className="w-full sm:w-auto flex items-center flex-wrap justify-end gap-2" onClick={stopPropagation}>
                {status === 'Ongoing' && campaign.streamUrl && (
                    <Button asChild className="w-full sm:w-auto font-black rounded-xl shadow-lg h-9">
                        <Link href={campaign.streamUrl} target="_blank" rel="noopener noreferrer">
                            <PlayCircle className="mr-2 h-4 w-4" />
                            WATCH LIVE
                        </Link>
                    </Button>
                )}

                {isOwner ? (
                    <div onClick={stopPropagation} className="flex items-center gap-2">
                      {status === "Ongoing" && LogSoulButton}
                      {(status === 'Ongoing' || status === 'Past') && ShareTestimonyButton}
                      <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm" onClick={(e) => { e.stopPropagation(); onManage(); }}>
                                    <Edit className="h-4 w-4" /><span className="sr-only">Manage Campaign</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-[10px] font-bold uppercase">Manage Mission</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {shareButton}
                    </div>
                ) : (
                    <div onClick={stopPropagation} className="flex items-center gap-2">
                        {!isJoined && status !== 'Past' && (
                            <Button className="font-black rounded-xl shadow-lg h-9" onClick={(e) => {
                                e.stopPropagation();
                                if (!userProfile) {
                                    toast({ variant: 'destructive', title: 'Please log in to join.' });
                                    return;
                                }
                                setIsJoinDialogOpen(true);
                            }}>
                                JOIN MISSION
                            </Button>
                        )}
                        {isJoined && (
                            <Badge variant="secondary" className="flex items-center gap-2 py-1.5 px-3 h-9 font-black rounded-xl bg-primary/10 text-primary border-primary/20"><UserCheck className="h-4 w-4" /> JOINED</Badge>
                        )}
                        
                        {isJoined && status === 'Ongoing' && LogSoulButton}
                        {isJoined && (status === 'Ongoing' || status === 'Past') && ShareTestimonyButton}
                        
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={handleInitiateChat} variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm" disabled={!userId || isChatLoading}>
                                         {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessagesSquare className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p className="text-[10px] font-bold uppercase">Chat with Organizer</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        {shareButton}
                    </div>
                )}
            </div>
        </CardFooter>
        <CardFooter className="p-3 bg-black/5 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex justify-between">
            <span className="truncate min-w-0 flex-1 mr-4">
                BY{" "}
                <Link href={isOwner ? '/dashboard/profile' : `/dashboard/profile/${campaign.organizerId}`} onClick={stopPropagation} className="text-primary hover:underline truncate">
                    {campaign.organizerFirstName} {campaign.organizerLastName}
                </Link>
            </span>
            <span className="flex-shrink-0 opacity-60">{footerDateText}</span>
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