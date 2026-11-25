'use client';

import * as React from "react";
import { useState, useMemo, useEffect, memo, useRef } from "react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Testimony, UserProfile, FollowUpStatus, Witness } from "@/lib/types";
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
  Mic,
  Newspaper,
  ShieldCheck,
  User,
  Send,
  Info
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
  orderBy,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

  const mediaContent = (
      <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
          <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
              {type === 'image' ? (
                  <Image src={url} alt="Proof Full" fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized />
              ) : type === 'video' ? (
                  <video 
                    key={url}
                    src={url} 
                    className="w-full h-full object-contain" 
                    playsInline 
                    controls 
                    autoPlay 
                    preload="metadata" 
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
                          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest italic text-center">A testimony of God's goodness</p>
                      </div>
                      <audio 
                        key={url} 
                        src={url} 
                        className="w-full" 
                        controls 
                        preload="metadata" 
                        autoPlay
                      />
                  </div>
              )}
          </div>
      </div>
  );

  const trigger = (
      <div 
        className={cn(
            "relative rounded-2xl sm:rounded-3xl overflow-hidden border shadow-inner bg-muted group/media cursor-pointer",
            isAudio ? "h-auto min-h-[100px]" : "aspect-square",
            isFull && !isAudio && "h-full w-full"
        )}
        onClick={() => setIsOpen(true)}
      >
          {type === 'image' ? (
              <Image src={url} alt="Proof" fill className="object-cover transition-transform group-hover/media:scale-105" unoptimized />
          ) : type === 'video' ? (
              <video key={url} src={url} className="w-full h-full object-cover bg-zinc-950" muted playsInline loop preload="metadata" />
          ) : (
              <div className="w-full h-full flex flex-row items-center gap-4 bg-primary/5 p-4">
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
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-black uppercase text-primary tracking-widest leading-none">Voice Proclamation</p>
                    <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase tracking-tighter opacity-60">Tap to Hear Miracle</p>
                  </div>
              </div>
          )}
      </div>
  );

  if (isMobile) {
      return (
          <React.Fragment>
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
          </React.Fragment>
      );
  }

  return (
    <React.Fragment>
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
    </React.Fragment>
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

function WitnessSection({ testimonyId, testimonyAuthorId }: { testimonyId: string, testimonyAuthorId: string }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const { toast } = useToast();
    
    const [witnessText, setWitnessText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isAuthor = user?.uid === testimonyAuthorId;

    const witnessesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'testimonies', testimonyId, 'witnesses'), orderBy('createdAt', 'desc'));
    }, [firestore, testimonyId]);
    const { data: witnesses, loading } = useCollection<Witness>(witnessesQuery);

    const handlePostWitness = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userProfile || !witnessText.trim() || isAuthor) return;

        setIsSubmitting(true);
        const witnessData = {
            authorId: user.uid,
            authorFirstName: userProfile.firstName,
            authorLastName: userProfile.lastName,
            authorAvatarUrl: userProfile.photoURL || '',
            text: witnessText.trim(),
            createdAt: serverTimestamp(),
            testimonyId
        };

        try {
            await addDoc(collection(firestore, 'testimonies', testimonyId, 'witnesses'), witnessData);
            setWitnessText('');
            toast({ title: 'Witness Recorded', description: 'Your confirmation has been established.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Action Failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            {user && !isAuthor && (
                <form onSubmit={handlePostWitness} className="space-y-4 p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 shadow-inner">
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black uppercase text-primary tracking-widest">Add Your Account</span>
                    </div>
                    <Textarea 
                        placeholder="I was there, I saw this miracle too..."
                        value={witnessText}
                        onChange={e => setWitnessText(e.target.value)}
                        className="min-h-[100px] rounded-2xl bg-background border-none shadow-inner text-base"
                    />
                    <Button 
                        type="submit" 
                        disabled={isSubmitting || !witnessText.trim()}
                        className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                    >
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        BEAR WITNESS
                    </Button>
                </form>
            )}

            {isAuthor && (
                <div className="p-6 bg-muted/20 rounded-[2rem] border-2 border-dashed flex items-start gap-4 shadow-inner">
                    <Info className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed italic">
                        The witness must be someone else. Others who witnessed this miracle can provide their formal endorsement here to build the "Cloud of Witnesses."
                    </p>
                </div>
            )}

            <div className="space-y-6">
                <div className="flex items-center gap-2 px-1">
                    <Users className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">The Cloud of Witnesses</h3>
                </div>
                
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>
                ) : witnesses && witnesses.length > 0 ? (
                    <div className="space-y-4">
                        {witnesses.map(w => (
                            <div key={w.id} className="flex gap-4 items-start p-4 rounded-3xl bg-muted/20 border">
                                <LiveAuthorAvatar userId={w.authorId} fallbackInitials={w.authorFirstName?.charAt(0)} className="h-10 w-10 border shadow-sm shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <p className="font-black text-sm uppercase tracking-tight">{w.authorFirstName} {w.authorLastName}</p>
                                        <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">{w.createdAt ? format(safeToDate(w.createdAt)!, 'MMM d') : 'Just now'}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed italic">&ldquo;{w.text}&rdquo;</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed rounded-[2rem] bg-muted/5">
                        <Users className="h-10 w-10 text-muted-foreground/10 mx-auto mb-3" />
                        <p className="text-xs text-muted-foreground italic font-medium px-12 text-center">No additional witnesses have shared their account yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
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
  const [isWitnessOpen, setIsWitnessOpen] = useState(false);
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

  const displayDate = useMemo(() => {
    const createdAtDate = safeToDate(testimony.createdAt);
    return createdAtDate ? format(createdAtDate, "PPP 'at' p") : 'Shared recently';
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

  const witnessesQuery = useMemo(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'testimonies', testimony.id, 'witnesses'));
  }, [firestore, testimony.id]);
  const { data: witnessesData } = useCollection<Witness>(witnessesQuery);
  const witnessCount = witnessesData?.length || 0;
  
  const hasWitnessed = useMemo(() => user && witnessesData?.some(w => w.authorId === user.uid), [user, witnessesData]);

  const hasAmened = useMemo(() => user ? supporters.includes(user.uid) : false, [user, supporters]);
  const hasInspired = useMemo(() => user ? inspiredBy.includes(user.uid) : false, [user, inspiredBy]);
  const hasCelebrated = useMemo(() => user ? connectedBy.includes(user.uid) : false, [user, connectedBy]);

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
    const textContent = `"${testimony.content.substring(0, 200)}${testimony.content.length > 200 ? '...' : ''}"\n\nRead full miracle on BornAgain:`;
    
    const shareData: any = { title: 'Kingdom Testimony | BornAgain', text: textContent, url: shareUrl };

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
      <div className="space-y-8 pb-8 px-2">
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
    <React.Fragment>
      <div id={testimony.id} className={cn(
        "flex flex-col h-full w-full overflow-hidden transition-all duration-300 scroll-mt-48",
        "rounded-none sm:rounded-[2rem] border-y border-border sm:border-x border-t-4 border-t-amber-500/20 shadow-none sm:shadow-lg",
        "bg-card/50 backdrop-blur-sm",
        isPartner && "sm:ring-1 ring-primary/20",
        testimony.answeredPrayerId && "sm:border-l-4 sm:border-l-amber-500"
      )}>
        <div className="p-4 sm:p-6 pb-2">
          <div className="flex flex-row items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {testimony.isAnonymous ? (
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold"><Users className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                ) : (
                    <LiveAuthorAvatar userId={String(testimony.authorId)} fallbackInitials={initials} className="h-11 w-11 sm:h-14 sm:w-14" />
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-x-2 gap-y-1.5 flex-wrap">
                        <Link href={profileLink} onClick={(e) => e.stopPropagation()} className="hover:underline decoration-primary/30 underline-offset-2 min-w-0 shrink-0">
                             <h3 className="text-base sm:text-lg font-bold capitalize leading-none truncate"> 
                                <LiveAuthorName userId={String(testimony.authorId)} fallbackName={authorName} />
                             </h3>
                        </Link>
                        
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                            {testimony.witnessType && (
                                <Badge variant="outline" className={cn(
                                    "h-4 px-1.5 text-[7px] uppercase font-black tracking-tighter flex items-center gap-1 shrink-0",
                                    testimony.witnessType === 'Beneficiary' ? "bg-primary/5 text-primary border-primary/20" : "bg-indigo-500/5 text-indigo-600 border-indigo-500/20"
                                )}>
                                    {testimony.witnessType === 'Beneficiary' ? <User className="h-2 w-2" /> : <Users className="h-2 w-2" />}
                                    {testimony.witnessType}
                                </Badge>
                            )}

                            {isPartner && <Badge variant="secondary" className="h-4 px-1.5 text-[9px] uppercase font-bold tracking-tighter bg-primary/10 text-primary border-primary/20 shrink-0">Partner</Badge>}
                            {!isAuthor && !isPartner && currentUserProfile && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button className={cn("h-6 w-6 rounded-full transition-colors flex items-center justify-center shrink-0", hasPendingRequest ? "text-muted-foreground" : "text-primary hover:bg-primary/10")} onClick={handleSendPartnerRequest} disabled={isRequestingPartner || hasPendingRequest}>
                                                {isRequestingPartner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : hasPendingRequest ? <Hourglass className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="rounded-xl border-primary/20 shadow-xl"><p className={cn("text-[10px] font-black uppercase tracking-widest")}>{hasPendingRequest ? "Request Pending" : "Add Accountability Partner"}</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                    </div>
                    <div className="text-muted-foreground text-sm mt-1 flex flex-col gap-0.5">
                        <div className="truncate text-[10px] sm:text-xs opacity-70"> {displayDate}</div>
                        <div className="flex items-center gap-1 mt-0.5 opacity-80 text-[10px] sm:text-xs font-medium"><Globe className="h-3 w-3 text-primary shrink-0" /> {locationString}</div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                className={cn(
                                    "h-10 w-10 rounded-full bg-background transition-colors",
                                    hasWitnessed ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/20" : 
                                    witnessCount > 0 ? "text-emerald-600/70 border-emerald-500/20 bg-emerald-500/5" : "text-muted-foreground"
                                )}
                                onClick={(e) => { e.stopPropagation(); setIsWitnessOpen(true); }}
                            >
                                <div className="relative">
                                    <ShieldCheck className="h-5 w-5" />
                                    {witnessCount > 0 && (
                                        <span className={cn(
                                            "absolute -top-1.5 -right-1.5 flex h-3 w-3 items-center justify-center rounded-full text-[6px] font-black text-white border-2 border-background",
                                            hasWitnessed ? "bg-emerald-600" : "bg-emerald-500"
                                        )}>
                                            {witnessCount}
                                        </span>
                                    )}
                                </div>
                                <span className="sr-only">Witness</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="rounded-xl border-primary/20 shadow-xl">
                            <p className="text-[10px] font-black uppercase">{isAuthor ? "View Witnesses" : hasWitnessed ? "You Have Witnessed" : "Bear Witness"}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-background" onClick={handleShare}>
                    <Share2 className="h-3.5 w-3.5" /><span className="sr-only">Share</span>
                </Button>
                {isAuthor && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 rounded-full"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-black">Manage Story</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerAction(onEdit); }} className="rounded-lg">
                                    <Edit className="mr-2 h-4 w-4 text-primary" />
                                    Edit Story
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsBoostOpen(true); }} className="rounded-lg">
                                    <TrendingUp className="mr-2 h-4 w-4 text-indigo-600" />
                                    Boost Miracle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerAction(onDelete); }} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-lg">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Permanently
                                </DropdownMenuItem>
                            </>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
          </div>
        </div>
        
        <div className="flex-grow pt-2 px-4 sm:px-6 space-y-4">
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
            <div className="rounded-2xl border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 shadow-inner overflow-hidden">
                <div className="p-4">
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

           {(totalReactions > 0 || witnessCount > 0) && (
             <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center -space-x-1.5">
                        {supporters.length > 0 && <div className="bg-primary rounded-full p-1 border-2 border-background z-30 shadow-sm"><HandHeart className="h-2.5 w-2.5 text-primary-foreground fill-current" /></div>}
                        {inspiredBy.length > 0 && <div className="bg-chart-3 rounded-full p-1 border-2 border-background z-20 shadow-sm"><Sparkles className="h-2.5 w-2.5 text-white fill-current" /></div>}
                        {connectedBy.length > 0 && <div className="bg-blue-500 rounded-full p-1 border-2 border-background z-10 shadow-sm"><PartyPopper className="h-2.5 w-2.5 text-white" /></div>}
                        {witnessCount > 0 && <div className="bg-emerald-500 rounded-full p-1 border-2 border-background z-40 shadow-sm"><ShieldCheck className="h-2.5 w-2.5 text-white" /></div>}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-tight ml-1">
                        {totalReactions > 0 && <span> {totalReactions} REACTIONS</span>}
                        {witnessCount > 0 && <span className="text-emerald-600"> {witnessCount} {witnessCount === 1 ? 'Witness' : 'Witnesses'}</span>}
                    </div>
                </div>
                {testimony.campaignTitle && <span className="text-[9px] font-black uppercase text-muted-foreground/60 truncate italic bg-muted/50 px-2 py-0.5 rounded-full border max-w-[150px]">RE: {testimony.campaignTitle}</span>}
             </div>
           )}
        </div>

        <Separator className="mx-4 sm:mx-6 w-auto opacity-50" />
        <div className="py-2 sm:py-3 px-2 sm:px-4 grid grid-cols-4 gap-0.5 sm:gap-1">
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('amen'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-xs font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasAmened && "text-primary hover:text-primary bg-primary/5")}>
                {isProcessingReaction === 'amen' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HandHeart className={cn("h-4 w-4", hasAmened && "fill-current")} />}
                Amen
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('inspired'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-xs font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasInspired && "text-chart-3 hover:text-chart-3 bg-chart-3/5")}>
                {isProcessingReaction === 'inspired' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className={cn("h-4 w-4", hasInspired && "fill-current")} />}
                Hallelujah
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('connect'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-xs font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasCelebrated && "text-blue-500 hover:text-blue-500 bg-blue-500/5")}>
                {isProcessingReaction === 'connect' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PartyPopper className={cn("h-3.5 w-3.5", hasCelebrated && "fill-current")} />}
                Celebrate
            </Button>
            <Button variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-xs font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", isCommentsOpen && "text-primary hover:text-primary bg-primary/5")} onClick={(e) => { e.stopPropagation(); setIsCommentsOpen(true); }}>
                <div className="relative flex flex-col items-center justify-center h-full"><MessageSquare className={cn("h-3.5 w-3.5 sm:h-4 w-4", isCommentsOpen && "fill-current")} />{commentCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3 sm:h-4 w-4 items-center justify-center rounded-full bg-primary text-[7px] sm:text-[8px] font-black text-primary-foreground border-background border-2 shadow-sm text-center"> {commentCount}</span>}</div>Comment
            </Button>
        </div>
      </div>

      {mounted && (
        <React.Fragment>
            <Drawer open={isBoostOpen} onOpenChange={setIsBoostOpen}>
                <DrawerContent className="p-0 rounded-t-[2.5rem] h-auto pb-12">
                    <div className="p-8 border-b shrink-0 bg-muted/10">
                        <div className="p-0">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-5 w-5 text-indigo-600" />
                                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.3em]">Kingdom Promotion</span>
                            </div>
                            <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight">Boost Your Testimony</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium mt-1 text-balance">Share your miracle with a wider global audience.</DrawerDescription>
                        </div>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="bg-primary/5 rounded-2xl p-6 border-2 border-dashed border-primary/20">
                            <h4 className="font-bold text-sm mb-2">Promotion Benefits</h4>
                            <ul className="space-y-2 text-xs text-muted-foreground font-medium">
                                <li className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" /> Featured in the Kingdom Spotlight carousel.</li>
                                <li className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" /> Prioritized in search results and regional feeds.</li>
                                <li className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" /> Reach believers outside your immediate circle.</li>
                            </ul>
                        </div>
                        
                        <div className="p-6 rounded-2xl border bg-muted/20 space-y-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Estimated Reach</p>
                                <p className="text-2xl font-black text-primary">5,000+ Believers</p>
                            </div>
                            <p className="text-xs text-muted-foreground italic text-left">Select 'Proceed' to view payment coordinates and finalize your boost request.</p>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsBoostOpen(false)}>Cancel</Button>
                            <Button asChild className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-center">
                                <Link href={`/contact?subject=Testimony Boost Request&id=${testimony.id}`}>PROCEED TO HUB</Link>
                            </Button>
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>

            <AnimatePresence>
                {showFullText && (
                    <Drawer open={showFullText} onOpenChange={setShowFullText}>
                        <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                            <div className="p-8 border-b shrink-0 bg-muted/20">
                                <DrawerHeader className="text-left p-0">
                                    <DrawerTitle className="text-2xl font-black font-headline">Kingdom Testimony</DrawerTitle>
                                    <DrawerDescription className="text-sm font-bold uppercase tracking-widest">BY {authorName} • {displayDate}</DrawerDescription>
                                </DrawerHeader>
                            </div>
                            <div className="flex-grow min-h-0 pt-8 px-6">{fullTextContent}</div>
                        </DrawerContent>
                    </Drawer>
                )}
                {showFullPrayer && (
                    <Drawer open={showFullPrayer} onOpenChange={setShowFullPrayer}>
                        <DrawerContent className="h-auto max-h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                            <div className="p-8 border-b shrink-0 bg-amber-500/10">
                                <DrawerHeader className="text-left p-0">
                                    <DrawerTitle className="text-2xl font-black font-headline uppercase text-amber-600">
                                        <Target className="h-5 w-5 mr-2 inline" />
                                        Answered Prayer
                                    </DrawerTitle>
                                    <DrawerDescription className="text-sm font-medium mt-1">The specific request that God has fulfilled.</DrawerDescription>
                                </DrawerHeader>
                            </div>
                            <ScrollArea className="flex-grow px-8 py-10">
                                <div className="text-base text-muted-foreground whitespace-pre-wrap leading-relaxed italic text-left">
                                    {testimony.answeredPrayerContent}
                                </div>
                            </ScrollArea>
                        </DrawerContent>
                    </Drawer>
                )}
                {isCommentsOpen && (
                    <Drawer open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                        <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                            <div className="p-8 border-b shrink-0 bg-muted/10">
                                <DrawerHeader className="text-left p-0">
                                    <DrawerTitle className="text-2xl font-black font-headline uppercase">Responses</DrawerTitle>
                                    <DrawerDescription className="text-sm font-bold uppercase tracking-widest text-left">GATHERED JOY FOR {authorName}</DrawerDescription>
                                    <div className="flex items-center gap-2 mt-4"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center">Swipe down to close</span></div>
                                </DrawerHeader>
                            </div>
                            <div className="flex-grow min-h-0">{isCommentsOpen && <CommentSection path={`testimonies/${testimony.id}/comments`} />}</div>
                        </DrawerContent>
                    </Drawer>
                )}
                {isWitnessOpen && (
                    <Drawer open={isWitnessOpen} onOpenChange={setIsWitnessOpen}>
                        <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                            <div className="p-8 border-b shrink-0 bg-emerald-500/10">
                                <DrawerHeader className="text-left p-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                        <span className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.3em]">Miracle Verification</span>
                                    </div>
                                    <DrawerTitle className="text-2xl font-black font-headline uppercase text-left">The Cloud of Witnesses</DrawerTitle>
                                    <DrawerDescription className="text-sm font-medium mt-1">The testimony of two men is true.</DrawerDescription>
                                    <div className="flex items-center gap-2 mt-4"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center">Swipe down to close</span></div>
                                </DrawerHeader>
                            </div>
                            <ScrollArea className="flex-grow min-h-0">
                                <div className="p-8 pb-32">
                                    <WitnessSection testimonyId={testimony.id} testimonyAuthorId={testimony.authorId} />
                                </div>
                            </ScrollArea>
                        </DrawerContent>
                    </Drawer>
                )}
            </AnimatePresence>
        </React.Fragment>
      )}
    </React.Fragment>
  );
});
TestimonyCard.displayName = "TestimonyCard";
