
"use client";

import { useState, useMemo } from "react";
import { useUser, useFirestore, useCollection, useUserProfile } from "@/firebase";
import { collection, query, orderBy, where } from "firebase/firestore";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { EventCard } from "./event-card";
import { CreateEventForm } from "./create-event-form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { safeToDate } from "@/lib/utils";

export default function EventPageClient() {
  const { user } = useUser();
  const { userProfile } = useUserProfile();
  const firestore = useFirestore();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const eventsQuery = useMemo(() => {
    if (!firestore) return null;
    // Optimization: Remove server-side orderBy to avoid composite index requirement
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
    
    // Client-side sorting by startDate
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
      e.location.toLowerCase().includes(term)
    );
  }, [rawEvents, searchTerm, activeTab, user?.uid, joinedIds]);

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-32">
        <header className="px-4 sm:px-0 space-y-6 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className="space-y-1">
                        <h1 className="text-3xl sm:text-4xl font-black font-headline tracking-tight uppercase">Kingdom Hub</h1>
                        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60 flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-primary" /> Event Directory
                        </p>
                    </div>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="rounded-2xl font-black uppercase tracking-widest h-12 shadow-xl shadow-primary/20">
                    <PlusCircle className="mr-2 h-4 w-4" /> HOST AN EVENT
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/40 p-1 rounded-2xl">
                        <TabsTrigger value="all" className="font-black text-[10px] uppercase tracking-widest rounded-xl">Global</TabsTrigger>
                        <TabsTrigger value="mine" className="font-black text-[10px] uppercase tracking-widest rounded-xl">My Events</TabsTrigger>
                        <TabsTrigger value="joined" className="font-black text-[10px] uppercase tracking-widest rounded-xl">I'm Going</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40" />
                    <Input 
                        placeholder="Search for gatherings..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="h-12 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner"
                    />
                </div>
            </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 sm:px-0">
            {loading ? (
                [...Array(4)].map((_, i) => (
                    <Card key={i} className="rounded-[2.5rem] border-none shadow-sm animate-pulse h-[350px]">
                        <CardContent className="h-full bg-muted/30" />
                    </Card>
                ))
            ) : filteredEvents.length > 0 ? (
                filteredEvents.map(event => (
                    <EventCard key={event.id} event={event} isJoined={joinedIds.has(event.id)} userProfile={userProfile} />
                ))
            ) : (
                <div className="col-span-full py-32 text-center flex flex-col items-center">
                    <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6">
                        <CalendarDays className="h-10 w-10 text-muted-foreground opacity-10" />
                    </div>
                    <h3 className="text-2xl font-black font-headline uppercase tracking-tight opacity-40">Hub Silence</h3>
                    <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-sm mx-auto">No events found in this category. Why not host one for the body of Christ?</p>
                </div>
            )}
        </div>

        {isCreateOpen && (
            isMobile ? (
                <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                        <div className="p-8 border-b shrink-0 bg-muted/10">
                            <SheetHeader className="text-left">
                                <SheetTitle className="text-2xl font-black font-headline">Host for the Kingdom</SheetTitle>
                                <SheetDescription className="text-sm font-medium mt-1">Organize a gathering to strengthen and equip the saints.</SheetDescription>
                            </SheetHeader>
                        </div>
                        <ScrollArea className="flex-grow">
                            <div className="p-8">
                                {userProfile && <CreateEventForm onEventCreated={() => setIsCreateOpen(false)} userProfile={userProfile} />}
                            </div>
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
            ) : (
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-[2rem]">
                        <div className="p-8 border-b shrink-0 bg-muted/10">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black font-headline">Host for the Kingdom</DialogTitle>
                                <DialogDescription className="text-base font-medium">Organize a gathering to strengthen and equip the saints.</DialogDescription>
                            </DialogHeader>
                        </div>
                        <ScrollArea className="flex-grow">
                            <div className="p-8">
                                {userProfile && <CreateEventForm onEventCreated={() => setIsCreateOpen(false)} userProfile={userProfile} />}
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )
        )}
    </div>
  );
}
