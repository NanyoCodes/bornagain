
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { Campaign } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Textarea } from '../ui/textarea';

const formSchema = z.object({
  progress: z.number().min(0).max(100),
  description: z.string().min(3, "Description is too short.").max(5000, "Description is too long."),
});

type ManageCampaignFormProps = {
  campaign: Campaign;
  onCampaignUpdated: () => void;
};

export function ManageCampaignForm({ campaign, onCampaignUpdated }: ManageCampaignFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      progress: campaign.progress || 0,
      description: campaign.description || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in again.' });
      return;
    }
    if (user.uid !== campaign.organizerId) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'You can only manage your own campaigns.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const campaignRef = doc(firestore, 'campaigns', campaign.id);
      const updateData = {
        progress: values.progress,
        description: values.description,
      };

      await updateDoc(campaignRef, updateData).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: campaignRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError; // Re-throw
      });

      toast({
        title: 'Campaign Updated!',
        description: 'Your changes have been saved successfully.',
      });
      onCampaignUpdated();
    } catch (error: any) {
      console.error('Update error:', error);
       if (error.name !== 'FirestorePermissionError') {
         toast({
            variant: 'destructive',
            title: 'Update Error',
            description: error.message || 'An unexpected error occurred.',
          });
       }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Campaign description" {...field} className="text-base min-h-[120px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="progress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Progress: {field.value}%</FormLabel>
              <FormControl>
                <Slider
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(value[0])}
                  max={100}
                  step={1}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
