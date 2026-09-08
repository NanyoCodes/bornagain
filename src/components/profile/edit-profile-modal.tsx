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
import React, { useState, useMemo, useEffect } from "react";
import { Loader2, LocateFixed, Video, Map as MapIcon, Youtube, Plus, Trash2, ExternalLink, Info, MessageSquare, Briefcase, User, Globe } from "lucide-react";
import { useUser, useFirestore, useAuth } from "@/firebase";
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import type { UserProfile } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { LocationProfileInput } from "../common/location-profile-input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ImageUpload } from "../common/image-upload";
import { useJsApiLoader, GoogleMap, MarkerF } from '@react-google-maps/api';
import { Skeleton } from "../ui/skeleton";
import { Card, CardContent } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Country, State } from 'country-state-city';
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { cn, safeToDate } from "@/lib/utils";

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
  personalMessage: z.string().max(150, "Personal message is too long.").optional(),
  maritalStatus: z.string().optional(),
  workStatus: z.string().optional(),
  organizationName: z.string().max(100, "Name is too long.").optional(),
  roleInOrganization: z.string().max(100, "Role is too long.").optional(),
  videoTestimonies: z.array(videoSchema).default([]),
  dateOfBirth: z.date().optional().nullable(),
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

    if (loadError) return <div className="h-60 w-full bg-muted/50 rounded-md flex items-center justify-center border-2 border-dashed"><p className="text-xs text-muted-foreground text-left">Map Error</p></div>;
    if (!isLoaded) return <Skeleton className="h-60 w-full mt-2" />;

    return (
        <div className="h-60 w-full rounded-md overflow-hidden mt-2 border text-left text-left">
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
    return userProfile.videoTestimonies || [];
  }, [userProfile.videoTestimonies]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: userProfile.firstName || "",
      lastName: userProfile.lastName || "",
      photoURL: userProfile.photoURL || "",
      bio: userProfile.bio || "",
      personalMessage: userProfile.personalMessage || "",
      maritalStatus: userProfile.maritalStatus || "",
      workStatus: userProfile.workStatus || "",
      organizationName: userProfile.organizationName || "",
      roleInOrganization: userProfile.roleInOrganization || "",
      videoTestimonies: initialVideos,
      dateOfBirth: safeToDate(userProfile.dateOfBirth) || null,
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
  const watchedWorkStatus = useWatch({ control: form.control, name: "workStatus" });

  const organizationLabel = useMemo(() => {
      switch(watchedWorkStatus) {
          case 'Employed': return 'Company Name';
          case 'Business Owner': return 'Business Name';
          case 'Student': return 'School / University';
          case 'Self-Employed': return 'Organization / Project Name';
          default: return 'Organization Name';
      }
  }, [watchedWorkStatus]);

  const showOrganizationField = useMemo(() => {
      return ['Employed', 'Business Owner', 'Student', 'Self-Employed', 'Other'].includes(watchedWorkStatus || '');
  }, [watchedWorkStatus]);

  const selectedCountry = useMemo(() => 
    countriesList.find(c => c.name === watchedCountryName), 
    [countriesList, watchedCountryName]
  );

  const statesList = useMemo(() => 
    selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : [], 
    [selectedCountry]
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
                toast({ title: 'Location Updated', description: 'Your private location pin has been set.' });
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
    const authorLocation = {
      city: values.city || "",
      state: values.state || "",
      country: values.country || "",
      city_lowercase: (values.city || "").toLowerCase(),
      state_lowercase: (values.state || "").toLowerCase(),
      country_lowercase: (values.country || "").toLowerCase(),
      latitude: values.latitude ?? null,
      longitude: values.longitude ?? null,
    };

    const firestoreUpdatePayload = {
        firstName: values.firstName,
        lastName: values.lastName,
        fullName_lowercase: displayName.toLowerCase(),
        name_tokens: displayName.toLowerCase().split(/\s+/).filter(Boolean),
        bio: values.bio || "",
        personalMessage: values.personalMessage || "",
        maritalStatus: values.maritalStatus || "",
        workStatus: values.workStatus || "",
        organizationName: values.organizationName || "",
        roleInOrganization: values.roleInOrganization || "",
        videoTestimonies: values.videoTestimonies,
        dateOfBirth: values.dateOfBirth || null,
        location: authorLocation,
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

      const batch = writeBatch(firestore);
      const syncUrl = values.photoURL || ""; 

      const testimoniesSnap = await getDocs(query(collection(firestore, 'testimonies'), where('authorId', '==', user.uid)));
      testimoniesSnap.forEach(tDoc => {
          batch.update(tDoc.ref, { 
              authorAvatarUrl: syncUrl,
              authorLocation: {
                  city: authorLocation.city || null,
                  country: authorLocation.country || null,
                  latitude: authorLocation.latitude ?? null,
                  longitude: authorLocation.longitude ?? null,
              }
          });
      });

      const prayersSnap = await getDocs(query(collection(firestore, 'prayerRequests'), where('authorId', '==', user.uid)));
      prayersSnap.forEach(pDoc => {
          batch.update(pDoc.ref, { authorAvatarUrl: syncUrl });
      });

      const fellowshipsSnap = await getDocs(query(collection(firestore, 'fellowships'), where('organizerId', '==', user.uid)));
      fellowshipsSnap.forEach(fDoc => {
          batch.update(fDoc.ref, { organizerPhotoURL: syncUrl });
      });

      const chatsSnap = await getDocs(query(collection(firestore, 'chats'), where('participantIds', 'array-contains', user.uid)));
      chatsSnap.forEach(cDoc => {
          batch.update(cDoc.ref, {
              [`participantInfo.${user.uid}.photoURL`]: syncUrl
          });
      });

      await batch.commit().catch(err => {
          console.error("Denormalized sync warning:", err);
      });
      
      toast({ title: "Profile Updated", description: "Your global Kingdom identity has been updated." });
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
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-left">
            <MapIcon className="h-6 w-6 text-primary opacity-50 text-left" />
        </div>
    </div>
  );

  return (
    <div className="text-left text-left">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 text-left">
           <FormField
                control={form.control}
                name="photoURL"
                render={({ field }) => (
                    <FormItem className="flex flex-col items-center py-4 text-left">
                        <FormControl className="text-left text-left">
                            <ImageUpload
                                initialImageUrl={field.value}
                                onUploadComplete={(url) => field.onChange(url)}
                                storagePath="profile-pictures"
                                cropAspect={1}
                                circularCrop={true}
                            />
                        </FormControl>
                        <FormMessage className="text-left text-left" />
                    </FormItem>
                )}
            />
          <div className="grid grid-cols-2 gap-4 text-left">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className="text-left">
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left text-left">First Name</FormLabel>
                  <FormControl className="text-left text-left">
                    <Input placeholder="John" {...field} value={field.value ?? ''} className="text-base h-11 text-left text-left" />
                  </FormControl>
                  <FormMessage className="text-left text-left" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem className="text-left">
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left text-left">Last Name</FormLabel>
                  <FormControl className="text-left text-left">
                    <Input placeholder="Doe" {...field} value={field.value ?? ''} className="text-base h-11 text-left text-left" />
                  </FormControl>
                  <FormMessage className="text-left text-left" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="personalMessage"
            render={({ field }) => (
              <FormItem className="text-left">
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 text-left">
                  <MessageSquare className="h-3.5 w-3.5 text-left text-left" />
                  Message to the World
                </FormLabel>
                <FormControl className="text-left text-left text-left text-left">
                  <Input placeholder="e.g., Jesus is Lord of all!" {...field} value={field.value ?? ''} className="text-base h-11 font-medium text-left text-left" />
                </FormControl>
                <FormDescription className="text-[10px] text-left">A prominent short message shown at the top of your profile.</FormDescription>
                <FormMessage className="text-left text-left" />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem className="text-left">
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left text-left text-left text-left">Relationship Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl className="text-left text-left text-left text-left">
                        <SelectTrigger className="h-11 rounded-xl text-base text-left text-left text-left text-left">
                          <SelectValue placeholder="Select Status" className="text-left text-left text-left text-left" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="text-left text-left text-left text-left">
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Engaged">Engaged</SelectItem>
                        <SelectItem value="Separated">Separated</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-left text-left text-left text-left" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="workStatus"
                render={({ field }) => (
                  <FormItem className="text-left">
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left text-left text-left">Work Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl className="text-left text-left text-left">
                        <SelectTrigger className="h-11 rounded-xl text-base text-left text-left text-left">
                          <SelectValue placeholder="Select Status" className="text-left text-left text-left" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="text-left">
                        <SelectItem value="Employed">Employed</SelectItem>
                        <SelectItem value="Self-Employed">Self-Employed</SelectItem>
                        <SelectItem value="Business Owner">Business Owner</SelectItem>
                        <SelectItem value="Unemployed">Unemployed</SelectItem>
                        <SelectItem value="Student">Student</SelectItem>
                        <SelectItem value="Retired">Retired</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-left text-left text-left" />
                  </FormItem>
                )}
              />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                    <FormItem className="text-left">
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left text-left text-left">Date of Birth</FormLabel>
                        <FormControl className="text-left text-left text-left">
                            <Input 
                                type="date"
                                value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        const [year, month, day] = e.target.value.split('-').map(Number);
                                        field.onChange(new Date(year, month - 1, day));
                                    } else {
                                        field.onChange(null);
                                    }
                                }}
                                className="h-11 rounded-xl bg-muted/20 border-none shadow-inner text-base text-left text-left text-left"
                                max={format(new Date(), "yyyy-MM-dd")}
                            />
                        </FormControl>
                        <FormMessage className="text-left text-left text-left" />
                    </FormItem>
                )}
            />
          </div>

          <AnimatePresence>
            {showOrganizationField && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden text-left"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-1 text-left">
                  <FormField
                    control={form.control}
                    name="organizationName"
                    render={({ field }) => (
                      <FormItem className="text-left text-left">
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 text-left text-left text-left">
                          <Briefcase className="h-3.5 w-3.5 text-left text-left" />
                          {organizationLabel}
                        </FormLabel>
                        <FormControl className="text-left text-left text-left">
                          <Input placeholder={`Enter your ${organizationLabel.toLowerCase()}...`} {...field} value={field.value ?? ''} className="text-base h-11 text-left text-left text-left text-left" />
                        </FormControl>
                        <FormMessage className="text-left text-left text-left" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="roleInOrganization"
                    render={({ field }) => (
                      <FormItem className="text-left">
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 text-left">
                          <User className="h-3.5 w-3.5 text-left text-left" />
                          Role / Job Title
                        </FormLabel>
                        <FormControl className="text-left text-left text-left">
                          <Input placeholder="e.g., Manager, Student, Director..." {...field} value={field.value ?? ''} className="text-base h-11 text-left text-left text-left" />
                        </FormControl>
                        <FormMessage className="text-left text-left text-left" />
                      </FormItem>
                    )}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem className="text-left">
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left text-left">ABOUT YOURSELF</FormLabel>
                <FormControl className="text-left text-left text-left">
                  <Textarea placeholder="Share your personal testimony..." className="resize-none text-base min-h-[100px] text-left text-left text-left" {...field} />
                </FormControl>
                <FormMessage className="text-left text-left text-left" />
              </FormItem>
            )}
          />

          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between text-left text-left text-left">
                <FormLabel className="flex items-center gap-2 text-base font-bold text-left text-left text-left">
                    <Youtube className="h-5 w-5 text-red-600 text-left text-left text-left" />
                    Video Testimonies
                </FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ url: '', title: '' })} className="h-8 text-left">
                    <Plus className="mr-1 h-3 w-3 text-left" /> Add Video
                </Button>
            </div>
            
            {fields.length === 0 ? (
                <Card className="bg-primary/5 border-primary/20 border-dashed text-left text-left text-left">
                    <CardContent className="p-6 text-center space-y-4 text-left text-left text-left">
                        <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-left text-left text-left">
                            <Video className="h-6 w-6 text-primary text-left text-left text-left" />
                        </div>
                        <div className="space-y-1 text-left">
                            <h4 className="font-bold text-sm text-center">Share Your Story via Video</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed max-w-[250px] mx-auto text-center text-left">
                                Sharing your journey through video is a powerful way to testify of God's goodness.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 text-left">
                             <Button type="button" size="sm" onClick={handleCreateYoutubeChannel} className="font-bold text-left text-left">
                                <Youtube className="mr-2 h-4 w-4 text-left text-left" />
                                Create YouTube Channel
                                <ExternalLink className="ml-2 h-3 w-3 text-left text-left" />
                            </Button>
                            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 text-center">
                                <Info className="h-3 w-3 text-left text-left" />
                                Record, upload to YouTube, and paste the link here.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3 text-left">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-3 border rounded-xl bg-muted/20 relative group text-left">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border shadow-sm text-destructive hover:text-destructive hover:bg-destructive/10 text-left"
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="h-3.5 w-3.5 text-left" />
                            </Button>
                            <div className="grid gap-3 text-left">
                                <FormField
                                    control={form.control}
                                    name={`videoTestimonies.${index}.title`}
                                    render={({ field }) => (
                                        <FormItem className="space-y-1 text-left">
                                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground text-left text-left">Video Title (Optional)</FormLabel>
                                            <FormControl className="text-left text-left">
                                                <Input placeholder="e.g., My Healing Miracle" {...field} className="h-8 text-xs text-left" />
                                            </FormControl>
                                            <FormMessage className="text-left text-left" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`videoTestimonies.${index}.url`}
                                    render={({ field }) => (
                                        <FormItem className="space-y-1 text-left">
                                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground text-left text-left">YouTube URL</FormLabel>
                                            <FormControl className="text-left text-left text-left">
                                                <Input placeholder="https://www.youtube.com/watch?v=..." {...field} className="h-8 text-xs text-left text-left" />
                                            </FormControl>
                                            <FormMessage className="text-left text-left" />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
         
          <Accordion type="single" collapsible className="w-full border rounded-md text-left">
            <AccordionItem value="item-1" className="border-none text-left">
              <AccordionTrigger className="p-3 hover:no-underline [&[data-state=open]>svg]:rotate-180 text-left">
                <div className="flex flex-col items-start text-left">
                  <Label className="text-base font-bold text-left">Public Location Settings</Label>
                  <p className="text-sm text-muted-foreground font-normal text-left">
                    Set your Country, State, and City.
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0 space-y-4 text-left">
                <div className="text-left text-left">
                  <Label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">Quick Search</Label>
                  <LocationProfileInput form={form} />
                </div>
                
                <div className="space-y-4 pt-2 text-left">
                  <FormField control={form.control} name="country" render={({ field }) => (
                      <FormItem className="text-left text-left text-left">
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left text-left text-left">Country</FormLabel>
                        <Select 
                          onValueChange={(val) => { 
                              field.onChange(val); 
                              form.setValue('state', '', { shouldDirty: true }); 
                              form.setValue('city', '', { shouldDirty: true }); 
                          }} 
                          value={field.value}
                        >
                          <FormControl className="text-left text-left text-left">
                            <SelectTrigger className="text-base h-11 text-left text-left text-left text-left">
                              <SelectValue placeholder="Select Country" className="text-left text-left text-left text-left" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px] overflow-y-auto text-left text-left text-left text-left text-left">
                            {countriesList.map((c) => (
                              <SelectItem key={c.isoCode} value={c.name}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-left text-left text-left" />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-left">
                    <FormField control={form.control} name="state" render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left text-left text-left">State / Region</FormLabel>
                          <Select 
                            onValueChange={(val) => { 
                                field.onChange(val); 
                                form.setValue('city', '', { shouldDirty: true }); 
                            }} 
                            value={field.value}
                            disabled={!watchedCountryName || statesList.length === 0}
                          >
                            <FormControl className="text-left text-left">
                              <SelectTrigger className="text-base h-11 text-left text-left">
                                <SelectValue placeholder={statesList.length === 0 ? "N/A" : "Select State"} className="text-left text-left text-left" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[300px] overflow-y-auto text-left">
                              {statesList.map((s) => (
                                <SelectItem key={s.isoCode + s.name} value={s.name}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-left text-left text-left" />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left text-left text-left">City</FormLabel>
                          <FormControl className="text-left text-left">
                            <Input placeholder="Enter City" {...field} value={field.value ?? ''} className="text-base h-11 text-left text-left text-left text-left" />
                          </FormControl>
                          <FormMessage className="text-left text-left text-left" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator className="my-4 text-left" />

                <div className="text-left">
                    <div className="flex justify-between items-center mb-2 text-left">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left text-left text-left text-left">Private Location Pin (Geosensing)</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={handleGeolocate} className="h-7 text-[10px] font-bold text-left">
                          <LocateFixed className="mr-1 h-3 w-3 text-left text-left" />
                          SET TO CURRENT
                      </Button>
                    </div>
                    {!isValidKey(GOOGLE_MAPS_API_KEY) ? (
                        <MapPlaceholder />
                    ) : (
                        <PrivateLocationMap form={form} markerPosition={markerPosition} />
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2 leading-snug text-left text-left">
                        Your private pin is only used to calculate proximity to local campaigns and testimonies. It is never shared with other users.
                    </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <FormField
            control={form.control}
            name="defaultMeetingLink"
            render={({ field }) => (
              <FormItem className="text-left">
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left text-left">Default Meeting Link</FormLabel>
                <FormControl className="text-left text-left text-left">
                  <Input placeholder="https://meet.google.com/..." {...field} value={field.value ?? ""} className="text-base h-11 text-left text-left text-left" />
                </FormControl>
                <Button type="button" variant="outline" size="sm" onClick={handleCreateMeet} className="mt-1 text-left">
                  <Video className="mr-2 h-4 w-4 text-left" />
                  New Meet
                </Button>
                <FormMessage className="text-left text-left text-left text-left" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem className="text-left">
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left text-left text-left">Phone Number</FormLabel>
                <FormControl className="text-left text-left text-left">
                  <Input placeholder="123 456 7890" {...field} value={field.value ?? ""} className="text-base h-11 text-left text-left text-left" />
                </FormControl>
                <FormMessage className="text-left text-left text-left" />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full h-12 text-lg font-bold text-left" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left" /> : 'Save Changes'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
