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
  Info,
  Newspaper,
  HandHeart,
  ExternalLink
} from "lucide-react";
import { Testimony, TestimonyCategory } from "@/lib/types";
import { useFirestore, useUser, useStorage } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  const [mediaPreview1, setMediaPreview1] = useState<{ url: string, localUrl?: string, type: 'image' | 'video' | 'audio' } | null>(
    testimony.mediaUrl ? { url: testimony.mediaUrl, type: testimony.mediaType as any } : null
  );
  const [mediaPreview2, setMediaPreview2] = useState<{ url: string, localUrl?: string, type: 'image' | 'video' | 'audio' } | null>(
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

  useEffect(() => {
    return () => {
      if (mediaPreview1?.localUrl) URL.revokeObjectURL(mediaPreview1.localUrl);
      if (mediaPreview2?.localUrl) URL.revokeObjectURL(mediaPreview2.localUrl);
      if (timerRef.current) clearInterval(timerRef.current);
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [mediaPreview1, mediaPreview2, stream]);

  useEffect(() => {
    if (isRecorderOpen && recorderMode === 'video' && stream && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
    }
  }, [isRecorderOpen, recorderMode, stream]);

  const getSupportedMimeType = (mode: 'video' | 'audio') => {
    if (typeof MediaRecorder === 'undefined') return '';
    const isAndroid = /Android/i.test(navigator.userAgent);
    let types: string[];
    if (mode === 'video') {
        types = isAndroid 
            ? ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
            : ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
    } else {
        types = isAndroid
            ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
            : ['audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/webm;codecs=opus', 'audio/webm'];
    }
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
      } catch (err) {
          toast({ variant: 'destructive', title: 'Access Blocked' });
      }
  };

  const closeRecorder = () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
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
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
          const actualMimeType = mediaRecorderRef.current?.mimeType || getSupportedMimeType(recorderMode);
          const baseType = actualMimeType.split(';')[0];
          let extension = baseType.includes('mp4') ? 'mp4' : baseType.includes('webm') ? 'webm' : baseType.includes('aac') ? 'aac' : baseType.includes('mpeg') ? 'mp3' : (recorderMode === 'video' ? 'webm' : 'm4a');
          const blob = new Blob(chunksRef.current, { type: baseType });
          const file = new File([blob], `edit_recorded_${Date.now()}.${extension}`, { type: baseType });
          await handleUploadProcessedFile(file, activeSlot, recorderMode);
          closeRecorder();
      };
      recorder.start(1000);
      setIsRecording(true);
      timerRef.current = setInterval(() => {
          setRecordingTime(prev => {
              if (prev >= MAX_RECORDING_SECONDS - 1) { stopRecording(); return MAX_RECORDING_SECONDS; }
              return prev + 1;
          });
      }, 1000);
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      }
  };

  const handleUploadProcessedFile = async (file: File | Blob, slot: 1 | 2, type: 'video' | 'audio' | 'image') => {
    if (!user || !storage) return;
    if (file.size > 100 * 1024 * 1024) { toast({ variant: 'destructive', title: 'File Too Large' }); return; }
    setIsUploadingMedia(slot);
    setUploadProgress(0);
    const localUrl = URL.createObjectURL(file);
    try {
        const fileName = (file as File).name || `edit_recorded_${Date.now()}.${type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : 'm4a'}`;
        const fileRef = ref(storage, `testimonies/${user.uid}/${Date.now()}_edit_slot${slot}_${fileName}`);
        const contentType = (file.type || (type === 'audio' ? 'audio/mp4' : type === 'video' ? 'video/mp4' : 'image/jpeg')).split(';')[0];
        const metadata = { contentType, customMetadata: { testimonyId: testimony.id, slot: slot.toString() } };
        const uploadTask = uploadBytesResumable(fileRef, file, metadata);
        uploadTask.on('state_changed', 
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => { toast({ variant: 'destructive', title: 'Upload Failed' }); setIsUploadingMedia(null); },
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
                toast({ title: 'Miracle Updated' });
                setIsUploadingMedia(null);
            }
        );
    } catch (err) { setIsUploadingMedia(null); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file || !user || !storage) return;
    if (file.size > 100 * 1024 * 1024) { toast({ variant: 'destructive', title: 'File Too Large' }); return; }
    let fileType = file.type;
    if (!fileType) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const typeMap: Record<string, string> = { 'mp4': 'video/mp4', 'mov': 'video/quicktime', 'webm': 'video/webm', 'm4a': 'audio/mp4', 'mp3': 'audio/mpeg', 'aac': 'audio/aac', 'wav': 'audio/wav', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png' };
        fileType = typeMap[ext || ''] || '';
    }
    const type = fileType.startsWith('image/') ? 'image' : fileType.startsWith('video/') ? 'video' : fileType.startsWith('audio/') ? 'audio' : null;
    if (!type) { toast({ variant: 'destructive', title: 'Invalid File' }); return; }
    handleUploadProcessedFile(file, slot, type as any);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !firestore) return;
    if (user.uid !== testimony.authorId) { toast({ variant: 'destructive', title: 'Permission Denied' }); return; }
    setIsSubmitting(true);
    const testimonyUpdate: { [key: string]: any } = { category: values.category, content: values.content, mediaUrl: values.mediaUrl || null, mediaType: values.mediaType || null, mediaUrl2: values.mediaUrl2 || null, mediaType2: values.mediaType2 || null, updatedAt: serverTimestamp() };
    const testimonyRef = doc(firestore, "testimonies", testimony.id);
    updateDoc(testimonyRef, testimonyUpdate).then(() => { toast({ title: "Testimony Updated!" }); onTestimonyUpdated(); }).catch(() => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: testimonyRef.path, operation: 'update', requestResourceData: testimonyUpdate }, user));
    }).finally(() => setIsSubmitting(false));
  };

  const renderMediaSlot = (slot: 1 | 2, preview: any, setPreview: any, inputRef: React.RefObject<HTMLInputElement | null>, urlField: 'mediaUrl' | 'mediaUrl2', typeField: 'mediaType' | 'mediaType2') => {
    const isAudio = preview?.type === 'audio';
    return (
      <div className="space-y-4 flex-1 text-left">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2"><Camera className="h-3.5 w-3.5 text-primary" /> Evidence {slot}</Label>
          {!preview ? (
              <div className="space-y-3 text-left">
                  <div className={cn("border-2 border-dashed rounded-3xl p-4 flex flex-col items-center justify-center bg-muted/10 transition-colors cursor-pointer group h-[140px]", isUploadingMedia === slot ? "opacity-50 pointer-events-none" : "hover:bg-muted/20")} onClick={() => inputRef.current?.click()}>
                      {isUploadingMedia === slot ? (
                          <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              <div className="space-y-1 text-center"><p className="text-[9px] font-black uppercase tracking-widest text-primary">Uploading...</p><p className="text-[8px] font-bold text-primary/60">{Math.round(uploadProgress)}%</p></div>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center"><div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><FileUp className="h-4 w-4 text-primary" /></div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Select File</p></div>
                      )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant="outline" size="sm" className="h-10 rounded-xl font-black uppercase text-[8px] tracking-widest border-primary/20 text-primary hover:bg-primary/5 flex flex-col items-center justify-center py-1 text-center" onClick={() => startRecorder(slot, 'video')} disabled={isUploadingMedia !== null}><Video className="h-3 w-3 mb-0.5" />RECORD VIDEO</Button>
                        <Button type="button" variant="outline" size="sm" className="h-10 rounded-xl font-black uppercase text-[8px] tracking-widest border-primary/20 text-primary hover:bg-primary/5 flex flex-col items-center justify-center py-1 text-center" onClick={() => startRecorder(slot, 'audio')} disabled={isUploadingMedia !== null}><Mic className="h-3 w-3 mb-0.5" />RECORD AUDIO</Button>
                  </div>
              </div>
          ) : (
              <div className="space-y-2">
                <div className={cn("relative rounded-3xl overflow-hidden border-2 bg-muted shadow-inner group", isAudio ? "h-auto min-h-[100px]" : "aspect-square")}>
                    {preview.type === 'image' ? (
                        <Image src={preview.localUrl || preview.url} alt={`Evidence ${slot}`} fill className="object-cover" unoptimized />
                    ) : preview.type === 'video' ? (
                        <video src={preview.localUrl || preview.url} className="w-full h-full object-cover bg-zinc-950" playsInline controls preload="metadata" onError={(e) => toast({ variant: 'destructive', title: 'Playback failed', description: `Error code: ${e.currentTarget.error?.code}` })} />
                    ) : (
                            <div className="w-full h-full flex flex-row items-center gap-4 bg-primary/5 p-4">
                                <div className="relative shrink-0"><div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Mic className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /></div><Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-primary animate-pulse" /></div>
                                <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase text-primary tracking-widest mb-4">Voice of Thanksgiving</p><audio src={preview.localUrl || preview.url} className="w-full" controls preload="metadata" onError={(e) => toast({ variant: 'destructive', title: 'Playback failed', description: `Error code: ${e.currentTarget.error?.code}` })} /></div>
                            </div>
                    )}
                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={() => { if (preview.localUrl) URL.revokeObjectURL(preview.localUrl); setPreview(null); form.setValue(urlField, null); form.setValue(typeField, null); }}><X className="h-3.5 w-3.5" /></Button>
                </div>
                <Button asChild variant="link" className="h-auto p-0 text-[9px] font-bold uppercase tracking-tighter text-muted-foreground hover:text-primary"><a href={preview.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-2 w-2" /> Open proof in new tab</a></Button>
              </div>
          )}
          <input type="file" ref={inputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={(e) => handleFileSelect(e, slot)} />
      </div>
    );
  };

  return (
    <div className="space-y-8 text-left">
        <div className="flex items-center gap-3 px-1 text-left"><div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner"><Newspaper className="h-5 w-5 text-primary" /></div><div className="min-w-0 flex-1"><h3 className="text-xl font-black font-headline uppercase tracking-tight">Edit Testimony</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Refine your public miracle</p></div></div>
        <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 text-left"><FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger className="h-12 rounded-2xl border-2 text-left"><SelectValue placeholder="What is the nature of this miracle?" /></SelectTrigger></FormControl><SelectContent className="rounded-2xl">{testimonyCategories.map(cat => <SelectItem key={cat} value={cat} className="rounded-xl">{cat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Your Testimony</FormLabel><FormControl><Textarea className="min-h-[180px] rounded-[2rem] p-6 text-base leading-relaxed bg-muted/10 border-2 border-dashed" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="space-y-4 text-left"><div className="flex flex-col sm:flex-row gap-6">{renderMediaSlot(1, mediaPreview1, setMediaPreview1, fileInputRef1, 'mediaUrl', 'mediaType')}{renderMediaSlot(2, mediaPreview2, setMediaPreview2, fileInputRef2, 'mediaUrl2', 'mediaType2')}</div><div className="bg-primary/5 p-4 rounded-2xl border-2 border-dashed border-primary/10 flex items-start gap-3 mt-4"><Info className="h-4 w-4 text-primary shrink-0 mt-0.5" /><p className="text-[10px] text-muted-foreground font-medium leading-relaxed">Updating your miracle proof strengthens the record.</p></div></div>
            <Button type="submit" className="w-full h-14 rounded-2xl font-black shadow-xl tracking-widest uppercase" disabled={isSubmitting || isUploadingMedia !== null}>{isSubmitting ? (<div className="flex items-center justify-center gap-3"><Loader2 className="h-6 w-6 animate-spin" /><span>SAVING...</span></div>) : (<div className="flex items-center justify-center gap-3"><Sparkles className="h-6 w-6" /><span>SAVE CHANGES</span></div>)}</Button>
        </form></Form>
        <Dialog open={isRecorderOpen} onOpenChange={(open) => !open && closeRecorder()}><DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-black text-left"><div className="sr-only text-left"><DialogHeader><DialogTitle>Recorder</DialogTitle></DialogHeader></div><div className="p-8 border-b border-white/5 bg-zinc-900 shrink-0 text-left"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><div className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-white">Miracle Recorder</div><p className="text-sm font-medium text-zinc-400 mt-1">Capture your {recorderMode} proof.</p></div><Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/5 text-white hover:bg-white/10" onClick={closeRecorder}><X className="h-6 w-6" /></Button></div></div>
                {recorderMode === 'video' ? (<div className="relative aspect-video w-full bg-zinc-950 overflow-hidden"><video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover mirror scale-x-[-1]" />
                        <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-10 pointer-events-none text-left"><div className="flex justify-between items-start text-left"><div className="flex items-center gap-3 text-left">{isRecording && (<div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full animate-pulse shadow-lg text-left"><div className="h-2 w-2 rounded-full bg-white" /><span className="text-[10px] font-black text-white uppercase tracking-widest">REC</span></div>)}<Badge className="bg-black/60 backdrop-blur-md text-white border-white/10 font-bold uppercase tracking-widest text-[10px]">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')} / 2:00</Badge></div></div>
                            <div className="space-y-4 text-left"><div className="w-full h-1 bg-white/20 rounded-full overflow-hidden text-left"><motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${(recordingTime / MAX_RECORDING_SECONDS) * 100}%` }} /></div><div className="flex justify-center pointer-events-auto text-center">{!isRecording ? (<Button onClick={startRecording} size="lg" className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl ring-4 ring-white/20 flex flex-col items-center justify-center p-0 transition-transform active:scale-95"><div className="h-8 w-8 rounded-full bg-white shadow-inner" /></Button>) : (<Button onClick={stopRecording} size="lg" className="h-20 w-20 rounded-full bg-white text-red-600 shadow-2xl ring-4 ring-white/20 flex flex-col items-center justify-center p-0 transition-transform active:scale-95"><Square className="h-8 w-8 fill-current" /></Button>)}</div></div></div></div>) : (
                    <div className="p-12 sm:p-20 bg-[#09090b] flex flex-col items-center text-center space-y-10 text-left"><div className="relative text-left"><div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 shadow-[0_0_50px_rgba(249,116,22,0.15)]"><Mic className={cn("h-16 w-16 text-primary transition-all", isRecording && "scale-110")} /></div>{isRecording && (<div className="absolute -inset-4 border-4 border-primary/40 rounded-full animate-ping opacity-20" />)}</div>
                        <div className="space-y-4 w-full text-left"><div className="text-2xl font-black font-headline uppercase tracking-tight text-white text-center">Voice of Thanksgiving</div><div className="flex items-center justify-center gap-3">{isRecording && <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />}<span className="text-3xl font-black font-mono text-zinc-100 tabular-nums">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span></div><div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden text-left"><motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${(recordingTime / MAX_RECORDING_SECONDS) * 100}%` }} /></div></div>
                        <div className="flex gap-4 w-full text-left">{!isRecording ? (<Button onClick={startRecording} className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-lg shadow-xl shadow-primary/20 text-center"><Mic className="mr-3 h-6 w-6" /> START</Button>) : (<Button onClick={stopRecording} variant="destructive" className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-lg shadow-xl text-center"><Square className="mr-3 h-6 w-6 fill-current" /> STOP</Button>)}</div></div>
                )}</DialogContent></Dialog>
    </div>
  );
}
