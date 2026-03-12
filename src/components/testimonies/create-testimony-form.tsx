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
import { useState, useRef } from "react";
import { Loader2, Image as ImageIcon, UploadCloud } from "lucide-react";
import type { TestimonyCategory, Campaign } from "@/lib/types";
import { useUser, useFirestore, useStorage } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import Image from "next/image";
import { Input } from "../ui/input";
import { ref, uploadBytesResumable, getDownloadURL, type FirebaseStorageError } from "firebase/storage";
import { Progress } from "../ui/progress";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import Link from "next/link";


const testimonyCategories: TestimonyCategory[] = ['Healing', 'Financial Breakthrough', 'Salvation', 'Relationships', 'Deliverance', 'General'];

const formSchema = z.object({
  category: z.string({ required_error: "Please select a category." }),
  content: z.string().min(50, "Testimony must be at least 50 characters.").max(5000, "Testimony is too long."),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

type CreateTestimonyFormProps = {
  onTestimonyCreated: () => void;
  campaign?: Campaign;
};

export function CreateTestimonyForm({ onTestimonyCreated, campaign }: CreateTestimonyFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storageError, setStorageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
      imageUrl: "",
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !storage) return;

    if (file.size > 5 * 1024 * 1024) {
      setStorageError("File is too large. Please select an image under 5MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setStorageError("Invalid file type. Please select an image.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setStorageError(null);
    form.setValue('imageUrl', ''); // Clear any old URL

    const storageRef = ref(storage, `testimony-images/${user.uid}/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type });

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error: FirebaseStorageError) => {
        setIsUploading(false);
        if (error.code === 'storage/unauthorized') {
            setStorageError("Permission Denied. Please ensure your Firebase Storage rules and CORS configuration are correct.");
        } else {
            setStorageError(error.message);
        }
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          form.setValue('imageUrl', downloadURL, { shouldDirty: true });
          setIsUploading(false);
          toast({ title: "Image Uploaded!", description: "The image is ready to be submitted with your testimony." });
        });
      }
    );
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to share a testimony.'});
      return;
    }

    setIsSubmitting(true);
    
    try {
      const nameParts = user.displayName?.split(' ') || [];
      const testimonyCollectionRef = collection(firestore, "testimonies");
      const testimonyData: any = {
          authorId: user.uid,
          authorFirstName: nameParts[0] || 'Anonymous',
          authorLastName: nameParts.slice(1).join(' ') || '',
          authorAvatarUrl: user.photoURL || null,
          content: values.content,
          imageUrl: values.imageUrl || null,
          createdAt: serverTimestamp(),
          category: values.category as TestimonyCategory,
      };

      if (campaign) {
        testimonyData.campaignId = campaign.id;
        testimonyData.campaignTitle = campaign.title;
      }
      
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

        <div className="space-y-2">
            <FormLabel>Image (Optional)</FormLabel>
            {form.watch('imageUrl') && (
                <div className="relative aspect-video w-full overflow-hidden rounded-md">
                    <Image src={form.watch('imageUrl')!} alt="Testimony image preview" fill className="object-cover" />
                </div>
            )}
            <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                <UploadCloud className="mr-2 h-4 w-4" />
                {isUploading ? "Uploading..." : "Upload Image"}
            </Button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/png, image/jpeg, image/gif, image/webp"
                disabled={isUploading}
            />
            {isUploading && (
              <div className="w-full px-1">
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
             {storageError && (
                 <Alert variant="destructive" className="text-xs">
                  <AlertTitle>Upload Error</AlertTitle>
                  <AlertDescription>
                    {storageError}{' '}
                    {storageError.includes("CORS") && (
                      <Link href="/docs/storage-cors-guide.md" className="underline font-semibold" target="_blank">
                        See troubleshooting guide.
                      </Link>
                    )}
                  </AlertDescription>
                </Alert>
              )}
        </div>
        
        <Button type="submit" className="w-full" disabled={isSubmitting || isUploading}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Submitting...' : 'Submit Testimony'}
        </Button>
      </form>
    </Form>
  );
}
