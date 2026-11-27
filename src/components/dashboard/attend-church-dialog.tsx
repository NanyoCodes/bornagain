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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
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
    <div className="pt-4 space-y-4 text-left">
        {view === 'confirm' && userProfile?.churchInfo?.name ? (
            <div className="space-y-6 text-left">
                <div className="text-center p-8 bg-muted/30 rounded-3xl border border-dashed text-left">
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] font-bold mb-2 text-center text-left">Did you attend</p>
                  <p className="text-2xl font-black font-headline leading-tight text-center text-left">{[userProfile.churchInfo.name, userProfile.churchInfo.branch].filter(Boolean).join(', ')}</p>
                  {userProfile.churchInfo.location && <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1.5 font-medium text-center text-left"><MapPin className="h-3.5 w-3.5 text-primary text-left"/>{userProfile.churchInfo.location}</p>}
                </div>
                
                <div className="space-y-2 text-left">
                    <Label htmlFor="confirm-reason" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 text-left">Service Notes (Optional)</Label>
                    <Textarea
                        id="confirm-reason"
                        placeholder="e.g., The sermon was about the Great Commission..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="text-base min-h-[100px] rounded-2xl text-left"
                    />
                </div>
            </div>
            ) : (
            <Form {...form}>
                <form id="attend-church-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 text-left">
                <FormField
                    control={form.control}
                    name="churchName"
                    render={({ field }) => (
                    <FormItem className="text-left">
                        <FormLabel className="text-left">Church Name</FormLabel>
                        <FormControl className="text-left">
                        <Input placeholder="e.g., New Life Church" {...field} className="text-base h-11 text-left" />
                        </FormControl>
                        <FormMessage className="text-left" />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="branch"
                    render={({ field }) => (
                    <FormItem className="text-left">
                        <FormLabel className="text-left">Branch (Optional)</FormLabel>
                        <FormControl className="text-left">
                        <Input placeholder="e.g., Downtown Campus" {...field} value={field.value ?? ''} className="text-base h-11 text-left" />
                        </FormControl>
                        <FormMessage className="text-left" />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                    <FormItem className="text-left">
                        <FormLabel className="text-left">Location (Optional)</FormLabel>
                        <FormControl className="text-left">
                        <Input placeholder="e.g., Nairobi, Kenya" {...field} value={field.value ?? ''} className="text-base h-11 text-left" />
                        </FormControl>
                        <FormMessage className="text-left" />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                    <FormItem className="text-left">
                        <FormLabel className="text-left">Service Notes (Optional)</FormLabel>
                        <FormControl className="text-left">
                        <Textarea placeholder="e.g., Visited a local branch today..." {...field} className="text-base min-h-[100px] text-left" />
                        </FormControl>
                        <FormMessage className="text-left" />
                    </FormItem>
                    )}
                />
                </form>
            </Form>
        )}

        {attendanceHistory.length > 0 && (
            <div className="space-y-4 pt-6 text-left">
                <Separator className="text-left" />
                <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-[0.2em] ml-1 text-left">Recent Attendance</h4>
                <div className="space-y-3 text-left">
                    {attendanceHistory.slice(0, 3).map((item, index) => (
                        <div key={index} className="p-4 border rounded-2xl bg-muted/20 text-left">
                            <p className="font-bold text-sm text-left">{item.churchName}</p>
                            {(item.branch || item.location) && (
                                <p className="text-xs text-muted-foreground mt-0.5 text-left">
                                    {[item.branch, item.location].filter(Boolean).join(' • ')}
                                </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-2 font-medium uppercase tracking-wider text-left">
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
    <div className="w-full text-left">
      {view === 'confirm' && userProfile?.churchInfo?.name ? (
        <div className="w-full space-y-3 text-left">
            {hasScheduleForToday && todaysSchedules.map((schedule, index) => (
                schedule.url && (
                    <Button key={index} onClick={() => handleJoinStream(schedule)} disabled={isSubmitting} variant="secondary" className="w-full h-12 font-bold rounded-2xl text-left">
                        {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin text-left" />}
                        <PlayCircle className="mr-2 h-5 w-5 text-left" />
                        Gather Online ({format(parse(schedule.time, 'HH:mm', new Date()), 'p')})
                    </Button>
                )
            ))}
            <Button onClick={handleConfirmDefaultChurch} disabled={isSubmitting} size="lg" className="w-full h-12 text-lg font-black rounded-2xl shadow-lg text-center text-left">
                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin text-left" />}
                CONFIRM ATTENDANCE
            </Button>
            <Button variant="outline" onClick={() => setView('form')} disabled={isSubmitting} className="w-full h-11 font-bold rounded-2xl text-left text-center">
                Attended Elsewhere
            </Button>
        </div>
        ) : (
        <div className="grid grid-cols-2 gap-3 w-full text-left">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="h-12 rounded-2xl text-left text-center">Cancel</Button>
            <Button type="submit" form="attend-church-form" disabled={isSubmitting} className="h-12 rounded-2xl font-bold text-left text-center">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}
                Confirm
            </Button>
        </div>
      )}
    </div>
  );

  if (!mounted) return null;

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => { if(!isSubmitting) onOpenChange(open); }}>
        <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
          <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
            <DrawerHeader className="text-left text-left">
              <DrawerTitle className="text-2xl font-black font-headline text-left">{dialogTitle}</DrawerTitle>
              <DrawerDescription className="text-sm font-medium text-left">{dialogDesc}</DrawerDescription>
            </DrawerHeader>
          </div>
          <ScrollArea className="flex-grow px-8 text-left">
            {bodyContent}
          </ScrollArea>
          <div className="p-8 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm text-left">
            {footerContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!isSubmitting) onOpenChange(open); }}>
      <DialogContent className="sm:max-w-xl flex flex-col max-h-[90vh] text-left">
        <DialogHeader className="flex-shrink-0 text-left">
          <DialogTitle className="text-left">{dialogTitle}</DialogTitle>
           <DialogDescription className="text-left">{dialogDesc}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow -mx-6 px-6 text-left">
            <div className="py-6 text-left">
                {bodyContent}
            </div>
        </ScrollArea>
        <DialogFooter className="flex-shrink-0 pt-4 border-t text-left">
          {footerContent}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}