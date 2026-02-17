
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { summarizeTestimony } from "@/ai/flows/summarize-testimony-flow";
import { moderateContent } from "@/ai/flows/moderate-content-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { Testimony, TestimonyCategory } from "@/lib/types";
import { mockUser } from "@/lib/data";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const testimonyCategories: TestimonyCategory[] = ['Healing', 'Financial Breakthrough', 'Salvation', 'Relationships', 'Deliverance', 'General'];

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title is too long."),
  category: z.string({ required_error: "Please select a category." }),
  content: z.string().min(50, "Testimony must be at least 50 characters.").max(5000, "Testimony is too long."),
});

type CreateTestimonyFormProps = {
  onTestimonyCreated: (testimony: Testimony) => void;
};

export function CreateTestimonyForm({ onTestimonyCreated }: CreateTestimonyFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRephrasing, setIsRephrasing] = useState(false);
  const [moderationResult, setModerationResult] = useState<any>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: `Please choose a file smaller than ${MAX_FILE_SIZE_MB}MB.`,
        });
        event.target.value = ''; // Clear the input
        setMediaFile(null);
      } else {
        setMediaFile(file);
      }
    } else {
        setMediaFile(null);
    }
  };

  const handleRephrase = async () => {
    const content = form.getValues("content");
    if (content.length < 50) {
      toast({
        variant: "destructive",
        title: "Content too short",
        description: "Please write at least 50 characters to rephrase the testimony.",
      });
      return;
    }
    setIsRephrasing(true);
    try {
      const summary = await summarizeTestimony(content);
      form.setValue("content", summary);
      toast({
        title: "Content Rephrased!",
        description: "AI has created an enhanced version of your testimony.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Rephrasing Failed",
        description: "Could not rephrase the content. Please try again.",
      });
    } finally {
      setIsRephrasing(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setModerationResult(null);

    try {
      // In a real app, you'd upload the file and get a URL first.
      // Here, we'll use a local object URL for preview.
      const mediaUrl = mediaFile ? URL.createObjectURL(mediaFile) : undefined;
      const mediaType = mediaFile?.type.startsWith('image') ? 'image' : mediaFile?.type.startsWith('video') ? 'video' : mediaFile?.type.startsWith('audio') ? 'audio' : undefined;

      const result = await moderateContent({ content: values.content, contentType: 'testimony' });
      setModerationResult(result);

      if (result.status === "approved" || result.status === "edited") {
        const newTestimony: Testimony = {
          id: `test-${Date.now()}`,
          author: { id: mockUser.id, name: mockUser.name, avatarUrl: mockUser.avatarUrl },
          title: values.title,
          content: result.moderatedContent || values.content,
          likes: 0,
          createdAt: new Date().toISOString(),
          category: values.category as TestimonyCategory,
          mediaUrl,
          mediaType,
        };

        toast({
          title: "Testimony Submitted!",
          description: "Thank you for sharing. Your testimony is now live.",
        });
        
        onTestimonyCreated(newTestimony);

      } else {
        toast({
          variant: result.status === 'rejected' ? 'destructive' : 'default',
          title: `Moderation Result: ${result.status.replace('_', ' ')}`,
          description: result.reason,
        });
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 'Healed from Sickness'" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category for your testimony" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {testimonyCategories.map(cat => (
                       <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Your Testimony</FormLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRephrase}
                  disabled={isRephrasing}
                >
                  {isRephrasing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Rephrase with AI
                </Button>
              </div>
              <FormControl>
                <Textarea
                  placeholder="Share the details of what God has done..."
                  className="min-h-[150px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-2">
            <FormLabel htmlFor="media">Add Photo, Video, or Audio</FormLabel>
            <FormControl>
              <Input id="media" type="file" accept="image/*,video/*,audio/*" onChange={handleFileChange} />
            </FormControl>
            <FormDescription>
              Optional. Add one photo, video, or audio file. Max size: {MAX_FILE_SIZE_MB}MB.
            </FormDescription>
        </div>
        
        {moderationResult && (
          <Alert variant={moderationResult.status === 'rejected' ? 'destructive' : 'default'}>
            <Sparkles className="h-4 w-4" />
            <div className="flex items-center justify-between">
              <AlertTitle>AI Moderation Result</AlertTitle>
              <Badge variant={moderationResult.status === 'approved' || moderationResult.status === 'edited' ? 'secondary' : 'destructive'}>{moderationResult.status.replace('_', ' ')}</Badge>
            </div>
            <AlertDescription>
              {moderationResult.reason}
            </AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Testimony
        </Button>
      </form>
    </Form>
  );
}
