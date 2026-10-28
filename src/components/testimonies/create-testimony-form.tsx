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
  Target 
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
  
  // Recorder State
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
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

  const startCamera = async (slot: 1 | 2) => {
      setActiveSlot(slot);
      try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, 
              audio: true 
          });
          setStream(mediaStream);
          setIsRecorderOpen(true);
          // Small delay to ensure the video element is mounted before setting srcObject
          setTimeout(() => {
            if (videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = mediaStream;
            }
          }, 100);
      } catch (err) {
          console.error("Camera access error:", err);
          toast({ variant: 'destructive', title: 'Camera Blocked', description: 'Please enable camera and microphone permissions to record live.' });
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
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
          const file = new File([blob], `recorded_testimony_${Date.now()}.mp4`, { type: 'video/mp4' });
          await handleUploadProcessedFile(file, activeSlot);
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

  const handleUploadProcessedFile = async (file: File | Blob, slot: 1 | 2) => {
    if (!user || !storage) return;
    setIsUploadingMedia(slot);
    try {
        const fileRef = ref(storage, `testimonies/${user.uid}/${Date.now()}_slot${slot}_${(file as File).name || 'recorded.mp4'}`);
        const uploadResult = await uploadBytes(fileRef, file);
        const url = await getDownloadURL(uploadResult.ref);

        const type = 'video';
        if (slot === 1) {
            setMediaPreview1({ url, type });
            form.setValue('mediaUrl', url);
            form.setValue('mediaType', type);
        } else {
            setMediaPreview2({ url, type });
            form.setValue('mediaUrl2', url);
            form.setValue('mediaType2', type);
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
                <div className="space-y-2">
                    <div 
                        className={cn(
                            "border-2 border-solid rounded-2xl p-4 flex flex-col items-center justify-center bg-muted/10 transition-colors cursor-pointer group h-[120px]",
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
                                    <FileUp className="h-3.5 w-3.5 sm:h-4 w-4 text-primary" />
                                </div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Select Evidence</p>
                            </>
                        )}
                    </div>
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="w-full h-10 rounded-xl font-black uppercase text-[9px] tracking-widest border-primary/20 text-primary hover:bg-primary/5"
                        onClick={() => startCamera(slot)}
                        disabled={isUploadingMedia !== null}
                    >
                        <Video className="mr-1.5 h-3.5 w-3.5" />
                        RECORD MIRACLE
                    </Button>
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
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                        <span className="text-[8px] font-black text-white uppercase tracking-tighter">Ready</span>
                    </div>
                </div>
            )}
            <input type="file" ref={inputRef} className="hidden" accept="image/*,video/*" onChange={(e) => handleFileSelect(e, slot)} />
        </div>
      );
  };

  return (
    <div className="space-y-10 text-left">
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                <Newspaper className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="text-xl font-black font-headline uppercase tracking-tight">Proclaim Victory</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Sharing God's manifest power</p>
            </div>
        </div>

        {prayerRequest && (
            <Card className="bg-amber-500/5 border-y border-x-0 sm:border-x-2 border-solid border-amber-500/20 rounded-none sm:rounded-[1.5rem] relative overflow-hidden">
                <div className="absolute -top-4 -right-4 h-16 w-16 bg-amber-500/5 rounded-full blur-xl" />
                <CardHeader className="p-5 pb-2 relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <HandHeart className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-[9px] font-black uppercase text-amber-700 tracking-widest">Answering Prayer Altar</span>
                    </div>
                    <CardDescription className="italic text-sm text-muted-foreground leading-relaxed line-clamp-3">&ldquo;{prayerRequest.content}&rdquo;</CardDescription>
                </CardHeader>
            </Card>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-6">
            <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Testimony Theme</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-y border-x-0 sm:border-x-2 border-border shadow-inner font-bold text-base text-left">
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
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">The Full Story</FormLabel>
                    <FormControl>
                    <Textarea 
                        placeholder="Detail the greatness of God in this situation..." 
                        className="min-h-[160px] rounded-none sm:rounded-[2rem] p-6 text-base leading-relaxed bg-muted/10 border-y border-x-0 sm:border-x-2 border-solid transition-all focus:border-primary/40 focus:bg-muted/20 focus:ring-0 text-left" 
                        {...field} 
                    />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <div className="space-y-4">
                <div className="flex gap-4">
                    {renderMediaSlot(1, mediaPreview1, setMediaPreview1, fileInputRef1, 'mediaUrl', 'mediaType')}
                    {renderMediaSlot(2, mediaPreview2, setMediaPreview2, fileInputRef2, 'mediaUrl2', 'mediaType2')}
                </div>
                <p className="text-[9px] text-muted-foreground font-medium italic text-center px-4">
                    Providing proof (photos/videos) strengthens the community's faith and serves as an irrefutable weapon against the enemy.
                </p>
            </div>
          </div>

          <div className="pt-4">
              <Button type="submit" className="w-full h-16 rounded-[1.5rem] font-black text-lg shadow-2xl shadow-primary/30 tracking-widest uppercase transition-all active:scale-95" disabled={isSubmitting || isUploadingMedia !== null}>
                {isSubmitting ? (
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>PROCLAIMING...</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <Sparkles className="h-6 w-6" />
                        <span>PUBLISH TESTIMONY</span>
                    </div>
                )}
              </Button>
              <p className="text-[8px] text-center text-muted-foreground/60 font-black uppercase tracking-[0.4em] mt-6">
                TO THE GLORY OF JESUS CHRIST
              </p>
          </div>
        </form>
      </Form>

      {/* Video Recorder Overlay */}
      <Dialog open={isRecorderOpen} onOpenChange={(open) => !open && closeRecorder()}>
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-black">
              <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                  <video 
                    ref={videoPreviewRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover mirror scale-x-[-1]"
                  />
                  
                  {/* Recording UI Overlay */}
                  <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-10 pointer-events-none">
                      <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                              {isRecording && (
                                  <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full animate-pulse shadow-lg">
                                      <div className="h-2 w-2 rounded-full bg-white" />
                                      <span className="text-[10px] font-black text-white uppercase tracking-widest">REC</span>
                                  </div>
                              )}
                              <Badge className="bg-black/60 backdrop-blur-md text-white border-white/10 font-bold uppercase tracking-widest text-[10px]">
                                  {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')} / 2:00
                              </Badge>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 rounded-full bg-black/40 text-white hover:bg-black/60 pointer-events-auto" 
                            onClick={closeRecorder}
                          >
                              <X className="h-5 w-5" />
                          </Button>
                      </div>

                      <div className="space-y-4">
                        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                            <motion.div 
                                className="h-full bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${(recordingTime / MAX_RECORDING_SECONDS) * 100}%` }}
                            />
                        </div>
                        <div className="flex justify-center pointer-events-auto">
                            {!isRecording ? (
                                <Button 
                                    onClick={startRecording}
                                    size="lg"
                                    className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl ring-4 ring-white/20 flex flex-col items-center justify-center p-0 transition-transform active:scale-95"
                                >
                                    <div className="h-8 w-8 rounded-full bg-white shadow-inner" />
                                </Button>
                            ) : (
                                <Button 
                                    onClick={stopRecording}
                                    size="lg"
                                    className="h-20 w-20 rounded-full bg-white text-red-600 shadow-2xl ring-4 ring-white/20 flex flex-col items-center justify-center p-0 transition-transform active:scale-95"
                                >
                                    <Square className="h-8 w-8 fill-current" />
                                </Button>
                            )}
                        </div>
                      </div>
                  </div>
              </div>
          </DialogContent>
      </Dialog>

      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
          <Target className="h-16 w-16 text-primary" />
      </div>
    </div>
  );
}
