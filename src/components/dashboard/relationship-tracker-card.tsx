'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { doc, serverTimestamp, writeBatch, arrayUnion, query, collection, orderBy, addDoc, getDoc, updateDoc, where, getDocs, deleteField } from 'firebase/firestore';
import type { UserProfile, Soul } from '@/lib/types';
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
  Hourglass,
  ArrowRight,
  Send,
  X
} from 'lucide-react';
import { cn, safeToDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { actionItems, prayerTemplates } from '@/lib/follow-up-data';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

function SoulSelectionList({ 
    souls, 
    onSelect, 
    isLoading 
}: { 
    souls: Soul[] | null; 
    onSelect: (soul: Soul) => void;
    isLoading: boolean;
}) {
    const [search, setSearchTerm] = useState('');
    const filteredSouls = useMemo(() => {
        if (!souls) return [];
        if (!search) return souls;
        const term = search.toLowerCase();
        return souls.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(term));
    }, [souls, search]);

    return (
        <div className="space-y-6 text-left">
            <div className="relative text-left">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                <Input 
                    placeholder="Search by name..." 
                    value={search} 
                    onChange={e => setSearchTerm(e.target.value)}
                    className="rounded-2xl h-12 pl-10 bg-muted/20 border-none shadow-inner text-base"
                />
            </div>
            <ScrollArea className="h-[40vh] border rounded-3xl bg-muted/5 text-left">
                <div className="p-2 space-y-1.5 text-left">
                    {filteredSouls.length > 0 ? (
                        filteredSouls.map(soul => (
                            <Button 
                                key={soul.id} 
                                variant="ghost" 
                                className="w-full justify-start h-16 px-4 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all gap-4 group text-left"
                                onClick={() => onSelect(soul)}
                                disabled={isLoading}
                            >
                                <Avatar className="h-10 w-10 border-2 group-hover:border-primary/20 transition-colors shadow-sm text-left">
                                    <AvatarFallback className="font-bold bg-primary/5 text-left">{soul.firstName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="text-left min-w-0 flex-1">
                                    <p className="font-black text-sm truncate uppercase tracking-tight text-left">{soul.firstName} {soul.lastName}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60 text-left">{soul.status}</p>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-muted/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-left">
                                    <PlusCircle className="h-4 w-4 text-left" />
                                </div>
                            </Button>
                        ))
                    ) : (
                        <div className="text-center py-16 px-8 space-y-3 text-left">
                            <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto text-left">
                                <Users className="h-6 w-6 text-muted-foreground opacity-20 text-left" />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60 text-balance text-left text-center">
                                {search ? "No matches found" : "Log your first soul to begin tracking"}
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

export function RelationshipTrackerCard() {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [pendingActions, setPendingActions] = useState<string[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [isSoulDialogOpen, setIsSoulDialogOpen] = useState(false);
  const [helpNeedTargetSoul, setHelpNeedTargetSoul] = useState<Soul | null>(null);
  const [isHelpNeedDialogOpen, setIsHelpNeedDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  
  const [isPrayerCustomizationOpen, setIsPrayerCustomizationOpen] = React.useState(false);
  const [isCommChannelDialogOpen, setIsCommChannelDialogOpen] = React.useState(false);
  const [customPrayerText, setCustomPrayerText] = React.useState('');

  const { userProfile, loading: profileLoading } = useUserProfile();

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'souls'), orderBy("wonAt", "desc"));
  }, [user?.uid, firestore]);
  const { data: souls, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

  const checkPending = useCallback(() => {
    if (typeof window === 'undefined' || !user?.uid) {
        setPendingActions([]);
        return;
    }
    const key = `testify_pending_provisions_${user.uid}`;
    const stored = localStorage.getItem(key);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                setPendingActions(parsed.map((p: any) => p.actionId));
            }
        } catch (e) {
            setPendingActions([]);
        }
    } else {
        setPendingActions([]);
    }
  }, [user?.uid]);

  useEffect(() => {
    setCurrentDate(new Date());
    checkPending();
    window.addEventListener('testify_pending_action_update', checkPending);
    window.addEventListener('storage', checkPending);
    return () => {
        window.removeEventListener('testify_pending_action_update', checkPending);
        window.removeEventListener('storage', checkPending);
    };
  }, [checkPending]);

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

  const performLogging = async (soul: Soul, actionId: string, customNote?: string) => {
      if (!user || !firestore) return;

      const action = actionItems.find(a => a.id === actionId);
      if (!action) return;

      const today = new Date();
      const dateString = format(today, 'yyyy-MM-dd');
      const batch = writeBatch(firestore);

      const isProvisionAction = actionId === 'shared_meal' || actionId === 'gave_gift';

      if (!isProvisionAction) {
          const wasCompleted = completedToday.includes(actionId);
          const newCompleted = wasCompleted ? completedToday : [...completedToday, actionId];

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
          
          setCompletedToday(newCompleted);
      }

      const memberName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || user.displayName || 'Member';
      const logEntry = {
          date: new Date(), 
          note: customNote 
              ? `Logged via Kingdom Connections: ${action.label}. Note: ${customNote}`
              : isProvisionAction 
                  ? `Initiated ${action.label} via Kingdom Connections` 
                  : `Logged via Kingdom Connections: ${action.label}`,
          actions: [actionId],
          memberId: user.uid,
          memberName: memberName,
      };

      const soulUserRef = doc(firestore, `users/${user.uid}/souls`, soul.id);
      const globalSoulRef = doc(firestore, 'souls', soul.id);
      
      const updateData: any = {
          followUpLog: arrayUnion(logEntry),
          lastUpdatedAt: serverTimestamp(),
      };

      if (soul.status === 'New') {
          updateData.status = 'Contacted';
      }

      batch.update(soulUserRef, updateData);
      batch.update(globalSoulRef, updateData);

      try {
          await batch.commit();

          if (isProvisionAction) {
              if (typeof window !== 'undefined') {
                  const key = `testify_pending_provisions_${user.uid}`;
                  const stored = localStorage.getItem(key);
                  let provisions = [];
                  try {
                      provisions = stored ? JSON.parse(stored) : [];
                  } catch (e) { provisions = []; }

                  if (!provisions.some((p: any) => p.soulId === soul.id && p.actionId === actionId)) {
                      provisions.push({
                          soulId: soul.id,
                          soulName: soul.firstName,
                          actionId: actionId,
                          timestamp: Date.now()
                      });
                  }
                  localStorage.setItem(key, JSON.stringify(provisions));
                  window.dispatchEvent(new Event('testify_pending_action_update'));
              }
              const path = actionId === 'shared_meal' ? '/dashboard/marketplace' : '/dashboard/marketplace/gifts';
              router.push(`${path}?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}&actionId=${actionId}`);
              toast({ title: 'Opening Hub...', description: `Finish act of kindness for ${soul.firstName}.` });
          } else {
              toast({ title: 'Kingdom Impact Saved!', description: `Logged '${action.label}' for ${soul.firstName}.` });
          }
      } catch (err: any) {
          const permissionError = new FirestorePermissionError({
              path: `BATCH_WRITE:RELATION_TRACKER:${soul.id}`,
              operation: 'write',
          }, user);
          errorEmitter.emit('permission-error', permissionError);
      }
  };

  const handleHelpNeedConfirm = (note: string) => {
    if (!helpNeedTargetSoul) return;
    setTogglingId('helped_with_need');
    performLogging(helpNeedTargetSoul, 'helped_with_need', note).finally(() => {
        setIsHelpNeedDialogOpen(false);
        setHelpNeedTargetSoul(null);
        setTogglingId(null);
    });
  };

  const handleSoulSelected = async (soul: Soul) => {
    if (!user || !firestore || !selectedActionId) return;
    
    setIsSoulDialogOpen(false);

    if (selectedActionId === 'helped_with_need') {
        setHelpNeedTargetSoul(soul);
        setIsHelpNeedDialogOpen(true);
        return;
    }

    setTogglingId(selectedActionId);
    await performLogging(soul, selectedActionId);
    setTogglingId(null);
  };

  const activeActionLabel = useMemo(() => 
    actionItems.find(a => a.id === selectedActionId)?.label || "Connect with", 
  [selectedActionId]);

  if (authLoading || profileLoading || soulsLoading) {
    return (
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b text-left">
        <CardHeader className="p-4 sm:p-6 text-left">
          <Skeleton className="h-5 w-32 mb-2 text-left" />
          <Skeleton className="h-3 w-48 text-left" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 px-4 sm:px-6 pb-6 text-left">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl text-left" />
          ))}
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

        <CardHeader className="p-4 sm:p-6 pb-4 relative z-10 min-h-[5.5rem] text-left">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between text-left">
              <div className="space-y-1 text-left">
                  <CardTitle className="text-base sm:text-lg font-black font-headline uppercase tracking-tight flex items-center gap-2 text-left">
                      <Sparkles className="h-5 w-5 text-primary text-left" />
                      KINGDOM SOULS FOLLOW-UP
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60 text-left">Daily Relational Efforts</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0 text-left">
                {currentDate && (
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 text-left">
                    {format(currentDate, 'PPPP')}
                  </div>
                )}
              </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-2 relative z-10 text-left">
          <LayoutGroup>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 text-left">
                {actionItems.map(action => {
                    const isPending = pendingActions.includes(action.id);
                    const isCompleted = completedToday.includes(action.id);
                    const Icon = iconMap[action.id] || Heart;
                    const isToggling = togglingId === action.id;
                    
                    const buttonEl = (
                        <motion.div layout whileTap={{ scale: 0.95 }} whileHover={isMobile ? {} : { y: -2 }} className="w-full h-24 text-left">
                            <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                    "relative flex flex-col items-center justify-center gap-2 p-3 h-24 w-full text-center transition-all duration-300 rounded-3xl border-2 overflow-hidden",
                                    isCompleted 
                                        ? "bg-primary/5 border-primary/40 shadow-inner ring-1 ring-primary/10" 
                                        : isPending 
                                          ? "bg-amber-500/[0.05] border-amber-500/40 border-dashed"
                                          : "bg-background/40 hover:bg-muted/50 hover:border-primary/20"
                                )}
                                onClick={() => handleActionClick(action.id)}
                                disabled={isToggling}
                            >
                                <AnimatePresence mode="wait">
                                    {isCompleted && !isToggling && (
                                        <motion.div 
                                            key="completed-icon"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            className="absolute top-2 right-2 bg-primary rounded-full p-0.5 shadow-lg z-20 text-left"
                                        >
                                            <CheckCircle2 className="h-3 w-3 text-primary-foreground fill-current text-left" />
                                        </motion.div>
                                    )}
                                    {isPending && !isCompleted && !isToggling && (
                                        <motion.div 
                                            key="pending-icon"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="absolute top-2 right-2 bg-amber-500 rounded-full p-0.5 shadow-lg z-20 text-left"
                                        >
                                            <Hourglass className="h-3 w-3 text-white text-left" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className={cn(
                                    "h-8 w-8 rounded-2xl flex items-center justify-center transition-all duration-500 relative shrink-0 text-left",
                                    isCompleted ? "bg-primary/20 scale-110 shadow-lg" : isPending ? "bg-amber-500/20" : "bg-muted/30"
                                )}>
                                    {isToggling ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-primary text-left" />
                                    ) : (
                                        <Icon className={cn("h-4 w-4 transition-all text-left", isCompleted ? "text-primary fill-current" : "text-primary/60")} />
                                    )}
                                </div>
                                
                                <div className="space-y-0.5 min-w-0 w-full text-center px-1">
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-tight block truncate text-center",
                                        isCompleted ? "text-primary" : "text-foreground"
                                    )}>
                                        {action.label}
                                    </span>
                                    <div className="h-2.5 flex items-center justify-center text-left">
                                        {isPending && !isCompleted && !isToggling && (
                                            <span className="text-[8px] font-black uppercase text-amber-600/60 leading-none text-left">Pending Hub</span>
                                        )}
                                    </div>
                                </div>
                            </Button>
                        </motion.div>
                    );

                    if (isMobile) return <div key={action.id} className="text-left">{buttonEl}</div>;

                    return (
                        <TooltipProvider key={action.id}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    {buttonEl}
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
          </LayoutGroup>
        </CardContent>
        <CardFooter className="px-4 sm:px-6 pb-6 pt-4 flex flex-col gap-4 border-t mt-4 bg-muted/5 text-left">
              <Button asChild variant="default" className="w-full font-black h-12 rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase text-xs sm:text-sm text-left">
                  <Link href="/dashboard/souls-won">
                      <UserPlus className="mr-2 h-4 w-4 text-left" />
                      MANAGE SOULS WON
                  </Link>
              </Button>
              <p className="text-[8px] text-center text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-40 text-left">
                  Unity • Growth • Love
              </p>
        </CardFooter>
      </Card>

      {isMobile ? (
        <Sheet open={isSoulDialogOpen} onOpenChange={setIsSoulDialogOpen}>
            <SheetContent side="bottom" className="h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                <div className="p-4 sm:p-8 border-b shrink-0 bg-muted/10 text-left">
                    <SheetHeader className="text-left">
                        <SheetTitle className="text-2xl font-black font-headline tracking-tight uppercase text-left">Who did you {activeActionLabel.toLowerCase()}?</SheetTitle>
                        <SheetDescription className="text-sm font-medium text-left">Select a convert to link this action to their record.</SheetDescription>
                    </SheetHeader>
                </div>
                <div className="flex-grow min-h-0 p-4 sm:p-6 text-left">
                    <SoulSelectionList 
                        souls={souls} 
                        onSelect={handleSoulSelected} 
                        isLoading={togglingId !== null} 
                    />
                </div>
            </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isSoulDialogOpen} onOpenChange={setIsSoulDialogOpen}>
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
                <div className="p-8 border-b bg-muted/10 text-left">
                    <DialogHeader className="p-0 text-left">
                        <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-left">Who did you {activeActionLabel.toLowerCase()}?</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-left">Select a convert to link this action to their record.</DialogDescription>
                    </DialogHeader>
                </div>
                <div className="p-6 text-left">
                    <SoulSelectionList 
                        souls={souls} 
                        onSelect={handleSoulSelected} 
                        isLoading={togglingId !== null} 
                    />
                </div>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}

