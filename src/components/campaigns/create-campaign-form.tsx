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
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "../ui/calendar";

const formSchema = z.object({
  goal: z.string({
    required_error: "Please select a campaign goal.",
  }),
  city: z.string().min(2, "City is too short.").max(50, "City is too long."),
  country: z.string().min(2, "Country is too short.").max(50, "Country is too long."),
  date: z.date({
    required_error: "A date is required for the campaign.",
  }),
  time: z.string().min(1, "A time is required for the campaign."),
  targetAudience: z.string().min(3, "Target audience is too short.").max(100, "Target audience is too long."),
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
      time: "10:00",
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

    const campaignCollectionRef = collection(firestore, 'campaigns');
    const campaignData: any = {
      title: finalName,
      description: finalDescription,
      goal: form.getValues('goal'),
      location: `${form.getValues('city')}, ${form.getValues('country')}`,
      date: form.getValues('date'),
      time: form.getValues('time'),
      participants: 1,
      progress: 0,
      createdAt: serverTimestamp(),
      organizerId: user.uid,
      organizerName: user.displayName || 'Anonymous',
    };
    
    try {
      await addDoc(campaignCollectionRef, campaignData).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: campaignCollectionRef.path,
          operation: 'create',
          requestResourceData: campaignData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError; // Re-throw to be caught by the outer catch
      });
      
      toast({ title: 'Campaign Created!', description: `The "${finalName}" campaign is now ready.` });
      onCampaignCreated();
    } catch (error: any) {
      console.error("Error creating campaign: ", error);
      if (error.name !== 'FirestorePermissionError') {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not create campaign. Please check your connection and try again.' });
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
                    <Input placeholder="e.g., University Students" {...field} />
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
                    <Input placeholder="e.g., Nairobi" {...field} />
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
                    <Input placeholder="e.g., Kenya" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
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
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
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
                    className="mt-4"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Suggested Description</h3>
                <Textarea value={finalDescription} onChange={(e) => setFinalDescription(e.target.value)} rows={5} />
              </div>
              <Button className="w-full" onClick={handleCreateCampaign} disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Campaign with these details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
