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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { Loader2, Camera, X, FileUp, Sparkles, Info, Newspaper, ExternalLink } from "lucide-react";
import type { TestimonyCategory, Campaign, UserProfile, PrayerRequest } from "@/lib/types";
import { useUser, useFirestore, useStorage } from "@/firebase";
import { collection, serverTimestamp, doc, runTransaction } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Card, CardHeader, CardDescription, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { cn, safeToDate } from "@/lib/utils";
import { motion } from "framer-motion";

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
  mediaType: z.enum(['image', 'video', 'audio']).optional(),
  mediaUrl2: z.string().optional(),
  mediaType2: z.enum(['image', 'video', 'audio']).optional(),
});

type CreateTestimonyFormProps = {
  onTestimonyCreated: () => void;
  userProfile: UserProfile;
  campaign?: Campaign;
  prayerRequest?: PrayerRequest | null;
};

export function CreateTestimonyForm({ onTestimonyCreated, userProfile, campaign, prayerRequest }: CreateTestimonyFormProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const [testimonyId] = useState(() => doc(collection(firestore, "testimonies")).id);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [mediaPreview1, setMediaPreview1] = useState<{ url: string, localUrl?: string, type: 'image' | 'video' | 'audio' } | null>(null);
  const [mediaPreview2, setMediaPreview2] = useState<{ url: string, localUrl?: string, type: 'image' | 'video' | 'audio' } | null>(null);
  
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    return () => {
      if (mediaPreview1?.localUrl) URL.revokeObjectURL(mediaPreview1.localUrl);
      if (mediaPreview2?.localUrl) URL.revokeObjectURL(mediaPreview2.localUrl);
    };
  }, [mediaPreview1, mediaPreview2]);

  const handleUploadProcessedFile = async (file: File | Blob, slot: 1 | 2, type: 'video' | 'audio' | 'image') => {
    if (!user || !storage) return;
    if (file.size > 100 * 1024 * 1024) { 
      toast({ variant: 'destructive', title: 'File Too Large', description: 'Maximum size is 100MB.' }); 
      return; 
    }
    setIsUploadingMedia(slot);
    setUploadProgress(0);
    const localUrl = URL.createObjectURL(file);
    try {
        const originalName = (file as File).name || `upload_${Date.now()}`;
        const fileRef = ref(storage, `testimonies/${user.uid}/${Date.now()}_slot${slot}_${originalName}`);
        
        const contentType = (file.type || (type === 'audio' ? 'audio/mp4' : type === 'video' ? 'video/mp4' : 'image/jpeg')).split(';')[0];
        const metadata = { contentType, customMetadata: { testimonyId, slot: slot.toString() } };
        
        const uploadTask = uploadBytesResumable(fileRef, file, metadata);
        uploadTask.on('state_changed', 
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => { 
              toast({ variant: 'destructive', title: 'Upload Failed' }); 
              setIsUploadingMedia(null); 
            },
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                if (slot === 1) {
                    if (mediaPreview1?.localUrl) URL.revokeObjectURL(mediaPreview1.localUrl);
                    setMediaPreview1({ url, localUrl, type: type as any });
                    form.setValue('mediaUrl', url);
                    form.setValue('mediaType', type as any);
                } else {
                    if (mediaPreview2?.localUrl) URL.revokeObjectURL(mediaPreview2.localUrl);
                    setMediaPreview2({ url, localUrl, type: type as any });
                    form.setValue('mediaUrl2', url);
                    form.setValue('mediaType2', type as any);
                }
                toast({ title: 'Media Ready' });
                setIsUploadingMedia(null);
            }
        );
    } catch (err) { 
      setIsUploadingMedia(null); 
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file || !user || !storage) return;
    
    let fileType = file.type;
    if (!fileType) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const typeMap: Record<string, string> = { 
          'mp4': 'video/mp4', 'mov': 'video/quicktime', 'webm': 'video/webm', 
          'm4a': 'audio/mp4', 'mp3': 'audio/mpeg', 'aac': 'audio/aac', 'wav': 'audio/wav', 
          'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png' 
        };
        fileType = typeMap[ext || ''] || '';
    }
    const type = fileType.startsWith('image/') ? 'image' : fileType.startsWith('video/') ? 'video' : fileType.startsWith('audio/') ? 'audio' : null;
    if (!type) { 
      toast({ variant: 'destructive', title: 'Invalid File', description: 'Please select an image, video, or audio file.' }); 
      return; 
    }
    handleUploadProcessedFile(file, slot, type as any);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore || !userProfile) return;
    setIsSubmitting(true);
    try {
      const testimonyData: any = { 
        authorId: user.uid, 
        authorFirstName: userProfile.firstName, 
        authorLastName: userProfile.lastName, 
        authorAvatarUrl: userProfile.photoURL || null, 
        authorLocation: userProfile.location ? { 
          city: userProfile.location.city || null, 
          country: userProfile.location.country || null, 
          latitude: userProfile.location.latitude ?? null, 
          longitude: userProfile.location.longitude ?? null 
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
        mediaType2: values.mediaType2 || null 
      };
      if (campaign) { testimonyData.campaignId = campaign.id; testimonyData.campaignTitle = campaign.title; }
      if (prayerRequest) { testimonyData.answeredPrayerId = prayerRequest.id; testimonyData.answeredPrayerContent = prayerRequest.content; }
      const result = await runTransaction(firestore, async (transaction) => {
          const newDocRef = doc(firestore, "testimonies", testimonyId);
          if (prayerRequest) {
            const prayerRef = doc(firestore, 'prayerRequests', prayerRequest.id);
            const prayerDoc = await transaction.get(prayerRef);
            if (!prayerDoc.exists() || prayerDoc.data().status !== 'pending') return "ALREADY_ANSWERED";
            transaction.update(prayerRef, { status: 'answered', answeredTestimonyId: newDocRef.id });
          }
          transaction.set(newDocRef, testimonyData);
          return "SUCCESS";
      });
      if (result === "ALREADY_ANSWERED") toast({ title: "Already Answered", description: "Testimony already shared for this request." });
      else toast({ title: "Testimony Shared!", description: "God is indeed faithful." });
      onTestimonyCreated();
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message || "Failed to share testimony." }); }
    finally { setIsSubmitting(false); }
  }

  const renderMediaSlot = (slot: 1 | 2, preview: any, setPreview: any, inputRef: React.RefObject<HTMLInputElement | null>, urlField: 'mediaUrl' | 'mediaUrl2', typeField: 'mediaType' | 'mediaType2') => {
    const isAudio = preview?.type === 'audio';
    return (
      <div className="space-y-4 flex-1 text-left">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2"><Camera className="h-3.5 w-3.5 text-primary" /> Evidence {slot} {slot === 2 && "(Optional)"}</Label>
          {!preview ? (
              <div className="space-y-3 text-left">
                  <div className={cn("border-2 border-dashed rounded-3xl p-4 flex flex-col items-center justify-center bg-muted/10 transition-colors cursor-pointer group h-[140px]", isUploadingMedia === slot ? "opacity-50 pointer-events-none" : "hover:bg-muted/20")} onClick={() => inputRef.current?.click()}>
                      {isUploadingMedia === slot ? (
                          <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              <div className="space-y-1 text-center"><p className="text-[9px] font-black uppercase tracking-widest text-primary">Uploading...</p><p className="text-[8px] font-bold text-primary/60">{Math.round(uploadProgress)}%</p></div>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center"><div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><FileUp className="h-4 w-4 text-primary" /></div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Select File</p><p className="text-[8px] text-muted-foreground/40 mt-1 uppercase">Image, Video, Audio</p></div>
                      )}
                  </div>
              </div>
          ) : (
              <div className="space-y-2">
                <div className={cn("relative rounded-3xl overflow-hidden border-2 bg-muted shadow-inner group", isAudio ? "h-auto min-h-[100px]" : "aspect-square")}>
                    {preview.type === 'image' ? (
                        <Image src={preview.localUrl || preview.url} alt={`Evidence ${slot}`} fill className="object-cover" unoptimized />
                    ) : preview.type === 'video' ? (
                        <video 
                          key={preview.localUrl || preview.url} 
                          src={preview.localUrl || preview.url} 
                          className="w-full h-full object-cover bg-zinc-950" 
                          playsInline 
                          controls 
                          preload="metadata" 
                          onError={(e) => toast({ variant: 'destructive', title: `Playback failed (code ${e.currentTarget.error?.code})` })} 
                        />
                    ) : (
                        <div className="w-full h-full flex flex-row items-center gap-4 bg-primary/5 p-4">
                            <div className="relative shrink-0"><div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary" /></div></div>
                            <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase text-primary tracking-widest mb-3">Voice Proclamation</p><audio key={preview.localUrl || preview.url} src={preview.localUrl || preview.url} className="w-full" controls preload="metadata" onError={(e) => toast({ variant: 'destructive', title: `Playback failed (code ${e.currentTarget.error?.code})` })} /></div>
                        </div>
                    )}
                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg opacity-100 transition-opacity" onClick={() => { if (preview.localUrl) URL.revokeObjectURL(preview.localUrl); setPreview(null); form.setValue(urlField, undefined); form.setValue(typeField, undefined); }}><X className="h-3.5 w-3.5" /></Button>
                </div>
                <Button asChild variant="link" className="h-auto p-0 text-[9px] font-bold uppercase tracking-tighter text-muted-foreground hover:text-primary"><a href={preview.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-2 w-2" /> Open in new tab</a></Button>
              </div>
          )}
          <input type="file" ref={inputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={(e) => handleFileSelect(e, slot)} />
      </div>
    );
  };

  return (
    <div className="space-y-10 text-left">
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1 text-left"><div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner"><Newspaper className="h-5 w-5 text-primary" /></div><div className="min-w-0 flex-1 text-left"><h3 className="text-xl font-black font-headline uppercase tracking-tight">Proclaim Victory</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Sharing God's manifest power</p></div></div>
        {prayerRequest && (
            <Card className="bg-amber-500/5 border-y border-x-0 sm:border-x-2 border-solid border-amber-500/20 rounded-none sm:rounded-[1.5rem] relative overflow-hidden text-left"><div className="absolute -top-4 -right-4 h-16 w-16 bg-amber-500/5 rounded-full blur-xl" /><CardHeader className="p-5 pb-2 relative z-10"><div className="flex items-center gap-2 mb-1"><HandHeart className="h-3.5 w-3.5 text-amber-600" /><span className="text-[9px] font-black uppercase text-amber-700 tracking-widest">Answering Prayer Altar</span></div><CardDescription className="italic text-sm text-muted-foreground leading-relaxed line-clamp-3">&ldquo;{prayerRequest.content}&rdquo;</CardDescription></CardHeader></Card>
        )}
      </div>
      <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 text-left">
          <div className="space-y-6 text-left"><FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Theme</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-y border-x-0 sm:border-x-2 border-border shadow-inner font-bold text-base">
                            <SelectValue placeholder="What is the nature of this miracle?" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                        {testimonyCategories.map(cat => (<SelectItem key={cat} value={cat} className="rounded-xl">{cat}</SelectItem>))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Story</FormLabel>
                    <FormControl>
                    <Textarea 
                        placeholder="Detail the greatness of God in this situation..." 
                        className="min-h-[160px] rounded-none sm:rounded-[2rem] p-6 text-base leading-relaxed bg-muted/10 border-y border-x-0 sm:border-x-2 border-solid transition-all focus:border-primary/40 focus:bg-muted/20 focus:ring-0" 
                        {...field} 
                    />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <div className="space-y-4 text-left">
                <div className="flex flex-col sm:flex-row gap-6 text-left">
                    {renderMediaSlot(1, mediaPreview1, setMediaPreview1, fileInputRef1, 'mediaUrl', 'mediaType')}
                    {renderMediaSlot(2, mediaPreview2, setMediaPreview2, fileInputRef2, 'mediaUrl2', 'mediaType2')}
                </div>
                <div className="bg-primary/5 p-4 rounded-2xl border-2 border-dashed border-primary/10 flex items-start gap-3 mt-4 text-left">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                        Providing proof (photos/videos/audio) strengthens faith. Maximum file size is 100MB.
                    </p>
                </div>
            </div>
          </div>

          <div className="pt-4 text-left">
              <Button type="submit" className="w-full h-16 rounded-[1.5rem] font-black text-lg shadow-2xl shadow-primary/30 tracking-widest uppercase transition-all active:scale-95" disabled={isSubmitting || isUploadingMedia !== null}>
                {isSubmitting ? (
                    <div className="flex items-center justify-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>PROCLAIMING...</span>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-3">
                        <Sparkles className="h-6 w-6" />
                        <span>PUBLISH TESTIMONY</span>
                    </div>
                )}
              </Button>
              <p className="text-[8px] text-center text-muted-foreground/60 font-black uppercase tracking-[0.4em] mt-6">
                TO THE GLORY OF JESUS CHRIST
              </p>
          </div>
        </form></Form>
    </div>
  );
}
