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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Loader2, PlayCircle } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { format, parse } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Label } from '../ui/label';
import { useIsMobile } from '@/hooks/use-mobile';

const formSchema = z.object({
  churchName: z.string().min(2, { message: 'Church name must be at least 2 characters.' }).max(100, { message: 'Church name is too long.' }),
  branch: z.string().max(100, { message: 'Branch name is too long.' }).optional(),
  location: z.string().max(100, { message: 'Location is too long.' }).optional(),
  reason: z.string().max(500, { message: 'Reason is too long.' }).optional(),
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
  const [reason, setReason] = useState('');
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      churchName: '',
      branch: '',
      location: '',
      reason: '',
    },
  });

  const todaysSchedules = userProfile?.churchInfo?.schedule?.filter(s => s.day === format(new Date(), 'EEEE'));
  const hasScheduleForToday = todaysSchedules && todaysSchedules.length > 0;
  
  const scheduleString = (hasScheduleForToday && view === 'confirm') ?
    `Today's schedule: ${todaysSchedules.map(s => format(parse(s.time, 'HH:mm', new Date()), 'p')).join(' / ')}`
    : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      form.reset({
        churchName: userProfile?.lastChurchAttended || '',
        branch: '',
        location: '',
        reason: '',
      });
      setReason('');
    }
  }, [isOpen, userProfile, form, initialView]);

  const performLogAttendance = async (churchName: string, reason?: string, branch?: string, location?: string) => {
    if (!user || !firestore) throw new Error("User or firestore not available");

    const userRef = doc(firestore, 'users', user.uid);
    const historyEntry: any = {
        churchName: churchName,
        attendedAt: new Date(),
        reason: reason || "",
    };
    if (branch) historyEntry.branch = branch;
    if (location) historyEntry.location = location;
    
    const updatePayload = { 
      lastChurchAttended: churchName,
      attendanceHistory: arrayUnion(historyEntry)
    };

    try {
      await updateDoc(userRef, updatePayload);
      onDisciplineCompleted();
    } catch (serverError) {
      const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: updatePayload
      }, user);
      errorEmitter.emit('permission-error', permissionError);
      throw serverError;
    }
  };

  const handleConfirmDefaultChurch = async () => {
    if (!userProfile?.churchInfo?.name) return;
    setIsSubmitting(true);
    try {
      await performLogAttendance(
        userProfile.churchInfo.name, 
        reason,
        userProfile.churchInfo.branch,
        userProfile.churchInfo.location
      );
      toast({ title: 'Attendance Logged!' });
      onOpenChange(false);
    } catch (e) {
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
        await performLogAttendance(values.churchName, values.reason, values.branch, values.location);
        toast({ title: 'Attendance Logged!' });
        onOpenChange(false);
    } catch (e) {
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleJoinStream = async (schedule: { day: string; time: string; url?: string; }) => {
    if (!userProfile?.churchInfo?.name || !schedule.url) return;
    setIsSubmitting(true);
    try {
        await performLogAttendance(
            userProfile.churchInfo.name,
            reason,
            userProfile.churchInfo.branch,
            userProfile.churchInfo.location
        );
        toast({ title: 'Attendance Logged!' });
        window.open(schedule.url, '_blank', 'noopener, noreferrer');
        onOpenChange(false);
    } catch (e) {
    } finally {
        setIsSubmitting(false);
    }
  };

  const attendanceHistory = userProfile?.attendanceHistory ? [...userProfile.attendanceHistory].reverse() : [];

  const dialogTitle = `Log Church Attendance for ${format(new Date(), 'PPP')}`;
  const dialogDesc = view === 'confirm' && userProfile?.churchInfo?.name
    ? 'Confirm your attendance for today.'
    : "Attended a different church? Please provide the details below.";

  const bodyContent = (
    <div className="flex-grow overflow-y-auto pt-4 space-y-4">
        {view === 'confirm' && userProfile?.churchInfo?.name ? (
            <div className="space-y-6">
                <div className="text-center p-6 bg-muted/30 rounded-lg border">
                  <p className="text-muted-foreground text-sm uppercase tracking-widest mb-1">Did you attend</p>
                  <p className="text-2xl font-bold font-headline">{[userProfile.churchInfo.name, userProfile.churchInfo.branch].filter(Boolean).join(', ')}</p>
                  {userProfile.churchInfo.location && <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1"><MapPin className="h-3 w-3"/>{userProfile.churchInfo.location}</p>}
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="confirm-reason">Service Notes (Optional)</Label>
                    <Textarea
                        id="confirm-reason"
                        placeholder="e.g., Guest speaker was present, special service notes..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="text-base"
                    />
                </div>
            </div>
            ) : (
            <Form {...form}>
                <form id="attend-church-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="churchName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Church Name</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., New Life Church" {...field} className="text-base" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="branch"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Branch (Optional)</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Downtown Campus" {...field} value={field.value ?? ''} className="text-base" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Location (Optional)</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Nairobi, Kenya" {...field} value={field.value ?? ''} className="text-base" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Service Notes (Optional)</FormLabel>
                        <FormControl>
                        <Textarea placeholder="e.g., I was visiting a friend and attended their church..." {...field} className="text-base" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </form>
            </Form>
        )}

        {attendanceHistory.length > 0 && (
            <div className="space-y-3 pt-4">
                <Separator />
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Recent Attendance</h4>
                <div className="space-y-3">
                    {attendanceHistory.slice(0, 3).map((item, index) => (
                        <div key={index} className="text-sm p-3 border rounded-lg bg-muted/20">
                            <p className="font-semibold">{item.churchName}</p>
                            {(item.branch || item.location) && (
                                <p className="text-xs text-muted-foreground">
                                    {[item.branch, item.location].filter(Boolean).join(' - ')}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                {item.attendedAt ? format(item.attendedAt.toDate(), "PPP") : 'Date unavailable'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );

  const footerContent = (
    <div className="w-full">
      {view === 'confirm' && userProfile?.churchInfo?.name ? (
        <div className="w-full space-y-3">
            {hasScheduleForToday && todaysSchedules.map((schedule, index) => (
                schedule.url && (
                    <Button key={index} onClick={() => handleJoinStream(schedule)} disabled={isSubmitting} variant="secondary" className="w-full h-12">
                        {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        <PlayCircle className="mr-2 h-5 w-5" />
                        Join Stream ({format(parse(schedule.time, 'HH:mm', new Date()), 'p')})
                    </Button>
                )
            ))}
            <Button onClick={handleConfirmDefaultChurch} disabled={isSubmitting} size="lg" className="w-full h-12 text-lg">
                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                I Attended Physically
            </Button>
            <Button variant="outline" onClick={() => setView('form')} disabled={isSubmitting} className="w-full">
                I Attended Elsewhere
            </Button>
        </div>
        ) : (
        <div className="grid grid-cols-2 gap-3 w-full">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" form="attend-church-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
            </Button>
        </div>
      )}
    </div>
  );

  if (!mounted) return null;

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => { if(!isSubmitting) onOpenChange(open); }}>
        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0">
          <div className="p-6 border-b flex-shrink-0">
            <SheetHeader className="text-left">
              <SheetTitle>{dialogTitle}</SheetTitle>
              <SheetDescription>{dialogDesc}</SheetDescription>
            </SheetHeader>
          </div>
          <ScrollArea className="flex-grow px-6">
            {bodyContent}
          </ScrollArea>
          <div className="p-6 border-t flex-shrink-0">
            {footerContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!isSubmitting) onOpenChange(open); }}>
      <DialogContent className="sm:max-w-xl flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{dialogTitle}</DialogTitle>
           <DialogDescription>{dialogDesc}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow -mx-6 px-6">
            {bodyContent}
        </ScrollArea>
        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          {footerContent}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
