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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { 
  Loader2, 
  Camera, 
  X, 
  FileUp, 
  Sparkles, 
  Info, 
  Newspaper, 
  HandHeart, 
  Video, 
  Mic, 
  Square, 
  User, 
  Users, 
  CheckCircle2 
} from "lucide-react";
import type { TestimonyCategory, Campaign, UserProfile, PrayerRequest, TestimonyWitnessType } from "@/lib/types";
import { useUser, useFirestore, useStorage } from "@/firebase";
import { collection, serverTimestamp, doc, runTransaction } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Card, CardHeader, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  witnessType: z.enum(['Beneficiary', 'Eye Witness', 'Report']).default('Beneficiary'),
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
  
  const MAX_RECORDING_SECONDS = 120; 

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      content: "", 
      category: undefined,
      witnessType: 'Beneficiary'
    },
  });

  useEffect(() => {
    if (prayerRequest) {
      form.reset({
        category: testimonyCategories.includes(prayerRequest.category as TestimonyCategory) ? prayerRequest.category : 'General',
        content: "",
        witnessType: 'Beneficiary'
      });
    } else if (campaign) {
      form.reset({ category: 'Salvation', content: "", witnessType: 'Beneficiary' });
    }
  }, [prayerRequest, campaign, form]);

  useEffect(() => {
    return () => {
      if (mediaPreview1?.localUrl) URL.revokeObjectURL(mediaPreview1.localUrl);
      if (mediaPreview2?.localUrl) URL.revokeObjectURL(mediaPreview2.localUrl);
    };
  }, [mediaPreview1, mediaPreview2]);

  const getSupportedMimeType = (mode: 'video' | 'audio') => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = mode === 'video' 
        ? [
            'video/mp4;codecs=avc1',
            'video/mp4',
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm'
          ]
        : [
            'audio/mp4',
            'audio/aac',
            'audio/mpeg',
            'audio/webm;codecs=opus',
            'audio/webm'
          ];
          
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return mode === 'video' ? 'video/webm' : 'audio/webm';
  };

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
      const mimeType = getSupportedMimeType(recorderMode);
      
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
          const actualMimeType = mediaRecorderRef.current?.mimeType || getSupportedMimeType(recorderMode);
          const extension = actualMimeType.includes('mp4') ? 'mp4' : actualMimeType.includes('webm') ? 'webm' : 'bin';
          const blob = new Blob(chunksRef.current, { type: actualMimeType });
          const file = new File([blob], `recorded_testimony_${Date.now()}.${extension}`, { type: actualMimeType });
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
        witnessType: values.witnessType as TestimonyWitnessType,
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
                  <div className={cn("border-2 border-dashed rounded-3xl p-4 flex flex-col items-center justify-center bg-muted/10 transition-colors cursor-pointer group h-[140px] text-left", isUploadingMedia === slot ? "opacity-50 pointer-events-none" : "hover:bg-muted/20")} onClick={() => inputRef.current?.click()}>
                      {isUploadingMedia === slot ? (
                          <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              <div className="space-y-1 text-center"><p className="text-[9px] font-black uppercase tracking-widest text-primary">Uploading...</p><p className="text-[8px] font-bold text-primary/60">{Math.round(uploadProgress)}%</p></div>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center">
                              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><FileUp className="h-4 w-4 text-primary" /></div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">ADD PROOF</p>
                          </div>
                      )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-left">
                      <Button type="button" variant="outline" size="sm" className="h-10 rounded-xl font-black uppercase text-[8px] tracking-widest border-primary/20 text-primary hover:bg-primary/5 flex flex-col items-center justify-center py-1 text-center" onClick={() => startRecorder(slot, 'video')} disabled={isUploadingMedia !== null}><Video className="h-3 w-3 mb-0.5" />RECORD VIDEO</Button>
                      <Button type="button" variant="outline" size="sm" className="h-10 rounded-xl font-black uppercase text-[8px] tracking-widest border-primary/20 text-primary hover:bg-primary/5 flex flex-col items-center justify-center py-1 text-center" onClick={() => startRecorder(slot, 'audio')} disabled={isUploadingMedia !== null}><Mic className="h-3 w-3 mb-0.5" />RECORD AUDIO</Button>
                  </div>
              </div>
          ) : (
              <div className="space-y-2 text-left">
                <div className={cn("relative rounded-3xl overflow-hidden border-2 bg-muted shadow-inner group", isAudio ? "h-auto min-h-[100px]" : "aspect-square")}>
                    {preview.type === 'image' ? (
                        <Image src={preview.localUrl || preview.url} alt={`Evidence ${slot}`} fill className="object-cover" unoptimized />
                    ) : preview.type === 'video' ? (
                        <video key={preview.localUrl || preview.url} src={preview.localUrl || preview.url} className="w-full h-full object-cover bg-zinc-950" playsInline controls preload="metadata" />
                    ) : (
                        <div className="w-full h-full flex flex-row items-center gap-4 bg-primary/5 p-4 text-left">
                            <div className="relative shrink-0"><div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary" /></div></div>
                            <div className="min-w-0 flex-1 text-left"><p className="text-[10px] font-black uppercase text-primary tracking-widest mb-3">Voice Proclamation</p><audio key={preview.localUrl || preview.url} src={preview.localUrl || preview.url} className="w-full" controls preload="metadata" /></div>
                        </div>
                    )}
                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-100 transition-opacity">
                      <Button type="button" variant="destructive" size="icon" className="h-7 w-7 rounded-full shadow-lg" onClick={() => { if (preview.localUrl) URL.revokeObjectURL(preview.localUrl); setPreview(null); form.setValue(urlField, undefined); form.setValue(typeField, undefined); }}><X className="h-3.5 w-3.5" /></Button>
                    </div>
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
        <div className="flex items-center gap-3 px-1 text-left"><div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner text-left"><Newspaper className="h-5 w-5 text-primary text-left" /></div><div className="min-w-0 flex-1 text-left"><h3 className="text-xl font-black font-headline uppercase tracking-tight">Proclaim Victory</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Sharing God's manifest power</p></div></div>
        {prayerRequest && (
            <Card className="bg-amber-500/5 border-y border-x-0 sm:border-x-2 border-solid border-amber-500/20 rounded-none sm:rounded-[1.5rem] relative overflow-hidden text-left"><CardHeader className="p-5 pb-2 relative z-10 text-left"><div className="flex items-center gap-2 mb-1 text-left"><HandHeart className="h-3.5 w-3.5 text-amber-600 text-left" /><span className="text-[9px] font-black uppercase text-amber-700 tracking-widest">Answering Prayer Altar</span></div><CardDescription className="italic text-sm text-muted-foreground leading-relaxed line-clamp-3 text-left">&ldquo;{prayerRequest.content}&rdquo;</CardDescription></CardHeader></Card>
        )}
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 text-left">
          <div className="space-y-6 text-left">
            <FormField
              control={form.control}
              name="witnessType"
              render={({ field }) => (
                <FormItem className="space-y-3 text-left">
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">My Role in this Proclamation</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left"
                    >
                      <div className={cn(
                        "flex items-center space-x-3 p-4 rounded-2xl border-2 transition-all cursor-pointer text-left",
                        field.value === 'Beneficiary' ? "bg-primary/10 border-primary shadow-sm" : "bg-muted/20 border-transparent hover:bg-muted/30"
                      )}>
                        <RadioGroupItem value="Beneficiary" id="beneficiary" className="sr-only" />
                        <Label htmlFor="beneficiary" className="flex items-center gap-3 cursor-pointer w-full text-left">
                          <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shadow-inner text-left", field.value === 'Beneficiary' ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                            <User className="h-4 w-4" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-xs font-black uppercase tracking-tight text-left">Beneficiary</p>
                            <p className="text-[9px] font-bold text-muted-foreground opacity-70 text-left">Personal Miracle</p>
                          </div>
                          {field.value === 'Beneficiary' && <CheckCircle2 className="h-4 w-4 text-primary fill-current text-left" />}
                        </Label>
                      </div>

                      <div className={cn(
                        "flex items-center space-x-3 p-4 rounded-2xl border-2 transition-all cursor-pointer text-left",
                        field.value === 'Eye Witness' ? "bg-primary/10 border-primary shadow-sm" : "bg-muted/20 border-transparent hover:bg-muted/30"
                      )}>
                        <RadioGroupItem value="Eye Witness" id="eyewitness" className="sr-only" />
                        <Label htmlFor="eyewitness" className="flex items-center gap-3 cursor-pointer w-full text-left text-left">
                          <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shadow-inner text-left", field.value === 'Eye Witness' ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                            <Users className="h-4 w-4 text-left" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-xs font-black uppercase tracking-tight text-left">Eye Witness</p>
                            <p className="text-[9px] font-bold text-muted-foreground opacity-70 text-left">I saw it happen</p>
                          </div>
                          {field.value === 'Eye Witness' && <CheckCircle2 className="h-4 w-4 text-primary fill-current text-left" />}
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem className="text-left">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Theme</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl className="text-left">
                        <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-y border-x-0 sm:border-x-2 border-border shadow-inner font-bold text-base text-left">
                            <SelectValue placeholder="What is the nature of this miracle?" className="text-left" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-2xl border-none shadow-2xl text-left text-left">
                        {testimonyCategories.map(cat => (<SelectItem key={cat} value={cat} className="rounded-xl text-left">{cat}</SelectItem>))}
                        </SelectContent>
                    </Select>
                    <FormMessage className="text-left" />
                </FormItem>
                )}
            />

            <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem className="text-left">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Story</FormLabel>
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
                        Providing proof (photos/videos/audio) strengthens faith. Maximum file size is 100MB.
                    </p>
                </div>
            </div>
          </div>

          <div className="pt-4 text-left">
              <Button type="submit" className="w-full h-16 rounded-[1.5rem] font-black text-lg shadow-2xl shadow-primary/30 tracking-widest uppercase transition-all active:scale-95 text-center text-left" disabled={isSubmitting || isUploadingMedia !== null}>
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
              <p className="text-[8px] text-center text-muted-foreground/60 font-black uppercase tracking-[0.4em] mt-6 text-center text-left">
                TO THE GLORY OF JESUS CHRIST
              </p>
          </div>
        </form>
      </Form>

      <Dialog open={isRecorderOpen} onOpenChange={(open) => !open && closeRecorder()}>
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-black text-left text-left">
              <div className="sr-only text-left text-left text-left"><DialogHeader className="text-left text-left text-left text-left"><DialogTitle className="text-left text-left text-left text-left">Miracle Recorder</DialogTitle><DialogDescription className="text-left text-left text-left text-left">Capture live proof of God's goodness.</DialogDescription></DialogHeader></div>
              <DialogHeader className="p-8 border-b border-white/5 bg-zinc-900 shrink-0 text-left text-left">
                  <div className="flex items-center justify-between gap-4 text-left">
                    <div className="min-w-0 text-left">
                        <div className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-white text-left">Miracle Recorder</div>
                        <p className="text-sm font-medium text-zinc-400 mt-1 text-left">Capture your {recorderMode} proof.</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/5 text-white hover:bg-white/10 text-left" onClick={closeRecorder}><X className="h-6 w-6" /></Button>
                  </div>
              </DialogHeader>
              
              {recorderMode === 'video' ? (
                  <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden text-left">
                      <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover mirror scale-x-[-1] text-left" />
                      <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-10 pointer-events-none text-left">
                          <div className="flex justify-between items-start text-left">
                              <div className="flex items-center gap-3 text-left">{isRecording && (
                                  <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full animate-pulse shadow-lg text-left">
                                      <div className="h-2 w-2 rounded-full bg-white text-left" />
                                      <span className="text-[10px] font-black text-white uppercase tracking-widest text-left">REC</span>
                                  </div>
                              )}<Badge className="bg-black/60 backdrop-blur-md text-white border-white/10 font-bold uppercase tracking-widest text-[10px] text-left">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')} / 2:00</Badge></div>
                          </div>
                          <div className="space-y-4 text-left">
                            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden text-left"><motion.div className="h-full bg-primary text-left" initial={{ width: 0 }} animate={{ width: `${(recordingTime / MAX_RECORDING_SECONDS) * 100}%` }} /></div>
                            <div className="flex justify-center pointer-events-auto text-left text-center">
                                {!isRecording ? (<Button onClick={startRecording} size="lg" className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl ring-4 ring-white/20 flex flex-col items-center justify-center p-0 transition-transform active:scale-95 text-left text-center"><div className="h-8 w-8 rounded-full bg-white shadow-inner text-left" /></Button>) : (<Button onClick={stopRecording} size="lg" className="h-20 w-20 rounded-full bg-white text-red-600 shadow-2xl ring-4 ring-white/20 flex flex-col items-center justify-center p-0 transition-transform active:scale-95 text-left text-center text-left"><Square className="h-8 w-8 fill-current text-left" /></Button>)}
                            </div>
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="p-12 sm:p-20 bg-[#09090b] flex flex-col items-center text-center space-y-10 text-left">
                       <div className="relative text-left"><div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 shadow-[0_0_50px_rgba(249,116,22,0.1)] text-left"><Mic className={cn("h-16 w-16 text-primary transition-all text-left", isRecording && "scale-110")} /></div>{isRecording && (<div className="absolute -inset-4 border-4 border-primary/40 rounded-full animate-ping opacity-20 text-left" />)}</div>
                       <div className="space-y-4 w-full text-left">
                           <div className="text-2xl font-black font-headline uppercase tracking-tight text-white text-center text-left">Voice Proclamation</div>
                           <p className="text-zinc-500 text-sm font-medium text-center text-left">Record your vocal testimony (max 2 minutes).</p>
                           <div className="flex items-center justify-center gap-3 text-left">
                               {isRecording && <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse text-left text-left" />}
                               <span className="text-3xl font-black font-mono text-zinc-100 tabular-nums text-left text-left">
                                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                               </span>
                           </div>
                           <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden text-left"><motion.div className="h-full bg-primary text-left" initial={{ width: 0 }} animate={{ width: `${(recordingTime / MAX_RECORDING_SECONDS) * 100}%` }} /></div>
                       </div>
                       <div className="flex gap-4 w-full text-left text-left">
                                {!isRecording ? (<Button onClick={startRecording} className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-lg shadow-xl shadow-primary/20 text-center text-left"><Mic className="mr-3 h-6 w-6 text-left" /> START</Button>) : (<Button onClick={stopRecording} variant="destructive" className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-lg shadow-xl text-center text-left"><Square className="mr-3 h-6 w-6 fill-current text-left" /> STOP</Button>)}
                       </div>
                  </div>
              )}
          </DialogContent>
      </Dialog>
    </div>
  );
}
