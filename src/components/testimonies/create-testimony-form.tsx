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
import { Loader2, Camera, X, FileUp, Sparkles } from "lucide-react";
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
  mediaUrl2: z.string().optional(),
  mediaType2: z.enum(['image', 'video']).optional(),
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
  const [isUploadingMedia, setIsUploadingMedia] = useState<number | null>(null);
  const [mediaPreview1, setMediaPreview1] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [mediaPreview2, setMediaPreview2] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file || !user || !storage) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast({ variant: 'destructive', title: 'Invalid File', description: 'Please select an image or video.' });
      return;
    }

    setIsUploadingMedia(slot);

    const processAndUpload = async () => {
      try {
        let fileToUpload: File | Blob = file;
        const sizeInMb = file.size / (1024 * 1024);

        if (isImage && sizeInMb > 5) {
          fileToUpload = await compressImage(file);
        }

        const fileRef = ref(storage, `testimonies/${user.uid}/${Date.now()}_slot${slot}_${file.name}`);
        const uploadResult = await uploadBytes(fileRef, fileToUpload);
        const url = await getDownloadURL(uploadResult.ref);

        const type = isImage ? 'image' : 'video';
        if (slot === 1) {
            setMediaPreview1({ url, type });
            form.setValue('mediaUrl', url);
            form.setValue('mediaType', type);
        } else {
            setMediaPreview2({ url, type });
            form.setValue('mediaUrl2', url);
            form.setValue('mediaType2', type);
        }
        
        toast({ title: 'Media Ready', description: `Proof ${slot} optimized for the harvest.` });
      } catch (err: any) {
        console.error("Media upload error:", err);
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not transmit media.' });
      } finally {
        setIsUploadingMedia(null);
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
            state: userProfile.location.state || null,
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
          mediaUrl2: values.mediaUrl2 || null,
          mediaType2: values.mediaType2 || null,
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
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'testimonies', operation: 'create' }, user));
        } else {
             toast({ variant: "destructive", title: "Error", description: error.message || "Failed to share testimony. Please try again." });
        }
    } finally { setIsSubmitting(false); }
  }

  const renderMediaSlot = (slot: 1 | 2, preview: any, setPreview: any, inputRef: React.RefObject<HTMLInputElement | null>, urlField: 'mediaUrl' | 'mediaUrl2', typeField: 'mediaType' | 'mediaType2') => {
      return (
        <div className="space-y-3 flex-1 text-left">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                <Camera className="h-3.5 w-3.5 text-primary" /> Proof {slot} {slot === 2 && "(Optional)"}
            </Label>
            
            {!preview ? (
                <div 
                    className={cn(
                        "border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center bg-muted/10 transition-colors cursor-pointer group h-[120px]",
                        isUploadingMedia === slot ? "opacity-50 pointer-events-none" : "hover:bg-muted/20"
                    )}
                    onClick={() => inputRef.current?.click()}
                >
                    {isUploadingMedia === slot ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-primary text-center">Optimizing...</p>
                        </div>
                    ) : (
                        <>
                            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                <FileUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Select Evidence</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="relative rounded-2xl overflow-hidden border-2 bg-muted aspect-square shadow-inner">
                    {preview.type === 'image' ? (
                        <Image src={preview.url} alt={`Evidence ${slot}`} fill className="object-contain" unoptimized />
                    ) : (
                        <video src={preview.url} className="w-full h-full object-contain bg-zinc-950" playsInline controls />
                    )}
                    <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg" 
                        onClick={() => { setPreview(null); form.setValue(urlField, undefined); form.setValue(typeField, undefined); }}
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            )}
            <input type="file" ref={inputRef} className="hidden" accept="image/*,video/*" onChange={(e) => handleFileSelect(e, slot)} />
        </div>
      );
  };

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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 text-left">
          <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem className="text-left">
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Category</FormLabel>
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
              <FormItem className="text-left">
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Your Story</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Share what the Lord has done..." 
                    className="min-h-[120px] rounded-[1.25rem] p-4 text-base leading-relaxed bg-muted/10 border-2 border-dashed transition-all focus:border-primary/40 focus:bg-muted/20" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-4">
             {renderMediaSlot(1, mediaPreview1, setMediaPreview1, fileInputRef1, 'mediaUrl', 'mediaType')}
             {renderMediaSlot(2, mediaPreview2, setMediaPreview2, fileInputRef2, 'mediaUrl2', 'mediaType2')}
          </div>

          <Button type="submit" className="w-full h-14 rounded-2xl font-black shadow-xl tracking-widest uppercase" disabled={isSubmitting || isUploadingMedia !== null}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'PUBLISHING...' : 'PUBLISH TESTIMONY'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
