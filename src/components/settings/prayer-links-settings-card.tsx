
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useUser } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Plus, Trash2, Edit } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const prayerLinkSchema = z.object({
  name: z.string().min(2, { message: 'Link name must be at least 2 characters.' }).max(30),
  url: z.string().url({ message: 'Please enter a valid URL.' }),
});

// Component for editing an existing link
function EditPrayerLinkForm({ link, index, onUpdate, onCancel, isSubmitting }: { link: {name: string, url: string}, index: number, onUpdate: (index: number, values: z.infer<typeof prayerLinkSchema>) => void, onCancel: () => void, isSubmitting: boolean }) {
  const form = useForm<z.infer<typeof prayerLinkSchema>>({
    resolver: zodResolver(prayerLinkSchema),
    defaultValues: link,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => onUpdate(index, values))} className="space-y-3 rounded-lg border p-4 bg-muted/50">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="Link Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col-reverse gap-2 pt-2">
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={isSubmitting} className="w-full">Cancel</Button>
          <Button type="submit" size="sm" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
}


export function PrayerLinksSettingsCard({ userProfile, userId }: { userProfile: UserProfile; userId: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const prayerLinks = userProfile.prayerLinks || [];

  const addForm = useForm<z.infer<typeof prayerLinkSchema>>({
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
    const userRef = doc(firestore, 'users', userId);
    const payload = { prayerLinks: newLinks };
    
    updateDoc(userRef, payload)
        .then(() => {
            toast({ title: 'Link Added', description: 'Your new prayer link has been saved.' });
            addForm.reset();
        })
        .catch(() => {
            const permissionError = new FirestorePermissionError({ path: userRef.path, operation: 'update', requestResourceData: payload }, user);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  const handleRemoveLink = async (indexToRemove: number) => {
    if (!firestore || !userId) return;
    setIsSubmitting(true);
    const newLinks = prayerLinks.filter((_, index) => index !== indexToRemove);
    const userRef = doc(firestore, 'users', userId);
    const payload = { prayerLinks: newLinks };
    
    updateDoc(userRef, payload)
        .then(() => {
            toast({ title: 'Link Removed', description: 'The prayer link has been deleted.' });
        })
        .catch(() => {
             const permissionError = new FirestorePermissionError({ path: userRef.path, operation: 'update', requestResourceData: payload }, user);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  const handleUpdateLink = async (index: number, values: z.infer<typeof prayerLinkSchema>) => {
    if (!firestore || !userId) return;
    setIsSubmitting(true);

    const newLinks = [...prayerLinks];
    newLinks[index] = values;
    const userRef = doc(firestore, 'users', userId);
    const payload = { prayerLinks: newLinks };
    
    updateDoc(userRef, payload)
        .then(() => {
            toast({ title: 'Link Updated' });
            setEditingIndex(null);
        })
        .catch(() => {
            const permissionError = new FirestorePermissionError({ path: userRef.path, operation: 'update', requestResourceData: payload }, user);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
          {prayerLinks.length > 0 && (
              <div className="space-y-2">
                  {prayerLinks.map((link, index) => (
                    <div key={index}>
                      {editingIndex === index ? (
                        <EditPrayerLinkForm
                          link={link}
                          index={index}
                          onUpdate={handleUpdateLink}
                          onCancel={() => setEditingIndex(null)}
                          isSubmitting={isSubmitting}
                        />
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                          <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{link.name}</p>
                              <p className="text-sm text-muted-foreground truncate">{link.url}</p>
                          </div>
                          <div className="flex items-center">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingIndex(index)}
                                disabled={isSubmitting}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveLink(index)}
                                disabled={isSubmitting}
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
          )}
           {prayerLinks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">You have no personal prayer links saved.</p>
           )}
      </div>

      {prayerLinks.length < 5 && editingIndex === null && (
        <Form {...addForm}>
          <form onSubmit={addForm.handleSubmit(handleAddLink)} className="space-y-4 rounded-lg border p-4">
            <h4 className="font-medium">Add a New Link</h4>
            <div className="space-y-4">
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Morning Prayer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" /> Add Link
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
