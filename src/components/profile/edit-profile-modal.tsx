
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
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import type { UserProfile } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { LocationProfileInput } from "../common/location-profile-input";
import { Label } from "../ui/label";

const formSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name is too long."),
  bio: z.string().max(280, "Bio is too long.").optional(),
  city: z.string().max(50, "City is too long.").optional(),
  country: z.string().max(50, "Country is too long.").optional(),
  phone: z.string().max(50, "Phone number is too long.").optional(),
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
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: userProfile.displayName || "",
      bio: userProfile.bio || "",
      city: userProfile.location?.city || "",
      country: userProfile.location?.country || "",
      phone: userProfile.phone || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !auth || !firestore) {
      toast({ variant: 'destructive', title: 'Not authenticated or Firebase not ready' });
      return;
    }
    setIsSubmitting(true);

    try {
      const firestoreUpdatePayload: { [key: string]: any } = {};
      const newLocation = { city: values.city || "", country: values.country || "" };

      // Only add values to payload if they have changed from the initial profile
      if (values.displayName !== userProfile.displayName) {
        firestoreUpdatePayload.displayName = values.displayName;
        firestoreUpdatePayload.displayName_lowercase = values.displayName.toLowerCase();
        firestoreUpdatePayload.displayName_tokens = values.displayName.toLowerCase().split(/\s+/).filter(Boolean);
      }
      if (values.bio !== userProfile.bio) firestoreUpdatePayload.bio = values.bio || "";
      if (newLocation.city !== userProfile.location?.city || newLocation.country !== userProfile.location?.country) {
          firestoreUpdatePayload.location = newLocation;
      }
      if (values.phone !== userProfile.phone) firestoreUpdatePayload.phone = values.phone || "";

      // Only update if there are changes
      if (Object.keys(firestoreUpdatePayload).length > 0) {
        const userDocRef = doc(firestore, 'users', user.uid);
        await updateDoc(userDocRef, firestoreUpdatePayload).catch((serverError) => {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: firestoreUpdatePayload,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError; // Re-throw to be caught by the outer catch
          });
      }

      // Update Firebase Auth profile if display name changed
      if (auth.currentUser && values.displayName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, {
          displayName: values.displayName,
        });
      }
      
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
      onClose();

    } catch (error: any) {
      console.error("Profile update error:", error);
       if (error.name === 'FirestorePermissionError') {
         // This was already handled by the emitter, do nothing.
       } else {
         toast({ variant: 'destructive', title: "Update Failed", description: error.message || "Could not update profile." });
       }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="Your Name" {...field} className="text-base" />
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
                <Textarea placeholder="Share your personal testimony to encourage others..." className="resize-none text-base" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-2">
            <Label>Location Search</Label>
            <LocationProfileInput form={form} />
            <p className="text-sm text-muted-foreground">
                Search for a location to autofill your city and country below.
            </p>
        </div>
         <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
                <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., Nairobi" {...field} value={field.value ?? ""} className="text-base" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., Kenya" {...field} value={field.value ?? ""} className="text-base" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
         </div>
         <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="123 456 7890" {...field} value={field.value ?? ""} className="text-base" />
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
