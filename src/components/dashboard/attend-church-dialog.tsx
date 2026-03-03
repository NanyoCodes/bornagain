
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
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
      form.reset({
        churchName: userProfile?.lastChurchAttended || '',
      });
    }
  }, [isOpen, userProfile, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, { lastChurchAttended: values.churchName });
      
      onDisciplineCompleted();
      toast({
        title: 'Attendance Logged!',
        description: `Great job attending ${values.churchName} today.`,
      });
      onOpenChange(false);
    } catch (error) {
        console.error('Failed to update church attendance:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not save church attendance. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Church Attendance</DialogTitle>
          <DialogDescription>
            That's great! Which church did you attend today?
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-4">
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
      </DialogContent>
    </Dialog>
  );
}
