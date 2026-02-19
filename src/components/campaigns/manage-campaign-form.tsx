
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Campaign, CampaignParticipant } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Skeleton } from '../ui/skeleton';
import { Input } from '../ui/input';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { query } from 'firebase/firestore';


const formSchema = z.object({
  title: z.string().min(3, "Title is too short.").max(100, "Title is too long."),
  description: z.string().min(3, "Description is too short.").max(5000, "Description is too long."),
  goal: z.string().min(3, "Goal is too short.").max(100, "Goal is too long."),
  city: z.string().min(2, "City is too short.").max(50, "City is too long."),
  country: z.string().min(2, "Country is too short.").max(50, "Country is too long."),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  startTime: z.string().min(1, "A start time is required."),
  endTime: z.string().min(1, "An end time is required."),
  scripture: z.string().max(100, "Scripture is too long.").optional(),
  lastUpdateReason: z.string().min(10, { message: "Please provide a reason of at least 10 characters." }),
}).refine((data) => data.endDate >= data.startDate, {
    message: "End date cannot be before start date.",
    path: ["endDate"],
});


type ManageCampaignFormProps = {
  campaign: Campaign;
  onCampaignUpdated: () => void;
};

function ParticipantList({ campaignId }: { campaignId: string }) {
  const firestore = useFirestore();
  const participantsQuery = firestore ? query(collection(firestore, 'campaigns', campaignId, 'participants')) : null;
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
                        {p.email && (
                            <a href={`mailto:${p.email}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5">
                               <Mail className="h-4 w-4" /> {p.email}
                            </a>
                        )}
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

  const [isDeleting, setIsDeleting] = useState(false);

  const locationParts = campaign.location.split(',');
  const city = locationParts[0]?.trim() || '';
  const country = locationParts[1]?.trim() || '';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: campaign.title || "",
      description: campaign.description || "",
      goal: campaign.goal || "",
      city: city,
      country: country,
      startDate: campaign.startDate?.toDate ? campaign.startDate.toDate() : new Date(),
      endDate: campaign.endDate?.toDate ? campaign.endDate.toDate() : new Date(),
      startTime: campaign.startTime || "10:00",
      endTime: campaign.endTime || "12:00",
      scripture: campaign.scripture || "",
      lastUpdateReason: "",
    },
  });

    const handleDeleteCampaign = async () => {
    if (!user || !firestore) return;
    setIsDeleting(true);
    try {
        const campaignRef = doc(firestore, 'campaigns', campaign.id);
        const deleteData: { [key: string]: any } = {
            status: 'deleted',
            deletionReason: 'Campaign deleted by organizer.',
            deletedAt: serverTimestamp(),
        };
        
        await updateDoc(campaignRef, deleteData).catch((serverError) => {
            const permissionError = new FirestorePermissionError({
                path: campaignRef.path,
                operation: 'update',
                requestResourceData: deleteData,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        });

        toast({ title: 'Campaign Deleted', description: 'The campaign has been successfully deleted.' });
        onCampaignUpdated();
    } catch (error: any) {
        console.error('Delete error:', error);
        if (error.name !== 'FirestorePermissionError') {
             toast({ variant: 'destructive', title: 'Delete Error', description: 'Could not delete the campaign.' });
        }
    } finally {
        setIsDeleting(false);
    }
  };


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
        title: values.title,
        description: values.description,
        goal: values.goal,
        location: `${values.city}, ${values.country}`,
        startDate: values.startDate,
        endDate: values.endDate,
        startTime: values.startTime,
        endTime: values.endTime,
        scripture: values.scripture,
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
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Campaign Title" {...field} className="text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Evangelism" {...field} className="text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Nairobi" {...field} className="text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Kenya" {...field} className="text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                    control={form.control}
                    name="scripture"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Inspirational Scripture</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., John 3:16" {...field} className="text-base" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                            <Input 
                            type="date"
                            className="text-base"
                            value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                            onChange={field.onChange}
                            />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                            <Input 
                            type="date"
                            className="text-base"
                            value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                            onChange={field.onChange}
                            min={form.watch('startDate') ? format(new Date(form.watch('startDate')), 'yyyy-MM-dd') : ''}
                            />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} className="text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} className="text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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

        <Separator />

         <Card className="border-destructive mt-6">
            <CardHeader>
                <CardTitle className="text-destructive">Delete Campaign</CardTitle>
                <CardDescription>This action cannot be undone and will permanently remove the campaign from public view.</CardDescription>
            </CardHeader>
            <CardContent>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete Campaign</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will mark the campaign as deleted and hide it from public view. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteCampaign} disabled={isDeleting}>
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Deletion
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    </div>
  );
}
