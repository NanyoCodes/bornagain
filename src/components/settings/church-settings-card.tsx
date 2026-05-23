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
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold"><Church className="h-5 w-5 text-primary" /> My Home Church</CardTitle>
        <CardDescription>
          Set your primary place of worship and regular schedule.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSaveChanges)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Church Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., New Life Church" {...field} value={field.value ?? ''} className="text-base h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="branch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Branch (Optional)</FormLabel>
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
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Area / City (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Nairobi, Kenya" {...field} value={field.value ?? ''} className="text-base h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Worship Schedule</h3>
                </div>
                <div className="space-y-3">
                    {daysOfWeek.map((day) => {
                        const daySchedules = scheduleByDay[day] || [];
                        const hasEntries = daySchedules.length > 0;
                        return(
                        <div key={day} className={cn("rounded-xl border transition-colors", hasEntries ? "bg-muted/10 border-primary/20" : "bg-muted/5")}>
                            <div className="flex items-center justify-between p-3 sm:p-4">
                                <Label className={cn("font-bold text-sm sm:text-base", hasEntries ? "text-primary" : "text-muted-foreground")}>{day}</Label>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 text-xs font-bold uppercase tracking-tighter px-3"
                                    onClick={() => {
                                        const currentSchedule = form.getValues('schedule') || [];
                                        form.setValue('schedule', [...currentSchedule, { day, time: '10:00', url: '' }], { shouldDirty: true });
                                    }}
                                >
                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                    Add Time
                                </Button>
                            </div>
                            {hasEntries && (
                                <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-3">
                                    {daySchedules.map(item => (
                                            <div key={item.originalIndex} className="space-y-4 rounded-xl border bg-background p-3 sm:p-4 shadow-sm relative">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        const updatedSchedule = (form.getValues('schedule') || []).filter((_, i) => i !== item.originalIndex);
                                                        form.setValue('schedule', updatedSchedule, { shouldDirty: true });
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>

                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Service Time</Label>
                                                    <Input
                                                        type="time"
                                                        value={item.time}
                                                        className="h-10 text-base font-medium"
                                                        onChange={(e) => {
                                                            const updatedSchedule = [...(form.getValues('schedule') || [])];
                                                            updatedSchedule[item.originalIndex].time = e.target.value;
                                                            form.setValue('schedule', updatedSchedule, { shouldDirty: true });
                                                        }}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Stream Link <span className="opacity-50">(Optional)</span></Label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            type="url"
                                                            placeholder="YouTube or FB Live URL"
                                                            value={item.url || ''}
                                                            className="h-10 text-xs sm:text-sm flex-1"
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
                                                            className="h-10 w-10 shrink-0" 
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
            
            <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isSubmitting || !form.formState.isDirty}>
              {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Save Church Details
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
