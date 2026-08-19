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
import { Loader2, User, Bell, Lock, MessageSquare, Mail, Phone, Palette, Type, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
import { cn } from '@/lib/utils';
import { SoulsImportTemplateCard } from './souls-import-template-card';

const notificationFormSchema = z.object({
  newCampaignsInArea: z.boolean().default(false),
  weeklyDigest: z.boolean().default(false),
});

const backgroundPresets = [
  { id: 'midnight', label: 'Midnight Grace', url: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)' },
];

function ProfileSettingsCard() {
  return (
    <Card className="rounded-none sm:rounded-3xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm text-left">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight text-left"><User className="h-5 w-5 text-primary" /> Public Identity</CardTitle>
        <CardDescription className="text-left">This is how others see your impact on the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full sm:w-auto h-12 rounded-2xl font-bold uppercase tracking-widest text-left"><Link href="/profile">Edit Your Profile</Link></Button>
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
    <Card className="rounded-none sm:rounded-[2.5rem] border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm text-left text-left text-left">
        <CardHeader className="text-left">
            <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight text-left"><ImageIcon className="h-5 w-5 text-primary text-left" /> Kingdom Atmosphere</CardTitle>
            <CardDescription className="text-left">Personalize your environment and app readability.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 text-left">
            {/* Appearance Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left text-left">
                <div className="flex items-center justify-between rounded-2xl border p-4 bg-muted/20 gap-3 text-left">
                    <div className="space-y-0.5 text-left">
                        <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-left">
                             <Palette className="h-4 w-4 text-primary text-left" />
                             Theme
                        </label>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium text-left">Dark mode is default</p>
                    </div>
                    <ThemeToggle />
                </div>

                <div className="flex items-center justify-between rounded-2xl border p-4 bg-muted/20 gap-3 text-left">
                    <div className="space-y-0.5 pr-2 text-left text-left">
                        <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-left">
                            <Type className="h-4 w-4 text-primary text-left" />
                            Text Size
                        </label>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium text-left">Adjust readability</p>
                    </div>
                    <Select value={fontSize} onValueChange={(val) => setFontSize(val as any)}>
                        <SelectTrigger className="w-fit min-w-[100px] h-9 text-xs font-bold uppercase gap-2 text-left">
                            <SelectValue placeholder="Size" className="text-left" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                            <SelectItem value="sm" className="text-left">Small</SelectItem>
                            <SelectItem value="base" className="text-left">Medium</SelectItem>
                            <SelectItem value="lg" className="text-left">Large</SelectItem>
                            <SelectItem value="xl" className="text-left">XL</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Separator className="opacity-50 text-left" />

            {/* Background Selection */}
            <div className="space-y-6 text-left text-left">
                <div className="space-y-4 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 text-left">Select Background</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 text-left">
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
                                <div className="absolute inset-0" style={{ background: preset.url }} />
                                <div className={cn(
                                  "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity p-2",
                                  selectedUrl === preset.url ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}>
                                    <span className="text-[9px] font-black text-white uppercase tracking-widest text-center leading-tight">{preset.label}</span>
                                </div>
                                {selectedUrl === preset.url && (
                                    <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5 z-10 shadow-lg text-left">
                                        <Sparkles className="h-3 w-3 text-white text-left" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-8 text-left text-left">
                    <div className="space-y-4 text-left">
                        <div className="flex justify-between items-center text-left">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 text-left">Overlay Intensity</Label>
                            <span className="text-[10px] font-black text-primary uppercase tracking-tighter text-left">{Math.round(overlayOpacity * 100)}% Dark</span>
                        </div>
                        <div className="flex items-center gap-4 px-2 text-left">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase text-left">Glass</span>
                            <Slider 
                                value={[1 - overlayOpacity]} 
                                max={1} 
                                step={0.05} 
                                min={0}
                                onValueChange={(val) => setOverlayOpacity(1 - val[0])}
                                className="flex-1 text-left"
                            />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase text-left">Solid</span>
                        </div>
                    </div>
                </div>

                <Button onClick={handleSave} disabled={isSubmitting} className="w-full min-h-[3.5rem] h-auto rounded-[1.5rem] font-black shadow-xl shadow-primary/20 tracking-widest uppercase py-4 text-left">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}
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
    <Card className="rounded-none sm:rounded-3xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm text-left">
      <CardHeader className="text-left"><CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight text-left"><Bell className="h-5 w-5 text-primary text-left" /> Notifications</CardTitle></CardHeader>
      <CardContent className="text-left">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 text-left">
            <FormField control={form.control} name="newCampaignsInArea" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-5 bg-muted/20 gap-4 text-left">
                  <div className="space-y-0.5 text-left">
                    <FormLabel className="text-sm font-black uppercase tracking-wider text-left">New Campaigns</FormLabel>
                    <FormDescription className="text-[10px] font-medium leading-tight text-left">Notify me of missions in my area.</FormDescription>
                  </div>
                  <FormControl className="text-left"><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            <Button type="submit" className="w-full sm:w-auto h-12 rounded-2xl font-black uppercase tracking-widest text-left" disabled={isSubmitting || !form.formState.isDirty}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}Save Preferences</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ContactCard() {
  return (
    <Card className="rounded-none sm:rounded-3xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm text-left text-left">
      <CardHeader className="text-left"><CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight text-left"><MessageSquare className="h-5 w-5 text-primary text-left" /> Ministry Support</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
        <div className="flex items-center gap-4 p-4 rounded-2xl border bg-muted/20 overflow-hidden shadow-inner text-left text-left text-left">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-left">
                <Mail className="h-5 w-5 text-primary text-left" />
            </div>
            <div className="min-w-0 text-left">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-0.5 text-left">Email Support</p>
                <a href="mailto:testifyglobal360@gmail.com" className="text-sm font-bold hover:underline truncate block text-foreground text-left">testifyglobal360@gmail.com</a>
            </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-2xl border bg-muted/20 overflow-hidden shadow-inner text-left text-left text-left">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-left">
                <Phone className="h-5 w-5 text-primary text-left" />
            </div>
            <div className="min-w-0 text-left">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-0.5 text-left">Call / WhatsApp</p>
                <a href="tel:+2348148538502" className="text-sm font-bold hover:underline truncate block text-foreground text-left">+234 814 853 8502</a>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AccountDeletionRequest({ userId }: { userId: string }) {
    const handleEmailRequest = () => {
        const subject = encodeURIComponent("Account Deletion Request - Testify Global");
        const body = encodeURIComponent(`Hello Testify Team,\n\nI would like to request the permanent deletion of my account.\n\nUser ID: ${userId}\n\nPlease let me know the next steps.\n\nGod bless.`);
        window.location.href = `mailto:testifyglobal360@gmail.com?subject=${subject}&body=${body}`;
    };

    return (
        <div className="pt-12 pb-8 flex flex-col items-center gap-4 text-center px-6 text-left">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] opacity-40 text-center">Account Lifecycle</p>
            <Button 
                variant="ghost" 
                onClick={handleEmailRequest}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 font-black uppercase tracking-[0.2em] text-[10px] h-10 px-8 rounded-full border border-destructive/20 transition-all active:scale-95 text-center"
            >
                Request Account Deletion
            </Button>
            <p className="text-[9px] text-muted-foreground italic max-w-xs leading-relaxed text-center">
                Send a request to our ministry team for secure identity removal.
            </p>
        </div>
    );
}

export function SettingsPageContent() {
  const { user } = useUser();
  const firestore = useFirestore();
  const userDocRef = useMemo(() => (user?.uid ? doc(firestore, 'users', user.uid) : null), [user?.uid, firestore]);
  const { data: userProfile, loading } = useDoc<UserProfile>(userDocRef);

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-32 text-left">
      <div className="px-4 sm:px-0 space-y-1 text-left">
        <h1 className="text-3xl sm:text-4xl font-black font-headline tracking-tight uppercase text-left">Settings</h1>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60 text-left">Identity & Kingdom Preferences</p>
      </div>
      
       {loading || !userProfile || !user ? (
        <div className="space-y-6 px-4 sm:px-0 text-left text-left">
            <Skeleton className="h-40 w-full rounded-3xl text-left" />
            <Skeleton className="h-60 w-full rounded-3xl text-left" />
            <Skeleton className="h-40 w-full rounded-3xl text-left" />
        </div>
       ) : (
        <div className="space-y-6 md:space-y-10 text-left">
            <ProfileSettingsCard />
            <VisualEnvironmentCard userProfile={userProfile} userId={user.uid} />
            <ChurchSettingsCard userProfile={userProfile} userId={user.uid} />
            <SoulsImportTemplateCard />
            <PwaInstallCard />
            <NotificationSettingsForm userProfile={userProfile} userId={user.uid} />
            <PasswordSettingsCard />
            <ContactCard />
            <AccountDeletionRequest userId={user.uid} />
        </div>
      )}
    </div>
  );
}
