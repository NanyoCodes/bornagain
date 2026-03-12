
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const formSchema = z.object({
  passage1: z.string().min(3, { message: 'Please enter a valid Bible reference.' }),
  passage2: z.string().min(3, { message: 'Please enter a valid Bible reference.' }),
});

interface OnboardingPassagesProps {
  userId: string;
  isOpen: boolean;
  onComplete: () => void;
}

export function OnboardingPassages({ userId, isOpen, onComplete }: OnboardingPassagesProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      passage1: 'John 3:16',
      passage2: 'Romans 8:28',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    const userRef = doc(firestore, 'users', userId);
    const payload = {
      favoritePassages: [values.passage1, values.passage2],
    };
    
    updateDoc(userRef, payload)
        .then(() => {
            toast({ title: 'Success', description: 'Your favorite passages have been saved.' });
            onComplete();
        })
        .catch(() => {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: payload,
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Personalize Your Dashboard
          </DialogTitle>
          <DialogDescription>
            Tell us two of your favorite Bible passages to personalize your experience.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="passage1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Favorite Passage 1</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John 3:16" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="passage2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Favorite Passage 2</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Romans 8:28" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Passages
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
