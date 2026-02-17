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

const formSchema = z.object({
  goal: z.string().min(3, "Goal is too short.").max(100, "Goal is too long."),
  location: z.string().min(2, "Location is too short.").max(100, "Location is too long."),
  targetAudience: z.string().min(3, "Target audience is too short.").max(100, "Target audience is too long."),
});

type CampaignIdeas = {
  campaignNames: string[];
  description: string;
};

export function CreateCampaignForm() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [ideas, setIdeas] = useState<CampaignIdeas | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goal: "",
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
                  <FormControl>
                    <Input placeholder="e.g., Evangelism" {...field} />
                  </FormControl>
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
                <RadioGroup defaultValue={ideas.campaignNames[0]}>
                  {ideas.campaignNames.map((name, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={name} id={`name-${index}`} />
                      <Label htmlFor={`name-${index}`} className="font-normal">{name}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Suggested Description</h3>
                <Textarea value={ideas.description} readOnly rows={5} className="bg-muted"/>
              </div>
              <Button className="w-full">Create Campaign with these details</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
