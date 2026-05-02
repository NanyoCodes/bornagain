
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
import { Loader2, LocateFixed, Video, Map as MapIcon, AlertTriangle } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

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

function PrivateLocationMap({ form, markerPosition }: { form: any, markerPosition: google.maps.LatLngLiteral | null }) {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    const handleMapClick = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            form.setValue('latitude', e.latLng.lat(), { shouldDirty: true });
            form.setValue('longitude', e.latLng.lng(), { shouldDirty: true });
        }
    };

    const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            form.setValue('latitude', e.latLng.lat(), { shouldDirty: true });
            form.setValue('longitude', e.latLng.lng(), { shouldDirty: true });
        }
    };

    if (loadError) return <div className="h-60 w-full bg-muted/50 rounded-md flex items-center justify-center border-2 border-dashed"><p className="text-xs text-muted-foreground">Map Error</p></div>;
    if (!isLoaded) return <Skeleton className="h-60 w-full mt-2" />;

    return (
        <div className="h-60 w-full rounded-md overflow-hidden mt-2 border">
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
    );
}


export function EditProfileModal({ userProfile, onClose }: EditProfileModalProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  
  const handleGeolocate = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                form.setValue('latitude', position.coords.latitude, { shouldDirty: true });
                form.setValue('longitude', position.coords.longitude, { shouldDirty: true });
                toast({ title: 'Location Updated', description: 'Your private location pin has been set to your current position.' });
            },
            () => {
                toast({ variant: 'destructive', title: 'Geolocation Failed' });
            }
        );
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore || !auth.currentUser) {
      toast({ variant: 'destructive', title: 'Firebase not ready' });
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
      
      await updateDoc(doc(firestore, 'users', user.uid), firestoreUpdatePayload);
      await authUpdatePromise;
      
      toast({ title: "Profile Updated" });
      onClose();

    } catch (error: any) {
         toast({ variant: 'destructive', title: "Update Failed", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCreateMeet = () => {
    window.open('https://meet.google.com/new', '_blank');
  };

  const MapPlaceholder = () => (
    <div className="h-60 w-full rounded-md bg-muted/30 border-2 border-dashed flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <MapIcon className="h-6 w-6 text-primary opacity-50" />
        </div>
    </div>
  );

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
                  <Textarea placeholder="Share your personal testimony..." className="resize-none text-base" {...field} />
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
                    Public city and private location pin.
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0 space-y-4">
                <div>
                  <Label>Location Search</Label>
                  <LocationProfileInput form={form} />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-xs">Private Location Pin</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={handleGeolocate} className="h-7 text-[10px]">
                          <LocateFixed className="mr-1 h-3 w-3" />
                          Set to Current
                      </Button>
                    </div>
                    {!GOOGLE_MAPS_API_KEY ? (
                        <div className="space-y-2">
                            <Alert variant="destructive" className="py-2 px-3">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle className="text-xs font-bold">API Key Missing</AlertTitle>
                            </Alert>
                            <MapPlaceholder />
                        </div>
                    ) : (
                        <PrivateLocationMap form={form} markerPosition={markerPosition} />
                    )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">City (Public)</FormLabel>
                        <FormControl><Input placeholder="e.g., Nairobi" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="state" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">State (Public)</FormLabel>
                        <FormControl><Input placeholder="e.g., California" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Country (Public)</FormLabel>
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
                <FormLabel>Default Meeting Link</FormLabel>
                <FormControl>
                  <Input placeholder="https://meet.google.com/..." {...field} value={field.value ?? ""} className="text-base" />
                </FormControl>
                <Button type="button" variant="outline" size="sm" onClick={handleCreateMeet} className="mt-1">
                  <Video className="mr-2 h-4 w-4" />
                  New Meet
                </Button>
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
