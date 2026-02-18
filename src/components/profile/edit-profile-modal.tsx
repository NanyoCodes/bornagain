"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { useStorage } from "@/firebase/provider";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { UserProfile } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";

const formSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name is too long."),
  bio: z.string().max(280, "Bio is too long.").optional(),
});

type EditProfileModalProps = {
  userProfile: UserProfile;
  onClose: () => void;
};

export function EditProfileModal({ userProfile, onClose }: EditProfileModalProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const storage = useStorage();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: userProfile.displayName || "",
      bio: userProfile.bio || "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ variant: "destructive", title: "File too large", description: "Please select an image smaller than 2MB." });
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      return;
    }
    setIsSubmitting(true);

    try {
      let newPhotoURL = userProfile.photoURL;

      if (photoFile) {
        const storageRef = ref(storage, `profile-pictures/${user.uid}`);
        const uploadTask = uploadBytesResumable(storageRef, photoFile);
        
        await uploadTask;
        newPhotoURL = await getDownloadURL(uploadTask.snapshot.ref);
      }
      
      const updates: { displayName?: string, photoURL?: string, bio?: string } = {};
      if (values.displayName !== userProfile.displayName) {
        updates.displayName = values.displayName;
      }
      if (values.bio !== userProfile.bio) {
        updates.bio = values.bio;
      }
      if (newPhotoURL !== userProfile.photoURL) {
        updates.photoURL = newPhotoURL;
      }

      const authUpdates: { displayName?: string, photoURL?: string } = {};
      if(updates.displayName) authUpdates.displayName = updates.displayName;
      if(updates.photoURL) authUpdates.photoURL = updates.photoURL;

      const authUpdatePromise = Object.keys(authUpdates).length > 0 ? updateProfile(user, authUpdates) : Promise.resolve();
      const firestoreUpdatePromise = Object.keys(updates).length > 0 ? updateDoc(doc(firestore, 'users', user.uid), updates) : Promise.resolve();

      await Promise.all([authUpdatePromise, firestoreUpdatePromise]);

      toast({ title: "Profile Updated", description: "Your changes have been saved." });
      onClose();

    } catch (error: any) {
      console.error("Profile update error:", error);
      toast({ variant: 'destructive', title: "Update Failed", description: error.message || "Could not update profile." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
            <FormLabel>Profile Picture</FormLabel>
            <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={photoPreview || userProfile.photoURL || undefined} alt={userProfile.displayName} />
                    <AvatarFallback className="text-3xl">
                        {userProfile.displayName?.charAt(0) || userProfile.email?.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                <Input id="picture" type="file" accept="image/*" onChange={handleFileChange} className="max-w-xs" />
            </div>
        </div>
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="Your Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell us a little about yourself" className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
