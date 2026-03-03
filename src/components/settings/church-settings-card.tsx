
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
import { Loader2, Church, Plus, X } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { Label } from '../ui/label';

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const churchSettingsSchema = z.object({
  name: z.string().min(2, { message: 'Church name must be at least 2 characters.' }).max(100).optional(),
  schedule: z.array(z.object({
    day: z.string(),
    time: z.string().refine(val => val, { message: "Time is required." }),
  })).optional(),
});


export function ChurchSettingsCard({ userProfile, userId }: { userProfile: UserProfile; userId: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof churchSettingsSchema>>({
    resolver: zodResolver(churchSettingsSchema),
    defaultValues: {
      name: userProfile.churchInfo?.name || userProfile.lastChurchAttended || '',
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

    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        churchInfo: {
          name: values.name || null,
          schedule: values.schedule || [],
        },
      });
      toast({ title: 'Church Info Saved', description: 'Your church details have been updated.' });
      form.reset(values); // Re-sync form state
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save your church details.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Church className="h-5 w-5" /> My Church</CardTitle>
        <CardDescription>
          Set your home church details and regular worship schedule.
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
                  <FormLabel>Church Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., New Life Church" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Worship Schedule</FormLabel>
                <FormMessage className="mt-2">{form.formState.errors.schedule?.root?.message}</FormMessage>
              </div>
              <div className="space-y-2">
                {daysOfWeek.map((day) => {
                    const daySchedules = scheduleByDay[day] || [];
                    return(
                      <div key={day} className="rounded-lg border p-4 space-y-3">
                          <div className="flex items-center justify-between">
                              <Label className="font-medium">{day}</Label>
                              <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                      const currentSchedule = form.getValues('schedule') || [];
                                      form.setValue('schedule', [...currentSchedule, { day, time: '10:00' }], { shouldDirty: true });
                                  }}
                              >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add Time
                              </Button>
                          </div>
                          {daySchedules.length === 0 && <p className="text-xs text-muted-foreground pt-1">No services scheduled for {day}.</p>}
                          {daySchedules.map(item => (
                              <div key={item.originalIndex} className="flex items-center gap-2">
                                  <Input
                                      type="time"
                                      className="flex-grow"
                                      value={item.time}
                                      onChange={(e) => {
                                          const updatedSchedule = [...(form.getValues('schedule') || [])];
                                          updatedSchedule[item.originalIndex].time = e.target.value;
                                          form.setValue('schedule', updatedSchedule, { shouldDirty: true });
                                      }}
                                  />
                                  <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="shrink-0"
                                      onClick={() => {
                                          const updatedSchedule = (form.getValues('schedule') || []).filter((_, i) => i !== item.originalIndex);
                                          form.setValue('schedule', updatedSchedule, { shouldDirty: true });
                                      }}
                                  >
                                      <X className="h-4 w-4 text-destructive" />
                                  </Button>
                              </div>
                          ))}
                      </div>
                    )
                })}
              </div>
            </FormItem>
            
            <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Church Info
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
