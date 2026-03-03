
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

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const churchSettingsSchema = z.object({
  name: z.string().min(2, { message: 'Church name must be at least 2 characters.' }).max(100).optional(),
  worshipDays: z.array(z.string()).optional(),
  worshipTime: z.string().optional(),
});

export function ChurchSettingsCard({ userProfile, userId }: { userProfile: UserProfile; userId: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof churchSettingsSchema>>({
    resolver: zodResolver(churchSettingsSchema),
    defaultValues: {
      name: userProfile.churchInfo?.name || userProfile.lastChurchAttended || '',
      worshipDays: userProfile.churchInfo?.worshipDays || [],
      worshipTime: userProfile.churchInfo?.worshipTime || '',
    },
  });

  const handleSaveChanges = async (values: z.infer<typeof churchSettingsSchema>) => {
    if (!firestore || !userId) return;
    setIsSubmitting(true);

    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        churchInfo: {
          name: values.name || null,
          worshipDays: values.worshipDays || [],
          worshipTime: values.worshipTime || null,
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
            <FormField
              control={form.control}
              name="worshipDays"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Worship Days</FormLabel>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {daysOfWeek.map((day) => (
                    <FormField
                      key={day}
                      control={form.control}
                      name="worshipDays"
                      render={({ field }) => (
                        <FormItem key={day} className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(day)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value || []), day])
                                  : field.onChange(field.value?.filter((value) => value !== day));
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">{day}</FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="worshipTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Worship Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} value={field.value ?? ''}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
