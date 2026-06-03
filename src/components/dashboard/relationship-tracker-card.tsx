'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { isToday, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MessageSquare, Flame, Users, CheckCircle2, Loader2, Sparkles, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const relations = [
  { 
    id: 'rel_nurture', 
    label: 'Nurture', 
    Icon: Heart, 
    color: 'text-red-500', 
    desc: 'Convert Check',
    tip: 'Ask about their week and if they have any prayer points.'
  },
  { 
    id: 'rel_encourage', 
    label: 'Encourage', 
    Icon: MessageSquare, 
    color: 'text-blue-500', 
    desc: 'Speak Life',
    tip: 'Send a scripture or a word of life to a brother or sister.'
  },
  { 
    id: 'rel_outreach', 
    label: 'Outreach', 
    Icon: Flame, 
    color: 'text-orange-500', 
    desc: 'Share Gospel',
    tip: 'Share your testimony or the Gospel with a stranger today.'
  },
  { 
    id: 'rel_sync', 
    label: 'Sync Up', 
    Icon: Users, 
    color: 'text-purple-500', 
    desc: 'Partner Meet',
    tip: 'Connect with your accountability partner for a quick check-in.'
  },
];

export function RelationshipTrackerCard() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const userDocRef = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);
  
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

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

  const toggleRelation = async (id: string) => {
    if (!user || !firestore) return;
    setTogglingId(id);

    const wasCompleted = completedToday.includes(id);
    const newCompleted = wasCompleted
      ? completedToday.filter((itemId) => itemId !== id)
      : [...completedToday, id];

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

    try {
        await batch.commit();
        setCompletedToday(newCompleted);
        if (!wasCompleted) {
            toast({ 
              title: 'Kingdom Connection Logged!',
              description: 'God is glorified in our unity.'
            });
        }
    } catch (err: any) {
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: updateData,
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setTogglingId(null);
    }
  };

  if (userLoading || profileLoading) {
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
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b overflow-hidden relative group/card">
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover/card:opacity-[0.05] transition-opacity">
        <Users className="h-32 w-32 text-primary rotate-12" />
      </div>

      <CardHeader className="p-4 sm:p-6 pb-4 relative z-10">
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg font-black font-headline uppercase tracking-tight flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Kingdom Connections
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60">Nurturing the Body of Christ</CardDescription>
            </div>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-40 hover:opacity-100">
                            <Info className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[200px] rounded-xl p-3 border-primary/20 shadow-xl">
                        <p className="text-[10px] font-bold uppercase leading-relaxed text-center">
                            Track your relational impact.<br/>
                            <span className="text-primary">Unity is our strength.</span>
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-6 pb-6 relative z-10">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {relations.map(rel => {
                const isCompleted = completedToday.includes(rel.id);
                const { Icon, color } = rel;
                return (
                    <TooltipProvider key={rel.id}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <motion.div whileTap={{ scale: 0.95 }} whileHover={{ y: -2 }}>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "relative flex flex-col items-center justify-center gap-2 p-3 h-24 w-full text-center transition-all duration-500 rounded-3xl border-2 overflow-hidden",
                                            isCompleted 
                                                ? "bg-primary/[0.03] border-primary/40 shadow-inner ring-1 ring-primary/10" 
                                                : "bg-background/40 hover:bg-muted/50 hover:border-primary/30"
                                        )}
                                        onClick={() => toggleRelation(rel.id)}
                                        disabled={togglingId === rel.id}
                                    >
                                        <AnimatePresence>
                                            {isCompleted && togglingId !== rel.id && (
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

                                        {togglingId === rel.id ? (
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        ) : (
                                            <>
                                                <div className={cn(
                                                    "h-8 w-8 rounded-2xl flex items-center justify-center transition-all duration-500",
                                                    isCompleted ? "bg-primary/20 scale-110 shadow-lg" : "bg-muted/30"
                                                )}>
                                                    <Icon className={cn("h-5 w-5 transition-all", isCompleted ? "text-primary fill-current" : color)} />
                                                </div>
                                                <div className="space-y-0.5 min-w-0 w-full">
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-tight block truncate",
                                                        isCompleted ? "text-primary" : "text-foreground"
                                                    )}>
                                                        {rel.label}
                                                    </span>
                                                    <span className="text-[8px] text-muted-foreground uppercase font-black opacity-60 leading-none block truncate tracking-tighter">
                                                        {rel.desc}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </Button>
                                </motion.div>
                            </TooltipTrigger>
                            <TooltipContent className="rounded-xl border-primary/20 shadow-xl" side="bottom">
                                <p className="text-[10px] font-bold uppercase text-primary mb-1">Kingdom Tip</p>
                                <p className="text-xs font-medium max-w-[150px] leading-relaxed italic">{rel.tip}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            })}
        </div>
        <p className="text-[8px] text-center text-muted-foreground mt-4 font-bold uppercase tracking-[0.2em] opacity-40">
            Unity • Growth • Love
        </p>
      </CardContent>
    </Card>
  );
}
