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
import { useState, useRef, useEffect } from "react";
import { 
  Loader2, 
  Camera, 
  X, 
  FileUp, 
  Sparkles,
  Info,
  Newspaper,
  Video,
  Mic,
  Square,
  User,
  Users,
  CheckCircle2
} from "lucide-react";
import { Testimony, TestimonyCategory, TestimonyWitnessType } from "@/lib/types";
import { useFirestore, useUser, useStorage } from "@/firebase";
import { doc, updateDoc, serverTimestamp, collection } from "firebase/firestore";
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
  witnessType: z.enum(['Beneficiary', 'Eye Witness', 'Report']).default('Beneficiary'),
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
      witnessType: testimony.witnessType || 'Beneficiary',
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
    };
  }, [mediaPreview1, mediaPreview2]);

  const getSupportedMimeType = (mode: 'video' | 'audio') => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = mode === 'video' ? ['video/mp4', 'video/webm'] : ['audio/mp4', 'audio/webm'];
    for (const type of types) { if (MediaRecorder.isTypeSupported(type)) return type; }
    return mode === 'video' ? 'video/webm' : 'audio/webm';
  };

  const startRecorder = async (slot: 1 | 2, mode: 'video' | 'audio') => {
      setActiveSlot(slot);
      setRecorderMode(mode);
      try {
          const constraints = mode === 'video' 
            ? { video: { facingMode: 'user' }, audio: true }
            : { audio: true };
          const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          setStream(mediaStream);
          setIsRecorderOpen(true);
          if (mode === 'video') setTimeout(() => { if (videoPreviewRef.current) videoPreviewRef.current.srcObject = mediaStream; }, 100);
      } catch (err) { toast({ variant: 'destructive', title: 'Access Denied' }); }
  };

  const closeRecorder = () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      setStream(null); setIsRecording(false); setRecordingTime(0); setIsRecorderOpen(false);
      if (timerRef.current) clearInterval(timerRef.current);
  };

  const startRecording = () => {
      if (!stream) return;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: getSupportedMimeType(recorderMode) });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          await handleUploadProcessedFile(blob, activeSlot, recorderMode);
          closeRecorder();
      };
      recorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => { setRecordingTime(prev => { if (prev >= MAX_RECORDING_SECONDS - 1) { stopRecording(); return MAX_RECORDING_SECONDS; } return prev + 1; }); }, 1000);
  };

  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

  const handleUploadProcessedFile = async (file: File | Blob, slot: 1 | 2, type: 'video' | 'audio' | 'image') => {
    if (!user || !storage) return;
    setIsUploadingMedia(slot);
    setUploadProgress(0);
    const localUrl = URL.createObjectURL(file);
    try {
        const fileRef = ref(storage, `testimonies/${user.uid}/${Date.now()}_edit_slot${slot}`);
        const uploadTask = uploadBytesResumable(fileRef, file, { contentType: file.type || (type === 'audio' ? 'audio/mp4' : 'video/mp4') });
        uploadTask.on('state_changed', (snapshot) => setUploadProgress((snapshot.bytesTransferred/snapshot.totalBytes)*100), 
            () => { toast({ variant: 'destructive', title: 'Upload Failed' }); setIsUploadingMedia(null); },
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                if (slot === 1) { setMediaPreview1({ url, localUrl, type: type as any }); form.setValue('mediaUrl', url); form.setValue('mediaType', type as any); }
                else { setMediaPreview2({ url, localUrl, type: type as any }); form.setValue('mediaUrl2', url); form.setValue('mediaType2', type as any); }
                setIsUploadingMedia(null);
            }
        );
    } catch (err) { setIsUploadingMedia(null); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : null;
    if (type) handleUploadProcessedFile(file, slot, type as any);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    const update = { category: values.category, witnessType: values.witnessType, content: values.content, mediaUrl: values.mediaUrl || null, mediaType: values.mediaType || null, mediaUrl2: values.mediaUrl2 || null, mediaType2: values.mediaType2 || null, updatedAt: serverTimestamp() };
    const ref = doc(firestore, "testimonies", testimony.id);
    updateDoc(ref, update).then(() => { toast({ title: "Testimony Updated!" }); onTestimonyUpdated(); }).catch(() => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ref.path, operation: 'update', requestResourceData: update }, user))).finally(() => setIsSubmitting(false));
  };

  const renderMediaSlot = (slot: 1 | 2, preview: any, setPreview: any, inputRef: React.RefObject<HTMLInputElement | null>, urlField: 'mediaUrl' | 'mediaUrl2', typeField: 'mediaType' | 'mediaType2') => {
    const isAudio = preview?.type === 'audio';
    return (
      <div className="space-y-4 flex-1">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2"><Camera className="h-3.5 w-3.5 text-primary" /> Evidence {slot}</Label>
          {!preview ? (
              <div className="space-y-3">
                  <div className={cn("border-2 border-dashed rounded-3xl p-4 flex flex-col items-center justify-center bg-muted/10 transition-colors cursor-pointer group h-[140px]", isUploadingMedia === slot ? "opacity-50 pointer-none" : "hover:bg-muted/20")} onClick={() => inputRef.current?.click()}>
                      {isUploadingMedia === slot ? (
                          <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              <p className="text-[9px] font-black uppercase text-primary"> {Math.round(uploadProgress)}%</p>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center">
                              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><FileUp className="h-4 w-4 text-primary" /></div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">CHANGE PROOF</p>
                          </div>
                      )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant="outline" size="sm" className="h-10 rounded-xl font-black uppercase text-[8px] tracking-widest border-primary/20 text-primary hover:bg-primary/5 flex flex-col items-center justify-center" onClick={() => startRecorder(slot, 'video')} disabled={isUploadingMedia !== null}><Video className="h-3 w-3 mb-0.5" />VIDEO</Button>
                        <Button type="button" variant="outline" size="sm" className="h-10 rounded-xl font-black uppercase text-[8px] tracking-widest border-primary/20 text-primary hover:bg-primary/5 flex flex-col items-center justify-center" onClick={() => startRecorder(slot, 'audio')} disabled={isUploadingMedia !== null}><Mic className="h-3 w-3 mb-0.5" />AUDIO</Button>
                  </div>
              </div>
          ) : (
              <div className="space-y-2">
                <div className={cn("relative rounded-3xl overflow-hidden border-2 bg-muted shadow-inner group", isAudio ? "h-auto min-h-[100px]" : "aspect-square")}>
                    {preview.type === 'image' ? <Image src={preview.localUrl || preview.url} alt="Ev" fill className="object-cover" unoptimized /> : preview.type === 'video' ? <video key={preview.localUrl || preview.url} src={preview.localUrl || preview.url} className="w-full h-full object-cover bg-zinc-950" playsInline controls preload="metadata" /> : <div className="w-full h-full flex flex-row items-center gap-4 bg-primary/5 p-4"><div className="shrink-0"><div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2"><Mic className="h-5 w-5 text-primary" /></div></div><div className="flex-1 min-w-0"><p className="text-[10px] font-black uppercase text-primary mb-2">Voice Proclamation</p><audio key={preview.localUrl || preview.url} src={preview.localUrl || preview.url} className="w-full" controls preload="metadata" /></div></div>}
                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg" onClick={() => { if (preview.localUrl) URL.revokeObjectURL(preview.localUrl); setPreview(null); form.setValue(urlField, null); form.setValue(typeField, null); }}><X className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
          )}
          <input type="file" ref={inputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={(e) => handleFileSelect(e, slot)} />
      </div>
    );
  };

  return (
    <div className="space-y-8">
        <div className="flex items-center gap-3 px-1"><div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner"><Newspaper className="h-5 w-5 text-primary" /></div><div className="min-w-0 flex-1"><h3 className="text-xl font-black font-headline uppercase tracking-tight">Edit Testimony</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Refine your shared miracle</p></div></div>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="witnessType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">My Role</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className={cn("flex items-center space-x-3 p-4 rounded-2xl border-2 transition-all cursor-pointer", field.value === 'Beneficiary' ? "bg-primary/10 border-primary shadow-sm" : "bg-muted/20 border-transparent")}>
                        <RadioGroupItem value="Beneficiary" id="edit-beneficiary" className="sr-only" />
                        <Label htmlFor="edit-beneficiary" className="flex items-center gap-3 cursor-pointer w-full">
                          <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", field.value === 'Beneficiary' ? "bg-primary text-white" : "bg-muted text-muted-foreground")}><User className="h-4 w-4" /></div>
                          <div className="flex-1"><p className="text-xs font-black uppercase">Beneficiary</p><p className="text-[9px] font-bold opacity-70">Personal</p></div>
                          {field.value === 'Beneficiary' && <CheckCircle2 className="h-4 w-4 text-primary fill-current" />}
                        </Label>
                      </div>
                      <div className={cn("flex items-center space-x-3 p-4 rounded-2xl border-2 transition-all cursor-pointer", field.value === 'Eye Witness' ? "bg-primary/10 border-primary shadow-sm" : "bg-muted/20 border-transparent")}>
                        <RadioGroupItem value="Eye Witness" id="edit-eyewitness" className="sr-only" />
                        <Label htmlFor="edit-eyewitness" className="flex items-center gap-3 cursor-pointer w-full">
                          <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", field.value === 'Eye Witness' ? "bg-primary text-white" : "bg-muted text-muted-foreground")}><Users className="h-4 w-4" /></div>
                          <div className="flex-1"><p className="text-xs font-black uppercase">Eye Witness</p><p className="text-[9px] font-bold opacity-70">I saw it</p></div>
                          {field.value === 'Eye Witness' && <CheckCircle2 className="h-4 w-4 text-primary fill-current" />}
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger className="h-12 rounded-2xl border-2"><SelectValue placeholder="Category" /></SelectTrigger></FormControl><SelectContent className="rounded-2xl">{testimonyCategories.map(cat => <SelectItem key={cat} value={cat} className="rounded-xl">{cat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Your Testimony</FormLabel><FormControl><Textarea className="min-h-[180px] rounded-[2rem] p-6 text-base leading-relaxed bg-muted/10 border-2 border-dashed" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-6">
                    {renderMediaSlot(1, mediaPreview1, setMediaPreview1, fileInputRef1, 'mediaUrl', 'mediaType')}
                    {renderMediaSlot(2, mediaPreview2, setMediaPreview2, fileInputRef2, 'mediaUrl2', 'mediaType2')}
                </div>
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl font-black shadow-xl tracking-widest uppercase text-center" disabled={isSubmitting || isUploadingMedia !== null}>{isSubmitting ? 'SAVING...' : 'SAVE CHANGES'}</Button>
        </form>
        </Form>
    </div>
  );
}
