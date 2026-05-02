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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { Campaign, Soul, UserProfile, Fellowship } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useFirestore, useUser, useDoc } from "@/firebase";
import { collection, serverTimestamp, doc, runTransaction, addDoc, increment } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { LocationWonInput } from "./location-won-input";
import { haversineDistance } from "@/lib/utils";

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
  fellowshipId: z.string().optional(),
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
      wonAt: undefined,
      fellowshipId: "",
    },
  });

  const sourceValue = form.watch("source");
  useEffect(() => {
    if (sourceValue !== 'Campaign') {
        form.setValue('sourceDetails', '');
    }
  }, [sourceValue, form.setValue]);

  useEffect(() => {
    if (!form.getValues('wonAt')) {
        form.setValue('wonAt', new Date());
    }
  }, [form]);
  
  const watchedLat = form.watch('locationWonLatitude');
  const watchedLng = form.watch('locationWonLongitude');

  const sortedFellowships = useMemo(() => {
    if (!fellowships || fellowships.length === 0) return [];
    
    if (typeof watchedLat !== 'number' || typeof watchedLng !== 'number') {
        return [...fellowships].sort((a, b) => a.name.localeCompare(b.name));
    }

    return [...fellowships]
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

    if (values.fellowshipId && values.fellowshipId !== 'none' && values.fellowshipId !== '') {
        const selectedFellowship = fellowships?.find(f => f.id === values.fellowshipId);
        soulData.fellowshipId = values.fellowshipId;
        soulData.fellowshipName = selectedFellowship?.name || null;
    } else {
        soulData.fellowshipId = null;
        soulData.fellowshipName = null;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            // --- ALL READS MUST HAPPEN FIRST ---
            let currentSoulsLogged = 0;
            if (campaignId) {
                const campaignRef = doc(firestore, 'campaigns', campaignId);
                const campaignDoc = await transaction.get(campaignRef);
                if (campaignDoc.exists()) {
                    currentSoulsLogged = campaignDoc.data().soulsLogged || 0;
                }
            }

            if (values.fellowshipId && values.fellowshipId !== 'none' && values.fellowshipId !== '') {
                const fellowshipRef = doc(firestore, 'fellowships', values.fellowshipId);
                const fellowshipDoc = await transaction.get(fellowshipRef);
                if (!fellowshipDoc.exists()) {
                    throw new Error("Fellowship group not found.");
                }
            }

            // --- ALL WRITES MUST HAPPEN LAST ---
            transaction.set(newSoulRef, soulData);
            transaction.set(globalSoulRef, soulData);

            if (campaignId) {
                const campaignRef = doc(firestore, 'campaigns', campaignId);
                transaction.update(campaignRef, { soulsLogged: currentSoulsLogged + 1 });
            }

            if (values.fellowshipId && values.fellowshipId !== 'none' && values.fellowshipId !== '') {
                const fellowshipRef = doc(firestore, 'fellowships', values.fellowshipId);
                transaction.update(fellowshipRef, { memberCount: increment(1) });
            }
        });

        if (values.fellowshipId && values.fellowshipId !== 'none' && values.fellowshipId !== '') {
            const selectedFellowship = fellowships?.find(f => f.id === values.fellowshipId);
            if (selectedFellowship && selectedFellowship.organizerId !== user.uid) {
                const notificationRef = collection(firestore, `users/${selectedFellowship.organizerId}/notifications`);
                const contactInfo = values.email || values.phone;
                await addDoc(notificationRef, {
                    userId: selectedFellowship.organizerId,
                    type: 'new_soul_in_fellowship',
                    title: `New Member in ${selectedFellowship.name}`,
                    message: `${values.firstName} ${values.lastName} was assigned to your fellowship. Please reach out to them${contactInfo ? ` at ${contactInfo}` : ''}.`,
                    link: `/dashboard/fellowship`,
                    isRead: false,
                    createdAt: serverTimestamp(),
                });
            }
        }

        if (values.email) {
            const logo = PlaceHolderImages.find(img => img.id === 'logo');
            const logoUrl = logo ? logo.imageUrl : '';
            const mailCollectionRef = collection(firestore, 'mail');
            const appUrl = window.location.origin;
            const inviterName = user.displayName || 'A friend';
            addDoc(mailCollectionRef, {
                to: [values.email],
                message: {
                    subject: `You're invited to join Testify!`,
                    html: `
                        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                          <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                            <div style="text-align: center; margin-bottom: 20px;">
                              <img src="${logoUrl}" alt="Testify Logo" style="width: 80px; height: 80px; border-radius: 8px;">
                              <h1 style="font-size: 24px; margin-top: 10px;">You're Invited to Testify</h1>
                            </div>
                            <p>Hi ${values.firstName},</p>
                            <p><strong>${inviterName}</strong> has invited you to join Testify, a platform for believers to share testimonies, organize soul-winning campaigns, and track evangelism progress.</p>
                            <p>Join the movement and start your journey today!</p>
                            <div style="text-align: center; margin: 30px 0;">
                              <a href="${appUrl}" style="background-color: #f97416; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">Join Testify</a>
                            </div>
                            <p>God bless,</p>
                            <p><strong>The Testify Team</strong></p>
                          </div>
                          <div style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
                            <p>&copy; Testify. All rights reserved.</p>
                          </div>
                        </div>
                    `,
                },
            }).catch(err => console.error("Failed to send invitation email:", err));
        }

        toast({
            title: "Soul Logged",
            description: "A new soul has been added.",
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

  if (!user || !userProfile) {
    return (
      <div className="text-center text-destructive p-8">
        <p>You must be logged in to perform this action.</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                    <Input placeholder="John" {...field} className="text-base"/>
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
                    <Input placeholder="Doe" {...field} className="text-base"/>
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
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!defaultCampaign}>
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
         {form.watch("source") === "Campaign" && (
            <FormField
              control={form.control}
              name="sourceDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Name</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!defaultCampaign}>
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
            <AccordionItem value="optional-details">
                <AccordionTrigger>Optional Details</AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="fellowshipId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assign to Fellowship</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="text-base h-auto">
                                                <SelectValue placeholder={!fellowships ? "Loading fellowships..." : "Select a fellowship group"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {sortedFellowships?.map((f) => (
                                                <SelectItem key={f.id} value={f.id}>
                                                    <div className="flex flex-col py-1">
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
                                <Input placeholder="john.doe@example.com" {...field} className="text-base"/>
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
                                <Input placeholder="+1 123 456 7890" {...field} className="text-base"/>
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
                                <Input placeholder="e.g., New Life Church" {...field} className="text-base"/>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <div className="space-y-2">
                            <FormLabel>Location Won</FormLabel>
                            <LocationWonInput form={form} />
                        </div>
                        <FormField
                        control={form.control}
                        name="initialNote"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Initial Note</FormLabel>
                            <FormControl>
                                <Textarea placeholder="e.g., Met at the park, prayed together..." {...field} className="text-base"/>
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
