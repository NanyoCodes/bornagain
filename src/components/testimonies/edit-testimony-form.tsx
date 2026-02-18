
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
import { Loader2 } from "lucide-react";
import { Testimony, TestimonyCategory } from "@/lib/types";
import { useFirestore, useStorage, useUser } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import Image from "next/image";

const testimonyCategories: TestimonyCategory[] = ['Healing', 'Financial Breakthrough', 'Salvation', 'Relationships', 'Deliverance', 'General'];

const formSchema = z.object({
  category: z.string({ required_error: "Please select a category." }),
  content: z.string().min(50, "Testimony must be at least 50 characters.").max(5000, "Testimony is too long."),
});

type EditTestimonyFormProps = {
  testimony: Testimony;
  onTestimonyUpdated: () => void;
};

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function EditTestimonyForm({ testimony, onTestimonyUpdated }: EditTestimonyFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(testimony.mediaUrl || null);
  const [mediaType, setMediaType] = useState<string | undefined>(testimony.mediaType);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: testimony.category,
      content: testimony.content,
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
        event.target.value = '';
        return;
      }
      setMediaFile(file);
      setMediaType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(undefined);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore || !storage) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in again.' });
      return;
    }
    if (user.uid !== testimony.authorId) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'You can only edit your own testimonies.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const testimonyRef = doc(firestore, "testimonies", testimony.id);
      const testimonyUpdate: { [key: string]: any } = {
        ...values,
        updatedAt: serverTimestamp(),
      };

      // Handle media file update
      if (mediaFile) { // New file selected
        // Delete old file if it exists
        if (testimony.mediaUrl) {
          try {
            const oldFileRef = ref(storage, testimony.mediaUrl);
            await deleteObject(oldFileRef);
          } catch (error: any) {
            // It's okay if the old file doesn't exist, log other errors
            if (error.code !== 'storage/object-not-found') {
                console.warn("Could not delete old media file:", error);
            }
          }
        }

        // Upload new file
        const newFileRef = ref(storage, `testimonies/${user.uid}/${Date.now()}-${mediaFile.name}`);
        const snapshot = await uploadBytes(newFileRef, mediaFile);
        testimonyUpdate.mediaUrl = await getDownloadURL(snapshot.ref);
        testimonyUpdate.mediaType = mediaFile.type.startsWith('image') ? 'image' : mediaFile.type.startsWith('video') ? 'video' : 'audio';
      } else if (!mediaPreview && testimony.mediaUrl) { // Media was removed
        // Delete old file
        try {
            const oldFileRef = ref(storage, testimony.mediaUrl);
            await deleteObject(oldFileRef);
        } catch (error: any) {
            if (error.code !== 'storage/object-not-found') {
                console.warn("Could not delete old media file:", error);
            }
        }
        testimonyUpdate.mediaUrl = null;
        testimonyUpdate.mediaType = null;
      }

      await updateDoc(testimonyRef, testimonyUpdate);

      toast({
        title: "Testimony Updated!",
        description: "Your changes have been saved successfully.",
      });
      onTestimonyUpdated();
    } catch (error) {
      console.error("Update error:", error);
      toast({
        variant: "destructive",
        title: "Update Error",
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
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {testimonyCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
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
                <Textarea className="min-h-[150px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Media</FormLabel>
          {mediaPreview && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                {mediaType?.startsWith('image') && <Image src={mediaPreview} alt="Media preview" fill className="object-cover" />}
                {mediaType?.startsWith('video') && <video controls src={mediaPreview} className="w-full h-full" />}
                {mediaType?.startsWith('audio') && <audio controls src={mediaPreview} className="w-full" />}
                <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={handleRemoveMedia}>Remove</Button>
            </div>
          )}
          <FormControl>
            <Input id="media-edit" type="file" accept="image/*,video/*,audio/*" onChange={handleFileChange} />
          </FormControl>
          <FormDescription>
            Replace or remove the current media. Max size: {MAX_FILE_SIZE_MB}MB.
          </FormDescription>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
