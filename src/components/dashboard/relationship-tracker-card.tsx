'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { doc, serverTimestamp, writeBatch, arrayUnion, query, collection, orderBy } from 'firebase/firestore';
import type { Soul } from '@/lib/types';
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
  HeartHandshake,
  ArrowRight,
  MessagesSquare
} from 'lucide-react';
import { cn, safeToDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { actionItems, prayerTemplates } from '@/lib/follow-up-data';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

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
    'matchmaking': HeartHandshake,
};

function MatchmakingDialog({ 
    isOpen, 
    onOpenChange, 
    sourceSoul, 
    allSouls, 
    onMatchConfirmed 
}: { 
    isOpen: boolean; 
    onOpenChange: (open: boolean) => void; 
    sourceSoul: Soul | null; 
    allSouls: Soul[];
    onMatchConfirmed: (candidate: Soul) => void;
}) {
    const [searchTerm, setSearchTerm] = useState('');

    const candidates = useMemo(() => {
        if (!sourceSoul) return [];
        return allSouls.filter(s => 
            s.id !== sourceSoul.id && 
            s.gender && sourceSoul.gender && s.gender !== sourceSoul.gender &&
            (s.age || 0) >= 18 &&
            ['Single', 'Divorced', 'Widowed'].includes(s.maritalStatus || '')
        ).filter(s => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return `${s.firstName} ${s.lastName}`.toLowerCase().includes(term);
        }).sort((a,b) => a.firstName.localeCompare(b.firstName));
    }, [sourceSoul, allSouls, searchTerm]);

    if (!sourceSoul) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left">
                <div className="p-8 border-b bg-muted/10 text-left text-left">
                    <div className="flex items-center gap-2 mb-2 text-left text-left">
                        <HeartHandshake className="h-5 w-5 text-primary text-left text-left" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left text-left">Kingdom Matching</span>
                    </div>
                    <DialogHeader className="text-left text-left text-left">
                        <DialogTitle className="text-2xl font-black font-headline uppercase text-left text-left text-left">Find Match for {sourceSoul.firstName}</DialogTitle>
                        <DialogDescription className="text-sm font-medium mt-1 text-left text-left text-left">Listing eligible singles (18+) of the opposite gender.</DialogDescription>
                    </DialogHeader>
                    <div className="relative mt-6 text-left">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 text-left text-left" />
                        <Input 
                            placeholder="Search candidates..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="h-11 pl-10 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left"
                        />
                    </div>
                </div>
                <ScrollArea className="max-h-[50vh] text-left">
                    <div className="p-4 space-y-2 text-left">
                        {candidates.length > 0 ? candidates.map(c => (
                            <Button 
                                key={c.id} 
                                variant="ghost" 
                                className="w-full justify-start h-auto min-h-[4rem] rounded-2xl gap-4 hover:bg-primary/5 group p-4 flex flex-row items-center text-left"
                                onClick={() => onMatchConfirmed(c)}
                            >
                                <Avatar className="h-10 w-10 border shadow-sm shrink-0 text-left text-left">
                                    <AvatarFallback className="font-black bg-primary/10 text-primary text-xs flex items-center justify-center h-full w-full text-left text-left">{c.firstName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1 text-left text-left">
                                    <p className="font-black text-sm uppercase tracking-tight truncate leading-tight text-left text-left">{c.firstName} {c.lastName} ({c.age})</p>
                                    <div className="flex items-center gap-2 mt-0.5 opacity-60 flex-wrap text-left text-left">
                                        <Badge variant="outline" className="h-4 px-1 text-[7px] uppercase font-bold tracking-widest text-left text-left">{c.maritalStatus}</Badge>
                                        <p className="text-[9px] font-bold uppercase truncate text-left text-left">{c.church || 'Global Network'}</p>
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 opacity-20 group-hover:opacity-100 transition-opacity shrink-0 text-left text-left" />
                            </Button>
                        )) : (
                            <div className="py-20 text-center flex flex-col items-center text-left text-left">
                                <Users className="h-12 w-12 text-muted-foreground/10 mb-4 text-left text-left" />
                                <p className="text-sm text-muted-foreground italic text-center text-left">No eligible candidates found.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

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
    const [search, setSearch] = useState('');
    const filteredSouls = useMemo(() => {
        if (!souls) return [];
        if (!search) return souls;
        const term = search.toLowerCase();
        return souls.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(term));
    }, [souls, search]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
                <DialogHeader className="p-8 border-b bg-muted/10 text-left text-left">
                    <DialogTitle className="text-2xl font-black font-headline uppercase text-left text-left">Who did you {actionLabel.toLowerCase()}?</DialogTitle>
                    <DialogDescription className="text-sm font-medium text-left text-left">Select a convert to link this action to their record.</DialogDescription>
                </DialogHeader>
                <div className="p-6 space-y-6 text-left">
                    <div className="relative text-left">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50 text-left" />
                        <Input 
                            placeholder="Search by name..." 
                            value={search} 
                            onChange={e => setSearchTerm(e.target.value)}
                            className="rounded-2xl h-12 pl-10 bg-muted/20 border-none shadow-inner text-base text-left"
                        />
                    </div>
                    <ScrollArea className="h-[40vh] border rounded-3xl bg-muted/5 text-left text-left">
                        <div className="p-2 space-y-1.5 text-left text-left">
                            {filteredSouls.length > 0 ? (
                                filteredSouls.map(soul => (
                                    <Button 
                                        key={soul.id} 
                                        variant="ghost" 
                                        className="w-full justify-start h-16 px-4 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all gap-4 group flex flex-row items-center text-left text-left"
                                        onClick={() => onSelect(soul)}
                                        disabled={isLoading}
                                    >
                                        <Avatar className="h-10 w-10 border-2 group-hover:border-primary/20 transition-colors shadow-sm text-left text-left">
                                            <AvatarFallback className="font-bold bg-primary/5 text-center flex items-center justify-center w-full h-full text-left text-left">{soul.firstName?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-left min-w-0 flex-1 text-left text-left">
                                            <p className="font-black text-sm truncate uppercase tracking-tight text-left text-left">{soul.firstName} {soul.lastName}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60 text-left text-left">{soul.status}</p>
                                        </div>
                                        <div className="h-8 w-8 rounded-full bg-muted/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-left text-left">
                                            <PlusCircle className="h-4 w-4 text-left text-left" />
                                        </div>
                                    </Button>
                                ))
                            ) : (
                                <div className="text-center py-16 px-8 space-y-3 text-left">
                                    <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto text-left text-left">
                                        <Users className="h-6 w-6 text-muted-foreground opacity-20 text-left text-left" />
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60 text-center text-left">
                                        {search ? "No matches found" : "Log your first soul to begin tracking"}
                                    </p>
                                </div>
                            )}
                        </div>
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
  const router = useRouter();
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [isSoulDialogOpen, setIsSoulDialogOpen] = useState(false);
  const [isMatchmakingOpen, setIsMatchmakingOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [selectedSoulForMatch, setSelectedSoulForMatch] = useState<Soul | null>(null);

  const { userProfile, loading: profileLoading } = useUserProfile();

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`), orderBy("wonAt", "desc"));
  }, [user?.uid, firestore]);
  const { data: souls, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

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
      setIsSoulDialogOpen(true);
  };

  const handleSoulSelected = async (soul: Soul) => {
    if (!user || !firestore || !selectedActionId) return;
    
    if (selectedActionId === 'matchmaking') {
        setSelectedSoulForMatch(soul);
        setIsSoulDialogOpen(false);
        setIsMatchmakingOpen(true);
        return;
    }

    setIsSoulDialogOpen(false);
    setTogglingId(selectedActionId);

    const action = actionItems.find(a => a.id === selectedActionId);
    if (!action) return;

    const today = new Date();
    const dateString = format(today, 'yyyy-MM-dd');
    const batch = writeBatch(firestore);

    const newCompleted = [...completedToday];
    if (!newCompleted.includes(selectedActionId)) newCompleted.push(selectedActionId);

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

    const soulUserRef = doc(firestore, `users/${user.uid}/souls`, soul.id);
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
        toast({ title: 'Kingdom Impact Saved!', description: `Logged '${action.label}' for ${soul.firstName}.` });
    } catch (err: any) {
        console.error("Batch update failed:", err);
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `souls/${soul.id}`, operation: 'write' }, user));
    } finally {
        setTogglingId(null);
        setSelectedActionId(null);
    }
  };

  const handleMatchConfirmed = (candidate: Soul) => {
      if (!selectedSoulForMatch) return;
      setIsMatchmakingOpen(false);
      const template = `Hi ${selectedSoulForMatch.firstName}, I've found a potential Kingdom match for you! Meet ${candidate.firstName}, a believer from my harvest field. Let's explore if this is God's will for both of you. ${window.location.origin}/chats`;
      router.push(`/chats?soulId=${selectedSoulForMatch.id}&template=${encodeURIComponent(template)}`);
  };

  const activeActionLabel = useMemo(() => 
    actionItems.find(a => a.id === selectedActionId)?.label || "Connect with", 
  [selectedActionId]);

  if (userLoading || profileLoading || soulsLoading) {
    return (
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b">
        <CardHeader className="p-4 sm:p-6 text-left">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 px-4 sm:px-6 pb-6 text-left">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b overflow-hidden relative group/card text-left">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover/card:opacity-[0.05] transition-opacity text-left">
          <Users className="h-32 w-32 text-primary rotate-12 text-left" />
        </div>

        <CardHeader className="p-4 sm:p-6 pb-4 relative z-10 text-left">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between text-left">
              <div className="space-y-1 text-left">
                  <CardTitle className="text-base sm:text-lg font-black font-headline uppercase tracking-tight flex items-center gap-2 text-left">
                      <Sparkles className="h-5 w-5 text-primary text-left" />
                      Kingdom Connections
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60 text-left">Daily Relational Efforts</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-left">
                {currentDate && (
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 text-left">
                    {format(currentDate, 'PPPP')}
                  </div>
                )}
              </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-2 relative z-10 text-left">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 text-left text-left">
              {actionItems.map(action => {
                  const isCompleted = completedToday.includes(action.id);
                  const Icon = iconMap[action.id] || Heart;
                  return (
                      <TooltipProvider key={action.id}>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <motion.div whileTap={{ scale: 0.95 }} whileHover={{ y: -2 }} className="text-left">
                                      <Button
                                          variant="outline"
                                          className={cn(
                                              "relative flex flex-col items-center justify-center gap-2 p-3 h-24 w-full text-center transition-all duration-500 rounded-3xl border-2 overflow-hidden text-left",
                                              isCompleted 
                                                  ? "bg-primary/[0.03] border-primary/40 shadow-inner ring-1 ring-primary/10" 
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
                                                      className="absolute top-2 right-2 bg-primary rounded-full p-0.5 shadow-lg z-20 text-left"
                                                  >
                                                      <CheckCircle2 className="h-3 w-3 text-primary-foreground fill-current text-left text-left" />
                                                  </motion.div>
                                              )}
                                          </AnimatePresence>

                                          {togglingId === action.id ? (
                                              <Loader2 className="h-6 w-6 animate-spin text-primary text-left" />
                                          ) : (
                                              <>
                                                  <div className={cn(
                                                      "h-8 w-8 rounded-2xl flex items-center justify-center transition-all duration-500 text-left",
                                                      isCompleted ? "bg-primary/20 scale-110 shadow-lg" : "bg-muted/30"
                                                  )}>
                                                      <Icon className={cn("h-4 w-4 transition-all text-left", isCompleted ? "text-primary fill-current" : "text-primary/60")} />
                                                  </div>
                                                  <div className="space-y-0.5 min-w-0 w-full text-left">
                                                      <span className={cn(
                                                          "text-[10px] font-black uppercase tracking-tight block truncate text-left",
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
                              <TooltipContent className="rounded-xl border-primary/20 shadow-xl text-left" side="bottom">
                                  <p className="text-[10px] font-bold uppercase text-primary text-left">Kingdom Action</p>
                                  <p className="text-xs font-medium max-w-[150px] leading-relaxed italic text-left">{action.label}</p>
                              </TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                  );
              })}
          </div>
        </CardContent>
        <CardFooter className="px-4 sm:px-6 pb-6 pt-4 flex flex-col gap-4 border-t mt-4 bg-muted/5 text-left">
              <Button asChild variant="default" className="w-full font-black h-12 rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase text-xs sm:text-sm text-left">
                  <Link href="/souls-won" className="text-left text-left">
                      <UserPlus className="mr-2 h-4 w-4 text-left" />
                      MANAGE SOULS WON
                  </Link>
              </Button>
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

      <MatchmakingDialog 
        isOpen={isMatchmakingOpen} 
        onOpenChange={setIsMatchmakingOpen}
        sourceSoul={selectedSoulForMatch}
        allSouls={souls || []}
        onMatchConfirmed={handleMatchConfirmed}
      />
    </>
  );
}
