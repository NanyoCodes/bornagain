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
import { useState, useRef, useEffect } from "react";
import { Loader2, Image as ImageIcon } from "lucide-react";
import type { TestimonyCategory, Campaign } from "@/lib/types";
import { useUser, useFirestore, useStorage } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import Image from "next/image";
import { ref, uploadBytesResumable, getDownloadURL, type FirebaseStorageError } from "firebase/storage";
import { Progress } from "../ui/progress";


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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
      imageUrl: "",
    },
  });

  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an image file.' });
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ variant: 'destructive', title: 'File Too Large', description: 'Please select an image smaller than 5MB.' });
        return;
    }
    
    setUploadFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    form.setValue('imageUrl', previewUrl, { shouldDirty: true });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to share a testimony.'});
      return;
    }

    setIsSubmitting(true);
    let finalImageUrl = "";

    if (uploadFile) {
      if (!storage) {
        toast({ variant: 'destructive', title: 'Storage service not available.'});
        setIsSubmitting(false);
        return;
      }
      const storageRef = ref(storage, `testimony-images/${user.uid}/${Date.now()}-${uploadFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, uploadFile);

      try {
        finalImageUrl = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      } catch (error) {
        toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload image. Please check your project configuration." });
        setIsSubmitting(false);
        return;
      }
    }
    
    try {
      const nameParts = user.displayName?.split(' ') || [];
      const testimonyCollectionRef = collection(firestore, "testimonies");
      const testimonyData: any = {
          authorId: user.uid,
          authorFirstName: nameParts[0] || 'Anonymous',
          authorLastName: nameParts.slice(1).join(' ') || '',
          authorAvatarUrl: user.photoURL || null,
          content: values.content,
          imageUrl: finalImageUrl,
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

        <FormItem>
            <FormLabel>Image (Optional)</FormLabel>
            {photoPreview ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-md border">
                    <Image src={photoPreview} alt="Testimony image preview" fill className="object-cover" />
                </div>
            ) : (
                <div className="flex items-center justify-center w-full">
                    <label htmlFor="testimony-image-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ImageIcon className="w-8 h-8 mb-2 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span></p>
                            <p className="text-xs text-muted-foreground">PNG, JPG or GIF (max 5MB)</p>
                        </div>
                        <input id="testimony-image-upload" ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                    </label>
                </div> 
            )}
             {photoPreview && (
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => {
                  setPhotoPreview('');
                  setUploadFile(null);
                  form.setValue('imageUrl', '');
                }}>Remove Image</Button>
             )}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full text-center mt-2">
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-xs text-muted-foreground mt-1">Uploading...</p>
                </div>
            )}
        </FormItem>
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Submitting...' : 'Submit Testimony'}
        </Button>
      </form>
    </Form>
  );
}
