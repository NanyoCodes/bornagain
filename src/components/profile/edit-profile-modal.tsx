
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
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
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Loader2, LocateFixed, Video, Map as MapIcon, Youtube, Plus, Trash2, ExternalLink, Info } from "lucide-react";
import { useUser, useFirestore, useAuth } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
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
import { Card, CardContent } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Country, State, City } from 'country-state-city';

const libraries: ('places')[] = ['places'];
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const isValidKey = (key: string | undefined) => !!(key && key.startsWith('AIza') && key.length > 20);

const fallbackCenter = { lat: 34.0522, lng: -118.2437 };

const videoSchema = z.object({
  url: z.string().url("Please enter a valid YouTube URL."),
  title: z.string().max(100, "Title too long").optional(),
});

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters.").max(50, "Name is too long."),
  lastName: z.string().min(2, "Last name must be at least 2 characters.").max(50, "Name is too long."),
  photoURL: z.string().optional(),
  bio: z.string().max(280, "Bio is too long.").optional(),
  videoTestimonies: z.array(videoSchema).default([]),
  city: z.string().max(100, "City is too long.").optional(),
  state: z.string().max(100, "State is too long.").optional(),
  country: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  phone: z.string().max(50, "Phone number is too long.").optional(),
  defaultMeetingLink: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
});

interface EditProfileModalProps {
  userProfile: UserProfile;
  onClose: () => void;
}

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

  const countriesList = useMemo(() => Country.getAllCountries(), []);

  const initialVideos = useMemo(() => {
    const vids = [...(userProfile.videoTestimonies || [])];
    if (userProfile.videoTestimonyUrl && !vids.some(v => v.url === userProfile.videoTestimonyUrl)) {
        vids.unshift({ url: userProfile.videoTestimonyUrl, title: "My Testimony" });
    }
    return vids;
  }, [userProfile.videoTestimonyUrl, userProfile.videoTestimonies]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: userProfile.firstName || "",
      lastName: userProfile.lastName || "",
      photoURL: userProfile.photoURL || "",
      bio: userProfile.bio || "",
      videoTestimonies: initialVideos,
      city: userProfile.location?.city || "",
      state: userProfile.location?.state || "",
      country: userProfile.location?.country || "",
      latitude: userProfile.location?.latitude ?? null,
      longitude: userProfile.location?.longitude ?? null,
      phone: userProfile.phone || "",
      defaultMeetingLink: userProfile.defaultMeetingLink || "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "videoTestimonies"
  });

  const watchedLat = form.watch('latitude');
  const watchedLng = form.watch('longitude');
  const watchedCountryName = form.watch('country');
  const watchedStateName = form.watch('state');

  const selectedCountry = useMemo(() => 
    countriesList.find(c => c.name === watchedCountryName), 
    [countriesList, watchedCountryName]
  );

  const statesList = useMemo(() => 
    selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : [], 
    [selectedCountry]
  );

  const selectedState = useMemo(() => 
    statesList.find(s => s.name === watchedStateName), 
    [statesList, watchedStateName]
  );

  const citiesList = useMemo(() => 
    (selectedCountry && selectedState) ? City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode) : [], 
    [selectedCountry, selectedState]
  );

  const markerPosition = useMemo(() => {
    if (watchedLat != null && watchedLng != null) {
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
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);

    const displayName = `${values.firstName} ${values.lastName}`;
    const firestoreUpdatePayload = {
        firstName: values.firstName,
        lastName: values.lastName,
        fullName_lowercase: displayName.toLowerCase(),
        name_tokens: displayName.toLowerCase().split(/\s+/).filter(Boolean),
        bio: values.bio || "",
        videoTestimonies: values.videoTestimonies,
        location: {
          city: values.city || "",
          state: values.state || "",
          country: values.country || "",
          city_lowercase: (values.city || "").toLowerCase(),
          state_lowercase: (values.state || "").toLowerCase(),
          country_lowercase: (values.country || "").toLowerCase(),
          latitude: values.latitude ?? null,
          longitude: values.longitude ?? null,
        },
        phone: values.phone || "",
        photoURL: values.photoURL || "",
        defaultMeetingLink: values.defaultMeetingLink || null,
        lastUpdatedAt: serverTimestamp(),
    };

    try {
      const authUpdatePayload: { displayName?: string; photoURL?: string } = {};
      if (auth.currentUser.displayName !== displayName) { authUpdatePayload.displayName = displayName; }
      if (auth.currentUser.photoURL !== (values.photoURL || "")) { authUpdatePayload.photoURL = values.photoURL || ""; }
      
      const authUpdatePromise = Object.keys(authUpdatePayload).length > 0 
        ? updateProfile(auth.currentUser, authUpdatePayload) 
        : Promise.resolve();
      
      await updateDoc(doc(firestore, 'users', user.uid), firestoreUpdatePayload);
      await authUpdatePromise;
      
      toast({ title: "Profile Updated" });
      onClose();

    } catch (error: any) {
         console.error("Profile update failed:", error);
         if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `users/${user.uid}`,
                operation: 'update',
                requestResourceData: firestoreUpdatePayload,
            }, user);
            errorEmitter.emit('permission-error', permissionError);
         } else {
            toast({ variant: 'destructive', title: "Update Failed", description: error.message || "An unexpected error occurred." });
         }
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCreateMeet = () => {
    window.open('https://meet.google.com/new', '_blank');
  };

  const handleCreateYoutubeChannel = () => {
    window.open('https://www.youtube.com/create_channel', '_blank');
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
                <FormLabel className="flex items-center gap-2 text-base font-bold">
                    <Youtube className="h-5 w-5 text-red-600" />
                    Video Testimonies
                </FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ url: '', title: '' })} className="h-8">
                    <Plus className="mr-1 h-3 w-3" /> Add Video
                </Button>
            </div>
            
            {fields.length === 0 ? (
                <Card className="bg-primary/5 border-primary/20 border-dashed">
                    <CardContent className="p-6 text-center space-y-4">
                        <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                            <Video className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-sm">Help Share Your Glory</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed max-w-[250px] mx-auto">
                                Sharing your story through video is a powerful way to testify of God's goodness.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                             <Button type="button" size="sm" onClick={handleCreateYoutubeChannel} className="font-bold">
                                <Youtube className="mr-2 h-4 w-4" />
                                Create YouTube Channel
                                <ExternalLink className="ml-2 h-3 w-3" />
                            </Button>
                            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                                <Info className="h-3 w-3" />
                                Record your video, upload to YouTube, and paste the link here.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-3 border rounded-xl bg-muted/20 relative group">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border shadow-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                            <div className="grid gap-3">
                                <FormField
                                    control={form.control}
                                    name={`videoTestimonies.${index}.title`}
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Video Title (Optional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., My Healing Miracle" {...field} className="h-8 text-xs" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`videoTestimonies.${index}.url`}
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">YouTube URL</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://www.youtube.com/watch?v=..." {...field} className="h-8 text-xs" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground px-1 italic">
                        Link videos where you share your miracles or encounters with Christ.
                    </p>
                </div>
            )}
          </div>
         
          <Accordion type="single" collapsible className="w-full border rounded-md">
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
                  <Label className="mb-2 block">Quick Location Search</Label>
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
                    {!isValidKey(GOOGLE_MAPS_API_KEY) ? (
                        <MapPlaceholder />
                    ) : (
                        <PrivateLocationMap form={form} markerPosition={markerPosition} />
                    )}
                </div>
                
                <div className="space-y-4 pt-2">
                  <FormField control={form.control} name="country" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Country (Public)</FormLabel>
                        <Select 
                          onValueChange={(val) => { 
                              field.onChange(val); 
                              form.setValue('state', '', { shouldDirty: true }); 
                              form.setValue('city', '', { shouldDirty: true }); 
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="text-base h-11">
                              <SelectValue placeholder="Select Country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countriesList.map((c) => (
                              <SelectItem key={c.isoCode} value={c.name}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="state" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State / Region</FormLabel>
                          <Select 
                            onValueChange={(val) => { 
                                field.onChange(val); 
                                form.setValue('city', '', { shouldDirty: true }); 
                            }} 
                            value={field.value}
                            disabled={!watchedCountryName || statesList.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger className="text-base h-11">
                                <SelectValue placeholder={statesList.length === 0 ? "N/A" : "Select State"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {statesList.map((s) => (
                                <SelectItem key={s.isoCode + s.name} value={s.name}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!watchedStateName || citiesList.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger className="text-base h-11">
                                <SelectValue placeholder={citiesList.length === 0 ? "N/A" : "Select City"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {citiesList.map((c) => (
                                <SelectItem key={c.name} value={c.name}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
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
