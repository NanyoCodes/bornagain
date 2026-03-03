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
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { format } from 'date-fns';

const formSchema = z.object({
  churchName: z.string().min(2, { message: 'Church name must be at least 2 characters.' }).max(100, { message: 'Church name is too long.' }),
});

interface AttendChurchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDisciplineCompleted: () => void;
  userProfile: UserProfile | null;
}

export function AttendChurchDialog({ isOpen, onOpenChange, onDisciplineCompleted, userProfile }: AttendChurchDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<'confirm' | 'form'>('form');
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      churchName: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      const hasDefaultChurch = !!userProfile?.churchInfo?.name;
      setView(hasDefaultChurch ? 'confirm' : 'form');
      form.reset({
        churchName: userProfile?.churchInfo?.name || userProfile?.lastChurchAttended || '',
      });
    }
  }, [isOpen, userProfile, form]);

  const logAttendance = async (churchName: string) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, { 
        lastChurchAttended: churchName,
        attendanceHistory: arrayUnion({
            churchName: churchName,
            attendedAt: new Date(),
        })
      });
      
      onDisciplineCompleted();
      toast({
        title: 'Attendance Logged!',
        description: `Great job attending ${churchName} today.`,
      });
      onOpenChange(false);
    } catch (error) {
        console.error('Failed to update church attendance:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not save church attendance. Please try again.',
        });
        setIsSubmitting(false); // only set to false on error, success closes dialog
        throw error; // re-throw to be caught by the caller
    }
    // No finally block, as we want loading to persist until dialog closes on success
  };

  const handleConfirmDefaultChurch = async () => {
    if (!userProfile?.churchInfo?.name) return;
    await logAttendance(userProfile.churchInfo.name).catch(() => {});
  };
  
  const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
    await logAttendance(values.churchName).catch(() => {});
  };
  
  const attendanceHistory = userProfile?.attendanceHistory ? [...userProfile.attendanceHistory].reverse() : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!isSubmitting) onOpenChange(open); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Church Attendance</DialogTitle>
          <DialogDescription>
            {view === 'confirm' && userProfile?.churchInfo?.name
              ? 'Confirm your attendance for today.'
              : "That's great! Which church did you attend today?"}
          </DialogDescription>
        </DialogHeader>

        {view === 'confirm' && userProfile?.churchInfo?.name ? (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <p className="text-muted-foreground">Did you attend</p>
              <p className="text-2xl font-semibold font-headline">{userProfile.churchInfo.name}?</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleConfirmDefaultChurch} disabled={isSubmitting} size="lg">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, I Attended
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
