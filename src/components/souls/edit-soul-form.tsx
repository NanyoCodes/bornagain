
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
import type { Soul, Campaign, Fellowship } from "@/lib/types";
import { format } from "date-fns";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc, addDoc, deleteField, runTransaction, increment } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters."),
  lastName: z.string().min(2, "Last name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address.").optional().or(z.literal('')),
  phone: z.string().optional(),
  church: z.string().optional(),
  locationWonCity: z.string().optional(),
  locationWonState: z.string().optional(),
  locationWonCountry: z.string().optional(),
  source: z.string({ required_error: "Please select a source." }),
  sourceDetails: z.string().optional(),
  wonAt: z.date({
    required_error: "A date is required.",
  }),
  fellowshipId: z.string().optional(),
});

type EditSoulFormProps = {
  soul: Soul;
  onSoulUpdated: () => void;
  fellowships: Fellowship[];
  campaigns: Campaign[];
};

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
      source: soul.source || "Personal",
      sourceDetails: soul.sourceDetails || "",
      wonAt: soul.wonAt.toDate(),
      fellowshipId: soul.fellowshipId || "",
    },
  });

  // This useEffect will reset the form with new `soul` data when the prop changes.
  useEffect(() => {
    form.reset({
      firstName: soul.firstName || "",
      lastName: soul.lastName || "",
      email: soul.email || "",
      phone: soul.phone || "",
      church: soul.church || "",
      locationWonCity: soul.locationWon?.city || "",
      locationWonState: soul.locationWon?.state || "",
      locationWonCountry: soul.locationWon?.country || "",
      source: soul.source || "Personal",
      sourceDetails: soul.sourceDetails || "",
      wonAt: soul.wonAt.toDate(),
      fellowshipId: soul.fellowshipId || "",
    });
  }, [soul, form]);
  
  const sourceValue = form.watch("source");
  useEffect(() => {
    if (sourceValue !== 'Campaign') {
        form.setValue('sourceDetails', '');
    }
  }, [sourceValue, form]);

  const watchedLocationCity = form.watch('locationWonCity');

  const sortedFellowships = useMemo(() => {
    if (!fellowships || fellowships.length === 0) return [];
    if (!watchedLocationCity) return fellowships;

    const lowerCaseCity = watchedLocationCity.toLowerCase();
    
    return [...fellowships].sort((a, b) => {
        const aMatches = a.location?.toLowerCase().includes(lowerCaseCity) ?? false;
        const bMatches = b.location?.toLowerCase().includes(lowerCaseCity) ?? false;

        if (aMatches && !bMatches) return -1; // a comes first
        if (!aMatches && bMatches) return 1;  // b comes first
        return a.name.localeCompare(b.name); // otherwise, sort alphabetically
    });
  }, [fellowships, watchedLocationCity]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Not Authenticated" });
      return;
    }
    setIsLoading(true);

    const soulRef = doc(firestore, `users/${user.uid}/souls`, soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);

    const soulUpdateData: { [key: string]: any } = {
      firstName: values.firstName,
      lastName: values.lastName,
      source: values.source as 'Personal' | 'Campaign',
      wonAt: values.wonAt,
    };
    
    if (values.email) soulUpdateData.email = values.email; else soulUpdateData.email = deleteField();
    if (values.phone) soulUpdateData.phone = values.phone; else soulUpdateData.phone = deleteField();
    if (values.church) soulUpdateData.church = values.church; else soulUpdateData.church = deleteField();
    if (values.sourceDetails) soulUpdateData.sourceDetails = values.sourceDetails; else soulUpdateData.sourceDetails = deleteField();

    if (values.fellowshipId && values.fellowshipId !== 'none') {
        const selectedFellowship = fellowships?.find(f => f.id === values.fellowshipId);
        soulUpdateData.fellowshipId = values.fellowshipId;
        soulUpdateData.fellowshipName = selectedFellowship?.name;
    } else {
        soulUpdateData.fellowshipId = deleteField();
        soulUpdateData.fellowshipName = deleteField();
    }

    if (values.locationWonCity || values.locationWonState || values.locationWonCountry) {
        const locationWonData: { [key: string]: string } = {};
        if (values.locationWonCity) locationWonData.city = values.locationWonCity;
        if (values.locationWonState) locationWonData.state = values.locationWonState;
        if (values.locationWonCountry) locationWonData.country = values.locationWonCountry;
        soulUpdateData.locationWon = locationWonData;
    } else {
        soulUpdateData.locationWon = deleteField();
    }
    
    const isCampaignSource = values.source === 'Campaign';
    if (isCampaignSource) {
      const campaign = campaigns?.find(c => c.title === values.sourceDetails);
      if (campaign) {
          soulUpdateData.campaignId = campaign.id;
      } else {
          soulUpdateData.campaignId = deleteField(); 
      }
    } else {
        soulUpdateData.campaignId = deleteField();
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const oldFellowshipId = soul.fellowshipId;
            const newFellowshipId = values.fellowshipId;
            
            // Decrement old fellowship count if it exists and is different from the new one
            if (oldFellowshipId && oldFellowshipId !== newFellowshipId) {
                const oldFellowshipRef = doc(firestore, "fellowships", oldFellowshipId);
                transaction.update(oldFellowshipRef, { memberCount: increment(-1) });
            }

            // Increment new fellowship count if it's not 'none' and is different from the old one
            if (newFellowshipId && newFellowshipId !== 'none' && newFellowshipId !== oldFellowshipId) {
                const newFellowshipRef = doc(firestore, "fellowships", newFellowshipId);
                transaction.update(newFellowshipRef, { memberCount: increment(1) });
            }

            transaction.update(soulRef, soulUpdateData);
            transaction.update(globalSoulRef, soulUpdateData);
        });

        const wasNewlyAssigned = values.fellowshipId && values.fellowshipId !== 'none' && values.fellowshipId !== soul.fellowshipId;
        if (wasNewlyAssigned) {
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
        
        toast({
            title: "Soul Updated",
            description: `${values.firstName} ${values.lastName}'s record has been updated.`,
        });

        if (!soul.email && values.email) {
            const mailCollectionRef = collection(firestore, 'mail');
            const appUrl = window.location.origin;
            const inviterName = user.displayName || 'A friend';
            const logo = PlaceHolderImages.find(img => img.id === 'logo');
            const logoUrl = logo ? logo.imageUrl : '';

            await addDoc(mailCollectionRef, {
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
                              <a href="${appUrl}" style="background-color: #3b82f6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">Join Testify</a>
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
            });
            toast({
                title: 'Invitation Sent!',
                description: `An invitation email has been sent to ${values.email}.`
            });
        }
        
        onSoulUpdated();

    } catch (error) {
      console.error("Failed to update soul record:", error);
      const permissionError = new FirestorePermissionError({
        path: soulRef.path,
        operation: 'update',
        requestResourceData: soulUpdateData,
      }, user);
      errorEmitter.emit('permission-error', permissionError);
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                               <FormField
                                control={form.control}
                                name="locationWonCity"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormControl>
                                        <Input placeholder="City" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                                <FormField
                                control={form.control}
                                name="locationWonState"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormControl>
                                        <Input placeholder="State/Province" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                                <FormField
                                control={form.control}
                                name="locationWonCountry"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormControl>
                                        <Input placeholder="Country" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
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
