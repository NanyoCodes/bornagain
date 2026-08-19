"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser, useFirestore, useCollection, useUserProfile } from "@/firebase";
import { collection, query, orderBy, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { Event, JoinedEvent } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  PlusCircle, 
  CalendarDays, 
  Search, 
  Loader2, 
  Sparkles, 
  ArrowLeft,
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
import { useIsMobile } from "@/hooks/use-mobile";
import { EventCard } from "./event-card";
import { CreateEventForm } from "./create-event-form";
import { ManageEventForm } from "./manage-event-form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { safeToDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";

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
  
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const eventsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'events'), where('status', '==', 'active'));
  }, [firestore]);
  const { data: rawEvents, loading } = useCollection<Event>(eventsQuery);

  const joinedQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/joinedEvents`));
  }, [user?.uid, firestore]);
  const { data: joinedEvents } = useCollection<JoinedEvent>(joinedQuery);

  const joinedIds = useMemo(() => new Set(joinedEvents?.map(j => j.eventId)), [joinedEvents]);

  const filteredEvents = useMemo(() => {
    if (!rawEvents) return [];
    
    let list = [...rawEvents].sort((a, b) => {
        const dateA = safeToDate(a.startDate)?.getTime() ?? 0;
        const dateB = safeToDate(b.startDate)?.getTime() ?? 0;
        return dateA - dateB;
    });

    if (activeTab === 'mine') {
      list = list.filter(e => e.organizerId === user?.uid);
    } else if (activeTab === 'joined') {
      list = list.filter(e => joinedIds.has(e.id));
    }

    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(e => 
      e.title.toLowerCase().includes(term) || 
      e.description.toLowerCase().includes(term) ||
      e.location.toLowerCase().includes(term) ||
      e.organizerName.toLowerCase().includes(term)
    );
  }, [rawEvents, searchTerm, activeTab, user?.uid, joinedIds]);

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
            router.refresh();
        } catch (error: any) {
            console.error("Cancel Event Error:", error);
            if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: eventRef.path, operation: 'update' }, user));
            }
        } finally {
            setIsDeleting(true);
            setTimeout(() => setIsDeleting(false), 500);
        }
    };

    performCancel();
    return true; 
  };

  return (
    <div className="space-y-8 md:space-y-12 max-w-4xl mx-auto pb-32 w-full text-left">
        <header className="px-4 sm:px-0 space-y-6 pt-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-left">
                <div className="flex items-center gap-4 text-left">
                    <div className="space-y-1 text-left text-left">
                        <h1 className="text-2xl sm:text-4xl font-black font-headline tracking-tight uppercase text-left">EVENTS HUB</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60 flex items-center gap-2 text-left">
                            <CalendarDays className="h-4 w-4 text-primary text-left" /> Event Directory
                        </p>
                    </div>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto rounded-2xl font-black uppercase tracking-widest h-12 shadow-xl shadow-primary/20 text-left">
                    <PlusCircle className="mr-2 h-4 w-4 text-left" /> HOST AN EVENT
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between text-left">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto text-left">
                    <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/40 p-1 rounded-2xl text-left">
                        <TabsTrigger value="all" className="font-black text-[10px] uppercase tracking-widest rounded-xl text-left text-left">Global</TabsTrigger>
                        <TabsTrigger value="mine" className="font-black text-[10px] uppercase tracking-widest rounded-xl text-left text-left text-left">My Events</TabsTrigger>
                        <TabsTrigger value="joined" className="font-black text-[10px] uppercase tracking-widest rounded-xl text-left text-left text-left">I'm Going</TabsTrigger>
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

        <div className="flex flex-col gap-6 sm:gap-10 px-0 sm:px-0 -mx-4 sm:mx-0 text-left text-left">
            {loading ? (
                [...Array(3)].map((_, i) => (
                    <Card key={i} className="rounded-none sm:rounded-[3rem] border-x-0 sm:border-x border-b-2 sm:border-b shadow-none sm:shadow-sm animate-pulse h-[400px] text-left">
                        <CardContent className="h-full bg-muted/30 text-left" />
                    </Card>
                ))
            ) : filteredEvents.length > 0 ? (
                filteredEvents.map(event => (
                    <EventCard 
                        key={event.id} 
                        event={event} 
                        isJoined={joinedIds.has(event.id)} 
                        userProfile={userProfile ?? null} 
                        onEdit={() => setEventToEdit(event)}
                        onDelete={() => setEventToDelete(event)}
                    />
                ))
            ) : (
                <div className="col-span-full py-32 text-center flex flex-col items-center px-8 text-left">
                    <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6 text-left text-left">
                        <CalendarDays className="h-10 w-10 text-muted-foreground opacity-10 text-left" />
                    </div>
                    <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-40 text-left text-left text-left text-left">Hub Silence</h3>
                    <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-sm mx-auto text-left text-left">No events found in this category. Why not host one for the body of Christ?</p>
                </div>
            )}
        </div>

        {isCreateOpen && (
            isMobile ? (
                <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left">
                        <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left text-left">
                            <SheetHeader className="text-left flex-shrink-0 text-left">
                                <SheetTitle className="text-2xl font-black font-headline text-left">Host for the Kingdom</SheetTitle>
                                <SheetDescription className="text-sm font-medium mt-1 text-left">Organize a gathering to strengthen and equip the saints.</SheetDescription>
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
                    <DialogContent className="sm:max-w-3xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left text-left text-left text-left">
                        <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left">
                            <DialogHeader className="text-left text-left text-left">
                                <DialogTitle className="text-2xl font-black font-headline text-left">Host for the Kingdom</DialogTitle>
                                <DialogDescription className="text-base font-medium text-left">Organize a gathering to strengthen and equip the saints.</DialogDescription>
                            </DialogHeader>
                        </div>
                        <ScrollArea className="flex-grow min-h-0 text-left">
                            <div className="p-8 text-left">
                                {userProfile && <CreateEventForm onEventCreated={() => setIsCreateOpen(false)} userProfile={userProfile} />}
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )
        )}

        {eventToEdit && (
            isMobile ? (
                <Sheet open={!!eventToEdit} onOpenChange={(open) => !open && setEventToEdit(null)}>
                    <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left">
                        <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left">
                            <SheetHeader className="text-left flex-shrink-0 text-left text-left">
                                <SheetTitle className="text-2xl font-black font-headline text-left">Manage Hub</SheetTitle>
                                <SheetDescription className="text-sm font-medium mt-1 text-left">Refine the vision for your gathering.</SheetDescription>
                            </SheetHeader>
                        </div>
                        <ScrollArea className="flex-grow text-left">
                            <div className="p-8 text-left text-left">
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
                    <DialogContent className="sm:max-w-3xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left text-left text-left text-left text-left">
                        <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left">
                            <DialogHeader className="text-left text-left text-left text-left">
                                <DialogTitle className="text-2xl font-black font-headline text-left">Manage Hub</DialogTitle>
                                <DialogDescription className="text-base font-medium text-left">Update event logistics and details.</DialogDescription>
                            </DialogHeader>
                        </div>
                        <ScrollArea className="flex-grow min-h-0 text-left text-left text-left">
                            <div className="p-8 text-left text-left">
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
            <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl text-left text-left text-left">
                <AlertDialogHeader className="text-left text-left text-left text-left">
                    <AlertDialogTitle className="text-2xl font-black font-headline uppercase leading-tight text-left text-left">Cancel Gathering?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium leading-relaxed text-left text-left">
                        This will mark "{eventToDelete?.title}" as cancelled and remove it from the global directory. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-6 text-left text-left text-left">
                    <AlertDialogCancel disabled={isDeleting} className="rounded-xl h-12 font-bold text-left text-left">Close</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelEvent} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold text-left text-left">
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left text-left" />}
                        Confirm Cancellation
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
