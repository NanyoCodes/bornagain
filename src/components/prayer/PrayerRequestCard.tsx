"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PrayerRequest, UserProfile } from "@/lib/types";
import { format } from "date-fns";
import { HandHeart, Users, Trash2, Loader2, User, Award, Newspaper, Edit, ChevronDown, X } from "lucide-react";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { useState, useMemo, memo, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn, safeToDate } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";

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
                        <AvatarFallback className="font-black bg-primary/10 text-primary font-bold text-center flex items-center justify-center w-full h-full">{fallbackInitials || 'U'}</AvatarFallback>
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

export const PrayerRequestCard = memo(function PrayerRequestCard({ 
  prayerRequest, 
  onDelete, 
  onAnswerPrayer,
  onEdit 
}: { 
  prayerRequest: PrayerRequest, 
  onDelete: () => void, 
  onAnswerPrayer: () => void, 
  onEdit: () => void; 
}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  
  const [isPraying, setIsPraying] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

  const isAuthor = user?.uid === prayerRequest.authorId;
  const isAnswered = prayerRequest.status === 'answered';
  const usersWhoPrayed = prayerRequest.usersWhoPrayed || [];
  const prayerCount = usersWhoPrayed.length;
  const hasPrayed = user ? usersWhoPrayed.includes(user.uid) : false;

  const displayDate = useMemo(() => {
    const createdAtDate = safeToDate(prayerRequest.createdAt);
    return createdAtDate ? "Shared " + format(createdAtDate, "PPP 'at' p") : 'Shared recently';
  }, [prayerRequest.createdAt]);

  const authorName = prayerRequest.isAnonymous ? 'Confidential Request' : `${prayerRequest.authorFirstName || ''} ${prayerRequest.authorLastName || ''}`.trim();
  const profileLink = !prayerRequest.isAnonymous && prayerRequest.authorId ? `/profile/${prayerRequest.authorId}` : '#';
  const isClickable = !prayerRequest.isAnonymous && prayerRequest.authorId;
  const initials = (prayerRequest.authorFirstName?.charAt(0) || '') + (prayerRequest.authorLastName?.charAt(0) || '');

  useEffect(() => {
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
  }, [prayerRequest.content]);

  // Back button handling
  useEffect(() => {
    const handlePopState = () => {
      if (showFullText) setShowFullText(false);
    };
    if (showFullText) {
      window.history.pushState({ prayerPopup: prayerRequest.id }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showFullText, prayerRequest.id]);

  const handlePray = () => {
    if (!user || !firestore || hasPrayed || isAuthor) return;
    setIsPraying(true);
    
    const requestRef = doc(firestore, 'prayerRequests', prayerRequest.id);
    const updatePayload = { usersWhoPrayed: arrayUnion(user.uid) };

    updateDoc(requestRef, updatePayload)
        .then(() => {
            toast({ title: "Thank You!", description: "Thank you for praying." });
        })
        .catch(() => {
            const permissionError = new FirestorePermissionError({
              path: requestRef.path,
              operation: 'update',
              requestResourceData: { usersWhoPrayed: `(arrayUnion: ${user.uid})` },
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsPraying(false);
        });
  };

  const fullTextContent = (
    <ScrollArea className={cn("pr-4", isMobile ? "h-full" : "max-h-[60vh]")}>
      <div className="text-base text-muted-foreground whitespace-pre-wrap leading-relaxed pb-6 text-left text-left">
        {prayerRequest.content}
      </div>
    </ScrollArea>
  );

  return (
    <>
      <div className={cn(
        "flex flex-col h-full w-full overflow-hidden transition-all duration-300 scroll-mt-48 rounded-none sm:rounded-[2rem] border border-border border-t-4 border-t-amber-500/20 shadow-none bg-card/50 backdrop-blur-sm text-left"
      )}>
        <CardHeader className="flex flex-row items-start justify-between gap-4 p-4 sm:p-6 text-left">
            <div className="flex items-center gap-3 min-w-0 flex-1 text-left text-left">
                {prayerRequest.isAnonymous ? (
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border shadow-sm">
                        <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                ) : (
                    <LiveAuthorAvatar 
                        userId={prayerRequest.authorId!} 
                        fallbackInitials={initials} 
                        className="h-10 w-10 sm:h-12 sm:w-12 border shadow-sm"
                    />
                )}
                <div className="min-w-0 flex-1 text-left text-left">
                     <Link href={profileLink} onClick={(e) => { if (!isClickable) e.preventDefault(); e.stopPropagation(); }} className={cn(!isClickable && 'pointer-events-none')}>
                        <CardTitle className={cn("text-base sm:text-lg font-bold text-left", isClickable && "hover:underline")}>{authorName}</CardTitle>
                    </Link>
                    <CardDescription className="text-[10px] sm:text-xs mt-1 text-left text-left">
                        {displayDate}
                    </CardDescription>
                    <div className="mt-1.5 text-left text-left">
                        <Badge variant="outline" className="w-fit text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 h-auto bg-background/50 text-left text-left"> {prayerRequest.category}</Badge>
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-grow py-0 px-4 sm:px-6 text-left text-left">
          <div className="text-sm sm:text-base text-muted-foreground whitespace-pre-wrap text-left text-left">
            <div ref={contentRef} className="line-clamp-4 leading-relaxed text-left text-left">
              {prayerRequest.content}
            </div>
            {isTruncated && !isAuthor && (
              <Button
                variant="link"
                className="p-0 h-auto text-sm text-primary font-bold mt-2 text-left text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullText(true);
                }}
              >
                Read Full Request
              </Button>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-4 flex justify-between items-center mt-auto p-4 sm:p-6 border-t border-dashed mt-4 text-left text-left">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-sm text-muted-foreground font-medium text-left text-left">
              <Users className="h-4 w-4 text-primary text-left text-left" />
              <span className="text-left"> {prayerCount} believers praying</span>
          </div>
          {isAuthor ? (
            <div className="flex items-center gap-2 text-left text-left">
                {!isAnswered ? (
                    <Button onClick={onAnswerPrayer} size="sm" className="font-bold h-8 px-3 text-left">
                        <Award className="mr-2 h-4 w-4 text-left text-left" />
                        Answered
                    </Button>
                ) : prayerRequest.answeredTestimonyId ? (
                    <Link href={`/dashboard/testimonies#${prayerRequest.answeredTestimonyId}`}>
                        <Badge variant="secondary" className="flex items-center gap-2 py-1 px-2 border-green-500 text-green-600 dark:text-green-400 cursor-pointer hover:bg-green-500/10 h-8 text-left">
                            <Award className="h-4 w-4 text-left" />
                            <span className="font-bold uppercase tracking-tighter text-[10px] text-left">Answered</span>
                        </Badge>
                    </Link>
                ) : (
                   <Button onClick={onAnswerPrayer} size="sm" className="font-bold h-8 px-3 text-left">
                        <Newspaper className="mr-2 h-4 w-4 text-left text-left" />
                        Testify
                    </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-left text-left" onClick={onEdit}>
                    <Edit className="h-4 w-4 text-left text-left" />
                    <span className="sr-only text-left">Edit</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive text-left" onClick={onDelete}>
                    <Trash2 className="h-4 w-4 text-left text-left" />
                    <span className="sr-only text-left">Delete</span>
                </Button>
            </div>
          ) : isAnswered && prayerRequest.answeredTestimonyId ? (
            <Link href={`/dashboard/testimonies#${prayerRequest.answeredTestimonyId}`}>
                <Badge variant="secondary" className="flex items-center gap-2 py-1 px-2 border-green-500 text-green-600 dark:text-green-400 cursor-pointer hover:bg-green-500/10 h-8 text-left">
                    <Award className="h-4 w-4 text-left" />
                    <span className="font-bold uppercase tracking-tighter text-[10px] text-left">Answered</span>
                </Badge>
            </Link>
          ) : isAnswered ? (
            <Badge variant="secondary" className="flex items-center gap-2 py-1 px-2 border-green-500 text-green-600 dark:text-green-400 h-8 text-left">
                <Award className="h-4 w-4 text-left" />
                <span className="font-bold uppercase tracking-tighter text-[10px] text-left">Answered</span>
            </Badge>
          ) : (
              <Button onClick={handlePray} disabled={hasPrayed || isPraying || !user} className="font-bold shadow-md transition-all active:scale-95 h-9 text-left">
                  {isPraying ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left" /> : <HandHeart className={cn("mr-2 h-4 w-4 text-left", hasPrayed && "fill-current")} />}
                  {hasPrayed ? 'You Prayed' : 'I Will Pray'}
              </Button>
          )}
        </CardFooter>
      </div>

      {mounted && (
        <>
          {isMobile ? (
            <Drawer open={showFullText} onOpenChange={setShowFullText}>
              <DrawerContent className="h-[80dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                <div className="p-8 border-b shrink-0 bg-muted/20 text-left text-left">
                  <DrawerHeader className="text-left text-left text-left">
                    <DrawerTitle className="text-2xl font-black font-headline text-left text-left">Prayer Request from {authorName}</DrawerTitle>
                    <DrawerDescription className="text-sm font-medium text-left text-left">{displayDate}</DrawerDescription>
                  </DrawerHeader>
                </div>
                <div className="flex-grow min-h-0 p-8 overflow-y-auto text-left text-left">
                  {fullTextContent}
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={showFullText} onOpenChange={setShowFullText}>
              <DialogContent className="sm:max-w-2xl rounded-3xl overflow-hidden p-0 text-left text-left">
                <div className="p-8 border-b bg-muted/10 text-left text-left text-left">
                  <DialogHeader className="text-left text-left text-left">
                    <DialogTitle className="text-2xl font-black font-headline text-left text-left">Prayer Request from {authorName}</DialogTitle>
                    <DialogDescription className="text-sm font-medium text-left text-left">{displayDate}</DialogDescription>
                  </DialogHeader>
                </div>
                <div className="p-8 text-left text-left text-left">
                    {fullTextContent}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
    </>
  );
});
PrayerRequestCard.displayName = "PrayerRequestCard";
