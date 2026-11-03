"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import { useState, useRef, useEffect } from "react";
import { Loader2, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useFirestore } from "@/firebase";
import { collection, serverTimestamp, doc, writeBatch, increment } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { format, differenceInDays, isSameDay } from "date-fns";
import { LocationMapPicker } from "../common/location-map-picker";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSearchParams } from "next/navigation";
import type { UserProfile } from "@/lib/types";

const formSchema = z.object({
  goal: z.string({
    required_error: "Please select a campaign goal.",
  }),
  customGoal: z.string().optional(),
  location: z.string().min(3, "A location is required.").max(200, "Location is too long."),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  coverageRadius: z.number().min(100, "Minimum radius is 100m").max(50000, "Maximum radius is 50km").optional(),
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
  streamUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
}).refine((data) => data.endDate >= data.startDate, {
    message: "End date cannot be before start date.",
    path: ["endDate"],
}).refine((data) => {
    if (data.goal === 'Custom') {
        return data.customGoal && data.customGoal.trim().length > 2;
    }
    return true;
}, {
    message: "Custom goal must be at least 3 characters.",
    path: ["customGoal"],
}).refine((data) => {
    if (data.startDate && data.endDate && isSameDay(data.startDate, data.endDate)) {
        if(data.startTime && data.endTime) {
            return data.endTime > data.startTime;
        }
    }
    return true;
}, {
    message: "End time must be after start time for a single-day campaign.",
    path: ["endTime"],
});


type CampaignIdeas = {
  campaignNames: string[];
  description: string;
};

type CreateCampaignFormProps = {
  onCampaignCreated: () => void;
  userProfile: UserProfile;
};

export function CreateCampaignForm({ onCampaignCreated, userProfile }: CreateCampaignFormProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();

  const [ideas, setIdeas] = useState<CampaignIdeas | null>(null);
  const [selectedName, setSelectedName] = useState('');
  const [customName, setCustomName] = useState('');
  const [finalDescription, setFinalDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const ideasCardRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: "",
      targetAudience: "",
      scripture: "",
      scriptureTestimony: "",
      startTime: "10:00",
      endTime: "12:00",
      streamUrl: userProfile?.defaultMeetingLink || "",
    },
  });

  useEffect(() => {
    const source = searchParams.get('source');
    if (source === 'territory') {
      const title = searchParams.get('title');
      const location = searchParams.get('location');
      const description = searchParams.get('description');
      
      if (title) {
          form.setValue('goal', 'Custom');
          form.setValue('customGoal', title);
          setSelectedName('custom');
          setCustomName(title);
      }
      if (location) form.setValue('location', location);
      if (description) {
          setFinalDescription(description);
          setIdeas({ campaignNames: [], description: description });
      }
      
      form.setValue('scriptureTestimony', `Mission inspired by regional report: "${title}"`);
    }
  }, [searchParams, form]);

  useEffect(() => {
    if (ideas && ideasCardRef.current) {
      setTimeout(() => {
        ideasCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [ideas]);

  let durationText: string | null = null;
  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');

  if (startDate && endDate && endDate >= startDate) {
      const diffInDays = differenceInDays(endDate, startDate);
      if (diffInDays === 0) {
          durationText = "This is a single-day campaign.";
      } else {
          const days = diffInDays + 1;
          durationText = `Campaign duration: ${days} days.`;
      }
  }

  const handleCreateManually = () => {
    form.trigger().then(isValid => {
        if (isValid) {
            if (!ideas) setIdeas({ campaignNames: [], description: '' }); 
            setSelectedName('custom');
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
    const values = form.getValues();

    if (!finalName) {
        toast({ variant: 'destructive', title: 'Missing Name', description: 'Please select or enter a campaign name.' });
        return;
    }

    if (!values.startDate || !values.endDate) {
      toast({
        variant: 'destructive',
        title: 'Dates Required',
        description: 'Please select a start and end date for the mission.',
      });
      return;
    }

    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to create a campaign.' });
        return;
    }

    setIsCreating(true);

    try {
        const goal = values.goal === 'Custom' && values.customGoal ? values.customGoal : values.goal;
        const campaignData = {
            title: finalName,
            description: finalDescription,
            goal: goal,
            location: values.location,
            latitude: values.latitude ?? null,
            longitude: values.longitude ?? null,
            coverageRadius: values.coverageRadius ?? null,
            startDate: values.startDate,
            endDate: values.endDate,
            startTime: values.startTime,
            endTime: values.endTime,
            participants: 1,
            maxParticipants: values.maxParticipants || null,
            createdAt: serverTimestamp(),
            organizerId: user.uid,
            organizerFirstName: userProfile.firstName,
            organizerLastName: userProfile.lastName,
            status: 'active' as const,
            scripture: values.scripture,
            scriptureTestimony: values.scriptureTestimony,
            imageUrl: null,
            soulsLogged: 0,
            streamUrl: values.streamUrl || null,
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
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            photoURL: userProfile.photoURL || null,
            joinedAt: serverTimestamp()
        };
        batch.set(participantRef, participantPayload);

        await batch.commit();
        
        toast({ title: 'Campaign Created!', description: `The "${finalName}" campaign is now ready.` });
        onCampaignCreated();

    } catch (error: any) {
        console.error("Error creating campaign: ", error);
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `campaigns`,
                operation: 'create'
            }, user));
        } else {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not create campaign.' });
        }
    } finally {
        setIsCreating(false);
    }
  }

  const handleCreateMeet = () => {
    window.open('https://meet.google.com/new', '_blank');
  };

  const handleDatePickerClick = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      (e.target as any).showPicker?.();
    } catch (err) {
      console.warn("showPicker is not supported or blocked in this environment.");
    }
  };

  return (
    <>
      <Form {...form}>
        <form className="space-y-4 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Goal</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a campaign goal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Evangelism">Evangelism</SelectItem>
                      <SelectItem value="Street Evangelism">Street Evangelism</SelectItem>
                      <SelectItem value="Hospital Visitation">Hospital Visitation</SelectItem>
                      <SelectItem value="Prison Ministry">Prison Ministry</SelectItem>
                      <SelectItem value="School Outreach">School/Campus Outreach</SelectItem>
                      <SelectItem value="Community Outreach">Community Outreach</SelectItem>
                      <SelectItem value="Welfare Ministry">Welfare/Mercy Ministry</SelectItem>
                      <SelectItem value="Medical Outreach">Medical Outreach</SelectItem>
                      <SelectItem value="Mass Crusade">Mass Crusade</SelectItem>
                      <SelectItem value="Literature Distribution">Book/Literature Distribution</SelectItem>
                      <SelectItem value="Discipleship">Discipleship</SelectItem>
                      <SelectItem value="Prayer Meeting">Prayer Meeting</SelectItem>
                      <SelectItem value="Youth Program">Youth Program</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
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

          {form.watch("goal") === "Custom" && (
            <FormField
                control={form.control}
                name="customGoal"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Custom Goal Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Hospital Visitation" {...field} value={field.value ?? ""} className="text-base" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
          )}

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
                        onClick={handleDatePickerClick}
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
                        onClick={handleDatePickerClick}
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
           {durationText && (
                <p className="text-sm text-muted-foreground -mt-2">{durationText}</p>
           )}
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
              name="streamUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting or Stream URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} value={field.value ?? ""} className="text-base" />
                  </FormControl>
                  <Button type="button" variant="outline" size="sm" onClick={handleCreateMeet} className="mt-1">
                    <Video className="mr-2 h-4 w-4" />
                    Create Google Meet
                  </Button>
                  <FormMessage />
                </FormItem>
              )}
            />

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
           <p className="text-sm text-muted-foreground pt-2 text-left">
            Fill the details above to continue.
           </p>

            <Button type="button" className="w-full" onClick={handleCreateManually}>
                Continue
            </Button>
        </form>
      </Form>

      {ideas && (
        <Card className="mt-6" ref={ideasCardRef}>
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
