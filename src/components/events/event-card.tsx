
"use client";

import { useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { CalendarDays, MapPin, Users, Share2, PlayCircle, Loader2, UserCheck, Sparkles, MoreVertical, Trash2, MessagesSquare } from "lucide-react";
import type { Event, UserProfile, EventParticipant, Chat } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { doc, runTransaction, serverTimestamp, collection, deleteDoc, updateDoc, writeBatch, query, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn, safeToDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EventCardProps {
  event: Event;
  isJoined: boolean;
  userProfile: UserProfile | null;
}

export function EventCard({ event, isJoined, userProfile }: EventCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const isOwner = user?.uid === event.organizerId;
  const startDate = safeToDate(event.startDate);
  const endDate = safeToDate(event.endDate);

  const dateStr = useMemo(() => {
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

    const participantsQuery = query(collection(firestore, 'events', event.id, 'participants'));
    const snap = await getDocs(participantsQuery);
    const participants = snap.docs.map(d => ({ id: d.id, ...d.data() } as EventParticipant));

    if (participants.length < 2) {
        toast({ title: "Need Members", description: "You need at least one participant to start a group chat." });
        setIsChatLoading(false);
        return;
    }

    const participantIds = participants.map(p => p.userId);
    const participantInfo: { [key: string]: any } = {};
    participants.forEach(p => {
        participantInfo[p.userId] = {
            firstName: p.firstName,
            lastName: p.lastName,
            photoURL: p.photoURL || '',
        };
    });

    const batch = writeBatch(firestore);
    const chatDocRef = doc(firestore, 'chats', event.id);
    
    batch.set(chatDocRef, {
        participantIds,
        participantInfo,
        eventId: event.id,
        campaignTitle: event.title,
        lastUpdatedAt: serverTimestamp(),
        isGroupChat: true,
        hasMessages: false,
    }, { merge: true });

    const eventRef = doc(firestore, 'events', event.id);
    batch.update(eventRef, { hasGroupChat: true });

    try {
        await batch.commit();
        router.push(`/dashboard/chats/${event.id}`);
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: chatDocRef.path,
                operation: 'create',
                requestResourceData: { participantIds, eventId: event.id }
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({ variant: 'destructive', title: 'Chat Error', description: 'Could not initialize group conversation.' });
        }
    } finally {
        setIsChatLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !firestore || !isOwner) return;
    setIsDeleting(true);
    try {
      await updateDoc(doc(firestore, 'events', event.id), { status: 'cancelled' });
      toast({ title: 'Event Cancelled' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="rounded-[2rem] overflow-hidden border-none shadow-lg bg-card/50 backdrop-blur-sm group hover:shadow-xl transition-all h-full flex flex-col">
      <CardHeader className="p-6 pb-2">
        <div className="flex justify-between items-start">
          <Badge className="h-5 text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20">
            {event.category}
          </Badge>
          <div className="flex items-center gap-2">
            {(isJoined || isOwner) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                        variant={event.hasGroupChat ? "default" : "outline"}
                        size="icon" 
                        className={cn("h-8 w-8 rounded-full shadow-sm", event.hasGroupChat && "bg-primary text-primary-foreground border-primary hover:bg-primary/90")}
                        onClick={(e) => { e.stopPropagation(); event.hasGroupChat ? router.push(`/dashboard/chats/${event.id}`) : handleStartGroupChat(); }}
                        disabled={isChatLoading}
                    >
                        {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessagesSquare className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{event.hasGroupChat ? "Open Group Chat" : isOwner ? "Start Group Chat" : "Chat coming soon"}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isOwner && (
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive" onClick={handleDelete} disabled={isDeleting}>
                    <Trash2 className="mr-2 h-4 w-4" /> Cancel Event
                    </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
            )}
          </div>
        </div>
        <CardTitle className="text-xl sm:text-2xl font-black font-headline uppercase mt-2">{event.title}</CardTitle>
        <CardDescription className="flex items-center gap-2 mt-1">
          <LiveAuthor userId={event.organizerId} fallbackInitials={event.organizerName.charAt(0)} />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Host: {event.organizerName}</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-6 space-y-4 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed font-medium italic">
          &ldquo;{event.description}&rdquo;
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4 text-primary shrink-0" />
            <span className="font-bold">{dateStr} • {event.startTime}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="font-bold truncate">{event.location}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 sm:p-6 bg-muted/20 border-t flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <Users className="h-4 w-4 text-primary" />
          {event.participantCount || 0} Brethren
        </div>
        
        <div className="flex gap-2">
          {event.streamUrl && (
            <Button variant="outline" size="sm" className="rounded-xl h-9" asChild>
              <a href={event.streamUrl} target="_blank" rel="noopener noreferrer">
                <PlayCircle className="mr-2 h-4 w-4" /> LIVE
              </a>
            </Button>
          )}
          
          {isJoined ? (
            <Badge variant="secondary" className="h-9 px-4 rounded-xl flex items-center gap-2 font-black tracking-widest bg-green-500/10 text-green-600 border-green-500/20">
              <UserCheck className="h-4 w-4" /> JOINED
            </Badge>
          ) : (
            <Button onClick={handleJoin} disabled={isJoining || event.status !== 'active'} className="h-9 px-6 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20">
              {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : "JOIN HUB"}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

function LiveAuthor({ userId, fallbackInitials }: { userId: string, fallbackInitials: string }) {
  const firestore = useFirestore();
  const userRef = useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
  const { data: profile } = useDoc<UserProfile>(userRef);
  
  return (
    <Avatar className="h-5 w-5 border shadow-sm">
      <AvatarImage src={profile?.photoURL} />
      <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{fallbackInitials}</AvatarFallback>
    </Avatar>
  );
}
