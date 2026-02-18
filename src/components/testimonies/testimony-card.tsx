
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
import { MessageCircle, Share2, MoreVertical, Edit, Trash2, Loader2 } from "lucide-react";
import { useUser, useFirestore } from "@/firebase";
import { useState } from "react";
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

export function TestimonyCard({ testimony }: { testimony: Testimony }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAuthor = user?.uid === testimony.authorId;
  const createdAtDate = testimony.createdAt
    ? new Date(testimony.createdAt.seconds * 1000)
    : new Date();

  const handleDelete = async () => {
    if (!isAuthor || !firestore) return;

    setIsDeleting(true);
    try {
      // Delete Firestore document
      await deleteDoc(doc(firestore, "testimonies", testimony.id));

      toast({
        title: "Testimony Deleted",
        description: "Your testimony has been successfully removed.",
      });
    } catch (error) {
      console.error("Error deleting testimony:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the testimony. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <Link href={`/dashboard/profile/${testimony.authorId}`} passHref>
            <Avatar>
              <AvatarImage
                src={testimony.authorAvatarUrl ?? undefined}
                alt={testimony.authorName}
              />
              <AvatarFallback>{testimony.authorName?.charAt(0) ?? 'A'}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1">
            <Link href={`/dashboard/profile/${testimony.authorId}`} passHref>
              <CardTitle className="cursor-pointer hover:underline">{testimony.authorName}</CardTitle>
            </Link>
            <CardDescription>
              {formatDistanceToNow(createdAtDate, { addSuffix: true })}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="hidden sm:inline-flex">{testimony.category}</Badge>
          {isAuthor && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <AlertDialog>
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DialogTrigger asChild>
                            <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                        </DialogTrigger>
                        <DropdownMenuSeparator />
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
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
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground whitespace-pre-wrap">
          {testimony.content}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex gap-4">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="text-muted-foreground">Comment</span>
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
