
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
import { useState, useRef } from "react";
import type { ChangeEvent } from "react";
import { Loader2, Edit } from "lucide-react";
import { useUser, useFirestore, useAuth, useStorage } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import type { UserProfile } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { LocationProfileInput } from "../common/location-profile-input";
import { Label } from "../ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ToastAction } from "@/components/ui/toast";

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
  const firestore = useFirestore();
  const auth = useAuth();
  const storage = useStorage();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX_FILE_SIZE_MB = 5;
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File Too Large',
          description: `Please select an image smaller than ${MAX_FILE_SIZE_MB}MB.`,
        });
        return;
      }
      setNewPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore || !auth.currentUser) {
      toast({ variant: 'destructive', title: 'Not authenticated or Firebase not ready' });
      return;
    }
    setIsSubmitting(true);

    try {
      let photoURL = userProfile.photoURL || null;

      // 1. Upload photo if a new one is selected
      if (newPhoto) {
        console.log("New photo selected. Starting upload process...");
        const storageRef = ref(storage, `profile-pictures/${user.uid}/profile-photo.jpg`);
        try {
            console.log("Attempting to upload to storage path:", storageRef.fullPath);
            const uploadTask = await uploadBytes(storageRef, newPhoto);
            console.log("Upload successful. Getting download URL...");
            photoURL = await getDownloadURL(uploadTask.ref);
            console.log("Download URL obtained:", photoURL);
        } catch (uploadError: any) {
            console.error("Firebase Storage Upload Error. Raw error object:", uploadError);
            
            let description = "Please check the browser console for more details. The error code might provide a hint.";
            if (uploadError.code === 'storage/unauthorized') {
                description = "Permission denied. This is almost always caused by an incorrect CORS policy or missing Firebase Storage Rules. Please check both in your Firebase console.";
            } else if (uploadError.code === 'storage/object-not-found') {
                description = "The file location could not be found. This might indicate an issue with your Storage bucket setup.";
            }
            
            toast({
                variant: 'destructive',
                title: 'Photo Upload Failed',
                description: description,
                duration: 20000, // Keep toast open longer
                action: (
                  <ToastAction
                    altText="Review Storage Config"
                    onClick={() => window.open(`https://console.cloud.google.com/storage/browser/${storage.app.options.storageBucket}`, '_blank')}
                  >
                    Review Storage Config
                  </ToastAction>
                ),
            });
            
            setIsSubmitting(false);
            return; // Stop the function from proceeding
        }
      }
      
      const displayName = `${values.firstName} ${values.lastName}`;

      // 2. Prepare auth profile update
      const authUpdatePayload: { displayName?: string; photoURL?: string | null } = {};
      if (user.displayName !== displayName) {
        authUpdatePayload.displayName = displayName;
      }
      if (user.photoURL !== photoURL) {
        authUpdatePayload.photoURL = photoURL;
      }
      
      const authUpdatePromise = Object.keys(authUpdatePayload).length > 0 
        ? updateProfile(auth.currentUser, authUpdatePayload) 
        : Promise.resolve();

      // 3. Prepare Firestore document update
      const firestoreUpdatePayload = {
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
        photoURL: photoURL,
      };
      
      const firestoreUpdatePromise = updateDoc(doc(firestore, 'users', user.uid), firestoreUpdatePayload).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: `users/${user.uid}`,
            operation: 'update',
            requestResourceData: firestoreUpdatePayload,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
      });
      
      // 4. Run updates in parallel
      await Promise.all([authUpdatePromise, firestoreUpdatePromise]);
      
      toast({ title: "Profile Updated", description: "Your profile details have been saved." });
      onClose();

    } catch (error: any) {
       console.error("Profile update process failed:", error);
       if (error.name !== 'FirestorePermissionError' && !error.code?.startsWith('storage/')) {
         toast({ variant: 'destructive', title: "Update Failed", description: "Could not update profile details." });
       }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Avatar className="h-24 w-24">
            <AvatarImage src={photoPreview || userProfile.photoURL || undefined} alt={`${userProfile.firstName} ${userProfile.lastName}`} />
            <AvatarFallback>{userProfile.firstName?.charAt(0)}{userProfile.lastName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Edit className="mr-2 h-4 w-4" />
              Change Photo
          </Button>
          <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg"
              className="hidden"
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
          {isSubmitting 
            ? (newPhoto ? 'Uploading...' : 'Saving...') 
            : 'Save Changes'
          }
        </Button>
      </form>
    </Form>
  );
}
