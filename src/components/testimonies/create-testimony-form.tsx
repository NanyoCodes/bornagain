
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
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { Loader2, Camera, Video, X, FileUp, Sparkles } from "lucide-react";
import type { TestimonyCategory, Campaign, UserProfile, PrayerRequest } from "@/lib/types";
import { useUser, useFirestore, useStorage } from "@/firebase";
import { collection, serverTimestamp, doc, runTransaction } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Card, CardHeader, CardDescription, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { cn } from "@/lib/utils";

const testimonyCategories: TestimonyCategory[] = [
  'Healing', 
  'Financial Breakthrough', 
  'Salvation', 
  'Relationships', 
  'Deliverance', 
  'Academic Success', 
  'Employment', 
  'Family', 
  'Protection', 
  'Mental Health', 
  'Global Missions', 
  'Business Growth', 
  'General'
];

const formSchema = z.object({
  category: z.string({ required_error: "Please select a category." }),
  content: z.string().min(50, "Testimony must be at least 50 characters.").max(5000, "Testimony is too long."),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(['image', 'video']).optional(),
});

type CreateTestimonyFormProps = {
  onTestimonyCreated: () => void;
  userProfile: UserProfile;
  campaign?: Campaign;
  prayerRequest?: PrayerRequest | null;
};

export function CreateTestimonyForm({ onTestimonyCreated, userProfile, campaign, prayerRequest }: CreateTestimonyFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: "", category: undefined },
  });

  useEffect(() => {
    if (prayerRequest) {
      form.reset({
        category: testimonyCategories.includes(prayerRequest.category as TestimonyCategory) ? prayerRequest.category : 'General',
        content: ""
      });
    } else if (campaign) {
      form.reset({ category: 'Salvation', content: "" });
    }
  }, [prayerRequest, campaign, form]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !storage) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast({ variant: 'destructive', title: 'Invalid File', description: 'Please select an image or video.' });
      return;
    }

    setIsUploadingMedia(true);

    const processAndUpload = async () => {
      try {
        let fileToUpload: File | Blob = file;
        const sizeInMb = file.size / (1024 * 1024);

        if (isImage && sizeInMb > 5) {
          fileToUpload = await compressImage(file);
        }

        const fileRef = ref(storage, `testimonies/${user.uid}/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(fileRef, fileToUpload);
        const url = await getDownloadURL(uploadResult.ref);

        const type = isImage ? 'image' : 'video';
        setMediaPreview({ url, type });
        form.setValue('mediaUrl', url);
        form.setValue('mediaType', type);
        
        toast({ title: 'Media Ready', description: 'Your file has been optimized for the harvest.' });
      } catch (err: any) {
        console.error("Media upload error:", err);
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not transmit media.' });
      } finally {
        setIsUploadingMedia(false);
      }
    };

    processAndUpload();
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new (window as any).Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxDimension = 1920;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) { height *= maxDimension / width; width = maxDimension; }
        } else {
          if (height > maxDimension) { width *= maxDimension / height; height = maxDimension; }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas compression failed'));
        }, 'image/jpeg', 0.7);
      };
      img.onerror = reject;
    });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore || !userProfile) return;
    setIsSubmitting(true);
    
    try {
      const testimonyData: any = {
          authorId: String(user.uid),
          authorFirstName: userProfile.firstName,
          authorLastName: userProfile.lastName,
          authorAvatarUrl: userProfile.photoURL || null,
          authorLocation: userProfile.location ? {
            city: userProfile.location.city || null,
            country: userProfile.location.country || null,
            latitude: userProfile.location.latitude ?? null,
            longitude: userProfile.location.longitude ?? null,
          } : null,
          content: values.content,
          createdAt: serverTimestamp(),
          category: values.category as TestimonyCategory,
          supporters: [],
          inspiredBy: [],
          connectedBy: [],
          mediaUrl: values.mediaUrl || null,
          mediaType: values.mediaType || null,
      };

      if (campaign) { testimonyData.campaignId = campaign.id; testimonyData.campaignTitle = campaign.title; }
      if (prayerRequest) { testimonyData.answeredPrayerId = prayerRequest.id; testimonyData.answeredPrayerContent = prayerRequest.content; }
      
      const result = await runTransaction(firestore, async (transaction) => {
          const newDocRef = doc(collection(firestore, "testimonies"));
          if (prayerRequest) {
            const prayerRef = doc(firestore, 'prayerRequests', prayerRequest.id);
            const prayerDoc = await transaction.get(prayerRef);
            if (!prayerDoc.exists() || prayerDoc.data().status !== 'pending') {
                return "ALREADY_ANSWERED";
            }
            transaction.update(prayerRef, { status: 'answered', answeredTestimonyId: newDocRef.id });
          }
          transaction.set(newDocRef, testimonyData);
          return "SUCCESS";
      });

      if (result === "ALREADY_ANSWERED") {
          toast({
              title: "Already Answered",
              description: "A testimony has already been shared for this prayer request.",
          });
      } else {
          toast({ title: "Testimony Shared!", description: "God is indeed faithful." });
      }
      onTestimonyCreated();
    } catch (error: any) {
        console.error("Submission error:", error);
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'testimonies', operation: 'create' }, user));
        } else {
             toast({ variant: "destructive", title: "Error", description: error.message || "Failed to share testimony. Please try again." });
        }
    } finally { setIsSubmitting(false); }
  }

  return (
    <div className="space-y-6">
      {prayerRequest && (
        <Card className="bg-primary/5 border-primary/20 rounded-2xl">
          <CardHeader className="p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Answering prayer:</div>
            <CardDescription className="italic text-sm text-muted-foreground line-clamp-2 leading-relaxed">&ldquo;{prayerRequest.content}&rdquo;</CardDescription>
          </CardHeader>
        </Card>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-2xl border-2">
                        <SelectValue placeholder="Share your testimony" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl">
                      {testimonyCategories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                    </SelectContent>
                  </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Your Story</FormLabel>
                <FormControl>
                  <Textarea placeholder="Share what the Lord has done..." className="min-h-[180px] rounded-[2rem] p-6 text-base leading-relaxed bg-muted/10 border-2 border-dashed" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
               <Camera className="h-3.5 w-3.5" /> Media Proof (Optional)
            </Label>
            
            {!mediaPreview ? (
              <div 
                className={cn(
                  "border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center bg-muted/10 transition-colors cursor-pointer group",
                  isUploadingMedia ? "opacity-50 pointer-events-none" : "hover:bg-muted/20"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploadingMedia ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Optimizing...</p>
                  </div>
                ) : (
                  <>
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <FileUp className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Image or Video</p>
                    <p className="text-[8px] text-muted-foreground/60 mt-0.5 uppercase tracking-tighter">Files {'>'} 5MB are auto-resized</p>
                  </>
                )}
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border-2 bg-muted aspect-video shadow-inner">
                {mediaPreview.type === 'image' ? (
                  <Image src={mediaPreview.url} alt="Testimony Media" fill className="object-contain" unoptimized />
                ) : (
                  <video src={mediaPreview.url} className="w-full h-full object-contain" controls />
                )}
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="icon" 
                  className="absolute top-4 right-4 h-8 w-8 rounded-full shadow-lg" 
                  onClick={() => { setMediaPreview(null); form.setValue('mediaUrl', undefined); form.setValue('mediaType', undefined); }}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                   <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                   <span className="text-[9px] font-black text-white uppercase tracking-widest">Optimized</span>
                </div>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
          </div>

          <Button type="submit" className="w-full h-14 rounded-2xl font-black shadow-xl tracking-widest uppercase" disabled={isSubmitting || isUploadingMedia}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'PUBLISHING...' : 'PUBLISH TESTIMONY'}
          </Button>
        </form>
      </Form>
    </div>
  );
}

