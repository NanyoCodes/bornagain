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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { Campaign, Soul, UserProfile, Fellowship, SoulRelationship } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { format, differenceInYears } from "date-fns";
import { useFirestore, useUser, useDoc } from "@/firebase";
import { collection, serverTimestamp, doc, writeBatch, increment } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { safeToDate } from "@/lib/utils";
import { LocationWonInput } from "./location-won-input";
import { Label } from "@/components/ui/label";
import { Country } from 'country-state-city';
import { ImageUpload } from "../common/image-upload";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters."),
  lastName: z.string().min(2, "Last name must be at least 2 characters."),
  nickname: z.string().max(20, "Nickname is too long.").optional(),
  photoURL: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.date().optional().nullable(),
  age: z.number().optional().nullable(),
  email: z.string().email("Please enter a valid email address.").optional().or(z.literal('')),
  phone: z.string().optional(),
  church: z.string().optional(),
  relationship: z.string({ required_error: "Please select your relationship." }),
  locationWonCity: z.string().optional(),
  locationWonState: z.string().optional(),
  locationWonCountry: z.string().optional(),
  locationWonLatitude: z.number().optional().nullable(),
  locationWonLongitude: z.number().optional().nullable(),
  source: z.string({ required_error: "Please select a source." }),
  sourceDetails: z.string().optional(),
  initialNote: z.string().optional(),
  wonAt: z.date({
    required_error: "A date is required.",
  }),
});

type LogSoulFormProps = {
  onSoulLogged: () => void;
  defaultCampaign?: Campaign;
  defaultRelationship?: SoulRelationship;
  defaultFellowship?: Fellowship;
  defaultAssociation?: Fellowship;
  fellowships: Fellowship[];
  campaigns: Campaign[];
};

export function LogSoulForm({ 
    onSoulLogged, 
    defaultCampaign, 
    defaultRelationship, 
    defaultFellowship, 
    defaultAssociation,
    fellowships, 
    campaigns 
}: LogSoulFormProps) {
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);

  const countriesList = useMemo(() => Country.getAllCountries(), []);

  const userDocRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      nickname: "",
      photoURL: "",
      gender: "",
      nationality: "",
      dateOfBirth: null,
      age: null,
      email: "",
      phone: "",
      church: "",
      relationship: defaultRelationship || "Other",
      locationWonCity: "",
      locationWonState: "",
      locationWonCountry: "",
      locationWonLatitude: null,
      locationWonLongitude: null,
      source: defaultCampaign ? "Campaign" : "Personal",
      sourceDetails: defaultCampaign ? defaultCampaign.title : "",
      initialNote: "",
      wonAt: new Date(),
    },
  });

  const { control, setValue } = form;

  const sourceValue = useWatch({ control, name: "source" });
  const dobValue = useWatch({ control, name: "dateOfBirth" });

  useEffect(() => {
    if (sourceValue !== 'Campaign') {
        setValue('sourceDetails', '');
    }
  }, [sourceValue, setValue]);

  useEffect(() => {
    if (dobValue) {
        const calculatedAge = differenceInYears(new Date(), dobValue);
        setValue('age', calculatedAge, { shouldDirty: true });
    }
  }, [dobValue, setValue]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !userProfile || !firestore) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to log a soul.' });
      return;
    }
    setIsLoading(true);
    
    const soulsCollectionRef = collection(firestore, `users/${user.uid}/souls`);
    const newSoulRef = doc(soulsCollectionRef);
    const globalSoulRef = doc(firestore, 'souls', newSoulRef.id);

    const processedUserLocation = userProfile?.location ? {
        city: userProfile.location.city || "",
        country: userProfile.location.country || "",
        city_lowercase: (userProfile.location.city || "").toLowerCase(),
        country_lowercase: (userProfile.location.country || "").toLowerCase(),
    } : null;

    // PHONE SANITIZATION: Strictly numeric storage
    const sanitizedPhone = values.phone ? values.phone.replace(/[^\d+]/g, '') : null;

    const soulData: { [key: string]: any } = {
      userId: user.uid,
      firstName: values.firstName,
      lastName: values.lastName,
      nickname: values.nickname || null,
      photoURL: values.photoURL || null,
      gender: values.gender || null,
      nationality: values.nationality || null,
      dateOfBirth: values.dateOfBirth || null,
      age: values.age || null,
      relationship: values.relationship,
      source: values.source as 'Campaign' | 'Personal',
      wonAt: values.wonAt,
      status: "New",
      followUpLog: values.initialNote ? [{ date: new Date(), note: values.initialNote, memberId: user.uid, memberName: `${userProfile.firstName} ${userProfile.lastName}` }] : [],
      attendingChurch: false,
      inBibleStudy: false,
      attendingPrayer: false,
      inServiceDepartment: false,
      userLocation: processedUserLocation || null,
      email: values.email || null,
      phone: sanitizedPhone,
      church: values.church || null,
      sourceDetails: values.sourceDetails || null,
      // Auto-assignment from props
      fellowshipId: defaultFellowship?.id || null,
      fellowshipName: defaultFellowship?.name || null,
      associationId: defaultAssociation?.id || null,
      associationName: defaultAssociation?.name || null,
    };
    
    const locationWon: { [key: string]: any } = {
      city: values.locationWonCity || null,
      state: values.locationWonState || null,
      country: values.locationWonCountry || null,
      latitude: values.locationWonLatitude ?? null,
      longitude: values.locationWonLongitude ?? null,
    };
    soulData.locationWon = locationWon;

    const campaignId = values.source === 'Campaign' ? (defaultCampaign?.id || campaigns?.find(c => c.title === values.sourceDetails)?.id) : null;
    soulData.campaignId = campaignId || null;

    try {
        const batch = writeBatch(firestore);
        
        batch.set(newSoulRef, soulData);
        batch.set(globalSoulRef, soulData);

        if (campaignId) {
            const campaignRef = doc(firestore, 'campaigns', campaignId);
            batch.update(campaignRef, { soulsLogged: increment(1) });
        }

        batch.commit().catch(async (serverError: any) => {
            console.error("Log Soul Server Error:", serverError);
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: `BATCH_WRITE:LOG_SOUL`,
                    operation: 'write',
                    requestResourceData: { soulData, campaignId },
                }, user);
                errorEmitter.emit('permission-error', permissionError);
            }
        });

        toast({
            title: "Soul Logged",
            description: "A new soul has been added successfully.",
        });
        setIsLoading(false);
        onSoulLogged();

    } catch (err: any) {
        console.error("Log Soul Error:", err);
        toast({ variant: 'destructive', title: "Submission Failed", description: err.message });
        setIsLoading(false);
    }
  }

  if (userLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
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
                    <Input placeholder="John" {...field} value={field.value || ""} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"/>
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
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Last Name</FormLabel>
                <FormControl>
                    <Input placeholder="Doe" {...field} value={field.value || ""} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"/>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Relationship</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <SelectValue placeholder={!campaigns ? "Loading..." : "Choose Mission"} />
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
                <AccordionTrigger className="text-sm font-semibold py-4 hover:no-underline">Additional Details & Location</AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-6 pt-2">
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Location Won</Label>
                          <LocationWonInput form={form} />
                        </div>

                        <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</FormLabel>
                            <FormControl>
                                <Input placeholder="john.doe@example.com" {...field} value={field.value || ""} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"/>
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
                                <Input placeholder="+1 123 456 7890" {...field} value={field.value || ""} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"/>
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
                                <Input placeholder="e.g., New Life Church" {...field} value={field.value || ""} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"/>
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
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nationality</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
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
                        <FormField
                        control={form.control}
                        name="initialNote"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Initial Note</FormLabel>
                            <FormControl>
                                <Textarea placeholder="e.g., Met at the park, prayed together..." {...field} value={field.value || ""} className="rounded-2xl bg-muted/20 border-none shadow-inner"/>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>

        <Button type="submit" className="w-full h-14 rounded-2xl text-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20" disabled={isLoading || userLoading || profileLoading}>
          {(isLoading || userLoading || profileLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          LOG SOUL
        </Button>
      </form>
    </Form>
  );
}
