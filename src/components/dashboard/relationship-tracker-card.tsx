'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { isToday, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MessageSquare, Flame, Users, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';

const relations = [
  { id: 'rel_nurture', label: 'Nurture', Icon: Heart, color: 'text-red-500', desc: 'Checked on a convert' },
  { id: 'rel_encourage', label: 'Encourage', Icon: MessageSquare, color: 'text-blue-500', desc: 'Spoke a word of life' },
  { id: 'rel_outreach', label: 'Outreach', Icon: Flame, color: 'text-orange-500', desc: 'Shared the Gospel' },
  { id: 'rel_sync', label: 'Sync Up', Icon: Users, color: 'text-purple-500', desc: 'Met with partner' },
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
            toast({ title: 'Kingdom Connection Logged!' });
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
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b">
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold tracking-tight">Relationship Tracker</CardTitle>
          <CardDescription className="text-sm font-medium">Nurture the harvest through consistent connection.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relations.map(rel => {
                const isCompleted = completedToday.includes(rel.id);
                const { Icon, color } = rel;
                return (
                    <Button
                        key={rel.id}
                        variant="outline"
                        className={cn(
                            "relative flex flex-col items-center justify-center gap-3 p-4 h-24 text-center transition-all duration-300 rounded-3xl border-2 group",
                            isCompleted ? "bg-primary/5 border-primary/30 shadow-inner" : "hover:bg-muted/50 hover:border-primary/20 hover:-translate-y-1"
                        )}
                        onClick={() => toggleRelation(rel.id)}
                        disabled={togglingId === rel.id}
                    >
                        {isCompleted && togglingId !== rel.id && (
                            <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5 shadow-lg animate-in zoom-in">
                                <CheckCircle2 className="h-3 w-3 text-primary-foreground fill-current" />
                            </div>
                        )}
                        {togglingId === rel.id ? (
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        ) : (
                            <>
                                <Icon className={cn("h-6 w-6 transition-transform group-hover:scale-110", isCompleted ? "text-primary fill-current opacity-40" : color)} />
                                <div className="space-y-0.5">
                                  <span className={cn("text-[10px] font-black uppercase tracking-widest block", isCompleted ? "text-primary" : "text-foreground")}>{rel.label}</span>
                                  <span className="text-[8px] text-muted-foreground uppercase font-medium opacity-60 leading-none block">{rel.desc}</span>
                                </div>
                            </>
                        )}
                    </Button>
                );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
