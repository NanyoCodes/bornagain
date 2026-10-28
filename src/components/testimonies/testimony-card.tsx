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
  Mic
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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { MutualConnectBadge } from "./mutual-connect-badge";

/**
 * Utility to convert YouTube URL to embed format.
 */
export function getYouTubeEmbedUrl(url: string | undefined | null) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
}

/**
 * Live avatar that reflects current profile photo.
 */
export function LiveAuthorAvatar({ userId, fallbackInitials, className }: { userId: string, fallbackInitials: string, className?: string }) {
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

/**
 * High fidelity media preview for the feed.
 * Optimized for mobile playback and MIME compatibility.
 */
export const MediaPreview = ({ url, type, isFull = false }: { url: string, type: 'image' | 'video' | 'audio', isFull?: boolean }) => {
  const isAudio = type === 'audio';

  return (
      <Dialog>
          <DialogTrigger asChild>
              <div className={cn(
                  "relative rounded-2xl sm:rounded-3xl overflow-hidden border shadow-inner bg-muted group/media cursor-pointer",
                  isAudio ? "h-auto min-h-[100px]" : "aspect-square",
                  isFull && !isAudio && "h-full w-full"
              )}>
                  {type === 'image' ? (
                      <Image src={url} alt="Proof" fill className="object-cover transition-transform group-hover/media:scale-105" unoptimized />
                  ) : type === 'video' ? (
                      <video src={url} className="w-full h-full object-cover bg-zinc-950" muted playsInline loop />
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
                                <Sparkles className="h-3 w-3 text-primary" />
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
          </DialogTrigger>
          <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
              <DialogHeader className="sr-only text-center"><DialogTitle>Full View</DialogTitle></DialogHeader>
              <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
                  <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
                      {type === 'image' ? (
                          <Image src={url} alt="Proof Full" fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized />
                      ) : type === 'video' ? (
                          <video src={url} className="w-full h-full object-contain" playsInline controls />
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
                              />
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 text-center">
                                  <HandHeart className="h-3 w-3" />
                                  Glory to God
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </DialogContent>
      </Dialog>
  );
};

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

  useEffect(() => {
    if (showFullText || showFullPrayer || isCommentsOpen || isBoostOpen) {
        window.history.pushState({ overlayOpen: testimony.id }, '');
        const handlePopState = () => {
            setShowFullText(false);
            setShowFullPrayer(false);
            setIsCommentsOpen(false);
            setIsBoostOpen(false);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [showFullText, showFullPrayer, isCommentsOpen, isBoostOpen, testimony.id]);

  const isAuthor = user?.uid === testimony.authorId;
  
  const authorProfileRef = useMemo(() => (!testimony.isAnonymous && testimony.authorId) ? doc(firestore, 'users', testimony.authorId) : null, [firestore, testimony.authorId, testimony.isAnonymous]);
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
    const newRequestData = { fromUserId: user.uid, fromUserFirstName: currentUserProfile.firstName || '', fromUserLastName: currentUserProfile.lastName || '', fromUserPhotoURL: currentUserProfile.photoURL || '', toUserId: testimony.authorId, toUserFirstName: authorFirstName || '', toUserLastName: authorLastName || '', toUserPhotoURL: authorProfile?.photoURL || '', status: 'pending' as const, createdAt: serverTimestamp(), participantIds };
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
        <div className="text-base sm:text-lg text-muted-foreground whitespace-pre-wrap leading-relaxed font-medium text-left">
            {testimony.content}
        </div>
      </div>
    </ScrollArea>
  );

  const musicEmbedUrl = useMemo(() => getYouTubeEmbedUrl(testimony.musicUrl), [testimony.musicUrl]);

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
            <div className="flex items-center gap-3 min-w-0 flex-1 text-left text-left text-left">
                {testimony.isAnonymous ? (
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border shadow-sm text-left">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold"><Users className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                ) : (
                    <LiveAuthorAvatar userId={String(testimony.authorId)} fallbackInitials={initials} className="h-11 w-11 sm:h-14 sm:w-14 text-left" />
                )}
                <div className="min-w-0 flex-1 text-left text-left">
                    <div className="flex items-center gap-2 flex-wrap text-left">
                        <Link href={profileLink} onClick={(e) => e.stopPropagation()} className="hover:underline decoration-primary/30 underline-offset-2 shrink-0 text-left">
                             <h3 className="text-base sm:text-lg font-bold capitalize leading-none text-left">{authorName}</h3>
                        </Link>
                        {isPartner && <Badge variant="secondary" className="h-4 px-1.5 text-[9px] uppercase font-bold tracking-tighter bg-primary/10 text-primary border-primary/20 shrink-0 text-left">Partner</Badge>}
                        {!isAuthor && !isPartner && currentUserProfile && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button className={cn("h-6 w-6 rounded-full transition-colors flex items-center justify-center text-left", hasPendingRequest ? "text-muted-foreground" : "text-primary hover:bg-primary/10")} onClick={handleSendPartnerRequest} disabled={isRequestingPartner || hasPendingRequest}>
                                            {isRequestingPartner ? <Loader2 className="h-3.5 w-3.5 animate-spin text-left" /> : hasPendingRequest ? <Hourglass className="h-3.5 w-3.5 text-left" /> : <UserPlus className="h-3.5 w-3.5 text-left" />}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-xl border-primary/20 shadow-xl text-left"><p className={cn("text-[10px] font-black uppercase tracking-widest text-left")}>{hasPendingRequest ? "Request Pending" : "Add Accountability Partner"}</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    <div className="text-muted-foreground text-sm mt-1 flex flex-col gap-0.5 text-left text-left text-left">
                        <div className="truncate text-[10px] sm:text-xs opacity-70 text-left">{displayDate}</div>
                        <div className="flex items-center gap-1 mt-0.5 opacity-80 text-[10px] sm:text-xs font-medium text-left text-left text-left"><Globe className="h-3 w-3 text-primary shrink-0 text-left" /> {locationString}</div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1.5 text-left text-left text-left text-left">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-background text-left text-left" onClick={handleShare}>
                    <Share2 className="h-3.5 w-3.5 text-left text-left" /><span className="sr-only text-left">Share</span>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-left" onClick={(e) => { e.stopPropagation(); }}><MoreVertical className="h-4 w-4 text-left" /><span className="sr-only text-left text-left">Options</span></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl text-left text-left text-left">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-black text-left">Manage Story</DropdownMenuLabel>
                        <DropdownMenuSeparator className="text-left" />
                        {isAuthor ? (
                            <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerAction(onEdit); }} className="rounded-lg text-left text-left text-left">
                                    <Edit className="mr-2 h-4 w-4 text-primary text-left text-left" />
                                    Edit Story
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsBoostOpen(true); }} className="rounded-lg text-left text-left">
                                    <TrendingUp className="mr-2 h-4 w-4 text-indigo-600 text-left" />
                                    Boost Miracle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="text-left" />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerAction(onDelete); }} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-lg text-left text-left">
                                    <Trash2 className="mr-2 h-4 w-4 text-left" />
                                    Delete Permanently
                                </DropdownMenuItem>
                            </>
                        ) : (
                            <DropdownMenuItem onClick={handleShare} className="rounded-lg text-left text-left">
                                <Share2 className="mr-2 h-4 w-4 text-primary text-left" />
                                Spread the Word
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
        </div>
        
        <div className="flex-grow pt-2 px-4 sm:px-6 space-y-4 text-left text-left text-left">
          <div className="text-sm sm:text-base text-muted-foreground leading-relaxed text-left text-left">
            <div className={cn("leading-relaxed max-w-full text-left text-left text-left", (testimony.mediaUrl || testimony.mediaUrl2) ? "line-clamp-3" : "line-clamp-6")}>
                <div ref={contentRef} className="text-left text-left text-left">{testimony.content}</div>
            </div>
            {isTruncated && <Button variant="link" className="p-0 h-auto text-sm text-primary font-bold mt-1 text-left text-left text-left" onClick={(e) => { e.stopPropagation(); setShowFullText(true); }}>Read Full Story</Button>}
          </div>

          {(testimony.mediaUrl || testimony.mediaUrl2) && (
              <div className={cn("grid gap-3 text-left text-left", (testimony.mediaUrl && testimony.mediaUrl2) ? "grid-cols-2" : "grid-cols-1")}>
                 {testimony.mediaUrl && (
                    <MediaPreview url={testimony.mediaUrl} type={testimony.mediaType as any} />
                 )}
                 {testimony.mediaUrl2 && (
                    <MediaPreview url={testimony.mediaUrl2} type={testimony.mediaType2 as any} />
                 )}
              </div>
          )}

          {musicEmbedUrl && (
              <div className="rounded-[1.5rem] overflow-hidden border-2 border-primary/20 bg-black/40 shadow-inner group/music relative text-left text-left">
                 <div className="absolute top-0 right-0 p-3 opacity-5 group-hover/music:opacity-10 transition-opacity text-left text-left">
                    <Music className="h-10 w-10 text-primary rotate-12 text-left" />
                 </div>
                 <div className="p-4 flex items-center gap-3 border-b border-primary/10 bg-primary/5 text-left text-left">
                    <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-left text-left">
                        <Music className="h-3.5 w-3.5 text-primary text-left" />
                    </div>
                    <div className="min-w-0 flex-1 text-left text-left text-left text-left text-left text-left">
                        <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest leading-none text-left">Sound of Praise</p>
                        <p className="text-[11px] font-black uppercase tracking-tight text-white/90 truncate mt-1 text-left">{testimony.musicTitle || 'Atmospheric Worship'}</p>
                    </div>
                 </div>
                 <div className="aspect-video relative w-full h-[60px] sm:h-[80px] text-left text-left">
                    <iframe 
                        src={`${musicEmbedUrl}?autoplay=0&controls=1&showinfo=0&rel=0&modestbranding=1`}
                        title="Kingdom Worship"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        className="absolute inset-0 w-full h-full border-0 text-left"
                    />
                 </div>
              </div>
          )}

          {testimony.answeredPrayerId && testimony.answeredPrayerContent && (
            <div className="rounded-2xl border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 shadow-inner overflow-hidden text-left text-left text-left">
                <div className="p-4 text-left text-left">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 font-black mb-1 text-left">Answering Prayer Request:</div>
                    <div className="border-l-2 border-amber-500/30 pl-4 italic text-sm text-muted-foreground text-left text-left">
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
             <div className="flex items-center justify-between pt-2 text-left text-left text-left">
                <div className="flex items-center gap-1.5 text-left text-left text-left text-left">
                    <div className="flex items-center -space-x-1.5 text-left text-left">
                        {supporters.length > 0 && <div className="bg-primary rounded-full p-1 border-2 border-background z-30 shadow-sm text-left"><HandHeart className="h-2.5 w-2.5 text-primary-foreground fill-current text-left" /></div>}
                        {inspiredBy.length > 0 && <div className="bg-chart-3 rounded-full p-1 border-2 border-background z-20 shadow-sm text-left"><Sparkles className="h-2.5 w-2.5 text-white fill-current text-left" /></div>}
                        {connectedBy.length > 0 && <div className="bg-blue-500 rounded-full p-1 border-2 border-background z-10 shadow-sm text-left"><PartyPopper className="h-2.5 w-2.5 text-white text-left" /></div>}
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight text-left text-left">{totalReactions}</span>
                </div>
                {testimony.campaignTitle && <span className="text-[9px] font-black uppercase text-muted-foreground/60 truncate italic bg-muted/50 px-2 py-0.5 rounded-full border max-w-[150px] text-left">RE: {testimony.campaignTitle}</span>}
             </div>
           )}
        </div>

        <Separator className="mx-4 sm:mx-6 w-auto opacity-50 text-left text-left text-left" />
        <div className="py-2 sm:py-3 px-2 sm:px-6 grid grid-cols-4 gap-1 sm:gap-2 text-left text-left text-left">
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('amen'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all text-left", hasAmened && "text-primary hover:text-primary bg-primary/5")}>
                {isProcessingReaction === 'amen' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-left" /> : <HandHeart className={cn("h-4 w-4 text-left", hasAmened && "fill-current")} />}
                Amen {supporters.length > 0 && `(${supporters.length})`}
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('inspired'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all text-left", hasInspired && "text-chart-3 hover:text-chart-3 bg-chart-3/5")}>
                {isProcessingReaction === 'inspired' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-left" /> : <Sparkles className={cn("h-3.5 w-3.5", hasInspired && "fill-current")} />}
                Hallelujah {inspiredBy.length > 0 && `(${inspiredBy.length})`}
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('connect'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all text-left", hasConnected && "text-blue-500 hover:text-blue-500 bg-blue-500/5")}>
                {isProcessingReaction === 'connect' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-left" /> : <PartyPopper className={cn("h-3.5 w-3.5", hasConnected && "fill-current")} />}
                Celebrate {connectedBy.length > 0 && `(${connectedBy.length})`}
            </Button>
            <Button variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all text-left", isCommentsOpen && "text-primary hover:text-primary bg-primary/5")} onClick={(e) => { e.stopPropagation(); setIsCommentsOpen(true); }}>
                <div className="relative flex flex-col items-center justify-center h-full text-left"><MessageSquare className={cn("h-3.5 w-3.5 sm:h-4 w-4 text-left", isCommentsOpen && "fill-current")} />{commentCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3 sm:h-4 w-4 items-center justify-center rounded-full bg-primary text-[7px] sm:text-[8px] font-black text-primary-foreground border-background border-2 shadow-sm text-center text-left text-left"> {commentCount}</span>}</div>Comment
            </Button>
        </div>
      </div>

      {mounted && (
        <>
            <Drawer open={isBoostOpen} onOpenChange={setIsBoostOpen}>
                <DrawerContent className="p-0 rounded-t-[2.5rem] h-auto pb-12 text-left text-left text-left text-left">
                    <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left text-left">
                        <DrawerHeader className="text-left p-0 text-left text-left text-left text-left text-left">
                            <div className="flex items-center gap-2 mb-2 text-left text-left text-left text-left">
                                <TrendingUp className="h-5 w-5 text-indigo-600 text-left text-left text-left text-left" />
                                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.3em] text-left text-left text-left text-left">Kingdom Promotion</span>
                            </div>
                            <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left">Boost Your Testimony</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium mt-1 text-left text-left text-left text-left text-left">Share your miracle with a wider global audience.</DrawerDescription>
                        </DrawerHeader>
                    </div>
                    <div className="p-8 space-y-6 text-left text-left text-left text-left text-left">
                        <div className="bg-primary/5 rounded-2xl p-6 border-2 border-dashed border-primary/20 text-left text-left text-left text-left">
                            <h4 className="font-bold text-sm mb-2 text-left text-left text-left">Promotion Benefits</h4>
                            <ul className="space-y-2 text-xs text-muted-foreground font-medium text-left text-left text-left text-left">
                                <li className="flex items-center gap-2 text-left text-left"><Sparkles className="h-3.5 w-3.5 text-primary text-left text-left" /> Featured in the Kingdom Spotlight carousel.</li>
                                <li className="flex items-center gap-2 text-left text-left"><Sparkles className="h-3.5 w-3.5 text-primary text-left text-left" /> Prioritized in search results and regional feeds.</li>
                                <li className="flex items-center gap-2 text-left text-left"><Sparkles className="h-3.5 w-3.5 text-primary text-left text-left" /> Reach believers outside your immediate circle.</li>
                            </ul>
                        </div>
                        
                        <div className="p-6 rounded-2xl border bg-muted/20 space-y-4 text-left text-left text-left text-left text-left">
                            <div className="space-y-1 text-left text-left text-left text-left">
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-left text-left text-left text-left">Estimated Reach</p>
                                <p className="text-2xl font-black text-primary text-left text-left text-left">5,000+ Believers</p>
                            </div>
                            <p className="text-xs text-muted-foreground italic text-left text-left text-left text-left text-left">Select 'Proceed' to view payment coordinates and finalize your boost request.</p>
                        </div>

                        <div className="flex gap-3 text-left text-left text-left text-left">
                            <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold text-left text-left text-left text-left" onClick={() => setIsBoostOpen(false)}>Cancel</Button>
                            <Button asChild className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-center text-left text-left text-left text-left">
                                <Link href={`/contact?subject=Testimony Boost Request&id=${testimony.id}`} className="text-center text-left text-left text-left">PROCEED TO HUB</Link>
                            </Button>
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>

            {isMobile ? (
                <>
                    <Drawer open={showFullText} onOpenChange={setShowFullText}>
                        <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/20 text-left text-left text-left text-left text-left"><DrawerHeader className="text-left p-0 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><DrawerTitle className="text-2xl font-black font-headline text-left text-left text-left text-left text-left text-left">Kingdom Testimony</DrawerTitle><DrawerDescription className="text-sm font-bold uppercase tracking-widest text-left text-left text-left text-left text-left text-left">BY {authorName} • {displayDate}</DrawerDescription></DrawerHeader></div>
                            <div className="flex-grow min-h-0 pt-8 px-6 text-left text-left text-left text-left">{fullTextContent}</div>
                        </DrawerContent>
                    </Drawer>
                    <Drawer open={showFullPrayer} onOpenChange={setShowFullPrayer}>
                        <DrawerContent className="h-auto max-h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left">
                            <div className="p-8 border-b shrink-0 bg-amber-500/10 text-left text-left text-left text-left text-left"><DrawerHeader className="text-left p-0 text-left text-left text-left text-left text-left text-left text-left text-left"><DrawerTitle className="text-2xl font-black font-headline uppercase text-amber-600 text-left text-left text-left text-left text-left text-left text-left text-left"><Target className="h-5 w-5 mr-2 inline" />Answered Prayer</DrawerTitle><DrawerDescription className="text-sm font-medium mt-1 text-left text-left text-left text-left text-left text-left text-left">The specific request that God has fulfilled.</DrawerDescription></DrawerHeader></div>
                            <ScrollArea className="flex-grow px-8 py-10 text-left text-left text-left text-left text-left">
                                <div className="text-base text-muted-foreground whitespace-pre-wrap leading-relaxed italic text-left text-left text-left text-left text-left">
                                    {testimony.answeredPrayerContent}
                                </div>
                            </ScrollArea>
                        </DrawerContent>
                    </Drawer>
                    <Drawer open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                        <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left text-left text-left"><div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left text-left text-left text-left"><DrawerHeader className="text-left p-0 text-left text-left text-left text-left text-left text-left text-left"><DrawerTitle className="text-2xl font-black font-headline uppercase text-left text-left text-left text-left text-left text-left text-left">Responses</DrawerTitle><DrawerDescription className="text-sm font-bold uppercase tracking-widest text-left text-left text-left text-left text-left text-left text-left">GATHERED JOY FOR {authorName}</DrawerDescription><div className="flex items-center gap-2 mt-4 text-left text-left text-left text-left text-left text-left text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce text-left text-left text-left text-left text-left text-left text-left" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-left text-left text-left text-left text-left text-left text-left text-left">Swipe down to close</span></div></DrawerHeader></div><div className="flex-grow min-h-0 text-left text-left text-left text-left text-left text-left"><CommentSection testimonyId={testimony.id} /></div></DrawerContent>
                    </Drawer>
                </>
            ) : (
                <>
                    <Dialog open={showFullText} onOpenChange={open => { setShowFullText(open); if(!open) setIsCommentsOpen(false); }}>
                        <DialogContent className="sm:max-w-4xl rounded-3xl overflow-hidden p-0 text-left text-left text-left text-left text-left text-left text-left text-left"><div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left text-left text-left text-left text-left text-left"><DrawerHeader className="text-left p-0 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><DrawerTitle className="text-3xl font-black font-headline uppercase text-left text-left text-left text-left text-left text-left text-left text-left">Kingdom Testimony</DrawerTitle><DrawerDescription className="text-sm font-bold uppercase tracking-widest text-left text-left text-left text-left text-left text-left text-left text-left">BY {authorName} • {displayDate}</DrawerDescription></DrawerHeader></div><div className="p-8 text-left text-left text-left text-left text-left text-left">{fullTextContent}</div></DialogContent>
                    </Dialog>
                    <Dialog open={showFullPrayer} onOpenChange={setShowFullPrayer}>
                        <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                             <div className="p-8 border-b bg-amber-500/10 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                <DialogHeader className="text-left p-0 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                    <DialogTitle className="text-2xl font-black font-headline uppercase text-amber-600 text-left text-left text-left text-left text-left"><Target className="h-5 w-5 mr-2 inline" />Answered Prayer Request</DialogTitle>
                                    <DialogDescription className="text-sm font-medium text-left text-left text-left text-left text-left text-left text-left">The original request shared with the body.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className="p-8 text-left text-left text-left text-left text-left">
                                <div className="text-base text-muted-foreground whitespace-pre-wrap leading-relaxed italic text-left text-left text-left text-left text-left">
                                    {testimony.answeredPrayerContent}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                        <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh] p-0 overflow-hidden rounded-3xl text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><DrawerHeader className="text-left p-0 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left text-left text-left text-left">Gathered Responses</DrawerTitle><DrawerDescription className="text-sm font-bold uppercase tracking-widest text-left text-left text-left text-left text-left text-left text-left text-left">COMMUNITY RESPONSES TO THIS MIRACLE</DrawerDescription></DrawerHeader></div><div className="flex-1 min-h-0 text-left text-left text-left text-left text-left text-left text-left text-left">{isCommentsOpen && <CommentSection testimonyId={testimony.id} />}</div></DialogContent>
                    </Dialog>
                </>
            )}
        </>
      )}
    </>
  );
});
TestimonyCard.displayName = "TestimonyCard";
