
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
  X,
  ChevronRight,
  ChevronDown,
  TrendingUp
} from "lucide-react";
import { useUser, useDoc, useCollection, useFirestore } from "@/firebase";
import { useState, useMemo, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
import { Card, CardContent } from "@/components/ui/card";
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
                        <AvatarImage src={photoURL} className="object-cover" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-center flex items-center justify-center h-full w-full">{fallbackInitials || 'U'}</AvatarFallback>
                    </Avatar>
                </div>
            </DialogTrigger>
            {photoURL && (
                <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
                    <DialogHeader className="sr-only text-center"><DialogTitle>Profile Photo</DialogTitle></DialogHeader>
                    <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
                        <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
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
  const [isBoostOpen, setIsBoostOpen] = useState(false);

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

  useEffect(() => {
    const handlePopState = () => {
      if (showFullText) setShowFullText(false);
      if (showFullPrayer) setShowFullPrayer(false);
      if (isCommentsOpen) setIsCommentsOpen(false);
      if (isBoostOpen) setIsBoostOpen(false);
    };

    if (showFullText || showFullPrayer || isCommentsOpen || isBoostOpen) {
      window.history.pushState({ testimonyPopup: testimony.id }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showFullText, showFullPrayer, isCommentsOpen, isBoostOpen, testimony.id]);

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

  const handleBoostStory = async () => {
    if (!user || !firestore) return;
    setIsBoostOpen(true);
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
                    <video src={testimony.mediaUrl} className="w-full h-full object-contain bg-zinc-950" playsInline controls />
                )}
              </div>
            )}
            {testimony.mediaUrl2 && (
              <div className="rounded-[2rem] overflow-hidden border-2 shadow-xl bg-black aspect-square relative">
                {testimony.mediaType2 === 'image' ? (
                    <Image src={testimony.mediaUrl2} alt="Proof 2" fill className="object-contain" unoptimized />
                ) : (
                    <video src={testimony.mediaUrl2} className="w-full h-full object-contain bg-zinc-950" playsInline controls />
                )}
              </div>
            )}
        </div>
        <div className="text-base sm:text-lg text-muted-foreground whitespace-pre-wrap leading-relaxed font-medium">
            {testimony.content}
        </div>
      </div>
    </ScrollArea>
  );

  const MediaPreview = ({ url, type }: { url: string, type: 'image' | 'video' | 'audio' }) => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border shadow-inner bg-muted aspect-square group/media cursor-pointer">
                    {type === 'image' ? (
                        <Image src={url} alt="Proof" fill className="object-cover transition-transform group-hover/media:scale-105" unoptimized />
                    ) : (
                        <video src={url} className="w-full h-full object-cover bg-zinc-950" muted playsInline autoPlay loop />
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover/media:bg-transparent transition-colors duration-500" />
                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 opacity-0 group-hover/media:opacity-100 transition-opacity shadow-2xl">
                        <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-primary animate-pulse" />
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
                <DialogHeader className="sr-only text-center"><DialogTitle>Full View</DialogTitle></DialogHeader>
                <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
                    <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
                        {type === 'image' ? (
                            <Image src={url} alt="Proof Full" fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized />
                        ) : (
                            <video src={url} className="w-full h-full object-contain" playsInline controls autoPlay />
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
  };

  return (
    <>
      <div id={testimony.id} className={cn(
        "flex flex-col h-full w-full overflow-hidden transition-all duration-300 scroll-mt-48 text-left",
        "rounded-none sm:rounded-[2rem] border-y sm:border border-border border-x-0 sm:border-x border-t-4 border-t-primary/20 shadow-none sm:shadow-lg",
        "bg-card/50 backdrop-blur-sm",
        isPartner && "sm:ring-1 ring-primary/20",
        testimony.answeredPrayerId && "sm:border-l-4 border-l-amber-500"
      )}>
        <div className="p-4 sm:p-6 pb-2 text-left">
          <div className="flex flex-row items-start justify-between gap-3 text-left">
            <div className="flex items-center gap-3 min-w-0 flex-1 text-left text-left">
                {testimony.isAnonymous ? (
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold"><Users className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                ) : (
                    <LiveAuthorAvatar userId={String(testimony.authorId)} fallbackInitials={initials} className="h-11 w-11 sm:h-14 sm:w-14" />
                )}
                <div className="min-w-0 flex-1 text-left text-left text-left">
                    <div className="flex items-center gap-2 flex-wrap text-left">
                        <Link href={profileLink} onClick={(e) => e.stopPropagation()} className="hover:underline decoration-primary/30 underline-offset-2 shrink-0">
                             <h3 className="text-base sm:text-lg font-bold truncate max-w-[150px] sm:max-w-[200px] capitalize leading-none">{authorName}</h3>
                        </Link>
                        {isPartner && <Badge variant="secondary" className="h-4 px-1.5 text-[9px] uppercase font-bold tracking-tighter bg-primary/10 text-primary border-primary/20 shrink-0">Partner</Badge>}
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
                    <div className="text-muted-foreground text-sm mt-1 flex flex-col gap-0.5 text-left text-left">
                        <div className="truncate text-[10px] sm:text-xs opacity-70">{displayDate}</div>
                        <div className="flex items-center gap-1 mt-0.5 opacity-80 text-[10px] sm:text-xs font-medium"><Globe className="h-3 w-3 text-primary shrink-0" /> {locationString}</div>
                        <div className="mt-1.5 flex gap-2">
                            <Badge variant="outline" className="w-fit text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 h-auto bg-background/50">
                                {testimony.category}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1.5 text-left">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-background" onClick={handleShare}>
                <Share2 className="h-3.5 w-3.5" /><span className="sr-only">Share</span>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); }}><MoreVertical className="h-4 w-4" /><span className="sr-only">Options</span></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-black text-left">Manage Story</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {isAuthor ? (
                            <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerAction(onEdit); }} className="rounded-lg">
                                    <Edit className="mr-2 h-4 w-4 text-primary" />
                                    <span>Edit Story</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsBoostOpen(true); }} className="rounded-lg">
                                    <TrendingUp className="mr-2 h-4 w-4 text-indigo-600" />
                                    <span>Boost Miracle</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerAction(onDelete); }} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-lg">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete Permanently</span>
                                </DropdownMenuItem>
                            </>
                        ) : (
                            <DropdownMenuItem onClick={handleShare} className="rounded-lg">
                                <Share2 className="mr-2 h-4 w-4 text-primary" />
                                <span>Spread the Word</span>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
        </div>
        
        <div className="flex-grow pt-2 px-4 sm:px-6 space-y-4 text-left">
          <div className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            <div className={cn("leading-relaxed max-w-full", (testimony.mediaUrl || testimony.mediaUrl2) ? "line-clamp-3" : "line-clamp-6")}>
                <div ref={contentRef}>{testimony.content}</div>
            </div>
            {isTruncated && <Button variant="link" className="p-0 h-auto text-sm text-primary font-bold mt-1" onClick={(e) => { e.stopPropagation(); setShowFullText(true); }}>Read Full Story</Button>}
          </div>

          {(testimony.mediaUrl || testimony.mediaUrl2) && (
              <div className={cn("grid gap-3", (testimony.mediaUrl && testimony.mediaUrl2) ? "grid-cols-2" : "grid-cols-1")}>
                 {testimony.mediaUrl && (
                    <MediaPreview url={testimony.mediaUrl} type={testimony.mediaType as any} />
                 )}
                 {testimony.mediaUrl2 && (
                    <MediaPreview url={testimony.mediaUrl2} type={testimony.mediaType2 as any} />
                 )}
              </div>
          )}

          {testimony.answeredPrayerId && testimony.answeredPrayerContent && (
            <div className="rounded-2xl border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 shadow-inner overflow-hidden text-left">
                <div className="p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 font-black mb-1 text-left">Answer to Prayer Request:</div>
                    <div className="border-l-2 border-amber-500/30 pl-4 italic text-sm text-muted-foreground text-left">
                        <div className="line-clamp-2 text-left text-left">
                           <div ref={prayerRef}>{testimony.answeredPrayerContent}</div>
                        </div>
                    </div>
                    {isPrayerTruncated && (
                        <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 h-auto self-start text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 mt-2 hover:no-underline"
                            onClick={(e) => { e.stopPropagation(); setShowFullPrayer(true); }}
                        >
                            Read Full Request
                        </Button>
                    )}
                </div>
            </div>
           )}

           {totalReactions > 0 && (
             <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 text-left">
                    <div className="flex items-center -space-x-1.5 text-left">
                        {supporters.length > 0 && <div className="bg-primary rounded-full p-1 border-2 border-background z-30 shadow-sm"><HandHeart className="h-2.5 w-2.5 text-primary-foreground fill-current" /></div>}
                        {inspiredBy.length > 0 && <div className="bg-chart-3 rounded-full p-1 border-2 border-background z-20 shadow-sm"><Sparkles className="h-2.5 w-2.5 text-white fill-current" /></div>}
                        {connectedBy.length > 0 && <div className="bg-blue-500 rounded-full p-1 border-2 border-background z-10 shadow-sm"><PartyPopper className="h-2.5 w-2.5 text-white" /></div>}
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight text-left">{(supporters.length + inspiredBy.length + connectedBy.length)}</span>
                </div>
                {testimony.campaignTitle && <span className="text-[9px] font-black uppercase text-muted-foreground/60 truncate italic bg-muted/50 px-2 py-0.5 rounded-full border max-w-[150px]">RE: {testimony.campaignTitle}</span>}
             </div>
           )}
        </div>

        <Separator className="mx-4 sm:mx-6 w-auto opacity-50" />
        <div className="py-2 sm:py-3 px-2 sm:px-6 grid grid-cols-4 gap-1 sm:gap-2 text-left">
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('amen'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasAmened && "text-primary hover:text-primary bg-primary/5")}>
                {isProcessingReaction === 'amen' ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <HandHeart className={cn("mr-2 h-4 w-4", hasAmened && "fill-current")} />}<span>Amen</span>
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('inspired'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasInspired && "text-chart-3 hover:text-chart-3 bg-chart-3/5")}>
                {isProcessingReaction === 'inspired' ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Sparkles className={cn("h-3.5 w-3.5", hasInspired && "fill-current")} />}<span>Hallelujah</span>
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('connect'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasConnected && "text-blue-500 hover:text-blue-500 bg-blue-500/5")}>
                {isProcessingReaction === 'connect' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PartyPopper className={cn("h-3.5 w-3.5", hasConnected && "fill-current")} />}<span>Celebrate</span>
            </Button>
            <Button variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", isCommentsOpen && "text-primary hover:text-primary bg-primary/5")} onClick={(e) => { e.stopPropagation(); setIsCommentsOpen(true); }}>
                <div className="relative flex flex-col items-center justify-center h-full"><MessageSquare className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isCommentsOpen && "fill-current")} />{commentCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3 sm:h-4 w-4 items-center justify-center rounded-full bg-primary text-[7px] sm:text-[8px] font-black text-primary-foreground border-background border-2 shadow-sm text-center">{commentCount}</span>}</div><span>Comment</span>
            </Button>
        </div>
      </div>

      {mounted && (
        <>
            <Drawer open={isBoostOpen} onOpenChange={setIsBoostOpen}>
                <DrawerContent className="p-0 rounded-t-[2.5rem] h-auto pb-12 text-left">
                    <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                        <DrawerHeader className="p-0 text-left">
                            <div className="flex items-center gap-2 mb-2 text-left text-left">
                                <TrendingUp className="h-5 w-5 text-indigo-600 text-left" />
                                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.3em]">Kingdom Promotion</span>
                            </div>
                            <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Boost Your Testimony</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium mt-1 text-left">Share your miracle with a wider global audience.</DrawerDescription>
                        </DrawerHeader>
                    </div>
                    <div className="p-8 space-y-6 text-left">
                        <div className="bg-primary/5 rounded-2xl p-6 border-2 border-dashed border-primary/20 text-left">
                            <h4 className="font-bold text-sm mb-2 text-left">Promotion Benefits</h4>
                            <ul className="space-y-2 text-xs text-muted-foreground font-medium text-left">
                                <li className="flex items-center gap-2 text-left"><Sparkles className="h-3.5 w-3.5 text-primary text-left" /> Featured in the Kingdom Spotlight carousel.</li>
                                <li className="flex items-center gap-2 text-left"><Sparkles className="h-3.5 w-3.5 text-primary text-left" /> Prioritized in search results and regional feeds.</li>
                                <li className="flex items-center gap-2 text-left"><Sparkles className="h-3.5 w-3.5 text-primary text-left" /> Reach believers outside your immediate circle.</li>
                            </ul>
                        </div>
                        
                        <div className="p-6 rounded-2xl border bg-muted/20 space-y-4 text-left">
                            <div className="space-y-1 text-left">
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-left">Estimated Reach</p>
                                <p className="text-2xl font-black text-primary text-left">5,000+ Believers</p>
                            </div>
                            <p className="text-xs text-muted-foreground italic text-left">Select 'Proceed' to view payment coordinates and finalize your boost request.</p>
                        </div>

                        <div className="flex gap-3 text-left">
                            <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsBoostOpen(false)}>Cancel</Button>
                            <Button asChild className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-center">
                                <Link href="/contact?subject=Testimony Boost Request&id=" + testimony.id>PROCEED TO HUB</Link>
                            </Button>
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>

            {isMobile ? (
                <>
                    <Drawer open={showFullText} onOpenChange={setShowFullText}>
                        <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/20 text-left text-left"><DrawerHeader className="text-left p-0 text-left text-left text-left"><DrawerTitle className="text-2xl font-black font-headline text-left text-left text-left">Kingdom Testimony</DrawerTitle><DrawerDescription className="text-sm font-bold uppercase tracking-widest text-left text-left text-left text-left">BY {authorName} • {displayDate}</DrawerDescription></DrawerHeader></div>
                            <div className="flex-grow min-h-0 pt-8 px-6 text-left">{fullTextContent}</div>
                        </DrawerContent>
                    </Drawer>
                    <Drawer open={showFullPrayer} onOpenChange={setShowFullPrayer}>
                        <DrawerContent className="h-auto max-h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b shrink-0 bg-amber-500/10 text-left text-left"><DrawerHeader className="text-left p-0 text-left text-left text-left"><DrawerTitle className="text-2xl font-black font-headline uppercase text-amber-600 text-left text-left text-left">Answered Prayer</DrawerTitle><DrawerDescription className="text-sm font-medium mt-1 text-left text-left text-left">The specific request that God has fulfilled.</DrawerDescription></DrawerHeader></div>
                            <ScrollArea className="flex-grow px-8 py-10 text-left">
                                {fullPrayerContent}
                            </ScrollArea>
                        </DrawerContent>
                    </Drawer>
                    <Drawer open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                        <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left"><div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left"><DrawerHeader className="text-left p-0 text-left text-left text-left text-left"><DrawerTitle className="text-2xl font-black font-headline uppercase text-left text-left text-left">Responses</DrawerTitle><DrawerDescription className="text-sm font-bold uppercase tracking-widest text-left text-left text-left">GATHERED JOY FOR {authorName}</DrawerDescription><div className="flex items-center gap-2 mt-4 text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce text-left" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-left">Swipe down to close</span></div></DrawerHeader></div><div className="flex-grow min-h-0 text-left"><CommentSection testimonyId={testimony.id} /></div></DrawerContent>
                    </Drawer>
                </>
            ) : (
                <>
                    <Dialog open={showFullText} onOpenChange={open => { setShowFullText(open); if(!open) setIsCommentsOpen(false); }}>
                        <DialogContent className="sm:max-w-4xl rounded-3xl overflow-hidden p-0 text-left text-left"><div className="p-8 border-b bg-muted/10 text-left text-left text-left"><DialogHeader className="text-left p-0 text-left text-left text-left text-left"><DialogTitle className="text-3xl font-black font-headline tracking-tight uppercase text-left text-left text-left">Kingdom Testimony</DialogTitle><DialogDescription className="text-sm font-bold uppercase tracking-widest text-left text-left text-left">BY {authorName} • {displayDate}</DialogDescription></DialogHeader></div><div className="p-8 text-left text-left">{fullTextContent}</div></DialogContent>
                    </Dialog>
                    <Dialog open={showFullPrayer} onOpenChange={setShowFullPrayer}>
                        <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left">
                             <div className="p-8 border-b bg-amber-500/10 text-left text-left">
                                <DialogHeader className="text-left p-0 text-left text-left">
                                    <DialogTitle className="text-2xl font-black font-headline uppercase text-amber-600 text-left text-left">Answered Prayer Request</DialogTitle>
                                    <DialogDescription className="text-left text-left">The original request shared with the body.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className="p-8 text-left text-left">
                                {fullPrayerContent}
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                        <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh] p-0 overflow-hidden rounded-3xl text-left"><div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left"><DialogHeader className="text-left p-0 text-left text-left text-left text-left"><DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-left text-left text-left text-left text-left">Gathered Responses</DialogTitle><DialogDescription className="text-sm font-bold uppercase tracking-widest text-left text-left text-left text-left">COMMUNITY RESPONSES TO THIS MIRACLE</DialogDescription></DialogHeader></div><div className="flex-1 min-h-0 text-left"><CommentSection testimonyId={testimony.id} /></div></DialogContent>
                    </Dialog>
                </>
            )}
        </>
      )}
    </>
  );
});
TestimonyCard.displayName = "TestimonyCard";

