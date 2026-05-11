'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Bell, Lock, Trash2, MessageSquare, Mail, Phone, Palette } from 'lucide-react';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { ChurchSettingsCard } from '@/components/settings/church-settings-card';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { PasswordSettingsCard } from '@/components/settings/password-settings-card';

const notificationFormSchema = z.object({
  newCampaignsInArea: z.boolean().default(false),
  weeklyDigest: z.boolean().default(false),
});

function ProfileSettingsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Public Profile</CardTitle>
        <CardDescription>This is how others will see you on the site.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild><Link href="/dashboard/profile">Edit Your Profile</Link></Button>
      </CardContent>
    </Card>
  );
}

function AppearanceSettingsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Appearance</CardTitle>
        <CardDescription>Customize the look and feel of the application.</CardDescription>
      </CardHeader>
      <CardContent>
         <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
                <label className="text-base font-medium">Theme</label>
                <p className="text-sm text-muted-foreground">Select theme.</p>
            </div>
            <ThemeToggle />
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationSettingsForm({ userProfile, userId }: { userProfile: UserProfile, userId: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof notificationFormSchema>>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      newCampaignsInArea: userProfile.notificationSettings?.newCampaignsInArea ?? false,
      weeklyDigest: userProfile.notificationSettings?.weeklyDigest ?? false,
    },
  });
  useEffect(() => {
    form.reset({
      newCampaignsInArea: userProfile.notificationSettings?.newCampaignsInArea ?? false,
      weeklyDigest: userProfile.notificationSettings?.weeklyDigest ?? false,
    });
  }, [userProfile, form]);
  async function onSubmit(values: z.infer<typeof notificationFormSchema>) {
    setIsSubmitting(true);
    const userRef = doc(firestore, 'users', userId);
    updateDoc(userRef, { notificationSettings: values }).then(() => {
            toast({ title: 'Success' });
            form.reset(values);
        }).catch(() => {
             const permissionError = new FirestorePermissionError({ path: userRef.path, operation: 'update' });
            errorEmitter.emit('permission-error', permissionError);
        }).finally(() => setIsSubmitting(false));
  }
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField control={form.control} name="newCampaignsInArea" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5"><FormLabel>New Campaigns</FormLabel></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ContactCard() {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Contact</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4"><Mail className="h-5 w-5" /><a href="mailto:testifyglobal360@gmail.com" className="hover:underline">testifyglobal360@gmail.com</a></div>
        <div className="flex items-center gap-4"><Phone className="h-5 w-5" /><a href="tel:+2348148538502" className="hover:underline">+2348148538502</a></div>
      </CardContent>
    </Card>
  );
}

function AccountSettingsCard() {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const handleDelete = () => {
        setIsDeleting(true);
        toast({ variant: 'destructive', title: 'Account Deletion Initiated' });
        setTimeout(() => setIsDeleting(false), 2000);
    }
  return (
    <Card className="border-destructive">
      <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><Trash2 className="h-5 w-5" /> Delete Account</CardTitle></CardHeader>
      <CardContent><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive">Delete My Account</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const userDocRef = useMemo(() => (user?.uid ? doc(firestore, 'users', user.uid) : null), [user?.uid, firestore]);
  const { data: userProfile, loading } = useDoc<UserProfile>(userDocRef);
  return (
    <div className="space-y-8 max-w-3xl auto">
      <div className="space-y-2"><h1 className="text-3xl font-bold tracking-tight font-headline">Settings</h1></div>
      <Separator />
       {loading || !userProfile || !user ? <div className="space-y-6"><Skeleton className="h-40 w-full" /></div> : (
        <div className="space-y-6"><ProfileSettingsCard /><ChurchSettingsCard userProfile={userProfile} userId={user.uid} /><AppearanceSettingsCard /><NotificationSettingsForm userProfile={userProfile} userId={user.uid} /><PasswordSettingsCard /><ContactCard /><AccountSettingsCard /></div>
      )}
    </div>
  );
}
