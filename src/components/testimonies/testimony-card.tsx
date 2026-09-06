"use client";

import * as React from "react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Testimony, UserProfile } from "@/lib/types";
import { format } from "date-fns";
import { 
  Share2, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Loader2, 
  Globe, 
  Sparkles, 
  HandHeart, 
  MessageSquare,
  UserPlus,
  Hourglass,
  PartyPopper,
  Users,
  Camera,
  X
} from "lucide-react";
import { useUser, useDoc, useCollection, useFirestore } from "@/firebase";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, serverTimestamp, addDoc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn, safeToDate } from "@/lib/utils";
import Image from 'next/image';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { CommentSection } from "./comment-section";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Ensures the profile photo displayed in the card is always the most recent version.
 */
function LiveAuthorAvatar({ userId, fallbackInitials, className }: { userId: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userRef = React.useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const photoURL = profile?.photoURL;
    
    return (
        <Dialog>
            <DialogTrigger asChild disabled={!photoURL}>
                <div className={cn(className, photoURL && "cursor-pointer active:scale-95 transition-transform hover:scale-105")}>
                    <Avatar className="h-full w-full border shadow-sm">
                        <AvatarImage src={photoURL} className="object-contain" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-center flex items-center justify-center w-full h-full">{fallbackInitials || 'U'}</AvatarFallback>
                    </Avatar>
                </div>
            </DialogTrigger>
            {photoURL && (
                <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
                    <DialogHeader className="sr-only text-center"><DialogTitle>Profile Photo</DialogTitle></DialogHeader>
                    <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
                        <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center text-left text-left">
                            <Image src={photoURL} alt="Author" fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized />
                        </div>
                    </div>
                </DialogContent>
            )}
        </Dialog>
    );
}

export const TestimonyCard = React.memo(function TestimonyCard({ 
  testimony, 
  onDelete, 
  onEdit,
  isPartner,
  hasPendingRequest,
  currentUserProfile
}: { 
  testimony: Testimony, 
  onDelete: () => void, 
  onEdit: () => void,
  isPartner?: boolean,
  hasPendingRequest?: boolean,
  currentUserProfile?: UserProfile | null
}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  const [isProcessingReaction, setIsProcessingReaction] = useState<string | null>(null);
  const [isRequestingPartner, setIsRequestingPartner] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const prayerRef = React.useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);
  const [isPrayerTruncated, setIsPrayerTruncated] = React.useState(false);
  const [showFullText, setShowFullText] = React.useState(false);
  const [showFullPrayer, setShowFullPrayer] = React.useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const isAuthor = user?.uid === testimony.authorId;
  
  const authorProfileRef = React.useMemo(() => (!testimony.isAnonymous && testimony.authorId) ? doc(firestore, 'users', testimony.authorId) : null, [firestore, testimony.authorId, testimony.isAnonymous]);
  const { data: authorProfile } = useDoc<UserProfile>(authorProfileRef);

  const authorFirstName = authorProfile?.firstName || testimony.authorFirstName;
  const authorLastName = authorProfile?.lastName || testimony.authorLastName;
  const authorName = testimony.isAnonymous ? 'Confidential Request' : ([authorFirstName, authorLastName].filter(Boolean).join(' ') || 'Kingdom Believer');
  const initials = (authorFirstName?.charAt(0) || '') + (authorLastName?.charAt(0) || '');

  const profileLink = isAuthor ? "/profile" : `/profile/${testimony.authorId}`;

  const supporters = testimony.supporters || [];
  const inspiredBy = testimony.inspiredBy || [];
  const connectedBy = testimony.connectedBy || [];
  
  const totalReactions = supporters.length + inspiredBy.length + connectedBy.length;

  const hasAmened = useMemo(() => user ? supporters.includes(user.uid) : false, [user, supporters]);
  const hasInspired = useMemo(() => user ? inspiredBy.includes(user.uid) : false, [user, inspiredBy]);
  const hasConnected = useMemo(() => user ? connectedBy.includes(user.uid) : false, [user, connectedBy]);
  
  const displayDate = useMemo(() => {
    const createdAtDate = safeToDate(testimony.createdAt);
    return createdAtDate ? "Shared " + format(createdAtDate, "PPP 'at' p") : 'Shared recently';
  }, [testimony.createdAt]);
  
  const locationString = useMemo(() => {
    const testimonyLoc = testimony.authorLocation;
    const city = testimonyLoc?.city;
    const country = testimonyLoc?.country;
    return [city, country].filter(Boolean).join(', ') || 'Global Community';
  }, [testimony.authorLocation]);

  const commentsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'testimonies', testimony.id, 'comments'));
  }, [firestore, testimony.id]);
  const { data: comments } = useCollection<{id: string}>(commentsQuery);
  const commentCount = comments?.length || 0;

  React.useEffect(() => {
    setMounted(true);
    const checkTruncation = () => {
      if (contentRef.current) {
        setIsTruncated(contentRef.current.scrollHeight > contentRef.current.clientHeight);
      }
      if (prayerRef.current) {
        setIsPrayerTruncated(prayerRef.current.scrollHeight > prayerRef.current.clientHeight);
      }
    };
    const timeoutId = setTimeout(checkTruncation, 150);
    window.addEventListener('resize', checkTruncation);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkTruncation);
    };
  }, [testimony.content, testimony.answeredPrayerContent]);

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const shareUrl = `${window.location.origin}/testimonies#${testimony.id}`;
    const textContent = `"${testimony.content.substring(0, 200)}${testimony.content.length > 200 ? '...' : ''}"\n\nRead full miracle on Testify:`;
    
    const shareData: any = { 
        title: 'Kingdom Testimony | Testify', 
        text: textContent, 
        url: shareUrl 
    };

    try {
      if (navigator && navigator.share) {
        if (testimony.mediaUrl && testimony.mediaType === 'image') {
            try {
                const response = await fetch(testimony.mediaUrl);
                const blob = await response.blob();
                const file = new File([blob], 'miracle-proof.jpg', { type: 'image/jpeg' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    shareData.files = [file];
                }
            } catch (mediaErr) {
                console.warn("Could not attach image to share", mediaErr);
            }
        }
        await navigator.share(shareData);
      } else {
        throw new Error('Share API not supported');
      }
    } catch (err: any) {
        if (err.name === 'AbortError') return;
        try {
          await navigator.clipboard.writeText(`${textContent} ${shareUrl}`);
          toast({ title: "Details Copied!" });
        } catch (clipErr) {
            await navigator.clipboard.writeText(shareUrl);
            toast({ title: "Link Copied!" });
        }
    }
  };

  const handleReaction = (type: 'amen' | 'inspired' | 'connect') => {
    if (!user || !firestore) return;
    const hasReacted = (type === 'amen' && hasAmened) || (type === 'inspired' && hasInspired) || (type === 'connect' && hasConnected);
    setIsProcessingReaction(type);
    const testimonyRef = doc(firestore, 'testimonies', testimony.id);
    const field = type === 'amen' ? 'supporters' : type === 'inspired' ? 'inspiredBy' : 'connectedBy';
    const updatePayload = { [field]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid) };
    updateDoc(testimonyRef, updatePayload)
        .catch(() => {
            const permissionError = new FirestorePermissionError({ path: testimonyRef.path, operation: 'update', requestResourceData: updatePayload }, user);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => setIsProcessingReaction(null));
  }

  const handleSendPartnerRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !firestore || !currentUserProfile || isAuthor || isPartner || hasPendingRequest) return;
    setIsRequestingPartner(true);
    
    const participantIds = [String(user.uid), String(testimony.authorId)].sort();
    const requestId = participantIds.join('_');
    const requestRef = doc(firestore, 'accountabilityRequests', requestId);
    
    const newRequestData = { 
        fromUserId: user.uid, 
        fromUserFirstName: currentUserProfile.firstName || '', 
        fromUserLastName: currentUserProfile.lastName || '', 
        fromUserPhotoURL: currentUserProfile.photoURL || '', 
        toUserId: testimony.authorId, 
        toUserFirstName: authorFirstName || '', 
        toUserLastName: authorLastName || '', 
        toUserPhotoURL: authorProfile?.photoURL || '', 
        status: 'pending' as const, 
        createdAt: serverTimestamp(), 
        participantIds 
    };
    
    const notificationData = { 
        userId: testimony.authorId, 
        type: 'accountability_request' as const, 
        title: 'New Accountability Request', 
        message: `${currentUserProfile.firstName} wants to be your partner!`, 
        link: '/accountability', 
        isRead: false, 
        createdAt: serverTimestamp() 
    };

    try {
        await setDoc(requestRef, newRequestData);
        await addDoc(collection(firestore, 'users', testimony.authorId, 'notifications'), notificationData);
        toast({ title: 'Request Sent!' });
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: requestRef.path, operation: 'create', requestResourceData: newRequestData }, user));
    } finally { setIsRequestingPartner(false); }
  };

  const triggerAction = (action: () => void) => {
    requestAnimationFrame(() => {
        action();
    });
  };

  const fullTextContent = (
    <ScrollArea className={cn("pr-4", isMobile ? "h-full" : "max-h-[60vh]")}>
      <div className="space-y-8 pb-8 px-2 text-left">
        <div className={cn("grid gap-4", (testimony.mediaUrl && testimony.mediaUrl2) ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
            {testimony.mediaUrl && (
              <div className="rounded-[2rem] overflow-hidden border-2 shadow-xl bg-black aspect-square relative">
                {testimony.mediaType === 'image' ? (
                    <Image src={testimony.mediaUrl} alt="Proof 1" fill className="object-contain" unoptimized />
                ) : (
                    <video src={testimony.mediaUrl} className="w-full h-full object-contain" controls />
                )}
              </div>
            )}
            {testimony.mediaUrl2 && (
              <div className="rounded-[2rem] overflow-hidden border-2 shadow-xl bg-black aspect-square relative">
                {testimony.mediaType2 === 'image' ? (
                    <Image src={testimony.mediaUrl2} alt="Proof 2" fill className="object-contain" unoptimized />
                ) : (
                    <video src={testimony.mediaUrl2} className="w-full h-full object-contain" controls />
                )}
              </div>
            )}
        </div>
        <div className="text-base sm:text-lg text-muted-foreground whitespace-pre-wrap leading-relaxed text-left font-medium">
            {testimony.content}
        </div>
      </div>
    </ScrollArea>
  );

  const fullPrayerContent = (
    <ScrollArea className={cn("pr-4", isMobile ? "h-full" : "max-h-[60vh]")}>
      <div className="text-base text-muted-foreground whitespace-pre-wrap leading-relaxed p-2 text-left italic">
        {testimony.answeredPrayerContent}
      </div>
    </ScrollArea>
  );

  return (
    <>
      <div id={testimony.id} className={cn(
        "flex flex-col h-full w-full overflow-hidden transition-all duration-300 scroll-mt-48",
        "rounded-none sm:rounded-[2rem] border sm:border border-border border-t-4 border-t-primary/20 shadow-none sm:shadow-lg",
        "bg-card/50 backdrop-blur-sm",
        isPartner && "ring-1 ring-primary/20",
        testimony.answeredPrayerId && "border-l-4 border-l-amber-500"
      )}>
        <div className="p-4 sm:p-6 pb-2">
          <div className="flex flex-row items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                {testimony.isAnonymous ? (
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold"><Users className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                ) : (
                    <LiveAuthorAvatar userId={String(testimony.authorId)} fallbackInitials={initials} className="h-11 w-11 sm:h-14 sm:w-14" />
                )}
                <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap text-left">
                        <Link href={profileLink} onClick={(e) => e.stopPropagation()} className="hover:underline decoration-primary/30 underline-offset-2 shrink-0">
                             <h3 className="text-base sm:text-lg font-bold truncate max-w-[150px] sm:max-w-[200px] capitalize leading-none text-left">{authorName}</h3>
                        </Link>
                        {isPartner && <Badge variant="secondary" className="h-4 px-1.5 text-[9px] uppercase font-bold tracking-tighter bg-primary/10 text-primary border-primary/20 shrink-0 text-left">Partner</Badge>}
                        {!isAuthor && !isPartner && currentUserProfile && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className={cn("h-6 w-6 rounded-full transition-colors", hasPendingRequest ? "text-muted-foreground" : "text-primary hover:bg-primary/10")} onClick={handleSendPartnerRequest} disabled={isRequestingPartner || hasPendingRequest}>
                                            {isRequestingPartner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : hasPendingRequest ? <Hourglass className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-xl border-primary/20 shadow-xl"><p className={cn("text-[10px] font-black uppercase tracking-widest")}>{hasPendingRequest ? "Request Pending" : "Add Accountability Partner"}</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    <div className="text-muted-foreground text-sm mt-1 flex flex-col gap-0.5 text-left">
                        <div className="truncate text-[10px] sm:text-xs opacity-70 text-left">{displayDate}</div>
                        <div className="flex items-center gap-1 mt-0.5 opacity-80 text-[10px] sm:text-xs font-medium text-left"><Globe className="h-3 w-3 text-primary shrink-0" /> {locationString}</div>
                        <div className="mt-1.5 flex gap-2 text-left">
                            <Badge variant="outline" className="w-fit text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 h-auto bg-background/50 text-left">
                                {testimony.category}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-background" onClick={handleShare}>
                <Share2 className="h-3.5 w-3.5" /><span className="sr-only">Share</span>
                </Button>
                {isAuthor && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => e.stopPropagation()}><MoreVertical className="h-4 w-4" /><span className="sr-only">Options</span></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl"><DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-black text-left">Manage Story</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerAction(onEdit); }} className="rounded-lg text-left"><Edit className="mr-2 h-4 w-4 text-primary" /><span>Edit Testimony</span></DropdownMenuItem><DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerAction(onDelete); }} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-lg text-left"><Trash2 className="mr-2 h-4 w-4" /><span>Delete Permanently</span></DropdownMenuItem></DropdownMenuContent>
                </DropdownMenu>
                )}
            </div>
          </div>
        </div>
        
        <div className="flex-grow pt-2 px-4 sm:px-6 space-y-4 text-left">
          <div className="text-sm sm:text-base text-muted-foreground leading-relaxed text-left">
            <div className={cn("leading-relaxed text-left max-w-full", (testimony.mediaUrl || testimony.mediaUrl2) ? "line-clamp-3" : "line-clamp-6")}>
                <div ref={contentRef} className="text-left">{testimony.content}</div>
            </div>
            {isTruncated && <Button variant="link" className="p-0 h-auto text-sm text-primary font-bold mt-1 text-left" onClick={(e) => { e.stopPropagation(); setShowFullText(true); }}>Read Full Story</Button>}
          </div>

          {(testimony.mediaUrl || testimony.mediaUrl2) && (
              <div className={cn("grid gap-3", (testimony.mediaUrl && testimony.mediaUrl2) ? "grid-cols-2" : "grid-cols-1")}>
                 {testimony.mediaUrl && (
                    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border shadow-inner bg-muted aspect-square group/media cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowFullText(true); }}>
                        {testimony.mediaType === 'image' ? (
                            <Image src={testimony.mediaUrl} alt="Proof 1" fill className="object-contain transition-transform group-hover/media:scale-105" unoptimized />
                        ) : (
                            <video src={testimony.mediaUrl} className="w-full h-full object-contain bg-zinc-950" muted />
                        )}
                    </div>
                 )}
                 {testimony.mediaUrl2 && (
                    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border shadow-inner bg-muted aspect-square group/media cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowFullText(true); }}>
                        {testimony.mediaType2 === 'image' ? (
                            <Image src={testimony.mediaUrl2} alt="Proof 2" fill className="object-contain transition-transform group-hover/media:scale-105" unoptimized />
                        ) : (
                            <video src={testimony.mediaUrl2} className="w-full h-full object-contain bg-zinc-950" muted />
                        )}
                    </div>
                 )}
              </div>
          )}

          {testimony.answeredPrayerId && testimony.answeredPrayerContent && (
            <div className="rounded-2xl border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 shadow-inner overflow-hidden text-left">
                <div className="p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 font-black mb-1 text-left">Answer to Prayer Request:</div>
                    <div className="border-l-2 border-amber-500/30 pl-4 italic text-sm text-muted-foreground text-left">
                        <div className="line-clamp-2 text-left">
                           <div ref={prayerRef} className="text-left">{testimony.answeredPrayerContent}</div>
                        </div>
                    </div>
                    {isPrayerTruncated && (
                        <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 h-auto self-start text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 mt-2 hover:no-underline text-left"
                            onClick={(e) => { e.stopPropagation(); setShowFullPrayer(true); }}
                        >
                            Read Full Request
                        </Button>
                    )}
                </div>
            </div>
           )}

           {totalReactions > 0 && (
             <div className="flex items-center justify-between pt-2 text-left">
                <div className="flex items-center gap-1.5 text-left">
                    <div className="flex items-center -space-x-1.5 text-left">
                        {supporters.length > 0 && <div className="bg-primary rounded-full p-1 border-2 border-background z-30 shadow-sm"><HandHeart className="h-2.5 w-2.5 text-primary-foreground fill-current" /></div>}
                        {inspiredBy.length > 0 && <div className="bg-chart-3 rounded-full p-1 border-2 border-background z-20 shadow-sm"><Sparkles className="h-2.5 w-2.5 text-white fill-current" /></div>}
                        {connectedBy.length > 0 && <div className="bg-blue-500 rounded-full p-1 border-2 border-background z-10 shadow-sm"><PartyPopper className="h-2.5 w-2.5 text-white" /></div>}
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight text-left">{(supporters.length + inspiredBy.length + connectedBy.length)}</span>
                </div>
                {testimony.campaignTitle && <span className="text-[9px] font-black uppercase text-muted-foreground/60 truncate italic bg-muted/50 px-2 py-0.5 rounded-full border max-w-[150px] text-left">RE: {testimony.campaignTitle}</span>}
             </div>
           )}
        </div>

        <Separator className="mx-4 sm:mx-6 w-auto opacity-50 text-left" />
        <div className="py-2 sm:py-3 px-2 sm:px-6 grid grid-cols-4 gap-1 sm:gap-2 text-left">
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('amen'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasAmened && "text-primary hover:text-primary bg-primary/5")}>
                {isProcessingReaction === 'amen' ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-left text-left" /> : <HandHeart className={cn("mr-2 h-4 w-4", hasAmened && "fill-current")} />}<span>Amen</span>
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('inspired'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasInspired && "text-chart-3 hover:text-chart-3 bg-chart-3/5")}>
                {isProcessingReaction === 'inspired' ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-left" /> : <Sparkles className={cn("h-3.5 w-3.5", hasInspired && "fill-current")} />}<span>Hallelujah</span>
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('connect'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasConnected && "text-blue-500 hover:text-blue-500 bg-blue-500/5")}>
                {isProcessingReaction === 'connect' ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-left" /> : <PartyPopper className={cn("h-3.5 w-3.5", hasConnected && "fill-current")} />}<span>Celebrate</span>
            </Button>
            <Button variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", isCommentsOpen && "text-primary hover:text-primary bg-primary/5")} onClick={(e) => { e.stopPropagation(); setIsCommentsOpen(true); }}>
                <div className="relative flex flex-col items-center justify-center h-full text-left"><MessageSquare className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isCommentsOpen && "fill-current")} />{commentCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3 sm:h-4 w-4 items-center justify-center rounded-full bg-primary text-[7px] sm:text-[8px] font-black text-primary-foreground border-background border-2 shadow-sm text-center">{commentCount}</span>}</div><span>Comment</span>
            </Button>
        </div>
      </div>

      {mounted && (
        <>
            {isMobile ? (
                <>
                    <Sheet open={showFullText} onOpenChange={setShowFullText}>
                        <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/20 text-left text-left"><SheetHeader className="text-left text-left"><SheetTitle className="text-2xl font-black font-headline text-left text-left">Kingdom Testimony</SheetTitle><SheetDescription className="text-sm font-bold uppercase tracking-widest text-left text-left">BY {authorName} • {displayDate}</SheetDescription></SheetHeader></div>
                            <div className="flex-grow min-h-0 pt-8 px-6 text-left text-left">{fullTextContent}</div>
                        </SheetContent>
                    </Sheet>
                    <Sheet open={showFullPrayer} onOpenChange={setShowFullPrayer}>
                        <SheetContent side="bottom" className="h-auto max-h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b shrink-0 bg-amber-500/10 text-left text-left"><SheetHeader className="text-left text-left"><SheetTitle className="text-2xl font-black font-headline uppercase text-amber-600 text-left">Answered Prayer</SheetTitle><SheetDescription className="text-sm font-medium mt-1 text-left text-left">The specific request that God has fulfilled.</SheetDescription></SheetHeader></div>
                            <ScrollArea className="flex-grow px-8 py-10 text-left text-left">
                                {fullPrayerContent}
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                    <Sheet open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                        <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left"><div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left"><SheetHeader className="text-left text-left text-left"><SheetTitle className="text-2xl font-black font-headline tracking-tight uppercase text-left text-left">Responses</SheetTitle><SheetDescription className="text-sm font-bold uppercase tracking-widest text-left text-left">GATHERED JOY FOR {authorName}</SheetDescription></SheetHeader></div><div className="flex-grow min-h-0 text-left text-left"><CommentSection testimonyId={testimony.id} /></div></SheetContent>
                    </Sheet>
                </>
            ) : (
                <>
                    <Dialog open={showFullText} onOpenChange={open => { setShowFullText(open); if(!open) setIsCommentsOpen(false); }}>
                        <DialogContent className="sm:max-w-4xl rounded-3xl overflow-hidden p-0 text-left text-left text-left"><div className="p-8 border-b bg-muted/10 text-left text-left"><DialogHeader className="text-left text-left text-left"><DialogTitle className="text-3xl font-black font-headline tracking-tight uppercase text-left text-left">Kingdom Testimony</DialogTitle><DialogDescription className="text-sm font-bold uppercase tracking-widest text-left text-left">BY {authorName} • {displayDate}</DialogDescription></DialogHeader></div><div className="p-8 text-left text-left">{fullTextContent}</div></DialogContent>
                    </Dialog>
                    <Dialog open={showFullPrayer} onOpenChange={setShowFullPrayer}>
                        <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left">
                             <div className="p-8 border-b bg-amber-500/10 text-left text-left">
                                <DialogHeader className="text-left text-left text-left text-left">
                                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-amber-600 text-left text-left">Answered Prayer Request</DialogTitle>
                                    <DialogDescription className="text-left text-left">The original request shared with the body.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className="p-8 text-left text-left">
                                {fullPrayerContent}
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                        <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh] p-0 overflow-hidden rounded-3xl text-left text-left"><div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left"><DialogHeader className="text-left text-left text-left text-left"><DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-left text-left">Gathered Responses</DialogTitle><DialogDescription className="text-sm font-bold uppercase tracking-widest text-left text-left">COMMUNITY RESPONSES TO THIS MIRACLE</DialogDescription></DialogHeader></div><div className="flex-1 min-h-0 text-left text-left"><CommentSection testimonyId={testimony.id} /></div></DialogContent>
                    </Dialog>
                </>
            )}
        </>
      )}
    </>
  );
});
TestimonyCard.displayName = "TestimonyCard";
