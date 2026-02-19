
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { CalendarIcon, Loader2, Sparkles } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "../ui/calendar";

const formSchema = z.object({
  goal: z.string({
    required_error: "Please select a campaign goal.",
  }),
  city: z.string().min(2, "City is too short.").max(50, "City is too long."),
  country: z.string().min(2, "Country is too short.").max(50, "Country is too long."),
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
      city: "",
      country: "",
      targetAudience: "",
      scripture: "",
      startTime: "10:00",
      endTime: "12:00",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsGenerating(true);
    setIdeas(null);
    try {
      const result = await generateCampaignIdeas({
        goal: values.goal,
        location: `${values.city}, ${values.country}`,
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
        const campaignData = {
            title: finalName,
            description: finalDescription,
            goal: form.getValues('goal'),
            location: `${form.getValues('city')}, ${form.getValues('country')}`,
            startDate: form.getValues('startDate'),
            endDate: form.getValues('endDate'),
            startTime: form.getValues('startTime'),
            endTime: form.getValues('endTime'),
            participants: 1,
            createdAt: serverTimestamp(),
            organizerId: user.uid,
            organizerName: user.displayName || 'Anonymous',
            status: 'active' as const,
            scripture: form.getValues('scripture'),
            imageUrl: null,
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                >
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                    date < new Date(new Date().setHours(0, 0, 0, 0))
                                }
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                >
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                    date < (form.watch('startDate') || new Date(new Date().setHours(0, 0, 0, 0)))
                                }
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
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
           <p className="text-sm text-muted-foreground">
            Provide some keywords and let our AI assistant brainstorm for you.
           </p>

          <Button type="submit" className="w-full" disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Campaign Ideas
          </Button>
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
                <h3 className="text-lg font-semibold mb-2">Choose a Campaign Name</h3>
                <RadioGroup onValueChange={setSelectedName} value={selectedName}>
                  {ideas.campaignNames.map((name, index) => (
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
                <h3 className="text-lg font-semibold mb-2">Suggested Description</h3>
                <Textarea value={finalDescription} onChange={(e) => setFinalDescription(e.target.value)} rows={5} className="text-base" />
              </div>
              <Button className="w-full" onClick={handleCreateCampaign} disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 {isCreating ? 'Creating...' : 'Create Campaign with these details'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
