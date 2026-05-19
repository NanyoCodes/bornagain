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
import { useState, useMemo, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { Soul, Campaign, Fellowship } from "@/lib/types";
import { format } from "date-fns";
import { useFirestore, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, runTransaction, increment, addDoc } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { haversineDistance, safeToDate } from "@/lib/utils";
import { LocationWonInput } from "./location-won-input";

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
  wonAt: z.date({
    required_error: "A date is required.",
  }),
  fellowshipId: z.string().optional().nullable(),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: soul.firstName || "",
      lastName: soul.lastName || "",
      email: soul.email || "",
      phone: soul.phone || "",
      church: soul.church || "",
      locationWonCity: soul.locationWon?.city || "",
      locationWonState: soul.locationWon?.state || "",
      locationWonCountry: soul.locationWon?.country || "",
      locationWonLatitude: soul.locationWon?.latitude ?? null,
      locationWonLongitude: soul.locationWon?.longitude ?? null,
      source: soul.source || "Personal",
      sourceDetails: soul.sourceDetails || "",
      wonAt: safeToDate(soul.wonAt) ?? new Date(),
      fellowshipId: soul.fellowshipId || null,
    },
  });

  const { reset, control } = form;
  const lastSoulId = useRef(soul.id);

  useEffect(() => {
    if (soul.id !== lastSoulId.current) {
        reset({
            firstName: soul.firstName || "",
            lastName: soul.lastName || "",
            email: soul.email || "",
            phone: soul.phone || "",
            church: soul.church || "",
            locationWonCity: soul.locationWon?.city || "",
            locationWonState: soul.locationWon?.state || "",
            locationWonCountry: soul.locationWon?.country || "",
            locationWonLatitude: soul.locationWon?.latitude ?? null,
            locationWonLongitude: soul.locationWon?.longitude ?? null,
            source: soul.source || "Personal",
            sourceDetails: soul.sourceDetails || "",
            wonAt: safeToDate(soul.wonAt) ?? new Date(),
            fellowshipId: soul.fellowshipId || null,
        });
        lastSoulId.current = soul.id;
    }
  }, [soul.id, reset, soul]);
  
  const sourceValue = useWatch({ control, name: "source" });
  const watchedLat = useWatch({ control, name: "locationWonLatitude" });
  const watchedLng = useWatch({ control, name: "locationWonLongitude" });

  useEffect(() => {
    if (sourceValue !== 'Campaign') {
        form.setValue('sourceDetails', '');
    }
  }, [sourceValue, form]);

  const sortedFellowships = useMemo(() => {
    if (!fellowships || fellowships.length === 0) return [];
    
    const baseList = [...fellowships];
    if (typeof watchedLat !== 'number' || typeof watchedLng !== 'number') {
        return baseList.sort((a, b) => a.name.localeCompare(b.name));
    }

    return baseList
        .map(f => {
            const distance = f.latitude && f.longitude
                ? haversineDistance({ lat: watchedLat, lng: watchedLng }, { lat: f.latitude, lng: f.longitude })
                : Infinity;
            return { ...f, distance };
        })
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [fellowships, watchedLat, watchedLng]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Not Authenticated" });
      return;
    }
    setIsLoading(true);

    const soulRef = doc(firestore, `users/${soul.userId}/souls`, soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);

    const soulUpdateData: { [key: string]: any } = {
      firstName: values.firstName,
      lastName: values.lastName,
      source: values.source as 'Personal' | 'Campaign',
      wonAt: values.wonAt,
      updatedAt: serverTimestamp(),
      email: values.email || null,
      phone: values.phone || null,
      church: values.church || null,
      sourceDetails: values.sourceDetails || null,
    };

    if (values.fellowshipId && values.fellowshipId !== 'none') {
        const selectedFellowship = fellowships?.find(f => f.id === values.fellowshipId);
        soulUpdateData.fellowshipId = values.fellowshipId;
        soulUpdateData.fellowshipName = selectedFellowship?.name || null;
    } else {
        soulUpdateData.fellowshipId = null;
        soulUpdateData.fellowshipName = null;
    }
    
    soulUpdateData.locationWon = {
      city: values.locationWonCity || null,
      state: values.locationWonState || null,
      country: values.locationWonCountry || null,
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
        await runTransaction(firestore, async (transaction) => {
            const oldFellowshipId = soul.fellowshipId;
            const newFellowshipId = (values.fellowshipId === 'none' || !values.fellowshipId) ? '' : values.fellowshipId;
            
            let oldFellowshipDoc = null;
            let newFellowshipDoc = null;

            if (oldFellowshipId && oldFellowshipId !== 'none' && oldFellowshipId !== '' && oldFellowshipId !== newFellowshipId) {
                const oldFellowshipRef = doc(firestore, "fellowships", oldFellowshipId);
                oldFellowshipDoc = await transaction.get(oldFellowshipRef);
            }
            
            if (newFellowshipId && newFellowshipId !== 'none' && newFellowshipId !== '' && newFellowshipId !== oldFellowshipId) {
                const newFellowshipRef = doc(firestore, "fellowships", newFellowshipId);
                newFellowshipDoc = await transaction.get(newFellowshipRef);
                if (!newFellowshipDoc.exists()) {
                    throw new Error("Target fellowship group not found.");
                }
            }

            if (oldFellowshipDoc?.exists()) {
                transaction.update(oldFellowshipDoc.ref, { memberCount: increment(-1) });
            }
            if (newFellowshipDoc?.exists()) {
                transaction.update(newFellowshipDoc.ref, { memberCount: increment(1) });
            }

            transaction.update(soulRef, soulUpdateData);
            transaction.update(globalSoulRef, soulUpdateData);
        });

        const wasNewlyAssigned = values.fellowshipId && values.fellowshipId !== 'none' && values.fellowshipId !== '' && values.fellowshipId !== soul.fellowshipId;
        if (wasNewlyAssigned) {
            const selectedFellowship = fellowships?.find(f => f.id === values.fellowshipId);
            if (selectedFellowship && selectedFellowship.organizerId !== user.uid) {
                const notificationRef = collection(firestore, `users/${selectedFellowship.organizerId}/notifications`);
                const contactInfo = values.email || values.phone;
                addDoc(notificationRef, {
                    userId: selectedFellowship.organizerId,
                    type: 'new_soul_in_fellowship',
                    title: `New Member in ${selectedFellowship.name}`,
                    message: `${values.firstName} ${values.lastName} was assigned to your fellowship. Please reach out to them${contactInfo ? ` at ${contactInfo}` : ''}.`,
                    link: `/dashboard/fellowship`,
                    isRead: false,
                    createdAt: serverTimestamp(),
                }).catch(err => console.warn("Failed to send assignment notification", err));
            }
        }
        
        toast({
            title: "Soul Updated",
            description: "Record has been updated successfully.",
        });

        onSoulUpdated();

    } catch (error: any) {
      console.error("Failed to update soul record:", error);
      if (error.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: soulRef.path,
            operation: 'update',
            requestResourceData: soulUpdateData,
          }, user);
          errorEmitter.emit('permission-error', permissionError);
      } else {
          toast({
              variant: "destructive",
              title: "Update Failed",
              description: error.message || "An unexpected error occurred. Please try again."
          });
      }
    } finally {
        setIsLoading(false);
    }
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
                    <Input placeholder="John" {...field} value={field.value ?? ""} className="text-base"/>
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
                    <Input placeholder="Doe" {...field} value={field.value ?? ""} className="text-base"/>
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
              <Select onValueChange={field.onChange} value={field.value || ""}>
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
                <Select onValueChange={field.onChange} value={field.value || ""}>
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
                                    <Select onValueChange={field.onChange} value={field.value || "none"}>
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
                                    <Input placeholder="john.doe@example.com" {...field} value={field.value ?? ''} className="text-base"/>
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
                                    <Input placeholder="+1 123 456 7890" {...field} value={field.value ?? ''} className="text-base"/>
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
                                    <Input placeholder="e.g., New Life Church" {...field} value={field.value ?? ''} className="text-base"/>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <div className="space-y-2">
                            <FormLabel>Location Won</FormLabel>
                            <LocationWonInput form={form} />
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}