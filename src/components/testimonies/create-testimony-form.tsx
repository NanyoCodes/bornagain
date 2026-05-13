
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { TestimonyCategory, Campaign, UserProfile, PrayerRequest } from "@/lib/types";
import { useUser, useFirestore } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, runTransaction } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Card, CardHeader, CardDescription } from "@/components/ui/card";

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
    defaultValues: { content: "", category: undefined },
  });

  useEffect(() => {
    if (prayerRequest) {
      form.reset({
        category: testimonyCategories.includes(prayerRequest.category as TestimonyCategory) ? prayerRequest.category : 'General',
        content: ""
      });
    } else if (campaign) {
      form.reset({ category: 'Salvation', content: "" });
    }
  }, [prayerRequest, campaign, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore || !userProfile) return;
    setIsSubmitting(true);
    
    const testimonyData: any = {
        authorId: user.uid,
        authorFirstName: userProfile.firstName,
        authorLastName: userProfile.lastName,
        authorAvatarUrl: userProfile.photoURL || null,
        content: values.content,
        createdAt: serverTimestamp(),
        category: values.category as TestimonyCategory,
        supporters: [],
    };
    if (campaign) { testimonyData.campaignId = campaign.id; testimonyData.campaignTitle = campaign.title; }
    if (prayerRequest) { testimonyData.answeredPrayerId = prayerRequest.id; testimonyData.answeredPrayerContent = prayerRequest.content; }
    
    try {
        const result = await runTransaction(firestore, async (transaction) => {
            const newDocRef = doc(collection(firestore, "testimonies"));
            if (prayerRequest) {
              const prayerRef = doc(firestore, 'prayerRequests', prayerRequest.id);
              const prayerDoc = await transaction.get(prayerRef);
              if (!prayerDoc.exists() || prayerDoc.data().status !== 'pending') return "ALREADY_ANSWERED";
              transaction.update(prayerRef, { status: 'answered', answeredTestimonyId: newDocRef.id });
            }
            transaction.set(newDocRef, testimonyData);
            return "SUCCESS";
        });

        if (result === "ALREADY_ANSWERED") {
            toast({ title: "Already Shared", description: "This prayer already has a testimony." });
        } else {
            toast({ title: "Testimony Submitted!" });
        }
        onTestimonyCreated();
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'testimonies', operation: 'create' }, user));
        } else {
             toast({ variant: "destructive", title: "Error", description: "Failed to share testimony." });
        }
    } finally { setIsSubmitting(false); }
  }

  return (
    <div className="space-y-4">
      {prayerRequest && (
        <Card className="bg-muted/50"><CardHeader className="p-4"><CardDescription>Answering prayer: "{prayerRequest.content.substring(0, 100)}..."</CardDescription></CardHeader></Card>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!prayerRequest}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                    <SelectContent>{testimonyCategories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                  </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem>
                <FormLabel>Your Testimony</FormLabel>
                <FormControl><Textarea placeholder="What has God done?" className="min-h-[150px]" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Testimony
          </Button>
        </form>
      </Form>
    </div>
  );
}
