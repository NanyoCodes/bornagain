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
import { Loader2, Youtube, Trash2, ShieldCheck, Sparkles, Building2, User, Briefcase, MessageSquare, Target } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Country, State } from 'country-state-city';
import { safeToDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const videoSchema = z.object({
  url: z.string().url("Please enter a valid YouTube URL."),
  title: z.string().max(100, "Title too long").optional(),
});

const formSchema = z.object({
  accountType: z.enum(['Personal', 'Church', 'Church Department', 'Corporate']),
  firstName: z.string().min(2, "First name must be at least 2 characters.").max(50, "Name is too long."),
  lastName: z.string().min(2, "Last name must be at least 2 characters.").max(50, "Name is too long."),
  photoURL: z.string().min(5, "A profile photo is mandatory to activate your identity."),
  bio: z.string().max(2000, "Bio is too long.").optional(),
  personalMessage: z.string().max(250, "Personal message is too long.").optional(),
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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "videoTestimonies"
  });

  useEffect(() => {
    if (userProfile) {
        form.reset({
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
        });
    }
  }, [userProfile, form]);

  const watchedCountryName = form.watch('country');
  const watchedWorkStatus = useWatch({ control: form.control, name: "workStatus" });
  const watchedAccountType = useWatch({ control: form.control, name: "accountType" });

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

  const selectedCountry = useMemo(() => countriesList.find(c => c.name === watchedCountryName), [countriesList, watchedCountryName]);
  const statesList = useMemo(() => selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : [], [selectedCountry]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore || !auth.currentUser) return;
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
      await updateDoc(doc(firestore, 'users', user.uid), firestoreUpdatePayload);
      if (auth.currentUser.displayName !== displayName || auth.currentUser.photoURL !== values.photoURL) {
          await updateProfile(auth.currentUser, { displayName, photoURL: values.photoURL });
      }
      const batch = writeBatch(firestore);
      const testimoniesSnap = await getDocs(query(collection(firestore, 'testimonies'), where('authorId', '==', user.uid)));
      testimoniesSnap.forEach(tDoc => {
          batch.update(tDoc.ref, { 
              authorAvatarUrl: values.photoURL,
              authorLocation: {
                  city: authorLocation.city || null,
                  country: authorLocation.country || null,
                  latitude: authorLocation.latitude ?? null,
                  longitude: authorLocation.longitude ?? null,
              }
          });
      });
      await batch.commit();
      toast({ title: "Identity Activated" });
      onClose();
    } catch (error: any) {
         errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${user.uid}`, operation: 'update' }, user));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 text-left">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 text-left">
           <div className="bg-primary/5 p-6 rounded-[2rem] border-2 border-dashed border-primary/20 flex flex-col items-center gap-4 text-left">
                <FormField
                    control={form.control}
                    name="photoURL"
                    render={({ field }) => (
                        <FormItem className="flex flex-col items-center text-left">
                            <FormControl className="text-left">
                                <ImageUpload
                                    initialImageUrl={field.value}
                                    onUploadComplete={(url) => field.onChange(url)}
                                    storagePath="profile-pictures"
                                    cropAspect={1}
                                    circularCrop={true}
                                />
                            </FormControl>
                            <FormMessage className="text-left" />
                        </FormItem>
                    )}
                />
           </div>

          <FormField
            control={form.control}
            name="accountType"
            render={({ field }) => (
              <FormItem className="text-left">
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 text-left"><Building2 className="h-3.5 w-3.5 text-left" />Account Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                  <FormControl className="text-left">
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left"><SelectValue placeholder="Select Type" className="text-left" /></SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-2xl border-none shadow-2xl text-left">
                    <SelectItem value="Personal" className="text-left">Personal Account</SelectItem>
                    <SelectItem value="Church" className="text-left">Church Account</SelectItem>
                    <SelectItem value="Church Department" className="text-left">Church Department</SelectItem>
                    <SelectItem value="Corporate" className="text-left">Corporate / Business</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem className="text-left"><FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">First Name <Badge variant="outline" className="text-[8px] h-3.5 ml-1 border-primary/40 text-primary text-left">MANDATORY</Badge></FormLabel>
                  <FormControl className="text-left"><Input placeholder="John" {...field} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left" /></FormControl><FormMessage className="text-left" />
                </FormItem>
            )} />
            <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem className="text-left"><FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">Last Name <Badge variant="outline" className="text-[8px] h-3.5 ml-1 border-primary/40 text-primary text-left">MANDATORY</Badge></FormLabel>
                  <FormControl className="text-left"><Input placeholder="Doe" {...field} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left" /></FormControl><FormMessage className="text-left" />
                </FormItem>
            )} />
          </div>

          <FormField
            control={form.control}
            name="personalMessage"
            render={({ field }) => (
              <FormItem className="text-left">
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 text-left"><MessageSquare className="h-3.5 w-3.5 text-left" />Slogan</FormLabel>
                <FormControl className="text-left">
                    <Input placeholder="e.g., Jesus is Lord!" {...field} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left" />
                </FormControl>
                <FormMessage className="text-left" />
              </FormItem>
            )}
          />

          <Accordion type="single" collapsible className="w-full space-y-4 text-left">
            <AccordionItem value="logistics" className="border rounded-[2rem] bg-muted/5 text-left">
                <AccordionTrigger className="p-6 hover:no-underline text-left"><div className="flex flex-col items-start text-left"><p className="text-lg font-black uppercase tracking-tight text-left">Public Logistics</p><p className="text-xs font-medium text-muted-foreground mt-1 text-left">Address for search indexing</p></div></AccordionTrigger>
                <AccordionContent className="p-6 pt-0 space-y-6 text-left">
                    <div className="bg-muted/20 p-4 rounded-2xl text-left"><Label className="mb-2 block text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground text-left">Search Address</Label><LocationProfileInput form={form} /></div>
                    <div className="space-y-4 text-left">
                        <FormField control={form.control} name="country" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">Country</FormLabel><Select onValueChange={(val) => { field.onChange(val); form.setValue('state', ''); form.setValue('city', ''); }} value={field.value}><FormControl className="text-left"><SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none font-bold text-left"><SelectValue placeholder="Country" className="text-left" /></SelectTrigger></FormControl><SelectContent className="max-h-[300px] text-left">{countriesList.map(c => <SelectItem key={c.isoCode} value={c.name} className="text-left">{c.name}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                            <FormField control={form.control} name="state" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">State</FormLabel><Select onValueChange={(val) => { field.onChange(val); form.setValue('city', ''); }} value={field.value} disabled={!watchedCountryName || statesList.length === 0}><FormControl className="text-left"><SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none font-bold text-left"><SelectValue placeholder="State" className="text-left" /></SelectTrigger></FormControl><SelectContent className="max-h-[300px] text-left">{statesList.map(s => <SelectItem key={s.isoCode + s.name} value={s.name} className="text-left">{s.name}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                            <FormField control={form.control} name="city" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">City</FormLabel><FormControl className="text-left"><Input placeholder="City" {...field} className="h-12 rounded-2xl bg-muted/20 border-none font-bold text-left" /></FormControl></FormItem>)} />
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="details" className="border rounded-[2rem] bg-muted/5 text-left">
                <AccordionTrigger className="p-6 hover:no-underline text-left"><div className="flex flex-col items-start text-left"><p className="text-lg font-black uppercase tracking-tight text-left">Identity Details</p><p className="text-xs font-medium text-muted-foreground mt-1 text-left">Marital, Professional & Spiritual context</p></div></AccordionTrigger>
                <AccordionContent className="p-6 pt-0 space-y-6 text-left">
                    {isPersonal && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                            <FormField control={form.control} name="maritalStatus" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">Relationship</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl className="text-left"><SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none font-bold text-left"><SelectValue placeholder="Marital Status" className="text-left" /></SelectTrigger></FormControl><SelectContent className="text-left">{['Single', 'Married', 'Engaged', 'Widowed'].map(v => <SelectItem key={v} value={v} className="text-left">{v}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                            <FormField control={form.control} name="workStatus" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">Work Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl className="text-left"><SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none font-bold text-left"><SelectValue placeholder="Work Status" className="text-left" /></SelectTrigger></FormControl><SelectContent className="text-left">{['Employed', 'Self-Employed', 'Business Owner', 'Student'].map(v => <SelectItem key={v} value={v} className="text-left">{v}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                        </div>
                    )}
                    {showOrganizationField && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                            <FormField control={form.control} name="organizationName" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 text-left"><Briefcase className="h-3.5 w-3.5 text-left" />{organizationLabel}</FormLabel><FormControl className="text-left"><Input placeholder="Organization Name" {...field} className="h-12 rounded-2xl bg-muted/20 border-none font-bold text-left" /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="roleInOrganization" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 text-left"><User className="h-3.5 w-3.5 text-left" />ROLE</FormLabel><FormControl className="text-left"><Input placeholder="Position" {...field} className="h-12 rounded-2xl bg-muted/20 border-none font-bold text-left" /></FormControl></FormItem>)} />
                        </div>
                    )}
                    <FormField control={form.control} name="bio" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">BIO / TESTIMONY</FormLabel><FormControl className="text-left"><Textarea placeholder="Share your story..." className="min-h-[120px] rounded-[2rem] bg-muted/20 border-none p-6 text-base text-left" {...field} /></FormControl></FormItem>)} />
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="assets" className="border rounded-[2rem] bg-muted/5 text-left">
                <AccordionTrigger className="p-6 hover:no-underline text-left"><div className="flex flex-col items-start text-left"><p className="text-lg font-black uppercase tracking-tight text-left">Kingdom Assets</p><p className="text-xs font-medium text-muted-foreground mt-1 text-left">Video testimonies and meeting links</p></div></AccordionTrigger>
                <AccordionContent className="p-6 pt-0 space-y-6 text-left">
                    <FormField control={form.control} name="defaultMeetingLink" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-xs font-bold uppercase text-primary flex items-center gap-1.5 text-left"><Sparkles className="h-4 w-4 text-left" />PRO-Identity Meeting Link</FormLabel><FormControl className="text-left"><Input placeholder="Google Meet / Zoom URL" {...field} className="h-12 rounded-2xl bg-muted/20 border-none font-bold text-left" /></FormControl></FormItem>)} />
                    <div className="space-y-4 text-left"><div className="flex items-center justify-between text-left"><Label className="text-[10px] font-black uppercase text-primary flex items-center gap-2 text-left"><Youtube className="h-4 w-4 text-left" />Video Testimonies</Label><Button type="button" variant="outline" size="sm" onClick={() => append({ url: '', title: '' })} className="h-8 rounded-xl font-bold text-left">Add Video</Button></div><div className="space-y-4 text-left">{fields.map((field, index) => (<div key={field.id} className="p-4 border-2 border-dashed rounded-2xl bg-muted/10 space-y-3 relative text-left"><Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full text-destructive text-left" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-left" /></Button><div className="space-y-2 text-left"><Label className="text-[9px] font-black uppercase opacity-60 text-left">YouTube URL</Label><Input {...form.register(`videoTestimonies.${index}.url` as const)} placeholder="https://youtube.com/watch?v=..." className="h-10 rounded-xl text-left" /></div><div className="space-y-2 text-left"><Label className="text-[9px] font-black uppercase opacity-60 text-left">Display Title</Label><Input {...form.register(`videoTestimonies.${index}.title` as const)} placeholder="Miracle Title" className="h-10 rounded-xl text-left" /></div></div>))}</div></div>
                </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex gap-4 pt-4 text-left">
             <Button type="button" variant="outline" onClick={onClose} className="h-14 flex-1 rounded-2xl font-bold text-left">Cancel</Button>
             <Button type="submit" className="h-14 flex-[2] rounded-2xl font-black shadow-xl shadow-primary/20 tracking-widest uppercase text-center text-left" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" /> : <ShieldCheck className="mr-2 h-4 w-4 text-left" />}ACTIVATE IDENTITY</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
