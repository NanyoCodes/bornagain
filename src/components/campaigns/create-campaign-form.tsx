
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { generateCampaignIdeas } from "@/ai/flows/generate-campaign-ideas";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useFirestore } from "@/firebase";
import { collection, serverTimestamp, doc, writeBatch } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { format } from "date-fns";
import { LocationMapPicker } from "../common/location-map-picker";

const formSchema = z.object({
  goal: z.string({
    required_error: "Please select a campaign goal.",
  }),
  location: z.string().min(3, "A location is required.").max(200, "Location is too long."),
  startDate: z.date({
    required_error: "A start date is required.",
  }),
  endDate: z.date({
    required_error: "An end date is required.",
  }),
  startTime: z.string().min(1, "A start time is required."),
  endTime: z.string().min(1, "An end time is required."),
  targetAudience: z.string().min(3, "Target audience is too short.").max(100, "Target audience is too long."),
  scripture: z.string().min(3, "Scripture is too short.").max(100, "Scripture is too long."),
  scriptureTestimony: z.string().max(500, "Caption is too long.").optional(),
  maxParticipants: z.number().optional(),
}).refine((data) => data.endDate >= data.startDate, {
    message: "End date cannot be before start date.",
    path: ["endDate"],
});


type CampaignIdeas = {
  campaignNames: string[];
  description: string;
};

type CreateCampaignFormProps = {
  onCampaignCreated: () => void;
};

export function CreateCampaignForm({ onCampaignCreated }: CreateCampaignFormProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [ideas, setIdeas] = useState<CampaignIdeas | null>(null);
  const [selectedName, setSelectedName] = useState('');
  const [customName, setCustomName] = useState('');
  const [finalDescription, setFinalDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: "",
      targetAudience: "",
      scripture: "",
      scriptureTestimony: "",
      startTime: "10:00",
      endTime: "12:00",
    },
  });

  async function onAiSubmit(values: z.infer<typeof formSchema>) {
    setIsGenerating(true);
    setIdeas(null);
    try {
      const result = await generateCampaignIdeas({
        goal: values.goal,
        location: values.location,
        targetAudience: values.targetAudience,
        scripture: values.scripture,
      });
      setIdeas(result);
      if (result.campaignNames.length > 0) {
        setSelectedName(result.campaignNames[0]);
      }
      setFinalDescription(result.description);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Could not generate campaign ideas. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  const handleCreateManually = () => {
    form.trigger().then(isValid => {
        if (isValid) {
            setIdeas({ campaignNames: [], description: '' }); // Set ideas to a non-null state to trigger the next step
            setSelectedName('custom');
            setFinalDescription('');
        } else {
            toast({
                variant: "destructive",
                title: "Incomplete Form",
                description: "Please fill out all required fields before proceeding.",
            });
        }
    });
  };

  const handleCreateCampaign = async () => {
    const finalName = selectedName === 'custom' ? customName : selectedName;
     if (!finalName) {
        toast({ variant: 'destructive', title: 'Missing Name', description: 'Please select or enter a campaign name.' });
        return;
    }
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to create a campaign.' });
        return;
    }

    setIsCreating(true);

    try {
        const values = form.getValues();
        const campaignData = {
            title: finalName,
            description: finalDescription,
            goal: values.goal,
            location: values.location,
            startDate: values.startDate,
            endDate: values.endDate,
            startTime: values.startTime,
            endTime: values.endTime,
            participants: 1,
            maxParticipants: values.maxParticipants || null,
            createdAt: serverTimestamp(),
            organizerId: user.uid,
            organizerName: user.displayName || 'Anonymous',
            status: 'active' as const,
            scripture: values.scripture,
            scriptureTestimony: values.scriptureTestimony,
            imageUrl: null,
            soulsLogged: 0,
        };
        
        const batch = writeBatch(firestore);
        const campaignDocRef = doc(collection(firestore, 'campaigns'));
        batch.set(campaignDocRef, campaignData);

        const joinedRef = doc(firestore, 'users', user.uid, 'joinedCampaigns', campaignDocRef.id);
        batch.set(joinedRef, {
            campaignId: campaignDocRef.id,
            joinedAt: serverTimestamp(),
        });

        const participantRef = doc(firestore, 'campaigns', campaignDocRef.id, 'participants', user.uid);
        const participantPayload: { [key: string]: any; } = {
            userId: user.uid,
            displayName: user.displayName || 'Anonymous',
            photoURL: user.photoURL || null,
            joinedAt: serverTimestamp()
        };
        if (user.email) {
            participantPayload.email = user.email;
        }
        batch.set(participantRef, participantPayload);

        await batch.commit().catch((serverError) => {
            const permissionError = new FirestorePermissionError({
            path: `BATCH_WRITE:CREATE_CAMPAIGN:${campaignDocRef.id}`,
            operation: 'write',
            requestResourceData: { action: 'User creating campaign', userId: user.uid }
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        });
        
        toast({ title: 'Campaign Created!', description: `The "${finalName}" campaign is now ready.` });
        onCampaignCreated();

    } catch (error: any) {
        console.error("Error creating campaign: ", error);
        if (error.name !== 'FirestorePermissionError') {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not create campaign. Please check your connection and try again.' });
        }
    } finally {
        setIsCreating(false);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onAiSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Goal</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a campaign goal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Evangelism">Evangelism</SelectItem>
                      <SelectItem value="Community Outreach">Community Outreach</SelectItem>
                      <SelectItem value="Discipleship">Discipleship</SelectItem>
                      <SelectItem value="Prayer Meeting">Prayer Meeting</SelectItem>
                      <SelectItem value="Youth Program">Youth Program</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetAudience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Audience</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., University Students" {...field} className="text-base" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <LocationMapPicker field={field} />
                  </FormControl>
                  <FormDescription>
                    Search for an address or click on the map to pin the campaign location.
                  </FormDescription>
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
                  <Input placeholder="e.g., John 3:16" {...field} className="text-base" />
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
                    <Textarea placeholder="Your short testimony or caption related to the scripture..." {...field} className="text-base" />
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
                        min={format(new Date(), "yyyy-MM-dd")}
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
                        min={form.watch('startDate') ? format(form.watch('startDate'), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")}
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
           <p className="text-sm text-muted-foreground pt-2">
            Fill the details above, then either use AI to generate ideas or create the campaign manually.
           </p>

            <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" className="w-full" disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Use AI Assistant
                </Button>
                <Button type="button" variant="secondary" className="w-full" onClick={handleCreateManually}>
                    Create Manually
                </Button>
            </div>
        </form>
      </Form>

      {isGenerating && (
        <div className="mt-6 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-muted-foreground">AI is brainstorming...</p>
        </div>
      )}

      {ideas && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Campaign Name</h3>
                <RadioGroup onValueChange={setSelectedName} value={selectedName}>
                  {ideas.campaignNames.length > 0 && ideas.campaignNames.map((name, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={name} id={`name-${index}`} />
                      <Label htmlFor={`name-${index}`} className="font-normal">{name}</Label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="name-custom" />
                    <Label htmlFor="name-custom" className="font-normal">Custom</Label>
                  </div>
                </RadioGroup>
                {selectedName === 'custom' && (
                  <Input 
                    placeholder="Enter custom campaign name" 
                    className="mt-4 text-base"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">{ideas.description ? 'Suggested Description' : 'Description'}</h3>
                <Textarea 
                    value={finalDescription} 
                    onChange={(e) => setFinalDescription(e.target.value)} 
                    rows={5} 
                    className="text-base"
                    placeholder="Describe your campaign's purpose and activities..." 
                />
              </div>
              <Button className="w-full" onClick={handleCreateCampaign} disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 {isCreating ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
