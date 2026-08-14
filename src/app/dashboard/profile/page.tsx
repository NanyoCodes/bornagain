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
import { Loader2, User, Bell, Lock, Trash2, MessageSquare, Mail, Phone, Palette, Type, Image as ImageIcon, Sparkles, Search, XCircle } from 'lucide-react';
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
import { SoulsImportTemplateCard } from '@/components/settings/souls-import-template-card';
import { format, isSameDay } from 'date-fns';

const notificationFormSchema = z.object({
  newCampaignsInArea: z.boolean().default(false),
  weeklyDigest: z.boolean().default(false),
});

const backgroundPresets = [
  { id: 'midnight', label: 'Midnight Grace', url: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)' },
  { id: 'ancient-church', label: 'Ancient Church', url: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=2070&auto=format&fit=crop' },
  { id: 'worship', label: 'Worship Atmosphere', url: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=2070&auto=format&fit=crop' },
  { id: 'cross', label: 'Cross at Sunset', url: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=2070&auto=format&fit=crop' },
  { id: 'bible', label: 'The Living Word', url: 'https://images.unsplash.com/photo-1504052434569-70ad58ebb96d?q=80&w=2070&auto=format&fit=crop' },
  { id: 'dawn', label: 'Dawn of Hope', url: 'https://images.unsplash.com/photo-1470252649358-96940c93f319?q=80&w=2070&auto=format&fit=crop' },
  { id: 'harvest', label: 'Global Harvest', url: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?q=80&w=2070&auto=format&fit=crop' },
  { id: 'waters', label: 'Still Waters', url: 'https://images.unsplash.com/photo-1505118380757-91f5f45d8de4?q=80&w=2070&auto=format&fit=crop' },
  { id: 'majesty', label: 'Majesty Mountains', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop' },
  { id: 'stained-glass', label: 'Stained Glass', url: 'https://images.unsplash.com/photo-1438032005730-c779502df39b?q=80&w=2071&auto=format&fit=crop' },
  { id: 'garden', label: 'Garden of Peace', url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?q=80&w=2070&auto=format&fit=crop' },
  { id: 'morning', label: 'Morning Grace', url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2070&auto=format&fit=crop' },
];

function FilterControls({
  searchTerm,
  setSearchTerm,
  filterDate,
  setFilterDate,
  searchPlaceholder,
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterDate?: Date | undefined;
  setFilterDate?: (date: Date | undefined) => void;
  searchPlaceholder: string;
}) {
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value && setFilterDate) {
      const [year, month, day] = value.split('-').map(Number);
      setFilterDate(new Date(year, month - 1, day));
    } else if (setFilterDate) {
      setFilterDate(undefined);
    }
  };

  const dateValue = filterDate ? format(filterDate, "yyyy-MM-dd") : "";

  return (
    <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center text-left">
      <div className="relative flex-grow">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-sm h-11 sm:h-10 bg-muted/20 pl-8 border-none rounded-xl"
        />
      </div>
      {setFilterDate && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-grow sm:w-[180px]">
            <Input
              type="date"
              value={dateValue}
              onChange={handleDateChange}
              className="text-sm h-11 sm:h-10 w-full bg-muted/20 border-none rounded-xl"
            />
          </div>
          {filterDate && (
            <Button variant="ghost" size="icon" onClick={() => setFilterDate(undefined)} className="h-10 w-10 shrink-0">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Clear date filter</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileSettingsCard() {
  return (
    <Card className="rounded-none sm:rounded-3xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight"><User className="h-5 w-5 text-primary" /> Public Identity</CardTitle>
        <CardDescription>This is how others see your impact on the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full sm:w-auto h-12 rounded-2xl font-bold uppercase tracking-widest"><Link href="/dashboard/profile">Edit Your Profile</Link></Button>
      </CardContent>
    </Card>
  );
}

function VisualEnvironmentCard({ userProfile, userId }: { userProfile: UserProfile, userId: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState(userProfile.backgroundImage || backgroundPresets[0].url);
  const [overlayOpacity, setOverlayOpacity] = useState(userProfile.backgroundOverlayOpacity ?? 0.7);
  const { fontSize, setFontSize } = useFontSize();

  const handleSave = async () => {
    setIsSubmitting(true);
    const userRef = doc(firestore, 'users', userId);
    
    const updateData = {
        backgroundImage: selectedUrl,
        backgroundOverlayOpacity: overlayOpacity,
    };

    updateDoc(userRef, updateData)
        .then(() => {
            toast({ title: 'Environment Updated', description: 'Your visual preferences have been saved.' });
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
    <Card className="rounded-none sm:rounded-[2.5rem] border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight"><ImageIcon className="h-5 w-5 text-primary" /> Kingdom Atmosphere</CardTitle>
            <CardDescription>Personalize your environment and app readability.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            {/* Appearance Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-2xl border p-4 bg-muted/20 gap-3">
                    <div className="space-y-0.5">
                        <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                             <Palette className="h-4 w-4 text-primary" />
                             Theme
                        </label>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Dark mode is default</p>
                    </div>
                    <ThemeToggle />
                </div>

                <div className="flex items-center justify-between rounded-2xl border p-4 bg-muted/20 gap-3">
                    <div className="space-y-0.5 pr-2">
                        <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <Type className="h-4 w-4 text-primary" />
                            Text Size
                        </label>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Adjust readability</p>
                    </div>
                    <Select value={fontSize} onValueChange={(val) => setFontSize(val as any)}>
                        <SelectTrigger className="w-fit min-w-[100px] h-9 text-xs font-bold uppercase gap-2">
                            <SelectValue placeholder="Size" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="sm">Small</SelectItem>
                            <SelectItem value="base">Medium</SelectItem>
                            <SelectItem value="lg">Large</SelectItem>
                            <SelectItem value="xl">XL</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Separator className="opacity-50" />

            {/* Background Selection */}
            <div className="space-y-6">
                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Select Background</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                        {backgroundPresets.map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => setSelectedUrl(preset.url)}
                                className={cn(
                                    "group relative aspect-video rounded-2xl overflow-hidden border-2 transition-all active:scale-95 flex flex-col items-center justify-center",
                                    selectedUrl === preset.url ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-60 hover:opacity-100"
                                )}
                            >
                                {preset.url.startsWith('linear-gradient') ? (
                                <div className="absolute inset-0" style={{ background: preset.url }} />
                                ) : (
                                <Image src={preset.url} alt={preset.label} fill className="object-cover" unoptimized />
                                )}
                                <div className={cn(
                                  "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity p-2",
                                  selectedUrl === preset.url ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}>
                                    <span className="text-[9px] font-black text-white uppercase tracking-widest text-center leading-tight">{preset.label}</span>
                                </div>
                                {selectedUrl === preset.url && (
                                    <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5 z-10 shadow-lg">
                                        <Sparkles className="h-3 w-3 text-white" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Overlay Intensity</Label>
                            <span className="text-[10px] font-black text-primary uppercase tracking-tighter">{Math.round(overlayOpacity * 100)}% Dark</span>
                        </div>
                        <div className="flex items-center gap-4 px-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Glass</span>
                            <Slider 
                                value={[1 - overlayOpacity]} 
                                max={1} 
                                step={0.05} 
                                min={0}
                                onValueChange={(val) => setOverlayOpacity(1 - val[0])}
                                className="flex-1"
                            />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Solid</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Custom Image URL</Label>
                        <div className="flex gap-2">
                            <Input 
                                placeholder="https://..." 
                                value={selectedUrl}
                                onChange={(e) => setSelectedUrl(e.target.value)}
                                className="h-11 text-sm rounded-2xl bg-muted/20 border-none shadow-inner"
                            />
                            {selectedUrl && !backgroundPresets.some(p => p.url === selectedUrl) && (
                                <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-2xl border-dashed" onClick={() => setSelectedUrl(backgroundPresets[0].url)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <Button onClick={handleSave} disabled={isSubmitting} className="w-full min-h-[3.5rem] h-auto rounded-[1.5rem] font-black shadow-xl shadow-primary/20 tracking-widest uppercase py-4">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Environment
                </Button>
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
    <Card className="rounded-none sm:rounded-3xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight"><Bell className="h-5 w-5 text-primary" /> Notifications</CardTitle></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="newCampaignsInArea" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-5 bg-muted/20 gap-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-black uppercase tracking-wider">New Campaigns</FormLabel>
                    <FormDescription className="text-[10px] font-medium leading-tight">Notify me of missions in my area.</FormDescription>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            <Button type="submit" className="w-full sm:w-auto h-12 rounded-2xl font-black uppercase tracking-widest" disabled={isSubmitting || !form.formState.isDirty}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Preferences</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ContactCard() {
  return (
    <Card className="rounded-none sm:rounded-3xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight"><MessageSquare className="h-5 w-5 text-primary" /> Ministry Support</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-4 p-4 rounded-2xl border bg-muted/20 overflow-hidden shadow-inner">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-0.5">Email Support</p>
                <a href="mailto:testifyglobal360@gmail.com" className="text-sm font-bold hover:underline truncate block text-foreground">testifyglobal360@gmail.com</a>
            </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-2xl border bg-muted/20 overflow-hidden shadow-inner">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-0.5">Call / WhatsApp</p>
                <a href="tel:+2348148538502" className="text-sm font-bold hover:underline truncate block text-foreground">+234 814 853 8502</a>
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
    <Card className="border-destructive border-t-8 rounded-none sm:rounded-3xl border-x-0 sm:border-x shadow-none bg-card/50 backdrop-blur-sm">
      <CardHeader><CardTitle className="text-destructive flex items-center gap-2 text-lg font-black uppercase tracking-tight"><Trash2 className="h-5 w-5" /> Danger Zone</CardTitle></CardHeader>
      <CardContent>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto h-12 rounded-2xl font-black uppercase tracking-widest">Delete My Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="w-[90vw] max-w-lg rounded-[2rem] p-8 border-none shadow-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black font-headline tracking-tight uppercase">Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                        This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-6">
                    <AlertDialogCancel disabled={isDeleting} className="rounded-xl h-11 font-bold">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-xl h-11 font-bold">
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
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const userDocRef = useMemo(() => (user?.uid ? doc(firestore, 'users', user.uid) : null), [user?.uid, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const [testimonySearchTerm, setTestimonySearchTerm] = useState('');
  const [testimonyFilterDate, setTestimonyFilterDate] = useState<Date>();
  const [prayerSearchTerm, setPrayerSearchTerm] = useState('');
  const [prayerFilterDate, setPrayerFilterDate] = useState<Date>();
  const [createdCampaignSearchTerm, setCreatedCampaignSearchTerm] = useState('');
  const [createdCampaignFilterDate, setCreatedCampaignFilterDate] = useState<Date>();
  const [soulSearchTerm, setSoulSearchTerm] = useState('');
  const [soulFilterDate, setSoulFilterDate] = useState<Date>();

  const loading = userLoading || profileLoading;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-32">
      <div className="px-4 sm:px-0 space-y-1">
        <h1 className="text-3xl sm:text-4xl font-black font-headline tracking-tight uppercase">Settings</h1>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">Identity & Kingdom Preferences</p>
      </div>
      
       {loading || !userProfile || !user ? (
        <div className="space-y-6 px-4 sm:px-0">
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-60 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
       ) : (
        <div className="space-y-6 md:space-y-10">
            <ProfileSettingsCard />
            <VisualEnvironmentCard userProfile={userProfile} userId={user.uid} />
            <ChurchSettingsCard userProfile={userProfile} userId={user.uid} />
            <SoulsImportTemplateCard />
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
