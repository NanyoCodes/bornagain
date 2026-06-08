
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Testimony, TestimonyComment, UserProfile } from "@/lib/types";
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
} from "lucide-react";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
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
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, setDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn, safeToDate } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { CommentSection } from "./comment-section";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Image from 'next/image';

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
  const contentRef = React.useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);
  const [showFullText, setShowFullText] = React.useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  // Live Author Profile Sync
  const authorProfileRef = useMemo(() => testimony.authorId ? doc(firestore, 'users', testimony.authorId) : null, [firestore, testimony.authorId]);
  const { data: authorProfile } = useDoc<UserProfile>(authorProfileRef);

  const isAuthor = user?.uid === testimony.authorId;
  
  const authorFirstName = authorProfile?.firstName || testimony.authorFirstName;
  const authorLastName = authorProfile?.lastName || testimony.authorLastName;
  const authorFullName = [authorFirstName, authorLastName].filter(Boolean).join(' ').trim() || 'Anonymous';
  const authorAvatarUrl = authorProfile?.photoURL || testimony.authorAvatarUrl;
  
  const profileLink = isAuthor ? "/dashboard/profile" : `/dashboard/profile/${testimony.authorId}`;
  const initials = (authorFirstName?.charAt(0) || '') + (authorLastName?.charAt(0) || '');

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
    const profileLoc = authorProfile?.location;
    const testimonyLoc = testimony.authorLocation;
    
    const city = profileLoc?.city || testimonyLoc?.city;
    const country = profileLoc?.country || testimonyLoc?.country;
    
    return [city, country].filter(Boolean).join(', ') || 'Global Community';
  }, [authorProfile, testimony.authorLocation]);

  const commentsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'testimonies', testimony.id, 'comments'));
  }, [firestore, testimony.id]);
  const { data: comments } = useCollection<TestimonyComment>(commentsQuery);
  const commentCount = comments?.length || 0;

  React.useEffect(() => {
    setMounted(true);
    const checkTruncation = () => {
      if (contentRef.current) {
        setIsTruncated(contentRef.current.scrollHeight > contentRef.current.clientHeight);
      }
    };
    const timeoutId = setTimeout(checkTruncation, 100);
    window.addEventListener('resize', checkTruncation);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkTruncation);
    };
  }, [testimony.content]);

  const triggerAction = (action: () => void) => {
    requestAnimationFrame(() => {
      action();
    });
  };

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const shareUrl = `${window.location.origin}/testimonies#${testimony.id}`;
    const titleText = `Testimony from ${authorFullName} on Testify!`;
    const text = `Read what God has done! "${testimony.content.substring(0, 150)}..."`;
    const shareData = { title: titleText, text, url: shareUrl };
    try {
      if (navigator && navigator.share) await navigator.share(shareData);
      else throw new Error();
    } catch (err: any) {
        if (err.name === 'AbortError') return;
        try {
          await navigator.clipboard.writeText(`${titleText} ${shareUrl}`);
          toast({ title: "Link Copied!" });
        } catch (clipErr) {}
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
    const participantIds = [user.uid, testimony.authorId].sort();
    const requestId = participantIds.join('_');
    const requestRef = doc(firestore, 'accountabilityRequests', requestId);
    const newRequestData = { fromUserId: user.uid, fromUserFirstName: currentUserProfile.firstName || '', fromUserLastName: currentUserProfile.lastName || '', fromUserPhotoURL: currentUserProfile.photoURL || '', toUserId: testimony.authorId, toUserFirstName: authorFirstName || '', toUserLastName: authorLastName || '', toUserPhotoURL: authorAvatarUrl || '', status: 'pending' as const, createdAt: serverTimestamp(), participantIds };
    const notificationData = { userId: testimony.authorId, type: 'accountability_request' as const, title: 'New Accountability Request', message: `${currentUserProfile.firstName} ${currentUserProfile.lastName} wants to be your partner after seeing your testimony!`, link: '/dashboard/accountability', isRead: false, createdAt: serverTimestamp() };
    try {
        await setDoc(requestRef, newRequestData);
        await addDoc(collection(firestore, 'users', testimony.authorId, 'notifications'), notificationData);
        toast({ title: 'Request Sent!' });
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: requestRef.path, operation: 'create', requestResourceData: newRequestData }, user));
    } finally { setIsRequestingPartner(false); }
  };

  const fullTextContent = (
    <ScrollArea className={cn("pr-4", isMobile ? "h-full" : "max-h-[60vh]")}>
      <div className="space-y-6 pb-6">
        <div className="text-base sm:text-lg text-muted-foreground whitespace-pre-wrap leading-relaxed text-justify px-2">
            {testimony.content}
        </div>
      </div>
    </ScrollArea>
  );

  return (
    <>
      <Card id={testimony.id} className={cn(
        "flex flex-col h-full w-full overflow-hidden transition-all duration-300 scroll-mt-20 rounded-none sm:rounded-xl border-x-0 sm:border-x border-t-4 border-t-primary/20 border-b-2 sm:border-b shadow-none bg-card/50 backdrop-blur-sm",
        isPartner && "ring-1 ring-primary/20",
        testimony.answeredPrayerId && "border-l-4 border-l-amber-500"
      )}>
        <CardHeader className="flex flex-row items-start justify-between gap-3 p-4 sm:p-6">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Dialog>
              <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                <div className="relative cursor-pointer hover:opacity-90 transition-opacity active:scale-95 shrink-0">
                    <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border shadow-sm">
                        <AvatarImage src={authorAvatarUrl} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials || 'U'}</AvatarFallback>
                    </Avatar>
                </div>
              </DialogTrigger>
              {authorAvatarUrl && (
                <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center">
                    <DialogHeader className="sr-only"><DialogTitle>Profile photo of {authorFullName}</DialogTitle></DialogHeader>
                    <div className="relative h-full w-full flex items-center justify-center p-4">
                        <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center">
                            <Image 
                                src={authorAvatarUrl} 
                                alt={authorFullName} 
                                fill 
                                className="object-contain shadow-2xl ring-4 ring-white/10" 
                                unoptimized 
                            />
                        </div>
                    </div>
                </DialogContent>
              )}
            </Dialog>
            <div className="min-w-0 flex-1">
               <div className="flex items-center gap-2 flex-wrap">
                    <Link href={profileLink} onClick={(e) => e.stopPropagation()} className="hover:underline decoration-primary/30 underline-offset-2 shrink-0">
                        <CardTitle className="text-base sm:text-lg font-bold truncate max-w-[150px] sm:max-w-[200px]">{authorFullName}</CardTitle>
                    </Link>
                    {isPartner && <Badge variant="secondary" className="h-4 px-1.5 text-[9px] uppercase font-bold tracking-tighter bg-primary/10 text-primary border-primary/20 shrink-0">Partner</Badge>}
                    {!isAuthor && !isPartner && currentUserProfile && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className={cn("h-6 w-6 rounded-full transition-colors", hasPendingRequest ? "text-muted-foreground" : "text-primary hover:bg-primary/10")} onClick={handleSendPartnerRequest} disabled={isRequestingPartner || hasPendingRequest}>
                                        {isRequestingPartner ? <Loader2 className="h-3 w-3 animate-spin" /> : hasPendingRequest ? <Hourglass className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{hasPendingRequest ? "Request Pending" : "Add Accountability Partner"}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
               </div>
              <div className="text-muted-foreground text-sm mt-1 flex flex-col gap-0.5">
                  <div className="truncate text-[10px] sm:text-xs opacity-70">{displayDate}</div>
                  <div className="flex items-center gap-1 mt-0.5 opacity-80 text-[10px] sm:text-xs font-medium"><Globe className="h-3 w-3 text-primary shrink-0" /> {locationString}</div>
                  <div className="mt-1.5"><Badge variant="outline" className="w-fit text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 h-auto bg-background/50">{testimony.category}</Badge></div>
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
                <DropdownMenuContent align="end" className="w-48 rounded-xl"><DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Manage Story</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => triggerAction(onEdit)} className="rounded-lg"><Edit className="mr-2 h-4 w-4 text-primary" /><span>Edit Testimony</span></DropdownMenuItem><DropdownMenuItem onSelect={() => triggerAction(onDelete)} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-lg"><Trash2 className="mr-2 h-4 w-4" /><span>Delete Permanently</span></DropdownMenuItem></DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="flex-grow pt-0 px-4 sm:px-6 space-y-4">
          <div className="text-sm sm:text-base text-muted-foreground whitespace-pre-wrap leading-relaxed text-justify">
            <p ref={contentRef} className="line-clamp-6 leading-relaxed">{testimony.content}</p>
            {isTruncated && <Button variant="link" className="p-0 h-auto text-sm text-primary font-bold mt-1" onClick={(e) => { e.stopPropagation(); setShowFullText(true); }}>Read Full Story</Button>}
          </div>
          {testimony.answeredPrayerId && testimony.answeredPrayerContent && (
            <Card className="rounded-2xl border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 shadow-inner">
                <CardHeader className="p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 font-black mb-1">Answer to Prayer Request:</div>
                    <CardDescription className="border-l-2 border-amber-500/30 pl-4 italic text-sm text-muted-foreground line-clamp-2 leading-relaxed text-justify">{testimony.answeredPrayerContent}</CardDescription>
                </CardHeader>
            </Card>
           )}

           {totalReactions > 0 && (
             <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center -space-x-1.5">
                        {supporters.length > 0 && <div className="bg-primary rounded-full p-1 border-2 border-background z-30 shadow-sm"><HandHeart className="h-2.5 w-2.5 text-primary-foreground fill-current" /></div>}
                        {inspiredBy.length > 0 && <div className="bg-chart-3 rounded-full p-1 border-2 border-background z-20 shadow-sm"><Sparkles className="h-2.5 w-2.5 text-white fill-current" /></div>}
                        {connectedBy.length > 0 && <div className="bg-blue-500 rounded-full p-1 border-2 border-background z-10 shadow-sm"><PartyPopper className="h-2.5 w-2.5 text-white" /></div>}
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{totalReactions}</span>
                </div>
                {testimony.campaignTitle && <span className="text-[9px] font-black uppercase text-muted-foreground/60 truncate italic bg-muted/50 px-2 py-0.5 rounded-full border max-w-[150px]">RE: {testimony.campaignTitle}</span>}
             </div>
           )}
        </CardContent>

        <Separator className="mx-4 sm:mx-6 w-auto opacity-50" />
        <CardFooter className="py-2 sm:py-3 px-2 sm:px-6 grid grid-cols-4 gap-1 sm:gap-2">
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('amen'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasAmened && "text-primary hover:text-primary bg-primary/5")}>
                {isProcessingReaction === 'amen' ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <HandHeart className={cn("h-3 w-3 sm:h-4 sm:w-4", hasAmened && "fill-current")} />}<span>Amen</span>
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('inspired'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasInspired && "text-chart-3 hover:text-chart-3 bg-chart-3/5")}>
                {isProcessingReaction === 'inspired' ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Sparkles className={cn("h-3 w-3 sm:h-4 sm:w-4", hasInspired && "fill-current")} />}<span>Hallelujah</span>
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('connect'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasConnected && "text-blue-500 hover:text-blue-500 bg-blue-500/5")}>
                {isProcessingReaction === 'connect' ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <PartyPopper className={cn("h-3 w-3 sm:h-4 sm:w-4", hasConnected && "fill-current")} />}<span>Celebrate</span>
            </Button>
            <Button variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", isCommentsOpen && "text-primary hover:text-primary bg-primary/5")} onClick={(e) => { e.stopPropagation(); setIsCommentsOpen(true); }}>
                <div className="relative"><MessageSquare className={cn("h-3 w-3 sm:h-4 sm:w-4", isCommentsOpen && "fill-current")} />{commentCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-primary text-[7px] sm:text-[8px] font-black text-primary-foreground border-background border-2 shadow-sm">{commentCount}</span>}</div><span>Comment</span>
            </Button>
        </CardFooter>
      </Card>

      {mounted && (
        <>
            {isMobile ? (
                <>
                    <Sheet open={showFullText} onOpenChange={setShowFullText}>
                        <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                            <div className="p-8 border-b shrink-0 bg-muted/20"><SheetHeader className="text-left"><SheetTitle className="text-2xl font-black font-headline tracking-tight uppercase">Full Story</SheetTitle><SheetDescription className="text-xs font-bold uppercase tracking-widest">Shared by {authorFullName} • {displayDate}</SheetDescription></SheetHeader></div>
                            <div className="flex-grow min-h-0 p-8 overflow-y-auto">{fullTextContent}</div>
                        </SheetContent>
                    </Sheet>
                    <Sheet open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                        <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]"><div className="p-8 border-b shrink-0 bg-muted/20"><SheetHeader className="text-left"><SheetTitle className="text-2xl font-black font-headline tracking-tight uppercase">Responses</SheetTitle><SheetDescription className="text-xs font-bold uppercase tracking-widest">GATHERED JOY FOR {authorFullName}</SheetDescription></SheetHeader></div><div className="flex-grow min-h-0"><CommentSection testimonyId={testimony.id} /></div></SheetContent>
                    </Sheet>
                </>
            ) : (
                <>
                    <Dialog open={showFullText} onOpenChange={setShowFullText}>
                        <DialogContent className="sm:max-w-3xl rounded-3xl overflow-hidden p-0"><div className="p-8 border-b bg-muted/10"><DialogHeader><DialogTitle className="text-3xl font-black font-headline tracking-tight uppercase">Kingdom Testimony</DialogTitle><DialogDescription className="text-sm font-bold uppercase tracking-widest">BY {authorFullName} • {displayDate}</DialogDescription></DialogHeader></div><div className="p-8">{fullTextContent}</div></DialogContent>
                    </Dialog>
                    <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                        <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh] p-0 overflow-hidden rounded-3xl"><div className="p-8 border-b shrink-0 bg-muted/10"><DialogHeader><DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase">Gathered Responses</DialogTitle><DialogDescription className="text-xs font-bold uppercase tracking-widest">COMMUNITY RESPONSES TO THIS MIRACLE</DialogDescription></DialogHeader></div><div className="flex-1 min-h-0"><CommentSection testimonyId={testimony.id} /></div></DialogContent>
                    </Dialog>
                </>
            )}
        </>
      )}
    </>
  );
});
TestimonyCard.displayName = "TestimonyCard";
