'use client';

import * as React from "react";
import { useState, useMemo, useEffect, memo, useRef } from "react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Testimony, UserProfile, FollowUpStatus } from "@/lib/types";
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
  TrendingUp,
  Target,
  Music,
  Mic,
  Newspaper,
  ExternalLink
} from "lucide-react";
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
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription
} from "@/components/ui/drawer";
import { useUser, useDoc, useCollection, useFirestore, useUserProfile } from "@/firebase";
import {
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  collection, 
  query, 
  serverTimestamp, 
  addDoc, 
  setDoc, 
  getDoc 
} from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn, safeToDate } from "@/lib/utils";
import Image from 'next/image';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { CommentSection } from "./comment-section";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { MutualConnectBadge } from "./mutual-connect-badge";
import { motion, AnimatePresence } from "framer-motion";

export function getYouTubeEmbedUrl(url: string | undefined | null) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
}

export const MediaPreview = ({ url, type, isFull = false }: { url: string, type: 'image' | 'video' | 'audio', isFull?: boolean }) => {
  const isAudio = type === 'audio';
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const mediaContent = (
      <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
          <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
              {type === 'image' ? (
                  <Image src={url} alt="Proof Full" fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized />
              ) : type === 'video' ? (
                  <video 
                    src={url} 
                    className="w-full h-full object-contain" 
                    playsInline 
                    controls 
                    autoPlay 
                    preload="metadata" 
                    onError={(e) => {
                        console.error("Playback failed", e.currentTarget.error);
                        toast({ variant: 'destructive', title: 'Playback failed', description: `Error code: ${e.currentTarget.error?.code}` });
                    }}
                  />
              ) : (
                  <div className="w-full max-w-sm flex flex-col items-center gap-8 bg-zinc-900 p-12 rounded-[3rem] border border-white/10 shadow-2xl">
                      <div className="relative text-center">
                          <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 shadow-[0_0_50px_rgba(249,116,22,0.15)] mx-auto">
                              <Mic className="h-16 w-16 text-primary" />
                          </div>
                          <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-primary animate-pulse" />
                      </div>
                      <div className="space-y-2 text-center">
                          <h4 className="text-xl font-black font-headline uppercase tracking-tight text-white">Voice Proclamation</h4>
                          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest italic">A testimony of God's goodness</p>
                      </div>
                      <audio 
                        key={url} 
                        src={url} 
                        className="w-full" 
                        controls 
                        preload="metadata" 
                        autoPlay
                        onError={(e) => {
                            console.error("Playback failed", e.currentTarget.error);
                            toast({ variant: 'destructive', title: 'Playback failed', description: `Error code: ${e.currentTarget.error?.code}` });
                        }}
                      />
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 text-center">
                          <HandHeart className="h-3 w-3" />
                          Glory to God
                      </div>
                  </div>
              )}
          </div>
      </div>
  );

  const trigger = (
      <div 
        className={cn(
            "relative rounded-2xl sm:rounded-3xl overflow-hidden border shadow-inner bg-muted group/media cursor-pointer text-left",
            isAudio ? "h-auto min-h-[100px]" : "aspect-square",
            isFull && !isAudio && "h-full w-full"
        )}
        onClick={() => setIsOpen(true)}
      >
          {type === 'image' ? (
              <Image src={url} alt="Proof" fill className="object-cover transition-transform group-hover/media:scale-105" unoptimized />
          ) : type === 'video' ? (
              <video src={url} className="w-full h-full object-cover bg-zinc-950" muted playsInline loop preload="metadata" />
          ) : (
              <div className="w-full h-full flex flex-row items-center gap-4 bg-primary/5 p-4 text-left">
                  <div className="relative shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-inner">
                          <Mic className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <motion.div 
                        className="absolute -top-1 -right-1"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                      </motion.div>
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-[10px] sm:text-[11px] font-black uppercase text-primary tracking-widest leading-none">Voice of Thanksgiving</p>
                    <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase tracking-tighter opacity-60">Tap to Hear Miracle</p>
                  </div>
              </div>
          )}
          <div className="absolute inset-0 bg-black/5 group-hover/media:bg-transparent transition-colors duration-500" />
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 opacity-0 group-hover/media:opacity-100 transition-opacity shadow-2xl">
              <Sparkles className="h-3 w-3 sm:h-4 w-4 text-primary animate-pulse" />
          </div>
      </div>
  );

  if (isMobile) {
      return (
          <>
            {trigger}
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
                <DrawerContent className="p-0 bg-black/95 border-0 h-dvh rounded-none flex items-center justify-center text-center">
                    <div className="sr-only">
                        <DrawerHeader>
                            <DrawerTitle>Media View</DrawerTitle>
                            <DrawerDescription>Full screen media preview.</DrawerDescription>
                        </DrawerHeader>
                    </div>
                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-50 rounded-full bg-white/10 text-white hover:bg-white/20" onClick={() => setIsOpen(false)}>
                        <X className="h-6 w-6" />
                    </Button>
                    {mediaContent}
                </DrawerContent>
            </Drawer>
          </>
      );
  }

  return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
          {trigger}
          <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
              <div className="sr-only">
                  <DialogHeader>
                    <DialogTitle>Full View</DialogTitle>
                    <DialogDescription>Full miracle proof preview.</DialogDescription>
                  </DialogHeader>
              </div>
              {mediaContent}
          </DialogContent>
      </Dialog>
  );
};

export function LiveAuthorAvatar({ userId, fallbackInitials, className }: { userId: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userRef = React.useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const photoURL = profile?.photoURL;
    
    return (
        <Dialog>
            <DialogTrigger asChild disabled={!photoURL}>
                <div className={cn(className, photoURL && "cursor-pointer active:scale-95 transition-transform hover:scale-105 text-left")}>
                    <Avatar className="h-full w-full border shadow-sm">
                        <AvatarImage src={photoURL} className="object-cover" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary font-bold text-center flex items-center justify-center h-full w-full">{fallbackInitials || 'U'}</AvatarFallback>
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

function LiveAuthorName({ userId, fallbackName }: { userId: string, fallbackName: string }) {
    const firestore = useFirestore();
    const userRef = React.useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const name = profile ? `${profile.firstName} ${profile.lastName}` : fallbackName;
    return <span className="capitalize">{name}</span>;
}

export function getStatusClasses(status: FollowUpStatus | undefined): string {
    if (!status) return 'bg-secondary text-secondary-foreground border-border';
    switch (status) {
        case 'New':
            return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-500';
        case 'Contacted':
            return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-500';
        case 'Established':
            return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-500';
        default:
            return 'bg-secondary text-secondary-foreground border-border';
    }
}

export const TestimonyCard = memo(function TestimonyCard({ 
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
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [isProcessingReaction, setIsProcessingReaction] = useState<string | null>(null);
  const [isRequestingPartner, setIsRequestingPartner] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const prayerRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isPrayerTruncated, setIsPrayerTruncated] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [showFullPrayer, setShowFullPrayer] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isBoostOpen, setIsBoostOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthor = user?.uid === testimony.authorId;
  
  const authorFirstName = testimony.authorFirstName;
  const authorLastName = testimony.authorLastName;
  const authorName = testimony.isAnonymous ? 'Confidential Request' : ([authorFirstName, authorLastName].filter(Boolean).join(' ') || 'Kingdom Believer');
  const initials = (authorFirstName?.charAt(0) || '') + (authorLastName?.charAt(0) || '');

  const profileLink = isAuthor ? "/profile" : `/profile/${testimony.authorId}`;

  const supporters = testimony.supporters || [];
  const inspiredBy = testimony.inspiredBy || [];
  const connectedBy = testimony.connectedBy || [];
  
  const totalReactions = supporters.length + inspiredBy.length + connectedBy.length;

  const hasAmened = useMemo(() => user ? supporters.includes(user.uid) : false, [user, supporters]);
  const hasInspired = useMemo(() => user ? inspiredBy.includes(user.uid) : false, [user, inspiredBy]);
  const hasCelebrated = useMemo(() => user ? connectedBy.includes(user.uid) : false, [user, connectedBy]);
  
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

  useEffect(() => {
    const handlePopState = () => {
      if (showFullText) setShowFullText(false);
    };
    if (showFullText) {
      window.history.pushState({ testimonyPopup: testimony.id }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showFullText, testimony.id]);

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const shareUrl = `${window.location.origin}/testimonies#${testimony.id}`;
    const textContent = `"${testimony.content.substring(0, 200)}${testimony.content.length > 200 ? '...' : ''}"\n\nRead full miracle on Testify:`;
    
    const shareData: any = { title: 'Kingdom Testimony | Testify', text: textContent, url: shareUrl };

    try {
      if (navigator && navigator.share) {
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
    const hasReacted = (type === 'amen' && hasAmened) || (type === 'inspired' && hasInspired) || (type === 'connect' && hasCelebrated);
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
    const newRequestData = { fromUserId: user.uid, fromUserFirstName: currentUserProfile.firstName || '', fromUserLastName: currentUserProfile.lastName || '', fromUserPhotoURL: currentUserProfile.photoURL || '', toUserId: testimony.authorId, toUserFirstName: authorFirstName || '', toUserLastName: authorLastName || '', toUserPhotoURL: testimony.authorAvatarUrl || '', status: 'pending' as const, createdAt: serverTimestamp(), participantIds };
    const notificationData = { userId: testimony.authorId, type: 'accountability_request' as const, title: 'New Accountability Request', message: `${currentUserProfile.firstName} wants to be your partner!`, link: '/accountability', isRead: false, createdAt: serverTimestamp() };

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
              <MediaPreview url={testimony.mediaUrl} type={testimony.mediaType as any} isFull />
            )}
            {testimony.mediaUrl2 && (
              <MediaPreview url={testimony.mediaUrl2} type={testimony.mediaType2 as any} isFull />
            )}
        </div>
        <div className="text-base sm:text-lg text-muted-foreground whitespace-pre-wrap leading-relaxed font-medium">
            {testimony.content}
        </div>
      </div>
    </ScrollArea>
  );

  return (
    <>
      <div id={testimony.id} className={cn(
        "flex flex-col h-full w-full overflow-hidden transition-all duration-300 scroll-mt-48 text-left",
        "rounded-none sm:rounded-[2rem] border-y border-border sm:border-x border-t-4 border-t-amber-500/20 shadow-none sm:shadow-lg",
        "bg-card/50 backdrop-blur-sm",
        isPartner && "sm:ring-1 ring-primary/20",
        testimony.answeredPrayerId && "sm:border-l-4 sm:border-l-amber-500"
      )}>
        <div className="p-4 sm:p-6 pb-2 text-left">
          <div className="flex flex-row items-start justify-between gap-3 text-left">
            <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                {testimony.isAnonymous ? (
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-left"><Users className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                ) : (
                    <LiveAuthorAvatar userId={String(testimony.authorId)} fallbackInitials={initials} className="h-11 w-11 sm:h-14 sm:w-14" />
                )}
                <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link href={profileLink} onClick={(e) => e.stopPropagation()} className="hover:underline decoration-primary/30 underline-offset-2 shrink-0">
                             <h3 className="text-base sm:text-lg font-bold capitalize leading-none text-left"> 
                                <LiveAuthorName userId={String(testimony.authorId)} fallbackName={authorName} />
                             </h3>
                        </Link>
                        {isPartner && <Badge variant="secondary" className="h-4 px-1.5 text-[9px] uppercase font-bold tracking-tighter bg-primary/10 text-primary border-primary/20 shrink-0">Partner</Badge>}
                        {!isAuthor && !isPartner && currentUserProfile && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button className={cn("h-6 w-6 rounded-full transition-colors flex items-center justify-center", hasPendingRequest ? "text-muted-foreground" : "text-primary hover:bg-primary/10")} onClick={handleSendPartnerRequest} disabled={isRequestingPartner || hasPendingRequest}>
                                            {isRequestingPartner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : hasPendingRequest ? <Hourglass className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-xl border-primary/20 shadow-xl"><p className={cn("text-[10px] font-black uppercase tracking-widest")}>{hasPendingRequest ? "Request Pending" : "Add Accountability Partner"}</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    <div className="text-muted-foreground text-sm mt-1 flex flex-col gap-0.5 text-left text-left text-left">
                        <div className="truncate text-[10px] sm:text-xs opacity-70"> {displayDate}</div>
                        <div className="flex items-center gap-1 mt-0.5 opacity-80 text-[10px] sm:text-xs font-medium"><Globe className="h-3 w-3 text-primary shrink-0" /> {locationString}</div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-background" onClick={handleShare}>
                    <Share2 className="h-3.5 w-3.5" /><span className="sr-only">Share</span>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); }}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl text-left text-left">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-black text-left">Manage Story</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {isAuthor ? (
                            <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerAction(onEdit); }} className="rounded-lg text-left">
                                    <Edit className="mr-2 h-4 w-4 text-primary" />
                                    Edit Story
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsBoostOpen(true); }} className="rounded-lg text-left">
                                    <TrendingUp className="mr-2 h-4 w-4 text-indigo-600" />
                                    Boost Miracle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerAction(onDelete); }} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-lg text-left">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Permanently
                                </DropdownMenuItem>
                            </>
                        ) : (
                            <DropdownMenuItem onClick={handleShare} className="rounded-lg text-left">
                                <Share2 className="mr-2 h-4 w-4 text-primary" />
                                Spread the Word
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
        </div>
        
        <div className="flex-grow pt-2 px-4 sm:px-6 space-y-4 text-left text-left">
          <div className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            <div className={cn("leading-relaxed max-w-full", (testimony.mediaUrl || testimony.mediaUrl2) ? "line-clamp-3" : "line-clamp-6")}>
                <div ref={contentRef}>{testimony.content}</div>
            </div>
            {isTruncated && <Button variant="link" className="p-0 h-auto text-sm text-primary font-bold mt-1 text-left" onClick={(e) => { e.stopPropagation(); setShowFullText(true); }}>Read Full Story</Button>}
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
            <div className="rounded-2xl border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 shadow-inner overflow-hidden">
                <div className="p-4 text-left">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 font-black mb-1">Answering Prayer Request:</div>
                    <div className="border-l-2 border-amber-500/30 pl-4 italic text-sm text-muted-foreground">
                        <div className="line-clamp-2">
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
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center -space-x-1.5">
                        {supporters.length > 0 && <div className="bg-primary rounded-full p-1 border-2 border-background z-30 shadow-sm"><HandHeart className="h-2.5 w-2.5 text-primary-foreground fill-current" /></div>}
                        {inspiredBy.length > 0 && <div className="bg-chart-3 rounded-full p-1 border-2 border-background z-20 shadow-sm"><Sparkles className="h-2.5 w-2.5 text-white fill-current" /></div>}
                        {connectedBy.length > 0 && <div className="bg-blue-500 rounded-full p-1 border-2 border-background z-10 shadow-sm"><PartyPopper className="h-2.5 w-2.5 text-white" /></div>}
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight"> {totalReactions}</span>
                </div>
                {testimony.campaignTitle && <span className="text-[9px] font-black uppercase text-muted-foreground/60 truncate italic bg-muted/50 px-2 py-0.5 rounded-full border max-w-[150px]">RE: {testimony.campaignTitle}</span>}
             </div>
           )}
        </div>

        <Separator className="mx-4 sm:mx-6 w-auto opacity-50" />
        <div className="py-2 sm:py-3 px-2 sm:px-6 grid grid-cols-4 gap-1 sm:gap-2 text-left text-left text-left">
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('amen'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasAmened && "text-primary hover:text-primary bg-primary/5")}>
                {isProcessingReaction === 'amen' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HandHeart className={cn("h-4 w-4", hasAmened && "fill-current")} />}
                Amen {supporters.length > 0 && `(${supporters.length})`}
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('inspired'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasInspired && "text-chart-3 hover:text-chart-3 bg-chart-3/5")}>
                {isProcessingReaction === 'inspired' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className={cn("h-4 w-4", hasInspired && "fill-current")} />}
                Hallelujah {inspiredBy.length > 0 && `(${inspiredBy.length})`}
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('connect'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasCelebrated && "text-blue-500 hover:text-blue-500 bg-blue-500/5")}>
                {isProcessingReaction === 'connect' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-left" /> : <PartyPopper className={cn("h-3.5 w-3.5", hasCelebrated && "fill-current")} />}
                Celebrate {connectedBy.length > 0 && `(${connectedBy.length})`}
            </Button>
            <Button variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", isCommentsOpen && "text-primary hover:text-primary bg-primary/5")} onClick={(e) => { e.stopPropagation(); setIsCommentsOpen(true); }}>
                <div className="relative flex flex-col items-center justify-center h-full text-left"><MessageSquare className={cn("h-3.5 w-3.5 sm:h-4 w-4", isCommentsOpen && "fill-current")} />{commentCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3 sm:h-4 w-4 items-center justify-center rounded-full bg-primary text-[7px] sm:text-[8px] font-black text-primary-foreground border-background border-2 shadow-sm text-center text-center"> {commentCount}</span>}</div>Comment
            </Button>
        </div>
      </div>

      {mounted && (
        <>
            <Drawer open={isBoostOpen} onOpenChange={setIsBoostOpen}>
                <DrawerContent className="p-0 rounded-t-[2.5rem] h-auto pb-12 text-left text-left text-left">
                    <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left">
                        <div className="p-0 text-left text-left text-left">
                            <div className="flex items-center gap-2 mb-2 text-left text-left text-left text-left">
                                <TrendingUp className="h-5 w-5 text-indigo-600" />
                                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.3em] text-left text-left text-left">Kingdom Promotion</span>
                            </div>
                            <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left">Boost Your Testimony</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium mt-1 text-balance text-left text-left text-left">Share your miracle with a wider global audience.</DrawerDescription>
                        </div>
                    </div>
                    <div className="p-8 space-y-6 text-left text-left text-left text-left text-left text-left">
                        <div className="bg-primary/5 rounded-2xl p-6 border-2 border-dashed border-primary/20 text-left text-left text-left text-left">
                            <h4 className="font-bold text-sm mb-2 text-left text-left text-left">Promotion Benefits</h4>
                            <ul className="space-y-2 text-xs text-muted-foreground font-medium text-left">
                                <li className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" /> Featured in the Kingdom Spotlight carousel.</li>
                                <li className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" /> Prioritized in search results and regional feeds.</li>
                                <li className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" /> Reach believers outside your immediate circle.</li>
                            </ul>
                        </div>
                        
                        <div className="p-6 rounded-2xl border bg-muted/20 space-y-4 text-left text-left text-left">
                            <div className="space-y-1 text-left text-left text-left">
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-left text-left">Estimated Reach</p>
                                <p className="text-2xl font-black text-primary text-left text-left">5,000+ Believers</p>
                            </div>
                            <p className="text-xs text-muted-foreground italic text-left text-left">Select 'Proceed' to view payment coordinates and finalize your boost request.</p>
                        </div>

                        <div className="flex gap-3 text-left text-left text-left">
                            <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold text-left text-left" onClick={() => setIsBoostOpen(false)}>Cancel</Button>
                            <Button asChild className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-center text-center">
                                <Link href={`/contact?subject=Testimony Boost Request&id=${testimony.id}`}>PROCEED TO HUB</Link>
                            </Button>
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>

            {isMobile ? (
                <>
                    <Drawer open={showFullText} onOpenChange={setShowFullText}>
                        <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left text-left text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/20 text-left text-left text-left text-left text-left">
                                <DrawerHeader className="text-left p-0 text-left text-left text-left text-left text-left">
                                    <DrawerTitle className="text-2xl font-black font-headline text-left text-left text-left text-left text-left">Kingdom Testimony</DrawerTitle>
                                    <DrawerDescription className="text-sm font-bold uppercase tracking-widest text-left text-left text-left text-left text-left">BY {authorName} • {displayDate}</DrawerDescription>
                                </DrawerHeader>
                            </div>
                            <div className="flex-grow min-h-0 pt-8 px-6 text-left text-left text-left">{fullTextContent}</div>
                        </DrawerContent>
                    </Drawer>
                    <Drawer open={showFullPrayer} onOpenChange={setShowFullPrayer}>
                        <DrawerContent className="h-auto max-h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left text-left text-left text-left">
                            <div className="p-8 border-b shrink-0 bg-amber-500/10 text-left text-left text-left text-left text-left">
                                <DrawerHeader className="text-left p-0 text-left text-left text-left text-left text-left">
                                    <DrawerTitle className="text-2xl font-black font-headline uppercase text-amber-600 text-left text-left text-left text-left text-left"><Target className="h-5 w-5 mr-2 inline" />Answered Prayer</DrawerTitle>
                                    <DrawerDescription className="text-sm font-medium mt-1 text-left text-left text-left text-left text-left">The specific request that God has fulfilled.</DrawerDescription>
                                </DrawerHeader>
                            </div>
                            <ScrollArea className="flex-grow px-8 py-10 text-left text-left text-left">
                                <div className="text-base text-muted-foreground whitespace-pre-wrap leading-relaxed italic text-left text-left">
                                    {testimony.answeredPrayerContent}
                                </div>
                            </ScrollArea>
                        </DrawerContent>
                    </Drawer>
                    <Drawer open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                        <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left text-left text-left text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left text-left">
                                <DrawerHeader className="text-left p-0 text-left text-left text-left text-left text-left">
                                    <DrawerTitle className="text-2xl font-black font-headline uppercase text-left text-left text-left text-left text-left">Responses</DrawerTitle>
                                    <DrawerDescription className="text-sm font-bold uppercase tracking-widest text-left text-left text-left text-left text-left">GATHERED JOY FOR {authorName}</DrawerDescription>
                                    <div className="flex items-center gap-2 mt-4 text-left text-left text-left text-left text-left text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center text-center">Swipe down to close</span></div>
                                </DrawerHeader>
                            </div>
                            <div className="flex-grow min-h-0 text-left text-left text-left text-left">{isCommentsOpen && <CommentSection testimonyId={testimony.id} />}</div>
                        </DrawerContent>
                    </Drawer>
                </>
            ) : (
                <>
                    <Dialog open={showFullText} onOpenChange={open => { setShowFullText(open); if(!open) setIsCommentsOpen(false); }}>
                        <DialogContent className="sm:max-w-4xl rounded-3xl overflow-hidden p-0 text-left text-left text-left">
                            <div className="p-8 border-b bg-muted/10 text-left text-left text-left">
                                <div className="p-0 text-left text-left">
                                    <DialogTitle className="text-3xl font-black font-headline uppercase text-left text-left">Kingdom Testimony</DialogTitle>
                                    <DialogDescription className="text-sm font-bold uppercase tracking-widest text-left text-left">BY {authorName} • {displayDate}</DialogDescription>
                                </div>
                            </div>
                            <div className="p-8 text-left text-left text-left">{fullTextContent}</div>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={showFullPrayer} onOpenChange={setShowFullPrayer}>
                        <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left">
                             <div className="p-8 border-b bg-amber-500/10 text-left text-left text-left text-left">
                                <div className="p-0 text-left text-left">
                                    <DialogTitle className="text-2xl font-black font-headline uppercase text-amber-600 text-left text-left text-left text-left text-left"><Target className="h-5 w-5 mr-2 inline" />Answered Prayer Request</DialogTitle>
                                    <DialogDescription className="text-sm font-medium mt-1 text-left text-left text-left text-left text-left">The original request shared with the body.</DialogDescription>
                                </div>
                            </div>
                            <div className="p-8 text-left text-left text-left">
                                <div className="text-base text-muted-foreground whitespace-pre-wrap leading-relaxed italic text-left text-left">
                                    {testimony.answeredPrayerContent}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                        <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh] p-0 overflow-hidden rounded-3xl text-left text-left text-left text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left">
                                <div className="p-0 text-left text-left">
                                    <DialogTitle className="text-2xl font-black font-headline uppercase text-left text-left text-left text-left text-left">Gathered Responses</DialogTitle>
                                    <DialogDescription className="text-sm font-bold uppercase tracking-widest text-left text-left text-left text-left text-left">COMMUNITY RESPONSES TO THIS MIRACLE</DialogDescription>
                                </div>
                            </div>
                            <div className="flex-1 min-h-0 text-left text-left text-left">{isCommentsOpen && <CommentSection testimonyId={testimony.id} />}</div>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </>
      )}
    </>
  );
});
TestimonyCard.displayName = "TestimonyCard";

```
  <change>
    <file>src/components/souls/soul-profile-content.tsx</file>
    <content><![CDATA['use client';

import * as React from "react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { 
  BookOpen, 
  Heart, 
  Sparkles,
  ArrowLeft,
  Zap, 
  Mail, 
  Phone, 
  MessageSquare, 
  Loader2, 
  Check,
  Award,
  HandHeart,
  PartyPopper,
  X,
  Target,
  Share,
  HeartHandshake,
  Search,
  BookMarked,
  Clock,
  Edit,
  Gift,
  History,
  Home,
  Lock,
  PlusCircle,
  Quote,
  Send,
  Users,
  Utensils,
  Download,
  ClipboardList,
  Camera,
  Smartphone,
  ChevronRight,
  Church,
  ShieldCheck,
  Trash2,
  MapPin,
  Info,
  Calendar,
  ChevronDown,
  TrendingUp,
  Music,
  ExternalLink,
  Mic
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn, safeToDate } from "@/lib/utils";
import { useUser, useDoc, useCollection, useFirestore, useUserProfile } from "@/firebase";
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  collection, 
  query, 
  serverTimestamp, 
  addDoc, 
  getDocs, 
  where,
  writeBatch,
  getDoc,
  setDoc
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { getBibleChapter, type BibleChapterOutput } from "@/ai/flows/get-bible-chapter-flow";
import { bibleData } from "@/lib/bible-data";
import { actionItems, prayerTemplates, kingdomVerses } from "@/lib/follow-up-data";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { MutualConnectBadge } from "./mutual-connect-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import Image from 'next/image';
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Soul, FollowUpStatus, UserProfile, DailyDevotional, TestimonyComment } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

export function getYouTubeEmbedUrl(url: string | undefined | null) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
}

export function getStatusClasses(status: FollowUpStatus | undefined): string {
    if (!status) return 'bg-secondary text-secondary-foreground border-border';
    switch (status) {
        case 'New':
            return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-500';
        case 'Contacted':
            return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-500';
        case 'Established':
            return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-500';
        default:
            return 'bg-secondary text-secondary-foreground border-border';
    }
}

export const MediaPreview = ({ url, type, isFull = false }: { url: string, type: 'image' | 'video' | 'audio', isFull?: boolean }) => {
  const isAudio = type === 'audio';
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const mediaContent = (
      <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
          <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
              {type === 'image' ? (
                  <Image src={url} alt="Proof Full" fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized />
              ) : type === 'video' ? (
                  <video 
                    src={url} 
                    className="w-full h-full object-contain" 
                    playsInline 
                    controls 
                    autoPlay 
                    preload="metadata"
                    onError={(e) => {
                        console.error("Playback failed", e.currentTarget.error);
                        toast({ variant: 'destructive', title: 'Playback failed', description: `Error code: ${e.currentTarget.error?.code}` });
                    }}
                  />
              ) : (
                  <div className="w-full max-w-sm flex flex-col items-center gap-8 bg-zinc-900 p-12 rounded-[3rem] border border-white/10 shadow-2xl">
                      <div className="relative text-center">
                          <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 shadow-[0_0_50px_rgba(249,116,22,0.15)] mx-auto">
                              <Mic className="h-16 w-16 text-primary" />
                          </div>
                          <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-primary animate-pulse" />
                      </div>
                      <div className="space-y-2 text-center">
                          <h4 className="text-xl font-black font-headline uppercase tracking-tight text-white">Voice Proclamation</h4>
                          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest italic">A testimony of God's goodness</p>
                      </div>
                      <audio 
                        key={url} 
                        src={url} 
                        className="w-full" 
                        controls 
                        preload="metadata" 
                        autoPlay
                        onError={(e) => {
                            console.error("Playback failed", e.currentTarget.error);
                            toast({ variant: 'destructive', title: 'Playback failed', description: `Error code: ${e.currentTarget.error?.code}` });
                        }}
                      />
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 text-center">
                          <HandHeart className="h-3 w-3" />
                          Glory to God
                      </div>
                  </div>
              )}
          </div>
      </div>
  );

  const trigger = (
      <div 
        className={cn(
            "relative rounded-2xl sm:rounded-3xl overflow-hidden border shadow-inner bg-muted group/media cursor-pointer text-left",
            isAudio ? "h-auto min-h-[100px]" : "aspect-square",
            isFull && !isAudio && "h-full w-full"
        )}
        onClick={() => setIsOpen(true)}
      >
          {type === 'image' ? (
              <Image src={url} alt="Proof" fill className="object-cover transition-transform group-hover/media:scale-105" unoptimized />
          ) : type === 'video' ? (
              <video src={url} className="w-full h-full object-cover bg-zinc-950" muted playsInline loop preload="metadata" />
          ) : (
              <div className="w-full h-full flex flex-row items-center gap-4 bg-primary/5 p-4 text-left text-left text-left text-left">
                  <div className="relative shrink-0 text-left text-left text-left">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-inner text-left text-left text-left">
                          <Mic className="h-5 w-5 sm:h-6 sm:w-6 text-primary text-left text-left text-left" />
                      </div>
                      <motion.div 
                        className="absolute -top-1 -right-1 text-left text-left text-left"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        <Sparkles className="h-3 w-3 text-primary animate-pulse text-left text-left text-left" />
                      </motion.div>
                  </div>
                  <div className="min-w-0 flex-1 text-left text-left text-left">
                    <p className="text-[10px] sm:text-[11px] font-black uppercase text-primary tracking-widest leading-none text-left text-left text-left">Voice of Thanksgiving</p>
                    <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase tracking-tighter opacity-60 text-left text-left text-left">Tap to Hear Miracle</p>
                  </div>
              </div>
          )}
          <div className="absolute inset-0 bg-black/5 group-hover/media:bg-transparent transition-colors duration-500" />
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 opacity-0 group-hover/media:opacity-100 transition-opacity shadow-2xl">
              <Sparkles className="h-3 w-3 sm:h-4 w-4 text-primary animate-pulse" />
          </div>
      </div>
  );

  if (isMobile) {
      return (
          <>
            {trigger}
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
                <DrawerContent className="p-0 bg-black/95 border-0 h-dvh rounded-none flex items-center justify-center text-center">
                    <div className="sr-only">
                        <DrawerHeader>
                            <DrawerTitle>Media View</DrawerTitle>
                            <DrawerDescription>Full screen media preview.</DrawerDescription>
                        </DrawerHeader>
                    </div>
                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-50 rounded-full bg-white/10 text-white hover:bg-white/20" onClick={() => setIsOpen(false)}>
                        <X className="h-6 w-6" />
                    </Button>
                    {mediaContent}
                </DrawerContent>
            </Drawer>
          </>
      );
  }

  return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
          {trigger}
          <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
              <div className="sr-only">
                  <DialogHeader>
                    <DialogTitle>Full View</DialogTitle>
                    <DialogDescription>Full miracle proof preview.</DialogDescription>
                  </DialogHeader>
              </div>
              {mediaContent}
          </DialogContent>
      </Dialog>
  );
};

export function IntercessionHubDialog({ isOpen, onOpenChange, soul, onComplete }: { isOpen: boolean; onOpenChange: (open: boolean) => void; soul: Soul | null; onComplete: (msg: string) => void; }) {
  const [text, setText] = useState('');
  const isMobile = useIsMobile();
  useEffect(() => { if(isOpen && soul) { setText(prayerTemplates[0].text.replace(/{name}/g, soul.firstName)); } }, [isOpen, soul]);
  
  const header = (
    <div className="p-8 border-b bg-muted/10 shrink-0 text-left flex items-center justify-between gap-4">
        <div className="min-w-0">
            <DialogHeader className="p-0 text-left">
                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Kingdom Intercession</DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-left text-left">Draft a powerful prayer for {soul?.firstName}.</DialogDescription>
            </DialogHeader>
        </div>
        <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60 hover:text-foreground" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
        </Button>
    </div>
  );

  const contentBody = (
    <div className="p-8 space-y-6 text-left">
        <div className="space-y-3 text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left">Select Prayer Focus</label>
            <div className="flex flex-wrap gap-2 text-left">
                {prayerTemplates.map(t => (
                    <Button key={t.id} variant="outline" size="sm" className="rounded-full h-8 px-4 text-[9px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 text-primary text-left text-left" onClick={() => soul && setText(t.text.replace(/{name}/g, soul.firstName))}>{t.label}</Button>
                ))}
            </div>
        </div>
        <div className="space-y-2 text-left">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left">Customize Your Prayer</Label>
            <Textarea value={text} onChange={e => setText(e.target.value)} className="min-h-[200px] rounded-2xl bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6 text-left text-left" />
        </div>
        <Button onClick={() => onComplete(text)} disabled={!text.trim()} className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-center text-left text-left">SEND</Button>
    </div>
  );

  if (isMobile) return <Sheet open={isOpen} onOpenChange={onOpenChange}><SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">{header}<ScrollArea className="flex-grow text-left">{contentBody}</ScrollArea></SheetContent></Sheet>;
  return <Dialog open={isOpen} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left">{header}<ScrollArea className="flex-1 min-h-0 text-left">{contentBody}</ScrollArea></DialogContent></Dialog>;
}

export function MessageHubDialog({ isOpen, onOpenChange, soul, onChannelSelect }: { isOpen: boolean; onOpenChange: (open: boolean) => void; soul: Soul | null; onChannelSelect: (channel: 'whatsapp' | 'sms') => void; }) {
  const isMobile = useIsMobile();
  const header = (
    <div className="p-8 border-b bg-muted/10 shrink-0 text-left flex items-center justify-between gap-4">
        <div className="min-w-0 text-left">
            <div className="flex items-center gap-2 mb-1 text-left text-left">
                <MessageSquare className="h-4 w-4 text-primary text-left text-left" />
                <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left text-left">Channel Select</span>
            </div>
            <h2 className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Message Hub</h2>
            <p className="text-sm font-medium text-left text-left">Encourage {soul?.firstName} via mobile.</p>
        </div>
        <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60 hover:text-foreground" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
        </Button>
    </div>
  );
  const contentBody = (
    <div className="flex flex-col gap-3 p-8 text-left text-left">
        <Button onClick={() => onChannelSelect('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg text-center text-left text-left"><WhatsAppIcon className="h-5 w-5 text-left text-left" /> WhatsApp External</Button>
        <Button onClick={() => onChannelSelect('sms')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary text-center text-left text-left"><MessageSquare className="h-5 w-5 text-left text-left" /> Standard SMS</Button>
    </div>
  );
  function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 0 0 0-3.48-8.413Z"/>
      </svg>
    );
  }
  if (isMobile) return <Sheet open={isOpen} onOpenChange={onOpenChange}><SheetContent side="bottom" className="p-0 rounded-t-[2.5rem] h-auto pb-12 text-left">{header}{contentBody}</SheetContent></Sheet>;
  return <Dialog open={isOpen} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center text-left">{header}{contentBody}</DialogContent></Dialog>;
}

export function ShareWordDialog({ isOpen, onOpenChange, soul, onSelectVerse }: { isOpen: boolean; onOpenChange: (open: boolean) => void; soul: Soul | null; onSelectVerse: (verse: string) => void; }) {
  const isMobile = useIsMobile();
  const [view, setView] = useState<'hub' | 'books' | 'chapters' | 'verses'>('hub');
  const [bibleSearch, setBibleSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{reference: string, text: string}[]>([]);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterContent, setChapterContent] = useState<BibleChapterOutput | null>(null);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);

  useEffect(() => { if (!isOpen) { setView('hub'); setBibleSearch(''); setSearchResults([]); setSelectedBook(null); setSelectedChapter(null); setChapterContent(null); setSelectedVerses([]); } }, [isOpen]);

  const handleSearch = async () => {
      if (!bibleSearch.trim()) return;
      setIsSearching(true);
      try {
          const res = await fetch(`https://bible-api.com/${encodeURIComponent(bibleSearch)}`);
          if (res.ok) {
              const data = await res.json();
              if (data.verses) setSearchResults([{ reference: data.reference, text: data.text }]);
          }
      } catch (e) { console.warn("Search failed", e); }
      finally { setIsSearching(false); }
  };

  const handleSelectChapter = async (num: number) => {
    if (!selectedBook) return;
    setSelectedChapter(num);
    setLoadingVerses(true);
    try {
      const result = await getBibleChapter({ book: selectedBook, chapter: num });
      setChapterContent(result);
      setView('verses');
    } catch (e) { console.error(e); }
    finally { setLoadingVerses(false); }
  };

  const handleShareSelected = () => {
    if (!chapterContent || selectedVerses.length === 0) return;
    const selectedTexts = chapterContent.verses.filter(v => selectedVerses.includes(v.verse)).map(v => v.text).join(' ');
    const reference = `${chapterContent.book} ${chapterContent.chapter}:${selectedVerses.join(', ')}`;
    onSelectVerse(`"${selectedTexts.trim()}" — ${reference}\n\nJoin the harvest at Testify! Visit: ${window.location.origin}/bible`);
  };

  const header = (
    <div className="p-8 border-b bg-muted/10 shrink-0 text-left flex items-center justify-between gap-4">
      <div className="min-w-0 text-left text-left">
        <div className="flex items-center gap-3 mb-2 text-left text-left">
          {view !== 'hub' && <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full -ml-2 text-left text-left" onClick={() => setView(view === 'verses' ? 'chapters' : view === 'chapters' ? 'books' : 'hub')}><ArrowLeft className="h-4 w-4 text-left text-left" /></Button>}
          <Target className="h-5 w-5 text-primary text-left text-left" /><span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left text-left text-left">Kingdom Study</span>
        </div>
        <DialogHeader className="text-left p-0 text-left text-left">
            <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left text-left">
                {view === 'hub' ? "Share the Word" : view === 'books' ? "Select Book" : view === 'chapters' ? `${selectedBook}: Chapter` : `${selectedBook} ${selectedChapter}`}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm font-medium text-left text-left text-left">
                {view === 'hub' ? `Equip ${soul?.firstName} with the living Word.` : `Browsing ${selectedBook || 'Bible'}...`}
            </DialogDescription>
        </DialogHeader>
      </div>
      {view !== 'hub' && <Button variant="outline" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/40 text-left text-left" onClick={() => onOpenChange(false)}><X className="h-5 w-5 sm:h-6 sm:w-6 text-left text-left" /></Button>}
    </div>
  );

  const contentBody = (
    <div className="p-4 sm:p-10 text-left text-left text-left">
        {view === 'hub' && (
            <div className="space-y-8 text-left text-left text-left">
                <div className="relative text-left text-left text-left"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 text-left text-left text-left" /><Input placeholder="Search Bible (e.g. John 3:16)..." value={bibleSearch} onChange={e => setBibleSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="h-12 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left text-left text-left" /></div>
                {searchResults.map((res, idx) => (<Button key={idx} variant="outline" className="w-full h-auto p-4 rounded-2xl border-primary/20 bg-primary/5 flex flex-col items-start gap-3 text-left border-2 border-dashed text-left text-left" onClick={() => onSelectVerse(`"${res.text.trim()}" — ${res.reference}`)}><span className="font-black text-[9px] uppercase tracking-widest text-primary text-left text-left text-left">{res.reference}</span><p className="text-xs text-muted-foreground italic line-clamp-4 text-left text-left text-left">"{res.text.trim()}"</p></Button>))}
                <div className="grid grid-cols-2 gap-4 text-left text-left text-left"><Button onClick={() => setView('books')} variant="outline" className="h-24 rounded-2xl border-2 border-primary/20 text-primary flex flex-col items-center justify-center p-4 text-center text-left text-left text-left"><BookOpen className="h-6 w-6 mb-1 text-left text-left text-left" /><span className="text-[10px] font-black uppercase text-center text-left text-left text-left">Browse Bible</span></Button><Button variant="outline" asChild className="h-24 rounded-2xl border-2 border-primary/20 text-primary flex flex-col items-center justify-center p-4 text-center text-left text-left text-left"><Link href="/dashboard/bible"><BookMarked className="h-6 w-6 mb-1 text-left text-left text-left" /><span className="text-[10px] font-black uppercase text-center text-left text-left text-left">Open Reader</span></Link></Button></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-left text-left">{kingdomVerses.map((v, idx) => (<Button key={idx} variant="ghost" className="w-full justify-start h-auto py-4 px-4 rounded-2xl bg-muted/5 border border-transparent hover:bg-primary/10 transition-all text-left block text-left text-left text-left" onClick={() => onSelectVerse(`"${v.text.trim()}" — ${v.reference}`)}><span className="font-black text-[9px] uppercase tracking-widest text-primary text-left text-left text-left">{v.reference}</span><p className="text-xs text-muted-foreground italic line-clamp-2 text-left text-left text-left">"{v.text}"</p></Button>))}</div>
            </div>
        )}
        {view === 'books' && <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-left text-left text-left">{bibleData.map(book => (<Button key={book.name} variant="outline" className="h-12 rounded-xl font-bold uppercase text-[9px] text-left text-left text-left" onClick={() => { setSelectedBook(book.name); setView('chapters'); }}>{book.name}</Button>))}</div>}
        {view === 'chapters' && <div className="p-2 grid grid-cols-5 sm:grid-cols-8 gap-2 text-left text-left text-left">{selectedBook && bibleData.find(b => b.name === selectedBook)?.chapters.map(ch => (<Button key={ch.chapter} variant="outline" className="h-9 w-9 p-0 rounded-lg font-black text-xs text-left text-left text-left" onClick={() => handleSelectChapter(ch.chapter)}>{ch.chapter}</Button>))}</div>}
        {view === 'verses' && <div className="space-y-4 pb-12 text-left text-left text-left"><div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6 text-left text-left text-left text-left"><p className="text-[10px] font-black uppercase text-primary mb-1 text-left text-left text-left text-left">SELECTED</p><p className="text-xs font-bold text-muted-foreground text-left text-left text-left text-left">{selectedVerses.length > 0 ? `${selectedBook} ${selectedChapter}:${selectedVerses.join(', ')}` : 'Select verses below...'}</p></div><div className="space-y-1 font-serif text-left text-left text-left text-left">{loadingVerses ? <div className="flex justify-center py-20 text-left text-left text-left text-left"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20 text-left text-left text-left text-left" /></div> : chapterContent?.verses.map(v => (<div key={v.verse} className={cn("p-3 rounded-xl transition-all cursor-pointer border-2 text-left", selectedVerses.includes(v.verse) ? "bg-primary/10 border-primary/40" : "bg-transparent border-transparent hover:bg-muted/50")} onClick={() => setSelectedVerses(prev => prev.includes(v.verse) ? prev.filter(vs => vs !== v.verse) : [...prev, v.verse].sort((a,b)=>a-b))}><sup className="text-[10px] font-black mr-2 opacity-40 text-left text-left text-left">{v.verse}</sup><span className="text-sm leading-relaxed text-left text-left text-left">{v.text}</span></div>))}</div></div>}
    </div>
  );

  const footer = view === 'verses' && <div className="p-6 border-t bg-muted/5 flex flex-col sm:flex-row gap-3 shrink-0 text-left text-left text-left text-left"><Button variant="outline" onClick={() => setSelectedVerses([])} className="rounded-xl h-12 flex-1 font-bold text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Clear</Button><Button onClick={handleShareSelected} disabled={selectedVerses.length === 0} className="rounded-xl h-12 flex-[2] font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-center text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">SHARE SELECTED ({selectedVerses.length})</Button></div>;

  if (isMobile) return <Sheet open={isOpen} onOpenChange={onOpenChange}><SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">{header}<ScrollArea className="flex-grow text-left">{contentBody}</ScrollArea>{footer}</SheetContent></Sheet>;
  return <Dialog open={isOpen} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-3xl max-h-[90dvh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left flex flex-col">{header}<ScrollArea className="flex-1 min-h-0 text-left">{contentBody}</ScrollArea>{footer}</DialogContent></Dialog>;
}

export function SoulProfileContent({ soul, onFollowUp, onViewHistory, onEdit, onAssess, onOpenAssignDialog, onExportSingle, onDelete }: { soul: Soul; onFollowUp: (s: Soul) => void; onViewHistory: (s: Soul) => void; onEdit: (s: Soul) => void; onAssess: (s: Soul) => void; onOpenAssignDialog: (s: Soul) => void; onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void; onDelete: (s: Soul) => void; }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { userProfile: currentUserProfile } = useUserProfile();
  const { toast } = useToast();
  const router = useRouter();

  const [isCommChannelDialogOpen, setIsCommChannelDialogOpen] = useState(false);
  const [isHelpNeedDialogOpen, setIsHelpNeedDialogOpen] = useState(false);
  const [isShareTargetDialogOpen, setIsShareTargetDialogOpen] = useState(false);
  const [isPartnerSelectionDialogOpen, setIsPartnerSelectionDialogOpen] = useState(false);
  const [isPrayerCustomizationOpen, setIsPrayerCustomizationOpen] = useState(false);
  const [isStudyWordOpen, setIsStudyWordOpen] = useState(false);
  const [customMessageText, setCustomMessageText] = useState('');
  const [clickedActionId, setClickedActionId] = useState<string | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const address = useMemo(() => { if (!soul.locationWon) return ''; return [soul.locationWon.street, soul.locationWon.city, soul.locationWon.state, soul.locationWon.country].filter(Boolean).join(', '); }, [soul.locationWon]);
  const needs = soul.needsAssessment;
  const sortedHistory = useMemo(() => { if (!soul.followUpLog || soul.followUpLog.length === 0) return []; return [...soul.followUpLog].sort((a, b) => (safeToDate(b.date)?.getTime() ?? 0) - (safeToDate(a.date)?.getTime() ?? 0)); }, [soul.followUpLog]);

  const finalizeLog = async (s: Soul, aId: string, noteAddendum: string = '') => {
    if (!user || !firestore || !s) return;
    setIsActionSubmitting(true);
    const action = actionItems.find(a => a.id === aId);
    const batch = writeBatch(firestore);
    const soulRef = doc(firestore, `users/${s.userId}/souls`, s.id);
    const globalSoulRef = doc(firestore, 'souls', s.id);
    const memberName = `${currentUserProfile?.firstName || ''} ${currentUserProfile?.lastName || ''}`.trim() || user.displayName || 'Member';
    const logEntry = { date: new Date(), note: `Logged via Identity Hub: ${action?.label}${noteAddendum ? ` - ${noteAddendum}` : ''}`, actions: [aId], memberId: user.uid, memberName: memberName };
    batch.update(soulRef, { followUpLog: arrayUnion(logEntry), lastUpdatedAt: serverTimestamp() });
    batch.update(globalSoulRef, { followUpLog: arrayUnion(logEntry), lastUpdatedAt: serverTimestamp() });
    try { await batch.commit(); toast({ title: 'Kingdom Impact Logged' }); } catch (err) { errorEmitter.emit('permission-error', new FirestorePermissionError({ path: soulRef.path, operation: 'update' }, user)); }
    finally { setIsActionSubmitting(false); setClickedActionId(null); }
  };

  const handleActionClick = async (actionId: string) => {
    if (!soul) return;
    setClickedActionId(actionId);
    if (['phone_call', 'text_message', 'prayed_together'].includes(actionId) && !soul.phone) { toast({ variant: 'destructive', title: 'Phone Missing', description: `Please save a number for ${soul.firstName} first.` }); return; }
    if (actionId === 'prayed_together') { setCustomMessageText(prayerTemplates[0].text.replace(/{name}/g, soul.firstName)); setIsPrayerCustomizationOpen(true); }
    else if (actionId === 'studied_bible') { setIsStudyWordOpen(true); }
    else if (actionId === 'text_message') { setIsCommChannelDialogOpen(true); }
    else if (actionId === 'introduced_friend') { setIsShareTargetDialogOpen(true); }
    else if (actionId === 'phone_call') { finalizeLog(soul, actionId, 'Dialer initiated'); window.location.href = `tel:${soul.phone}`; }
    else if (actionId === 'shared_meal' || actionId === 'gave_gift') { const mPath = actionId === 'shared_meal' ? '/marketplace' : '/marketplace/gifts'; router.push(`${mPath}?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}&actionId=${actionId}`); }
    else if (actionId === 'matchmaking') { router.push(`/matchmaking?soulId=${soul.id}`); }
    else if (actionId === 'invited_to_event') { finalizeLog(soul, actionId, 'Redirected to Events Hub'); router.push('/events'); }
    else if (actionId === 'helped_with_need') { setIsHelpNeedDialogOpen(true); }
    else { await finalizeLog(soul, actionId); }
  };

  const handleCommChoice = (channel: 'whatsapp' | 'sms') => {
      if (!soul?.phone || !clickedActionId) return;
      const cleanPhone = soul.phone.replace(/\+/g, '').replace(/\D/g, '');
      const message = customMessageText || `Hi ${soul.firstName}, thinking of you!`;
      if (channel === 'whatsapp') window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
      else window.location.href = `sms:${soul.phone}?body=${encodeURIComponent(message)}`;
      finalizeLog(soul, clickedActionId, `Sent via ${channel.toUpperCase()}`);
      setIsCommChannelDialogOpen(false);
      setCustomMessageText('');
  };

  const handleShareToPartner = async (partner: UserProfile['accountabilityPartners'][0]) => {
      if (!user || !firestore || !soul || !currentUserProfile) return;
      const wonAt = safeToDate(soul.wonAt);
      const text = `SHARING SOUL DATA:\nName: ${soul.firstName} ${soul.lastName}\nStatus: ${soul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\n\nLet's coordinate follow-up on Testify.`;
      try {
          const participantIds = [user.uid, partner.userId].sort();
          const chatsRef = collection(firestore, 'chats');
          const q = query(chatsRef, where('participantIds', '==', participantIds), where('isGroupChat', '==', false));
          const snap = await getDocs(q);
          let chatId: string;
          if (!snap.empty) chatId = snap.docs[0].id;
          else {
              const otherDoc = await getDoc(doc(firestore, 'users', partner.userId));
              const otherProfile = otherDoc.data() as UserProfile;
              const newChat = { participantIds, participantInfo: { [user.uid]: { firstName: currentUserProfile.firstName, lastName: currentUserProfile.lastName, photoURL: currentUserProfile.photoURL || '' }, [partner.userId]: { firstName: partner.firstName, lastName: partner.lastName, photoURL: partner.photoURL || '' } }, lastUpdatedAt: serverTimestamp(), isGroupChat: false, hasMessages: true };
              const ref = await addDoc(chatsRef, newChat);
              chatId = ref.id;
          }
          await addDoc(collection(firestore, 'chats', chatId, 'messages'), { senderId: user.uid, text, createdAt: serverTimestamp() });
          await updateDoc(doc(firestore, 'chats', chatId), { lastUpdatedAt: serverTimestamp(), hasMessages: true });
          toast({ title: 'Shared with Partner!' });
          finalizeLog(soul, 'introduced_friend', `Shared with partner: ${partner.firstName}`);
          setIsPartnerSelectionDialogOpen(false);
          setIsShareTargetDialogOpen(false);
          router.push(`/dashboard/chats/${chatId}`);
      } catch (e) { toast({ variant: 'destructive', title: 'Share Failed' }); }
  };

  const handleHelpNeedConfirm = (note: string) => { if (!soul) return; finalizeLog(soul, 'helped_with_need', `Service: ${note}`); setIsHelpNeedDialogOpen(false); setCustomMessageText(''); }

  const uniquePartners = useMemo(() => { const partners = currentUserProfile?.accountabilityPartners || []; const uniqueMap = new Map(); partners.forEach(p => { if (p.userId && !uniqueMap.has(p.userId)) uniqueMap.set(p.userId, p); }); return Array.from(uniqueMap.values()); }, [currentUserProfile?.accountabilityPartners]);

  const isRestrictedForMatchmaking = soul.age && soul.age < 20;

  return (
    <React.Fragment>
        <Card className="rounded-none sm:rounded-[2rem] overflow-hidden border-none shadow-2xl bg-card/50 backdrop-blur-sm border-t-8 border-t-primary/20 text-left">
            <CardHeader className="p-8 pb-4 text-center text-left text-left text-left">
                <div className="relative inline-block mx-auto mb-4 text-left text-left text-left text-left">
                    <Dialog><DialogTrigger asChild disabled={!soul.photoURL}><div className={cn("h-48 w-48 border-4 border-background shadow-xl ring-2 ring-primary/10 transition-all active:scale-105", soul.photoURL && "cursor-pointer hover:scale-105")}><Avatar className="h-full w-full border shadow-sm"><AvatarImage src={soul.photoURL || undefined} className="object-cover text-left text-left" /><AvatarFallback className="font-black bg-primary/10 text-primary text-center flex items-center justify-center h-full w-full text-3xl"> {soul.firstName?.charAt(0)}</AvatarFallback></Avatar></div></DialogTrigger>{soul.photoURL && (<DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center"><DialogHeader className="sr-only text-center"><DialogTitle>Profile Photo</DialogTitle></DialogHeader><div className="relative h-full w-full flex items-center justify-center p-4 text-center"><div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center"><Image src={soul.photoURL} alt={soul.firstName} fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized /></div></div></DialogContent>)}</Dialog>
                    {address && (<Button size="icon" className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full shadow-lg border-2 border-background" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')} title="View Map"><MapPin className="h-5 w-5" /></Button>)}
                </div>
                <div className="flex flex-col items-center gap-2"><CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-center w-full">{soul.firstName} {soul.lastName}</CardTitle><div className="flex gap-2 justify-center items-center"><Badge className={cn("h-5 px-2 text-[9px] uppercase font-black tracking-widest justify-center", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge><MutualConnectBadge soul={soul} /></div></div>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6 text-left">
                <Separator className="opacity-50" />
                <div className="space-y-4 text-left"><div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Spiritual Identity</p><div className="flex items-center gap-1 text-left"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"><Download className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl"><DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-black text-left">Select Format</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => onExportSingle(soul, 'csv')} className="text-left">CSV Export</DropdownMenuItem><DropdownMenuItem onSelect={() => onExportSingle(soul, 'pdf')} className="text-left">PDF Report</DropdownMenuItem></DropdownMenuContent></DropdownMenu><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onEdit(soul)}><Edit className="h-4 w-4" /></Button></div></div><div className="grid grid-cols-2 gap-4 text-left"><div className="space-y-1"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Full Name</p><p className="text-[11px] sm:text-xs font-bold text-left">{soul.firstName} {soul.lastName}</p></div><div className="space-y-1 text-left"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Gender/Age</p><p className="text-[11px] sm:text-xs font-bold text-left">{soul.gender || 'N/A'} • {soul.age ? `${soul.age} yrs` : 'Age N/A'}</p></div><div className="space-y-1 text-left"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Relationship</p><p className="text-[11px] sm:text-xs font-bold capitalize text-left">{soul.relationship || 'N/A'}</p></div><div className="space-y-1 text-left"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Work Status</p><p className="text-[11px] sm:text-xs font-bold capitalize text-left">{soul.workStatus || 'N/A'}</p></div><div className="space-y-1 text-left"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Rel. Status</p><p className="text-[11px] sm:text-xs font-bold capitalize text-left">{soul.maritalStatus || 'N/A'}</p></div><div className="space-y-1 text-left"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Nickname</p><p className="text-[11px] sm:text-xs font-bold capitalize text-left">{soul.nickname || 'N/A'}</p></div></div></div>
                <Separator className="opacity-20" />
                <div className="space-y-3 text-left"><div className="flex items-center justify-between text-left"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Contact Identity</p><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onEdit(soul)}><Edit className="h-4 w-4" /></Button></div><div className="space-y-2 text-left">{soul.phone ? (<div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-foreground text-left"><Phone className="h-3.5 w-3.5 text-primary shrink-0 text-left" />{soul.phone}</div>) : (<p className="text-[9px] text-muted-foreground/40 italic text-left">No phone recorded</p>)}{soul.email && (<div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-foreground text-left"><Mail className="h-3.5 w-3.5 text-primary shrink-0 text-left" />{soul.email}</div>)}</div></div>
                <Separator className="opacity-20" />
                <div className="space-y-4 text-left"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Relational Actions</p><div className="flex flex-col gap-2 text-left">{actionItems.map(action => { 
                    const Icon = iconMap[action.id] || Heart; 
                    const isThisProcessing = clickedActionId === action.id && isActionSubmitting; 
                    if (action.id === 'matchmaking' && (soul.maritalStatus === 'Married' || isRestrictedForMatchmaking)) return null; 
                    return (<Button key={action.id} variant="outline" className="flex items-center justify-start gap-3 h-12 px-4 rounded-xl border-2 border-transparent bg-muted/20 hover:bg-primary/5 hover:border-primary/10 transition-all text-left group" onClick={() => handleActionClick(action.id)} disabled={isActionSubmitting}><div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors text-left">{isThisProcessing ? <Loader2 className="h-4 w-4 animate-spin text-primary text-left" /> : <Icon className="h-4 w-4 text-left" />}</div><span className="text-xs font-bold uppercase tracking-tight truncate flex-1 text-left">{action.label}</span><ChevronRight className="h-4 w-4 text-muted-foreground opacity-20 group-hover:opacity-100 transition-opacity text-left" /></Button>) })}</div></div>
                <Separator className="opacity-20" />
                <div className="space-y-4 text-left"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Harvest Context</p><div className="space-y-1 text-left"><p className="text-[11px] sm:text-xs font-bold flex items-center gap-1.5 text-left"><Target className="h-3 w-3 text-primary text-left" />Source: {soul.source}</p></div></div>
                <Separator className="opacity-20" />
                <div className="space-y-4 text-left"><div className="flex items-center justify-between text-left"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Kingdom Placement</p><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onOpenAssignDialog(soul)}><Edit className="h-4 w-4" /></Button></div><div className="space-y-3 text-left"><div className="flex items-center gap-3 p-2 rounded-xl bg-primary/5 border border-primary/10 text-left"><HeartHandshake className="h-4 w-4 text-primary shrink-0 text-left" /><div className="min-w-0 text-left"><p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Fellowship</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize text-left">{soul.fellowshipName || 'No Fellowship'}</p></div></div><div className="flex items-center gap-3 p-2 rounded-xl bg-blue-500/5 border border-blue-500/10 text-left"><Users className="h-4 w-4 text-blue-500 shrink-0 text-left" /><div className="min-w-0 text-left"><p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Association</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize text-left">{soul.associationName || 'No Association'}</p></div></div></div></div>
                <Separator className="opacity-20" />
                <div className="space-y-4 text-left"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Spiritual Milestones</p><div className="grid grid-cols-2 gap-2 text-left">{[{ label: 'Church', val: soul.attendingChurch, icon: Church }, { label: 'Word Study', val: soul.inBibleStudy, icon: BookOpen }, { label: 'Prayer', val: soul.attendingPrayer, icon: Zap }, { label: 'Service', val: soul.inServiceDepartment, icon: ShieldCheck }].map(milestone => (
                  <div key={milestone.label} className={cn("flex items-center gap-2 p-2 rounded-xl border transition-all text-left", milestone.val ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/10 border-transparent text-muted-foreground/40")}>
                      <milestone.icon className="h-3 w-3 text-left" />
                      <span className="text-[10px] font-black uppercase tracking-tight text-left">{milestone.label}</span>
                  </div>))}</div></div>
                <Separator className="opacity-20" />
                <div className="space-y-4 text-left"><div className="flex items-center justify-between text-left"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2 text-left"><History className="h-3.5 w-3.5 text-left" /> Interaction History</p><Button variant="ghost" className="h-6 text-[8px] font-black uppercase text-primary hover:bg-primary/5 text-left" onClick={() => onViewHistory(soul)}>View All</Button></div><div className="space-y-4 pl-1 text-left">{sortedHistory.length > 0 ? sortedHistory.slice(0, 3).map((log, index) => { const logDate = safeToDate(log.date); return (<div key={index} className="relative text-left"><div className="pl-4 border-l-4 border-primary/20 text-left"><p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest mb-1 text-left">{logDate ? format(logDate, "MMM d, yyyy") : 'Date not available'}{log.memberName && <span className="ml-2 text-primary/40 text-left text-left">• By {log.memberName}</span>}</p><p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 italic text-left text-left">&ldquo;{log.note || 'Interaction logged.'}&rdquo;</p></div></div>); }) : (<div className="py-4 text-center border border-dashed rounded-xl bg-muted/5 text-left text-left"><p className="text-sm text-muted-foreground/40 italic text-center text-left text-left">No interactions recorded.</p></div>)}</div></div>
                <div className="space-y-3 p-5 bg-muted/20 rounded-[2rem] border-2 border-dashed border-primary/10 shadow-inner text-left text-left"><div className="flex items-center justify-between text-left text-left text-left"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-1 text-left text-left"> <ClipboardList className="h-4 w-4 text-left" /> Assessed Needs</p><Button variant="ghost" size="icon" className="h-4 w-4 rounded-full text-primary hover:bg-primary/10 text-left text-left text-left" onClick={() => onAssess(soul)}><Edit className="h-4 w-4 text-left text-left" /></Button></div>{needs ? (<div className="space-y-4 text-left text-left text-left">{needs.generalImpression && <p className="text-xs text-muted-foreground italic leading-relaxed text-balance text-left text-left">&ldquo;{needs.generalImpression}&rdquo;</p>}<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-left text-left">{needs.emotionalNeeds && (<div className="space-y-1 text-left text-left"><Badge variant="secondary" className="text-[7px] h-4 bg-red-500/10 text-red-600 border-none px-1.5 uppercase font-black text-left text-left">Emotional</Badge><p className="text-[10px] text-muted-foreground line-clamp-2 text-left text-left">{needs.emotionalNeeds}</p></div>)}{needs.physicalNeeds && (<div className="space-y-1 text-left text-left text-left"><Badge variant="secondary" className="text-[7px] h-4 bg-amber-500/10 text-amber-600 border-none px-1.5 uppercase font-black text-left text-left text-left">Physical</Badge><p className="text-[10px] text-muted-foreground line-clamp-2 text-left text-left text-left">{needs.physicalNeeds}</p></div>)}{needs.financialNeeds && (<div className="space-y-1 text-left text-left text-left text-left"><Badge variant="secondary" className="text-[7px] h-4 bg-green-500/10 text-green-600 border-none px-1.5 uppercase font-black text-left text-left text-left text-left">Financial</Badge><p className="text-[10px] text-muted-foreground line-clamp-2 text-left text-left text-left text-left">{needs.financialNeeds}</p></div>)}{needs.socialNeeds && (<div className="space-y-1 text-left text-left text-left text-left text-left"><Badge variant="secondary" className="text-[7px] h-4 bg-indigo-500/10 text-indigo-600 border-none px-1.5 uppercase font-black text-left text-left text-left text-left text-left">Social</Badge><p className="text-[10px] text-muted-foreground line-clamp-2 text-left text-left text-left text-left text-left">{needs.socialNeeds}</p></div>)}</div>{needs.followUpPlan && (<div className="pt-2 border-t border-primary/10 text-left text-left text-left text-left"><p className="text-[8px] font-black uppercase text-primary/60 mb-1 flex items-center gap-1.5 text-left text-left text-left text-left"><Target className="h-2.5 w-2.5 text-left text-left text-left text-left text-left" /> Strategy</p><p className="text-[10px] text-muted-foreground leading-relaxed italic text-left text-left text-left text-left">{needs.followUpPlan}</p></div>)}</div>) : (<div className="py-4 text-center text-left text-left text-left text-left text-left"><Button variant="outline" size="sm" className="h-8 rounded-xl font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 text-center text-left text-left text-left text-left" onClick={() => onAssess(soul)}>BEGIN ASSESSMENT</Button></div>)}</div>
                <div className="pt-2 space-y-3 text-left text-left text-left text-left"><Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 text-center text-left text-left text-left text-left" onClick={() => onFollowUp(soul)}>LOG FOLLOW-UP</Button><Button variant="ghost" className="w-full h-11 text-destructive font-bold uppercase tracking-widest text-[10px] text-center text-left text-left text-left text-left"><Trash2 className="mr-2 h-4 w-4 text-left text-left text-left text-left" /> DELETE RECORD</Button></div>
            </CardContent>
        </Card>
        
        <IntercessionHubDialog isOpen={isPrayerCustomizationOpen} onOpenChange={setIsPrayerCustomizationOpen} soul={soul} onComplete={(msg) => { setCustomMessageText(msg); setIsPrayerCustomizationOpen(false); setTimeout(() => setIsCommChannelDialogOpen(true), 100); }} />
        <MessageHubDialog isOpen={isCommChannelDialogOpen} onOpenChange={setIsCommChannelDialogOpen} soul={soul} onChannelSelect={(c) => handleCommChoice(c)} />
        <ShareWordDialog isOpen={isStudyWordOpen} onOpenChange={setIsStudyWordOpen} soul={soul} onSelectVerse={(v) => { setCustomMessageText(v); setIsStudyWordOpen(false); setTimeout(() => setIsCommChannelDialogOpen(true), 100); }} />
    </React.Fragment>
  );
}
