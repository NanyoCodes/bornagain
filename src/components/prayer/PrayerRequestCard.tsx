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
import { format, isToday } from "date-fns";
import { HandHeart, Users, Trash2, Loader2 } from "lucide-react";
import { useUser, useFirestore } from "@/firebase";
import { useState, useMemo, memo } from "react";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, arrayUnion, deleteDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const PrayerRequestCard = memo(function PrayerRequestCard({ prayerRequest }: { prayerRequest: PrayerRequest }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isPraying, setIsPraying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isAuthor = user?.uid === prayerRequest.authorId;
  const usersWhoPrayed = prayerRequest.usersWhoPrayed || [];
  const prayerCount = usersWhoPrayed.length;
  const hasPrayed = useMemo(() => user ? usersWhoPrayed.includes(user.uid) : false, [user, usersWhoPrayed]);

  const createdAtDate = prayerRequest.createdAt
    ? new Date(prayerRequest.createdAt.seconds * 1000)
    : new Date();
  
  const displayDate = "Shared " + (isToday(createdAtDate)
      ? format(createdAtDate, 'p')
      : format(createdAtDate, 'PPP'));


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
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsPraying(false);
        });
  }

  const handleDelete = () => {
    if (!isAuthor || !firestore) return;
    setIsDeleting(true);

    const requestRef = doc(firestore, "prayerRequests", prayerRequest.id);
    
    deleteDoc(requestRef)
        .then(() => {
            toast({
                title: "Request Deleted",
                description: "Your prayer request has been removed.",
            });
        })
        .catch(() => {
            const permissionError = new FirestorePermissionError({
              path: requestRef.path,
              operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            // If the component is still mounted (e.g. error occurred)
            setIsDeleting(false);
        });
  };

  return (
    <>
      <Card className="flex flex-col h-full overflow-hidden shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">{prayerRequest.category}</CardTitle>
            <CardDescription className="text-xs mt-1">
              {displayDate}
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0 flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              {prayerCount}
          </Badge>
        </CardHeader>
        <CardContent className="flex-grow py-0">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
            {prayerRequest.content}
          </p>
        </CardContent>
        <CardFooter className="pt-4 flex justify-between items-center mt-auto">
          {isAuthor ? (
            <Button variant="destructive" size="sm" disabled={isDeleting} onClick={() => setIsDeleteDialogOpen(true)}>
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete
            </Button>
          ) : (
              <Button onClick={handlePray} disabled={hasPrayed || isPraying || !user}>
                  {isPraying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HandHeart className={cn("mr-2 h-4 w-4", hasPrayed && "fill-current")} />}
                  {hasPrayed ? 'You Prayed' : 'Pray'}
              </Button>
          )}
        </CardFooter>
      </Card>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your prayer request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
