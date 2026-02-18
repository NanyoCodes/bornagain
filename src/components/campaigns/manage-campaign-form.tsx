
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import type { Campaign, CampaignParticipant } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Skeleton } from '../ui/skeleton';

const formSchema = z.object({
  progress: z.number().min(0).max(100),
  description: z.string().min(3, "Description is too short.").max(5000, "Description is too long."),
  lastUpdateReason: z.string().min(10, { message: "Please provide a reason of at least 10 characters." }),
});

type ManageCampaignFormProps = {
  campaign: Campaign;
  onCampaignUpdated: () => void;
};

function ParticipantList({ campaignId }: { campaignId: string }) {
  const firestore = useFirestore();
  const participantsQuery = collection(firestore, 'campaigns', campaignId, 'participants');
  const { data: participants, loading } = useCollection<CampaignParticipant>(participantsQuery);

  if (loading) {
    return (
        <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
        </div>
    )
  }

  return (
    <div className="space-y-4">
        <h3 className="text-lg font-semibold">Participants ({participants?.length || 0})</h3>
        {participants && participants.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 border rounded-lg p-4">
                {participants.map(p => (
                    <div key={p.id} className="flex items-center justify-between">
                        <span className='font-medium'>{p.displayName}</span>
                        <a href={`mailto:${p.email}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5">
                           <Mail className="h-4 w-4" /> {p.email}
                        </a>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-sm text-muted-foreground">No one has joined this campaign yet.</p>
        )}
    </div>
  )
}


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
      lastUpdateReason: "",
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
        lastUpdateReason: values.lastUpdateReason,
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
    <div className="space-y-8">
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
                <FormField
                control={form.control}
                name="lastUpdateReason"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Reason for Update</FormLabel>
                    <FormControl>
                        <Textarea placeholder="e.g., Updated progress after event" {...field} className="text-base" />
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

        <Separator />

        <ParticipantList campaignId={campaign.id} />
    </div>
  );
}
