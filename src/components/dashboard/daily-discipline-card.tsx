
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { isToday, format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { Zap, BookOpen, Loader2, Church, CheckCircle2, Edit, HeartHandshake } from 'lucide-react';
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

const disciplines = [
  { id: 'pray', label: 'Pray', Icon: Zap, color: 'text-chart-5' },
  { id: 'read_bible', label: 'Read Bible', Icon: BookOpen, color: 'text-chart-2' },
  { id: 'attend_church', label: 'Attend Church', Icon: Church, color: 'text-chart-4' },
  { id: 'take_notes', label: 'Take Notes', Icon: Edit, color: 'text-chart-1' },
];

function PartnerCompactStatus({ partner, date }: { partner: UserProfile['accountabilityPartners'][0]; date: Date }) {
    const firestore = useFirestore();
    const dateStr = useMemo(() => format(date, 'yyyy-MM-dd'), [date]);
    
    // Live profile lookup for reactive photo updates
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
        <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-transparent hover:border-primary/20 transition-all group">
            <Link href={`/dashboard/profile/${partner.userId}`} className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity">
                <Avatar className="h-8 w-8 border shadow-sm shrink-0">
                    <AvatarImage src={livePhotoURL} className="object-cover" />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">{partner.firstName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <p className="text-xs font-bold truncate leading-tight group-hover:text-primary transition-colors">{partner.firstName}</p>
                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">Partner</p>
                </div>
            </Link>
            
            <div className="flex gap-1.5 shrink-0">
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
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [isPrayerDialogOpen, setIsPrayerDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [isAttendChurchDialogOpen, setIsAttendChurchDialogOpen] = useState(false);
  const [attendChurchDialogView, setAttendChurchDialogView] = useState<'confirm' | 'form'>('form');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const router = useRouter();
  
  const userDocRef = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const loading = userLoading || profileLoading;

  useEffect(() => {
    if (userProfile?.dailyDiscipline) {
      const lastUpdatedDate = userProfile.dailyDiscipline.lastUpdated?.toDate();
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
            let targetUrl = '/dashboard/bible';
            if (userProfile?.readingHistory?.length) {
              const sortedHistory = [...userProfile.readingHistory].sort((a, b) => {
                const timeA = safeToDate(a.readAt)?.getTime() ?? 0;
                const timeB = safeToDate(b.readAt)?.getTime() ?? 0;
                return timeB - timeA;
              });
              const lastRead = sortedHistory[0];
              if (lastRead) {
                targetUrl = `/dashboard/bible?book=${encodeURIComponent(lastRead.book)}&chapter=${lastRead.chapter}`;
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
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">Daily Discipline</CardTitle>
          <CardDescription className="text-sm font-medium">Your spiritual checklist for today.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b">
        <CardHeader>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold tracking-tight">Daily Discipline</CardTitle>
              <CardDescription className="text-sm font-medium">Your spiritual checklist for today.</CardDescription>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              {format(new Date(), 'PPPP')}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {disciplines.map(discipline => {
                const isCompleted = completedToday.includes(discipline.id);
                const { Icon, color } = discipline;
                return (
                    <Button
                        key={discipline.id}
                        variant="outline"
                        className={cn(
                            "relative flex flex-col items-center justify-center gap-3 p-4 h-28 text-center transition-all duration-300 rounded-3xl border-2",
                            isCompleted ? "bg-primary/5 border-primary/30 shadow-inner" : "hover:bg-muted/50 hover:border-primary/20 hover:-translate-y-1"
                        )}
                        onClick={() => handleDisciplineClick(discipline.id)}
                        disabled={togglingId === discipline.id}
                    >
                    {isCompleted && togglingId !== discipline.id && (
                        <div className="absolute top-3 right-3 bg-primary rounded-full p-0.5 shadow-lg animate-in zoom-in">
                            <CheckCircle2 className="h-4 w-4 text-primary-foreground fill-current" />
                        </div>
                    )}
                        {togglingId === discipline.id ? (
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        ) : (
                            <>
                                <Icon className={cn("h-8 w-8 transition-transform duration-300 group-hover:scale-110", isCompleted ? "text-primary fill-current opacity-40" : color)} />
                                <span className={cn("text-xs font-semibold", isCompleted ? "text-primary" : "text-foreground")}>{discipline.label}</span>
                            </>
                        )}
                    </Button>
                )
            })}
            </div>

            {uniquePartners.length > 0 && (
                <div className="space-y-4">
                    <Separator className="opacity-50" />
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <HeartHandshake className="h-4 w-4 text-primary" />
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.3em]">Partner Activity</h4>
                        </div>
                        <Button variant="ghost" asChild className="h-6 text-[9px] font-bold uppercase tracking-tighter px-2">
                            <Link href="/dashboard/accountability">Full View</Link>
                        </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {uniquePartners.slice(0, 4).map(partner => (
                            <PartnerCompactStatus key={partner.userId} partner={partner} date={new Date()} />
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
    </>
  );
}
