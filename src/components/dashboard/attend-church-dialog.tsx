
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Loader2, PlayCircle } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { format, parse } from 'date-fns';
import { FirestorePermissionError, errorEmitter } from '@/firebase/errors';

const formSchema = z.object({
  churchName: z.string().min(2, { message: 'Church name must be at least 2 characters.' }).max(100, { message: 'Church name is too long.' }),
});

interface AttendChurchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDisciplineCompleted: () => void;
  userProfile: UserProfile | null;
  initialView: 'confirm' | 'form';
}

export function AttendChurchDialog({ isOpen, onOpenChange, onDisciplineCompleted, userProfile, initialView }: AttendChurchDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<'confirm' | 'form'>(initialView);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      churchName: '',
    },
  });

  const todaysSchedules = userProfile?.churchInfo?.schedule?.filter(s => s.day === format(new Date(), 'EEEE'));
  const hasScheduleForToday = todaysSchedules && todaysSchedules.length > 0;
  
  const scheduleString = (hasScheduleForToday && view === 'confirm') ?
    `Today's schedule: ${todaysSchedules.map(s => format(parse(s.time, 'HH:mm', new Date()), 'p')).join(' / ')}`
    : null;


  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      form.reset({
        churchName: userProfile?.churchInfo?.name || userProfile?.lastChurchAttended || '',
      });
    }
  }, [isOpen, userProfile, form, initialView]);

  const logAttendance = (churchName: string) => {
    if (!user || !firestore) return Promise.reject(new Error("User or firestore not available"));
    setIsSubmitting(true);
    
    const userRef = doc(firestore, 'users', user.uid);
    const updatePayload = { 
      lastChurchAttended: churchName,
      attendanceHistory: arrayUnion({
          churchName: churchName,
          attendedAt: new Date(),
      })
    };

    return updateDoc(userRef, updatePayload)
      .then(() => {
        onDisciplineCompleted();
        toast({
          title: 'Attendance Logged!',
          description: `Great job attending ${churchName} today.`,
        });
        onOpenChange(false);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: updatePayload
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsSubmitting(false); // only set to false on error, success closes dialog
        throw serverError; // re-throw to be caught by the caller
      });
  };

  const handleConfirmDefaultChurch = () => {
    if (!userProfile?.churchInfo?.name) return;
    logAttendance(userProfile.churchInfo.name).catch(() => {});
  };
  
  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    logAttendance(values.churchName).catch(() => {});
  };
  
  const handleJoinStream = (schedule: { day: string; time: string; url?: string; }) => {
    if (!userProfile?.churchInfo?.name || !schedule.url) return;
    logAttendance(userProfile.churchInfo.name)
        .then(() => {
            window.open(schedule.url, '_blank', 'noopener, noreferrer');
        })
        .catch(() => {
            // Error is handled/toasted inside logAttendance
        });
  };

  const attendanceHistory = userProfile?.attendanceHistory ? [...userProfile.attendanceHistory].reverse() : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!isSubmitting) onOpenChange(open); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Church Attendance for {format(new Date(), 'PPP')}</DialogTitle>
           <DialogDescription>
            {view === 'confirm' && userProfile?.churchInfo?.name
              ? 'Confirm your attendance for today.'
              : "That's great! Which church did you attend today?"}
          </DialogDescription>
            {scheduleString && (
                <div className="mt-2 text-xs text-muted-foreground">
                    {scheduleString}
                </div>
            )}
            {view === 'form' && !hasScheduleForToday && userProfile?.churchInfo?.schedule && userProfile.churchInfo.schedule.length > 0 && (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-500 rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
                    Note: Today is not one of your scheduled worship days. You can still log your attendance.
                </div>
            )}
        </DialogHeader>

        {view === 'confirm' && userProfile?.churchInfo?.name ? (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-muted-foreground">Did you attend</p>
              <p className="text-2xl font-semibold font-headline">{userProfile.churchInfo.name}?</p>
            </div>
            
            {hasScheduleForToday && todaysSchedules.map((schedule, index) => (
                schedule.url && (
                    <Button key={index} onClick={() => handleJoinStream(schedule)} disabled={isSubmitting} variant="secondary" className="w-full">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Join Stream ({format(parse(schedule.time, 'HH:mm', new Date()), 'p')})
                    </Button>
                )
            ))}

            <div className="flex flex-col gap-2">
              <Button onClick={handleConfirmDefaultChurch} disabled={isSubmitting} size="lg">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, I Attended Physically
              </Button>
              <Button variant="outline" onClick={() => setView('form')} disabled={isSubmitting}>
                I Attended a Different Church
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
              <FormField
                control={form.control}
                name="churchName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Church Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., New Life Church" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Attendance
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
        
        {attendanceHistory.length > 0 && (
            <>
                <Separator className="my-4" />
                <div className="space-y-2">
                    <h4 className="font-medium text-sm">Recent Attendance</h4>
                    <ScrollArea className="h-32 w-full rounded-md border p-2">
                        <div className="space-y-3">
                            {attendanceHistory.map((item, index) => (
                                <div key={index} className="text-sm">
                                    <p className="font-semibold">{item.churchName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {item.attendedAt ? format(item.attendedAt.toDate(), "PPP") : 'Date unavailable'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}
