"use client";

import * as React from "react";
import { format, isSameDay } from "date-fns";
import { 
  CalendarDays, 
  MapPin, 
  Users, 
  Share2, 
  PlayCircle, 
  Loader2, 
  UserCheck, 
  Sparkles, 
  MoreVertical, 
  Trash2, 
  MessagesSquare, 
  Edit 
} from "lucide-react";
import type { Event, UserProfile, EventParticipant, Chat } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { 
  collection, 
  serverTimestamp, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  getDoc, 
  runTransaction, 
  writeBatch, 
  arrayUnion, 
  updateDoc 
} from "firebase/firestore";
import { Badge } from "../ui/badge";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn, safeToDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";

interface EventCardProps {
    event: Event;
    isJoined: boolean;
    userProfile: UserProfile | null;
    onEdit: () => void;
    onDelete: () => void;
}

/**
 * Ensures the profile photo displayed in the directory is always the most recent version.
 */
function LiveParticipantAvatar({ userId, fallbackUrl, fallbackInitials, className }: { userId: string, fallbackUrl?: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userDocRef = React.useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userDocRef);
    const currentPhotoUrl = profile?.photoURL || fallbackUrl;
    
    return (
        <Avatar className={className}>
            <AvatarImage src={currentPhotoUrl} className="object-cover" />
            <AvatarFallback className="font-bold bg-primary/10 text-primary">{fallbackInitials}</AvatarFallback>
        </Avatar>
    );
}

function ParticipantsDialog({ campaign, children }: { campaign: Event; children: React.ReactNode; }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isOpen, setIsOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const participantsQuery = React.useMemo(() => {
    if (!isOpen || !firestore || !user) return null;
    return query(collection(firestore, 'events', campaign.id, 'participants'));
  }, [isOpen, firestore, campaign.id, user]);

  const { data: participants, loading } = useCollection<EventParticipant>(participantsQuery);
  
  const organizer = React.useMemo(() => participants?.find(p => p.userId === campaign.organizerId), [participants, campaign.organizerId]);
  const otherParticipants = React.useMemo(() => participants?.filter(p => p.userId !== campaign.organizerId), [participants, campaign.organizerId]);

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
                    <Link 
                        href={organizer.userId === user?.uid ? '/dashboard/profile' : `/dashboard/profile/${organizer.userId}`}
                        className="flex items-center gap-3 rounded-2xl p-4 bg-muted/30 border border-dashed hover:bg-muted/40 transition-colors group"
                        onClick={stopPropagation}
                    >
                        <LiveParticipantAvatar userId={organizer.userId} fallbackUrl={organizer.photoURL} fallbackInitials={organizer.firstName?.charAt(0)} className="h-10 w-10 border shadow-sm group-hover:scale-105 transition-transform" />
                        <span className='font-bold text-sm sm:text-base group-hover:underline uppercase tracking-tight'>{organizer.firstName} {organizer.lastName}</span>
                        {organizer.userId === user?.uid && <span className="text-[10px] text-muted-foreground ml-auto opacity-60">You</span>}
                    </Link>
                </div>
            )}
            {otherParticipants && otherParticipants.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Members ({otherParticipants.length})</h3>
                <div className="space-y-3">
                  {otherParticipants.map(p => (
                    <div key={p.id} className="p-4 border rounded-2xl space-y-3 bg-background shadow-sm">
                      <Link 
                        href={p.userId === user?.uid ? '/dashboard/profile' : `/dashboard/profile/${p.userId}`}
                        className="flex items-center gap-3 group"
                        onClick={stopPropagation}
                      >
                        <LiveParticipantAvatar userId={p.userId} fallbackUrl={p.photoURL} fallbackInitials={p.firstName?.charAt(0)} className="h-9 w-9 text-xs border group-hover:scale-105 transition-transform" />
                        <span className='font-bold text-sm group-hover:underline uppercase tracking-tight'>{p.firstName} {p.lastName}</span>
                        {p.userId === user?.uid && <span className="text-[10px] text-muted-foreground ml-auto opacity-60">You</span>}
                      </Link>
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
                {campaign.participantCount || 0} believers mobilized for "{campaign.title}".
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

function LiveAuthor({ userId, fallbackInitials }: { userId: string, fallbackInitials: string }) {
    const firestore = useFirestore();
    const userDocRef = React.useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userDocRef);
    
    return (
      <Avatar className="h-5 w-5 border shadow-sm">
        <AvatarImage src={profile?.photoURL} className="object-cover" />
        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{fallbackInitials || 'U'}</AvatarFallback>
      </Avatar>
    );
}

export function EventCard({ event, isJoined, userProfile, onEdit, onDelete }: EventCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isJoining, setIsJoining] = React.useState(false);
  const [isChatLoading, setIsChatLoading] = React.useState(false);

  const isOwner = user?.uid === event.organizerId;
  const startDate = safeToDate(event.startDate);
  const endDate = safeToDate(event.endDate);

  const dateStr = React.useMemo(() => {
    if (!startDate || !endDate) return "Date not set";
    if (isSameDay(startDate, endDate)) return format(startDate, "PPP");
    return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
  }, [startDate, endDate]);

  const handleJoin = async () => {
    if (!user || !firestore || !userProfile) return;
    setIsJoining(true);

    const eventRef = doc(firestore, 'events', event.id);
    const joinedRef = doc(firestore, `users/${user.uid}/joinedEvents/${event.id}`);
    const participantRef = doc(firestore, `events/${event.id}/participants/${user.uid}`);

    try {
      await runTransaction(firestore, async (transaction) => {
        const snap = await transaction.get(eventRef);
        if (!snap.exists()) throw new Error("Event missing");
        
        transaction.update(eventRef, { participantCount: (snap.data().participantCount || 0) + 1 });
        transaction.set(joinedRef, { eventId: event.id, joinedAt: serverTimestamp() });
        transaction.set(participantRef, {
            userId: user.uid,
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            photoURL: userProfile.photoURL || null,
            joinedAt: serverTimestamp()
        });
      });
      toast({ title: 'Joined Event', description: 'See you there!' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
    } finally {
      setIsJoining(false);
    }
  };

  const handleStartGroupChat = async () => {
    if (!user || !firestore || !isOwner) return;
    setIsChatLoading(true);

    const chatPayload = {
        participantIds: arrayUnion(user.uid),
        participantInfo: {
            [user.uid]: {
                firstName: userProfile?.firstName || '',
                lastName: userProfile?.lastName || '',
                photoURL: userProfile?.photoURL || '',
            }
        },
        eventId: event.id,
        campaignTitle: event.title,
        lastUpdatedAt: serverTimestamp(),
        isGroupChat: true,
        hasMessages: false,
    };

    try {
        const batch = writeBatch(firestore);
        const chatDocRef = doc(firestore, 'chats', event.id);
        
        batch.set(chatDocRef, chatPayload, { merge: true });

        const eventRef = doc(firestore, 'events', event.id);
        batch.update(eventRef, { hasGroupChat: true });

        await batch.commit();
        router.push(`/dashboard/chats/${event.id}`);
    } catch (e: any) {
        console.error("Chat initialization failed:", e);
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `chats/${event.id}`,
                operation: 'create',
                requestResourceData: chatPayload
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({ variant: 'destructive', title: 'Chat Error', description: 'Could not initialize group conversation.' });
        }
    } finally {
        setIsChatLoading(false);
    }
  };

  const handleOpenGroupChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !firestore || !userProfile) return;
    
    if (event.hasGroupChat) {
        setIsChatLoading(true);
        const chatRef = doc(firestore, 'chats', event.id);
        try {
            const chatDoc = await getDoc(chatRef);
            if (chatDoc.exists()) {
                const chatData = chatDoc.data() as Chat;
                if (!chatData.participantIds.includes(user.uid)) {
                    await updateDoc(chatRef, {
                        participantIds: arrayUnion(user.uid),
                        [`participantInfo.${user.uid}`]: {
                            firstName: userProfile.firstName || '',
                            lastName: userProfile.lastName || '',
                            photoURL: userProfile.photoURL || '',
                        }
                    });
                }
            }
            router.push(`/dashboard/chats/${event.id}`);
        } catch (e) {
            console.error("Failed to join event chat:", e);
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: chatRef.path, operation: 'update' }, user));
        } finally {
            setIsChatLoading(false);
        }
    } else if (isOwner) {
        handleStartGroupChat();
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/dashboard/events`;
    const shareData = {
        title: event.title,
        text: `Join the '${event.title}' gathering on Testify!`,
        url: shareUrl,
    };

    try {
      if (navigator && navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${event.title}: ${shareUrl}`);
        toast({ title: 'Link Copied' });
      }
    } catch (e) {}
  };

  return (
    <Card className="rounded-none sm:rounded-[2.5rem] overflow-hidden border-x-0 sm:border-x border-y sm:border-y-0 shadow-none sm:shadow-lg bg-card/50 backdrop-blur-sm group hover:shadow-xl transition-all h-full flex flex-col border-b-2 sm:border-b-8 border-b-primary/5">
      <CardHeader className="p-4 sm:p-6 pb-2">
        <div className="flex justify-between items-start">
          <Badge className="h-5 text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20">
            {event.category}
          </Badge>
          <div className="flex items-center gap-2">
            {isOwner && (
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl w-48 shadow-xl">
                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Manage Gathering</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onEdit} className="rounded-lg">
                        <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Event
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg" onClick={onDelete}>
                        <Trash2 className="mr-2 h-4 w-4" /> Cancel Event
                    </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
            )}
          </div>
        </div>
        <CardTitle className="text-lg sm:text-2xl font-black font-headline uppercase mt-2 leading-tight truncate">{event.title}</CardTitle>
        <CardDescription className="flex items-center gap-2 mt-1">
          <LiveAuthor userId={event.organizerId} fallbackInitials={event.organizerName.charAt(0)} />
          <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">Host: {event.organizerName}</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 space-y-4 flex-grow">
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed font-medium italic">
          &ldquo;{event.description}&rdquo;
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-2 sm:p-2.5 rounded-xl border border-dashed">
            <CalendarDays className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
                <p className="font-bold leading-tight">{dateStr}</p>
                <p className="text-[9px] font-black uppercase tracking-tighter opacity-60">{event.startTime} - {event.endTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-2 sm:p-2.5 rounded-xl border border-dashed">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
                <p className="font-bold truncate leading-tight uppercase tracking-tighter">{event.location}</p>
                <p className="text-[9px] font-black uppercase tracking-tighter opacity-60">{event.locationType}</p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 sm:p-6 bg-muted/20 border-t flex items-center justify-between">
        <ParticipantsDialog campaign={event}>
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors cursor-pointer">
              <Users className="h-4 w-4 text-primary" />
              {event.participantCount || 0} {event.participantCount === 1 ? 'MEMBER' : 'MEMBERS'}
            </div>
        </ParticipantsDialog>
        
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl shadow-md bg-background" onClick={handleShare}>
            <Share2 className="h-4 w-4 text-primary" />
          </Button>
          
          {event.streamUrl && (
            <Button variant="outline" size="sm" className="rounded-xl h-8 sm:h-9" asChild>
              <a href={event.streamUrl} target="_blank" rel="noopener noreferrer">
                <PlayCircle className="mr-2 h-4 w-4" /> LIVE
              </a>
            </Button>
          )}
          
          {isJoined ? (
            <Badge variant="secondary" className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl flex items-center gap-2 font-black tracking-widest bg-green-500/10 text-green-600 border-green-500/20">
              <UserCheck className="h-4 w-4" /> JOINED
            </Badge>
          ) : (
            <Button onClick={handleJoin} disabled={isJoining || event.status !== 'active'} className="h-8 sm:h-9 px-4 sm:px-6 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95">
              {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : "JOIN"}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
