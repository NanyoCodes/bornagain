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

// --- Validation Schemas ---
const notificationFormSchema = z.object({
  newCampaignsInArea: z.boolean().default(false),
  weeklyDigest: z.boolean().default(false),
});

// --- Settings Components ---

function ProfileSettingsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Public Profile</CardTitle>
        <CardDescription>
          This is how others will see you on the site. Click below to edit your public information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/dashboard/profile">Edit Your Profile</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function AppearanceSettingsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Appearance</CardTitle>
        <CardDescription>
          Customize the look and feel of the application.
        </CardDescription>
      </CardHeader>
      <CardContent>
         <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
                <label className="text-base font-medium">Theme</label>
                <p className="text-sm text-muted-foreground">
                    Select a light, dark, or system theme.
                </p>
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
  }, [userProfile, form.reset]);

  async function onSubmit(values: z.infer<typeof notificationFormSchema>) {
    setIsSubmitting(true);
    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, { notificationSettings: values });
      toast({ title: 'Success', description: 'Notification settings saved.' });
      form.reset(values); // Re-sync form state to prevent "dirty" state after submit
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save notification settings.' });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle>
        <CardDescription>Choose what you want to be notified about and how.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="newCampaignsInArea"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">New Campaigns</FormLabel>
                    <FormDescription>When a new campaign starts in your area.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weeklyDigest"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Weekly Digest</FormLabel>
                    <FormDescription>Receive a weekly summary of activity by email.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Notifications
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ContactCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Contact &amp; Suggestions</CardTitle>
        <CardDescription>
          Have suggestions or need to get in touch? We&apos;d love to hear from you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <a href="mailto:testifyglobal@gmail.com" className="text-sm font-medium hover:underline">
                testifyglobal@gmail.com
            </a>
        </div>
        <div className="flex items-center gap-4">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <a href="tel:+2348148538502" className="text-sm font-medium hover:underline">
                +2348148538502
            </a>
        </div>
      </CardContent>
    </Card>
  );
}


function AccountSettingsCard() {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        setIsDeleting(true);
        // In a real app, this would trigger a backend function
        // to delete all user data before deleting the auth user.
        toast({
            variant: 'destructive',
            title: 'Account Deletion Initiated',
            description: 'This is a demo. No data will be deleted.',
        });
        setTimeout(() => setIsDeleting(false), 2000);
    }
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2"><Trash2 className="h-5 w-5" /> Delete Account</CardTitle>
        <CardDescription>
          Permanently delete your account and all of your content. This action is irreversible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete My Account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account, profile, testimonies, and all other data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm Deletion
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function SettingsSkeleton() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-80" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-10 w-36" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-80" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-10 w-48" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-80" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-10 w-48" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  const userDocRef = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);
  const { data: userProfile, loading } = useDoc<UserProfile>(userDocRef);
  
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>
      <Separator />

       {loading || !userProfile || !user ? (
        <SettingsSkeleton />
      ) : (
        <div className="space-y-6">
          <ProfileSettingsCard />
          <ChurchSettingsCard userProfile={userProfile} userId={user.uid} />
          <AppearanceSettingsCard />
          <NotificationSettingsForm userProfile={userProfile} userId={user.uid} />
          <ContactCard />
          <AccountSettingsCard />
        </div>
      )}
    </div>
  );
}
