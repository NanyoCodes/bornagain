
"use client";

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
import type { PrayerRequest } from "@/lib/types";
import { format } from "date-fns";
import { HandHeart, Users, Trash2, Loader2, User, Award } from "lucide-react";
import { useUser, useFirestore } from "@/firebase";
import { useState, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

export const PrayerRequestCard = memo(function PrayerRequestCard({ prayerRequest, onDelete, onShareAnswer }: { prayerRequest: PrayerRequest, onDelete: () => void, onShareAnswer: (prayer: PrayerRequest) => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isPraying, setIsPraying] = useState(false);

  const isAuthor = user?.uid === prayerRequest.authorId;
  const isAnswered = prayerRequest.status === 'answered';
  const usersWhoPrayed = prayerRequest.usersWhoPrayed || [];
  const prayerCount = usersWhoPrayed.length;
  const hasPrayed = useMemo(() => user ? usersWhoPrayed.includes(user.uid) : false, [user, usersWhoPrayed]);

  const displayDate = useMemo(() => {
    const createdAtDate = prayerRequest.createdAt
      ? new Date(prayerRequest.createdAt.seconds * 1000)
      : new Date();
    
    return "Shared " + format(createdAtDate, "PPP 'at' p");
  }, [prayerRequest.createdAt]);

  const authorName = prayerRequest.isAnonymous ? 'Confidential Request' : `${prayerRequest.authorFirstName || ''} ${prayerRequest.authorLastName || ''}`.trim();
  const profileLink = !prayerRequest.isAnonymous && prayerRequest.authorId ? `/dashboard/profile/${prayerRequest.authorId}` : '#';
  const isClickable = !prayerRequest.isAnonymous && prayerRequest.authorId;


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
  }

  return (
    <>
      <Card className="flex flex-col h-full overflow-hidden shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <Dialog>
                  <DialogTrigger asChild onClick={(e) => e.stopPropagation()} disabled={prayerRequest.isAnonymous || !prayerRequest.authorAvatarUrl}>
                      <Avatar className={cn(!prayerRequest.isAnonymous && prayerRequest.authorAvatarUrl && "cursor-pointer")}>
                          {!prayerRequest.isAnonymous && <AvatarImage src={prayerRequest.authorAvatarUrl} />}
                          <AvatarFallback>
                              {prayerRequest.isAnonymous ? <User className="h-4 w-4" /> : `${prayerRequest.authorFirstName?.charAt(0) || ''}${prayerRequest.authorLastName?.charAt(0) || ''}`}
                          </AvatarFallback>
                      </Avatar>
                  </DialogTrigger>
                  {!prayerRequest.isAnonymous && prayerRequest.authorAvatarUrl && (
                      <DialogContent className="p-0 bg-transparent border-0 w-auto max-w-lg" onClick={(e) => e.stopPropagation()}>
                          <DialogHeader className="sr-only">
                            <DialogTitle>Profile photo of {authorName}</DialogTitle>
                            <DialogDescription>A larger view of the user's profile photo.</DialogDescription>
                          </DialogHeader>
                          <Image src={prayerRequest.authorAvatarUrl} alt={authorName} width={600} height={600} className="rounded-lg object-contain"/>
                      </DialogContent>
                  )}
                </Dialog>
                <div className="min-w-0 flex-1">
                     <Link href={profileLink} onClick={(e) => { if (!isClickable) e.preventDefault(); e.stopPropagation(); }} className={!isClickable ? 'pointer-events-none' : ''}>
                        <CardTitle className={cn("text-base font-semibold", isClickable && "hover:underline")}>{authorName}</CardTitle>
                    </Link>
                    <CardDescription className="text-xs mt-1">
                        {displayDate}
                    </CardDescription>
                </div>
            </div>
            <Badge variant="outline" className="shrink-0">{prayerRequest.category}</Badge>
        </CardHeader>
        <CardContent className="flex-grow py-0">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
            {prayerRequest.content}
          </p>
        </CardContent>
        <CardFooter className="pt-4 flex justify-between items-center mt-auto">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{prayerCount}</span>
          </div>
          {isAnswered ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
                <Award className="h-5 w-5" />
                <span>Answered!</span>
            </div>
          ) : isAuthor ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onShareAnswer(prayerRequest); }}>
                  Share Testimony
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
              <Button onClick={handlePray} disabled={hasPrayed || isPraying || !user}>
                  {isPraying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HandHeart className={cn("mr-2 h-4 w-4", hasPrayed && "fill-current")} />}
                  {hasPrayed ? 'You Prayed' : 'Pray'}
              </Button>
          )}
        </CardFooter>
      </Card>
    </>
  );
});
