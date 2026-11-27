'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useDoc, useFirestore, useCollection } from '@/firebase';
import { doc, serverTimestamp, writeBatch, collection, query, where, orderBy } from 'firebase/firestore';
import type { UserProfile, Fellowship } from '@/lib/types';
import { isToday, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Zap, 
    BookOpen, 
    Loader2, 
    Church, 
    CheckCircle2, 
    Edit, 
    HeartHandshake, 
    PlusCircle, 
    ChevronDown,
    X
} from 'lucide-react';
import { PrayerDialog } from './prayer-dialog';
import { AttendChurchDialog } from './attend-church-dialog';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn, safeToDate } from '@/lib/utils';
import { NotesDialog } from './notes-dialog';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { LogSoulForm } from '@/components/souls/log-soul-form';
import { useIsMobile } from '@/hooks/use-mobile';

const disciplines = [
  { id: 'pray', label: 'Pray', Icon: Zap, color: 'text-amber-500' },
  { id: 'read_bible', label: 'Read Bible', Icon: BookOpen, color: 'text-blue-500' },
  { id: 'attend_church', label: 'Attend Church', Icon: Church, color: 'text-emerald-500' },
  { id: 'take_notes', label: 'Journal', Icon: Edit, color: 'text-primary' },
];

function PartnerCompactStatus({ partner, date }: { partner: UserProfile['accountabilityPartners'][0]; date: Date }) {
    const firestore = useFirestore();
    const dateStr = useMemo(() => format(date, 'yyyy-MM-dd'), [date]);
    
    const partnerProfileRef = useMemo(() => partner.userId ? doc(firestore, 'users', partner.userId) : null, [firestore, partner.userId]);
    const { data: partnerProfile } = useDoc<UserProfile>(partnerProfileRef);
    const livePhotoURL = partnerProfile?.photoURL || partner.photoURL;

    const disciplineDocRef = useMemo(() => {
        if (!firestore || !partner.userId) return null;
        return doc(firestore, 'users', partner.userId, 'disciplineHistory', dateStr);
    }, [firestore, partner.userId, dateStr]);

    const { data: partnerDiscipline, loading } = useDoc<{ completed?: string[] }>(disciplineDocRef);
    const completedOnDate = partnerDiscipline?.completed || [];

    return (
        <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-transparent hover:border-primary/20 transition-all group text-left">
            <Link href={`/profile/${partner.userId}`} className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity text-left text-left">
                <Avatar className="h-8 w-8 border shadow-sm shrink-0">
                    <AvatarImage src={livePhotoURL} className="object-cover" />
                    <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary text-center flex items-center justify-center h-full w-full">
                        {partner.firstName?.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 text-left">
                    <p className="text-xs font-bold truncate leading-tight group-hover:text-primary transition-colors">{partner.firstName}</p>
                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">Partner</p>
                </div>
            </Link>
            
            <div className="flex gap-1.5 shrink-0 text-left">
                {disciplines.map(d => (
                    <TooltipProvider key={d.id}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={cn(
                                    "h-5 w-5 rounded-full flex items-center justify-center transition-all duration-300",
                                    completedOnDate.includes(d.id) ? "bg-primary text-primary-foreground shadow-sm scale-110" : "bg-muted text-muted-foreground/30"
                                )}>
                                    {completedOnDate.includes(d.id) ? (
                                        <CheckCircle2 className="h-3 w-3 fill-current" />
                                    ) : (
                                        <d.Icon className="h-3 w-3 opacity-40" />
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-[10px] font-bold uppercase tracking-wider">{d.label}: {completedOnDate.includes(d.id) ? 'Completed' : 'Pending'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
            </div>
        </div>
    );
}

export function DailyDisciplineCard() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [isPrayerDialogOpen, setIsPrayerDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [isAttendChurchDialogOpen, setIsAttendChurchDialogOpen] = useState(false);
  const [isLogSoulOpen, setIsLogSoulOpen] = useState(false);
  const [attendChurchDialogView, setAttendChurchDialogView] = useState<'confirm' | 'form'>('form');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  
  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const userDocRef = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const activeFellowshipsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'fellowships'), where('status', '==', 'active'));
  }, [firestore]);
  const { data: fellowships } = useCollection<Fellowship>(activeFellowshipsQuery);

  const loading = userLoading || profileLoading;

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

  const updateDisciplineState = async (disciplineId: string) => {
    if (!user || !firestore) {
        throw new Error("User not authenticated or Firestore not available.");
    }

    const wasCompleted = completedToday.includes(disciplineId);
    const newCompleted = wasCompleted
      ? completedToday.filter((id) => id !== disciplineId)
      : [...completedToday, disciplineId];

    const today = new Date();
    const dateString = format(today, 'yyyy-MM-dd');

    const batch = writeBatch(firestore);

    const userRef = doc(firestore, 'users', user.uid);
    const updateData = {
      dailyDiscipline: {
        completed: newCompleted,
        lastUpdated: serverTimestamp(),
      },
    };
    batch.update(userRef, updateData);

    const historyRef = doc(firestore, 'users', user.uid, 'disciplineHistory', dateString);
    batch.set(historyRef, {
        completed: newCompleted,
        date: serverTimestamp()
    }, { merge: true });

    return batch.commit()
        .then(() => {
            setCompletedToday(newCompleted);
        })
        .catch((serverError) => {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: updateData,
            }, user);
            errorEmitter.emit('permission-error', permissionError);
            throw serverError;
        });
  };

  const handlePray = () => {
    if (!completedToday.includes('pray')) {
      updateDisciplineState('pray').catch(() => {
         toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Your discipline could not be updated.",
        });
      });
    }
  }
  
  const handleNotes = () => {
    if (!completedToday.includes('take_notes')) {
      updateDisciplineState('take_notes').catch(() => {
         toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Your discipline could not be updated.",
        });
      });
    }
  }
  
  const handleAttendChurch = () => {
    if (!completedToday.includes('attend_church')) {
      updateDisciplineState('attend_church').catch(() => {
         toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Your discipline could not be updated.",
        });
      });
    }
  }

  const handleDisciplineClick = async (disciplineId: string) => {
    setTogglingId(disciplineId);
    try {
        if (disciplineId === 'read_bible') {
            let targetUrl = '/bible';
            if (userProfile?.readingHistory?.length) {
              const sortedHistory = [...userProfile.readingHistory].sort((a, b) => {
                const timeA = safeToDate(a.readAt)?.getTime() ?? 0;
                const timeB = safeToDate(b.readAt)?.getTime() ?? 0;
                return timeB - timeA;
              });
              const lastRead = sortedHistory[0];
              if (lastRead) {
                targetUrl = `/bible?book=${encodeURIComponent(lastRead.book)}&chapter=${lastRead.chapter}`;
              }
            }
            router.push(targetUrl);
            return; 
        }
        if (disciplineId === 'pray') {
            setIsPrayerDialogOpen(true);
            return;
        }
        if (disciplineId === 'take_notes') {
            setIsNotesDialogOpen(true);
            return;
        }
        if (disciplineId === 'attend_church') {
            const today = new Date();
            const dayOfWeek = format(today, 'EEEE');
            const isScheduledDay = userProfile?.churchInfo?.schedule?.some(s => s.day === dayOfWeek) ?? false;
            const hasDefaultChurch = !!userProfile?.churchInfo?.name;

            if (isScheduledDay && hasDefaultChurch) {
                setAttendChurchDialogView('confirm');
            } else {
                setAttendChurchDialogView('form');
            }
            
            setIsAttendChurchDialogOpen(true);
            return;
        }
    } catch (e) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not open discipline activity.",
        });
        setTogglingId(null);
    }
  };
  
  useEffect(() => {
    if (!isPrayerDialogOpen && togglingId === 'pray') setTogglingId(null);
    if (!isNotesDialogOpen && togglingId === 'take_notes') setTogglingId(null);
    if (!isAttendChurchDialogOpen && togglingId === 'attend_church') setTogglingId(null);
  }, [isPrayerDialogOpen, isNotesDialogOpen, isAttendChurchDialogOpen, togglingId]);

  const uniquePartners = useMemo(() => {
    const partners = userProfile?.accountabilityPartners || [];
    const uniqueMap = new Map();
    partners.forEach(p => {
        if (p.userId) {
          if (!uniqueMap.has(p.userId) || (!uniqueMap.get(p.userId).photoURL && p.photoURL)) {
            uniqueMap.set(p.userId, p);
          }
        }
    });
    return Array.from(uniqueMap.values());
  }, [userProfile?.accountabilityPartners]);

  if (loading) {
    return (
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b text-left">
        <CardHeader className="p-4 sm:p-6 text-left">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-6 text-left">
            <Skeleton className="h-14 w-full rounded-2xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b text-left">
        <CardHeader className="text-left">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
            <div className="space-y-1 text-left">
              <CardTitle className="text-xl font-semibold tracking-tight text-left">Daily Discipline</CardTitle>
              <CardDescription className="text-sm font-medium text-left">Your spiritual checklist for today.</CardDescription>
            </div>
            {currentDate && (
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 text-left">
                {format(currentDate, 'PPPP')}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-8 text-left text-left">
            <div className="space-y-4 text-left">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 gap-3 group/btn text-left px-4"
                            disabled={togglingId !== null}
                        >
                            {togglingId ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlusCircle className="h-5 w-5 transition-transform group-hover/btn:scale-110" />}
                            <span className="text-[10px] sm:text-sm font-black uppercase tracking-tight">DECLARE DAILY DISCIPLINE</span>
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-[9px] sm:text-[10px] opacity-60 whitespace-nowrap">{completedToday.length}/4 COMPLETED</span>
                                <ChevronDown className="h-4 w-4 opacity-40 shrink-0" />
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[calc(100vw-2rem)] sm:w-[400px] rounded-[2rem] p-2 shadow-2xl border-none text-left" align="center" sideOffset={8}>
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-4 py-3 text-left">Select Discipline</DropdownMenuLabel>
                        <DropdownMenuSeparator className="opacity-50 text-left" />
                        <ScrollArea className="h-80 text-left">
                            <div className="p-1.5 space-y-1 text-left">
                                {disciplines.map(discipline => {
                                    const isCompleted = completedToday.includes(discipline.id);
                                    const { Icon } = discipline;
                                    return (
                                        <DropdownMenuItem 
                                            key={discipline.id} 
                                            onSelect={() => handleDisciplineClick(discipline.id)}
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
                                                {discipline.label}
                                            </span>
                                            {isCompleted && <CheckCircle2 className="h-4 w-4 ml-auto text-primary fill-current text-left" />}
                                        </DropdownMenuItem>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </DropdownMenuContent>
                </DropdownMenu>
                
                <div className="px-1 space-y-1 text-left">
                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 text-left">
                        <span className="text-left">Today's Dedication</span>
                        <span className="text-left">{Math.round((completedToday.length / 4) * 100)}%</span>
                    </div>
                    <Progress value={(completedToday.length / 4) * 100} className="h-1 text-left" />
                </div>
            </div>

            {uniquePartners.length > 0 && currentDate && (
                <div className="space-y-4 text-left text-left">
                    <Separator className="opacity-50 text-left" />
                    <div className="flex items-center justify-between px-1 text-left">
                        <div className="flex items-center gap-2 text-left">
                            <HeartHandshake className="h-4 w-4 text-primary text-left" />
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-left">Partner Activity</h4>
                        </div>
                        <Button variant="ghost" asChild className="h-6 text-[9px] font-bold uppercase tracking-tighter px-2 text-left">
                            <Link href="/accountability" className="text-left">Full View</Link>
                        </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                        {uniquePartners.slice(0, 4).map(partner => (
                            <PartnerCompactStatus key={partner.userId} partner={partner} date={currentDate} />
                        ))}
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
      
      <PrayerDialog
        isOpen={isPrayerDialogOpen}
        onOpenChange={(open) => {
            setIsPrayerDialogOpen(open);
            if (!open) setTogglingId(null);
        }}
        onDisciplineCompleted={handlePray}
        userProfile={userProfile}
        onOpenSouls={() => setIsLogSoulOpen(true)}
        onOpenNotes={() => handleDisciplineClick('take_notes')}
        onOpenChurch={() => handleDisciplineClick('attend_church')}
        onOpenBible={() => handleDisciplineClick('read_bible')}
      />
       <NotesDialog
        isOpen={isNotesDialogOpen}
        onOpenChange={(open) => {
            setIsNotesDialogOpen(open);
            if (!open) setTogglingId(null);
        }}
        onDisciplineCompleted={handleNotes}
        userProfile={userProfile}
      />
      <AttendChurchDialog
        isOpen={isAttendChurchDialogOpen}
        onOpenChange={(open) => {
            setIsAttendChurchDialogOpen(open);
            if (!open) setTogglingId(null);
        }}
        onDisciplineCompleted={handleAttendChurch}
        userProfile={userProfile}
        initialView={attendChurchDialogView}
      />

      <Drawer open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
        <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left flex items-center justify-between gap-4">
                <DrawerHeader className="text-left flex-shrink-0 p-0 text-left">
                    <DrawerTitle className="text-2xl font-black font-headline text-left">Log Harvest</DrawerTitle>
                    <DrawerDescription className="text-sm font-medium mt-1 text-left">Record a new life won for Christ.</DrawerDescription>
                </DrawerHeader>
                <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background text-left" onClick={() => setIsLogSoulOpen(false)}>
                    <X className="h-5 w-5 text-left" />
                </Button>
            </div>
            <ScrollArea className="flex-1 min-h-0 p-8 text-left">
                <LogSoulForm onSoulLogged={() => setIsLogSoulOpen(false)} fellowships={fellowships || []} campaigns={[]} />
            </ScrollArea>
        </DrawerContent>
      </Drawer>
    </>
  );
}
