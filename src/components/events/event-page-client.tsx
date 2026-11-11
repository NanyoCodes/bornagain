'use client';

import { useState, useMemo, useEffect } from "react";
import { useUser, useFirestore, useCollection, useUserProfile } from "@/firebase";
import { 
  collection, 
  query, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  writeBatch, 
  where, 
  getDocs, 
  deleteDoc, 
  collectionGroup 
} from "firebase/firestore";
import type { Event, EventGalleryItem } from "@/lib/types";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  PlusCircle, 
  CalendarDays, 
  Search, 
  Loader2, 
  Sparkles, 
  ArrowLeft,
  Camera,
  Upload,
  ChevronDown,
  X,
  Target,
  Newspaper,
  Filter
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerDescription 
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { EventCard } from "./event-card";
import { CreateEventForm } from "./create-event-form";
import { ManageEventForm } from "./manage-event-form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { safeToDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { BibleGameCard } from "@/components/testimonies/bible-game-card";
import { KingdomAdSpot } from "@/components/testimonies/kingdom-ad-spot";
import { ImageUpload } from "../common/image-upload";
import Image from "next/image";

function EvidenceHub() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const evidenceQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, 'gallery'), orderBy('createdAt', 'desc'));
    }, [firestore]);

    const { data: evidence, loading, error } = useCollection<EventGalleryItem>(evidenceQuery);

    if (loading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-left">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-2xl animate-pulse bg-muted/30" />
                ))}
            </div>
        );
    }

    if (error || !evidence || evidence.length === 0) {
        return (
            <div className="py-24 text-center border-2 border-dashed rounded-[2.5rem] bg-muted/5 flex flex-col items-center">
                <div className="h-16 w-16 bg-muted/10 rounded-full flex items-center justify-center mb-6">
                    <Camera className="h-8 w-8 text-primary opacity-10" />
                </div>
                <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-40 text-center">Gallery Silence</h3>
                <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-xs mx-auto text-balance text-center">
                    Capture the impact of your gatherings and post them here to encourage the global Body.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 text-left">
            {evidence.map((item) => (
                <Dialog key={item.id}>
                    <DialogTrigger asChild>
                        <div className="relative aspect-square rounded-2xl overflow-hidden border shadow-sm group cursor-pointer bg-muted">
                            <Image src={item.url} alt="Evidence" fill className="object-cover transition-transform group-hover:scale-110" unoptimized />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                                <p className="text-[9px] font-black text-white uppercase truncate text-left">By {item.authorName}</p>
                            </div>
                        </div>
                    </DialogTrigger>
                    <DialogContent className="p-0 bg-black/95 border-none sm:max-w-[95vw] h-dvh rounded-none flex flex-col items-center justify-center text-center">
                        <div className="sr-only">
                            <DialogHeader>
                                <DialogTitle>Evidence Proclamation</DialogTitle>
                                <DialogDescription>Full screen view of gathering impact photo.</DialogDescription>
                            </DialogHeader>
                        </div>
                        <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
                            <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
                                <Image src={item.url} alt="Full view" fill className="object-contain" unoptimized />
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            ))}
        </div>
    );
}

function GlobalUploadDialog({ 
    isOpen, 
    onOpenChange,
    userProfile 
}: { 
    isOpen: boolean; 
    onOpenChange: (open: boolean) => void;
    userProfile: UserProfile;
}) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [photoUrl, setPhotoUrl] = useState('');
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const joinedEventsQuery = useMemo(() => {
        if (!user?.uid || !firestore) return null;
        return query(collection(firestore, 'events'), where('participantIds', 'array-contains', user.uid));
    }, [user?.uid, firestore]);
    const { data: myEvents } = useCollection<Event>(joinedEventsQuery);

    const handleUpload = async () => {
        if (!user || !userProfile || !photoUrl || !firestore || !selectedEventId) {
            toast({ variant: 'destructive', title: 'Action Denied', description: 'Please select an event and upload a photo.' });
            return;
        }

        setIsSubmitting(true);
        const itemData = {
            url: photoUrl,
            authorId: user.uid,
            authorName: `${userProfile.firstName} ${userProfile.lastName}`,
            createdAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(firestore, 'events', selectedEventId, 'gallery'), itemData);
            toast({ title: 'Evidence Shared!', description: 'Your proclamation is live in the Kingdom network.' });
            setPhotoUrl('');
            onOpenChange(false);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Upload Failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl flex flex-col text-left">
                <div className="p-8 border-b bg-muted/10 shrink-0">
                    <div className="flex items-center gap-2 mb-2 text-left">
                        <Sparkles className="h-5 w-5 text-primary text-left" />
                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Kingdom Proclamation</span>
                    </div>
                    <DialogHeader className="p-0 text-left">
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Approve & Upload Proof</DialogTitle>
                        <DialogDescription className="text-sm font-medium mt-1 text-left">Capture and share the manifest power of God from your gathering.</DialogDescription>
                    </DialogHeader>
                </div>
                <ScrollArea className="flex-grow">
                    <div className="p-8 space-y-6 text-left">
                        <div className="space-y-2 text-left">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Select Gathering</Label>
                            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left">
                                    <SelectValue placeholder="Which gathering are you in?" className="text-left" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl text-left">
                                    {myEvents?.map(e => (
                                        <SelectItem key={e.id} value={e.id} className="rounded-xl font-bold text-left">{e.title}</SelectItem>
                                    ))}
                                    {(!myEvents || myEvents.length === 0) && (
                                        <div className="p-4 text-center">
                                            <p className="text-xs text-muted-foreground italic">You haven't joined any gatherings yet.</p>
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 text-left">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Visual Evidence</Label>
                            <ImageUpload 
                                initialImageUrl={photoUrl}
                                onUploadComplete={setPhotoUrl}
                                storagePath="events"
                                cropAspect={4/3}
                            />
                        </div>

                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3 text-left">
                            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5 text-left" />
                            <p className="text-[10px] text-muted-foreground font-medium leading-relaxed text-left">
                                Uploading evidence strengthens the faith of the Body. By posting, you approve the public sharing of this miracle proof within the Kingdom Network.
                            </p>
                        </div>
                    </div>
                </ScrollArea>
                <div className="p-8 bg-muted/5 border-t flex flex-col sm:flex-row gap-3 shrink-0 text-left">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl h-12 font-bold text-left">Cancel</Button>
                    <Button 
                        onClick={handleUpload} 
                        disabled={!photoUrl || !selectedEventId || isSubmitting}
                        className="flex-1 rounded-xl h-12 font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-center text-left"
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" /> : <Upload className="mr-2 h-4 w-4 text-left" />}
                        POST PROOF
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function EventPageClient() {
  const { user } = useUser();
  const { userProfile } = useUserProfile();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGlobalUploadOpen, setIsGlobalUploadOpen] = useState(false);
  
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const eventsQuery = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    
    const eventsRef = collection(firestore, 'events');
    
    if (activeTab === 'mine') {
      return query(
        eventsRef, 
        where('status', '==', 'active'),
        where('organizerId', '==', user.uid)
      );
    }
    
    if (activeTab === 'joined') {
      return query(
        eventsRef,
        where('status', '==', 'active'),
        where('participantIds', 'array-contains', user.uid)
      );
    }

    return query(eventsRef, where('status', '==', 'active'), where('visibility', '==', 'public'));
  }, [firestore, user?.uid, activeTab]);

  const { data: rawEvents, loading: eventsLoading } = useCollection<Event>(eventsQuery);

  const filteredEvents = useMemo(() => {
    if (!rawEvents) return [];
    
    let list = [...rawEvents].sort((a, b) => {
        const dateA = safeToDate(a.startDate)?.getTime() ?? 0;
        const dateB = safeToDate(b.startDate)?.getTime() ?? 0;
        return dateA - dateB;
    });

    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(e => 
      e.title.toLowerCase().includes(term) || 
      e.description.toLowerCase().includes(term) ||
      e.location.toLowerCase().includes(term) ||
      e.organizerName.toLowerCase().includes(term)
    );
  }, [rawEvents, searchTerm]);

  const interleavedEvents = useMemo(() => {
    const list: (Event & { isAd?: boolean; isGame?: boolean; adType?: 'business' | 'event' })[] = [];
    filteredEvents.forEach((e, i) => {
      list.push(e);
      if ((i + 1) % 5 === 0) {
        list.push({ id: `game-${i}`, isGame: true } as any);
      }
      if ((i + 1) % 4 === 0 && (i + 1) % 5 !== 0) {
        list.push({ id: `ad-${i}`, isAd: true, adType: (i / 4) % 2 === 0 ? 'event' : 'business' } as any);
      }
    });
    return list;
  }, [filteredEvents]);

  const handleCancelEvent = () => {
    if (!eventToDelete || !user || !firestore) return;
    
    const eventRef = doc(firestore, 'events', eventToDelete.id);
    const updateData = { status: 'cancelled', deletedAt: serverTimestamp() };
    
    setEventToDelete(null);
    setIsDeleting(true);

    const performCancel = async () => {
        try {
            await updateDoc(eventRef, updateData);
            toast({ title: 'Event Cancelled' });
        } catch (error: any) {
            console.error("Cancel Event Error:", error);
            if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: eventRef.path, operation: 'update' }, user));
            }
        } finally {
            setIsDeleting(false);
        }
    };

    performCancel();
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8 md:space-y-12 max-w-4xl mx-auto pb-32 w-full text-left">
        <header className="px-4 sm:px-0 space-y-6 pt-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-left">
                <div className="flex items-center gap-4 text-left">
                    <div className="space-y-1 text-left">
                        <h1 className="text-2xl sm:text-4xl font-black font-headline tracking-tight uppercase text-left">EVENTS HUB</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60 flex items-center gap-2 text-left">
                            <CalendarDays className="h-4 w-4 text-primary text-left" /> Event Directory
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto text-left">
                    <Button onClick={() => setIsCreateOpen(true)} className="flex-1 sm:flex-none rounded-2xl font-black uppercase tracking-widest h-12 shadow-xl shadow-primary/20 text-left">
                        <PlusCircle className="mr-2 h-4 w-4 text-left" /> HOST EVENT
                    </Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between text-left">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto text-left">
                    <TabsList className="flex w-full overflow-x-auto no-scrollbar justify-start sm:grid sm:grid-cols-4 h-12 bg-muted/40 p-1 rounded-2xl text-left">
                        <TabsTrigger value="all" className="font-black text-[10px] uppercase tracking-widest rounded-xl text-center shrink-0 sm:shrink">Global</TabsTrigger>
                        <TabsTrigger value="mine" className="font-black text-[10px] uppercase tracking-widest rounded-xl text-center shrink-0 sm:shrink">My Hubs</TabsTrigger>
                        <TabsTrigger value="joined" className="font-black text-[10px] uppercase tracking-widest rounded-xl text-center shrink-0 sm:shrink">Going</TabsTrigger>
                        <TabsTrigger value="evidence" className="font-black text-[10px] uppercase tracking-widest rounded-xl text-center shrink-0 sm:shrink">Evidence</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="relative flex-1 w-full sm:max-w-sm text-left">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 text-left" />
                    <Input 
                        placeholder="Search for gatherings..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="h-12 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold w-full text-left"
                    />
                </div>
            </div>
        </header>

        <div className="px-0 sm:px-0 -mx-4 sm:mx-0 text-left">
            <Tabs value={activeTab} className="w-full text-left">
                <TabsContent value="evidence" className="mt-0 outline-none px-4 sm:px-0 text-left">
                    <div className="space-y-8 text-left">
                        <div className="flex items-center gap-3 px-1 text-left">
                            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner text-left">
                                <Sparkles className="h-5 w-5 text-primary text-left" />
                            </div>
                            <div className="text-left text-left">
                                <h3 className="text-xl font-black font-headline uppercase tracking-tight text-left">Mission Proof</h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 text-left">Visual proclamations of God's work</p>
                            </div>
                        </div>
                        <EvidenceHub />
                    </div>
                </TabsContent>

                <TabsContent value={activeTab === 'evidence' ? 'evidence' : activeTab} className="mt-0 outline-none text-left">
                    <div className="flex flex-col gap-6 sm:gap-10 text-left">
                        {activeTab !== 'evidence' && (
                            eventsLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <Card key={i} className="rounded-none sm:rounded-[3rem] border-x-0 sm:border-x border-b-2 sm:border-b shadow-none sm:shadow-sm animate-pulse h-[400px] text-left">
                                        <CardContent className="h-full bg-muted/30 text-left" />
                                    </Card>
                                ))
                            ) : interleavedEvents.length > 0 ? (
                                interleavedEvents.map((item: any) => (
                                    item.isGame ? (
                                        <div key={item.id} className="px-4 sm:px-0 text-left"><BibleGameCard /></div>
                                    ) : item.isAd ? (
                                        <div key={item.id} className="px-4 sm:px-0 text-left"><KingdomAdSpot type={item.adType} /></div>
                                    ) : (
                                        <EventCard 
                                            key={item.id} 
                                            event={item} 
                                            isJoined={activeTab === 'mine' || activeTab === 'joined' || (user?.uid ? item.participantIds?.includes(user.uid) : false)} 
                                            userProfile={userProfile ?? null} 
                                            onEdit={() => setEventToEdit(item)}
                                            onDelete={() => setEventToDelete(item)}
                                        />
                                    )
                                ))
                            ) : (
                                <div className="col-span-full py-32 text-center flex flex-col items-center px-8 text-left">
                                    <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6 text-left">
                                        <CalendarDays className="h-10 w-10 text-muted-foreground opacity-10 text-left" />
                                    </div>
                                    <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-40 text-center text-left">Hub Silence</h3>
                                    <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-sm mx-auto text-balance text-center text-left">No events found here. Why not host one for the Body of Christ?</p>
                                </div>
                            )
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>

        {isCreateOpen && (
            isMobile ? (
                <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                        <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                            <SheetHeader className="text-left flex-shrink-0 p-0 text-left">
                                <SheetTitle className="text-2xl font-black font-headline text-left">Host for the Kingdom</SheetTitle>
                                <SheetDescription className="text-sm font-medium mt-1 text-left">Organize a gathering to strengthen the saints.</SheetDescription>
                            </SheetHeader>
                        </div>
                        <ScrollArea className="flex-grow text-left">
                            <div className="p-8 text-left">
                                {userProfile && <CreateEventForm onEventCreated={() => setIsCreateOpen(false)} userProfile={userProfile} />}
                            </div>
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
            ) : (
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-2xl sm:rounded-[2rem] border-none shadow-2xl text-left">
                        <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left">
                            <DialogHeader className="text-left p-0 text-left text-left">
                                <DialogTitle className="text-2xl font-black font-headline text-left text-left">Host for the Kingdom</DialogTitle>
                                <DialogDescription className="text-base font-medium text-left text-left">Organize a gathering to strengthen the saints.</DialogDescription>
                            </DialogHeader>
                        </div>
                        <ScrollArea className="flex-1 min-h-0 text-left text-left">
                            <div className="p-8 text-left text-left">
                                {userProfile && <CreateEventForm onEventCreated={() => setIsCreateOpen(false)} userProfile={userProfile} />}
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )
        )}

        {isGlobalUploadOpen && userProfile && (
            <GlobalUploadDialog 
                isOpen={isGlobalUploadOpen}
                onOpenChange={setIsGlobalUploadOpen}
                userProfile={userProfile}
            />
        )}

        {eventToEdit && (
            isMobile ? (
                <Sheet open={!!eventToEdit} onOpenChange={(open) => !open && setEventToEdit(null)}>
                    <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                        <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left">
                            <SheetHeader className="text-left flex-shrink-0 p-0 text-left text-left">
                                <SheetTitle className="text-2xl font-black font-headline text-left text-left text-left">Manage Hub</SheetTitle>
                                <SheetDescription className="text-sm font-medium mt-1 text-left text-left text-left">Refine the vision for your gathering.</SheetDescription>
                            </SheetHeader>
                        </div>
                        <ScrollArea className="flex-grow text-left">
                            <div className="p-8 text-left text-left text-left">
                                <ManageEventForm 
                                    event={eventToEdit} 
                                    onEventUpdated={() => setEventToEdit(null)} 
                                    onDelete={() => {
                                        const e = eventToEdit;
                                        setEventToEdit(null);
                                        setTimeout(() => setEventToDelete(e), 150);
                                    }}
                                />
                            </div>
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
            ) : (
                <Dialog open={!!eventToEdit} onOpenChange={(open) => !open && setEventToEdit(null)}>
                    <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-2xl sm:rounded-[2rem] border-none shadow-2xl text-left text-left">
                        <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left">
                            <DialogHeader className="text-left p-0 text-left text-left text-left">
                                <DialogTitle className="text-2xl font-black font-headline text-left text-left text-left">Manage Hub</DialogTitle>
                                <DialogDescription className="text-base font-medium text-left text-left text-left">Update event logistics and details.</DialogDescription>
                            </DialogHeader>
                        </div>
                        <ScrollArea className="flex-1 min-h-0 text-left text-left text-left">
                            <div className="p-8 text-left text-left text-left">
                                <ManageEventForm 
                                    event={eventToEdit} 
                                    onEventUpdated={() => setEventToEdit(null)} 
                                    onDelete={() => {
                                        const e = eventToEdit;
                                        setEventToEdit(null);
                                        setTimeout(() => setEventToDelete(e), 150);
                                    }}
                                />
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )
        )}

        <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
            <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl text-left text-left text-left text-left">
                <AlertDialogHeader className="text-left text-left text-left text-left">
                    <AlertDialogTitle className="text-2xl font-black font-headline uppercase leading-tight text-left text-left text-left">Cancel Gathering?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium leading-relaxed text-left text-left text-left text-left">
                        This will mark "{eventToDelete?.title}" as cancelled and remove it from the global directory. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-6 text-left text-left text-left text-left">
                    <AlertDialogCancel disabled={isDeleting} className="rounded-xl h-12 font-bold text-left text-left text-left text-left text-left">Close</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelEvent} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold text-center text-left text-left text-left text-left">
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left text-left text-left" />}
                        Confirm Cancellation
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}