"use client";

import Link from "next/link";
import { format, parse, isSameDay, differenceInDays } from "date-fns";
import { CalendarDays, MapPin, Users, Share2, Edit, MoreHorizontal, Loader2, MessagesSquare, UserCheck, PlayCircle, Newspaper, UserPlus, ChevronDown, BarChart3, Target, Info, X, Camera, Upload } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, serverTimestamp, query, where, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import { useState, useRef, useEffect, useMemo } from "react";
import { Badge } from "../ui/badge";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn, safeToDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { JoinCampaignDialog } from "./join-campaign-dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageUpload } from "../common/image-upload";
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
                <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
                    <DialogHeader className="sr-only text-center">
                        <DialogTitle>Profile Photo</DialogTitle>
                        <DialogDescription>Full screen view of participant's photo.</DialogDescription>
                    </DialogHeader>
                    <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
                        <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
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
         <div className="space-y-6 pb-6 px-1 text-left text-left">
            {organizer && (
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 text-left">Organizer</h3>
                    <div className="flex items-center gap-3 rounded-2xl p-4 bg-muted/30 border border-dashed hover:bg-muted/40 transition-colors group relative text-left">
                        <LiveParticipantAvatar userId={organizer.userId} fallbackUrl={organizer.photoURL} fallbackInitials={organizer.firstName?.charAt(0)} className="h-10 w-10 border shadow-sm group-hover:scale-105 transition-transform" />
                        <Link 
                            href={`/profile/${organizer.userId}`}
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
              <div className="space-y-3 text-left">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 text-left">Members ({otherParticipants.length})</h3>
                <div className="space-y-3">
                  {otherParticipants.map(p => (
                    <div key={p.id} className="p-4 border rounded-2xl space-y-3 bg-background shadow-sm text-left text-left">
                      <div className="flex items-center gap-3 group relative text-left">
                        <LiveParticipantAvatar userId={p.userId} fallbackUrl={p.photoURL} fallbackInitials={p.firstName?.charAt(0)} className="h-9 w-9 text-xs border group-hover:scale-105 transition-transform" />
                        <Link 
                            href={`/profile/${p.userId}`}
                            className='font-bold text-sm hover:underline uppercase tracking-tight'
                            onClick={stopPropagation}
                        >
                            {p.firstName} {p.lastName}
                        </Link>
                        {p.userId === user?.uid && <span className="text-[10px] text-muted-foreground ml-auto opacity-60">You</span>}
                      </div>
                      {p.joinReason && (
                        <blockquote className="border-l-4 border-primary/20 pl-4 text-xs italic text-muted-foreground bg-primary/[0.02] py-2 rounded-r-xl text-left">
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
        <div className="text-center py-16 bg-muted/20 rounded-[2rem] border-2 border-dashed mx-1 text-left">
            <p className="text-sm text-muted-foreground px-10 leading-relaxed font-medium">Join this campaign to connect with the full participant directory.</p>
        </div>
      )}
    </ScrollArea>
  );

  if (mounted && isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent side="bottom" className="h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
          <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
            <SheetHeader className="text-left flex-shrink-0 text-left">
                <SheetTitle className="text-xl sm:text-2xl font-black font-headline leading-tight text-balance text-left">Participants Directory</SheetTitle>
                <SheetDescription className="text-sm font-medium text-left">
                {campaign.participants || 0} believers mobilized for "{campaign.title}".
                </SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-grow min-h-0 pt-6 px-8 text-left">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="rounded-3xl overflow-hidden p-0 max-w-md border-none shadow-2xl text-left flex flex-col max-h-[90dvh]">
        <div className="p-8 border-b bg-muted/10 text-left shrink-0">
            <DialogHeader className="text-left">
                <DialogTitle className="text-xl sm:text-2xl font-black font-headline leading-tight text-balance text-left">Participants for "{campaign.title}"</DialogTitle>
                <DialogDescription className="text-sm font-medium text-left">
                    {campaign.participants || 0} people have joined this mission.
                </DialogDescription>
            </DialogHeader>
        </div>
        <div className="flex-1 min-h-0 p-8 text-left">
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
        <div className="space-y-6 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-dashed flex items-start gap-3 text-left">
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0 text-left">
                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Meeting Point</p>
                        <p className="text-xs font-bold leading-snug text-balance break-words [overflow-wrap:anywhere]">{campaign.location}</p>
                    </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-dashed flex items-start gap-3 text-left">
                    <CalendarDays className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0 text-left">
                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Campaign Dates</p>
                        <p className="text-xs font-bold leading-snug">{dateStr}</p>
                    </div>
                </div>
            </div>
            
            <div className="p-6 rounded-[2rem] bg-background border shadow-inner relative overflow-hidden group/text text-left">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none text-left">
                    <Newspaper className="h-20 w-20 text-primary rotate-12" />
                </div>
                <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-wrap leading-relaxed font-medium relative z-10 text-balance break-words [overflow-wrap:anywhere]">
                    {campaign.description}
                </p>
            </div>

            {campaign.scripture && (
                <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 relative text-left">
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
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                        <div className="flex items-center gap-3 mb-2 text-left">
                            <Target className="h-5 w-5 text-primary" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Mission Overview</span>
                        </div>
                        <SheetHeader className="text-left flex-shrink-0 text-left">
                            <SheetTitle className="text-xl sm:text-2xl font-black font-headline leading-tight text-balance break-words [overflow-wrap:anywhere] text-left">{campaign.title}</SheetTitle>
                            <SheetDescription className="text-sm font-medium text-left">Full Mission Details & Vision</SheetDescription>
                        </SheetHeader>
                    </div>
                    <ScrollArea className="flex-grow text-left">
                        <div className="p-8 pb-32 text-left">
                            {dialogContent}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild onClick={stopPropagation}>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl text-left flex flex-col max-h-[90dvh]">
                <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
                    <div className="flex items-center gap-3 mb-2 text-left">
                        <Target className="h-5 w-5 text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Mission Overview</span>
                    </div>
                    <DialogHeader className="text-left text-left">
                        <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase leading-tight break-words [overflow-wrap:anywhere] text-left">{campaign.title}</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-left">Full Campaign Description</DialogDescription>
                    </DialogHeader>
                </div>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full">
                        <div className="p-8 text-left">
                            {dialogContent}
                        </div>
                    </ScrollArea>
                </div>
                <div className="p-6 border-t bg-muted/5 flex justify-end gap-3 shrink-0 text-left">
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-full px-8 font-bold">Close Details</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function QuickEvidenceDialog({ campaign, isOpen, onOpenChange }: { campaign: Campaign, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [isUploading, setIsUploading] = useState(false);
    const [photoUrl, setPhotoUrl] = useState('');
    const [stage, setStage] = useState<'preparatory' | 'ongoing'>('ongoing');

    const handleUpload = async () => {
        if (!user || !userProfile || !photoUrl || !firestore) return;
        setIsUploading(true);
        const itemData = {
            url: photoUrl,
            type: stage,
            authorId: user.uid,
            authorName: `${userProfile.firstName} ${userProfile.lastName}`,
            createdAt: serverTimestamp(),
        };
        try {
            await addDoc(collection(firestore, 'campaigns', campaign.id, 'gallery'), itemData);
            setPhotoUrl('');
            toast({ title: 'Evidence Saved', description: 'Your mission photo is now in the gallery.' });
            onOpenChange(false);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Upload Failed' });
        } finally {
            setIsUploading(false);
        }
    };

    const content = (
        <div className="p-8 space-y-8 text-left">
            <div className="space-y-4 text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Upload Stage</Label>
                <Select value={stage} onValueChange={(v: any) => setStage(v)}>
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                        <SelectItem value="preparatory">Preparatory Phase</SelectItem>
                        <SelectItem value="ongoing">Ongoing Mission</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-4 text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Photo Evidence</Label>
                <ImageUpload 
                    onUploadComplete={setPhotoUrl} 
                    storagePath="campaign-assets" 
                    cropAspect={4/3}
                />
            </div>

            <Button 
                onClick={handleUpload} 
                disabled={!photoUrl || isUploading}
                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20"
            >
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Upload className="h-5 w-5 mr-2" />}
                TRANSMIT EVIDENCE
            </Button>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onOpenChange}>
                <DrawerContent className="h-auto max-h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                    <div className="p-8 border-b bg-muted/10 text-left">
                        <DrawerHeader className="p-0 text-left">
                            <DrawerTitle className="text-2xl font-black font-headline text-left">Add Mission Evidence</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium mt-1">Capture the spiritual impact of "{campaign.title}".</DrawerDescription>
                        </DrawerHeader>
                    </div>
                    {content}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left">
                <div className="p-8 border-b bg-muted/10">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Mission Evidence</DialogTitle>
                        <DialogDescription className="text-sm font-medium mt-1">Capture and categorize mission proof.</DialogDescription>
                    </DialogHeader>
                </div>
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
  const [isUploadOpen, setIsUploadOpen] = useState(false);

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
    router.push(`/campaigns/${campaign.id}`);
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
      router.push(`/chats/${chatId}`);

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
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm text-left" onClick={(e) => { e.stopPropagation(); onShareTestimony(); }}>
            <Newspaper className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-left">
          <p>Share Testimony</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const LogSoulButton = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm text-left" onClick={(e) => { e.stopPropagation(); onLogSoul(); }}>
            <UserPlus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-left">
          <p>Log Soul Won</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );


  const shareButton = (
    <Button 
        variant="outline" 
        size="icon" 
        className="h-9 w-9 rounded-full shadow-sm text-left"
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
          "flex flex-col h-full w-full overflow-hidden transition-all duration-300 scroll-mt-48 border-t-4 cursor-pointer rounded-2xl border shadow-md sm:shadow-lg bg-card/50 backdrop-blur-sm text-left",
          borderColorClass
        )}
        onClick={handleCardClick}
      >
        <CardHeader className="p-4 sm:p-6 flex flex-col sm:flex-row items-start justify-between gap-4 pb-3 sm:pb-6 text-left text-left">
            <div className="flex-1 min-w-0 w-full text-left">
                <CardTitle className="font-bold text-lg md:text-xl leading-tight break-words [overflow-wrap:anywhere] text-balance text-left text-left">
                  {campaign.title}
                </CardTitle>
                <CardDescription className="text-sm mt-1 line-clamp-2 font-medium break-words [overflow-wrap:anywhere] text-left text-left">{campaign.goal}</CardDescription>
                {distance != null && (
                    <CardDescription className="text-xs text-primary font-black mt-2 flex items-center gap-1 uppercase tracking-widest text-left text-left">
                        <MapPin className="h-3 w-3 text-left" />
                        {distance.toFixed(1)} km away
                    </CardDescription>
                )}
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-none pt-3 sm:pt-0 text-left">
              <div className="flex items-center gap-2 text-left">
                {(isJoined || isOwner) && (
                    <TooltipProvider>
                        <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 sm:h-10 sm:w-10 border-primary/20 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-full shadow-md bg-background text-left" 
                            onClick={(e) => { e.stopPropagation(); setIsUploadOpen(true); }}
                            >
                            <Camera className="h-4 w-4 sm:h-5 w-5 text-left" />
                            <span className="sr-only text-left text-left text-left">Add Evidence</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-left text-left">
                            <p className="text-[10px] font-bold uppercase text-left">Add Mission Evidence</p>
                        </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-9 w-9 sm:h-10 sm:w-10 border-primary/20 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-full shadow-md bg-background text-left" 
                        onClick={(e) => { e.stopPropagation(); router.push(`/campaigns/${campaign.id}`); }}
                      >
                        <BarChart3 className="h-4 w-4 sm:h-5 w-5 text-left" />
                        <span className="sr-only text-left text-left text-left">View Insights</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-left text-left">
                      <p className="text-[10px] font-bold uppercase text-left">Kingdom Insights</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Badge variant={status === 'Ongoing' ? 'default' : status === 'Upcoming' ? 'secondary' : 'outline'} className="uppercase font-bold tracking-widest text-[9px] sm:text-[10px] h-6 px-2 text-left text-left">
                  {status}
              </Badge>
            </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 flex-grow space-y-4 text-left">
            
            <div className="space-y-1 text-left">
                <p ref={descriptionRef} className="text-muted-foreground text-sm line-clamp-3 leading-relaxed font-medium break-words [overflow-wrap:anywhere] text-left text-left">{campaign.description}</p>
                {isDescriptionTruncated && (
                    <FullDescriptionDialog campaign={campaign}>
                        <Button variant="link" className="p-0 h-auto text-sm font-bold text-primary text-left text-left">Read More</Button>
                    </FullDescriptionDialog>
                )}
            </div>
            
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-left">
                <div className="rounded-2xl border-2 border-dashed p-3.5 flex items-start gap-3 bg-background/30 min-h-[6rem] h-auto text-left text-left">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5 text-left" />
                    <div className="min-w-0 flex-1 text-left">
                        <p className="font-black text-[10px] uppercase tracking-widest text-muted-foreground text-left">Location</p>
                        <p className="font-bold text-foreground break-words [overflow-wrap:anywhere] leading-snug line-clamp-3 text-left">{campaign.location}</p>
                    </div>
                </div>
                <div className="rounded-2xl border-2 border-dashed p-3.5 flex items-start gap-3 bg-background/30 min-h-[6rem] h-auto text-left text-left">
                    <CalendarDays className="h-5 w-5 text-primary shrink-0 mt-0.5 text-left" />
                    <div className="min-w-0 flex-1 text-left">
                        <p className="font-black text-[10px] uppercase tracking-widest text-muted-foreground text-left">Schedule</p>
                        <p className="font-bold text-foreground leading-snug line-clamp-2 text-left">{dateString}</p>
                        <p className="text-[10px] font-black uppercase text-primary/70 mt-1 truncate text-left">{timeString}</p>
                    </div>
                </div>
            </div>

        </CardContent>
        <CardFooter className="p-4 sm:p-6 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-auto border-t bg-background/20 backdrop-blur-sm text-left">
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs font-bold uppercase tracking-tighter text-muted-foreground text-left text-left">
                <ParticipantsDialog campaign={campaign}>
                    <Button variant="ghost" className="h-auto p-0 justify-start text-xs font-bold text-muted-foreground hover:bg-transparent hover:text-primary transition-colors text-left" onClick={stopPropagation}>
                        <Users className="h-4 w-4" />
                        <span className="ml-1.5 text-left text-left text-left">
                            {campaign.participants} {campaign.participants === 1 ? 'MEMBER' : 'MEMBERS'}
                        </span>
                    </Button>
                </ParticipantsDialog>
                {(status === "Ongoing") && (
                    <div className="flex items-center gap-1.5 text-primary text-left">
                        <UserCheck className="h-4 w-4 text-left" />
                        <span className="text-left"> {campaign.soulsLogged || 0} SOULS WON</span>
                    </div>
                )}
            </div>

            <div className="w-full sm:w-auto flex items-center flex-wrap justify-end gap-2 text-left" onClick={stopPropagation}>
                {status === 'Ongoing' && campaign.streamUrl && (
                    <Button asChild className="w-full sm:w-auto font-black rounded-xl shadow-lg h-9 text-left">
                        <Link href={campaign.streamUrl} target="_blank" rel="noopener noreferrer" className="text-left text-left">
                            <PlayCircle className="mr-2 h-4 w-4" />
                            WATCH LIVE
                        </Link>
                    </Button>
                )}

                {isOwner ? (
                    <div onClick={stopPropagation} className="flex items-center gap-2 text-left">
                      {status === "Ongoing" && LogSoulButton}
                      {(status === 'Ongoing' || status === 'Past') && ShareTestimonyButton}
                      <Button variant="outline" size="sm" className="h-9 rounded-xl gap-2 font-black uppercase tracking-widest text-[10px] shadow-sm border-primary/20 text-primary hover:bg-primary/5 text-left" onClick={(e) => { e.stopPropagation(); onManage(); }}>
                          <Edit className="h-4 w-4" />
                          MANAGE
                      </Button>
                      {shareButton}
                    </div>
                ) : (
                    <div onClick={stopPropagation} className="flex items-center gap-2 text-left text-left">
                        {!isJoined && status !== 'Past' && (
                            <Button className="font-black rounded-xl shadow-lg h-9 text-left" onClick={(e) => {
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
                            <Badge variant="secondary" className="flex items-center gap-2 py-1.5 px-3 h-9 font-black rounded-xl bg-primary/10 text-primary border-primary/20 shrink-0 text-left"><UserCheck className="h-4 w-4" /> JOINED</Badge>
                        )}
                        
                        {isJoined && status === 'Ongoing' && LogSoulButton}
                        {isJoined && (status === 'Ongoing' || status === 'Past') && ShareTestimonyButton}
                        
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={handleInitiateChat} variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm text-left" disabled={!userId || isChatLoading}>
                                         {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessagesSquare className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-left"><p className="text-[10px] font-bold uppercase text-left">Chat with Organizer</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        {shareButton}
                    </div>
                )}
            </div>
        </CardFooter>
        <CardFooter className="p-3 bg-black/5 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex justify-between text-left">
            <span className="truncate min-w-0 flex-1 mr-4 text-left">
                BY{" "}
                <Link href={`/profile/${campaign.organizerId}`} onClick={stopPropagation} className="text-primary hover:underline truncate text-left">
                    {campaign.organizerFirstName} {campaign.organizerLastName}
                </Link>
            </span>
            <span className="flex-shrink-0 opacity-60 text-left">{footerDateText}</span>
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

      {isUploadOpen && (
          <QuickEvidenceDialog 
            campaign={campaign}
            isOpen={isUploadOpen}
            onOpenChange={setIsUploadOpen}
          />
      )}
    </>
  );
}
