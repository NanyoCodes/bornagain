"use client";

import * as React from "react";
import { format, isSameDay } from "date-fns";
import { 
  CalendarDays, 
  MapPin, 
  Users, 
  Share2, 
  PlayCircle, 
  Loader2, 
  UserCheck, 
  MoreVertical, 
  Trash2, 
  MessagesSquare, 
  Edit,
  Camera,
  PlusCircle,
  X,
  Upload,
  FileUp,
  Video,
  Mic,
  Square,
  Sparkles
} from "lucide-react";
import type { Event, UserProfile, EventParticipant, Chat, EventGalleryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useCollection, useFirestore, useUser, useDoc, useUserProfile, useStorage } from "@/firebase";
import { 
  collection, 
  serverTimestamp, 
  query, 
  doc, 
  getDoc, 
  runTransaction, 
  arrayUnion, 
  updateDoc, 
  addDoc,
  orderBy
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useState, useRef, useEffect, useMemo } from "react";
import { Badge } from "../ui/badge";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn, safeToDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import Image from "next/image";
import { ImageUpload } from "../common/image-upload";
import { Label } from "../ui/label";
import { motion, AnimatePresence } from "framer-motion";

interface EventCardProps {
    event: Event;
    isJoined: boolean;
    userProfile: UserProfile | null;
    onEdit: () => void;
    onDelete: () => void;
}

function LiveParticipantAvatar({ userId, fallbackUrl, fallbackInitials, className }: { userId: string, fallbackUrl?: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userRef = useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const currentPhotoUrl = profile?.photoURL || fallbackUrl;
    
    return (
        <Dialog>
            <DialogTrigger asChild disabled={!currentPhotoUrl}>
                <Avatar className={cn(className, currentPhotoUrl && "cursor-pointer active:scale-95 transition-transform hover:scale-105")}>
                    <AvatarImage src={currentPhotoUrl} className="object-cover" />
                    <AvatarFallback className="font-bold bg-primary/10 text-primary">{fallbackInitials}</AvatarFallback>
                </Avatar>
            </DialogTrigger>
            {currentPhotoUrl && (
                <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
                    <div className="sr-only text-left">
                        <DialogHeader className="text-left text-left">
                            <DialogTitle className="text-left text-left">Profile Photo</DialogTitle>
                            <DialogDescription className="text-left text-left">Full screen view of participant's photo.</DialogDescription>
                        </DialogHeader>
                    </div>
                    <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
                        <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
                            <Image src={currentPhotoUrl} alt="Participant" fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized />
                        </div>
                    </div>
                </DialogContent>
            )}
        </Dialog>
    );
}

function ParticipantsDialog({ campaign, children }: { campaign: Event; children: React.ReactNode; }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isOpen, setIsOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  const participantsQuery = React.useMemo(() => {
    if (!isOpen || !firestore || !user) return null;
    return query(collection(firestore, 'events', campaign.id, 'participants'));
  }, [isOpen, firestore, campaign.id, user]);

  const { data: participants, loading } = useCollection<EventParticipant>(participantsQuery);
  
  const organizer = React.useMemo(() => participants?.find(p => p.userId === campaign.organizerId), [participants, campaign.organizerId]);
  const otherParticipants = React.useMemo(() => participants?.filter(p => p.userId !== campaign.organizerId), [participants, campaign.organizerId]);

  const content = (
    <ScrollArea className={cn("pr-4", isMobile ? "h-full" : "max-h-[60vh]")}>
      {loading ? (
        <div className="space-y-4 text-left"><Skeleton className="h-10 w-full rounded-2xl text-left" /><Skeleton className="h-10 w-full rounded-2xl text-left" /><Skeleton className="h-10 w-full rounded-2xl text-left" /></div>
      ) : participants ? (
         <div className="space-y-6 pb-6 px-1 text-left">
            {organizer && (
                <div className="space-y-3 text-left">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Organizer</h3>
                    <div className="flex items-center gap-3 rounded-2xl p-4 bg-muted/30 border border-dashed hover:bg-muted/40 transition-colors group relative">
                        <LiveParticipantAvatar userId={organizer.userId} fallbackUrl={organizer.photoURL} fallbackInitials={organizer.firstName?.charAt(0)} className="h-10 w-10 border shadow-sm group-hover:scale-105 transition-transform" />
                        <Link href={`/profile/${organizer.userId}`} className='font-bold text-sm sm:text-base hover:underline uppercase tracking-tight' onClick={e => e.stopPropagation()}>{organizer.firstName} {organizer.lastName}</Link>
                        {organizer.userId === user?.uid && <span className="text-[10px] text-muted-foreground ml-auto opacity-60">You</span>}
                    </div>
                </div>
            )}
            {otherParticipants && otherParticipants.length > 0 && (
              <div className="space-y-3 text-left">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Members ({otherParticipants.length})</h3>
                <div className="space-y-3 text-left">
                  {otherParticipants.map(p => (
                    <div key={p.id} className="p-4 border rounded-2xl space-y-3 bg-background shadow-sm text-left">
                      <div className="flex items-center gap-3 group relative text-left">
                        <LiveParticipantAvatar userId={p.userId} fallbackUrl={p.photoURL} fallbackInitials={p.firstName?.charAt(0)} className="h-9 w-9 text-xs border group-hover:scale-105 transition-transform" />
                        <Link href={`/profile/${p.userId}`} className='font-bold text-sm hover:underline uppercase tracking-tight' onClick={e => e.stopPropagation()}>{p.firstName} {p.lastName}</Link>
                        {p.userId === user?.uid && <span className="text-[10px] text-muted-foreground ml-auto opacity-60">You</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {otherParticipants?.length === 0 && participants?.length > 0 && (<p className="text-center text-muted-foreground py-12 text-sm italic px-8">No other believers joined yet.</p>)}
        </div>
      ) : (<div className="text-center py-16 bg-muted/20 rounded-[2rem] border-2 border-dashed mx-1 text-left"><p className="text-sm text-muted-foreground px-10 leading-relaxed font-medium">Join gathering to view directory.</p></div>)}
    </ScrollArea>
  );

  if (mounted && isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent side="bottom" className="h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left"><div className="p-8 border-b flex-shrink-0 bg-muted/10"><SheetHeader className="text-left"><SheetTitle className="text-xl sm:text-2xl font-black font-headline leading-tight">Participants Directory</SheetTitle><SheetDescription className="text-sm font-medium">{campaign.participantCount || 0} mobilized for "{campaign.title}".</SheetDescription></SheetHeader></div><div className="flex-grow min-h-0 pt-6 px-8">{content}</div></SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="rounded-3xl overflow-hidden p-0 max-w-md border-none shadow-2xl text-left flex flex-col max-h-[90dvh]"><div className="p-8 border-b bg-muted/10 shrink-0"><DialogHeader className="text-left"><DialogTitle className="text-xl sm:text-2xl font-black font-headline leading-tight">Participants: {campaign.title}</DialogTitle><DialogDescription className="text-sm font-medium">{campaign.participantCount || 0} believers joined.</DialogDescription></DialogHeader></div><div className="p-8 flex-1 min-h-0">{content}</div></DialogContent>
    </Dialog>
  );
}

function EventEvidenceDialog({ event, isOpen, onOpenChange }: { event: Event, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [preview, setPreview] = useState<{ url: string, localUrl?: string, type: 'image' | 'video' | 'audio' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const [isRecorderOpen, setIsRecorderOpen] = useState(false);
    const [recorderMode, setRecorderMode] = useState<'video' | 'audio'>('video');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    
    const MAX_RECORDING_SECONDS = 120;

    const galleryQuery = React.useMemo(() => {
        if (!isOpen || !firestore || !event.id) return null;
        return query(collection(firestore, 'events', event.id, 'gallery'), orderBy('createdAt', 'desc'));
    }, [isOpen, firestore, event.id]);
    const { data: galleryItems, loading: galleryLoading } = useCollection<EventGalleryItem>(galleryQuery);

    const getSupportedMimeType = (mode: 'video' | 'audio') => {
        if (typeof MediaRecorder === 'undefined') return '';
        const types = mode === 'video' ? ['video/mp4', 'video/webm'] : ['audio/mp4', 'audio/webm'];
        for (const type of types) { if (MediaRecorder.isTypeSupported(type)) return type; }
        return mode === 'video' ? 'video/webm' : 'audio/webm';
    };

    const startRecorder = async (mode: 'video' | 'audio') => {
        setRecorderMode(mode);
        try {
            const constraints = mode === 'video' ? { video: { facingMode: 'user' }, audio: true } : { audio: true };
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            setIsRecorderOpen(true);
            if (mode === 'video') setTimeout(() => { if (videoPreviewRef.current) videoPreviewRef.current.srcObject = mediaStream; }, 100);
        } catch (err) { toast({ variant: 'destructive', title: 'Access Denied' }); }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); if (timerRef.current) clearInterval(timerRef.current); }
    };

    const handleUploadProcessedFile = async (file: File | Blob, type: 'video' | 'audio' | 'image') => {
        if (!user || !storage) return;
        setIsUploading(true);
        setUploadProgress(0);
        const localUrl = URL.createObjectURL(file);
        try {
            const originalName = (file as File).name || `ev_${Date.now()}`;
            const fileRef = ref(storage, `events/${user.uid}/${Date.now()}_${originalName}`);
            const metadata = { contentType: file.type || (type === 'audio' ? 'audio/mp4' : 'video/mp4') };
            const uploadTask = uploadBytesResumable(fileRef, file, metadata);
            uploadTask.on('state_changed', 
                (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
                (error) => { toast({ variant: 'destructive', title: 'Upload Failed' }); setIsUploading(false); },
                async () => { const url = await getDownloadURL(uploadTask.snapshot.ref); setPreview({ url, localUrl, type: type as any }); setIsUploading(false); }
            );
        } catch (err) { setIsUploading(false); }
    };

    const startRecording = () => {
        if (!stream) return;
        chunksRef.current = [];
        const recorder = new MediaRecorder(stream, { mimeType: getSupportedMimeType(recorderMode) });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.onstop = async () => {
            const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
            await handleUploadProcessedFile(blob, recorderMode as any);
            setIsRecorderOpen(false);
            if (stream) stream.getTracks().forEach(t => t.stop());
            setStream(null);
            setRecordingTime(0);
        };
        recorder.start();
        setIsRecording(true);
        timerRef.current = setInterval(() => { setRecordingTime(prev => { if (prev >= MAX_RECORDING_SECONDS - 1) { stopRecording(); return MAX_RECORDING_SECONDS; } return prev + 1; }); }, 1000);
    };

    const handleFinalize = async () => {
        if (!user || !userProfile || !preview || !firestore) return;
        setIsUploading(true);
        const itemData = { url: preview.url, mediaType: preview.type, authorId: user.uid, authorName: `${userProfile.firstName} ${userProfile.lastName}`, createdAt: serverTimestamp() };
        try { await addDoc(collection(firestore, 'events', event.id, 'gallery'), itemData); setPreview(null); toast({ title: 'Evidence Saved' }); onOpenChange(false); } catch (e) { toast({ variant: 'destructive', title: 'Save Failed' }); }
        finally { setIsUploading(false); }
    };

    const header = (
        <div className="p-8 border-b bg-muted/10 shrink-0 flex items-center justify-between gap-4 text-left">
            <div className="min-w-0"><h2 className="text-2xl font-black font-headline uppercase tracking-tight">Mission Evidence</h2><p className="text-sm font-medium mt-1">Capture gatherings impact.</p></div>
            <Button variant="outline" size="icon" className="rounded-full border bg-background" onClick={() => onOpenChange(false)}><X className="h-6 w-6" /></Button>
        </div>
    );

    const content = (
        <div className="p-8 space-y-8 text-left">
            <div className="space-y-4 p-6 rounded-3xl bg-muted/20 border-2 border-dashed border-primary/20 text-left">
                {!preview ? (
                    <div className="space-y-4 text-left">
                        <div className={cn("border-2 border-dashed rounded-[2rem] p-6 flex flex-col items-center justify-center bg-background cursor-pointer hover:bg-muted/50 transition-all", isUploading && "opacity-50")} onClick={() => fileInputRef.current?.click()}>
                            {isUploading ? <div className="flex flex-col items-center gap-2"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="text-[10px] font-black">{Math.round(uploadProgress)}%</span></div> : <div className="flex flex-col items-center"><Camera className="h-10 w-10 text-primary mb-3" /><span className="text-[10px] font-black uppercase text-center">Tap to Upload Photo</span></div>}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-left"><Button variant="outline" onClick={() => startRecorder('video')} className="h-12 rounded-xl font-black uppercase text-[9px]"><Video className="mr-2 h-4 w-4" />VIDEO</Button><Button variant="outline" onClick={() => startRecorder('audio')} className="h-12 rounded-xl font-black uppercase text-[9px]"><Mic className="mr-2 h-4 w-4" />AUDIO</Button></div>
                    </div>
                ) : (
                    <div className="relative aspect-video rounded-[2rem] overflow-hidden border-2 shadow-inner">
                        {preview.type === 'image' ? <Image src={preview.url} alt="Ev" fill className="object-cover" unoptimized /> : preview.type === 'video' ? <video src={preview.url} className="w-full h-full object-cover" controls /> : <div className="p-8 bg-muted flex items-center justify-center h-full"><audio src={preview.url} controls /></div>}
                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 rounded-full" onClick={() => setPreview(null)}><X className="h-4 w-4" /></Button>
                    </div>
                )}
                <Button onClick={handleFinalize} disabled={!preview || isUploading} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl">{isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}SAVE TO GALLERY</Button>
            </div>
            <div className="space-y-4 text-left"><div className="flex items-center gap-2 px-1"><Users className="h-4 w-4 text-primary" /><h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">EVENT GALLERY</h3></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{galleryLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />) : galleryItems?.map(item => (<Dialog key={item.id}>
                <DialogTrigger asChild>
                    <div className="relative aspect-square rounded-2xl overflow-hidden border shadow-sm group cursor-pointer">
                        <Image src={item.url} alt="Proof" fill className="object-cover transition-transform group-hover:scale-110" unoptimized />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end"><p className="text-[8px] font-black text-white uppercase truncate">By {item.authorName}</p></div>
                    </div>
                </DialogTrigger>
                <DialogContent className="p-0 bg-black/95 border-none sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
                    <div className="sr-only">
                        <DialogHeader>
                            <DialogTitle>Event Evidence</DialogTitle>
                            <DialogDescription>Full screen view of gathering photo.</DialogDescription>
                        </DialogHeader>
                    </div>
                    <div className="relative h-full w-full flex items-center justify-center p-4">
                        <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center">
                            <Image src={item.url} alt="Full view" fill className="object-contain" unoptimized />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>))}</div></div>
            <input type="file" ref={fileInputRef} className="hidden" onChange={e => { const f = e.target.files?.[0]; if(f) handleUploadProcessedFile(f, f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'audio'); }} />
        </div>
    );

    if (isMobile) return <Sheet open={isOpen} onOpenChange={onOpenChange}><SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">{header}<ScrollArea className="flex-grow">{content}</ScrollArea></SheetContent></Sheet>;
    return <Dialog open={isOpen} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-2xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left">{header}<ScrollArea className="flex-1 min-h-0">{content}</ScrollArea><Dialog open={isRecorderOpen} onOpenChange={setIsRecorderOpen}><DialogContent className="sm:max-w-xl bg-black border-none rounded-[2rem] p-0 overflow-hidden"><div className="p-8 border-b border-white/10 bg-zinc-900 flex justify-between items-center"><h3 className="text-xl font-black uppercase text-white">Capture Proof</h3><Button variant="ghost" size="icon" className="rounded-full text-white" onClick={() => setIsRecorderOpen(false)}><X className="h-6 w-6" /></Button></div>{recorderMode === 'video' ? (<div className="relative aspect-video w-full"><video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" /><div className="absolute inset-0 flex flex-col justify-between p-8"><Badge className="w-fit bg-red-600 border-none font-black">{Math.floor(recordingTime/60)}:{(recordingTime%60).toString().padStart(2,'0')}</Badge><div className="flex justify-center">{!isRecording ? <Button onClick={startRecording} size="lg" className="h-16 w-16 rounded-full bg-red-600 ring-4 ring-white/20"><div className="h-6 w-6 rounded-full bg-white"/></Button> : <Button onClick={stopRecording} size="lg" className="h-16 w-16 rounded-full bg-white text-red-600"><Square className="h-6 w-6 fill-current"/></Button>}</div></div></div>) : (<div className="p-20 flex flex-col items-center gap-6"><Mic className={cn("h-16 w-16 text-primary", isRecording && "animate-pulse")} /><span className="text-2xl font-black text-white">{Math.floor(recordingTime/60)}:{(recordingTime%60).toString().padStart(2,'0')}</span>{!isRecording ? <Button onClick={startRecording} className="h-14 px-10 rounded-xl font-black uppercase">START</Button> : <Button onClick={stopRecording} variant="destructive" className="h-14 px-10 rounded-xl font-black uppercase">STOP</Button>}</div>)}</DialogContent></Dialog></DialogContent></Dialog>;
}

function LiveAuthor({ userId, fallbackInitials }: { userId: string, fallbackInitials: string }) {
    const firestore = useFirestore();
    const userDocRef = React.useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userDocRef);
    
    return (
      <Avatar className="h-6 w-6 border shadow-sm text-left">
        <AvatarImage src={profile?.photoURL} className="object-cover text-left" />
        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary text-center flex items-center justify-center w-full h-full text-left">{fallbackInitials || 'U'}</AvatarFallback>
      </Avatar>
    );
}

export function EventCard({ event, isJoined, userProfile, onEdit, onDelete }: EventCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isJoining, setIsJoining] = React.useState(false);
  const [isChatLoading, setIsChatLoading] = React.useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = React.useState(false);

  const isOwner = user?.uid === event.organizerId;
  const startDate = safeToDate(event.startDate);
  const endDate = safeToDate(event.endDate);

  const dateStr = React.useMemo(() => {
    if (!startDate || !endDate) return "Date not set";
    if (isSameDay(startDate, endDate)) return format(startDate, "PPP");
    return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
  }, [startDate, endDate]);

  const handleJoin = async () => {
    if (!user || !firestore || !userProfile) return;
    setIsJoining(true);

    const eventRef = doc(firestore, 'events', event.id);
    const joinedRef = doc(firestore, `users/${user.uid}/joinedEvents/${event.id}`);
    const participantRef = doc(firestore, `events/${event.id}/participants/${user.uid}`);

    try {
      await runTransaction(firestore, async (transaction) => {
        const snap = await transaction.get(eventRef);
        if (!snap.exists()) throw new Error("Event missing");
        
        const eData = snap.data() as Event;

        transaction.update(eventRef, { 
            participantCount: (snap.data().participantCount || 0) + 1,
            participantIds: arrayUnion(user.uid)
        });
        transaction.set(joinedRef, { eventId: event.id, joinedAt: serverTimestamp() });
        transaction.set(participantRef, {
            userId: user.uid,
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            photoURL: userProfile.photoURL || null,
            joinedAt: serverTimestamp()
        });

        // Sync with Group Chat if active
        if (eData.hasGroupChat) {
            const chatRef = doc(firestore, 'chats', event.id);
            transaction.update(chatRef, {
                participantIds: arrayUnion(user.uid),
                [`participantInfo.${user.uid}`]: {
                    firstName: userProfile.firstName,
                    lastName: userProfile.lastName,
                    photoURL: userProfile.photoURL || '',
                    email: userProfile.email || ''
                }
            });
        }
      });
      toast({ title: 'Joined Event', description: 'See you there!' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
    } finally {
      setIsJoining(false);
    }
  };

  const handleOpenGroupChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !firestore || !userProfile) return;
    
    if (event.hasGroupChat) {
        setIsChatLoading(true);
        const chatRef = doc(firestore, 'chats', event.id);
        try {
            const chatDoc = await getDoc(chatRef);
            if (chatDoc.exists()) {
                const chatData = chatDoc.data() as Chat;
                if (!chatData.participantIds.includes(user.uid)) {
                    await updateDoc(chatRef, {
                        participantIds: arrayUnion(user.uid),
                        [`participantInfo.${user.uid}`]: {
                            firstName: userProfile.firstName || '',
                            lastName: userProfile.lastName || '',
                            photoURL: userProfile.photoURL || '',
                        }
                    });
                }
            }
            router.push(`/chats/${event.id}`);
        } catch (e) {
            console.error("Failed to join event chat:", e);
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: chatRef.path, operation: 'update' }, user));
        } finally {
            setIsChatLoading(false);
        }
    } else if (isOwner) {
        router.push(`/chats/${event.id}`);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/events`;
    const shareData = {
        title: event.title,
        text: `Join the '${event.title}' gathering on Testify!`,
        url: shareUrl,
    };

    try {
      if (navigator && navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${event.title}: ${shareUrl}`);
        toast({ title: 'Link Copied' });
      }
    } catch (e) {}
  };

  return (
    <>
      <Card className="rounded-none sm:rounded-[3rem] overflow-hidden border-x-0 sm:border-x border-y sm:border-y-0 shadow-none sm:shadow-lg bg-card/50 backdrop-blur-sm group hover:shadow-xl transition-all h-full flex flex-col border-b-8 border-b-primary/10 text-left">
        {event.photoURL && (
            <div className="relative aspect-[21/9] sm:aspect-[3/1] bg-muted overflow-hidden text-left">
                <Image src={event.photoURL} alt={event.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105 text-left" unoptimized />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent text-left" />
            </div>
        )}
        <CardHeader className="p-6 sm:p-10 pb-4 text-left">
            <div className="flex justify-between items-start text-left">
            <Badge className="h-6 text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20 text-left">
                {event.category}
            </Badge>
            <div className="flex items-center gap-2 text-left">
                {isOwner && (
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-left">
                            <MoreVertical className="h-4 w-4 text-left" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl text-left">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Manage Gathering</DropdownMenuLabel>
                        <DropdownMenuSeparator className="text-left" />
                        <DropdownMenuItem onClick={onEdit} className="rounded-lg text-left">
                            <Edit className="mr-2 h-4 w-4 text-primary text-left" /> Edit Event
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="text-left" />
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg text-left" onClick={onDelete}>
                            <Trash2 className="mr-2 h-4 w-4 text-left" /> Cancel Event
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
            </div>
            <CardTitle className="text-2xl sm:text-4xl font-black font-headline uppercase mt-4 leading-tight break-words [overflow-wrap:anywhere] text-left">{event.title}</CardTitle>
            <CardDescription className="flex items-center gap-3 mt-3 text-left">
            <LiveAuthor userId={event.organizerId} fallbackInitials={event.organizerName.charAt(0)} />
            <span className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest truncate text-left">Host: {event.organizerName}</span>
            </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 sm:p-10 pt-0 space-y-8 flex-grow text-left">
            <p className="text-sm sm:text-lg text-muted-foreground whitespace-pre-wrap leading-relaxed font-medium italic border-l-4 border-primary/20 pl-6 py-2 bg-primary/5 rounded-r-[1.5rem] text-left">
            &ldquo;{event.description}&rdquo;
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-left">
            <div className="flex items-center gap-4 text-muted-foreground bg-muted/20 p-5 sm:p-6 rounded-[2rem] border border-dashed min-h-[6rem] text-left text-left">
                <CalendarDays className="h-6 w-6 text-primary shrink-0 text-left" />
                <div className="min-w-0 text-left">
                    <p className="text-sm sm:text-base font-bold leading-tight text-left">{dateStr}</p>
                    <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest opacity-60 mt-1 text-left">{event.startTime} - {event.endTime}</p>
                </div>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground bg-muted/20 p-5 sm:p-6 rounded-[2rem] border border-dashed min-h-[6rem] text-left text-left">
                <MapPin className="h-6 w-6 text-primary shrink-0 text-left" />
                <div className="min-w-0 text-left">
                    <p className="text-sm sm:text-base font-bold truncate leading-tight uppercase tracking-tight text-left">{event.location}</p>
                    <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest opacity-60 mt-1 text-left">BOTH PHYSICAL AND VIRTUAL</p>
                </div>
            </div>
            </div>
        </CardContent>

        <CardFooter className="p-6 sm:p-10 bg-muted/10 border-t flex flex-col sm:flex-row items-center justify-between gap-6 mt-auto text-left">
            <ParticipantsDialog campaign={event}>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors cursor-pointer text-left">
                <Users className="h-5 w-5 text-primary text-left" />
                {event.participantCount || 0} {event.participantCount === 1 ? 'MEMBER' : 'MEMBERS'}
                </div>
            </ParticipantsDialog>
            
            <div className="flex gap-3 w-full sm:w-auto text-left">
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl shadow-md bg-background border-primary/20 text-primary/60 hover:text-primary text-left" onClick={handleShare}>
                <Share2 className="h-5 w-5 text-left" />
            </Button>
            
            <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-2xl shadow-md bg-background border-primary/20 text-primary/60 hover:text-primary text-left" 
                onClick={(e) => { e.stopPropagation(); setIsGalleryOpen(true); }}
            >
                <Camera className="h-5 w-5 text-left" />
            </Button>

            {(isJoined || isOwner) && event.hasGroupChat && (
                <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl shadow-md bg-background border-primary/20 text-primary text-left" onClick={handleOpenGroupChat} disabled={isChatLoading}>
                    {isChatLoading ? <Loader2 className="h-5 w-5 animate-spin text-left" /> : <MessagesSquare className="h-5 w-5 text-left" />}
                </Button>
            )}

            {event.streamUrl && (
                <Button variant="outline" className="rounded-2xl h-12 px-6 font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 shadow-md flex-1 sm:flex-none text-left" asChild>
                <a href={event.streamUrl} target="_blank" rel="noopener noreferrer" className="text-left">
                    <PlayCircle className="mr-2 h-5 w-5 text-left" /> LIVE STREAM
                </a>
                </Button>
            )}
            
            {isJoined ? (
                <Badge variant="secondary" className="h-12 px-6 rounded-2xl flex items-center gap-2 font-black tracking-[0.1em] bg-primary/10 text-primary border-primary/30 flex-1 sm:flex-none text-[10px] sm:text-xs text-left">
                <UserCheck className="h-5 w-5 text-left" /> I'M ATTENDING
                </Badge>
            ) : (
                <Button onClick={handleJoin} disabled={isJoining || event.status !== 'active'} className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 flex-1 sm:flex-none text-center">
                {isJoining ? <Loader2 className="h-5 w-5 animate-spin text-left" /> : "JOIN GATHERING"}
                </Button>
            )}
            </div>
        </CardFooter>
      </Card>

      <EventEvidenceDialog 
        event={event}
        isOpen={isGalleryOpen}
        onOpenChange={setIsGalleryOpen}
      />
    </>
  );
}
