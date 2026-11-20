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
import { Loader2, LocateFixed, Map as MapIcon, Youtube, Plus, Trash2, ShieldCheck, Sparkles, Building2, User, Briefcase, MessageSquare, Camera, Church, X, Target } from "lucide-react";
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
import { format, differenceInYears } from "date-fns";
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
  accountType: z.enum(['Personal', 'Church', 'Church Department', 'Corporate']),
  firstName: z.string().min(2, "First name must be at least 2 characters.").max(50, "Name is too long."),
  lastName: z.string().min(2, "Last name must be at least 2 characters.").max(50, "Name is too long."),
  photoURL: z.string().min(5, "A profile photo is mandatory to activate your identity."),
  bio: z.string().max(280, "Bio is too long.").optional(),
  personalMessage: z.string().max(150, "Personal message is too long.").optional(),
  maritalStatus: z.string().optional(),
  workStatus: z.string().optional(),
  organizationName: z.string().max(100, "Name is too long.").optional(),
  churchName: z.string().max(100, "Name is too long.").optional(),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountType: userProfile.accountType || 'Personal',
      firstName: userProfile.firstName || "",
      lastName: userProfile.lastName || "",
      photoURL: userProfile.photoURL || "",
      bio: userProfile.bio || "",
      personalMessage: userProfile.personalMessage || "",
      maritalStatus: userProfile.maritalStatus || "",
      workStatus: userProfile.workStatus || "",
      organizationName: userProfile.organizationName || "",
      churchName: userProfile.churchName || "",
      roleInOrganization: userProfile.roleInOrganization || "",
      videoTestimonies: userProfile.videoTestimonies || [],
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

  const watchedLat = form.watch('latitude');
  const watchedLng = form.watch('longitude');
  const watchedCountryName = form.watch('country');
  const watchedWorkStatus = useWatch({ control: form.control, name: "workStatus" });
  const watchedAccountType = useWatch({ control: form.control, name: "accountType" });
  const watchedPhotoURL = useWatch({ control: form.control, name: "photoURL" });

  const isPersonal = watchedAccountType === 'Personal';

  const organizationLabel = useMemo(() => {
      if (watchedAccountType === 'Church') return 'Church Name';
      if (watchedAccountType === 'Church Department') return 'Department Name';
      if (watchedAccountType === 'Corporate') return 'Company Name';
      
      switch(watchedWorkStatus) {
          case 'Employed': return 'Company Name';
          case 'Business Owner': return 'Business Name';
          case 'Student': return 'School / University';
          case 'Self-Employed': return 'Organization / Project Name';
          default: return 'Organization Name';
      }
  }, [watchedWorkStatus, watchedAccountType]);

  const showOrganizationField = useMemo(() => {
      return !isPersonal || ['Employed', 'Business Owner', 'Student', 'Self-Employed', 'Other'].includes(watchedWorkStatus || '');
  }, [watchedWorkStatus, isPersonal]);

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
                toast({ title: 'Location Updated' });
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

    if (!values.photoURL) {
        toast({ variant: 'destructive', title: 'Identity Fail', description: 'A profile photo is mandatory to activate your workforce profile.' });
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
        accountType: values.accountType,
        firstName: values.firstName,
        lastName: values.lastName,
        fullName_lowercase: displayName.toLowerCase(),
        name_tokens: displayName.toLowerCase().split(/\s+/).filter(Boolean),
        email: user.email,
        bio: values.bio || "",
        personalMessage: values.personalMessage || "",
        maritalStatus: isPersonal ? values.maritalStatus || "" : "",
        workStatus: isPersonal ? values.workStatus || "" : "",
        organizationName: values.organizationName || "",
        churchName: values.churchName || "",
        roleInOrganization: values.roleInOrganization || "",
        videoTestimonies: values.videoTestimonies,
        dateOfBirth: isPersonal ? values.dateOfBirth || null : null,
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

      await batch.commit();
      
      toast({ title: "Identity Activated", description: "Your global Kingdom profile is now live." });
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

  return (
    <div className="relative overflow-hidden">
       <div className="absolute inset-0 pointer-events-none opacity-[0.02] flex items-center justify-center overflow-hidden">
          <div className="grid grid-cols-4 gap-12 rotate-12">
              {[...Array(16)].map((_, i) => (
                  <Sparkles key={i} className="h-24 w-24 text-primary" />
              ))}
          </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 relative z-10 text-left">
           <div className="bg-primary/5 p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border-2 border-dashed border-primary/20 flex flex-col items-center text-center space-y-4">
                <FormField
                    control={form.control}
                    name="photoURL"
                    render={({ field }) => (
                        <FormItem className="flex flex-col items-center">
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
                {!watchedPhotoURL && (
                    <div className="space-y-1 text-center">
                        <p className="text-sm font-black text-primary uppercase text-center">PHOTO REQUIRED</p>
                        <p className="text-[10px] text-muted-foreground font-medium max-w-[200px] leading-relaxed text-center">To ensure community integrity, a real photo is mandatory for activation.</p>
                    </div>
                )}
           </div>

          <FormField
            control={form.control}
            name="accountType"
            render={({ field }) => (
              <FormItem className="text-left">
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  Account Identity Type
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 sm:h-12 rounded-xl sm:rounded-2xl text-base bg-muted/20 border-none shadow-inner font-bold">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="Personal" className="rounded-xl">Personal Account</SelectItem>
                    <SelectItem value="Church" className="rounded-xl">Church Account</SelectItem>
                    <SelectItem value="Church Department" className="rounded-xl">Church Department</SelectItem>
                    <SelectItem value="Corporate" className="rounded-xl">Corporate / Business</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className="text-left">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
                      First Name
                    </FormLabel>
                    <Badge variant="outline" className="h-4 px-1 text-[7px] font-black uppercase bg-primary/5 text-primary border-none leading-none">MANDATORY</Badge>
                  </div>
                  <FormControl>
                    <Input placeholder="John" {...field} value={field.value ?? ''} className="text-base h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-muted/20 border-none shadow-inner font-bold" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem className="text-left">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
                      Last Name
                    </FormLabel>
                    <Badge variant="outline" className="h-4 px-1 text-[7px] font-black uppercase bg-primary/5 text-primary border-none leading-none">MANDATORY</Badge>
                  </div>
                  <FormControl>
                    <Input placeholder="Doe" {...field} value={field.value ?? ''} className="text-base h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-muted/20 border-none shadow-inner font-bold" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="personalMessage"
            render={({ field }) => (
              <FormItem className="text-left">
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Public Slogan
                </FormLabel>
                <FormControl>
                  <Input placeholder={isPersonal ? "e.g., Jesus is Lord!" : "e.g., Growing the Kingdom workforce."} {...field} value={field.value ?? ''} className="text-base h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-muted/20 border-none shadow-inner font-bold" />
                </FormControl>
                <FormDescription className="text-[10px]">A short message shown at the top of your profile.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {isPersonal && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="maritalStatus"
                    render={({ field }) => (
                    <FormItem className="text-left">
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Relationship Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                            <SelectTrigger className="h-11 sm:h-12 rounded-xl sm:rounded-2xl text-base bg-muted/20 border-none shadow-inner">
                            <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                            <SelectItem value="Single">Single</SelectItem>
                            <SelectItem value="Married">Married</SelectItem>
                            <SelectItem value="Engaged">Engaged</SelectItem>
                            <SelectItem value="Divorced">Divorced</SelectItem>
                            <SelectItem value="Widowed">Widowed</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="workStatus"
                    render={({ field }) => (
                    <FormItem className="text-left">
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Work Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                            <SelectTrigger className="h-11 sm:h-12 rounded-xl sm:rounded-2xl text-base bg-muted/20 border-none shadow-inner">
                            <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                            <SelectItem value="Employed">Employed</SelectItem>
                            <SelectItem value="Self-Employed">Self-Employed</SelectItem>
                            <SelectItem value="Business Owner">Business Owner</SelectItem>
                            <SelectItem value="Unemployed">Unemployed</SelectItem>
                            <SelectItem value="Student">Student</SelectItem>
                            <SelectItem value="Retired">Retired</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
          )}

          <AnimatePresence>
            {showOrganizationField && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-6 border-2 border-dashed border-muted p-4 sm:p-6 rounded-3xl sm:rounded-[2rem] bg-muted/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-1">
                    <FormField
                      control={form.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                            <Briefcase className="h-3.5 w-3.5" />
                            {organizationLabel}
                          </FormLabel>
                          <FormControl>
                            <Input placeholder={`Enter your ${organizationLabel.toLowerCase()}...`} {...field} value={field.value ?? ''} className="text-base h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-muted/20 border-none shadow-inner" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="roleInOrganization"
                      render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                            <User className="h-3.5 w-3.5" />
                            ROLE
                          </FormLabel>
                          <FormControl>
                            <Input placeholder={isPersonal ? "e.g., Manager, Student..." : "e.g., Lead Pastor..."} {...field} value={field.value ?? ''} className="text-base h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-muted/20 border-none shadow-inner" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem className="text-left">
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {isPersonal ? 'ABOUT YOURSELF' : 'VISION & MISSION'}
                </FormLabel>
                <FormControl>
                  <Textarea placeholder={isPersonal ? "Share your personal testimony..." : "Describe the vision and impact..."} className="resize-none text-base min-h-[120px] rounded-xl sm:rounded-2xl bg-muted/20 border-none shadow-inner p-4 sm:p-6" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
         
          <Accordion type="single" collapsible className="w-full border rounded-2xl sm:rounded-[2rem] overflow-hidden bg-muted/5 text-left">
            <AccordionItem value="item-1" className="border-none">
              <AccordionTrigger className="p-4 sm:p-6 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                <div className="flex flex-col items-start text-left">
                  <Label className="text-base sm:text-lg font-black uppercase tracking-tight">Public Location Settings</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-bold mt-1">
                    Set your City, State, and Country for search indexing.
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 sm:p-6 pt-0 space-y-6 text-left">
                <div className="bg-muted/20 p-4 rounded-2xl">
                  <Label className="mb-2 block text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Location Search</Label>
                  <LocationProfileInput form={form} />
                </div>
                
                <div className="space-y-4 pt-2">
                  <FormField control={form.control} name="country" render={({ field }) => (
                      <FormItem className="text-left">
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Country</FormLabel>
                        <Select 
                          onValueChange={(val) => { 
                              field.onChange(val); 
                              form.setValue('state', '', { shouldDirty: true }); 
                              form.setValue('city', '', { shouldDirty: true }); 
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="text-base h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                              <SelectValue placeholder="Select Country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px] overflow-y-auto rounded-xl border-none shadow-2xl">
                            {countriesList.map((c) => (
                              <SelectItem key={c.isoCode} value={c.name} className="rounded-lg">
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
                        <FormItem className="text-left">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State</FormLabel>
                          <Select 
                            onValueChange={(val) => { 
                                field.onChange(val); 
                                form.setValue('city', '', { shouldDirty: true }); 
                            }} 
                            value={field.value}
                            disabled={!watchedCountryName || statesList.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger className="text-base h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-muted/20 border-none font-bold">
                                <SelectValue placeholder={statesList.length === 0 ? "N/A" : "Select State"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[300px] overflow-y-auto rounded-xl border-none shadow-2xl">
                              {statesList.map((s) => (
                                <SelectItem key={s.isoCode + s.name} value={s.name} className="rounded-lg">
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
                        <FormItem className="text-left">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter City" {...field} value={field.value ?? ''} className="text-base h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-muted/20 border-none shadow-inner font-bold" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <Label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 sm:h-4 w-4" /> Private Proximity Pin
                      </Label>
                      <Button type="button" variant="ghost" size="sm" onClick={handleGeolocate} className="h-8 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary/20">
                          <LocateFixed className="mr-1 h-3 w-3" />
                          SYNC NOW
                      </Button>
                    </div>
                    {!isValidKey(GOOGLE_MAPS_API_KEY) ? (
                        <div className="h-60 w-full rounded-2xl bg-muted/30 border-2 border-dashed flex flex-col items-center justify-center text-center p-6 space-y-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <MapIcon className="h-6 w-6 text-primary opacity-50" />
                            </div>
                        </div>
                    ) : (
                        <PrivateLocationMap form={form} markerPosition={markerPosition} />
                    )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex gap-3 sm:gap-4">
             <Button type="button" variant="outline" onClick={onClose} className="h-11 sm:h-14 flex-1 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs">Cancel</Button>
             <Button type="submit" className="h-11 sm:h-14 flex-[2] rounded-xl sm:rounded-2xl font-black shadow-xl shadow-primary/20 tracking-widest uppercase text-[10px] sm:text-xs text-center" disabled={isSubmitting}>
               {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
               ACTIVATE IDENTITY
             </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
