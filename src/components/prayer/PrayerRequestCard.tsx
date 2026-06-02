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
import { HandHeart, Users, Trash2, Loader2, User, Award, Newspaper, Edit } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";

function LiveAuthorAvatar({ userId, fallbackInitials, className }: { userId: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userRef = React.useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const photoURL = profile?.photoURL;
    
    return (
        <Avatar className={className}>
            <AvatarImage src={photoURL} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">{fallbackInitials || 'U'}</AvatarFallback>
        </Avatar>
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
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

  const isAuthor = user?.uid === prayerRequest.authorId;
  const isAnswered = prayerRequest.status === 'answered';
  const usersWhoPrayed = prayerRequest.usersWhoPrayed || [];
  const prayerCount = usersWhoPrayed.length;
  const hasPrayed = useMemo(() => user ? usersWhoPrayed.includes(user.uid) : false, [user, usersWhoPrayed]);

  const displayDate = useMemo(() => {
    const createdAtDate = safeToDate(prayerRequest.createdAt);
    return createdAtDate ? "Shared " + format(createdAtDate, "PPP 'at' p") : 'Shared recently';
  }, [prayerRequest.createdAt]);

  const authorName = prayerRequest.isAnonymous ? 'Confidential Request' : `${prayerRequest.authorFirstName || ''} ${prayerRequest.authorLastName || ''}`.trim();
  const profileLink = !prayerRequest.isAnonymous && prayerRequest.authorId ? `/dashboard/profile/${prayerRequest.authorId}` : '#';
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
      <div className="text-base text-muted-foreground whitespace-pre-wrap leading-relaxed pb-6 text-balance">
        {prayerRequest.content}
      </div>
    </ScrollArea>
  );

  return (
    <>
      <Card className="flex flex-col h-full w-full overflow-hidden transition-all duration-300 scroll-mt-20 rounded-none sm:rounded-xl border-x-0 sm:border-x border-t-0 border-b-2 sm:border-b shadow-none bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4 p-4 sm:p-6">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <Dialog>
                  <DialogTrigger asChild onClick={(e) => e.stopPropagation()} disabled={prayerRequest.isAnonymous || !prayerRequest.authorId}>
                      <div className="relative cursor-pointer hover:opacity-90 transition-opacity active:scale-95">
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
                      </div>
                  </DialogTrigger>
                  {!prayerRequest.isAnonymous && prayerRequest.authorId && (
                      <DialogContent className="p-0 bg-transparent border-0 w-auto max-w-lg overflow-hidden rounded-3xl" onClick={(e) => {e.stopPropagation()}}>
                          <DialogHeader className="sr-only">
                            <DialogTitle>Profile photo of {authorName}</DialogTitle>
                            <DialogDescription>A larger view of the user's profile photo.</DialogDescription>
                          </DialogHeader>
                          <div className="relative">
                            <LiveAuthorAvatar 
                                userId={prayerRequest.authorId} 
                                fallbackInitials={initials} 
                                className="h-[300px] w-[300px] sm:h-[450px] sm:w-[450px] rounded-3xl"
                            />
                          </div>
                      </DialogContent>
                  )}
                </Dialog>
                <div className="min-w-0 flex-1">
                     <Link href={profileLink} onClick={(e) => { if (!isClickable) e.preventDefault(); e.stopPropagation(); }} className={cn(!isClickable && 'pointer-events-none')}>
                        <CardTitle className={cn("text-lg font-bold", isClickable && "hover:underline")}>{authorName}</CardTitle>
                    </Link>
                    <CardDescription className="text-sm mt-1">
                        {displayDate}
                    </CardDescription>
                    <div className="mt-2">
                        <Badge variant="outline" className="w-fit text-xs uppercase tracking-widest px-2 py-0.5 h-auto bg-background/50">{prayerRequest.category}</Badge>
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-grow py-0 px-4 sm:px-6">
          <div className="text-sm text-muted-foreground whitespace-pre-wrap text-balance">
            <p ref={contentRef} className="line-clamp-4 text-sm leading-relaxed">
              {prayerRequest.content}
            </p>
            {isTruncated && !isAuthor && (
              <Button
                variant="link"
                className="p-0 h-auto text-sm text-primary font-bold mt-2"
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
        <CardFooter className="pt-4 flex justify-between items-center mt-auto p-4 sm:p-6">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
              <Users className="h-4 w-4 text-primary" />
              <span>{prayerCount} believers praying</span>
          </div>
          {isAuthor ? (
            <div className="flex items-center gap-2">
                {!isAnswered ? (
                    <Button onClick={onAnswerPrayer} size="sm" className="font-bold">
                        <Award className="mr-2 h-4 w-4" />
                        Answered
                    </Button>
                ) : prayerRequest.answeredTestimonyId ? (
                    <Link href={`/dashboard/testimonies#${prayerRequest.answeredTestimonyId}`}>
                        <Badge variant="secondary" className="flex items-center gap-2 py-1 px-2 border-green-500 text-green-600 dark:text-green-400 cursor-pointer hover:bg-green-500/10 h-8">
                            <Award className="h-4 w-4" />
                            <span className="font-bold uppercase tracking-tighter text-[10px]">Prayer Answered</span>
                        </Badge>
                    </Link>
                ) : (
                   <Button onClick={onAnswerPrayer} size="sm" className="font-bold">
                        <Newspaper className="mr-2 h-4 w-4" />
                        Testify
                    </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                </Button>
            </div>
          ) : isAnswered && prayerRequest.answeredTestimonyId ? (
            <Link href={`/dashboard/testimonies#${prayerRequest.answeredTestimonyId}`}>
                <Badge variant="secondary" className="flex items-center gap-2 py-1 px-2 border-green-500 text-green-600 dark:text-green-400 cursor-pointer hover:bg-green-500/10 h-8">
                    <Award className="h-4 w-4" />
                    <span className="font-bold uppercase tracking-tighter text-[10px]">Prayer Answered</span>
                </Badge>
            </Link>
          ) : isAnswered ? (
            <Badge variant="secondary" className="flex items-center gap-2 py-1 px-2 border-green-500 text-green-600 dark:text-green-400 h-8">
                <Award className="h-4 w-4" />
                <span className="font-bold uppercase tracking-tighter text-[10px]">Answered</span>
            </Badge>
          ) : (
              <Button onClick={handlePray} disabled={hasPrayed || isPraying || !user} className="font-bold shadow-md transition-transform active:scale-95">
                  {isPraying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HandHeart className={cn("mr-2 h-4 w-4", hasPrayed && "fill-current")} />}
                  {hasPrayed ? 'You Prayed' : 'I Will Pray'}
              </Button>
          )}
        </CardFooter>
      </Card>

      {mounted && (
        <>
          {isMobile ? (
            <Sheet open={showFullText} onOpenChange={setShowFullText}>
              <SheetContent side="bottom" className="h-[80dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                <div className="p-8 border-b shrink-0 bg-muted/20">
                  <SheetHeader className="text-left">
                    <SheetTitle className="text-2xl font-black font-headline">Prayer Request from {authorName}</SheetTitle>
                    <SheetDescription className="text-sm font-medium">{displayDate}</SheetDescription>
                  </SheetHeader>
                </div>
                <div className="flex-grow min-h-0 p-8 overflow-y-auto">
                  {fullTextContent}
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={showFullText} onOpenChange={setShowFullText}>
              <DialogContent className="sm:max-w-2xl rounded-3xl overflow-hidden p-0">
                <div className="p-8 border-b bg-muted/10">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black font-headline">Prayer Request from {authorName}</DialogTitle>
                    <DialogDescription className="text-sm font-medium">{displayDate}</DialogDescription>
                  </DialogHeader>
                </div>
                <div className="p-8">
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
