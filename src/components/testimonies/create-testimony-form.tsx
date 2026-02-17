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
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { summarizeTestimony } from "@/ai/flows/summarize-testimony-flow";
import { moderateContent } from "@/ai/flows/moderate-content-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title is too long."),
  content: z.string().min(50, "Testimony must be at least 50 characters.").max(5000, "Testimony is too long."),
});

export function CreateTestimonyForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [moderationResult, setModerationResult] = useState<any>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const handleSummarize = async () => {
    const content = form.getValues("content");
    if (content.length < 100) {
      toast({
        variant: "destructive",
        title: "Content too short",
        description: "Please write at least 100 characters to generate a summary.",
      });
      return;
    }
    setIsSummarizing(true);
    try {
      const summary = await summarizeTestimony(content);
      form.setValue("content", summary);
      toast({
        title: "Content Summarized!",
        description: "AI has created a concise version of your testimony.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Summarization Failed",
        description: "Could not summarize the content. Please try again.",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setModerationResult(null);

    try {
      const result = await moderateContent({ content: values.content, contentType: 'testimony' });
      setModerationResult(result);

      if (result.status === "approved" || result.status === "edited") {
        toast({
          title: "Testimony Submitted!",
          description: "Thank you for sharing. Your testimony is now live.",
        });
        // Here you would typically close the dialog and refresh the feed.
        // For now, we just show the moderation result.
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
          name="content"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Your Testimony</FormLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                >
                  {isSummarizing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Summarize with AI
                </Button>
              </div>
              <FormControl>
                <Textarea
                  placeholder="Share the details of what God has done..."
                  className="min-h-[150px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Your story will be checked by our AI moderator for community guidelines.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
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
