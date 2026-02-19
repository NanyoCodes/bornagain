
"use client";

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
import { formatDistanceToNow } from "date-fns";
import { Share2, MoreVertical, Edit, Trash2, Loader2 } from "lucide-react";
import { useUser, useFirestore } from "@/firebase";
import { useState, useRef, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { doc, deleteDoc } from "firebase/firestore";
import { EditTestimonyForm } from "./edit-testimony-form";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import Image from "next/image";

export function TestimonyCard({ testimony }: { testimony: Testimony }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const contentRef = useRef<HTMLParagraphElement>(null);
  const [isContentTruncated, setIsContentTruncated] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);

  const isAuthor = user?.uid === testimony.authorId;
  const createdAtDate = testimony.createdAt
    ? new Date(testimony.createdAt.seconds * 1000)
    : new Date();

    useEffect(() => {
        const checkTruncation = () => {
          if (contentRef.current) {
            setIsContentTruncated(
              contentRef.current.scrollHeight > contentRef.current.clientHeight
            );
          }
        };
    
        // We need to check after a small delay to ensure rendering is complete
        setTimeout(checkTruncation, 100);
        window.addEventListener('resize', checkTruncation);
    
        return () => window.removeEventListener('resize', checkTruncation);
      }, [testimony.content]);

  const handleDelete = async () => {
    if (!isAuthor || !firestore) return;

    setIsDeleting(true);
    const testimonyRef = doc(firestore, "testimonies", testimony.id);
    try {
      await deleteDoc(testimonyRef);
      toast({
        title: "Testimony Deleted",
        description: "Your testimony has been successfully removed.",
      });
      // Do not set isDeleting to false; the component will unmount.
    } catch (error) {
      console.error("Error deleting testimony:", error);
      const permissionError = new FirestorePermissionError({
          path: testimonyRef.path,
          operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
      setIsDeleting(false);
    }
  };
  
  const handleShare = (platform: "link" | "facebook" | "twitter") => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/dashboard/testimonies` : '';
    const text = `Read this inspiring testimony by ${testimony.authorName} on Testify Global!`;
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
    <Card className="flex flex-col h-full overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <Link href={`/dashboard/profile/${testimony.authorId}`} passHref>
            <Avatar className="h-10 w-10 border shrink-0">
              <AvatarImage
                src={testimony.authorAvatarUrl ?? undefined}
                alt={testimony.authorName}
              />
              <AvatarFallback>{testimony.authorName?.charAt(0) ?? 'A'}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0">
            <Link href={`/dashboard/profile/${testimony.authorId}`} passHref>
              <CardTitle className="cursor-pointer hover:underline text-base font-semibold">{testimony.authorName}</CardTitle>
            </Link>
            <CardDescription className="text-xs mt-1">
              {formatDistanceToNow(createdAtDate, { addSuffix: true })}
            </CardDescription>
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0">{testimony.category}</Badge>
      </CardHeader>
      <CardContent className="flex-grow py-0 space-y-4">
        {testimony.mediaUrl && testimony.mediaType === 'image' && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                <Image src={testimony.mediaUrl} alt="Testimony photo" fill className="object-cover"/>
            </div>
        )}
        <p ref={contentRef} className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
          {testimony.content}
        </p>
         {isContentTruncated && (
            <Dialog open={showFullContent} onOpenChange={setShowFullContent}>
                <DialogTrigger asChild>
                    <Button variant="link" className="p-0 h-auto text-sm -mt-2">Read More</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Testimony by {testimony.authorName}</DialogTitle>
                        <DialogDescription>Category: {testimony.category}</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-4">
                        {testimony.mediaUrl && testimony.mediaType === 'image' && (
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                                <Image src={testimony.mediaUrl} alt="Testimony photo" fill className="object-cover"/>
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{testimony.content}</p>
                    </div>
                </DialogContent>
            </Dialog>
        )}
      </CardContent>
      <CardFooter className="pt-4 flex justify-end mt-auto">
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <AlertDialog>
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
                {isAuthor && <DialogTrigger asChild><DropdownMenuItem><Edit className="mr-2 h-4 w-4" /><span>Edit</span></DropdownMenuItem></DialogTrigger>}
                {isAuthor && <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem></AlertDialogTrigger>}
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your testimony.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
      </CardFooter>
    </Card>
  );
}
