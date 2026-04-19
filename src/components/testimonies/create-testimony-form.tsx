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
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { TestimonyCategory, Campaign, UserProfile, PrayerRequest } from "@/lib/types";
import { useUser, useFirestore } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, runTransaction } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";

const testimonyCategories: TestimonyCategory[] = ['Healing', 'Financial Breakthrough', 'Salvation', 'Relationships', 'Deliverance', 'General'];

const formSchema = z.object({
  category: z.string({ required_error: "Please select a category." }),
  content: z.string().min(50, "Testimony must be at least 50 characters.").max(5000, "Testimony is too long."),
});

type CreateTestimonyFormProps = {
  onTestimonyCreated: () => void;
  userProfile: UserProfile;
  campaign?: Campaign;
  prayerRequest?: PrayerRequest | null;
};

export function CreateTestimonyForm({ onTestimonyCreated, userProfile, campaign, prayerRequest }: CreateTestimonyFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useUser();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    },
  });

  useEffect(() => {
    if (prayerRequest) {
      form.reset({
        category: testimonyCategories.includes(prayerRequest.category as TestimonyCategory) ? prayerRequest.category : 'General',
        content: `I prayed for: "${prayerRequest.content}"\n\nAnd God answered! Here's what happened...`
      });
    } else {
      // Reset for a blank testimony
      form.reset({
        category: undefined,
        content: ""
      });
    }
  }, [prayerRequest, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore || !userProfile) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to share a testimony.'});
      return;
    }

    setIsSubmitting(true);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const testimonyCollectionRef = collection(firestore, "testimonies");
            const newTestimonyDocRef = doc(testimonyCollectionRef); // Create ref beforehand

            const testimonyData: any = {
                authorId: user.uid,
                authorFirstName: userProfile.firstName || 'Anonymous',
                authorLastName: userProfile.lastName || '',
                authorAvatarUrl: userProfile.photoURL || null,
                content: values.content,
                createdAt: serverTimestamp(),
                category: values.category as TestimonyCategory,
                supporters: [],
            };

            if (userProfile.location) {
                testimonyData.authorLocation = userProfile.location;
            }

            if (campaign) {
                testimonyData.campaignId = campaign.id;
                testimonyData.campaignTitle = campaign.title;
            }
            
            if (prayerRequest) {
                testimonyData.answeredPrayerId = prayerRequest.id;
                testimonyData.answeredPrayerContent = prayerRequest.content;
            }
            
            transaction.set(newTestimonyDocRef, testimonyData);

            if (prayerRequest) {
                const prayerRef = doc(firestore, 'prayerRequests', prayerRequest.id);
                // The transaction will fail if the prayer request doesn't exist or if security rules fail.
                // We don't need a separate get() because security rules operate on the `resource` variable.
                transaction.update(prayerRef, {
                    status: 'answered',
                    answeredTestimonyId: newTestimonyDocRef.id
                });
            }
        });

      toast({
          title: "Testimony Submitted!",
          description: "Thank you for sharing. Your testimony is now live.",
      });
      
      onTestimonyCreated();
    } catch (error: any) {
        console.error("Submission error:", error);
        // Firebase permission errors have a specific code
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: 'Transaction: Create Testimony & Update Prayer Request',
                operation: 'write',
                requestResourceData: { action: 'Share answered prayer', values }
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        } else {
             toast({
                variant: "destructive",
                title: "Submission Error",
                description: error.message || "An unexpected error occurred. Please try again.",
            });
        }
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!!prayerRequest}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category for your testimony" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {testimonyCategories.map(cat => (
                       <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {prayerRequest && (
                    <FormDescription>
                        Category inherited from the original prayer request.
                    </FormDescription>
                )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Testimony</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share the details of what God has done..."
                  className="min-h-[150px] text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Submitting...' : 'Submit Testimony'}
        </Button>
      </form>
    </Form>
  );
}
