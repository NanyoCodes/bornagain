"use client";

import * as React from "react";
import Link from "next/link";
import { format, isSameDay } from "date-fns";
import { 
  CalendarDays, 
  MapPin, 
  Users, 
  Share2, 
  Edit, 
  Loader2, 
  MessagesSquare, 
  UserCheck, 
  PlayCircle, 
  Newspaper, 
  UserPlus, 
  ChevronDown, 
  BarChart3, 
  Target, 
  Info, 
  X, 
  Camera, 
  PlusCircle, 
  Upload, 
  FileUp, 
  Sparkles,
  Quote,
  MoreVertical,
  Trash2
} from "lucide-react";
import type { Campaign, CampaignParticipant, UserProfile, CampaignGalleryItem, Chat } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
  where, 
  getDocs, 
  addDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  orderBy,
  deleteDoc
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useState, useRef, useEffect, useMemo } from "react";
import { Badge } from "../ui/badge";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn, safeToDate, haversineDistance } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { JoinCampaignDialog } from "./join-campaign-dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "../ui/label";
import Image from "next/image";

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
                        <DialogHeader className="text-left">
                            <DialogTitle className="text-left">Profile Photo</DialogTitle>
                            <DialogDescription className="text-left">Full screen view of participant's photo.</DialogDescription>
                        </DialogHeader>
                    </div>
                    <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
                        <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
                            <Image 
                                src={currentPhotoUrl} 
                                alt="Participant" 
                                fill 
                                className="object-contain shadow-2xl ring-4 ring-white/10 text-left" 
                                unoptimized 
                            />
                        </div>
                    </div>
                </DialogContent>
            )}
        </Dialog>
    );
}

function ParticipantsDialog({ campaign, children }: { campaign: Campaign; children: React.ReactNode; }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const participantsQuery = useMemo(() => {
    if (!isOpen || !firestore || !user) return null;
    return query(collection(firestore, 'campaigns', campaign.id, 'participants'));
  }, [isOpen, firestore, campaign.id, user]);

  const { data: participants, loading } = useCollection<CampaignParticipant>(participantsQuery);
  
  const organizer = useMemo(() => participants?.find(p => p.userId === campaign.organizerId), [participants, campaign.organizerId]);
  const otherParticipants = useMemo(() => participants?.filter(p => p.userId !== campaign.organizerId), [participants, campaign.organizerId]);

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const content = (
    <ScrollArea className={cn("pr-4", isMobile ? "h-full" : "max-h-[60vh]")}>
      {loading ? (
        <div className="space-y-4 text-left">
          <Skeleton className="h-10 w-full rounded-2xl text-left" />
          <Skeleton className="h-10 w-full rounded-2xl text-left" />
          <Skeleton className="h-10 w-full rounded-2xl text-left" />
        </div>
      ) : participants ? (
         <div className="space-y-6 pb-6 px-1 text-left">
            {organizer && (
                <div className="space-y-3 text-left">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Organizer</h3>
                    <div className="flex items-center gap-3 rounded-2xl p-4 bg-muted/30 border border-dashed hover:bg-muted/40 transition-colors group relative text-left">
                        <LiveParticipantAvatar userId={organizer.userId} fallbackUrl={organizer.photoURL} fallbackInitials={organizer.firstName?.charAt(0)} className="h-10 w-10 border shadow-sm group-hover:scale-105 transition-transform text-left" />
                        <Link 
                            href={`/profile/${organizer.userId}`}
                            className='font-bold text-sm sm:text-base hover:underline uppercase tracking-tight text-left'
                            onClick={stopPropagation}
                        >
                            {organizer.firstName} {organizer.lastName}
                        </Link>
                        {organizer.userId === user?.uid && <span className="text-[10px] text-muted-foreground ml-auto opacity-60 text-left">You</span>}
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
                        <LiveParticipantAvatar userId={p.userId} fallbackUrl={p.photoURL} fallbackInitials={p.firstName?.charAt(0)} className="h-9 w-9 text-xs border group-hover:scale-105 transition-transform text-left" />
                        <Link 
                            href={`/profile/${p.userId}`}
                            className='font-bold text-sm hover:underline uppercase tracking-tight text-left'
                            onClick={stopPropagation}
                        >
                            {p.firstName} {p.lastName}
                        </Link>
                        {p.userId === user?.uid && <span className="text-[10px] text-muted-foreground ml-auto opacity-60 text-left">You</span>}
                      </div>
                      {p.joinReason && (
                        <blockquote className="border-l-4 border-primary/20 pl-4 text-xs italic text-muted-foreground bg-primary/[0.02] py-2 rounded-r-xl text-left">
                            &ldquo;{p.joinReason}&rdquo;
                        </blockquote>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {otherParticipants?.length === 0 && participants?.length > 0 && (
                <p className="text-center text-muted-foreground py-12 text-sm italic px-8 text-left">No other believers joined yet.</p>
            )}
        </div>
      ) : (
        <div className="text-center py-16 bg-muted/20 rounded-[2rem] border-2 border-dashed mx-1 text-left">
            <p className="text-sm text-muted-foreground px-10 leading-relaxed font-medium text-left">Join mission to view directory.</p>
        </div>
      )}
    </ScrollArea>
  );

  if (mounted && isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent side="bottom" className="h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
          <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left">
            <SheetHeader className="text-left flex-shrink-0 p-0 text-left">
                <SheetTitle className="text-xl sm:text-2xl font-black font-headline leading-tight text-balance text-left">Participants Directory</SheetTitle>
                <SheetDescription className="text-sm font-medium mt-1 text-left text-left">
                {campaign.participants || 0} believers mobilized for "{campaign.title}".
                </SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-grow min-h-0 pt-6 px-8 text-left text-left">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="rounded-3xl overflow-hidden p-0 max-w-md border-none shadow-2xl flex flex-col max-h-[90dvh] text-left text-left">
        <div className="p-8 border-b bg-muted/10 shrink-0 text-left text-left">
            <DialogHeader className="text-left p-0 text-left">
                <DialogTitle className="text-xl sm:text-2xl font-black font-headline leading-tight text-balance text-left">Participants: {campaign.title}</DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-left text-left">
                    {campaign.participants || 0} believers joined.
                </DialogDescription>
            </DialogHeader>
        </div>
        <div className="flex-1 min-h-0 p-8 text-left text-left">
            {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FullDescriptionDialog({ campaign, children }: { campaign: Campaign, children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const startDate = safeToDate(campaign.startDate);
    const endDate = safeToDate(campaign.endDate);
    const dateStr = React.useMemo(() => {
        if (startDate && endDate) {
            if (isSameDay(startDate, endDate)) return format(startDate, "PPP");
            return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
        }
        return "Date not set";
    }, [startDate, endDate]);

    const stopPropagation = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const dialogContent = (
        <div className="space-y-6 text-left text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-dashed flex items-start gap-3 text-left">
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5 text-left" />
                    <div className="min-w-0 text-left">
                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest text-left">Meeting Point</p>
                        <p className="text-xs font-bold leading-snug text-balance break-words text-left">{campaign.location}</p>
                    </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-dashed flex items-start gap-3 text-left">
                    <CalendarDays className="h-4 w-4 text-primary shrink-0 mt-0.5 text-left" />
                    <div className="min-w-0 text-left">
                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest text-left">Campaign Dates</p>
                        <p className="text-xs font-bold leading-snug text-left">{dateStr}</p>
                    </div>
                </div>
            </div>
            
            <div className="p-6 rounded-[2rem] bg-background border shadow-inner relative overflow-hidden group/text text-left">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none text-left">
                    <Newspaper className="h-20 w-20 text-primary rotate-12 text-left" />
                </div>
                <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-wrap leading-relaxed font-medium relative z-10 text-balance break-words text-left">
                    {campaign.description}
                </p>
            </div>

            {campaign.scripture && (
                <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 relative text-left">
                    <span className="absolute -top-3 left-6 bg-background px-3 text-[10px] font-black text-primary uppercase tracking-[0.2em] text-left">Inspirational Word</span>
                    <p className="italic text-base text-primary font-serif leading-relaxed text-left text-balance">&ldquo;{campaign.scriptureTestimony || campaign.scripture}&rdquo;</p>
                    <p className="text-[10px] font-black uppercase text-primary/60 text-right mt-3 tracking-widest text-right text-left">— {campaign.scripture}</p>
                </div>
            )}
        </div>
    );

    if (!mounted) return <>{children}</>;

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild onClick={stopPropagation}>{children}</SheetTrigger>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left">
                        <div className="flex items-center gap-3 mb-2 text-left">
                            <Target className="h-5 w-5 text-primary text-left" />
                            <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left text-left">Mission Overview</span>
                        </div>
                        <SheetHeader className="text-left flex-shrink-0 p-0 text-left">
                            <SheetTitle className="text-xl sm:text-2xl font-black font-headline leading-tight text-balance break-words text-left">{campaign.title}</SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1 text-left text-left">Full Mission Details & Vision</SheetDescription>
                        </SheetHeader>
                    </div>
                    <ScrollArea className="flex-grow text-left">
                        <div className="p-8 pb-32 text-left text-left text-left">
                            {dialogContent}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild onClick={stopPropagation}>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90dvh] text-left text-left">
                <div className="p-8 border-b bg-muted/10 shrink-0 text-left text-left">
                    <div className="flex items-center gap-3 mb-2 text-left text-left">
                        <Target className="h-5 w-5 text-primary text-left text-left" />
                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left text-left">Mission Overview</span>
                    </div>
                    <DialogHeader className="text-left p-0 text-left">
                        <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight break-words text-left text-left">{campaign.title}</DialogTitle>
                        <DialogDescription className="text-sm font-medium mt-1 text-left text-left">Full Campaign Description</DialogDescription>
                    </DialogHeader>
                </div>
                <div className="flex-1 min-h-0 text-left text-left">
                    <ScrollArea className="h-full text-left">
                        <div className="p-8 text-left text-left">
                            {dialogContent}
                        </div>
                    </ScrollArea>
                </div>
                <div className="p-6 border-t bg-muted/5 flex justify-end gap-3 shrink-0 text-left text-left">
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-full px-8 font-bold text-left">Close Details</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function QuickEvidenceDialog({ campaign, isOpen, onOpenChange }: { campaign: Campaign, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [preview, setPreview] = useState<{ url: string, localUrl?: string, type: 'image' | 'video' | 'audio' } | null>(null);
    const [stage, setStage] = useState<'preparatory' | 'ongoing'>('ongoing');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const galleryQuery = React.useMemo(() => {
        if (!isOpen || !firestore || !campaign.id) return null;
        return query(collection(firestore, 'campaigns', campaign.id, 'gallery'), orderBy('createdAt', 'desc'));
    }, [isOpen, firestore, campaign.id]);
    const { data: galleryItems, loading: galleryLoading } = useCollection<CampaignGalleryItem>(galleryQuery);

    const handleUploadProcessedFile = async (file: File | Blob, type: 'video' | 'audio' | 'image') => {
        if (!user || !storage) return;
        setIsUploading(true);
        setUploadProgress(0);
        const localUrl = URL.createObjectURL(file);
        try {
            const originalName = (file as File).name || `upload_${Date.now()}`;
            const fileRef = ref(storage, `campaign-assets/${user.uid}/${Date.now()}_${originalName}`);
            const metadata = { contentType: file.type || (type === 'audio' ? 'audio/mp4' : 'video/mp4') };
            
            const uploadTask = uploadBytesResumable(fileRef, file, metadata);
            uploadTask.on('state_changed', 
                (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
                (error) => { toast({ variant: 'destructive', title: 'Upload Failed' }); setIsUploading(false); },
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    setPreview({ url, localUrl, type: type as any });
                    toast({ title: 'Proof Prepared' });
                    setIsUploading(false);
                }
            );
        } catch (err) { setIsUploading(false); }
    };

    const handleUploadFinal = async () => {
        if (!user || !userProfile || !preview || !firestore) return;
        setIsUploading(true);
        const itemData = {
            url: preview.url,
            mediaType: preview.type,
            type: stage,
            authorId: user.uid,
            authorName: `${userProfile.firstName} ${userProfile.lastName}`,
            createdAt: serverTimestamp(),
        };
        try {
            await addDoc(collection(firestore, 'campaigns', campaign.id, 'gallery'), itemData);
            setPreview(null);
            toast({ title: 'Evidence Saved' });
            onOpenChange(false);
        } catch (e) { toast({ variant: 'destructive', title: 'Save Failed' }); }
        finally { setIsUploading(true); } // Fixed state transition
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!firestore) return;
        setIsDeleting(itemId);
        try {
            await deleteDoc(doc(firestore, 'campaigns', campaign.id, 'gallery', itemId));
            toast({ title: 'Evidence Removed' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Action Failed' });
        } finally {
            setIsDeleting(null);
        }
    };

    const header = (
        <div className="p-8 border-b bg-muted/10 shrink-0 text-left text-left">
            <div className="flex items-center justify-between gap-4 text-left text-left">
                <div className="min-w-0 text-left text-left">
                    <DrawerTitle className="text-2xl font-black font-headline text-left text-left">Mission Evidence</DrawerTitle>
                    <DrawerDescription className="text-sm font-medium mt-1 text-left text-left">Capture harvest impact for "{campaign.title}".</DrawerDescription>
                </div>
                <div className="flex items-center gap-2 opacity-40 text-left text-left">
                    <ChevronDown className="h-3 w-3 animate-bounce text-left text-left" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-left text-left">Swipe to close</span>
                </div>
            </div>
        </div>
    );

    const content = (
        <div className="p-8 space-y-8 text-left text-left">
            <div className="space-y-4 text-left text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left">Upload Stage</Label>
                <Select value={stage} onValueChange={(v: any) => setStage(v)}>
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left text-left">
                        <SelectValue className="text-left text-left" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl text-left text-left">
                        <SelectItem value="preparatory" className="text-left text-left">Preparatory Phase</SelectItem>
                        <SelectItem value="ongoing" className="text-left text-left">Ongoing Mission</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-4 text-left text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left">Media Evidence</Label>
                {!preview ? (
                    <div className="space-y-3 text-left text-left">
                        <div className={cn("border-2 border-dashed rounded-3xl p-4 flex flex-col items-center justify-center bg-muted/10 transition-colors cursor-pointer group h-[140px] text-left text-left", isUploading ? "opacity-50 pointer-events-none" : "hover:bg-muted/20")} onClick={() => fileInputRef.current?.click()}>
                             {isUploading ? (
                                <div className="flex flex-col items-center gap-2 text-left text-left">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary text-left text-left" />
                                    <p className="text-[9px] font-black uppercase text-primary text-left text-left">{Math.round(uploadProgress)}%</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-left text-left">
                                    <Camera className="h-8 w-8 text-primary mb-2 text-left text-left" />
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase text-center text-left text-left">ADD MEDIA</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="relative aspect-video rounded-3xl overflow-hidden border-2 shadow-inner group text-left text-left">
                        <Image src={preview.url} alt="Ev" fill className="object-cover text-left" unoptimized />
                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg text-left text-left" onClick={() => setPreview(null)}><X className="h-3.5 w-3.5 text-left text-left" /></Button>
                    </div>
                )}
            </div>

            <Button onClick={handleUploadFinal} disabled={!preview || isUploading} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 text-center text-left">
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin mr-2 text-left text-left" /> : <Upload className="h-5 w-5 mr-2 text-left text-left" />}
                UPLOAD EVIDENCE
            </Button>

            <div className="space-y-4 pt-4 border-t border-dashed text-left text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left">Mission Gallery</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left text-left">
                    {galleryLoading ? (
                        [...Array(3)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl text-left" />)
                    ) : galleryItems?.map(item => (
                        <div key={item.id} className="relative aspect-square rounded-2xl overflow-hidden border group/item text-left text-left">
                            <Image src={item.url} alt="Proof" fill className="object-cover transition-transform group-hover/item:scale-110 text-left text-left" unoptimized />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity p-2 flex flex-col justify-end text-left text-left">
                                <div className="flex justify-end text-left text-left">
                                    {(user?.uid === item.authorId || user?.uid === campaign.organizerId) && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                                            disabled={isDeleting === item.id}
                                            className="h-6 w-6 rounded-lg bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg text-left"
                                        >
                                            {isDeleting === item.id ? <Loader2 className="h-3 w-3 animate-spin text-left" /> : <Trash2 className="h-3 w-3 text-left" />}
                                        </button>
                                    )}
                                </div>
                                <p className="text-[7px] font-black text-white uppercase truncate text-left text-left">By {item.authorName}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleUploadProcessedFile(f, 'image'); }} />
        </div>
    );

    return (
        <Drawer open={isOpen} onOpenChange={onOpenChange}>
            <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
                {header}
                <ScrollArea className="flex-grow text-left text-left">
                    {content}
                </ScrollArea>
            </DrawerContent>
        </Drawer>
    );
}

type CampaignCardProps = {
  campaign: Campaign;
  userId?: string;
  userProfile?: UserProfile | null;
  distance: number | null;
  isJoined?: boolean;
  onManage: () => void;
  onShareTestimony: () => void;
  onDelete: () => void;
  onLogSoul: () => void;
};


export function CampaignCard({ campaign, userId, userProfile, distance, onManage, onShareTestimony, onDelete, isJoined, onLogSoul }: CampaignCardProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const isOwner = campaign.organizerId === userId;
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const [isDescriptionTruncated, setIsDescriptionTruncated] = useState(false);

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('a') ||
      (e.target as HTMLElement).closest('[role="dialog"]') ||
      (e.target as HTMLElement).closest('[role="menu"]')
    ) {
      return;
    }
    router.push(`/campaigns/${campaign.id}`);
  };

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const startDate = useMemo(() => safeToDate(campaign.startDate), [campaign.startDate]);
  const endDate = useMemo(() => safeToDate(campaign.endDate), [campaign.endDate]);

  const status = useMemo(() => {
    const now = new Date();
    if (!startDate || !endDate) return "Past";
    const endDateTime = new Date(endDate);
    if (campaign.endTime && /^\d{2}:\d{2}$/.test(campaign.endTime)) {
        const [hours, minutes] = campaign.endTime.split(':').map(Number);
        endDateTime.setHours(hours, minutes, 59, 999);
    } else endDateTime.setHours(23, 59, 59, 999);
    if (endDateTime < now) return "Past";
    const startDateTime = new Date(startDate);
    if (campaign.startTime && /^\d{2}:\d{2}$/.test(campaign.startTime)) {
        const [hours, minutes] = campaign.startTime.split(':').map(Number);
        startDateTime.setHours(hours, minutes, 0, 0);
    } else startDateTime.setHours(0, 0, 0, 0);
    if (startDateTime > now) return "Upcoming";
    return "Ongoing";
  }, [startDate, endDate, campaign.startTime, campaign.endTime]);


  const borderColorClass = useMemo(() => {
    switch (status) {
      case 'Ongoing': return 'border-t-blue-500';
      case 'Upcoming': return 'border-t-green-500';
      case 'Past': return 'border-t-red-500';
      default: return 'border-t-border';
    }
  }, [status]);


  useEffect(() => {
    if (descriptionRef.current) {
      const checkTruncation = () => {
        if (descriptionRef.current) {
          setIsDescriptionTruncated(descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight);
        }
      };
      setTimeout(checkTruncation, 100);
      window.addEventListener('resize', checkTruncation);
      return () => window.removeEventListener('resize', checkTruncation);
    }
  }, [campaign.description]);
  
  const handleInitiateChat = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Please log in' });
      return;
    }
    setIsChatLoading(true);
    try {
      const participantIds = [user.uid, campaign.organizerId].sort();
      const chatsRef = collection(firestore, 'chats');
      const q = query(chatsRef, where('participantIds', '==', participantIds), where('isGroupChat', '==', false));
      const querySnapshot = await getDocs(q);
      let existingChat = querySnapshot.docs.find(doc => doc.data().campaignId === campaign.id);
      let chatId: string;
      if (existingChat) chatId = existingChat.id;
      else {
         const ownerDoc = await getDoc(doc(firestore, "users", campaign.organizerId));
         const organizerProfile = ownerDoc.data() as UserProfile | undefined;
         const [userFirstName, ...userLastNameParts] = user.displayName?.split(' ') || ['User', ''];
         const newChatData = {
              participantIds,
              participantInfo: {
                  [user.uid]: { firstName: userFirstName, lastName: userLastNameParts.join(' '), photoURL: user.photoURL || '' },
                  [campaign.organizerId]: { firstName: campaign.organizerFirstName, lastName: campaign.organizerLastName, photoURL: organizerProfile?.photoURL || '' },
              },
              campaignId: campaign.id,
              campaignTitle: campaign.title,
              lastUpdatedAt: serverTimestamp(),
              hasMessages: false,
              isGroupChat: false,
          };
          const chatDocRef = await addDoc(chatsRef, newChatData);
          chatId = chatDocRef.id;
      }
      router.push(`/chats/${chatId}`);
    } catch (error) { toast({ variant: 'destructive', title: 'Chat Error' }); }
    finally { setIsChatLoading(false); }
  }


  const handleShare = async (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const shareUrl = `${window.location.origin}/campaigns/${campaign.id}`;
    const shareData = { title: `Join the '${campaign.title}' campaign!`, text: `Mobilizing for the harvest on Testify.`, url: shareUrl };
    try { if (navigator && navigator.share) await navigator.share(shareData); else throw new Error(); }
    catch (err: any) { if (err.name === 'AbortError') return; try { await navigator.clipboard.writeText(`${shareData.title} ${shareUrl}`); toast({ title: 'Link Copied!' }); } catch (clipErr) {} }
  };

  return (
    <>
      <Card id={campaign.id} className={cn("flex flex-col h-full w-full overflow-hidden transition-all duration-300 scroll-mt-48 border-t-4 cursor-pointer rounded-2xl border shadow-md sm:shadow-lg bg-card/50 backdrop-blur-sm text-left text-left", borderColorClass)} onClick={handleCardClick}>
        <CardHeader className="p-4 sm:p-6 flex flex-col sm:flex-row items-start justify-between gap-4 pb-3 sm:pb-6 text-left text-left">
            <div className="flex-1 min-w-0 w-full text-left text-left text-left">
                <CardTitle className="font-bold text-lg md:text-xl leading-tight break-words text-balance text-left text-left text-left">{campaign.title}</CardTitle>
                <CardDescription className="text-sm mt-1 line-clamp-2 font-medium break-words text-left text-left text-left">{campaign.goal}</CardDescription>
                {distance != null && (<CardDescription className="text-xs text-primary font-black mt-2 flex items-center gap-1.5 uppercase tracking-widest text-left text-left text-left"><MapPin className="h-3 w-3 text-left text-left text-left" />{distance.toFixed(1)} km away</CardDescription>)}
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-none pt-3 sm:pt-0 text-left text-left text-left">
              <div className="flex items-center gap-2 text-left text-left text-left">
                {(isJoined || isOwner) && (
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 border-primary/20 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-full shadow-md bg-background text-left text-left text-left" onClick={(e) => { e.stopPropagation(); setIsUploadOpen(true); }}><Camera className="h-4 w-4 sm:h-5 w-5 text-left text-left text-left" /><span className="sr-only text-left text-left text-left">Add Evidence</span></Button></TooltipTrigger><TooltipContent className="text-left text-left text-left"><p className="text-left text-left text-left">Add Media</p></TooltipContent></Tooltip></TooltipProvider>
                )}
                <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 border-primary/20 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-full shadow-md bg-background text-left text-left text-left" onClick={(e) => { e.stopPropagation(); router.push(`/campaigns/${campaign.id}`); }}><BarChart3 className="h-4 w-4 sm:h-5 w-5 text-left text-left text-left" /><span className="sr-only text-left text-left text-left">View Insights</span></Button></TooltipTrigger><TooltipContent className="text-left text-left text-left"><p className="text-left text-left text-left">Kingdom Insights</p></TooltipContent></Tooltip></TooltipProvider>
              </div>
              <Badge variant={status === 'Ongoing' ? 'default' : status === 'Upcoming' ? 'secondary' : 'outline'} className="uppercase font-bold tracking-widest text-[9px] sm:text-[10px] h-6 px-2 text-left text-left text-left">{status}</Badge>
            </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 flex-grow space-y-4 text-left text-left text-left text-left text-left text-left text-left text-left">
            <div className="space-y-1 text-left text-left text-left text-left text-left text-left"><p ref={descriptionRef} className="text-muted-foreground text-sm line-clamp-3 leading-relaxed font-medium break-words text-left text-left text-left text-left text-left">{campaign.description}</p>{isDescriptionTruncated && (<FullDescriptionDialog campaign={campaign}><Button variant="link" className="p-0 h-auto text-sm font-bold text-primary text-left text-left text-left text-left text-left">Read More</Button></FullDescriptionDialog>)}</div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-left text-left text-left text-left text-left text-left text-left"><div className="rounded-2xl border-2 border-dashed p-3.5 flex items-start gap-3 bg-background/30 min-h-[6rem] h-auto text-left text-left text-left text-left text-left text-left text-left"><MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5 text-left text-left text-left text-left text-left text-left text-left" /><div className="min-w-0 flex-1 text-left text-left text-left text-left text-left text-left text-left"><p className="font-black text-[10px] uppercase tracking-widest text-muted-foreground text-left text-left text-left text-left text-left text-left text-left">Location</p><p className="font-bold text-foreground break-words leading-snug line-clamp-3 text-left text-left text-left text-left text-left text-left text-left">{campaign.location}</p></div></div><div className="rounded-2xl border-2 border-dashed p-3.5 flex items-start gap-3 bg-background/30 min-h-[6rem] h-auto text-left text-left text-left text-left text-left text-left text-left"><CalendarDays className="h-5 w-5 text-primary shrink-0 mt-0.5 text-left text-left text-left text-left text-left text-left text-left text-left"><p className="font-black text-[10px] uppercase tracking-widest text-muted-foreground text-left text-left text-left text-left text-left text-left text-left">Schedule</p><p className="font-bold text-foreground leading-snug line-clamp-2 text-left text-left text-left text-left text-left text-left text-left text-left">{startDate && endDate ? (isSameDay(startDate, endDate) ? format(startDate, "PPP") : `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`) : "Date not set"}</p></div></div></div>
        </CardContent>
        <CardFooter className="p-4 sm:p-6 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-auto border-t bg-background/20 backdrop-blur-sm text-left text-left text-left text-left text-left">
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs font-bold uppercase tracking-tighter text-muted-foreground text-left text-left text-left text-left text-left"><ParticipantsDialog campaign={campaign}><Button variant="ghost" className="h-auto p-0 justify-start text-xs font-bold text-muted-foreground hover:bg-transparent hover:text-primary transition-colors text-left text-left text-left text-left text-left" onClick={stopPropagation}><Users className="h-4 w-4 text-left text-left text-left text-left text-left" /><span className="ml-1.5 text-left text-left text-left text-left text-left">{campaign.participants} MEMBERS</span></Button></ParticipantsDialog>{status === "Ongoing" && (<div className="flex items-center gap-1.5 text-primary text-left text-left text-left text-left text-left"><UserCheck className="h-4 w-4 text-left text-left text-left text-left text-left" /><span> {campaign.soulsLogged || 0} SOULS WON</span></div>)}</div>
            <div className="w-full sm:w-auto flex items-center flex-wrap justify-end gap-2 text-left text-left text-left" onClick={stopPropagation}>
                {status === 'Ongoing' && campaign.streamUrl && (
                    <Button asChild className="w-full sm:w-auto font-black rounded-xl shadow-lg h-9 text-center text-left text-left text-left text-left">
                        <a href={campaign.streamUrl} target="_blank" rel="noopener noreferrer" className="text-center text-left text-left text-left text-left">
                            <PlayCircle className="mr-2 h-4 w-4 text-left text-left text-left text-left" />WATCH LIVE
                        </a>
                    </Button>
                )}
                {isOwner ? (
                    <div onClick={stopPropagation} className="flex items-center gap-2 text-left text-left text-left text-left text-left">
                      {status === "Ongoing" && (<TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm text-left text-left text-left text-left text-left" onClick={(e) => { e.stopPropagation(); onLogSoul(); }}><UserPlus className="h-4 w-4 text-left text-left text-left text-left text-left" /></Button></TooltipTrigger><TooltipContent className="text-left text-left text-left text-left"><p className="text-left text-left text-left text-left">Log Soul Won</p></TooltipContent></Tooltip></TooltipProvider>)}
                      {(status === 'Ongoing' || status === 'Past') && (<TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm text-left text-left text-left text-left text-left" onClick={(e) => { e.stopPropagation(); onShareTestimony(); }}><Newspaper className="h-4 w-4 text-left text-left text-left text-left text-left" /></Button></TooltipTrigger><TooltipContent className="text-left text-left text-left text-left"><p className="text-left text-left text-left text-left">Share Testimony</p></TooltipContent></Tooltip></TooltipProvider>)}
                      <Button variant="outline" size="sm" className="h-9 rounded-xl gap-2 font-black uppercase tracking-widest text-[10px] shadow-sm border-primary/20 text-primary hover:bg-primary/5 text-center text-left text-left text-left text-left" onClick={(e) => { e.stopPropagation(); onManage(); }}><Edit className="h-4 w-4 text-left text-left text-left text-left text-left" />MANAGE</Button>
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm text-left text-left text-left text-left text-left" onClick={handleShare} disabled={status === 'Past'}><Share2 className="h-4 w-4 text-left text-left text-left text-left text-left" /></Button>
                    </div>
                ) : (
                    <div onClick={stopPropagation} className="flex items-center gap-2 text-left text-left text-left text-left text-left">
                        {!isJoined && status !== 'Past' && (<Button className="font-black rounded-xl shadow-lg h-9 text-center text-left text-left text-left text-left" onClick={(e) => { e.stopPropagation(); if (!userProfile) { toast({ variant: 'destructive', title: 'Please log in' }); return; } setIsJoinDialogOpen(true); }}>JOIN MISSION</Button>)}
                        {isJoined && (<Badge variant="secondary" className="flex items-center gap-2 py-1.5 px-3 h-9 font-black rounded-xl bg-primary/10 text-primary border-primary/20 shrink-0 text-left text-left text-left text-left text-left"><UserCheck className="h-4 w-4 text-left text-left text-left text-left text-left" /> JOINED</Badge>)}
                        {isJoined && status === "Ongoing" && (<TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm text-left text-left text-left text-left text-left" onClick={(e) => { e.stopPropagation(); onLogSoul(); }}><UserPlus className="h-4 w-4 text-left text-left text-left text-left text-left" /></Button></TooltipTrigger><TooltipContent className="text-left text-left text-left text-left"><p className="text-left text-left text-left text-left">Log Soul Won</p></TooltipContent></Tooltip></TooltipProvider>)}
                        {isJoined && (status === 'Ongoing' || status === 'Past') && (<TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm text-left text-left text-left text-left text-left" onClick={(e) => { e.stopPropagation(); onShareTestimony(); }}><Newspaper className="h-4 w-4 text-left text-left text-left text-left text-left" /></Button></TooltipTrigger><TooltipContent className="text-left text-left text-left text-left"><p className="text-left text-left text-left text-left">Share Testimony</p></TooltipContent></Tooltip></TooltipProvider>)}
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button onClick={handleInitiateChat} variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm text-left text-left text-left text-left text-left" disabled={!userId || isChatLoading}>{isChatLoading ? <Loader2 className="h-4 w-4 animate-spin text-left text-left text-left text-left text-left" /> : <MessagesSquare className="h-4 w-4 text-left text-left text-left text-left text-left" />}</Button></TooltipTrigger><TooltipContent className="text-left text-left text-left text-left"><p className="text-[10px] font-bold uppercase text-left text-left text-left text-left text-left">Chat with Organizer</p></TooltipContent></Tooltip></TooltipProvider>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm text-left text-left text-left text-left text-left" onClick={handleShare} disabled={status === 'Past'}><Share2 className="h-4 w-4 text-left text-left text-left text-left text-left" /></Button>
                    </div>
                )}
            </div>
        </CardFooter>
      </Card>
      {userProfile && !isOwner && (<JoinCampaignDialog campaign={campaign} userProfile={userProfile} isOpen={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen} onCampaignJoined={() => {}} />)}
      {isUploadOpen && (<QuickEvidenceDialog campaign={campaign} isOpen={isUploadOpen} onOpenChange={setIsUploadOpen} />)}
    </>
  );
}