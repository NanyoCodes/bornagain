
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { useAuth, useFirestore, useUser, useStorage } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import type { UserProfile } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { LocationProfileInput } from "../common/location-profile-input";
import { Label } from "../ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters.").max(50, "Name is too long."),
  lastName: z.string().min(2, "Last name must be at least 2 characters.").max(50, "Name is too long."),
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
  const storage = useStorage();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(userProfile.photoURL || null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: userProfile.firstName || "",
      lastName: userProfile.lastName || "",
      bio: userProfile.bio || "",
      city: userProfile.location?.city || "",
      country: userProfile.location?.country || "",
      phone: userProfile.phone || "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please upload an image smaller than 5MB.'
        });
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
    if (!user || !auth || !firestore) {
      toast({ variant: 'destructive', title: 'Not authenticated or Firebase not ready' });
      return;
    }
    setIsSubmitting(true);

    try {
      let newPhotoURL: string | null = userProfile.photoURL || null;

      if (photoFile && storage) {
        const filePath = `users/${user.uid}/profile.jpg`;
        const fileRef = storageRef(storage, filePath);
        await uploadBytes(fileRef, photoFile);
        newPhotoURL = await getDownloadURL(fileRef);
      }
      
      const displayName = `${values.firstName} ${values.lastName}`;
      
      // Firestore payload always includes all fields for simplicity and robustness
      const firestoreUpdatePayload: Partial<UserProfile> = {
        firstName: values.firstName,
        lastName: values.lastName,
        fullName_lowercase: displayName.toLowerCase(),
        name_tokens: displayName.toLowerCase().split(/\s+/).filter(Boolean),
        bio: values.bio || "",
        location: {
          city: values.city || "",
          country: values.country || "",
          city_lowercase: (values.city || "").toLowerCase(),
          country_lowercase: (values.country || "").toLowerCase(),
        },
        phone: values.phone || "",
        photoURL: newPhotoURL || "",
      };

      // Auth payload only includes fields that have changed
      const authUpdatePayload: { displayName?: string; photoURL?: string } = {};
      if (displayName !== user.displayName) {
        authUpdatePayload.displayName = displayName;
      }
      if (newPhotoURL !== user.photoURL) {
        authUpdatePayload.photoURL = newPhotoURL || "";
      }
      
      const authUpdatePromise = Object.keys(authUpdatePayload).length > 0
        ? updateProfile(user, authUpdatePayload)
        : Promise.resolve();

      const firestoreUpdatePromise = updateDoc(doc(firestore, 'users', user.uid), firestoreUpdatePayload).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: `users/${user.uid}`,
            operation: 'update',
            requestResourceData: firestoreUpdatePayload,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
      });
      
      await Promise.all([authUpdatePromise, firestoreUpdatePromise]);
      
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
      onClose();

    } catch (error: any) {
      console.error("Profile update error:", error);
       if (error.name !== 'FirestorePermissionError') {
         toast({ variant: 'destructive', title: "Update Failed", description: error.message || "Could not update profile." });
       }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={photoPreview || undefined} alt={`${userProfile.firstName} ${userProfile.lastName}`} />
            <AvatarFallback>{userProfile.firstName?.charAt(0)}{userProfile.lastName?.charAt(0)}</AvatarFallback>
          </Avatar>
           <Label htmlFor="photo-upload" className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
              Change Photo
            </Label>
            <Input
              id="photo-upload"
              type="file"
              className="sr-only"
              accept="image/png, image/jpeg, image/gif"
              onChange={handleFileChange}
              disabled={isSubmitting}
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} className="text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} className="text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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

    