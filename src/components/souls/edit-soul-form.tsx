"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { Soul, Campaign, Fellowship } from "@/lib/types";
import { format, differenceInYears } from "date-fns";
import { useFirestore, useUser, useCollection } from "@/firebase";
import { doc, serverTimestamp, writeBatch, query, collection, orderBy } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { safeToDate } from "@/lib/utils";
import { LocationWonInput } from "./location-won-input";
import { Label } from "@/components/ui/label";
import { Country } from 'country-state-city';
import { ImageUpload } from "../common/image-upload";
import { Textarea } from "../ui/textarea";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters.").max(50, "Name is too long."),
  lastName: z.string().min(2, "Last name must be at least 2 characters.").max(50, "Name is too long."),
  nickname: z.string().max(20, "Nickname is too long.").optional(),
  spouseName: z.string().max(100, "Spouse name is too long.").optional(),
  photoURL: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.date().optional().nullable(),
  marriageDate: z.date().optional().nullable(),
  age: z.number().optional().nullable(),
  maritalStatus: z.string().optional(),
  workStatus: z.string().optional(),
  email: z.string().email("Please enter a valid email address.").optional().or(z.literal('')),
  phone: z.string().optional(),
  church: z.string().optional(),
  relationship: z.string().optional(),
  locationWonCity: z.string().optional(),
  locationWonState: z.string().optional(),
  locationWonCountry: z.string().optional(),
  locationWonStreet: z.string().optional(),
  locationWonLandmark: z.string().optional(),
  locationWonLatitude: z.number().optional().nullable(),
  locationWonLongitude: z.number().optional().nullable(),
  source: z.string({ required_error: "Please select a source." }),
  sourceDetails: z.string().optional(),
  wonAt: z.date({
    required_error: "A date is required.",
  }),
});

interface EditSoulFormProps {
  soul: Soul;
  onSoulUpdated: () => void;
  fellowships: Fellowship[];
  campaigns: Campaign[];
}

export function EditSoulForm({ soul, onSoulUpdated, fellowships, campaigns }: EditSoulFormProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);

  const countriesList = useMemo(() => Country.getAllCountries(), []);

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`), orderBy("firstName", "asc"));
  }, [user?.uid, firestore]);
  const { data: existingSouls } = useCollection<Soul>(soulsQuery);

  const spouseOptions = useMemo(() => {
    if (!existingSouls) return [];
    return existingSouls
        .filter(s => s.id !== soul.id)
        .map(s => `${s.firstName} ${s.lastName}`.trim());
  }, [existingSouls, soul.id]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: soul.firstName || "",
      lastName: soul.lastName || "",
      nickname: soul.nickname || "",
      spouseName: soul.spouseName || "",
      photoURL: soul.photoURL || "",
      gender: soul.gender || "",
      nationality: soul.nationality || "",
      dateOfBirth: safeToDate(soul.dateOfBirth) || null,
      marriageDate: safeToDate(soul.marriageDate) || null,
      age: soul.age || null,
      maritalStatus: soul.maritalStatus || "",
      workStatus: soul.workStatus || "",
      email: soul.email || "",
      phone: soul.phone || "",
      church: soul.church || "",
      relationship: soul.relationship || "Other",
      locationWonCity: soul.locationWon?.city || "",
      locationWonState: soul.locationWon?.state || "",
      locationWonCountry: soul.locationWon?.country || "",
      locationWonStreet: soul.locationWon?.street || "",
      locationWonLandmark: soul.locationWon?.landmark || "",
      locationWonLatitude: soul.locationWon?.latitude ?? null,
      locationWonLongitude: soul.locationWon?.longitude ?? null,
      source: soul.source || "Personal",
      sourceDetails: soul.sourceDetails || "",
      wonAt: safeToDate(soul.wonAt) ?? new Date(),
    },
  });

  const { reset, control, setValue, getValues } = form;
  const lastSoulId = useRef(soul.id);

  useEffect(() => {
    if (soul.id !== lastSoulId.current) {
        reset({
            firstName: soul.firstName || "",
            lastName: soul.lastName || "",
            nickname: soul.nickname || "",
            spouseName: soul.spouseName || "",
            photoURL: soul.photoURL || "",
            gender: soul.gender || "",
            nationality: soul.nationality || "",
            dateOfBirth: safeToDate(soul.dateOfBirth) || null,
            marriageDate: safeToDate(soul.marriageDate) || null,
            age: soul.age || null,
            maritalStatus: soul.maritalStatus || "",
            workStatus: soul.workStatus || "",
            email: soul.email || "",
            phone: soul.phone || "",
            church: soul.church || "",
            relationship: soul.relationship || "Other",
            locationWonCity: soul.locationWon?.city || "",
            locationWonState: soul.locationWon?.state || "",
            locationWonCountry: soul.locationWon?.country || "",
            locationWonStreet: soul.locationWon?.street || "",
            locationWonLandmark: soul.locationWon?.landmark || "",
            locationWonLatitude: soul.locationWon?.latitude ?? null,
            locationWonLongitude: soul.locationWon?.longitude ?? null,
            source: soul.source || "Personal",
            sourceDetails: soul.sourceDetails || "",
            wonAt: safeToDate(soul.wonAt) ?? new Date(),
        });
        lastSoulId.current = soul.id;
    }
  }, [soul, reset]);
  
  const sourceValue = useWatch({ control, name: "source" });
  const dobValue = useWatch({ control, name: "dateOfBirth" });
  const maritalStatusValue = useWatch({ control, name: "maritalStatus" });

  useEffect(() => {
    if (sourceValue !== 'Campaign' && getValues('sourceDetails') !== '') {
        setValue('sourceDetails', '', { shouldDirty: true });
    }
  }, [sourceValue, setValue, getValues]);

  useEffect(() => {
    if (dobValue) {
        const calculatedAge = differenceInYears(new Date(), dobValue);
        if (getValues('age') !== calculatedAge) {
            setValue('age', calculatedAge, { shouldDirty: true });
        }
    }
  }, [dobValue, setValue, getValues]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Not Authenticated" });
      return;
    }
    setIsLoading(true);

    const soulRef = doc(firestore, `users/${soul.userId}/souls`, soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);

    const sanitizedPhone = values.phone ? values.phone.replace(/[^\d+]/g, '') : null;

    const soulUpdateData: { [key: string]: any } = {
      firstName: values.firstName,
      lastName: values.lastName,
      nickname: values.nickname || null,
      spouseName: values.maritalStatus === 'Married' ? values.spouseName : null,
      photoURL: values.photoURL || null,
      gender: values.gender || null,
      nationality: values.nationality || null,
      dateOfBirth: values.dateOfBirth || null,
      marriageDate: values.maritalStatus === 'Married' ? values.marriageDate : null,
      age: values.age || null,
      maritalStatus: values.maritalStatus || null,
      workStatus: values.workStatus || null,
      relationship: values.relationship || null,
      source: values.source as 'Personal' | 'Campaign',
      wonAt: values.wonAt,
      updatedAt: serverTimestamp(),
      email: values.email || null,
      phone: sanitizedPhone,
      church: values.church || null,
      sourceDetails: values.sourceDetails || null,
    };

    soulUpdateData.locationWon = {
      city: values.locationWonCity || null,
      state: values.locationWonState || null,
      country: values.locationWonCountry || null,
      street: values.locationWonStreet || null,
      landmark: values.locationWonLandmark || null,
      latitude: values.locationWonLatitude ?? null,
      longitude: values.locationWonLongitude ?? null,
    };
    
    if (values.source === 'Campaign') {
      const campaign = campaigns?.find(c => c.title === values.sourceDetails);
      soulUpdateData.campaignId = campaign?.id || null;
    } else {
      soulUpdateData.campaignId = null;
    }

    try {
        const batch = writeBatch(firestore);
        
        batch.update(soulRef, soulUpdateData);
        batch.update(globalSoulRef, soulUpdateData);

        batch.commit().catch(async (serverError: any) => {
            console.error("Failed to update soul record:", serverError);
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: soulRef.path,
                    operation: 'update',
                    requestResourceData: soulUpdateData,
                }, user);
                errorEmitter.emit('permission-error', permissionError);
            }
        });

        toast({
            title: "Soul Updated",
            description: "Record has been updated successfully.",
        });

        setIsLoading(false);
        onSoulUpdated();

    } catch (error: any) {
      console.error("Edit Soul UI Error:", error);
      toast({
          variant: "destructive",
          title: "Update Failed",
          description: error.message || "An unexpected error occurred. Please try again."
      });
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 text-left">
        <FormField
            control={form.control}
            name="photoURL"
            render={({ field }) => (
                <FormItem className="flex flex-col items-center py-4">
                    <FormControl>
                        <ImageUpload
                            initialImageUrl={field.value}
                            onUploadComplete={(url) => field.onChange(url)}
                            storagePath="souls"
                            cropAspect={1}
                            circularCrop={true}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">First Name</FormLabel>
                <FormControl>
                    <Input placeholder="John" {...field} value={field.value ?? ""} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"/>
                </FormControl>
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Last Name</FormLabel>
                <FormControl>
                    <Input placeholder="Doe" {...field} value={field.value ?? ""} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"/>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
          control={form.control}
          name="nickname"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nickname (Gallery Name)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Johnny" {...field} value={field.value || ""} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"/>
              </FormControl>
              <FormDescription className="text-[10px]">This is the name that will be visible in your souls gallery.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="Male" className="rounded-xl">Male</SelectItem>
                      <SelectItem value="Female" className="rounded-xl">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="relationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Relationship to Mobilizer</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                        <SelectValue placeholder="Relationship" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="Family" className="rounded-xl">Family Member</SelectItem>
                      <SelectItem value="Friend" className="rounded-xl">Friend</SelectItem>
                      <SelectItem value="Colleague" className="rounded-xl">Colleague</SelectItem>
                      <SelectItem value="Neighbor" className="rounded-xl">Neighbor</SelectItem>
                      <SelectItem value="Stranger" className="rounded-xl">Stranger / Outreach</SelectItem>
                      <SelectItem value="Other" className="rounded-xl">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="maritalStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Marital Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="Single" className="rounded-xl">Single</SelectItem>
                      <SelectItem value="Married" className="rounded-xl">Married</SelectItem>
                      <SelectItem value="Engaged" className="rounded-xl">Engaged</SelectItem>
                      <SelectItem value="Separated" className="rounded-xl">Separated</SelectItem>
                      <SelectItem value="Divorced" className="rounded-xl">Divorced</SelectItem>
                      <SelectItem value="Widowed" className="rounded-xl">Widowed</SelectItem>
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
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Work Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left">
                        <SelectValue placeholder="Select Work" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="Employed" className="rounded-xl">Employed</SelectItem>
                      <SelectItem value="Self-Employed" className="rounded-xl">Self-Employed</SelectItem>
                      <SelectItem value="Business Owner" className="rounded-xl">Business Owner</SelectItem>
                      <SelectItem value="Unemployed" className="rounded-xl">Unemployed</SelectItem>
                      <SelectItem value="Student" className="rounded-xl">Student</SelectItem>
                      <SelectItem value="Retired" className="rounded-xl">Retired</SelectItem>
                      <SelectItem value="Other" className="rounded-xl">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        {maritalStatusValue === "Married" && (
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="spouseName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Spouse's Name</FormLabel>
                        <FormControl>
                        <div className="relative">
                            <Input 
                                placeholder="Type or pick from harvest list..." 
                                {...field} 
                                value={field.value || ""} 
                                list="souls-options-edit"
                                className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"
                            />
                            <datalist id="souls-options-edit">
                                {spouseOptions.map((name, i) => (
                                    <option key={i} value={name} />
                                ))}
                            </datalist>
                        </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="marriageDate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Marriage Date</FormLabel>
                        <FormControl>
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
                            className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"
                            max={format(new Date(), "yyyy-MM-dd")}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
           </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Date of Birth</FormLabel>
                  <FormControl>
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
                      className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"
                      max={format(new Date(), "yyyy-MM-dd")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Age</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="e.g. 25" 
                      {...field} 
                      value={field.value ?? ""} 
                      onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                      className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <FormField
          control={form.control}
          name="wonAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Date Won</FormLabel>
              <FormControl>
                <Input 
                  type="date"
                  value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                        const [year, month, day] = e.target.value.split('-').map(Number);
                        field.onChange(new Date(year, month - 1, day));
                    } else {
                        field.onChange(undefined);
                    }
                  }}
                  className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Source</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                    <SelectValue placeholder="Select Source" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="Personal" className="rounded-xl">Personal Evangelism</SelectItem>
                  <SelectItem value="Campaign" className="rounded-xl">Campaign</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {sourceValue === "Campaign" && (
          <FormField
            control={form.control}
            name="sourceDetails"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Campaign Name</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                      <SelectValue placeholder={!campaigns ? "Loading..." : "Select Mission"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-2xl">
                    {campaigns && campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.title} className="rounded-xl">
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="optional-details" className="border-none">
                <AccordionTrigger className="text-sm font-semibold py-4 hover:no-underline text-left">Additional Details & Location</AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-6 pt-2 text-left">
                        <div className="space-y-4 text-left">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Location Won</Label>
                          <LocationWonInput form={form} />
                        </div>

                        <FormField
                            control={form.control}
                            name="locationWonStreet"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Street Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., 42 Grace Avenue" {...field} value={field.value || ""} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"/>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="locationWonLandmark"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nearest Landmark</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Opposite the central park" {...field} value={field.value || ""} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"/>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</FormLabel>
                                <FormControl>
                                    <Input placeholder="john.doe@example.com" {...field} value={field.value ?? ''} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"/>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</FormLabel>
                                <FormControl>
                                    <Input placeholder="+1 123 456 7890" {...field} value={field.value ?? ''} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"/>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <FormField
                            control={form.control}
                            name="church"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Home Church</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., New Life Church" {...field} value={field.value ?? ''} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"/>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <FormField
                            control={form.control}
                            name="nationality"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-[10px) font-black uppercase tracking-widest text-muted-foreground ml-1">Nationality</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left">
                                        <SelectValue placeholder="Select Country" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="max-h-[300px] rounded-2xl">
                                    {countriesList.map(c => (
                                        <SelectItem key={c.isoCode} value={c.name} className="rounded-xl">{c.name}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>

        <Button type="submit" className="w-full h-14 rounded-2xl text-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'SAVE CHANGES'}
        </Button>
      </form>
    </Form>
  );
}
