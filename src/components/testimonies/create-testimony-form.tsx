
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { TestimonyCategory } from "@/lib/types";
import { useUser, useFirestore, useStorage } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Input } from "../ui/input";


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
  const [file, setFile] = useState<File | null>(null);
  
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !storage || !firestore) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to share a testimony.'});
      return;
    }

    setIsSubmitting(true);
    
    let mediaUrl: string | null = null;
    let mediaType: 'image' | null = null;

    try {
      if (file) {
        const storageRef = ref(storage, `testimonies/${user.uid}/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file);
        mediaUrl = await getDownloadURL(uploadResult.ref);
        mediaType = 'image';
      }

      const testimonyCollectionRef = collection(firestore, "testimonies");
      const testimonyData: any = {
          authorId: user.uid,
          authorName: user.displayName || user.email || 'Anonymous',
          authorAvatarUrl: user.photoURL || null,
          content: values.content,
          createdAt: serverTimestamp(),
          category: values.category as TestimonyCategory,
          mediaUrl: mediaUrl,
          mediaType: mediaType,
      };
      
      await addDoc(testimonyCollectionRef, testimonyData).catch((serverError) => {
          const permissionError = new FirestorePermissionError({
              path: testimonyCollectionRef.path,
              operation: 'create',
              requestResourceData: testimonyData,
          });
          errorEmitter.emit('permission-error', permissionError);
          throw permissionError;
      });

      toast({
          title: "Testimony Submitted!",
          description: "Thank you for sharing. Your testimony is now live.",
      });
      
      onTestimonyCreated();
    } catch (error: any) {
        console.error("Submission error:", error);
        if (error.name !== 'FirestorePermissionError') {
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
        
        <FormItem>
            <FormLabel>Add a Photo (Optional)</FormLabel>
            <FormControl>
                <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={isSubmitting}/>
            </FormControl>
        </FormItem>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Submitting...' : 'Submit Testimony'}
        </Button>
      </form>
    </Form>
  );
}
