
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
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { Campaign, Soul } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  contact: z.string().optional(),
  source: z.string({ required_error: "Please select a source." }),
  sourceDetails: z.string().optional(),
  initialNote: z.string().optional(),
  wonAt: z.coerce.date({
    required_error: "A date is required.",
  }),
});

type LogSoulFormProps = {
  onSoulLogged: () => void;
  campaigns: Campaign[];
  campaign?: Campaign;
};

export function LogSoulForm({ onSoulLogged, campaigns, campaign }: LogSoulFormProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      contact: "",
      source: campaign ? "Campaign" : "Personal",
      sourceDetails: campaign ? campaign.title : "",
      initialNote: "",
      wonAt: new Date(),
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Not Authenticated", description: "You must be logged in to log a soul." });
      return;
    }
    setIsLoading(true);
    
    try {
      const soulsCollectionRef = collection(firestore, `users/${user.uid}/souls`);
      const soulData: Omit<Soul, 'id'> = {
        userId: user.uid,
        name: values.name,
        contact: values.contact,
        source: values.source as 'Personal' | 'Campaign' | 'Referral',
        sourceDetails: values.sourceDetails,
        wonAt: values.wonAt as any, // Firestore will convert it
        status: "New",
        followUpLog: values.initialNote ? [{ date: new Date() as any, note: values.initialNote }] : [],
        attendingChurch: false,
        inBibleStudy: false,
        attendingPrayer: false,
      };

      await addDoc(soulsCollectionRef, soulData).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: soulsCollectionRef.path,
          operation: 'create',
          requestResourceData: soulData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
      });

      toast({
        title: "Soul Logged",
        description: `${values.name} has been added to your list.`,
      });
      onSoulLogged();
    } catch(error: any) {
      console.error("Error logging soul: ", error);
      if (error.name !== 'FirestorePermissionError') {
        toast({ variant: 'destructive', title: "Error", description: "Could not log soul." });
      }
    } finally {
        setIsLoading(false);
    }
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
                  className="text-base"
                  value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                  onChange={field.onChange}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Info (Email or Phone)</FormLabel>
              <FormControl>
                <Input placeholder="john.doe@example.com" {...field} className="text-base"/>
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
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!campaign}>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!campaign}>
                    <FormControl>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Select from your campaigns" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.title}>
                          {campaign.title}
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
        <FormField
          control={form.control}
          name="initialNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Note (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Met at the park, prayed together..." {...field} className="text-base"/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Log Soul
        </Button>
      </form>
    </Form>
  );
}
