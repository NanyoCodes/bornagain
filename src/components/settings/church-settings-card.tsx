
'use client';

import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Church } from 'lucide-react';
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
              </div>
              <div className="space-y-3">
                {daysOfWeek.map((day) => {
                  const scheduleItem = schedule.find(item => item.day === day);
                  const isChecked = !!scheduleItem;

                  return (
                    <div key={day} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`day-${day}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const currentSchedule = form.getValues('schedule') || [];
                            if (checked) {
                              form.setValue('schedule', [...currentSchedule, { day, time: '10:00' }], { shouldDirty: true });
                            } else {
                              form.setValue('schedule', currentSchedule.filter(item => item.day !== day), { shouldDirty: true });
                            }
                          }}
                        />
                        <Label htmlFor={`day-${day}`} className="font-normal text-sm">{day}</Label>
                      </div>
                      {isChecked && (
                        <Input
                          type="time"
                          className="w-36"
                          value={scheduleItem.time}
                          onChange={(e) => {
                            const newTime = e.target.value;
                            const currentSchedule = form.getValues('schedule') || [];
                            form.setValue('schedule', currentSchedule.map(item => item.day === day ? { ...item, time: newTime } : item), { shouldDirty: true });
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
               <FormMessage>{form.formState.errors.schedule?.root?.message}</FormMessage>
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
