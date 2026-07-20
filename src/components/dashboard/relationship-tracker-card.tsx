'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { doc, serverTimestamp, writeBatch, arrayUnion, query, collection, orderBy } from 'firebase/firestore';
import type { UserProfile, Soul, BibleHighlight } from '@/lib/types';
import { isToday, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Heart, 
  MessageSquare, 
  Flame, 
  Users, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  Info, 
  BookOpen,
  Home,
  Phone,
  Calendar,
  Utensils,
  Gift,
  UserPlus,
  Search,
  PlusCircle,
  ArrowLeft,
  ArrowRight,
  Target,
  Globe,
  X,
  MapPin
} from 'lucide-react';
import { cn, safeToDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { actionItems, kingdomVerses } from '@/lib/follow-up-data';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '../ui/separator';

const iconMap: Record<string, any> = {
    'prayed_together': Sparkles,
    'studied_bible': BookOpen,
    'shared_meal': Utensils,
    'visited_home': Home,
    'introduced_friend': Users,
    'gave_gift': Gift,
    'phone_call': Phone,
    'text_message': MessageSquare,
    'helped_with_need': Heart,
    'invited_to_event': Calendar,
};

function SoulSelectionDialog({ 
  isOpen, 
  onOpenChange, 
  souls, 
  onSelect,
  actionLabel,
  isLoading
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  souls: Soul[] | null; 
  onSelect: (soul: Soul) => void;
  actionLabel: string;
  isLoading: boolean;
}) {
    const isMobile = useIsMobile();
    const [search, setSearch] = useState('');
    const filteredSouls = useMemo(() => {
        if (!souls) return [];
        if (!search) return souls;
        const term = search.toLowerCase();
        return souls.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(term));
    }, [souls, search]);

    const handleSoulClick = (soul: Soul) => {
        const loc = soul.locationWon;
        const address = [loc?.street, loc?.city, loc?.state, loc?.country].filter(Boolean).join(', ');

        if (address) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
        }
        onSelect(soul);
    };

    const listContent = (
        <div className="p-2 space-y-1.5">
            {filteredSouls.length > 0 ? (
                filteredSouls.map(soul => (
                    <Button 
                        key={soul.id} 
                        variant="ghost" 
                        className="w-full justify-start h-auto py-4 px-4 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all gap-4 group flex items-center"
                        onClick={() => handleSoulClick(soul)}
                        disabled={isLoading}
                    >
                        <Avatar className="h-10 w-10 border-2 group-hover:border-primary/20 transition-colors shadow-sm shrink-0">
                            <AvatarFallback className="font-bold bg-primary/5">{soul.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="text-left min-w-0 flex-1">
                            <p className="font-black text-sm truncate uppercase tracking-tight">{soul.firstName} {soul.lastName}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">{soul.status}</p>
                            {(soul.locationWon?.street || soul.locationWon?.city) && (
                                <div className="flex items-center gap-1 text-[8px] font-black text-primary mt-1 uppercase tracking-widest">
                                    <MapPin className="h-2.5 w-2.5" />
                                    <span>Home Map Ready</span>
                                </div>
                            )}
                        </div>
                        <div className="h-8 w-8 rounded-full bg-muted/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <ArrowRight className="h-4 w-4" />
                        </div>
                    </Button>
                ))
            ) : (
                <div className="text-center py-16 px-8 space-y-3">
                    <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto">
                        <Users className="h-6 w-6 text-muted-foreground opacity-20" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60 text-balance text-center">
                        {search ? "No matches found" : "Log your first soul to begin tracking"}
                    </p>
                </div>
            )}
        </div>
    );

    const title = `Who did you ${actionLabel.toLowerCase()}?`;
    const desc = "Select a convert to link this action and view their home map.";

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={onOpenChange}>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                    <div className="p-8 border-b bg-muted/10 shrink-0">
                        <SheetHeader className="text-left">
                            <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">{title}</SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1">{desc}</SheetDescription>
                        </SheetHeader>
                    </div>
                    <div className="p-6 space-y-4 flex-grow flex flex-col min-h-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                            <Input 
                                placeholder="Search by name..." 
                                value={search} 
                                onChange={e => setSearch(e.target.value)}
                                className="rounded-2xl h-12 pl-10 bg-muted/20 border-none shadow-inner text-base"
                            />
                        </div>
                        <ScrollArea className="flex-1 border rounded-3xl bg-muted/5">
                            {listContent}
                        </ScrollArea>
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                <div className="p-8 border-b bg-muted/10">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">{title}</DialogTitle>
                        <DialogDescription className="text-sm font-medium">{desc}</DialogDescription>
                    </DialogHeader>
                </div>
                <div className="p-6 space-y-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                        <Input 
                            placeholder="Search by name..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)}
                            className="rounded-2xl h-12 pl-10 bg-muted/20 border-none shadow-inner text-base"
                        />
                    </div>
                    <ScrollArea className="h-[40vh] border rounded-3xl bg-muted/5">
                        {listContent}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ScriptureSelectionDialog({ 
    isOpen, 
    onOpenChange, 
    highlights, 
    onSelect 
}: { 
    isOpen: boolean; 
    onOpenChange: (open: boolean) => void; 
    highlights: BibleHighlight[] | null; 
    onSelect: (text: string) => void;
}) {
    const isMobile = useIsMobile();
    const [search, setSearch] = useState('');
    
    const filteredHighlights = useMemo(() => {
        if (!highlights) return [];
        if (!search) return highlights;
        const term = search.toLowerCase();
        return highlights.filter(h => 
            h.book.toLowerCase().includes(term) || 
            (h.note && h.note.toLowerCase().includes(term))
        );
    }, [highlights, search]);

    const listContent = (
        <div className="space-y-6">
            <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Your Journal Highlights</h3>
                <div className="grid gap-2">
                    {filteredHighlights.length > 0 ? (
                        filteredHighlights.map(h => (
                            <Button 
                                key={h.id} 
                                variant="outline" 
                                className="h-auto p-4 flex flex-col items-start text-left rounded-2xl border-primary/10 hover:bg-primary/5 group"
                                onClick={() => onSelect(`${h.book} ${h.chapter}: "${h.note || 'Scripture Highlight'}"`)}
                            >
                                <p className="font-black text-xs uppercase tracking-tight group-hover:text-primary transition-colors">{h.book} {h.chapter}</p>
                                {h.note && <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2 leading-relaxed">&ldquo;{h.note}&rdquo;</p>}
                            </Button>
                        ))
                    ) : (
                        <p className="text-xs text-muted-foreground italic p-4 text-center">No journal highlights matching search.</p>
                    )}
                </div>
            </div>

            <Separator className="opacity-50" />

            <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Kingdom Essentials</h3>
                <div className="grid gap-2">
                    {kingdomVerses.map((v, i) => (
                        <Button 
                            key={i} 
                            variant="outline" 
                            className="h-auto p-4 flex flex-col items-start text-left rounded-2xl border-primary/10 hover:bg-primary/5 group"
                            onClick={() => onSelect(`${v.reference}: "${v.text}"`)}
                        >
                            <p className="font-black text-xs uppercase tracking-tight group-hover:text-primary transition-colors">{v.reference}</p>
                            <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2 leading-relaxed">&ldquo;{v.text}&rdquo;</p>
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );

    const dialogHeader = (
        <div className="p-8 border-b bg-muted/10 text-left">
            <div className="flex items-center gap-3 mb-2 text-left">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Scripture Hub</span>
            </div>
            <h2 className="text-2xl font-black font-headline uppercase tracking-tight">Select Word</h2>
            <p className="text-sm font-medium mt-1 text-muted-foreground">Choose a scripture to share. Full quotes are automatically included.</p>
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={onOpenChange}>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                    {dialogHeader}
                    <div className="p-6 space-y-4 flex-grow flex flex-col min-h-0 text-left">
                         <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                            <Input 
                                placeholder="Search book or journal..." 
                                value={search} 
                                onChange={e => setSearch(e.target.value)}
                                className="rounded-2xl h-12 pl-10 bg-muted/20 border-none shadow-inner text-base"
                            />
                        </div>
                        <ScrollArea className="flex-1 pr-1">
                            {listContent}
                            <div className="h-20" />
                        </ScrollArea>
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
                {dialogHeader}
                <div className="p-6 space-y-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                        <Input 
                            placeholder="Search book or journal..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)}
                            className="rounded-2xl h-12 pl-10 bg-muted/20 border-none shadow-inner text-base"
                        />
                    </div>
                    <ScrollArea className="h-[50vh] pr-1">
                        {listContent}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function RelationshipTrackerCard() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [isSoulDialogOpen, setIsSoulDialogOpen] = useState(false);
  const [isScriptureDialogOpen, setIsScriptureDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  const { userProfile, loading: profileLoading } = useUserProfile();

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'souls'), orderBy("wonAt", "desc"));
  }, [user?.uid, firestore]);
  const { data: souls, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

  const highlightsQuery = useMemo(() => {
      if (!user?.uid || !firestore) return null;
      return query(collection(firestore, 'users', user.uid, 'bibleHighlights'), orderBy('createdAt', 'desc'));
  }, [user?.uid, firestore]);
  const { data: highlights } = useCollection<BibleHighlight>(highlightsQuery);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  useEffect(() => {
    if (userProfile?.dailyDiscipline) {
      const lastUpdatedDate = safeToDate(userProfile.dailyDiscipline.lastUpdated);
      if (lastUpdatedDate && isToday(lastUpdatedDate)) {
        setCompletedToday(userProfile.dailyDiscipline.completed || []);
      } else {
        setCompletedToday([]);
      }
    }
  }, [userProfile]);

  const handleActionClick = (id: string) => {
      setSelectedActionId(id);
      if (id === 'studied_bible') {
          setIsScriptureDialogOpen(true);
      } else {
          setIsSoulDialogOpen(true);
      }
  };

  const handleScriptureSelected = (text: string) => {
      setIsScriptureDialogOpen(false);
      setIsSoulDialogOpen(true);
  };

  const handleSoulSelected = async (soul: Soul) => {
    if (!user || !firestore || !selectedActionId) return;
    
    setIsSoulDialogOpen(false);
    setTogglingId(selectedActionId);

    const action = actionItems.find(a => a.id === selectedActionId);
    if (!action) return;

    const today = new Date();
    const dateString = format(today, 'yyyy-MM-dd');
    const batch = writeBatch(firestore);

    const wasCompleted = completedToday.includes(selectedActionId);
    const newCompleted = [...completedToday];
    if (!wasCompleted) newCompleted.push(selectedActionId);

    const userRef = doc(firestore, 'users', user.uid);
    batch.update(userRef, {
      'dailyDiscipline.completed': newCompleted,
      'dailyDiscipline.lastUpdated': serverTimestamp(),
    });

    const historyRef = doc(firestore, 'users', user.uid, 'disciplineHistory', dateString);
    batch.set(historyRef, {
        completed: newCompleted,
        date: serverTimestamp()
    }, { merge: true });

    const memberName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || user.displayName || 'Member';
    const logEntry = {
        date: new Date(), 
        note: `Logged via Kingdom Connections: ${action.label}`,
        actions: [selectedActionId],
        memberId: user.uid,
        memberName: memberName,
    };

    const soulUserRef = doc(firestore, 'users', user.uid, 'souls', soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);
    
    batch.update(soulUserRef, {
        followUpLog: arrayUnion(logEntry),
        lastUpdatedAt: serverTimestamp(),
    });
    batch.update(globalSoulRef, {
        followUpLog: arrayUnion(logEntry),
        lastUpdatedAt: serverTimestamp(),
    });

    try {
        await batch.commit();
        setCompletedToday(newCompleted);
        toast({ 
            title: 'Kingdom Impact Saved!', 
            description: `Logged '${action.label}' for ${soul.firstName}.` 
        });
    } catch (err: any) {
        console.error("Batch update failed:", err);
        const permissionError = new FirestorePermissionError({
            path: `BATCH_WRITE:RELATION_TRACKER:${soul.id}`,
            operation: 'write',
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setTogglingId(null);
        setSelectedActionId(null);
    }
  };

  const activeActionLabel = useMemo(() => 
    actionItems.find(a => a.id === selectedActionId)?.label || "Connect with", 
  [selectedActionId]);

  if (userLoading || profileLoading || soulsLoading) {
    return (
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b">
        <CardHeader className="p-4 sm:p-6">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 px-4 sm:px-6 pb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b overflow-hidden relative group/card">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover/card:opacity-[0.05] transition-opacity">
          <Users className="h-32 w-32 text-primary rotate-12" />
        </div>

        <CardHeader className="p-4 sm:p-6 pb-4 relative z-10">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
              <div className="space-y-1 text-left">
                  <CardTitle className="text-base sm:text-lg font-black font-headline uppercase tracking-tight flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Kingdom Connections
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60">Daily Relational Efforts</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                {currentDate && (
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    {format(currentDate, 'PPPP')}
                  </div>
                )}
              </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-2 relative z-10">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {actionItems.map(action => {
                  const isCompleted = completedToday.includes(action.id);
                  const Icon = iconMap[action.id] || Heart;
                  return (
                      <TooltipProvider key={action.id}>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <motion.div whileTap={{ scale: 0.95 }} whileHover={{ y: -2 }}>
                                      <Button
                                          variant="outline"
                                          className={cn(
                                              "relative flex flex-col items-center justify-center gap-2 p-3 h-24 w-full text-center transition-all duration-500 rounded-3xl border-2 overflow-hidden",
                                              isCompleted 
                                                  ? "bg-primary/5 border-primary/40 shadow-inner ring-1 ring-primary/10" 
                                                  : "bg-background/40 hover:bg-muted/50 hover:border-primary/20"
                                          )}
                                          onClick={() => handleActionClick(action.id)}
                                          disabled={togglingId === action.id}
                                      >
                                          <AnimatePresence>
                                              {isCompleted && togglingId !== action.id && (
                                                  <motion.div 
                                                      initial={{ scale: 0, opacity: 0 }}
                                                      animate={{ scale: 1, opacity: 1 }}
                                                      exit={{ scale: 0, opacity: 0 }}
                                                      className="absolute top-2 right-2 bg-primary rounded-full p-0.5 shadow-lg z-20"
                                                  >
                                                      <CheckCircle2 className="h-3 w-3 text-primary-foreground fill-current" />
                                                  </motion.div>
                                              )}
                                          </AnimatePresence>

                                          {togglingId === action.id ? (
                                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                          ) : (
                                              <>
                                                  <div className={cn(
                                                      "h-8 w-8 rounded-2xl flex items-center justify-center transition-all duration-500",
                                                      isCompleted ? "bg-primary/20 scale-110 shadow-lg" : "bg-muted/30"
                                                  )}>
                                                      <Icon className={cn("h-4 w-4 transition-all", isCompleted ? "text-primary fill-current" : "text-primary/60")} />
                                                  </div>
                                                  <div className="space-y-0.5 min-w-0 w-full">
                                                      <span className={cn(
                                                          "text-[9px] font-black uppercase tracking-tight block truncate",
                                                          isCompleted ? "text-primary" : "text-foreground"
                                                      )}>
                                                          {action.label}
                                                      </span>
                                                  </div>
                                              </>
                                          )}
                                      </Button>
                                  </motion.div>
                              </TooltipTrigger>
                              <TooltipContent className="rounded-xl border-primary/20 shadow-xl" side="bottom">
                                  <p className="text-[10px] font-bold uppercase text-primary">Kingdom Action</p>
                                  <p className="text-xs font-medium max-w-[150px] leading-relaxed italic">{action.label}</p>
                              </TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                  );
              })}
          </div>
        </CardContent>
        <CardFooter className="px-4 sm:px-6 pb-6 pt-4 flex flex-col gap-4 border-t mt-4 bg-muted/5">
              <Button asChild variant="default" className="w-full font-black h-12 rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase text-xs sm:text-sm">
                  <Link href="/dashboard/souls-won">
                      <UserPlus className="mr-2 h-4 w-4" />
                      MANAGE SOULS WON
                  </Link>
              </Button>
              <p className="text-[8px] text-center text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-40">
                  Unity • Growth • Love
              </p>
        </CardFooter>
      </Card>

      <SoulSelectionDialog 
          isOpen={isSoulDialogOpen} 
          onOpenChange={setIsSoulDialogOpen} 
          souls={souls} 
          onSelect={handleSoulSelected} 
          actionLabel={activeActionLabel}
          isLoading={togglingId !== null}
      />

      <ScriptureSelectionDialog
          isOpen={isScriptureDialogOpen}
          onOpenChange={setIsScriptureDialogOpen}
          highlights={highlights}
          onSelect={handleScriptureSelected}
      />
    </>
  );
}
