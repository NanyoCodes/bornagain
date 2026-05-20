
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { TestimonyCategory, UserProfile } from "@/lib/types";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

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
  content: z.string().min(20, "Prayer request must be at least 20 characters.").max(1000, "Prayer request is too long."),
  isAnonymous: z.boolean().default(true),
});

type CreatePrayerRequestFormProps = {
  onPrayerRequestCreated: () => void;
};

export function CreatePrayerRequestForm({ onPrayerRequestCreated }: CreatePrayerRequestFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
      isAnonymous: true,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore || !userProfile) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to share a prayer request.'});
      return;
    }

    setIsSubmitting(true);
    
    try {
      const prayerCollectionRef = collection(firestore, "prayerRequests");
      const prayerRequestData: any = {
          authorId: user.uid,
          content: values.content,
          createdAt: serverTimestamp(),
          category: values.category as TestimonyCategory,
          usersWhoPrayed: [],
          isAnonymous: values.isAnonymous,
          status: 'pending',
      };

      if (!values.isAnonymous) {
        prayerRequestData.authorFirstName = userProfile.firstName;
        prayerRequestData.authorLastName = userProfile.lastName;
        prayerRequestData.authorAvatarUrl = userProfile.photoURL || null;
      }
      
      await addDoc(prayerCollectionRef, prayerRequestData).catch((serverError) => {
          const permissionError = new FirestorePermissionError({
              path: prayerCollectionRef.path,
              operation: 'create',
              requestResourceData: prayerRequestData,
          }, user);
          errorEmitter.emit('permission-error', permissionError);
          throw permissionError;
      });

      toast({
          title: "Prayer Request Submitted!",
          description: "Your request has been shared with the community.",
      });
      
      onPrayerRequestCreated();
    } catch (error: any) {
        console.error("Submission error:", error);
        if (error.name !== 'FirestorePermissionError') {
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category for your request" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {testimonyCategories.map(cat => (
                       <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prayer Request</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share what you'd like the community to pray for..."
                  className="min-h-[150px] text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isAnonymous"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Make this a Confidential Request
                </FormLabel>
                <FormDescription>
                  If checked, your name and photo will be hidden.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Submitting...' : 'Submit Prayer Request'}
        </Button>
      </form>
    </Form>
  );
}
