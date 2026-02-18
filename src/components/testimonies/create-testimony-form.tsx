
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { TestimonyCategory } from "@/lib/types";
import { useUser, useFirestore, useStorage } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Label } from "@/components/ui/label";


const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const testimonyCategories: TestimonyCategory[] = ['Healing', 'Financial Breakthrough', 'Salvation', 'Relationships', 'Deliverance', 'General'];

const formSchema = z.object({
  category: z.string({ required_error: "Please select a category." }),
  content: z.string().min(50, "Testimony must be at least 50 characters.").max(5000, "Testimony is too long."),
});

type CreateTestimonyFormProps = {
  onTestimonyCreated: () => void;
};

export function CreateTestimonyForm({ onTestimonyCreated }: CreateTestimonyFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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

    const testimonyCollectionRef = collection(firestore, "testimonies");

    try {
      const testimonyData: any = {
          authorId: user.uid,
          authorName: user.displayName || user.email || 'Anonymous',
          authorAvatarUrl: user.photoURL || null,
          content: values.content,
          createdAt: serverTimestamp(),
          category: values.category as TestimonyCategory,
          mediaUrl: null,
          mediaType: null,
      };

      if (mediaFile) {
        const fileMediaType = mediaFile.type.startsWith('image') ? 'image' : mediaFile.type.startsWith('video') ? 'video' : mediaFile.type.startsWith('audio') ? 'audio' : undefined;

        if (fileMediaType) {
          const fileRef = ref(storage, `testimonies/${user.uid}/${Date.now()}-${mediaFile.name}`);
          const snapshot = await uploadBytes(fileRef, mediaFile);
          const mediaUrl = await getDownloadURL(snapshot.ref);
          
          testimonyData.mediaUrl = mediaUrl;
          testimonyData.mediaType = fileMediaType;
        } else {
          toast({
              variant: "destructive",
              title: "Unsupported File Type",
              description: "Please upload an image, video, or audio file.",
          });
          setIsSubmitting(false);
          return;
        }
      }
      
      await addDoc(testimonyCollectionRef, testimonyData).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: testimonyCollectionRef.path,
            operation: 'create',
            requestResourceData: testimonyData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError; // Re-throw
      });

      toast({
        title: "Testimony Submitted!",
        description: "Thank you for sharing. Your testimony is now live.",
      });
      
      onTestimonyCreated();

    } catch (error: any) {
        console.error("Submission error:", error);
        if (error.name === 'FirestorePermissionError') {
            // handled by emitter
        } else if (error.code?.startsWith('storage/')) {
            toast({
                variant: "destructive",
                title: "Media Upload Failed",
                description: "Could not upload your media file. Please check permissions and try again.",
            });
        } else {
             toast({
                variant: "destructive",
                title: "Submission Error",
                description: error.message || "An unexpected error occurred. Please try again.",
            });
        }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  className="min-h-[150px] text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-2">
            <Label htmlFor="media">Add Photo, Video, or Audio</Label>
            <Input id="media" type="file" accept="image/jpeg,image/png,video/*,audio/*" onChange={handleFileChange} />
            <p className="text-sm text-muted-foreground">
              Optional. Add one photo, video, or audio file. Max size: {MAX_FILE_SIZE_MB}MB.
            </p>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Testimony
        </Button>
      </form>
    </Form>
  );
}
