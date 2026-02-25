
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Trash2, X } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, doc, updateDoc, serverTimestamp, getDoc, where, limit, addDoc, setDoc, runTransaction, query, orderBy } from 'firebase/firestore';
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
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  title: z.string().min(3, "Title is too short.").max(100, "Title is too long."),
  description: z.string().min(3, "Description is too short.").max(5000, "Description is too long."),
  goal: z.string().min(3, "Goal is too short.").max(100, "Goal is too long."),
  city: z.string().min(2, "City is too short.").max(50, "City is too long."),
  country: z.string().min(2, "Country is too short.").max(50, "Country is too long."),
  startDate: z.date(),
  endDate: z.date(),
  startTime: z.string().min(1, "A start time is required."),
  endTime: z.string().min(1, "An end time is required."),
  scripture: z.string().max(100, "Scripture is too long.").optional(),
  scriptureTestimony: z.string().max(500, "Caption is too long.").optional(),
  maxParticipants: z.number().optional(),
  lastUpdateReason: z.string().min(10, { message: "Please provide a reason of at least 10 characters." }),
}).refine((data) => data.endDate >= data.startDate, {
    message: "End date cannot be before start date.",
    path: ["endDate"],
});


type ManageCampaignFormProps = {
  campaign: Campaign;
  onCampaignUpdated: () => void;
};

function ParticipantList({ campaign, participants, loading, onRemove }: { campaign: Campaign, participants: CampaignParticipant[], loading: boolean, onRemove: (participantId: string) => Promise<void> }) {
    const { user } = useUser();
    const [isRemoving, setIsRemoving] = useState<string | null>(null);

    const organizer = useMemo(() => participants?.find(p => p.id === campaign.organizerId), [participants, campaign.organizerId]);
    const otherParticipants = useMemo(() => participants?.filter(p => p.id !== campaign.organizerId), [participants, campaign.organizerId]);

    const handleRemoveClick = async (participantId: string) => {
        setIsRemoving(participantId);
        await onRemove(participantId);
        setIsRemoving(null);
    }

  if (loading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-20 w-full" />
        </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Participants ({participants?.length || 0} / {campaign.maxParticipants || 'Unlimited'})</h3>
        {organizer && (
            <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">ORGANIZER</h4>
                <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/50">
                    <span className='font-medium'>{organizer.displayName}</span>
                    <span className="text-sm text-muted-foreground">You</span>
                </div>
            </div>
        )}
        
        {otherParticipants && otherParticipants.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">MEMBERS ({otherParticipants.length})</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 border rounded-lg p-2">
                {otherParticipants.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                        <div>
                          <p className='font-medium'>{p.displayName}</p>
                          {p.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isRemoving === p.id}>
                                {isRemoving === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 text-destructive" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove {p.displayName}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove this participant? They will be notified and this action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveClick(p.id)} className="bg-destructive hover:bg-destructive/90">
                                Remove Participant
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                ))}
            </div>
          </div>
        )}

        {otherParticipants?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">No other participants have joined yet.</p>
        )}
    </div>
  )
}


export function ManageCampaignForm({ campaign, onCampaignUpdated }: ManageCampaignFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const participantsQuery = useMemo(() => {
    if (!firestore || !campaign.id || !user) return null;
    return query(collection(firestore, 'campaigns', campaign.id, 'participants'), orderBy('joinedAt', 'asc'));
  }, [firestore, campaign.id, user]);
  
  const { data: participants, loading: participantsLoading } = useCollection<CampaignParticipant>(participantsQuery);
  
  const handleRemoveParticipant = async (participantId: string) => {
    if (!user || !firestore || user.uid !== campaign.organizerId) return;
    
    const campaignRef = doc(firestore, 'campaigns', campaign.id);
    const participantRef = doc(firestore, 'campaigns', campaign.id, 'participants', participantId);
    const joinedRef = doc(firestore, 'users', participantId, 'joinedCampaigns', campaign.id);

    runTransaction(firestore, async (transaction) => {
        const campaignDoc = await transaction.get(campaignRef);
        if (!campaignDoc.exists()) {
            throw new Error("Campaign does not exist!");
        }
        
        const newParticipantCount = Math.max(0, (campaignDoc.data().participants || 0) - 1);
        
        transaction.update(campaignRef, { participants: newParticipantCount });
        transaction.delete(participantRef);
        transaction.delete(joinedRef);
    }).then(() => {
        toast({ title: 'Participant Removed', description: 'The user has been removed from the campaign.' });
    }).catch(() => {
        const permissionError = new FirestorePermissionError({
            path: `TRANSACTION:REMOVE_PARTICIPANT:${participantId}`,
            operation: 'write'
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const defaultValues = useMemo(() => {
    const locationParts = campaign.location.split(',');
    const city = locationParts[0]?.trim() || '';
    const country = locationParts[1]?.trim() || '';
    
    const safeToDate = (value: any): Date => {
        if (value?.toDate) return value.toDate();
        if (value instanceof Date) return value;
        // Check for object with seconds and nanoseconds
        if (value && typeof value.seconds === 'number') {
            return new Date(value.seconds * 1000);
        }
        return new Date(); 
    }

    return {
      title: campaign.title || "",
      description: campaign.description || "",
      goal: campaign.goal || "",
      city: city,
      country: country,
      startDate: safeToDate(campaign.startDate),
      endDate: safeToDate(campaign.endDate),
      startTime: campaign.startTime || "",
      endTime: campaign.endTime || "",
      scripture: campaign.scripture || "",
      scriptureTestimony: campaign.scriptureTestimony || "",
      maxParticipants: campaign.maxParticipants ?? undefined,
      lastUpdateReason: "",
    };
  }, [campaign]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);


  const handleStartGroupChat = async () => {
    if (!user || !firestore) return;
    setIsChatLoading(true);
    
    if (!participants || participants.length <= 1) {
        toast({
            title: "Not Enough Participants",
            description: "A group chat requires at least one other participant.",
        });
        setIsChatLoading(false);
        return;
    }
    
    try {
        const participantIds = participants.map(p => p.id);
        const participantInfo: { [key: string]: any } = {};
        participants.forEach(p => {
            participantInfo[p.id] = {
                displayName: p.displayName,
                photoURL: p.photoURL || '',
                email: p.email || '',
            };
        });
        
        const chatDocRef = doc(firestore, 'chats', campaign.id);

        const chatData = {
            participantIds,
            participantInfo,
            campaignId: campaign.id,
            campaignTitle: campaign.title,
            lastUpdatedAt: serverTimestamp(),
            isGroupChat: true,
            hasMessages: false,
        };

        await setDoc(chatDocRef, chatData, { merge: true });
        
        onCampaignUpdated();
        router.push(`/dashboard/chats/${campaign.id}`);

    } catch (error) {
        console.error("Error starting group chat:", error);
        toast({ variant: 'destructive', title: 'Chat Error', description: 'Could not start the group chat.' });
    } finally {
        setIsChatLoading(false);
    }
  };


  const handleDeleteCampaign = async () => {
    if (!user || !firestore) return;
    setIsDeleting(true);
    const campaignRef = doc(firestore, 'campaigns', campaign.id);
    const deleteData: { [key: string]: any } = {
        status: 'deleted',
        deletionReason: 'Campaign deleted by organizer.',
        deletedAt: serverTimestamp(),
    };
    
    updateDoc(campaignRef, deleteData).then(() => {
        toast({ title: 'Campaign Deleted', description: 'The campaign has been successfully deleted.' });
        onCampaignUpdated();
    }).catch(() => {
        const permissionError = new FirestorePermissionError({
            path: campaignRef.path,
            operation: 'update',
            requestResourceData: deleteData,
        });
        errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
        setIsDeleting(false);
    });
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
    
    const campaignRef = doc(firestore, 'campaigns', campaign.id);
    const updateData: { [key: string]: any } = {
        title: values.title,
        description: values.description,
        goal: values.goal,
        location: `${values.city}, ${values.country}`,
        startDate: values.startDate,
        endDate: values.endDate,
        startTime: values.startTime,
        endTime: values.endTime,
        scripture: values.scripture,
        scriptureTestimony: values.scriptureTestimony,
        maxParticipants: values.maxParticipants || null,
        lastUpdateReason: values.lastUpdateReason,
    };

    updateDoc(campaignRef, updateData).then(() => {
        toast({
            title: 'Campaign Updated!',
            description: 'Your changes have been saved successfully.',
        });
        onCampaignUpdated();
    }).catch(() => {
        const permissionError = new FirestorePermissionError({
        path: campaignRef.path,
        operation: 'update',
        requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
        setIsSubmitting(false);
    });
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
                        <Input placeholder="e.g., John 3:16" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="scriptureTestimony"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Scripture Caption (Optional)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Your short testimony or caption related to the scripture..." {...field} />
                        </FormControl>
                        <FormDescription>
                            This will be displayed with the scripture on the campaign card.
                        </FormDescription>
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
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
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
                                min={form.watch('startDate') ? format(form.watch('startDate'), "yyyy-MM-dd") : undefined}
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
                    name="maxParticipants"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Max Participants (Optional)</FormLabel>
                        <FormControl>
                            <Input 
                            type="number" 
                            placeholder="e.g., 20" 
                            {...field} 
                            className="text-base"
                            onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                            value={field.value ?? ''}
                            />
                        </FormControl>
                        <FormDescription>Leave blank for unlimited participants.</FormDescription>
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

                <Button type="submit" className="w-full" disabled={isSubmitting || !form.formState.isDirty}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
            </form>
        </Form>

        <Separator />

        <ParticipantList campaign={campaign} participants={participants || []} loading={participantsLoading} onRemove={handleRemoveParticipant} />

        <Separator />

        <Card>
            <CardHeader>
                <CardTitle>Group Communication</CardTitle>
                <CardDescription>Start a group chat with all campaign participants.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleStartGroupChat} disabled={isChatLoading || participantsLoading || !participants || participants.length <= 1}>
                    {isChatLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                    Start Group Chat
                </Button>
                 {participants && participants.length <= 1 && <p className="text-xs text-muted-foreground mt-2">You need at least one other participant to start a group chat.</p>}
            </CardContent>
        </Card>

         <Card className="border-destructive mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Delete Campaign</CardTitle>
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
                            <AlertDialogAction onClick={handleDeleteCampaign} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
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

    