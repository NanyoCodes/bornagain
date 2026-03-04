
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
import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { Soul, Campaign } from "@/lib/types";
import { format } from "date-fns";
import { useFirestore, useUser, useCollection } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc, addDoc } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address.").optional().or(z.literal('')),
  phone: z.string().optional(),
  church: z.string().optional(),
  locationWon: z.string().optional(),
  source: z.string({ required_error: "Please select a source." }),
  sourceDetails: z.string().optional(),
  wonAt: z.date({
    required_error: "A date is required.",
  }),
});

type EditSoulFormProps = {
  soul: Soul;
  onSoulUpdated: () => void;
};

export function EditSoulForm({ soul, onSoulUpdated }: EditSoulFormProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);

  const campaignsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'campaigns'), orderBy('createdAt', 'desc'));
  }, [user?.uid, firestore]);
  const { data: campaigns, loading: loadingCampaigns } = useCollection<Campaign>(campaignsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: soul.name || "",
      email: soul.email || "",
      phone: soul.phone || "",
      church: soul.church || "",
      locationWon: soul.locationWon || "",
      source: soul.source || "Personal",
      sourceDetails: soul.sourceDetails || "",
      wonAt: soul.wonAt.toDate(),
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Not Authenticated" });
      return;
    }
    setIsLoading(true);

    const soulRef = doc(firestore, `users/${user.uid}/souls`, soul.id);

    const soulUpdateData: Partial<Soul> = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      church: values.church,
      locationWon: values.locationWon,
      source: values.source as 'Personal' | 'Campaign' | 'Referral',
      sourceDetails: values.sourceDetails,
      wonAt: values.wonAt as any,
    };
    
    const isCampaignSource = values.source === 'Campaign';
    let campaignId: string | undefined;

    if (isCampaignSource) {
      const campaign = campaigns?.find(c => c.title === values.sourceDetails);
      if (campaign) {
          campaignId = campaign.id;
          soulUpdateData.campaignId = campaign.id;
      } else {
          soulUpdateData.campaignId = undefined;
      }
    } else {
        soulUpdateData.campaignId = undefined;
    }
    
    updateDoc(soulRef, soulUpdateData).then(() => {
        toast({
            title: "Soul Updated",
            description: `${values.name}'s record has been updated.`,
        });

        // Send invite if email was just added
        if (!soul.email && values.email) {
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
                            <p>Hi ${values.name},</p>
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
            }).catch(err => console.error("Failed to send invitation email:", err));
        }

        onSoulUpdated();
    }).catch(() => {
      const permissionError = new FirestorePermissionError({
        path: soulRef.path,
        operation: 'update',
        requestResourceData: soulUpdateData,
      });
      errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
      setIsLoading(false);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} className="text-base"/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (Optional)</FormLabel>
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
              <FormLabel>Phone Number (Optional)</FormLabel>
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
              <FormLabel>Church (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., New Life Church" {...field} className="text-base"/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="locationWon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location Won (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., City Park, Nairobi" {...field} className="text-base"/>
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
                  <SelectItem value="Referral">Referral</SelectItem>
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
        {form.watch("source") === "Referral" && (
          <FormField
            control={form.control}
            name="sourceDetails"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referred By</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Jane Smith" {...field} className="text-base"/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
    
