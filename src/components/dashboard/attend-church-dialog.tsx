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
} from '@/components/ui/sheet';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Loader2, PlayCircle, MapPin } from 'lucide-react';
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

  const dialogTitle = `Log Church Attendance`;
  const dialogDesc = `For ${format(new Date(), 'PPP')}`;

  const bodyContent = (
    <div className="pt-4 space-y-4">
        {view === 'confirm' && userProfile?.churchInfo?.name ? (
            <div className="space-y-6">
                <div className="text-center p-8 bg-muted/30 rounded-3xl border border-dashed">
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] font-bold mb-2">Did you attend</p>
                  <p className="text-2xl font-black font-headline leading-tight">{[userProfile.churchInfo.name, userProfile.churchInfo.branch].filter(Boolean).join(', ')}</p>
                  {userProfile.churchInfo.location && <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1.5 font-medium"><MapPin className="h-3.5 w-3.5 text-primary"/>{userProfile.churchInfo.location}</p>}
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="confirm-reason" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Service Notes (Optional)</Label>
                    <Textarea
                        id="confirm-reason"
                        placeholder="e.g., The sermon was about the Great Commission..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="text-base min-h-[100px] rounded-2xl"
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
                        <Input placeholder="e.g., New Life Church" {...field} className="text-base h-11" />
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
                        <Input placeholder="e.g., Downtown Campus" {...field} value={field.value ?? ''} className="text-base h-11" />
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
                        <Input placeholder="e.g., Nairobi, Kenya" {...field} value={field.value ?? ''} className="text-base h-11" />
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
                        <Textarea placeholder="e.g., Visited a local branch today..." {...field} className="text-base min-h-[100px]" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </form>
            </Form>
        )}

        {attendanceHistory.length > 0 && (
            <div className="space-y-4 pt-6">
                <Separator />
                <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-[0.2em] ml-1">Recent Attendance</h4>
                <div className="space-y-3">
                    {attendanceHistory.slice(0, 3).map((item, index) => (
                        <div key={index} className="p-4 border rounded-2xl bg-muted/20">
                            <p className="font-bold text-sm">{item.churchName}</p>
                            {(item.branch || item.location) && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {[item.branch, item.location].filter(Boolean).join(' • ')}
                                </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-2 font-medium uppercase tracking-wider">
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
                    <Button key={index} onClick={() => handleJoinStream(schedule)} disabled={isSubmitting} variant="secondary" className="w-full h-12 font-bold rounded-2xl">
                        {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        <PlayCircle className="mr-2 h-5 w-5" />
                        Gather Online ({format(parse(schedule.time, 'HH:mm', new Date()), 'p')})
                    </Button>
                )
            ))}
            <Button onClick={handleConfirmDefaultChurch} disabled={isSubmitting} size="lg" className="w-full h-12 text-lg font-black rounded-2xl shadow-lg">
                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                CONFIRM ATTENDANCE
            </Button>
            <Button variant="outline" onClick={() => setView('form')} disabled={isSubmitting} className="w-full h-11 font-bold rounded-2xl">
                Attended Elsewhere
            </Button>
        </div>
        ) : (
        <div className="grid grid-cols-2 gap-3 w-full">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="h-12 rounded-2xl">Cancel</Button>
            <Button type="submit" form="attend-church-form" disabled={isSubmitting} className="h-12 rounded-2xl font-bold">
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
        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
          <div className="p-8 border-b flex-shrink-0 bg-muted/10">
            <SheetHeader className="text-left">
              <SheetTitle className="text-2xl font-black font-headline">{dialogTitle}</SheetTitle>
              <SheetDescription className="text-sm font-medium">{dialogDesc}</SheetDescription>
            </SheetHeader>
          </div>
          <ScrollArea className="flex-grow px-8">
            {bodyContent}
          </ScrollArea>
          <div className="p-8 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm">
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
            <div className="py-6">
                {bodyContent}
            </div>
        </ScrollArea>
        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          {footerContent}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
