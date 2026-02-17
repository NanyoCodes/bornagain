"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import type { Campaign } from "@/lib/types";

const formSchema = z.object({
  goal: z.string({
    required_error: "Please select a campaign goal.",
  }),
  location: z.string().min(2, "Location is too short.").max(100, "Location is too long."),
  targetAudience: z.string().min(3, "Target audience is too short.").max(100, "Target audience is too long."),
});

type CampaignIdeas = {
  campaignNames: string[];
  description: string;
};

type CreateCampaignFormProps = {
  onCampaignCreated: (campaign: Campaign) => void;
};

export function CreateCampaignForm({ onCampaignCreated }: CreateCampaignFormProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [ideas, setIdeas] = useState<CampaignIdeas | null>(null);
  const [selectedName, setSelectedName] = useState('');
  const [customName, setCustomName] = useState('');
  const [finalDescription, setFinalDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: "",
      targetAudience: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsGenerating(true);
    setIdeas(null);
    try {
      const result = await generateCampaignIdeas(values);
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
    if (!photoFile) {
        toast({ variant: 'destructive', title: 'Missing Photo', description: 'Please upload a campaign photo.' });
        return;
    }

    setIsCreating(true);
    // Simulate creation
    await new Promise(res => setTimeout(res, 1500));
    
    const photoUrl = photoFile ? URL.createObjectURL(photoFile) : '';

    const newCampaign: Campaign = {
        id: `camp-${Date.now()}`,
        title: finalName,
        description: finalDescription,
        goal: form.getValues('goal'),
        location: form.getValues('location'),
        participants: 1,
        progress: 0,
        imageUrl: photoUrl,
        createdAt: new Date().toISOString(),
        organizer: { id: 'user-01', name: 'John Doe' },
    };
    
    toast({ title: 'Campaign Created!', description: `The "${finalName}" campaign is now ready.` });
    onCampaignCreated(newCampaign);
    setIsCreating(false);
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Nairobi" {...field} />
                  </FormControl>
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
          <FormDescription>
            Provide some keywords and let our AI assistant brainstorm for you.
          </FormDescription>

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
              <div className="space-y-2">
                <Label htmlFor="photo">Campaign Photo</Label>
                <Input id="photo" type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
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
