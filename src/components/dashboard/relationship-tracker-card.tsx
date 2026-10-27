'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { doc, serverTimestamp, writeBatch, arrayUnion, query, collection, orderBy } from 'firebase/firestore';
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
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { cn, safeToDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { actionItems } from '@/lib/follow-up-data';
import Link from 'next/link';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';

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

    const header = (
        <div className="p-8 border-b bg-muted/10 text-left">
            <DialogHeader className="text-left">
                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Select Recipient</DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-left">Who did you {actionLabel.toLowerCase()}?</DialogDescription>
                {isMobile && (
                    <div className="flex items-center gap-2 mt-4 opacity-40 text-left">
                        <ChevronDown className="h-3 w-3 animate-bounce" />
                        <span className="text-[8px] font-bold uppercase tracking-widest text-left">Swipe down to close</span>
                    </div>
                )}
            </DialogHeader>
        </div>
    );

    const body = (
        <div className="p-6 space-y-6 text-left">
            <div className="relative text-left">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                <Input 
                    placeholder="Search by name..." 
                    value={search} 
                    onChange={e => setSearchTerm(e.target.value)}
                    className="rounded-2xl h-12 pl-10 bg-muted/20 border-none shadow-inner text-base"
                />
            </div>
            <ScrollArea className="h-[40vh] border rounded-3xl bg-muted/5 text-left text-left">
                <div className="p-2 space-y-1.5 text-left">
                    {filteredSouls.length > 0 ? (
                        filteredSouls.map(soul => (
                            <Button 
                                key={soul.id} 
                                variant="ghost" 
                                className="w-full justify-start h-16 px-4 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all gap-4 group flex items-center border border-transparent text-left"
                                onClick={() => onSelect(soul)}
                                disabled={isLoading}
                            >
                                <Avatar className="h-10 w-10 border-2 group-hover:border-primary/20 transition-colors shadow-sm text-left">
                                    <AvatarFallback className="font-black bg-primary/5 text-primary text-xs flex items-center justify-center h-full w-full"> {soul.firstName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="text-left min-w-0 flex-1">
                                    <p className="font-black text-sm truncate uppercase tracking-tight leading-tight">{soul.firstName} {soul.lastName}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{soul.status}</p>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-muted/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <PlusCircle className="h-4 w-4" />
                                </div>
                            </Button>
                        ))
                    ) : (
                        <div className="text-center py-16 px-8 space-y-3 text-left text-left">
                            <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto text-left">
                                <Users className="h-6 w-6 text-muted-foreground opacity-20 text-left" />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60 text-center text-left">
                                {search ? "No matches found" : "Log your first soul to begin tracking"}
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onOpenChange}>
                <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
                    {header}
                    <div className="flex-grow overflow-hidden text-left text-left">{body}</div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left">
                {header}
                {body}
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
    setTogglingId(selectedActionId);

    const action = actionItems.find(a => a.id === selectedActionId);
    if (!action) return;

    const today = new Date();
    const dateString = format(today, 'yyyy-MM-dd');
    const batch = writeBatch(firestore);

    // 1. Update user's daily discipline (habit tracking)
    const wasCompleted = completedToday.includes(selectedActionId);
    const newCompleted = wasCompleted ? completedToday : [...completedToday, selectedActionId];

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

    // 2. Update soul's history
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
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b text-left text-left text-left">
        <CardHeader className="p-4 sm:p-6 text-left text-left">
          <Skeleton className="h-5 w-32 mb-2 text-left" />
          <Skeleton className="h-3 w-48 text-left" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-6 text-left text-left text-left text-left">
            <Skeleton className="h-14 w-full rounded-2xl text-left" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b overflow-hidden relative group/card text-left text-left text-left text-left">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover/card:opacity-[0.05] transition-opacity text-left text-left">
          <Users className="h-32 w-32 text-primary rotate-12 text-left" />
        </div>

        <CardHeader className="p-4 sm:p-6 pb-4 relative z-10 text-left text-left text-left text-left">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between text-left text-left text-left">
            <div className="space-y-1 text-left text-left text-left">
              <CardTitle className="text-base sm:text-lg font-black font-headline uppercase tracking-tight flex items-center gap-2 text-left text-left text-left">
                  <Sparkles className="h-5 w-5 text-primary text-left" />
                  Kingdom Connections
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60 text-left text-left text-left">Daily Relational Efforts</CardDescription>
            </div>
            {currentDate && (
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 text-left text-left text-left">
                {format(currentDate, 'PPPP')}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-6 relative z-10 text-left text-left text-left text-left">
            <div className="space-y-4 text-left text-left text-left">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest sm:tracking-[0.2em] shadow-xl shadow-primary/20 gap-3 group/btn text-left px-4"
                            disabled={togglingId !== null}
                        >
                            {togglingId ? <Loader2 className="h-5 w-5 animate-spin text-left" /> : <PlusCircle className="h-5 w-5 transition-transform group-hover/btn:scale-110 text-left" />}
                            RECORD KINGDOM CONNECTION
                            <ChevronDown className="h-4 w-4 ml-auto opacity-40 text-left" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[calc(100vw-2rem)] sm:w-[400px] rounded-[2rem] p-2 shadow-2xl border-none text-left text-left text-left" align="center" sideOffset={8}>
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-4 py-3 text-left text-left">Select Action</DropdownMenuLabel>
                        <DropdownMenuSeparator className="opacity-50 text-left text-left" />
                        <ScrollArea className="h-80 text-left text-left">
                            <div className="p-1.5 space-y-1 text-left text-left">
                                {actionItems.map(action => {
                                    const Icon = iconMap[action.id] || Heart;
                                    const isCompleted = completedToday.includes(action.id);
                                    return (
                                        <DropdownMenuItem 
                                            key={action.id} 
                                            onSelect={() => handleActionClick(action.id)}
                                            className={cn(
                                                "rounded-xl h-14 gap-4 cursor-pointer transition-all px-4 text-left",
                                                isCompleted ? "bg-primary/5 text-primary" : "hover:bg-muted/50"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border text-left",
                                                isCompleted ? "bg-primary/10 border-primary/20" : "bg-muted/50 border-transparent"
                                            )}>
                                                <Icon className={cn("h-4 w-4 text-left", isCompleted ? "text-primary" : "text-muted-foreground")} />
                                            </div>
                                            <span className={cn("text-xs font-black uppercase tracking-tight text-left", isCompleted ? "text-primary" : "text-foreground")}>
                                                {action.label}
                                            </span>
                                            {isCompleted && <CheckCircle2 className="h-4 w-4 ml-auto text-primary fill-current text-left" />}
                                        </DropdownMenuItem>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </DropdownMenuContent>
                </DropdownMenu>
                
                <div className="flex flex-wrap gap-2 text-left text-left">
                    {actionItems.filter(a => completedToday.includes(a.id)).map(action => (
                         <Badge key={action.id} variant="secondary" className="h-7 rounded-lg bg-primary/10 text-primary border-primary/20 gap-1.5 font-bold uppercase text-[9px] tracking-tight text-left">
                            <CheckCircle2 className="h-3 w-3 fill-current text-left" />
                            {action.label}
                         </Badge>
                    ))}
                    {completedToday.length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic font-medium px-1 text-left">No connections recorded yet today.</p>
                    )}
                </div>
            </div>
        </CardContent>
        <CardFooter className="px-4 sm:px-6 pb-6 pt-4 flex flex-col gap-4 border-t mt-4 bg-muted/5 text-left text-left text-left text-left text-left">
              <Button asChild variant="ghost" className="w-full font-black h-12 rounded-2xl border-2 border-dashed border-primary/20 text-primary hover:bg-primary/5 tracking-widest uppercase text-xs sm:text-sm text-center text-left text-left">
                  <Link href="/souls-won" className="text-center text-left text-left text-left text-left">
                      <UserPlus className="mr-2 h-4 w-4 text-left text-left" />
                      MANAGE SOULS WON
                  </Link>
              </Button>
              <p className="text-[8px] text-center text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-40 w-full text-center text-left text-left">
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