
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Testimony } from "@/lib/types";
import { format } from "date-fns";
import { Share2, MoreVertical, Edit, Trash2, Loader2, MapPin, HandHeart } from "lucide-react";
import { useUser, useFirestore } from "@/firebase";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { EditTestimonyForm } from "./edit-testimony-form";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";

export const TestimonyCard = React.memo(function TestimonyCard({ testimony, distance, onDelete }: { testimony: Testimony, distance: number | null, onDelete: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSupporting, setIsSupporting] = useState(false);

  const isAuthor = user?.uid === testimony.authorId;
  const authorFullName = `${testimony.authorFirstName} ${testimony.authorLastName}`;
  const profileLink = isAuthor ? "/dashboard/profile" : `/dashboard/profile/${testimony.authorId}`;

  const supporters = testimony.supporters || [];
  const hasSupported = useMemo(() => user ? supporters.includes(user.uid) : false, [user, supporters]);
  
  const displayDate = useMemo(() => {
    const createdAtDate = testimony.createdAt
      ? new Date(testimony.createdAt.seconds * 1000)
      : new Date();
    
    return format(createdAtDate, "PPP 'at' p");
  }, [testimony.createdAt]);
  
  const locationString = [testimony.authorLocation?.city, testimony.authorLocation?.country].filter(Boolean).join(', ');

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

  const handleShare = (platform: "link" | "facebook" | "twitter") => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/dashboard/testimonies` : '';
    const text = `Read this inspiring testimony by ${authorFullName} on Testify!`;
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
      case "link":
        navigator.clipboard.writeText(`${text} ${url}`);
        toast({
          title: "Link Copied!",
          description: "Testimony link copied to your clipboard.",
        });
        break;
    }
  };

  return (
    <>
      <Card className="flex flex-col h-full overflow-hidden shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link href={profileLink} onClick={(e) => e.stopPropagation()}>
              <Avatar>
                <AvatarImage src={testimony.authorAvatarUrl} alt={authorFullName} />
                <AvatarFallback>{testimony.authorFirstName?.charAt(0)}{testimony.authorLastName?.charAt(0)}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={profileLink} onClick={(e) => e.stopPropagation()}>
              <CardTitle className="text-base font-semibold hover:underline">{authorFullName}</CardTitle>
              </Link>
              <CardDescription className="text-xs mt-1">
                  {displayDate}
                  {locationString && ` · ${locationString}`}
              </CardDescription>
              {distance != null && (
                  <CardDescription className="text-xs text-primary font-semibold mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {distance.toFixed(1)} km away
                  </CardDescription>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">{testimony.category}</Badge>
        </CardHeader>
        <CardContent className="flex-grow pt-0">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
            {testimony.content}
          </p>
        </CardContent>
        <CardFooter className="pt-4 flex justify-between items-center mt-auto">
          {testimony.campaignTitle && testimony.campaignId && (
              <div className="text-xs text-muted-foreground mr-auto truncate">
                  From: <Link href={`/dashboard/campaigns/${testimony.campaignId}`} className="font-semibold text-primary hover:underline">{testimony.campaignTitle}</Link>
              </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={handleSupport} disabled={hasSupported || isSupporting || !user || isAuthor} variant="ghost" size="sm" className="flex items-center gap-1.5 text-muted-foreground">
              {isSupporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <HandHeart className={cn("h-4 w-4", hasSupported && "fill-rose-500 text-rose-500")} />
              )}
              <span>{hasSupported ? 'Amen!' : 'Thank you Jesus'}</span>
              {supporters.length > 0 && <span className="text-xs">({supporters.length})</span>}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleShare('link')}><Share2 className="mr-2 h-4 w-4" /><span>Copy Link</span></DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleShare('facebook')}>Share on Facebook</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleShare('twitter')}>Share on Twitter (X)</DropdownMenuItem>
                {isAuthor && <DropdownMenuSeparator />}
                {isAuthor && <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}><Edit className="mr-2 h-4 w-4" /><span>Edit</span></DropdownMenuItem>}
                {isAuthor && <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardFooter>
      </Card>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Testimony</DialogTitle>
            <DialogDescription>
              Make changes to your testimony here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <EditTestimonyForm testimony={testimony} onTestimonyUpdated={() => setIsEditDialogOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});
