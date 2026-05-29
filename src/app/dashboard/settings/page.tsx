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
import { Loader2, User, Bell, Lock, Trash2, MessageSquare, Mail, Phone, Palette, Type, Image as ImageIcon, Sparkles } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { ChurchSettingsCard } from '@/components/settings/church-settings-card';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { PasswordSettingsCard } from '@/components/settings/password-settings-card';
import { useFontSize } from '@/components/font-size-provider';
import { PwaInstallCard } from '@/components/settings/pwa-install-card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const notificationFormSchema = z.object({
  newCampaignsInArea: z.boolean().default(false),
  weeklyDigest: z.boolean().default(false),
});

const backgroundPresets = [
  { id: 'ancient-church', label: 'Ancient Church', url: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=2070&auto=format&fit=crop' },
  { id: 'scriptures', label: 'Holy Scriptures', url: 'https://images.unsplash.com/photo-1504052434569-70ad58ebb96d?q=80&w=2070&auto=format&fit=crop' },
  { id: 'worship', label: 'Worship Atmosphere', url: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=2070&auto=format&fit=crop' },
  { id: 'cross', label: 'Cross at Sunset', url: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=2070&auto=format&fit=crop' },
  { id: 'midnight', label: 'Midnight Grace', url: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)' },
];

function ProfileSettingsCard() {
  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5 text-primary" /> Public Profile</CardTitle>
        <CardDescription>This is how others will see you on the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full sm:w-auto"><Link href="/dashboard/profile">Edit Your Profile</Link></Button>
      </CardContent>
    </Card>
  );
}

function BackgroundSettingsCard({ userProfile, userId }: { userProfile: UserProfile, userId: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState(userProfile.backgroundImage || backgroundPresets[0].url);
  const [overlayOpacity, setOverlayOpacity] = useState(userProfile.backgroundOverlayOpacity ?? 0.7);

  const handleSave = async () => {
    setIsSubmitting(true);
    const userRef = doc(firestore, 'users', userId);
    
    const updateData = {
        backgroundImage: selectedUrl,
        backgroundOverlayOpacity: overlayOpacity,
    };

    updateDoc(userRef, updateData)
        .then(() => {
            toast({ title: 'Background Updated', description: 'Your spiritual environment has been refreshed.' });
        })
        .catch(() => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ 
                path: userRef.path, 
                operation: 'update', 
                requestResourceData: updateData 
            }, user));
        })
        .finally(() => setIsSubmitting(false));
  };

  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><ImageIcon className="h-5 w-5 text-primary" /> App Background</CardTitle>
            <CardDescription>Personalize your Kingdom environment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {backgroundPresets.map((preset) => (
                    <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedUrl(preset.url)}
                        className={cn(
                            "group relative aspect-video rounded-xl overflow-hidden border-2 transition-all active:scale-95",
                            selectedUrl === preset.url ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-60 hover:opacity-100"
                        )}
                    >
                        {preset.url.startsWith('linear-gradient') ? (
                          <div className="absolute inset-0" style={{ background: preset.url }} />
                        ) : (
                          <Image src={preset.url} alt={preset.label} fill className="object-cover" unoptimized />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">{preset.label}</span>
                        </div>
                        {selectedUrl === preset.url && (
                             <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                                <Sparkles className="h-3 w-3 text-white" />
                             </div>
                        )}
                    </button>
                ))}
            </div>

            <div className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Background Visibility (Overlay)</Label>
                    <div className="flex items-center gap-4 px-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Clear</span>
                        <Slider 
                            value={[1 - overlayOpacity]} 
                            max={1} 
                            step={0.05} 
                            min={0}
                            onValueChange={(val) => setOverlayOpacity(1 - val[0])}
                            className="flex-1"
                        />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Dark</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic ml-2">Adjust how clearly the background shines through the content.</p>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Custom Image URL</Label>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="https://images.unsplash.com/..." 
                            value={selectedUrl}
                            onChange={(e) => setSelectedUrl(e.target.value)}
                            className="h-10 text-sm"
                        />
                        {selectedUrl && !backgroundPresets.some(p => p.url === selectedUrl) && (
                            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setSelectedUrl(backgroundPresets[0].url)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <Button onClick={handleSave} disabled={isSubmitting} className="w-full sm:w-auto h-11 px-8 rounded-full font-bold">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Apply Background
            </Button>
        </CardContent>
    </Card>
  );
}

function AppearanceSettingsCard() {
  const { fontSize, setFontSize } = useFontSize();

  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Palette className="h-5 w-5 text-primary" /> Appearance</CardTitle>
        <CardDescription>Customize the look and feel of the application.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
         <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
            <div className="space-y-0.5">
                <label className="text-sm font-bold uppercase tracking-wider">Display Theme</label>
                <p className="text-xs text-muted-foreground">Always set to Dark mode by default for Testify.</p>
            </div>
            <ThemeToggle />
        </div>

        <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
            <div className="space-y-0.5 pr-4">
                <label className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Type className="h-4 w-4 text-primary" />
                    Text Size
                </label>
                <p className="text-xs text-muted-foreground">Adjust readability across the entire app.</p>
            </div>
            <Select value={fontSize} onValueChange={(val) => setFontSize(val as any)}>
                <SelectTrigger className="w-[130px] h-9 text-xs sm:text-sm font-bold uppercase">
                    <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="sm">Small</SelectItem>
                    <SelectItem value="base">Medium</SelectItem>
                    <SelectItem value="lg">Large</SelectItem>
                    <SelectItem value="xl">Extra Large</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationSettingsForm({ userProfile, userId }: { userProfile: UserProfile, userId: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
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
            toast({ title: 'Preferences Saved' });
            form.reset(values);
        }).catch(() => {
             const permissionError = new FirestorePermissionError({ path: userRef.path, operation: 'update' }, user);
            errorEmitter.emit('permission-error', permissionError);
        }).finally(() => setIsSubmitting(false));
  }
  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Bell className="h-5 w-5 text-primary" /> Notifications</CardTitle></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="newCampaignsInArea" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 bg-muted/20">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-bold uppercase tracking-wider">New Campaigns</FormLabel>
                    <FormDescription className="text-[10px]">Notify me of missions in my area.</FormDescription>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || !form.formState.isDirty}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Preferences</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ContactCard() {
  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><MessageSquare className="h-5 w-5 text-primary" /> Ministry Support</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20">
            <Mail className="h-5 w-5 text-primary" />
            <div className="min-w-0">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</p>
                <a href="mailto:testifyglobal360@gmail.com" className="text-sm font-medium hover:underline truncate block">testifyglobal360@gmail.com</a>
            </div>
        </div>
        <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20">
            <Phone className="h-5 w-5 text-primary" />
            <div className="min-w-0">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone / WhatsApp</p>
                <a href="tel:+2348148538502" className="text-sm font-medium hover:underline truncate block">+234 814 853 8502</a>
            </div>
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
        toast({ variant: 'destructive', title: 'Account Deletion Initiated' });
        setTimeout(() => setIsDeleting(false), 2000);
    }
  return (
    <Card className="border-destructive border-t-4 rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none">
      <CardHeader><CardTitle className="text-destructive flex items-center gap-2 text-lg"><Trash2 className="h-5 w-5" /> Danger Zone</CardTitle></CardHeader>
      <CardContent>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">Delete My Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="w-[90vw] max-w-lg rounded-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
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

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const userDocRef = useMemo(() => (user?.uid ? doc(firestore, 'users', user.uid) : null), [user?.uid, firestore]);
  const { data: userProfile, loading } = useDoc<UserProfile>(userDocRef);

  return (
    <div className="space-y-8 max-w-3xl mx-auto -mx-4 sm:mx-auto pb-32">
      <div className="px-4 sm:px-0 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight uppercase">Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Manage your identity and Kingdom preferences.</p>
      </div>
      
       {loading || !userProfile || !user ? (
        <div className="space-y-6 px-4 sm:px-0">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-60 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
       ) : (
        <div className="space-y-6 md:space-y-8">
            <ProfileSettingsCard />
            <BackgroundSettingsCard userProfile={userProfile} userId={user.uid} />
            <ChurchSettingsCard userProfile={userProfile} userId={user.uid} />
            <AppearanceSettingsCard />
            <PwaInstallCard />
            <NotificationSettingsForm userProfile={userProfile} userId={user.uid} />
            <PasswordSettingsCard />
            <ContactCard />
            <AccountSettingsCard />
        </div>
      )}
    </div>
  );
}
