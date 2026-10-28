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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { 
  Loader2, 
  Camera, 
  X, 
  FileUp, 
  Video, 
  Mic, 
  Square,
  Sparkles,
  Info
} from "lucide-react";
import { Testimony, TestimonyCategory } from "@/lib/types";
import { useFirestore, useUser, useStorage } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
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
  mediaUrl: z.string().optional().nullable(),
  mediaType: z.enum(['image', 'video', 'audio']).optional().nullable(),
  mediaUrl2: z.string().optional().nullable(),
  mediaType2: z.enum(['image', 'video', 'audio']).optional().nullable(),
});

type EditTestimonyFormProps = {
  testimony: Testimony;
  onTestimonyUpdated: () => void;
};

export function EditTestimonyForm({ testimony, onTestimonyUpdated }: EditTestimonyFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState<number | null>(null);
  
  const [mediaPreview1, setMediaPreview1] = useState<{ url: string, type: 'image' | 'video' | 'audio' } | null>(
    testimony.mediaUrl ? { url: testimony.mediaUrl, type: testimony.mediaType as any } : null
  );
  const [mediaPreview2, setMediaPreview2] = useState<{ url: string, type: 'image' | 'video' | 'audio' } | null>(
    testimony.mediaUrl2 ? { url: testimony.mediaUrl2, type: testimony.mediaType2 as any } : null
  );

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

  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: testimony.category,
      content: testimony.content,
      mediaUrl: testimony.mediaUrl || null,
      mediaType: testimony.mediaType || null,
      mediaUrl2: testimony.mediaUrl2 || null,
      mediaType2: testimony.mediaType2 || null,
    },
  });

  const getSupportedMimeType = (mode: 'video' | 'audio') => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = mode === 'video' 
        ? [
            'video/mp4;codecs=avc1',
            'video/mp4',
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/quicktime'
          ]
        : [
            'audio/mp4',
            'audio/aac',
            'audio/mpeg',
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/wav'
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
          const finalMimeType = getSupportedMimeType(recorderMode);
          const extension = finalMimeType.includes('mp4') ? 'mp4' : finalMimeType.includes('webm') ? 'webm' : 'bin';
          const blob = new Blob(chunksRef.current, { type: finalMimeType });
          const file = new File([blob], `recorded_testimony_edit_${Date.now()}.${extension}`, { type: finalMimeType });
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
        const fileRef = ref(storage, `testimonies/${user.uid}/${Date.now()}_edit_slot${slot}_${(file as File).name || 'recorded'}`);
        const uploadResult = await uploadBytes(fileRef, file, { contentType: file.type });
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
        toast({ title: 'Miracle Updated', description: `Proof ${slot} successfully captured.` });
    } catch (err) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not update the recording.' });
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

        if (isImage && sizeInMb > 5) {
          fileToUpload = await compressImage(file);
        }

        const fileRef = ref(storage, `testimonies/${user.uid}/${Date.now()}_edit_slot${slot}_${file.name}`);
        const uploadResult = await uploadBytes(fileRef, fileToUpload, { contentType: fileToUpload.type || file.type });
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
        
        toast({ title: 'Evidence Updated', description: `Proof ${slot} has been successfully replaced.` });
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in again.' });
      return;
    }
    if (user.uid !== testimony.authorId) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'You can only edit your own testimonies.' });
      return;
    }

    setIsSubmitting(true);
    
    const testimonyUpdate: { [key: string]: any } = {
        category: values.category,
        content: values.content,
        mediaUrl: values.mediaUrl || null,
        mediaType: values.mediaType || null,
        mediaUrl2: values.mediaUrl2 || null,
        mediaType2: values.mediaType2 || null,
        updatedAt: serverTimestamp(),
    };

    const testimonyRef = doc(firestore, "testimonies", testimony.id);
    
    updateDoc(testimonyRef, testimonyUpdate)
        .then(() => {
            toast({
                title: "Testimony Updated!",
                description: "Your changes have been saved successfully.",
            });
            onTestimonyUpdated();
        })
        .catch(() => {
            const permissionError = new FirestorePermissionError({
                path: testimonyRef.path,
                operation: 'update',
                requestResourceData: testimonyUpdate,
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  const renderMediaSlot = (slot: 1 | 2, preview: any, setPreview: any, inputRef: React.RefObject<HTMLInputElement | null>, urlField: 'mediaUrl' | 'mediaUrl2', typeField: 'mediaType' | 'mediaType2') => {
    const isAudio = preview?.type === 'audio';

    return (
      <div className="space-y-4 flex-1 text-left">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
              <Camera className="h-3.5 w-3.5 text-primary" /> Evidence {slot}
          </Label>
          
          {!preview ? (
              <div className="space-y-3">
                  <div 
                      className={cn(
                          "border-2 border-dashed rounded-3xl p-4 flex flex-col items-center justify-center bg-muted/10 transition-colors cursor-pointer group h-[140px] text-left",
                          isUploadingMedia === slot ? "opacity-50 pointer-events-none" : "hover:bg-muted/20"
                      )}
                      onClick={() => inputRef.current?.click()}
                  >
                      {isUploadingMedia === slot ? (
                          <div className="flex flex-col items-center gap-2 text-left">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              <p className="text-[9px] font-black uppercase tracking-widest text-primary text-center">Optimizing...</p>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center text-left">
                              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                  <FileUp className="h-4 w-4 text-primary" />
                              </div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Select File</p>
                          </div>
                      )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-left">
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="h-10 rounded-xl font-black uppercase text-[8px] tracking-widest border-primary/20 text-primary hover:bg-primary/5 flex flex-col items-center justify-center py-1 text-center"
                            onClick={() => startRecorder(slot, 'video')}
                            disabled={isUploadingMedia !== null}
                        >
                            <Video className="h-3 w-3 mb-0.5" />
                            RECORD VIDEO
                        </Button>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="h-10 rounded-xl font-black uppercase text-[8px] tracking-widest border-primary/20 text-primary hover:bg-primary/5 flex flex-col items-center justify-center py-1 text-center"
                            onClick={() => startRecorder(slot, 'audio')}
                            disabled={isUploadingMedia !== null}
                        >
                            <Mic className="h-3 w-3 mb-0.5" />
                            RECORD AUDIO
                        </Button>
                  </div>
              </div>
          ) : (
              <div className={cn(
                  "relative rounded-3xl overflow-hidden border-2 bg-muted shadow-inner group text-left",
                  isAudio ? "h-auto min-h-[100px]" : "aspect-square"
              )}>
                  {preview.type === 'image' ? (
                      <Image src={preview.url} alt={`Evidence ${slot}`} fill className="object-cover" unoptimized />
                  ) : preview.type === 'video' ? (
                      <video src={preview.url} className="w-full h-full object-cover bg-zinc-950" playsInline controls />
                  ) : (
                        <div className="w-full h-full flex flex-row items-center gap-4 bg-primary/5 p-4 text-left">
                            <div className="relative shrink-0 text-left">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 text-left">
                                    <Mic className="h-5 w-5 text-primary text-left" />
                                </div>
                                <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-primary animate-pulse" />
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                                <p className="text-[9px] font-black uppercase text-primary tracking-widest mb-4">Voice of Thanksgiving</p>
                                <audio src={preview.url} className="w-full" controls />
                            </div>
                        </div>
                  )}
                  <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" 
                      onClick={() => { setPreview(null); form.setValue(urlField, null); form.setValue(typeField, null); }}
                  >
                      <X className="h-3.5 w-3.5" />
                  </Button>
              </div>
          )}
          <input type="file" ref={inputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={(e) => handleFileSelect(e, slot)} />
      </div>
    );
  };

  return (
    <div className="space-y-8 text-left">
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 text-left">
            <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
                <FormItem className="text-left">
                <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-2xl border-2 text-left">
                        <SelectValue placeholder="What is the nature of this miracle?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl">
                    {testimonyCategories.map(cat => <SelectItem key={cat} value={cat} className="rounded-xl">{cat}</SelectItem>)}
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
                <FormItem className="text-left">
                <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Your Testimony</FormLabel>
                <FormControl>
                    <Textarea className="min-h-[180px] rounded-[2rem] p-6 text-base leading-relaxed bg-muted/10 border-2 border-dashed" {...field} />
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
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5 text-left" />
                    <p className="text-[10px] text-muted-foreground font-medium leading-relaxed text-left">
                        Updating your miracle proof strengthens the record of God's goodness.
                    </p>
                </div>
            </div>

            <Button type="submit" className="w-full h-14 rounded-2xl font-black shadow-xl tracking-widest uppercase text-center" disabled={isSubmitting || isUploadingMedia !== null}>
                {isSubmitting ? (
                    <div className="flex items-center justify-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-left" />
                        <span>SAVING...</span>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-3">
                        <Sparkles className="h-6 w-6 text-left" />
                        <span>SAVE CHANGES</span>
                    </div>
                )}
            </Button>
        </form>
        </Form>

        <Dialog open={isRecorderOpen} onOpenChange={(open) => !open && closeRecorder()}>
            <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-black">
                <div className="sr-only">
                    <DialogHeader>
                        <DialogTitle>Recorder</DialogTitle>
                    </DialogHeader>
                </div>
                <div className="p-8 border-b border-white/5 bg-zinc-900 shrink-0 text-left">
                  <div className="flex items-center justify-between gap-4 text-left">
                    <div className="min-w-0 text-left">
                        <div className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-white text-left">Miracle Recorder</div>
                        <p className="text-sm font-medium text-zinc-400 mt-1 text-left">Capture your {recorderMode} proof.</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/5 text-white hover:bg-white/10" onClick={closeRecorder}><X className="h-6 w-6" /></Button>
                  </div>
                </div>
                
                {recorderMode === 'video' ? (
                    <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden text-left">
                        <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover mirror scale-x-[-1] text-left" />
                        <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-10 pointer-events-none text-left">
                            <div className="flex justify-between items-start text-left">
                                <div className="flex items-center gap-3 text-left">
                                    {isRecording && (
                                        <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full animate-pulse shadow-lg text-left">
                                            <div className="h-2 w-2 rounded-full bg-white text-left" />
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest text-left">REC</span>
                                        </div>
                                    )}
                                    <Badge className="bg-black/60 backdrop-blur-md text-white border-white/10 font-bold uppercase tracking-widest text-[10px] text-left">
                                        {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')} / 2:00
                                    </Badge>
                                </div>
                            </div>
                            <div className="space-y-4 text-left">
                                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden text-left">
                                    <motion.div className="h-full bg-primary text-left" initial={{ width: 0 }} animate={{ width: `${(recordingTime / MAX_RECORDING_SECONDS) * 100}%` }} />
                                </div>
                                <div className="flex justify-center pointer-events-auto text-left">
                                    {!isRecording ? (<Button onClick={startRecording} size="lg" className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl ring-4 ring-white/20 flex flex-col items-center justify-center p-0 transition-transform active:scale-95 text-left text-center"><div className="h-8 w-8 rounded-full bg-white shadow-inner text-left" /></Button>) : (<Button onClick={stopRecording} size="lg" className="h-20 w-20 rounded-full bg-white text-red-600 shadow-2xl ring-4 ring-white/20 flex flex-col items-center justify-center p-0 transition-transform active:scale-95 text-left text-center"><Square className="h-8 w-8 fill-current text-left" /></Button>)}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-12 sm:p-20 bg-[#09090b] flex flex-col items-center text-center space-y-10 text-left">
                        <div className="relative text-left">
                                <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 shadow-[0_0_50px_rgba(249,116,22,0.15)] text-left">
                                    <Mic className={cn("h-16 w-16 text-primary transition-all text-left", isRecording && "scale-110")} />
                                </div>
                                {isRecording && (<div className="absolute -inset-4 border-4 border-primary/40 rounded-full animate-ping opacity-20 text-left" />)}
                        </div>
                        <div className="space-y-4 w-full text-left">
                            <div className="text-2xl font-black font-headline uppercase tracking-tight text-white text-center text-left">Voice of Thanksgiving</div>
                            <div className="flex items-center justify-center gap-3 text-left text-left">
                                {isRecording && <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse text-left" />}
                                <span className="text-3xl font-black font-mono text-zinc-100 tabular-nums text-left">
                                        {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden text-left">
                                <motion.div className="h-full bg-primary text-left" initial={{ width: 0 }} animate={{ width: `${(recordingTime / MAX_RECORDING_SECONDS) * 100}%` }} />
                            </div>
                        </div>
                        <div className="flex gap-4 w-full text-left">
                                {!isRecording ? (<Button onClick={startRecording} className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-lg shadow-xl shadow-primary/20 text-center text-left"><Mic className="mr-3 h-6 w-6 text-left" /> START</Button>) : (<Button onClick={stopRecording} variant="destructive" className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-lg shadow-xl text-center text-left"><Square className="mr-3 h-6 w-6 fill-current text-left" /> STOP</Button>)}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}
