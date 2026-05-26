"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
  PartyPopper, 
  HandHeart, 
  X, 
  Facebook, 
  Twitter, 
  Link as LinkIcon, 
  MessageSquare,
  MessageCircle,
  UserPlus,
  HeartHandshake,
  CheckCircle2,
  Hourglass
} from "lucide-react";
import { useUser, useAuth, useFirestore, useCollection } from "@/firebase";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

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

  const isAuthor = user?.uid === testimony.authorId;
  const authorFullName = [testimony.authorFirstName, testimony.authorLastName].filter(Boolean).join(' ').trim() || 'Anonymous';
  const profileLink = isAuthor ? "/dashboard/profile" : `/dashboard/profile/${testimony.authorId}`;
  const initials = (testimony.authorFirstName?.charAt(0) || '') + (testimony.authorLastName?.charAt(0) || '');

  const supporters = testimony.supporters || [];
  const inspiredBy = testimony.inspiredBy || [];
  const connectedBy = testimony.connectedBy || [];
  
  const totalReactions = supporters.length + inspiredBy.length + connectedBy.length;

  const hasAmened = useMemo(() => user ? supporters.includes(user.uid) : false, [user, supporters]);
  const hasInspired = useMemo(() => user ? inspiredBy.includes(user.uid) : false, [user, inspiredBy]);
  const hasConnected = useMemo(() => user ? connectedBy.includes(user.uid) : false, [user, connectedBy]);
  
  const displayDate = useMemo(() => {
    const createdAtDate = safeToDate(testimony.createdAt);
    return createdAtDate ? format(createdAtDate, "PPP 'at' p") : 'Shared recently';
  }, [testimony.createdAt]);
  
  const locationString = useMemo(() => {
    const { city, country } = testimony.authorLocation || {};
    return [city, country].filter(Boolean).join(', ') || 'Global Community';
  }, [testimony.authorLocation]);

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

  const handleReaction = (type: 'amen' | 'inspired' | 'connect') => {
    if (!user || !firestore) return;

    const hasReacted = 
      (type === 'amen' && hasAmened) || 
      (type === 'inspired' && hasInspired) || 
      (type === 'connect' && hasConnected);

    setIsProcessingReaction(type);
    
    const testimonyRef = doc(firestore, 'testimonies', testimony.id);
    const field = type === 'amen' ? 'supporters' : type === 'inspired' ? 'inspiredBy' : 'connectedBy';
    
    const updatePayload = { 
      [field]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid) 
    };

    updateDoc(testimonyRef, updatePayload)
        .catch(() => {
            const permissionError = new FirestorePermissionError({
              path: testimonyRef.path,
              operation: 'update',
              requestResourceData: updatePayload,
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsProcessingReaction(null);
        });
  }

  const handleSendPartnerRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !firestore || !currentUserProfile || isAuthor || isPartner || hasPendingRequest) return;
    
    setIsRequestingPartner(true);
    
    const participantIds = [user.uid, testimony.authorId].sort();
    const requestId = participantIds.join('_');
    const requestRef = doc(firestore, 'accountabilityRequests', requestId);

    const newRequestData = {
        fromUserId: user.uid,
        fromUserFirstName: currentUserProfile.firstName || '',
        fromUserLastName: currentUserProfile.lastName || '',
        fromUserPhotoURL: currentUserProfile.photoURL || '',
        toUserId: testimony.authorId,
        toUserFirstName: testimony.authorFirstName || '',
        toUserLastName: testimony.authorLastName || '',
        toUserPhotoURL: testimony.authorAvatarUrl || '',
        status: 'pending' as const,
        createdAt: serverTimestamp(),
        participantIds,
    };

    const notificationData = {
        userId: testimony.authorId,
        type: 'accountability_request' as const,
        title: 'New Accountability Request',
        message: `${currentUserProfile.firstName} ${currentUserProfile.lastName} wants to be your partner after seeing your testimony!`,
        link: '/dashboard/accountability',
        isRead: false,
        createdAt: serverTimestamp(),
    };

    try {
        await setDoc(requestRef, newRequestData);
        await addDoc(collection(firestore, 'users', testimony.authorId, 'notifications'), notificationData);
        toast({ title: 'Request Sent!', description: `Request sent to ${testimony.authorFirstName}.` });
    } catch (error) {
        const permissionError = new FirestorePermissionError({
            path: requestRef.path,
            operation: 'create',
            requestResourceData: newRequestData
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsRequestingPartner(false);
    }
  };

  const handleShare = async () => {
    const baseUrl = "https://testifyglobal.com";
    const shareUrl = `${baseUrl}/dashboard/testimonies#${testimony.id}`;
    const title = `Testimony from ${authorFullName} on Testify!`;
    const text = `Read what God has done! "${testimony.content.substring(0, 150)}..."`;
    
    const shareData: any = {
      title,
      text,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
         handleShareDropdown('link');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
        handleShareDropdown('link');
      }
    }
  };

  const handleShareDropdown = (platform: "link" | "facebook" | "twitter" | "whatsapp") => {
    const baseUrl = "https://testifyglobal.com";
    const url = `${baseUrl}/dashboard/testimonies#${testimony.id}`;
    const titleText = `Check out this testimony from ${authorFullName} on Testify!`;
    const shareTextWithUrl = `${titleText} ${url}`;
    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(titleText)}`;
        window.open(shareUrl, "_blank");
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(titleText)}`;
        window.open(shareUrl, "_blank");
        break;
      case "whatsapp":
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareTextWithUrl)}`;
        window.open(shareUrl, "_blank");
        break;
      case "link":
        navigator.clipboard.writeText(shareTextWithUrl);
        toast({
          title: "Link Copied!",
          description: "Testimony link copied to your clipboard.",
        });
        break;
    }
  };

  const shareButton = (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleShare();
            }}>
                <Share2 className="h-4 w-4" />
                <span className="sr-only">Share Testimony</span>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2 border-b pb-3 mb-1">
                <Avatar className="h-8 w-8 border shrink-0">
                    <AvatarImage src={testimony.authorAvatarUrl} />
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                        Share Glory
                    </span>
                    <span className="text-xs font-semibold truncate leading-tight">
                        From {authorFullName}
                    </span>
                </div>
            </DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => handleShareDropdown('link')}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleShareDropdown('whatsapp')}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Share on WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleShareDropdown('facebook')}>
                <Facebook className="mr-2 h-4 w-4" />
                Share on Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleShareDropdown('twitter')}>
                <Twitter className="mr-2 h-4 w-4" />
                Share on Twitter (X)
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );

  const fullTextContent = (
    <ScrollArea className={cn("pr-4", isMobile ? "h-full" : "max-h-[60vh]")}>
      <div className="text-base text-muted-foreground whitespace-pre-wrap leading-relaxed pb-6">
        {testimony.content}
      </div>
    </ScrollArea>
  );

  return (
    <>
      <Card id={testimony.id} className={cn(
        "flex flex-col h-full overflow-hidden shadow-sm hover:shadow-md transition-shadow scroll-mt-20 border-l-4 rounded-none sm:rounded-lg border-x-0 sm:border-x border-b-2 sm:border-b",
        testimony.answeredPrayerId ? "border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/10" : "border-l-primary/40",
        isPartner && "border-l-primary ring-1 ring-primary/20 bg-primary/[0.02]"
      )}>
        <CardHeader className="flex flex-row items-start justify-between gap-3 p-4 sm:p-6">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Dialog>
              <DialogTrigger asChild onClick={(e) => e.stopPropagation()} disabled={!testimony.authorAvatarUrl}>
                <Avatar className={cn(testimony.authorAvatarUrl && "cursor-pointer h-10 w-10 sm:h-12 sm:w-12 border shadow-sm transition-transform active:scale-95")}>
                  <AvatarImage src={testimony.authorAvatarUrl} alt={authorFullName} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials || 'A'}</AvatarFallback>
                </Avatar>
              </DialogTrigger>
              {testimony.authorAvatarUrl && (
                  <DialogContent className="p-0 bg-transparent border-0 w-auto max-w-lg overflow-hidden rounded-3xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Profile photo of {authorFullName}</DialogTitle>
                        <DialogDescription>A larger view of the user's profile photo.</DialogDescription>
                    </DialogHeader>
                    <Image src={testimony.authorAvatarUrl} alt={authorFullName} width={800} height={800} className="rounded-3xl object-contain max-h-[85vh] shadow-2xl" unoptimized/>
                  </DialogContent>
              )}
            </Dialog>
            <div className="min-w-0 flex-1">
               <div className="flex items-center gap-2 flex-wrap">
                    <Link href={profileLink} onClick={(e) => { e.stopPropagation(); }} className="hover:underline decoration-primary/30 underline-offset-2">
                        <CardTitle className="text-lg font-bold truncate">{authorFullName}</CardTitle>
                    </Link>
                    {isPartner && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[9px] uppercase font-bold tracking-tighter bg-primary/10 text-primary border-primary/20">
                            Partner
                        </Badge>
                    )}
                    {!isAuthor && !isPartner && currentUserProfile && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className={cn(
                                            "h-6 w-6 rounded-full transition-colors",
                                            hasPendingRequest ? "text-muted-foreground" : "text-primary hover:bg-primary/10"
                                        )}
                                        onClick={handleSendPartnerRequest}
                                        disabled={isRequestingPartner || hasPendingRequest}
                                    >
                                        {isRequestingPartner ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : hasPendingRequest ? (
                                            <Hourglass className="h-3 w-3" />
                                        ) : (
                                            <UserPlus className="h-3 w-3" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{hasPendingRequest ? "Request Pending" : "Add Accountability Partner"}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
               </div>
              <div className="text-muted-foreground text-sm mt-1 flex flex-col gap-1">
                  <div className="truncate text-xs opacity-70">{displayDate}</div>
                  <div className="flex items-center gap-1 mt-0.5 opacity-80 text-xs font-medium"><Globe className="h-3 w-3 text-primary shrink-0" /> {locationString}</div>
                  <div className="mt-2">
                    <Badge variant="outline" className="w-fit text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 h-auto bg-background/50">{testimony.category}</Badge>
                  </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {shareButton}
            {isAuthor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Manage Story</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onEdit(); }}>
                    <Edit className="mr-2 h-4 w-4 text-primary" />
                    <span>Edit Testimony</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onDelete(); }} className="text-destructive focus:text-destructive focus:bg-destructive/5">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Permanently</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="flex-grow pt-0 px-4 sm:px-6 space-y-4">
          <div className="text-sm sm:text-base text-muted-foreground whitespace-pre-wrap leading-relaxed">
            <p ref={contentRef} className="line-clamp-4">
              {testimony.content}
            </p>
            {isTruncated && (
              <Button
                variant="link"
                className="p-0 h-auto text-sm text-primary font-bold mt-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullText(true);
                }}
              >
                Read Full Story
              </Button>
            )}
          </div>
          {testimony.answeredPrayerId && testimony.answeredPrayerContent && (
            <Card className="rounded-2xl border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 shadow-inner">
                <CardHeader className="p-4">
                    <CardDescription className="text-[10px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 font-black mb-1">
                        Answer to Prayer Request:
                    </CardDescription>
                    <div className="border-l-2 border-amber-500/30 pl-4 italic text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {testimony.answeredPrayerContent}
                    </div>
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
                {testimony.campaignTitle && (
                   <span className="text-[10px] font-medium text-muted-foreground truncate italic opacity-60 bg-muted/50 px-2 py-0.5 rounded-full border">In mission: {testimony.campaignTitle}</span>
                )}
             </div>
           )}
        </CardContent>

        <Separator className="mx-4 sm:mx-6 w-auto opacity-50" />
        
        <CardFooter className="py-3 px-2 sm:px-6 grid grid-cols-4 gap-2">
            <Button 
                onClick={(e) => { e.stopPropagation(); handleReaction('amen'); }} 
                disabled={isProcessingReaction !== null || !user} 
                variant="ghost" 
                size="sm" 
                className={cn("flex flex-col sm:flex-row items-center justify-center h-auto sm:h-10 py-2.5 sm:py-0 gap-1 sm:gap-2 text-[10px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasAmened && "text-primary hover:text-primary bg-primary/5")}
            >
                {isProcessingReaction === 'amen' ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <HandHeart className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", hasAmened && "fill-current")} />}
                <span>Amen</span>
            </Button>

            <Button 
                onClick={(e) => { e.stopPropagation(); handleReaction('inspired'); }} 
                disabled={isProcessingReaction !== null || !user} 
                variant="ghost" 
                size="sm" 
                className={cn("flex flex-col sm:flex-row items-center justify-center h-auto sm:h-10 py-2.5 sm:py-0 gap-1 sm:gap-2 text-[10px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasInspired && "text-chart-3 hover:text-chart-3 bg-chart-3/5")}
            >
                {isProcessingReaction === 'inspired' ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <Sparkles className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", hasInspired && "fill-current")} />}
                <span>Hallelujah</span>
            </Button>

            <Button 
                onClick={(e) => { e.stopPropagation(); handleReaction('connect'); }} 
                disabled={isProcessingReaction !== null || !user} 
                variant="ghost" 
                size="sm" 
                className={cn("flex flex-col sm:flex-row items-center justify-center h-auto sm:h-10 py-2.5 sm:py-0 gap-1 sm:gap-2 text-[10px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasConnected && "text-blue-500 hover:text-blue-500 bg-blue-500/5")}
            >
                {isProcessingReaction === 'connect' ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <PartyPopper className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", hasConnected && "fill-current")} />}
                <span>Celebrate</span>
            </Button>

            <Button 
                variant="ghost" 
                size="sm" 
                className={cn("flex flex-col sm:flex-row items-center justify-center h-auto sm:h-10 py-2.5 sm:py-0 gap-1 sm:gap-2 text-[10px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", isCommentsOpen && "text-primary hover:text-primary bg-primary/5")}
                onClick={(e) => { e.stopPropagation(); setIsCommentsOpen(true); }}
            >
                <div className="relative">
                    <MessageSquare className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isCommentsOpen && "fill-current")} />
                    {commentCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-primary text-[7px] sm:text-[8px] font-black text-primary-foreground border-background border-2 shadow-sm">
                            {commentCount}
                        </span>
                    )}
                </div>
                <span>Comment</span>
            </Button>
        </CardFooter>
      </Card>

      {mounted && (
        <>
            {isMobile ? (
                <>
                    <Sheet open={showFullText} onOpenChange={setShowFullText}>
                        <SheetContent side="bottom" className="h-[80dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                            <div className="p-8 border-b shrink-0 bg-muted/20">
                                <SheetHeader className="text-left">
                                    <SheetTitle className="text-2xl font-black font-headline tracking-tight">Testimony by {authorFullName}</SheetTitle>
                                    <SheetDescription className="text-sm font-medium">{displayDate}</SheetDescription>
                                </SheetHeader>
                            </div>
                            <div className="flex-grow min-h-0 p-8 overflow-y-auto">
                                {fullTextContent}
                            </div>
                        </SheetContent>
                    </Sheet>

                    <Sheet open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                        <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                            <div className="p-8 border-b shrink-0 bg-muted/20">
                                <SheetHeader className="text-left">
                                    <SheetTitle className="text-2xl font-black font-headline tracking-tight">Gathered Responses</SheetTitle>
                                    <SheetDescription className="text-sm font-medium">Sharing the joy of {authorFullName}'s victory.</SheetDescription>
                                </SheetHeader>
                            </div>
                            <div className="flex-grow min-h-0">
                                <CommentSection testimonyId={testimony.id} />
                            </div>
                        </SheetContent>
                    </Sheet>
                </>
            ) : (
                <>
                    <Dialog open={showFullText} onOpenChange={setShowFullText}>
                        <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden">
                            <div className="p-8 border-b bg-muted/10">
                                <DialogHeader>
                                    <DialogTitle className="text-3xl font-black font-headline tracking-tight">Testimony by {authorFullName}</DialogTitle>
                                    <DialogDescription className="text-sm font-medium">{displayDate}</DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className="p-8">
                                {fullTextContent}
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                        <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh] p-0 overflow-hidden rounded-3xl">
                            <div className="p-8 border-b shrink-0 bg-muted/10">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black font-headline tracking-tight">Gathered Responses</DialogTitle>
                                    <DialogDescription className="text-sm font-medium">Community responses to this miracle.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className="flex-1 min-h-0">
                                <CommentSection testimonyId={testimony.id} />
                            </div>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </>
      )}
    </>
  );
});