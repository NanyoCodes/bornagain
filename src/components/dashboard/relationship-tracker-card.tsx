'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { doc, serverTimestamp, writeBatch, arrayUnion, query, collection, orderBy } from 'firebase/firestore';
import type { UserProfile, Soul } from '@/lib/types';
import { isToday, format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
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
  ArrowRight
} from 'lucide-react';
import { cn, safeToDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { actionItems } from '@/lib/follow-up-data';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

    const listContent = (
        <div className="p-2 space-y-1.5 text-left">
            {filteredSouls.length > 0 ? (
                filteredSouls.map(soul => (
                    <Button 
                        key={soul.id} 
                        variant="ghost" 
                        className="w-full justify-start h-auto py-4 px-4 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all gap-4 group flex items-center"
                        onClick={() => onSelect(soul)}
                        disabled={isLoading}
                    >
                        <Avatar className="h-10 w-10 border-2 group-hover:border-primary/20 transition-colors shadow-sm shrink-0">
                            <AvatarFallback className="font-bold bg-primary/10 text-primary">{soul.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="text-left min-w-0 flex-1">
                            <p className="font-black text-sm truncate uppercase tracking-tight">{soul.firstName} {soul.lastName}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">{soul.status}</p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-muted/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="h-4 w-4" />
                        </div>
                    </Button>
                ))
            ) : (
                <div className="text-center py-16 px-8 space-y-3">
                    <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto">
                        <Users className="h-6 w-6 text-muted-foreground opacity-20" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                        {search ? "No matches found" : "Log your first soul to begin tracking"}
                    </p>
                </div>
            )}
        </div>
    );

    const title = `Who did you ${actionLabel.toLowerCase()}?`;
    const desc = "Select a convert to link this action to their spiritual record.";

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={onOpenChange}>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
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
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
                <div className="p-8 border-b bg-muted/10">
                    <DialogHeader className="text-left">
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

export function RelationshipTrackerCard() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [isSoulDialogOpen, setIsSoulDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  const { userProfile, loading: profileLoading } = useUserProfile();

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'souls'), orderBy("wonAt", "desc"));
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
    
    setIsSoulDialogOpen(false);
    
    const action = actionItems.find(a => a.id === selectedActionId);
    if (!action) return;

    // 1. Identify Linking/Special Actions
    if (selectedActionId === 'visited_home') {
        const address = [soul.locationWon?.street, soul.locationWon?.city, soul.locationWon?.state, soul.locationWon?.country].filter(Boolean).join(', ');
        if (address) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
        } else {
            toast({ variant: 'destructive', title: 'Location Undefined', description: `Please set a location for ${soul.firstName} first.` });
            return;
        }
    } else if (selectedActionId === 'phone_call' && soul.phone) {
        window.location.href = `tel:${soul.phone}`;
    } else if (selectedActionId === 'shared_meal' || selectedActionId === 'gave_gift') {
        const provisionKey = `testify_pending_provisions_${user.uid}`;
        const stored = localStorage.getItem(provisionKey);
        let current = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(current)) current = [];
        
        if (!current.some((p: any) => p.soulId === soul.id && p.actionId === selectedActionId)) {
            current.push({
                soulId: soul.id,
                soulName: `${soul.firstName} ${soul.lastName}`,
                actionId: selectedActionId,
                timestamp: Date.now()
            });
            localStorage.setItem(provisionKey, JSON.stringify(current));
            window.dispatchEvent(new Event('testify_pending_action_update'));
        }

        const path = selectedActionId === 'shared_meal' ? '/dashboard/marketplace' : '/dashboard/marketplace/gifts';
        router.push(`${path}?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}&actionId=${selectedActionId}`);
    }

    setTogglingId(selectedActionId);

    const today = new Date();
    const dateString = format(today, 'yyyy-MM-dd');
    const batch = writeBatch(firestore);

    // 2. Update user's daily discipline (habit tracking)
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

    // 3. Update soul's history
    const memberName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || user.displayName || 'Member';
    const logEntry = {
        date: new Date(), 
        note: `Logged via Kingdom Connections: ${action.label} (Initiated)`,
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
        <CardHeader className="p-4 sm:p-6 text-left">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 px-4 sm:px-6 pb-6 text-left">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b overflow-hidden relative group/card text-left">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover/card:opacity-[0.05] transition-opacity">
          <Users className="h-32 w-32 text-primary rotate-12" />
        </div>

        <CardHeader className="p-4 sm:p-6 pb-4 relative z-10 text-left">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between text-left">
              <div className="space-y-1 text-left">
                  <CardTitle className="text-base sm:text-lg font-black font-headline uppercase tracking-tight flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Kingdom Connections
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60">Daily Relational Efforts</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-left">
                {currentDate && (
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    {format(currentDate, 'PPPP')}
                  </div>
                )}
              </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-2 relative z-10 text-left">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 text-left">
              {actionItems.map(action => {
                  const isCompleted = completedToday.includes(action.id);
                  const Icon = iconMap[action.id] || Heart;
                  return (
                      <TooltipProvider key={action.id}>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <motion.div whileTap={{ scale: 0.95 }} whileHover={{ y: -2 }} className="w-full">
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
                                                  <div className="space-y-0.5 min-w-0 w-full text-center">
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
              <Button asChild variant="default" className="w-full font-black h-12 rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase text-xs sm:text-sm">
                  <Link href="/dashboard/souls-won">
                      <UserPlus className="mr-2 h-4 w-4" />
                      MANAGE SOULS WON
                  </Link>
              </Button>
              <p className="text-[8px] text-center text-muted-foreground font-black uppercase tracking-[0.2em] opacity-40">
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
    </>
  );
}
