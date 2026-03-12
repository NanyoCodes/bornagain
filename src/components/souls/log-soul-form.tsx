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
import type { Campaign, Soul, UserProfile } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useFirestore, useUser, useCollection, useDoc } from "@/firebase";
import { collection, query, orderBy, serverTimestamp, doc, runTransaction, addDoc } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters."),
  lastName: z.string().min(2, "Last name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address.").optional().or(z.literal('')),
  photoURL: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  phone: z.string().optional(),
  church: z.string().optional(),
  locationWonCity: z.string().optional(),
  locationWonState: z.string().optional(),
  locationWonCountry: z.string().optional(),
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
};

export function LogSoulForm({ onSoulLogged, defaultCampaign }: LogSoulFormProps) {
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);

  const userDocRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const campaignsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'campaigns'), orderBy('createdAt', 'desc'));
  }, [user?.uid, firestore]);
  const { data: campaigns, loading: loadingCampaigns } = useCollection<Campaign>(campaignsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      photoURL: "",
      phone: "",
      church: "",
      locationWonCity: "",
      locationWonState: "",
      locationWonCountry: "",
      source: defaultCampaign ? "Campaign" : "Personal",
      sourceDetails: defaultCampaign ? defaultCampaign.title : "",
      initialNote: "",
      wonAt: undefined,
    },
  });

  useEffect(() => {
    // Set default date on client to avoid hydration mismatch
    if (!form.getValues('wonAt')) {
        form.setValue('wonAt', new Date());
    }
  }, [form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (userLoading || profileLoading) {
      toast({ variant: 'destructive', title: 'Please wait', description: 'User data is loading.' });
      return;
    }
    if (!user || !firestore || !userProfile) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to log a soul.' });
      return;
    }
    setIsLoading(true);
    
    const soulsCollectionRef = collection(firestore, `users/${user.uid}/souls`);
    const newSoulRef = doc(soulsCollectionRef); // Create a reference for the new soul
    const globalSoulRef = doc(firestore, 'souls', newSoulRef.id);

    const processedUserLocation = userProfile?.location ? {
        city: userProfile.location.city || "",
        country: userProfile.location.country || "",
        city_lowercase: (userProfile.location.city || "").toLowerCase(),
        country_lowercase: (userProfile.location.country || "").toLowerCase(),
    } : undefined;

    const soulData: Omit<Soul, 'id'> = {
      userId: user.uid,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      photoURL: values.photoURL,
      phone: values.phone,
      church: values.church,
      locationWon: (values.locationWonCity || values.locationWonState || values.locationWonCountry)
        ? {
            city: values.locationWonCity,
            state: values.locationWonState,
            country: values.locationWonCountry,
          }
        : undefined,
      source: values.source as 'Personal' | 'Campaign',
      sourceDetails: values.sourceDetails,
      userLocation: processedUserLocation,
      wonAt: values.wonAt as any, // Firestore will convert it
      status: "New",
      followUpLog: values.initialNote ? [{ date: serverTimestamp() as any, note: values.initialNote }] : [],
      attendingChurch: false,
      inBibleStudy: false,
      attendingPrayer: false,
      inServiceDepartment: false,
    };
    
    const isCampaignSource = values.source === 'Campaign';
    let campaignId: string | undefined;

    if (isCampaignSource) {
      const campaign = defaultCampaign || campaigns?.find(c => c.title === values.sourceDetails);
      if (campaign) {
          campaignId = campaign.id;
          soulData.campaignId = campaign.id;
      }
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            transaction.set(newSoulRef, soulData);
            transaction.set(globalSoulRef, soulData);

            if (campaignId) {
                const campaignRef = doc(firestore, 'campaigns', campaignId);
                const campaignDoc = await transaction.get(campaignRef);
                if (!campaignDoc.exists()) {
                    throw new Error("Campaign does not exist!");
                }
                const currentSoulsLogged = campaignDoc.data().soulsLogged || 0;
                transaction.update(campaignRef, { soulsLogged: currentSoulsLogged + 1 });
            }
        });

        if (values.email) {
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
                              <img src="https://i.postimg.cc/5HnLbRH6/testify-logoo-(2).jpg" alt="Testify Logo" style="width: 80px; height: 80px; border-radius: 8px;">
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
            }).then(() => {
                toast({
                    title: 'Invitation Sent!',
                    description: `An invitation email has been sent to ${values.email}.`
                });
            }).catch(err => console.error("Failed to send invitation email:", err));
        }

        toast({
            title: "Soul Logged",
            description: `${values.firstName} ${values.lastName} has been added to your list.`,
        });
        onSoulLogged();
    } catch (serverError) {
        const permissionError = new FirestorePermissionError({
            path: `TRANSACTION:LOG_SOUL`,
            operation: 'write',
            requestResourceData: { soulData, campaignId },
        });
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
                        <SelectValue placeholder={loadingCampaigns ? "Loading campaigns..." : "Select from your campaigns"} />
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
                            name="photoURL"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Photo URL</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://..." {...field} className="text-base"/>
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
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                               <FormField
                                control={form.control}
                                name="locationWonCity"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormControl>
                                        <Input placeholder="City" {...field} />
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
                                        <Input placeholder="State/Province" {...field} />
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
                                        <Input placeholder="Country" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
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
