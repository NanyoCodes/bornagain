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
import { 
  Loader2, 
  Camera, 
  Video, 
  X, 
  FileUp, 
  Sparkles, 
  Newspaper, 
  HandHeart, 
  CheckCircle2, 
  Mic, 
  Play, 
  Square, 
  Timer,
  Target,
  Music,
  Info
} from "lucide-react";
import type { TestimonyCategory, Campaign, UserProfile, PrayerRequest } from "@/lib/types";
import { useUser, useFirestore, useStorage } from "@/firebase";
import { collection, serverTimestamp, doc, runTransaction } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Card, CardHeader, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { cn } from "@/lib/utils";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState<number | null>(null);
  const [mediaPreview1, setMediaPreview1] = useState<{ url: string, type: 'image' | 'video' | 'audio' } | null>(null);
  const [mediaPreview2, setMediaPreview2] = useState<{ url: string, type: 'image' | 'video' | 'audio' } | null>(null);
  
  // Unified Recorder State
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [recorderMode, setRecorderMode] = useState<'video' | 'audio'>('video');
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const MAX_RECORDING_SECONDS = 120; // 2 minutes limit

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

  const startRecorder = async (slot: 1 | 2, mode: 'video' | 'audio') => {
      setActiveSlot(slot);
      setRecorderMode(mode);
      try {
          const constraints = mode === 'video' 
            ? { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true }
            : { audio: true };
            
          const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          setStream(mediaStream);
          setIsRecorderOpen(true);
          
          if (mode === 'video') {
            setTimeout(() => {
                if (videoPreviewRef.current) {
                    videoPreviewRef.current.srcObject = mediaStream;
                }
            }, 100);
          }
      } catch (err) {
          console.error("Media access error:", err);
          toast({ variant: 'destructive', title: 'Access Blocked', description: `Please enable ${mode} permissions to record live.` });
      }
  };

  const closeRecorder = () => {
      if (stream) {
          stream.getTracks().forEach(track => track.stop());
      }
      setStream(null);
      setIsRecording(false);
      setRecordingTime(0);
      setIsRecorderOpen(false);
      if (timerRef.current) clearInterval(timerRef.current);
  };

  const startRecording = () => {
      if (!stream) return;
      chunksRef.current = [];
      const mimeType = recorderMode === 'video' ? 'video/webm;codecs=vp8,opus' : 'audio/webm;codecs=opus';
      
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
          const type = recorderMode === 'video' ? 'video/mp4' : 'audio/mpeg';
          const extension = recorderMode === 'video' ? 'mp4' : 'mp3';
          const blob = new Blob(chunksRef.current, { type });
          const file = new File([blob], `recorded_testimony_${Date.now()}.${extension}`, { type });
          await handleUploadProcessedFile(file, activeSlot, recorderMode);
          closeRecorder();
      };

      recorder.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
          setRecordingTime(prev => {
              if (prev >= MAX_RECORDING_SECONDS - 1) {
                  stopRecording();
                  return MAX_RECORDING_SECONDS;
              }
              return prev + 1;
          });
      }, 1000);
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          if (timerRef.current) clearInterval(timerRef.current);
      }
  };

  const handleUploadProcessedFile = async (file: File | Blob, slot: 1 | 2, type: 'video' | 'audio' | 'image') => {
    if (!user || !storage) return;
    setIsUploadingMedia(slot);
    try {
        const fileRef = ref(storage, `testimonies/${user.uid}/${Date.now()}_slot${slot}_${(file as File).name || 'recorded'}`);
        const uploadResult = await uploadBytes(fileRef, file);
        const url = await getDownloadURL(uploadResult.ref);

        if (slot === 1) {
            setMediaPreview1({ url, type: type as any });
            form.setValue('mediaUrl', url);
            form.setValue('mediaType', type as any);
        } else {
            setMediaPreview2({ url, type: type as any });
            form.setValue('mediaUrl2', url);
            form.setValue('mediaType2', type as any);
        }
        toast({ title: 'Miracle Captured', description: `Proof ${slot} has been successfully recorded.` });
    } catch (err) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not save the recording.' });
    } finally {
        setIsUploadingMedia(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file || !user || !storage) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

    if (!isImage && !isVideo && !isAudio) {
      toast({ variant: 'destructive', title: 'Invalid File', description: 'Please select an image, video, or audio file.' });
      return;
    }

    setIsUploadingMedia(slot);

    const processAndUpload = async () => {
      try {
        let fileToUpload: File | Blob = file;
        const sizeInMb = file.size / (1024 * 1024);

        // Resize/Compress if > 5MB (for images)
        if (isImage && sizeInMb > 5) {
          fileToUpload = await compressImage(file);
        }

        const fileRef = ref(storage, `testimonies/${user.uid}/${Date.now()}_slot${slot}_${file.name}`);
        const uploadResult = await uploadBytes(fileRef, fileToUpload);
        const url = await getDownloadURL(uploadResult.ref);

        const type = isImage ? 'image' : isVideo ? 'video' : 'audio';
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
        <div className="space-y-4 flex-1 text-left">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2 text-left text-left">
                <Camera className="h-3.5 w-3.5 text-primary text-left text-left" /> Proof {slot} {slot === 2 && "(Optional)"}
            </Label>
            
            {!preview ? (
                <div className="space-y-3 text-left">
                    <div 
                        className={cn(
                            "border-2 border-dashed rounded-3xl p-4 flex flex-col items-center justify-center bg-muted/10 transition-colors cursor-pointer group h-[140px] text-left",
                            isUploadingMedia === slot ? "opacity-50 pointer-events-none" : "hover:bg-muted/20"
                        )}
                        onClick={() => inputRef.current?.click()}
                    >
                        {isUploadingMedia === slot ? (
                            <div className="flex flex-col items-center gap-2 text-left">
                                <Loader2 className="h-6 w-6 animate-spin text-primary text-left" />
                                <p className="text-[9px] font-black uppercase tracking-widest text-primary text-center">Optimizing...</p>
                            </div>
                        ) : (
                            <>
                                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform text-left">
                                    <FileUp className="h-4 w-4 text-primary text-left" />
                                </div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center text-left">Select File</p>
                                <p className="text-[8px] text-muted-foreground/40 mt-1 uppercase text-left">Image or Video</p>
                            </>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-left text-left">
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="h-10 rounded-xl font-black uppercase text-[8px] tracking-widest border-primary/20 text-primary hover:bg-primary/5 flex flex-col items-center justify-center py-1 text-center text-left"
                            onClick={() => startRecorder(slot, 'video')}
                            disabled={isUploadingMedia !== null}
                        >
                            <Video className="h-3 w-3 mb-0.5 text-left text-left" />
                            RECORD VIDEO
                        </Button>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="h-10 rounded-xl font-black uppercase text-[8px] tracking-widest border-primary/20 text-primary hover:bg-primary/5 flex flex-col items-center justify-center py-1 text-center text-left"
                            onClick={() => startRecorder(slot, 'audio')}
                            disabled={isUploadingMedia !== null}
                        >
                            <Mic className="h-3 w-3 mb-0.5 text-left text-left" />
                            RECORD AUDIO
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="relative rounded-3xl overflow-hidden border-2 bg-muted aspect-square shadow-inner group text-left">
                    {preview.type === 'image' ? (
                        <Image src={preview.url} alt={`Evidence ${slot}`} fill className="object-contain text-left" unoptimized />
                    ) : preview.type === 'video' ? (
                        <video src={preview.url} className="w-full h-full object-cover bg-zinc-950 text-left" playsInline controls />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-primary/5 p-4 text-left">
                            <div className="relative text-left">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-left">
                                    <Mic className="h-6 w-6 text-primary text-left" />
                                </div>
                                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-primary animate-pulse text-left" />
                            </div>
                            <p className="text-[9px] font-black uppercase text-primary tracking-widest mb-4 text-left">Voice of Thanksgiving</p>
                            <audio src={preview.url} className="w-full text-left" controls />
                        </div>
                    )}
                    <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity text-left" 
                        onClick={() => { setPreview(null); form.setValue(urlField, undefined); form.setValue(typeField, undefined); }}
                    >
                        <X className="h-3.5 w-3.5 text-left" />
                    </Button>
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1 text-left">
                        <CheckCircle2 className="h-2.5 w-2.5 text-green-500 text-left" />
                        <span className="text-[8px] font-black text-white uppercase tracking-tighter text-left">Ready</span>
                    </div>
                </div>
            )}
            <input type="file" ref={inputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={(e) => handleFileSelect(e, slot)} />
        </div>
      );
  };

  return (
    <div className="space-y-10 text-left">
      <div className="space-y-4 text-left">
        <div className="flex items-center gap-3 px-1 text-left">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner text-left">
                <Newspaper className="h-5 w-5 text-primary text-left" />
            </div>
            <div className="min-w-0 flex-1 text-left">
                <h3 className="text-xl font-black font-headline uppercase tracking-tight text-left">Proclaim Victory</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 text-left">Sharing God's manifest power</p>
            </div>
        </div>

        {prayerRequest && (
            <Card className="bg-amber-500/5 border-y border-x-0 sm:border-x-2 border-solid border-amber-500/20 rounded-none sm:rounded-[1.5rem] relative overflow-hidden text-left">
                <div className="absolute -top-4 -right-4 h-16 w-16 bg-amber-500/5 rounded-full blur-xl text-left" />
                <CardHeader className="p-5 pb-2 relative z-10 text-left">
                    <div className="flex items-center gap-2 mb-1 text-left">
                        <HandHeart className="h-3.5 w-3.5 text-amber-600 text-left" />
                        <span className="text-[9px] font-black uppercase text-amber-700 tracking-widest text-left">Answering Prayer Altar</span>
                    </div>
                    <CardDescription className="italic text-sm text-muted-foreground leading-relaxed line-clamp-3 text-left">&ldquo;{prayerRequest.content}&rdquo;</CardDescription>
                </CardHeader>
            </Card>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 text-left">
          <div className="space-y-6 text-left">
            <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem className="text-left">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Theme</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl className="text-left">
                        <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-y border-x-0 sm:border-x-2 border-border shadow-inner font-bold text-base text-left">
                            <SelectValue placeholder="What is the nature of this miracle?" className="text-left" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-2xl border-none shadow-2xl text-left">
                        {testimonyCategories.map(cat => (<SelectItem key={cat} value={cat} className="rounded-xl text-left">{cat}</SelectItem>))}
                        </SelectContent>
                    </Select>
                    <FormMessage className="text-left" />
                </FormItem>
                )}
            />

            <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem className="text-left">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Full Story</FormLabel>
                    <FormControl className="text-left">
                    <Textarea 
                        placeholder="Detail the greatness of God in this situation..." 
                        className="min-h-[160px] rounded-none sm:rounded-[2rem] p-6 text-base leading-relaxed bg-muted/10 border-y border-x-0 sm:border-x-2 border-solid transition-all focus:border-primary/40 focus:bg-muted/20 focus:ring-0 text-left" 
                        {...field} 
                    />
                    </FormControl>
                    <FormMessage className="text-left" />
                </FormItem>
                )}
            />

            <div className="space-y-4 text-left">
                <div className="flex flex-col sm:flex-row gap-6 text-left">
                    {renderMediaSlot(1, mediaPreview1, setMediaPreview1, fileInputRef1, 'mediaUrl', 'mediaType')}
                    {renderMediaSlot(2, mediaPreview2, setMediaPreview2, fileInputRef2, 'mediaUrl2', 'mediaType2')}
                </div>
                <div className="bg-primary/5 p-4 rounded-2xl border-2 border-dashed border-primary/10 flex items-start gap-3 mt-4 text-left">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5 text-left" />
                    <p className="text-[10px] text-muted-foreground font-medium leading-relaxed text-left">
                        Providing proof (photos/videos/audio) strengthens the community's faith and serves as an irrefutable weapon against the enemy. Maximum recording length is 2 minutes.
                    </p>
                </div>
            </div>
          </div>

          <div className="pt-4 text-left">
              <Button type="submit" className="w-full h-16 rounded-[1.5rem] font-black text-lg shadow-2xl shadow-primary/30 tracking-widest uppercase transition-all active:scale-95 text-center text-left" disabled={isSubmitting || isUploadingMedia !== null}>
                {isSubmitting ? (
                    <div className="flex items-center gap-3 text-left">
                        <Loader2 className="h-6 w-6 animate-spin text-left" />
                        <span className="text-left">PROCLAIMING...</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 text-left">
                        <Sparkles className="h-6 w-6 text-left" />
                        <span className="text-left">PUBLISH TESTIMONY</span>
                    </div>
                )}
              </Button>
              <p className="text-[8px] text-center text-muted-foreground/60 font-black uppercase tracking-[0.4em] mt-6 text-center text-left">
                TO THE GLORY OF JESUS CHRIST
              </p>
          </div>
        </form>
      </Form>

      {/* Media Recorder Overlay */}
      <Dialog open={isRecorderOpen} onOpenChange={(open) => !open && closeRecorder()}>
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-black text-left">
              <DialogHeader className="sr-only text-left">
                  <DialogTitle className="text-left">Miracle Recorder</DialogTitle>
                  <DialogDescription className="text-left text-left">Capture your {recorderMode} proof.</DialogDescription>
              </DialogHeader>
              
              {recorderMode === 'video' ? (
                  <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden text-left text-left">
                      <video 
                        ref={videoPreviewRef} 
                        autoPlay 
                        muted 
                        playsInline 
                        className="w-full h-full object-cover mirror scale-x-[-1] text-left text-left"
                      />
                      
                      {/* Recording UI Overlay */}
                      <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-10 pointer-events-none text-left text-left">
                          <div className="flex justify-between items-start text-left text-left text-left">
                              <div className="flex items-center gap-3 text-left text-left text-left">
                                  {isRecording && (
                                      <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full animate-pulse shadow-lg text-left text-left text-left text-left">
                                          <div className="h-2 w-2 rounded-full bg-white text-left text-left text-left text-left" />
                                          <span className="text-[10px] font-black text-white uppercase tracking-widest text-left text-left text-left text-left">REC</span>
                                      </div>
                                  )}
                                  <Badge className="bg-black/60 backdrop-blur-md text-white border-white/10 font-bold uppercase tracking-widest text-[10px] text-left text-left text-left">
                                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')} / 2:00
                                  </Badge>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 rounded-full bg-black/40 text-white hover:bg-black/60 pointer-events-auto text-left text-left text-left text-left" 
                                onClick={closeRecorder}
                              >
                                  <X className="h-5 w-5 text-left text-left text-left" />
                              </Button>
                          </div>

                          <div className="space-y-4 text-left text-left text-left">
                            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden text-left text-left text-left">
                                <motion.div 
                                    className="h-full bg-primary text-left text-left text-left"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(recordingTime / MAX_RECORDING_SECONDS) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-center pointer-events-auto text-left text-left text-left">
                                {!isRecording ? (
                                    <Button 
                                        onClick={startRecording}
                                        size="lg"
                                        className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl ring-4 ring-white/20 flex flex-col items-center justify-center p-0 transition-transform active:scale-95 text-center text-left text-left"
                                    >
                                        <div className="h-8 w-8 rounded-full bg-white shadow-inner text-left text-left text-left" />
                                    </Button>
                                ) : (
                                    <Button 
                                        onClick={stopRecording}
                                        size="lg"
                                        className="h-20 w-20 rounded-full bg-white text-red-600 shadow-2xl ring-4 ring-white/20 flex flex-col items-center justify-center p-0 transition-transform active:scale-95 text-center text-left text-left"
                                    >
                                        <Square className="h-8 w-8 fill-current text-left text-left text-left" />
                                    </Button>
                                )}
                            </div>
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="p-12 sm:p-20 bg-[#09090b] flex flex-col items-center text-center space-y-10 text-left text-left">
                       <div className="relative text-left text-left">
                            <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 shadow-[0_0_50px_rgba(249,116,22,0.1)] text-left text-left text-left">
                                <Mic className={cn("h-16 w-16 text-primary transition-all text-left text-left text-left", isRecording && "scale-110")} />
                            </div>
                            {isRecording && (
                                <div className="absolute -inset-4 border-4 border-primary/40 rounded-full animate-ping opacity-20 text-left text-left" />
                            )}
                       </div>

                       <div className="space-y-4 w-full text-left text-left">
                           <h3 className="text-2xl font-black font-headline uppercase tracking-tight text-white text-center text-left text-left">Voice of Thanksgiving</h3>
                           <p className="text-zinc-500 text-sm font-medium text-center text-left text-left">Record your vocal proclamation (max 2 minutes).</p>
                           
                           <div className="flex items-center justify-center gap-3 text-left text-left">
                               {isRecording && <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse text-left text-left" />}
                               <span className="text-3xl font-black font-mono text-zinc-100 tabular-nums text-left text-left">
                                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                               </span>
                           </div>

                            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden text-left text-left">
                                <motion.div 
                                    className="h-full bg-primary text-left text-left"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(recordingTime / MAX_RECORDING_SECONDS) * 100}%` }}
                                />
                            </div>
                       </div>

                       <div className="flex gap-4 w-full text-left text-left">
                            {!isRecording ? (
                                <Button 
                                    onClick={startRecording} 
                                    className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-lg shadow-xl shadow-primary/20 text-center text-left text-left"
                                >
                                    <Mic className="mr-3 h-6 w-6 text-left text-left" /> START
                                </Button>
                            ) : (
                                <Button 
                                    onClick={stopRecording} 
                                    variant="destructive"
                                    className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-lg shadow-xl text-center text-left text-left"
                                >
                                    <Square className="mr-3 h-6 w-6 fill-current text-left text-left" /> STOP
                                </Button>
                            )}
                            <Button 
                                variant="outline" 
                                onClick={closeRecorder} 
                                disabled={isRecording}
                                className="h-16 w-16 rounded-2xl border-zinc-800 text-zinc-400 text-left text-left"
                            >
                                <X className="h-6 w-6 text-left text-left" />
                            </Button>
                       </div>
                  </div>
              )}
          </DialogContent>
      </Dialog>

      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none text-left">
          <Target className="h-16 w-16 text-primary text-left" />
      </div>
    </div>
  );
}
