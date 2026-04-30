
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessagesSquare, Trash2, Video } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, doc, updateDoc, serverTimestamp, getDoc, where, limit, addDoc, setDoc, runTransaction, query, orderBy, writeBatch } from 'firebase/firestore';
import type { Campaign, CampaignParticipant } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Skeleton } from '../ui/skeleton';
import { Input } from '../ui/input';
import { format, isSameDay } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from 'next/navigation';
import { LocationMapPicker } from '../common/location-map-picker';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { safeToDate } from '@/lib/utils';

const formSchema = z.object({
  title: z.string().min(3, "Title is too short.").max(100, "Title is too long."),
  description: z.string().min(3, "Description is too short.").max(5000, "Description is too long."),
  goal: z.string().min(3, "Goal is too short.").max(100, "Goal is too long."),
  location: z.string().min(3, "A location is required.").max(200, "Location is too long."),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  coverageRadius: z.number().min(100, "Minimum radius is 100m").max(50000, "Maximum radius is 50km").optional(),
  startDate: z.date(),
  endDate: z.date(),
  startTime: z.string().min(1, "A start time is required."),
  endTime: z.string().min(1, "An end time is required."),
  scripture: z.string().max(100, "Scripture is too long.").optional(),
  scriptureTestimony: z.string().max(500, "Caption is too long.").optional(),
  maxParticipants: z.number().min(1, "Maximum participants must be at least 1.").optional(),
  streamUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  lastUpdateReason: z.string().max(500, "Reason is too long.").optional(),
}).refine((data) => data.endDate >= data.startDate, {
    message: "End date cannot be before start date.",
    path: ["endDate"],
}).refine((data) => {
    if (isSameDay(data.startDate, data.endDate)) {
        if(data.startTime && data.endTime) {
            return data.endTime > data.startTime;
        }
    }
    return true;
}, {
    message: "End time must be after start time for a single-day campaign.",
    path: ["endTime"],
});


type ManageCampaignFormProps = {
  campaign: Campaign;
  onCampaignUpdated: () => void;
  onDelete: () => void;
};

function ParticipantList({ campaign, participants, loading }: { campaign: Campaign, participants: CampaignParticipant[], loading: boolean }) {
    const { user } = useUser();

    const organizer = useMemo(() => participants?.find(p => p.id === campaign.organizerId), [participants, campaign.organizerId]);
    const otherParticipants = useMemo(() => participants?.filter(p => p.id !== campaign.organizerId), [participants, campaign.organizerId]);

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
                    <span className='font-medium'>{organizer.firstName} {organizer.lastName}</span>
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
                          <p className='font-medium'>{p.firstName} {p.lastName}</p>
                          
                        </div>
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


export function ManageCampaignForm({ campaign, onCampaignUpdated, onDelete }: ManageCampaignFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const participantsQuery = useMemo(() => {
    if (!firestore || !campaign.id || !user || user.uid !== campaign.organizerId) return null;
    return query(collection(firestore, 'campaigns', campaign.id, 'participants'), orderBy('joinedAt', 'asc'));
  }, [firestore, campaign.id, user, campaign.organizerId]);
  
  const { data: participants, loading: participantsLoading } = useCollection<CampaignParticipant>(participantsQuery);
  

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: campaign.title || "",
      description: campaign.description || "",
      goal: campaign.goal || "",
      location: campaign.location || "",
      latitude: campaign.latitude,
      longitude: campaign.longitude,
      coverageRadius: campaign.coverageRadius,
      startDate: safeToDate(campaign.startDate) ?? new Date(),
      endDate: safeToDate(campaign.endDate) ?? new Date(),
      startTime: campaign.startTime || "",
      endTime: campaign.endTime || "",
      scripture: campaign.scripture || "",
      scriptureTestimony: campaign.scriptureTestimony || "",
      maxParticipants: campaign.maxParticipants ?? undefined,
      streamUrl: campaign.streamUrl || "",
      lastUpdateReason: "",
    },
  });

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
    
    const participantIds = participants.map(p => p.id);
    const participantInfo: { [key: string]: any } = {};
    participants.forEach(p => {
        participantInfo[p.id] = {
            displayName: `${p.firstName} ${p.lastName}`,
            firstName: p.firstName,
            lastName: p.lastName,
            photoURL: p.photoURL || '',
        };
    });
    
    const batch = writeBatch(firestore);

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
    batch.set(chatDocRef, chatData, { merge: true });

    const campaignDocRef = doc(firestore, 'campaigns', campaign.id);
    batch.update(campaignDocRef, { hasGroupChat: true });
    
    batch.commit()
        .then(() => {
            onCampaignUpdated();
            router.push(`/dashboard/chats/${campaign.id}`);
        })
        .catch(() => {
            const permissionError = new FirestorePermissionError({
                path: `BATCH_WRITE:START_GROUP_CHAT:${campaign.id}`,
                operation: 'write',
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsChatLoading(false);
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
        location: values.location,
        latitude: values.latitude,
        longitude: values.longitude,
        coverageRadius: values.coverageRadius ?? null,
        startDate: values.startDate,
        endDate: values.endDate,
        startTime: values.startTime,
        endTime: values.endTime,
        scripture: values.scripture,
        scriptureTestimony: values.scriptureTestimony,
        maxParticipants: values.maxParticipants ?? null,
        streamUrl: values.streamUrl || null,
        lastUpdateReason: values.lastUpdateReason || null,
        lastUpdatedAt: serverTimestamp(),
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
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
        setIsSubmitting(false);
    });
  }

  const handleCreateMeet = () => {
    window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer');
  };

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
                
                <FormField
                  control={form.control}
                  name="location"
                  render={() => (
                    <FormItem>
                      <Accordion type="single" collapsible defaultValue="item-1" className="w-full rounded-md border">
                        <AccordionItem value="item-1" className="border-none">
                          <AccordionTrigger className="px-3 py-3 hover:no-underline">
                            <div className="flex flex-col items-start gap-1">
                              <FormLabel>Campaign Location</FormLabel>
                               <FormDescription className="text-left">
                                Search or use the map to set a precise location for your campaign.
                              </FormDescription>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pt-1 pb-4">
                            <LocationMapPicker form={form} />
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                
                <Card>
                    <CardHeader>
                        <CardTitle>Live Stream or Meeting</CardTitle>
                        <CardDescription>Add a link to a live stream (e.g., YouTube) or virtual meeting (e.g., Google Meet). The link will be shown to users while the campaign is ongoing.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="streamUrl"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Stream or Meeting URL</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://..." {...field} value={field.value ?? ''} />
                                </FormControl>
                                <Button type="button" variant="outline" size="sm" onClick={handleCreateMeet} className="mt-1">
                                  <Video className="mr-2 h-4 w-4" />
                                  Create Google Meet
                                </Button>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <FormField
                  control={form.control}
                  name="lastUpdateReason"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Reason for Update (Optional)</FormLabel>
                      <FormControl>
                          <Textarea placeholder="e.g., Updated progress after event" {...field} className="text-base" />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
            </form>
        </Form>

        <Separator />

        <ParticipantList campaign={campaign} participants={participants || []} loading={participantsLoading} />

        <Separator />

        <Card>
            <CardHeader>
                <CardTitle>Group Communication</CardTitle>
                <CardDescription>
                  {campaign.hasGroupChat 
                    ? "View the group chat for all campaign participants." 
                    : "Start a group chat with all campaign participants."
                  }
                </CardDescription>
            </CardHeader>
            <CardContent>
                {campaign.hasGroupChat ? (
                  <Button onClick={() => router.push(`/dashboard/chats/${campaign.id}`)}>
                      <MessagesSquare className="mr-2 h-4 w-4" />
                      View Group Chat
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleStartGroupChat} disabled={isChatLoading || participantsLoading || !participants || participants.length <= 1}>
                        {isChatLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessagesSquare className="mr-2 h-4 w-4" />}
                        Start Group Chat
                    </Button>
                    {participants && participants.length <= 1 && <p className="text-xs text-muted-foreground mt-2">You need at least one other participant to start a group chat.</p>}
                  </>
                )}
            </CardContent>
        </Card>

         <Card className="border-destructive mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Delete Campaign</CardTitle>
                <CardDescription>This action cannot be undone and will permanently remove the campaign from public view.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant="destructive" type="button" onClick={onDelete}>Delete Campaign</Button>
            </CardContent>
        </Card>
    </div>
  );
}
