
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
import { Loader2, Sparkles } from "lucide-react";
import { moderateContent } from "@/ai/flows/moderate-content-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { TestimonyCategory } from "@/lib/types";
import { useUser, useFirestore, useStorage } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";


const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const testimonyCategories: TestimonyCategory[] = ['Healing', 'Financial Breakthrough', 'Salvation', 'Relationships', 'Deliverance', 'General'];

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title is too long."),
  category: z.string({ required_error: "Please select a category." }),
  content: z.string().min(50, "Testimony must be at least 50 characters.").max(5000, "Testimony is too long."),
});

type CreateTestimonyFormProps = {
  onTestimonyCreated: () => void;
};

export function CreateTestimonyForm({ onTestimonyCreated }: CreateTestimonyFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moderationResult, setModerationResult] = useState<any>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore || !storage) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to share a testimony.'});
      return;
    }

    setIsSubmitting(true);
    setModerationResult(null);

    try {
      const result = await moderateContent({ content: values.content, contentType: 'testimony' });
      setModerationResult(result);

      if (result.status === "approved" || result.status === "edited") {
        
        const testimonyData: { [key: string]: any } = {
          authorId: user.uid,
          authorName: user.displayName || user.email || 'Anonymous',
          title: values.title,
          content: result.moderatedContent || values.content,
          createdAt: serverTimestamp(),
          category: values.category as TestimonyCategory,
        };
        
        if (user.photoURL) {
          testimonyData.authorAvatarUrl = user.photoURL;
        }

        if (mediaFile) {
          const fileRef = ref(storage, `testimonies/${user.uid}/${Date.now()}-${mediaFile.name}`);
          const snapshot = await uploadBytes(fileRef, mediaFile);
          const mediaUrl = await getDownloadURL(snapshot.ref);
          testimonyData.mediaUrl = mediaUrl;

          if (mediaFile.type.startsWith('image')) {
            testimonyData.mediaType = 'image';
          } else if (mediaFile.type.startsWith('video')) {
            testimonyData.mediaType = 'video';
          } else if (mediaFile.type.startsWith('audio')) {
            testimonyData.mediaType = 'audio';
          }
        }

        await addDoc(collection(firestore, "testimonies"), testimonyData);

        toast({
          title: "Testimony Submitted!",
          description: "Thank you for sharing. Your testimony is now live.",
        });
        
        onTestimonyCreated();

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
              <FormLabel>Your Testimony</FormLabel>
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
