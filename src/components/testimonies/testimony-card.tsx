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
import { Testimony } from "@/lib/types";
import { format } from "date-fns";
import { Share2, MoreVertical, Edit, Trash2, Loader2, Globe, Sparkles, Link as LinkIcon, HandHeart, MessageCircle } from "lucide-react";
import { useUser, useFirestore } from "@/firebase";
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
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn, safeToDate } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { CommentSection } from "./comment-section";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Separator } from "../ui/separator";

export const TestimonyCard = React.memo(function TestimonyCard({ testimony, onDelete, onEdit }: { testimony: Testimony, onDelete: () => void, onEdit: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  const [isProcessingReaction, setIsProcessingReaction] = useState<string | null>(null);
  const contentRef = React.useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);
  const [showFullText, setShowFullText] = React.useState(false);
  const [showComments, setShowComments] = React.useState(false);

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
    if (!user || !firestore || isAuthor) return;

    const hasReacted = 
      (type === 'amen' && hasAmened) || 
      (type === 'inspired' && hasInspired) || 
      (type === 'connect' && hasConnected);

    if (hasReacted) return;

    setIsProcessingReaction(type);
    
    const testimonyRef = doc(firestore, 'testimonies', testimony.id);
    const field = type === 'amen' ? 'supporters' : type === 'inspired' ? 'inspiredBy' : 'connectedBy';
    const updatePayload = { [field]: arrayUnion(user.uid) };

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

  const handleShare = (platform: "link" | "facebook" | "twitter" | "whatsapp") => {
    const baseUrl = "https://testifyglobal.com";
    const url = `${baseUrl}/dashboard/testimonies#${testimony.id}`;
    const posterHeader = "🌟 TESTIMONY POSTER 🌟\n\n";
    const text = `Check out this powerful testimony from ${authorFullName} in ${testimony.authorLocation?.country || 'the community'}!\n\n"${testimony.content.substring(0, 150)}..."`;
    const shareTextWithUrl = `${posterHeader}${text}\n\nRead more at: ${url}`;
    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
        window.open(shareUrl, "_blank");
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
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
          description: "Poster link copied to your clipboard.",
        });
        break;
    }
  };

  const fullTextContent = (
    <ScrollArea className={cn("pr-4", isMobile ? "h-full" : "max-h-[60vh]")}>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed pb-6">
        {testimony.content}
      </p>
    </ScrollArea>
  );

  return (
    <>
      <Card id={testimony.id} className={cn(
        "flex flex-col h-full overflow-hidden shadow-sm hover:shadow-md transition-shadow scroll-mt-20 border-l-4",
        testimony.answeredPrayerId ? "border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/10" : "border-l-primary/40"
      )}>
        <CardHeader className="flex flex-row items-start justify-between gap-3 p-4 sm:p-6">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Dialog>
              <DialogTrigger asChild onClick={(e) => e.stopPropagation()} disabled={!testimony.authorAvatarUrl}>
                <Avatar className={cn(testimony.authorAvatarUrl && "cursor-pointer h-10 w-10 sm:h-12 sm:w-12")}>
                  <AvatarImage src={testimony.authorAvatarUrl} alt={authorFullName} />
                  <AvatarFallback>{initials || 'A'}</AvatarFallback>
                </Avatar>
              </DialogTrigger>
              {testimony.authorAvatarUrl && (
                  <DialogContent className="p-0 bg-transparent border-0 w-auto max-w-lg" onClick={(e) => {e.stopPropagation();}}>
                    <DialogHeader className="sr-only">
                        <DialogTitle>Profile photo of {authorFullName}</DialogTitle>
                        <DialogDescription>A larger view of the user's profile photo.</DialogDescription>
                    </DialogHeader>
                    <Image src={testimony.authorAvatarUrl} alt={authorFullName} width={600} height={600} className="rounded-lg object-contain" unoptimized/>
                  </DialogContent>
              )}
            </Dialog>
            <div className="min-w-0 flex-1">
               <Link href={profileLink} onClick={(e) => { e.stopPropagation(); }} className="hover:underline">
                <CardTitle className="text-sm sm:text-base font-semibold truncate">{authorFullName}</CardTitle>
              </Link>
              <CardDescription className="text-[10px] sm:text-xs mt-0.5 flex flex-col gap-0.5">
                  <span className="flex items-center gap-1"><Globe className="h-3 w-3 text-primary shrink-0" /> {[testimony.authorLocation?.city, testimony.authorLocation?.country].filter(Boolean).join(', ') || 'Global Community'}</span>
                  <span className="truncate">{displayDate}</span>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="shrink-0 text-[9px] sm:text-[10px] uppercase tracking-widest px-2 py-0 h-5 sm:h-6">{testimony.category}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Share God's Glory</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleShare('link'); }}><Share2 className="mr-2 h-4 w-4" /><span>Copy Link</span></DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleShare('whatsapp'); }}><MessageCircle className="mr-2 h-4 w-4" /><span>Share WhatsApp Poster</span></DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleShare('facebook'); }}><Icons.facebook className="mr-2 h-4 w-4" /><span>Share on Facebook</span></DropdownMenuItem>
                {isAuthor && <DropdownMenuSeparator />}
                {isAuthor && <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onEdit(); }}><Edit className="mr-2 h-4 w-4" /><span>Edit</span></DropdownMenuItem>}
                {isAuthor && <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onDelete(); }} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="flex-grow pt-0 px-4 sm:px-6 space-y-4">
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            <p ref={contentRef} className="line-clamp-4 italic leading-relaxed text-xs sm:text-sm">
              &ldquo;{testimony.content}&rdquo;
            </p>
            {isTruncated && (
              <Button
                variant="link"
                className="p-0 h-auto text-xs text-primary font-bold mt-1"
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
            <Card className="border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10 shadow-inner">
                <CardHeader className="p-2 sm:p-3">
                    <CardDescription className="text-[9px] sm:text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">
                        Answer to Prayer Request:
                    </CardDescription>
                    <blockquote className="border-l-2 border-amber-500/50 pl-2 sm:pl-3 italic text-[11px] sm:text-xs text-muted-foreground line-clamp-2">
                        &ldquo;{testimony.answeredPrayerContent}&rdquo;
                    </blockquote>
                </CardHeader>
            </Card>
           )}

           {totalReactions > 0 && (
             <div className="flex items-center justify-between pt-2">
                <div className="flex items-center -space-x-1">
                    {supporters.length > 0 && <div className="bg-primary rounded-full p-1 border-2 border-background z-30"><HandHeart className="h-2.5 w-2.5 text-primary-foreground fill-current" /></div>}
                    {inspiredBy.length > 0 && <div className="bg-chart-3 rounded-full p-1 border-2 border-background z-20"><Sparkles className="h-2.5 w-2.5 text-white fill-current" /></div>}
                    {connectedBy.length > 0 && <div className="bg-blue-500 rounded-full p-1 border-2 border-background z-10"><LinkIcon className="h-2.5 w-2.5 text-white" /></div>}
                    <span className="text-[10px] text-muted-foreground ml-2">{totalReactions}</span>
                </div>
                {testimony.campaignTitle && (
                   <span className="text-[9px] text-muted-foreground truncate italic opacity-60">Event: {testimony.campaignTitle}</span>
                )}
             </div>
           )}

            <Collapsible open={showComments} onOpenChange={setShowComments}>
                <CollapsibleContent>
                    <CommentSection testimonyId={testimony.id} />
                </CollapsibleContent>
            </Collapsible>
        </CardContent>

        <Separator className="mx-4 sm:mx-6 w-auto" />
        
        <CardFooter className="py-2 px-2 sm:px-4 grid grid-cols-4 gap-1">
            <Button 
                onClick={(e) => { e.stopPropagation(); handleReaction('amen'); }} 
                disabled={hasAmened || isProcessingReaction !== null || !user || isAuthor} 
                variant="ghost" 
                size="sm" 
                className={cn("flex flex-col sm:flex-row h-auto py-2 gap-1 text-[10px] sm:text-xs font-semibold text-muted-foreground hover:bg-muted/50", hasAmened && "text-primary hover:text-primary")}
            >
                {isProcessingReaction === 'amen' ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandHeart className={cn("h-4 w-4", hasAmened && "fill-current")} />}
                <span>Amen</span>
            </Button>

            <Button 
                onClick={(e) => { e.stopPropagation(); handleReaction('inspired'); }} 
                disabled={hasInspired || isProcessingReaction !== null || !user || isAuthor} 
                variant="ghost" 
                size="sm" 
                className={cn("flex flex-col sm:flex-row h-auto py-2 gap-1 text-[10px] sm:text-xs font-semibold text-muted-foreground hover:bg-muted/50", hasInspired && "text-chart-3 hover:text-chart-3")}
            >
                {isProcessingReaction === 'inspired' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className={cn("h-4 w-4", hasInspired && "fill-current")} />}
                <span>Inspired</span>
            </Button>

            <Button 
                onClick={(e) => { e.stopPropagation(); handleReaction('connect'); }} 
                disabled={hasConnected || isProcessingReaction !== null || !user || isAuthor} 
                variant="ghost" 
                size="sm" 
                className={cn("flex flex-col sm:flex-row h-auto py-2 gap-1 text-[10px] sm:text-xs font-semibold text-muted-foreground hover:bg-muted/50", hasConnected && "text-blue-500 hover:text-blue-500")}
            >
                {isProcessingReaction === 'connect' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                <span>Connect</span>
            </Button>

            <Button 
                variant="ghost" 
                size="sm" 
                className={cn("flex flex-col sm:flex-row h-auto py-2 gap-1 text-[10px] sm:text-xs font-semibold text-muted-foreground hover:bg-muted/50", showComments && "text-primary hover:text-primary")}
                onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
            >
                <MessageCircle className={cn("h-4 w-4", showComments && "fill-current")} />
                <span>Comment</span>
            </Button>
        </CardFooter>
      </Card>

      {mounted && isMobile ? (
        <Sheet open={showFullText} onOpenChange={setShowFullText}>
          <SheetContent side="bottom" className="h-[80dvh] flex flex-col p-0">
            <div className="p-6 border-b shrink-0">
                <SheetHeader className="text-left">
                <SheetTitle>Testimony by {authorFullName}</SheetTitle>
                <SheetDescription>{displayDate}</SheetDescription>
                </SheetHeader>
            </div>
            <div className="flex-grow min-h-0 p-6 overflow-y-auto">
              {fullTextContent}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={showFullText} onOpenChange={setShowFullText}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Testimony by {authorFullName}</DialogTitle>
              <DialogDescription>{displayDate}</DialogDescription>
            </DialogHeader>
            {fullTextContent}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
});
