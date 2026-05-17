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
import { Share2, MoreVertical, Edit, Trash2, Loader2, MapPin, HandHeart, MessageCircle, Globe } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

export const TestimonyCard = React.memo(function TestimonyCard({ testimony, onDelete, onEdit }: { testimony: Testimony, onDelete: () => void, onEdit: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  const [isSupporting, setIsSupporting] = useState(false);
  const contentRef = React.useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);
  const [showFullText, setShowFullText] = React.useState(false);

  const isAuthor = user?.uid === testimony.authorId;
  const authorFullName = [testimony.authorFirstName, testimony.authorLastName].filter(Boolean).join(' ').trim() || 'Anonymous';
  const profileLink = isAuthor ? "/dashboard/profile" : `/dashboard/profile/${testimony.authorId}`;
  const initials = (testimony.authorFirstName?.charAt(0) || '') + (testimony.authorLastName?.charAt(0) || '');

  const supporters = testimony.supporters || [];
  const hasSupported = useMemo(() => user ? supporters.includes(user.uid) : false, [user, supporters]);
  
  const displayDate = useMemo(() => {
    const createdAtDate = testimony.createdAt
      ? new Date(testimony.createdAt.seconds * 1000)
      : new Date();
    
    return format(createdAtDate, "PPP 'at' p");
  }, [testimony.createdAt]);
  
  const locationString = [testimony.authorLocation?.city, testimony.authorLocation?.country].filter(Boolean).join(', ');

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

  const handleSupport = () => {
    if (!user || !firestore || hasSupported || isAuthor) return;
    setIsSupporting(true);
    
    const testimonyRef = doc(firestore, 'testimonies', testimony.id);
    const updatePayload = { supporters: arrayUnion(user.uid) };

    updateDoc(testimonyRef, updatePayload)
        .catch(() => {
            const permissionError = new FirestorePermissionError({
              path: testimonyRef.path,
              operation: 'update',
              requestResourceData: { supporters: `(arrayUnion: ${user.uid})` },
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsSupporting(false);
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
      <Card id={testimony.id} className="flex flex-col h-full overflow-hidden shadow-md scroll-mt-20 border-l-4 border-l-primary/40">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Dialog>
              <DialogTrigger asChild onClick={(e) => e.stopPropagation()} disabled={!testimony.authorAvatarUrl}>
                <Avatar className={cn(testimony.authorAvatarUrl && "cursor-pointer h-12 w-12")}>
                  <AvatarImage src={testimony.authorAvatarUrl} alt={authorFullName} />
                  <AvatarFallback>{initials || 'A'}</AvatarFallback>
                </Avatar>
              </DialogTrigger>
              {testimony.authorAvatarUrl && (
                  <DialogContent className="p-0 bg-transparent border-0 w-auto max-w-lg" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader className="sr-only">
                        <DialogTitle>Profile photo of {authorFullName}</DialogTitle>
                        <DialogDescription>A larger view of the user's profile photo.</DialogDescription>
                    </DialogHeader>
                    <Image src={testimony.authorAvatarUrl} alt={authorFullName} width={600} height={600} className="rounded-lg object-contain"/>
                  </DialogContent>
              )}
            </Dialog>
            <div className="min-w-0 flex-1">
               <Link href={profileLink} onClick={(e) => { e.stopPropagation(); }} className="hover:underline">
                <CardTitle className="text-base font-semibold truncate">{authorFullName}</CardTitle>
              </Link>
              <CardDescription className="text-[10px] mt-1 flex flex-col gap-0.5">
                  <span className="flex items-center gap-1"><Globe className="h-3 w-3 text-primary" /> {testimony.authorLocation?.country || 'Global Community'}</span>
                  <span>{displayDate}</span>
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-widest">{testimony.category}</Badge>
        </CardHeader>
        <CardContent className="flex-grow pt-0 space-y-4">
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            <p ref={contentRef} className="line-clamp-4 italic leading-relaxed">
              &ldquo;{testimony.content}&rdquo;
            </p>
            {isTruncated && (
              <Button
                variant="link"
                className="p-0 h-auto text-xs text-primary font-bold"
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
                <CardHeader className="p-3">
                    <CardDescription className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">
                        Answer to Prayer Request:
                    </CardDescription>
                    <blockquote className="border-l-2 border-amber-500/50 pl-3 italic text-xs text-muted-foreground">
                        &ldquo;{testimony.answeredPrayerContent}&rdquo;
                    </blockquote>
                </CardHeader>
            </Card>
           )}
        </CardContent>
        <CardFooter className="pt-4 flex justify-between items-center mt-auto border-t bg-muted/20">
          {testimony.campaignTitle && testimony.campaignId && (
              <div className="text-[10px] text-muted-foreground mr-auto truncate italic">
                  Event: <Link href={`/dashboard/campaigns/${testimony.campaignId}`} className="font-semibold text-primary hover:underline">{testimony.campaignTitle}</Link>
              </div>
          )}
          <div className="ml-auto flex items-center gap-1">
            <Button onClick={(e) => { e.stopPropagation(); handleSupport(); }} disabled={hasSupported || isSupporting || !user || isAuthor} variant="ghost" size="sm" className="h-8 px-2 flex items-center text-muted-foreground hover:bg-transparent">
              {isSupporting ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <HandHeart className={cn("mr-1 h-4 w-4", hasSupported && "fill-primary text-primary")} />
              )}
              <span className={cn("text-[10px] font-bold uppercase", hasSupported && "text-primary")}>{hasSupported ? 'Amen!' : 'Amen'}</span>
              {supporters.length > 0 && <span className="text-[10px] ml-1">({supporters.length})</span>}
            </Button>
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
        </CardFooter>
      </Card>

      {mounted && isMobile ? (
        <Sheet open={showFullText} onOpenChange={setShowFullText}>
          <SheetContent side="bottom" className="h-[80dvh] flex flex-col">
            <SheetHeader className="text-left flex-shrink-0">
              <SheetTitle>Testimony by {authorFullName}</SheetTitle>
              <SheetDescription>{displayDate}</SheetDescription>
            </SheetHeader>
            <div className="flex-grow min-h-0 pt-6">
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
