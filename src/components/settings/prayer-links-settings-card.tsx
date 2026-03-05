'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';

const prayerLinkSchema = z.object({
  name: z.string().min(2, { message: 'Link name must be at least 2 characters.' }).max(30),
  url: z.string().url({ message: 'Please enter a valid URL.' }),
});

export function PrayerLinksSettingsCard({ userProfile, userId }: { userProfile: UserProfile; userId: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prayerLinks = userProfile.prayerLinks || [];

  const form = useForm<z.infer<typeof prayerLinkSchema>>({
    resolver: zodResolver(prayerLinkSchema),
    defaultValues: {
      name: '',
      url: '',
    },
  });

  const handleAddLink = async (values: z.infer<typeof prayerLinkSchema>) => {
    if (!firestore || !userId) return;

    if (prayerLinks.length >= 5) {
      toast({ variant: 'destructive', title: 'Limit Reached', description: 'You can add a maximum of 5 prayer links.' });
      return;
    }

    setIsSubmitting(true);
    const newLinks = [...prayerLinks, values];

    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, { prayerLinks: newLinks });
      toast({ title: 'Link Added', description: 'Your new prayer link has been saved.' });
      form.reset();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save your link.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveLink = async (indexToRemove: number) => {
    if (!firestore || !userId) return;

    const newLinks = prayerLinks.filter((_, index) => index !== indexToRemove);
    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, { prayerLinks: newLinks });
      toast({ title: 'Link Removed', description: 'The prayer link has been deleted.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the link.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
          {prayerLinks.length > 0 && (
              <div className="space-y-2">
                  {prayerLinks.map((link, index) => (
                      <div key={index} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                          <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{link.name}</p>
                              <p className="text-sm text-muted-foreground truncate">{link.url}</p>
                          </div>
                          <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveLink(index)}
                          >
                              <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                      </div>
                  ))}
              </div>
          )}
           {prayerLinks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">You have no personal prayer links saved.</p>
           )}
      </div>

      {prayerLinks.length < 5 && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAddLink)} className="space-y-4 rounded-lg border p-4">
            <h4 className="font-medium">Add a New Link</h4>
            <div className="flex flex-col sm:flex-row gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Morning Prayer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" /> Add Link
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
