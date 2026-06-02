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
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { Loader2, Image as ImageIcon, Video as VideoIcon, Headphones, X, Paperclip } from "lucide-react";
import type { TestimonyCategory, Campaign, UserProfile, PrayerRequest } from "@/lib/types";
import { useUser, useFirestore, useStorage } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, runTransaction } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Card, CardHeader, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

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
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | null>(null);
  
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Maximum file size is 5MB.',
      });
      return;
    }

    const type = file.type.startsWith('image/') ? 'image' : 
                 file.type.startsWith('video/') ? 'video' : 
                 file.type.startsWith('audio/') ? 'audio' : null;

    if (!type) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload an image, video, or audio file.',
      });
      return;
    }

    setMediaFile(file);
    setMediaType(type);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore || !userProfile) return;
    setIsSubmitting(true);
    
    let uploadedMediaUrl = null;

    try {
      // 1. Handle Media Upload if exists
      if (mediaFile && storage) {
        setIsUploadingMedia(true);
        const extension = mediaFile.name.split('.').pop() || 'file';
        const safeName = `${Date.now()}.${extension}`;
        // CRITICAL: Path must match storage.rules
        const mediaRef = ref(storage, `testimony-media/${user.uid}/${safeName}`);
        
        try {
            const uploadResult = await uploadBytes(mediaRef, mediaFile);
            uploadedMediaUrl = await getDownloadURL(uploadResult.ref);
        } catch (storageErr: any) {
            console.error("Storage Error:", storageErr);
            if (storageErr.code === 'storage/unauthorized') {
                toast({
                    variant: 'destructive',
                    title: 'Upload Permission Denied',
                    description: 'Your account does not have permission to upload media. Please ensure you are signed in and try again.',
                });
                setIsSubmitting(false);
                setIsUploadingMedia(false);
                return;
            }
            throw storageErr;
        } finally {
            setIsUploadingMedia(false);
        }
      }

      // 2. Prepare Testimony Data
      const testimonyData: any = {
          authorId: user.uid,
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
          mediaUrl: uploadedMediaUrl,
          mediaType: mediaType,
      };

      if (campaign) { testimonyData.campaignId = campaign.id; testimonyData.campaignTitle = campaign.title; }
      if (prayerRequest) { testimonyData.answeredPrayerId = prayerRequest.id; testimonyData.answeredPrayerContent = prayerRequest.content; }
      
      // 3. Save to Firestore via Transaction
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
        setIsUploadingMedia(false);
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
            <CardDescription className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Answering prayer:</CardDescription>
            <div className="italic text-sm text-muted-foreground line-clamp-2 leading-relaxed">&ldquo;{prayerRequest.content}&rdquo;</div>
          </CardHeader>
        </Card>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-2xl border-2">
                        <SelectValue placeholder="What kind of miracle?" />
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
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Your Story</FormLabel>
                <FormControl>
                  <Textarea placeholder="Share what the Lord has done..." className="min-h-[180px] rounded-[2rem] p-6 text-base leading-relaxed bg-muted/10 border-2 border-dashed" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evidence (Optional)</FormLabel>
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Max 5MB</span>
              </div>
              
              {!mediaPreview ? (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 rounded-[2rem] border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors flex flex-col items-center justify-center gap-2 group"
                >
                    <div className="h-10 w-10 rounded-full bg-background border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Paperclip className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs font-bold text-primary/60 uppercase tracking-widest">Attach Media (Img, Vid, Audio)</span>
                </button>
              ) : (
                <div className="relative rounded-[2rem] overflow-hidden border shadow-lg aspect-video bg-black flex items-center justify-center">
                    {mediaType === 'image' ? (
                        <Image src={mediaPreview} alt="Preview" fill className="object-contain" unoptimized />
                    ) : mediaType === 'video' ? (
                        <video src={mediaPreview} className="w-full h-full object-contain" />
                    ) : (
                        <audio src={mediaPreview} controls className="w-full px-8" />
                    )}
                    <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-4 right-4 h-8 w-8 rounded-full shadow-lg z-10"
                        onClick={removeMedia}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <div className="absolute bottom-4 left-4">
                         <Badge className="bg-black/60 backdrop-blur-md border-white/20 text-[9px] uppercase font-black tracking-widest px-3">
                            {mediaType === 'image' ? <ImageIcon className="mr-1.5 h-3 w-3" /> : 
                             mediaType === 'video' ? <VideoIcon className="mr-1.5 h-3 w-3" /> :
                             <Headphones className="mr-1.5 h-3 w-3" />}
                            Selected {mediaType}
                         </Badge>
                    </div>
                </div>
              )}
              <Input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*,video/*,audio/*"
              />
          </div>

          <Button type="submit" className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 tracking-widest uppercase" disabled={isSubmitting || isUploadingMedia}>
            {isSubmitting || isUploadingMedia ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isUploadingMedia ? 'UPLOADING EVIDENCE...' : isSubmitting ? 'SUBMITTING miracle...' : 'PUBLISH TESTIMONY'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
