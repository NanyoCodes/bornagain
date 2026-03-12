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
import { useState, useRef, useEffect } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { useUser, useFirestore, useAuth, useStorage } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import type { UserProfile } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { LocationProfileInput } from "../common/location-profile-input";
import { Label } from "../ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ref, uploadBytesResumable, getDownloadURL, type FirebaseStorageError } from "firebase/storage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';
import { Progress } from "../ui/progress";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters.").max(50, "Name is too long."),
  lastName: z.string().min(2, "Last name must be at least 2 characters.").max(50, "Name is too long."),
  photoURL: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storageError, setStorageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: userProfile.firstName || "",
      lastName: userProfile.lastName || "",
      photoURL: userProfile.photoURL || "",
      bio: userProfile.bio || "",
      city: userProfile.location?.city || "",
      country: userProfile.location?.country || "",
      phone: userProfile.phone || "",
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !storage) return;

    if (file.size > 5 * 1024 * 1024) {
      setStorageError("File is too large. Please select an image under 5MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setStorageError("Invalid file type. Please select an image.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setStorageError(null);

    const storageRef = ref(storage, `profile-pictures/${user.uid}/profile-photo.jpg`);
    const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type });

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error: FirebaseStorageError) => {
        setIsUploading(false);
        if (error.code === 'storage/unauthorized') {
            setStorageError("Permission Denied. Please ensure your Firebase Storage rules and CORS configuration are correct.");
        } else {
            setStorageError(error.message);
        }
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          form.setValue('photoURL', downloadURL, { shouldDirty: true });
          setIsUploading(false);
          toast({ title: "Photo Uploaded!", description: "Your new profile photo is ready. Don't forget to save changes." });
        });
      }
    );
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore || !auth.currentUser) {
      toast({ variant: 'destructive', title: 'Not authenticated or Firebase not ready' });
      return;
    }
    setIsSubmitting(true);

    try {
      const displayName = `${values.firstName} ${values.lastName}`;
      const finalPhotoUrl = values.photoURL || "";

      const authUpdatePayload: { displayName?: string; photoURL?: string } = {};
      if (auth.currentUser.displayName !== displayName) { authUpdatePayload.displayName = displayName; }
      if (auth.currentUser.photoURL !== finalPhotoUrl) { authUpdatePayload.photoURL = finalPhotoUrl; }
      
      const authUpdatePromise = Object.keys(authUpdatePayload).length > 0 
        ? updateProfile(auth.currentUser, authUpdatePayload) 
        : Promise.resolve();
      
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
        photoURL: finalPhotoUrl,
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
      
      await Promise.all([authUpdatePromise, firestoreUpdatePromise]);
      
      toast({ title: "Profile Updated", description: "Your profile details have been saved." });
      onClose();

    } catch (error: any) {
       console.error("Profile update process failed:", error);
       if (error.name !== 'FirestorePermissionError') {
         toast({ variant: 'destructive', title: "Update Failed", description: error.message || "Could not update profile details." });
       }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
             <div className="space-y-2 text-center">
                <Label htmlFor="photo-upload">Profile Photo</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={form.watch('photoURL') || undefined} alt={`${form.watch('firstName')} ${form.watch('lastName')}`} />
                    <AvatarFallback>{(form.watch('firstName') || '').charAt(0)}{(form.watch('lastName') || '').charAt(0)}</AvatarFallback>
                  </Avatar>
                   <Button id="photo-upload" type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/png, image/jpeg, image/gif, image/webp"
                  disabled={isUploading}
                />
              </div>

              {isUploading && (
                <div className="w-full px-4">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground mt-1">{Math.round(uploadProgress)}%</p>
                </div>
              )}
              {storageError && (
                 <Alert variant="destructive">
                  <AlertTitle>Upload Error</AlertTitle>
                  <AlertDescription>
                    {storageError}{' '}
                    {storageError.includes("CORS") && (
                      <Link href="/docs/storage-cors-guide.md" className="underline font-semibold" target="_blank">
                        See troubleshooting guide.
                      </Link>
                    )}
                  </AlertDescription>
                </Alert>
              )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} value={field.value ?? ''} className="text-base" />
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
                    <Input placeholder="Doe" {...field} value={field.value ?? ''} className="text-base" />
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
                  <Textarea placeholder="Share your personal testimony to encourage others..." className="resize-none text-base" {...field} value={field.value ?? ''} />
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
          <Button type="submit" className="w-full" disabled={isSubmitting || isUploading}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </form>
      </Form>
    </>
  );
}
