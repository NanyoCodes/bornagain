
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import React, { useState } from "react";
import { Loader2, LocateFixed, Video } from "lucide-react";
import { useUser, useFirestore, useAuth } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import type { UserProfile } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { LocationProfileInput } from "../common/location-profile-input";
import { Label } from "../ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ImageUpload } from "../common/image-upload";
import { useJsApiLoader, GoogleMap, MarkerF } from '@react-google-maps/api';
import { Skeleton } from "../ui/skeleton";
import { generateGoogleMeetLink } from "@/lib/utils";

const libraries: ('places')[] = ['places'];
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const fallbackCenter = { lat: 34.0522, lng: -118.2437 };

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters.").max(50, "Name is too long."),
  lastName: z.string().min(2, "Last name must be at least 2 characters.").max(50, "Name is too long."),
  photoURL: z.string().optional(),
  bio: z.string().max(280, "Bio is too long.").optional(),
  city: z.string().max(50, "City is too long.").optional(),
  state: z.string().max(50, "State is too long.").optional(),
  country: z.string().max(50, "Country is too long.").optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phone: z.string().max(50, "Phone number is too long.").optional(),
  defaultMeetingLink: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
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
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: userProfile.firstName || "",
      lastName: userProfile.lastName || "",
      photoURL: userProfile.photoURL || "",
      bio: userProfile.bio || "",
      city: userProfile.location?.city || "",
      state: userProfile.location?.state || "",
      country: userProfile.location?.country || "",
      latitude: userProfile.location?.latitude,
      longitude: userProfile.location?.longitude,
      phone: userProfile.phone || "",
      defaultMeetingLink: userProfile.defaultMeetingLink || "",
    },
  });

  const watchedLat = form.watch('latitude');
  const watchedLng = form.watch('longitude');

  const markerPosition = React.useMemo(() => {
    if (watchedLat && watchedLng) {
      return { lat: watchedLat, lng: watchedLng };
    }
    return null;
  }, [watchedLat, watchedLng]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      form.setValue('latitude', lat, { shouldDirty: true });
      form.setValue('longitude', lng, { shouldDirty: true });
    }
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      form.setValue('latitude', lat, { shouldDirty: true });
      form.setValue('longitude', lng, { shouldDirty: true });
    }
  };
  
  const handleGeolocate = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                form.setValue('latitude', lat, { shouldDirty: true });
                form.setValue('longitude', lng, { shouldDirty: true });
                toast({ title: 'Location Updated', description: 'Your private location pin has been set to your current location.' });
            },
            () => {
                toast({
                    variant: 'destructive',
                    title: 'Geolocation Failed',
                    description: 'Could not get your location. Please check your browser permissions.',
                });
            }
        );
    } else {
        toast({
            variant: 'destructive',
            title: 'Geolocation Not Supported',
            description: 'Your browser does not support geolocation.',
        });
    }
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
          state: values.state || "",
          country: values.country || "",
          city_lowercase: (values.city || "").toLowerCase(),
          state_lowercase: (values.state || "").toLowerCase(),
          country_lowercase: (values.country || "").toLowerCase(),
          latitude: values.latitude || null,
          longitude: values.longitude || null,
        },
        phone: values.phone || "",
        photoURL: finalPhotoUrl,
        defaultMeetingLink: values.defaultMeetingLink || null,
      };
      
      const firestoreUpdatePromise = updateDoc(doc(firestore, 'users', user.uid), firestoreUpdatePayload).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: `users/${user.uid}`,
            operation: 'update',
            requestResourceData: firestoreUpdatePayload,
        }, user);
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

  const handleCreateMeet = () => {
    const link = generateGoogleMeetLink();
    form.setValue('defaultMeetingLink', link, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
           <FormField
                control={form.control}
                name="photoURL"
                render={({ field }) => (
                    <FormItem className="flex flex-col items-center py-4">
                        <FormControl>
                            <ImageUpload
                                initialImageUrl={field.value}
                                onUploadComplete={(url) => field.onChange(url)}
                                storagePath="profile-pictures"
                                cropAspect={1}
                                circularCrop={true}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
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
                  <Textarea placeholder="Share your personal testimony to encourage others..." className="resize-none text-base" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
         
          <Accordion type="single" collapsible defaultValue="item-1" className="w-full border rounded-md">
            <AccordionItem value="item-1" className="border-none">
              <AccordionTrigger className="p-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                <div className="flex flex-col items-start text-left">
                  <Label>Location Settings</Label>
                  <p className="text-sm text-muted-foreground font-normal">
                    Set your public city/state and private location pin.
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0 space-y-4">
                <div>
                  <Label>Location Search</Label>
                  <LocationProfileInput form={form} />
                   <p className="text-xs text-muted-foreground mt-2">Search to autofill your public location (city, state, country) and set an initial private pin.</p>
                </div>

                <div>
                    <div className="flex justify-between items-center">
                      <Label>Private Location Pin</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={handleGeolocate}>
                          <LocateFixed className="mr-2 h-4 w-4" />
                          Use Live Location
                      </Button>
                    </div>
                    {loadError ? (
                       null
                    ) : !isLoaded ? (
                        <Skeleton className="h-60 w-full mt-2" />
                    ) : (
                        <div className="h-60 w-full rounded-md overflow-hidden mt-2">
                            <GoogleMap
                                mapContainerClassName="h-full w-full"
                                center={markerPosition || fallbackCenter}
                                zoom={markerPosition ? 12 : 4}
                                onClick={handleMapClick}
                                options={{ streetViewControl: false, mapTypeControl: false }}
                            >
                                {markerPosition && (
                                <MarkerF
                                    position={markerPosition}
                                    draggable={true}
                                    onDragEnd={handleMarkerDragEnd}
                                />
                                )}
                            </GoogleMap>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                        Click or drag the pin on the map to set your precise private location. This is used for nearby features and is not public.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>City (Public)</FormLabel>
                        <FormControl><Input placeholder="e.g., Nairobi" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="state" render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province (Public)</FormLabel>
                        <FormControl><Input placeholder="e.g., California" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country (Public)</FormLabel>
                      <FormControl><Input placeholder="e.g., Kenya" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <FormField
            control={form.control}
            name="defaultMeetingLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Virtual Meeting Link</FormLabel>
                <FormControl>
                  <Input placeholder="https://meet.google.com/xxx-xxxx-xxx" {...field} value={field.value ?? ""} className="text-base" />
                </FormControl>
                <Button type="button" variant="outline" size="sm" onClick={handleCreateMeet} className="mt-1">
                  <Video className="mr-2 h-4 w-4" />
                  Create Google Meet
                </Button>
                <FormDescription>This link will auto-fill when you create a new campaign or fellowship.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

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
