
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
import { useState } from "react";
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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters.").max(50, "Name is too long."),
  lastName: z.string().min(2, "Last name must be at least 2 characters.").max(50, "Name is too long."),
  photoFile: z
    .any()
    .refine((files) => !files || files?.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `Max image size is 5MB.`)
    .refine(
      (files) => !files || files?.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    ).optional(),
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

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
  
  const photoFile = form.watch('photoFile');
  const photoPreview = photoFile?.[0] ? URL.createObjectURL(photoFile[0]) : userProfile.photoURL;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore || !auth.currentUser) {
      toast({ variant: 'destructive', title: 'Not authenticated or Firebase not ready' });
      return;
    }
    setIsSubmitting(true);
    setUploadProgress(null);

    try {
      let photoURL = userProfile.photoURL;
      const photoFile = values.photoFile?.[0];

      // 1. Upload photo if a new one is selected
      if (photoFile && storage) {
        const storageRef = ref(storage, `profile-pictures/${user.uid}/profile-photo.jpg`);
        const metadata = { contentType: photoFile.type };
        const uploadTask = uploadBytesResumable(storageRef, photoFile, metadata);
        
        await new Promise<void>((resolve, reject) => {
            uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error: FirebaseStorageError) => {
                console.error("Upload failed:", error);
                setUploadProgress(null);
                reject(error);
            },
            async () => {
                try {
                    photoURL = await getDownloadURL(uploadTask.snapshot.ref);
                    setUploadProgress(null);
                    resolve();
                } catch (error) {
                    reject(error)
                }
            });
        });
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
        photoURL: photoURL || null,
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
       if (error.code && error.code.startsWith('storage/')) {
         toast({
           variant: 'destructive',
           title: 'Upload Failed: Check Configuration',
           description: 'Your browser is being blocked from uploading. This is almost always a project configuration issue (CORS, Billing, or APIs). Please follow the troubleshooting guide.',
           action: <ToastAction altText="Troubleshoot" onClick={() => window.open('/docs/storage-cors-guide.md', '_blank')}>View Guide</ToastAction>,
           duration: 20000,
         });
       } else if (error.name !== 'FirestorePermissionError') {
         toast({ variant: 'destructive', title: "Update Failed", description: error.message || "Could not update profile details." });
       }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
           <Alert variant="destructive">
            <UploadCloud className="h-4 w-4" />
            <AlertTitle>Upload Still Not Working?</AlertTitle>
            <AlertDescription>
                File uploads require correct Firebase project configuration. If you're having issues, please follow our definitive{' '}
                <a href="/docs/storage-cors-guide.md" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                    Troubleshooting Guide
                </a>.
            </AlertDescription>
           </Alert>
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={photoPreview || undefined} alt={`${form.watch('firstName')} ${form.watch('lastName')}`} />
              <AvatarFallback>{(form.watch('firstName') || '').charAt(0)}{(form.watch('lastName') || '').charAt(0)}</AvatarFallback>
            </Avatar>
             <FormField
                control={form.control}
                name="photoFile"
                render={({ field: { onChange, value, ...fieldProps } }) => (
                    <FormItem className="w-full">
                    <FormLabel>Change Photo</FormLabel>
                    <FormControl>
                        <Input 
                            type="file" 
                            accept="image/png, image/jpeg, image/webp"
                            {...fieldProps}
                            onChange={(e) => onChange(e.target.files)}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
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
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploadProgress !== null ? `Uploading: ${Math.round(uploadProgress)}%` : isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </Form>
    </>
  );
}

    