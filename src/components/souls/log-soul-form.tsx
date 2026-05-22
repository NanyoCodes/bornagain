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
import type { Campaign, Soul, UserProfile, Fellowship } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useFirestore, useUser, useDoc } from "@/firebase";
import { collection, serverTimestamp, doc, runTransaction } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LocationWonInput } from "./location-won-input";
import { haversineDistance } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters."),
  lastName: z.string().min(2, "Last name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address.").optional().or(z.literal('')),
  phone: z.string().optional(),
  church: z.string().optional(),
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
  fellowshipId: z.string().optional().nullable(),
});

type LogSoulFormProps = {
  onSoulLogged: () => void;
  defaultCampaign?: Campaign;
  fellowships: Fellowship[];
  campaigns: Campaign[];
};

export function LogSoulForm({ onSoulLogged, defaultCampaign, fellowships, campaigns }: LogSoulFormProps) {
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);

  const userDocRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      church: "",
      locationWonCity: "",
      locationWonState: "",
      locationWonCountry: "",
      locationWonLatitude: null,
      locationWonLongitude: null,
      source: defaultCampaign ? "Campaign" : "Personal",
      sourceDetails: defaultCampaign ? defaultCampaign.title : "",
      initialNote: "",
      wonAt: new Date(),
      fellowshipId: null,
    },
  });

  const { control, setValue } = form;

  const sourceValue = useWatch({ control, name: "source" });
  const watchedLat = useWatch({ control, name: "locationWonLatitude" });
  const watchedLng = useWatch({ control, name: "locationWonLongitude" });

  useEffect(() => {
    if (sourceValue !== 'Campaign') {
        setValue('sourceDetails', '');
    }
  }, [sourceValue, setValue]);

  const sortedFellowships = useMemo(() => {
    const list = [...(fellowships || [])];
    if (!list.length) return [];
    
    if (typeof watchedLat !== 'number' || typeof watchedLng !== 'number') {
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list
        .map(f => {
            const distance = f.latitude && f.longitude
                ? haversineDistance({ lat: watchedLat, lng: watchedLng }, { lat: f.latitude, lng: f.longitude })
                : Infinity;
            return { ...f, distance };
        })
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [fellowships, watchedLat, watchedLng]);


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

    const soulData: { [key: string]: any } = {
      userId: user.uid,
      firstName: values.firstName,
      lastName: values.lastName,
      source: values.source as 'Campaign' | 'Personal',
      wonAt: values.wonAt,
      status: "New",
      followUpLog: values.initialNote ? [{ date: new Date(), note: values.initialNote }] : [],
      attendingChurch: false,
      inBibleStudy: false,
      attendingPrayer: false,
      inServiceDepartment: false,
      userLocation: processedUserLocation || null,
      email: values.email || null,
      phone: values.phone || null,
      church: values.church || null,
      sourceDetails: values.sourceDetails || null,
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

    if (values.fellowshipId && values.fellowshipId !== 'none') {
        const selectedFellowship = fellowships?.find(f => f.id === values.fellowshipId);
        soulData.fellowshipId = values.fellowshipId;
        soulData.fellowshipName = selectedFellowship?.name || null;
    } else {
        soulData.fellowshipId = null;
        soulData.fellowshipName = null;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            let currentSoulsLogged = 0;
            if (campaignId) {
                const campaignRef = doc(firestore, 'campaigns', campaignId);
                const campaignDoc = await transaction.get(campaignRef);
                if (campaignDoc.exists()) {
                    currentSoulsLogged = campaignDoc.data().soulsLogged || 0;
                }
            }

            transaction.set(newSoulRef, soulData);
            transaction.set(globalSoulRef, soulData);

            if (campaignId) {
                const campaignRef = doc(firestore, 'campaigns', campaignId);
                transaction.update(campaignRef, { soulsLogged: currentSoulsLogged + 1 });
            }
        });

        toast({
            title: "Soul Logged",
            description: "A new soul has been added successfully.",
        });
        onSoulLogged();
    } catch (serverError: any) {
        console.error("Log Soul Error:", serverError);
        const permissionError = new FirestorePermissionError({
            path: `TRANSACTION:LOG_SOUL`,
            operation: 'write',
            requestResourceData: { soulData, campaignId },
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                    <Input placeholder="John" {...field} value={field.value || ""} className="text-base"/>
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
                    <Input placeholder="Doe" {...field} value={field.value || ""} className="text-base"/>
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
              <FormLabel>Date Won</FormLabel>
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
                  className="text-base"
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
              <FormLabel>Source</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={!!defaultCampaign}>
                <FormControl>
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Select the source" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Personal">Personal Evangelism</SelectItem>
                  <SelectItem value="Campaign">Campaign</SelectItem>
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
                  <FormLabel>Campaign Name</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""} disabled={!!defaultCampaign}>
                    <FormControl>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder={!campaigns ? "Loading campaigns..." : "Select from your campaigns"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {campaigns && campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.title}>
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
                          <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Location Won</Label>
                          <LocationWonInput form={form} />
                        </div>

                        <FormField
                            control={form.control}
                            name="fellowshipId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assign to Group</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                                        <FormControl>
                                            <SelectTrigger className="text-base h-auto">
                                                <SelectValue placeholder={!fellowships ? "Loading groups..." : "Select a fellowship or association"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {sortedFellowships?.map((f) => (
                                                <SelectItem key={f.id} value={f.id}>
                                                    <div className="flex flex-col py-1 text-left">
                                                        <span className="font-medium">{f.name}</span>
                                                        {f.location && <span className="text-xs text-muted-foreground">{f.location}</span>}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="john.doe@example.com" {...field} value={field.value || ""} className="text-base"/>
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
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                                <Input placeholder="+1 123 456 7890" {...field} value={field.value || ""} className="text-base"/>
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
                            <FormLabel>Church and Address</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., New Life Church" {...field} value={field.value || ""} className="text-base"/>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="initialNote"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Initial Note</FormLabel>
                            <FormControl>
                                <Textarea placeholder="e.g., Met at the park, prayed together..." {...field} value={field.value || ""} className="text-base"/>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>

        <Button type="submit" className="w-full" disabled={isLoading || userLoading || profileLoading}>
          {(isLoading || userLoading || profileLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Log Soul
        </Button>
      </form>
    </Form>
  );
}
