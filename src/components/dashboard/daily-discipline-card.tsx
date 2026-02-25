'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { isToday } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { Heart, BookOpen, Share2, Megaphone } from 'lucide-react';
import { BibleDialog } from './bible-dialog';
import { PrayerDialog } from './prayer-dialog';
import { useRouter } from 'next/navigation';

const disciplines = [
  { id: 'pray', label: 'Pray', icon: <Heart className="h-5 w-5 text-muted-foreground" /> },
  { id: 'read_bible', label: 'Read the Bible', icon: <BookOpen className="h-5 w-5 text-muted-foreground" /> },
  { id: 'share_testimony', label: 'Share Testimony', icon: <Share2 className="h-5 w-5 text-muted-foreground" /> },
  { id: 'evangelize', label: 'Evangelize', icon: <Megaphone className="h-5 w-5 text-muted-foreground" /> },
];

export function DailyDisciplineCard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [isBibleDialogOpen, setIsBibleDialogOpen] = useState(false);
  const [isPrayerDialogOpen, setIsPrayerDialogOpen] = useState(false);
  const router = useRouter();
  
  const userDocRef = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);
  const { data: userProfile, loading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (userProfile?.dailyDiscipline) {
      const lastUpdatedDate = userProfile.dailyDiscipline.lastUpdated?.toDate();
      if (lastUpdatedDate && isToday(lastUpdatedDate)) {
        setCompletedToday(userProfile.dailyDiscipline.completed || []);
      } else {
        // Reset if it's a new day
        setCompletedToday([]);
      }
    }
  }, [userProfile]);

  const handleDisciplineToggle = async (disciplineId: string) => {
    if (!user || !firestore) return;
    
    const oldCompleted = [...completedToday];
    const wasCompleted = oldCompleted.includes(disciplineId);
    const newCompleted = wasCompleted
      ? oldCompleted.filter(id => id !== disciplineId)
      : [...oldCompleted, disciplineId];
      
    setCompletedToday(newCompleted); // Optimistic update

    const userRef = doc(firestore, 'users', user.uid);
    try {
      await updateDoc(userRef, {
        dailyDiscipline: {
          completed: newCompleted,
          lastUpdated: serverTimestamp(),
        }
      });
    } catch (error) {
      console.error("Failed to update daily discipline:", error);
      // Revert optimistic update on failure
      setCompletedToday(oldCompleted);
    }
  };

  const handleBibleRead = () => {
    if (!completedToday.includes('read_bible')) {
      handleDisciplineToggle('read_bible');
    }
  }

  const handlePray = () => {
    if (!completedToday.includes('pray')) {
      handleDisciplineToggle('pray');
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Discipline</CardTitle>
          <CardDescription>Your spiritual checklist for today.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Daily Discipline</CardTitle>
          <CardDescription>Your spiritual checklist for today.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {disciplines.map(discipline => (
             <div 
              key={discipline.id}
              onClick={(e) => {
                const isCompleted = completedToday.includes(discipline.id);
                if (!isCompleted) {
                  if (discipline.id === 'read_bible') {
                    e.preventDefault();
                    setIsBibleDialogOpen(true);
                  } else if (discipline.id === 'pray') {
                    e.preventDefault();
                    setIsPrayerDialogOpen(true);
                  } else if (discipline.id === 'share_testimony') {
                    e.preventDefault();
                    handleDisciplineToggle(discipline.id);
                    router.push('/dashboard/testimonies');
                  } else if (discipline.id === 'evangelize') {
                    e.preventDefault();
                    handleDisciplineToggle(discipline.id);
                    router.push('/dashboard/campaigns');
                  }
                }
              }}
            >
              <Label 
                htmlFor={discipline.id}
                className="flex flex-col items-center justify-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors data-[state=checked]:bg-accent h-full"
                data-state={completedToday.includes(discipline.id) ? 'checked' : 'unchecked'}
              >
                <Checkbox
                  id={discipline.id}
                  className="sr-only"
                  checked={completedToday.includes(discipline.id)}
                  onCheckedChange={() => handleDisciplineToggle(discipline.id)}
                />
                {discipline.icon}
                <span className="text-sm font-medium text-center">{discipline.label}</span>
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>
       <BibleDialog 
        isOpen={isBibleDialogOpen}
        onOpenChange={setIsBibleDialogOpen}
        onDisciplineCompleted={handleBibleRead}
      />
      <PrayerDialog
        isOpen={isPrayerDialogOpen}
        onOpenChange={setIsPrayerDialogOpen}
        onDisciplineCompleted={handlePray}
      />
    </>
  );
}
