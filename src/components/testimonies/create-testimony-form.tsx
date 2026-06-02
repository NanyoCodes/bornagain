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
import { collection, serverTimestamp, doc, runTransaction } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Card, CardHeader, CardDescription } from "@/components/ui/card";

const testimonyCategories: TestimonyCategory[] = [
  'Healing', 
  'Financial Breakthrough', 
  'Salvation', 
  'Relationships', 
  'Deliverance', 
  'Academic Success', 
  'Employment', 
  'Family', 
  'Protection', 
  'Mental Health', 
  'Global Missions', 
  'Business Growth', 
  'General'
];

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
    
    try {
      const testimonyData: any = {
          authorId: user.uid,
          authorFirstName: userProfile.firstName,
          authorLastName: userProfile.lastName,
          authorAvatarUrl: userProfile.photoURL || null,
          authorLocation: userProfile.location ? {
            city: userProfile.location.city || null,
            country: userProfile.location.country || null,
            latitude: userProfile.location.latitude ?? null,
            longitude: userProfile.location.longitude ?? null,
          } : null,
          content: values.content,
          createdAt: serverTimestamp(),
          category: values.category as TestimonyCategory,
          supporters: [],
          inspiredBy: [],
          connectedBy: [],
      };

      if (campaign) { testimonyData.campaignId = campaign.id; testimonyData.campaignTitle = campaign.title; }
      if (prayerRequest) { testimonyData.answeredPrayerId = prayerRequest.id; testimonyData.answeredPrayerContent = prayerRequest.content; }
      
      const result = await runTransaction(firestore, async (transaction) => {
          const newDocRef = doc(collection(firestore, "testimonies"));
          if (prayerRequest) {
            const prayerRef = doc(firestore, 'prayerRequests', prayerRequest.id);
            const prayerDoc = await transaction.get(prayerRef);
            if (!prayerDoc.exists() || prayerDoc.data().status !== 'pending') {
                return "ALREADY_ANSWERED";
            }
            transaction.update(prayerRef, { status: 'answered', answeredTestimonyId: newDocRef.id });
          }
          transaction.set(newDocRef, testimonyData);
          return "SUCCESS";
      });

      if (result === "ALREADY_ANSWERED") {
          toast({
              title: "Already Answered",
              description: "A testimony has already been shared for this prayer request.",
          });
      } else {
          toast({ title: "Testimony Shared!", description: "God is indeed faithful." });
      }
      onTestimonyCreated();
    } catch (error: any) {
        console.error("Submission error:", error);
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'testimonies', operation: 'create' }, user));
        } else {
             toast({ variant: "destructive", title: "Error", description: error.message || "Failed to share testimony. Please try again." });
        }
    } finally { setIsSubmitting(false); }
  }

  return (
    <div className="space-y-6">
      {prayerRequest && (
        <Card className="bg-primary/5 border-primary/20 rounded-2xl">
          <CardHeader className="p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Answering prayer:</div>
            <CardDescription className="italic text-sm text-muted-foreground line-clamp-2 leading-relaxed">&ldquo;{prayerRequest.content}&rdquo;</CardDescription>
          </CardHeader>
        </Card>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-2xl border-2">
                        <SelectValue placeholder="Share your testimony" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl">
                      {testimonyCategories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                    </SelectContent>
                  </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Your Story</FormLabel>
                <FormControl>
                  <Textarea placeholder="Share what the Lord has done..." className="min-h-[180px] rounded-[2rem] p-6 text-base leading-relaxed bg-muted/10 border-2 border-dashed" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 tracking-widest uppercase" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? 'SUBMITTING miracle...' : 'PUBLISH TESTIMONY'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
