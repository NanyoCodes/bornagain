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
import { ToastAction } from "@/components/ui/toast";
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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(userProfile.photoURL || "");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storageError, setStorageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Clean up the object URL when the component unmounts or the preview changes
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

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
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({
            variant: 'destructive',
            title: 'Invalid File Type',
            description: 'Please select an image file.',
        });
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
            variant: 'destructive',
            title: 'File Too Large',
            description: 'Please select an image smaller than 5MB.',
        });
        return;
    }

    setUploadFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    form.setValue('photoURL', URL.createObjectURL(file), { shouldDirty: true });
    setStorageError(null);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore || !auth.currentUser) {
      toast({ variant: 'destructive', title: 'Not authenticated or Firebase not ready' });
      return;
    }
    setIsSubmitting(true);
    setStorageError(null);

    let finalPhotoUrl = userProfile.photoURL || "";

    if (uploadFile) {
        if (!storage) {
            toast({ variant: 'destructive', title: 'Storage service not available.'});
            setIsSubmitting(false);
            return;
        }
        const storageRef = ref(storage, `profile-pictures/${user.uid}/profile-photo`);
        const uploadTask = uploadBytesResumable(storageRef, uploadFile);

        try {
            finalPhotoUrl = await new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(progress);
                    },
                    (error) => {
                        reject(error);
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadURL);
                    }
                );
            });
        } catch (error) {
            const storageErr = error as FirebaseStorageError;
            console.error("Upload failed:", storageErr);
             if (storageErr.code === 'storage/unauthorized' || storageErr.code === 'storage/unknown') {
                setStorageError("You do not have permission to upload files. This is almost always caused by a misconfiguration in your Google Cloud project, not a bug in the code.");
            } else {
                setStorageError(`An unknown storage error occurred: ${storageErr.message}`);
            }
            setIsSubmitting(false);
            return;
        }
    } else {
        finalPhotoUrl = values.photoURL || "";
    }

    try {
      const displayName = `${values.firstName} ${values.lastName}`;
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
      setUploadProgress(0);
      setUploadFile(null);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
           {storageError && (
              <Alert variant="destructive">
                <AlertTitle>Upload Still Not Working?</AlertTitle>
                <AlertDescription>
                    {storageError} If you're having issues, please follow our definitive{' '}
                    <Link href="/docs/storage-cors-guide.md" target="_blank" className="font-bold underline">
                        Troubleshooting Guide
                    </Link>
                    .
                </AlertDescription>
              </Alert>
          )}

          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={photoPreview || undefined} alt={`${form.watch('firstName')} ${form.watch('lastName')}`} />
              <AvatarFallback>{(form.watch('firstName') || '').charAt(0)}{(form.watch('lastName') || '').charAt(0)}</AvatarFallback>
            </Avatar>
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
            <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
            >
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload Photo
            </Button>
            {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full text-center">
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-xs text-muted-foreground mt-1">Uploading...</p>
                </div>
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
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </form>
      </Form>
    </>
  );
}
