'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useUser } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Church, Plus, X, Video, CalendarClock } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { Label } from '../ui/label';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const churchSettingsSchema = z.object({
  name: z.string().min(2, { message: 'Church name must be at least 2 characters.' }).max(100).optional(),
  branch: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  schedule: z.array(z.object({
    day: z.string(),
    time: z.string().refine(val => val, { message: "Time is required." }),
    url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  })).optional(),
});


export function ChurchSettingsCard({ userProfile, userId }: { userProfile: UserProfile; userId: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof churchSettingsSchema>>({
    resolver: zodResolver(churchSettingsSchema),
    defaultValues: {
      name: userProfile.churchInfo?.name || userProfile.lastChurchAttended || '',
      branch: userProfile.churchInfo?.branch || '',
      location: userProfile.churchInfo?.location || '',
      schedule: userProfile.churchInfo?.schedule || [],
    },
  });

  const schedule = form.watch('schedule') || [];

  const scheduleByDay = useMemo(() => (schedule || []).reduce((acc, item, index) => {
    const day = item.day;
    if (!acc[day]) {
        acc[day] = [];
    }
    acc[day].push({ ...item, originalIndex: index });
    return acc;
  }, {} as { [key: string]: (typeof schedule[0] & {originalIndex: number})[] }), [schedule]);


  const handleSaveChanges = async (values: z.infer<typeof churchSettingsSchema>) => {
    if (!firestore || !userId) return;
    setIsSubmitting(true);
    
    const userRef = doc(firestore, 'users', userId);
    const payload = {
      churchInfo: {
        name: values.name || null,
        branch: values.branch || null,
        location: values.location || null,
        schedule: values.schedule || [],
      },
    };

    updateDoc(userRef, payload)
      .then(() => {
        toast({ title: 'Church Info Saved' });
        form.reset(values);
      })
      .catch(() => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: payload,
        }, user);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleCreateMeet = () => {
    window.open('https://meet.google.com/new', '_blank');
  };

  return (
    <Card className="rounded-none sm:rounded-3xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight"><Church className="h-5 w-5 text-primary" /> My Home Church</CardTitle>
        <CardDescription>
          Set your primary place of worship and regular schedule.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSaveChanges)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Church Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., New Life Church" {...field} value={field.value ?? ''} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner text-base font-bold" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                control={form.control}
                name="branch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Branch (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Downtown Campus" {...field} value={field.value ?? ''} className="h-11 rounded-2xl bg-muted/20 border-none shadow-inner" />
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
                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Area / City (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Nairobi, Kenya" {...field} value={field.value ?? ''} className="h-11 rounded-2xl bg-muted/20 border-none shadow-inner" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-5">
                <div className="flex items-center gap-2.5 px-1">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Worship Schedule</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                    {daysOfWeek.map((day) => {
                        const daySchedules = scheduleByDay[day] || [];
                        const hasEntries = daySchedules.length > 0;
                        return(
                        <div key={day} className={cn("rounded-[1.5rem] border-2 transition-all duration-300", hasEntries ? "bg-primary/[0.03] border-primary/20 shadow-inner" : "bg-muted/10 border-transparent")}>
                            <div className="flex items-center justify-between p-4">
                                <Label className={cn("font-black text-xs sm:text-sm uppercase tracking-widest", hasEntries ? "text-primary" : "text-muted-foreground/60")}>{day}</Label>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest px-3 shadow-md"
                                    onClick={() => {
                                        const currentSchedule = form.getValues('schedule') || [];
                                        form.setValue('schedule', [...currentSchedule, { day, time: '10:00', url: '' }], { shouldDirty: true });
                                    }}
                                >
                                    <Plus className="mr-1.5 h-3 w-3" />
                                    Add Time
                                </Button>
                            </div>
                            {hasEntries && (
                                <div className="px-4 pb-4 space-y-4">
                                    {daySchedules.map(item => (
                                            <div key={item.originalIndex} className="space-y-5 rounded-2xl border bg-background p-4 sm:p-5 shadow-sm relative group/item">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-8 w-8 rounded-full text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                    onClick={() => {
                                                        const updatedSchedule = (form.getValues('schedule') || []).filter((_, i) => i !== item.originalIndex);
                                                        form.setValue('schedule', updatedSchedule, { shouldDirty: true });
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>

                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Service Time</Label>
                                                    <Input
                                                        type="time"
                                                        value={item.time}
                                                        className="h-10 text-base font-black rounded-xl bg-muted/30 border-none"
                                                        onChange={(e) => {
                                                            const updatedSchedule = [...(form.getValues('schedule') || [])];
                                                            updatedSchedule[item.originalIndex].time = e.target.value;
                                                            form.setValue('schedule', updatedSchedule, { shouldDirty: true });
                                                        }}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Stream Link <span className="opacity-40 italic">(Optional)</span></Label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            type="url"
                                                            placeholder="YouTube or FB Live URL"
                                                            value={item.url || ''}
                                                            className="h-10 text-xs font-bold flex-1 rounded-xl bg-muted/30 border-none"
                                                            onChange={(e) => {
                                                                const updatedSchedule = [...(form.getValues('schedule') || [])];
                                                                if (!updatedSchedule[item.originalIndex]) return;
                                                                updatedSchedule[item.originalIndex].url = e.target.value;
                                                                form.setValue('schedule', updatedSchedule, { shouldDirty: true });
                                                            }}
                                                        />
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            size="icon" 
                                                            className="h-10 w-10 shrink-0 rounded-xl bg-background border-dashed" 
                                                            title="Generate Google Meet"
                                                            onClick={handleCreateMeet}
                                                        >
                                                            <Video className="h-4 w-4 text-primary" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                        )
                    })}
                </div>
            </div>
            
            <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20" disabled={isSubmitting || !form.formState.isDirty}>
              {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Save Church Details
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
