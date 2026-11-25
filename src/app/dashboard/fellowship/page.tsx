
'use client';

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, serverTimestamp, doc, runTransaction, updateDoc, where, getDocs, deleteField, increment, arrayUnion, arrayRemove } from "firebase/firestore";
import type { UserProfile, Fellowship, FellowshipMember, JoinedFellowship } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Loader2, Video, Users, Group, Target, MessagesSquare, Trash2, MapPin, ChevronDown, X } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
import { useRouter } from 'next/navigation';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FellowshipCard } from '@/components/fellowship/fellowship-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearch } from '@/context/search-context';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Country, State } from 'country-state-city';
import { Skeleton } from "@/components/ui/skeleton";
import { FeedSidebar } from '@/components/layout/feed-sidebar';
import { BibleGameCard } from '@/components/testimonies/bible-game-card';
import { KingdomAdSpot } from '@/components/testimonies/kingdom-ad-spot';
import { AppShell } from '@/components/layout/app-shell';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters.").max(100),
  description: z.string().min(10, "Description must be at least 10 characters.").max(500),
  groupType: z.enum(['Fellowship', 'Association']),
  schedule: z.string().min(3, "Schedule is required.").max(100),
  streamUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  locationType: z.enum(['Physical', 'Virtual', 'Physical and Virtual'], { required_error: "Please select a location type." }),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().optional(),
}).refine((data) => {
    if (data.locationType === 'Physical' || data.locationType === 'Physical and Virtual') {
        return !!data.city && data.city.trim().length > 0 && !!data.state && !!data.country;
    }
    return true;
}, {
    message: "City, State, and Country are required for physical meetings.",
    path: ["city"],
});

function FellowshipForm({ 
    userProfile, 
    onFormSubmit, 
    isSubmitting,
    defaultType = 'Fellowship'
}: { 
    userProfile: UserProfile | null, 
    onFormSubmit: (values: z.infer<typeof formSchema>) => void, 
    isSubmitting: boolean,
    defaultType?: 'Fellowship' | 'Association'
}) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            groupType: defaultType,
            schedule: "",
            streamUrl: userProfile?.defaultMeetingLink || "",
            locationType: 'Physical',
            city: userProfile?.location?.city || '',
            state: userProfile?.location?.state || '',
            country: userProfile?.location?.country || '',
        },
    });

    const watchedCountryName = form.watch('country');

    const countriesList = useMemo(() => Country.getAllCountries(), []);
    const selectedCountry = useMemo(() => countriesList.find(c => c.name === watchedCountryName), [countriesList, watchedCountryName]);

    const statesList = useMemo(() => selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : [], [selectedCountry]);

    useEffect(() => {
        form.setValue('groupType', defaultType);
    }, [defaultType, form]);

    const handleCreateMeet = () => {
        window.open('https://meet.google.com/new', '_blank');
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6 text-left">
                <FormField
                    control={form.control}
                    name="groupType"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>What are you organizing?</FormLabel>
                        <FormControl>
                            <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Fellowship" id="r1" />
                                    <Label htmlFor="r1" className="font-normal cursor-pointer">Fellowship Group</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Association" id="r2" />
                                    <Label htmlFor="r2" className="font-normal cursor-pointer">Association</Label>
                                </div>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><Input placeholder={form.watch('groupType') === 'Fellowship' ? "e.g., Morning Prayer" : "e.g., Youth Association"} {...field} className="text-base h-11" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea placeholder="Purpose of this group..." {...field} className="text-base min-h-[100px]" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="schedule" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Schedule</FormLabel>
                        <FormControl><Input placeholder="e.g., Every Friday at 6:00 AM" {...field} className="text-base h-11" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormField
                    control={form.control}
                    name="locationType"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Location Type</FormLabel>
                        <FormControl>
                            <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Physical" id="l1" />
                                    <Label htmlFor="l1" className="font-normal cursor-pointer">Physical</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Virtual" id="l2" />
                                    <Label htmlFor="l2" className="font-normal cursor-pointer">Virtual</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Physical and Virtual" id="l3" />
                                    <Label htmlFor="l3" className="font-normal cursor-pointer">Both</Label>
                                </div>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                {(form.watch('locationType') === 'Physical' || form.watch('locationType') === 'Physical and Virtual') && (
                    <div className="space-y-4">
                        <FormField control={form.control} name="country" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Country</FormLabel>
                                <Select onValueChange={(val) => { field.onChange(val); form.setValue('state', ''); form.setValue('city', ''); }} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="text-base h-11">
                                            <SelectValue placeholder="Select Country" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="max-h-[300px] overflow-y-auto">
                                        {countriesList.map(c => (
                                            <SelectItem key={c.isoCode} value={c.name}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="state" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State / Region</FormLabel>
                                    <Select 
                                        onValueChange={(val) => { field.onChange(val); form.setValue('city', ''); }} 
                                        value={field.value} 
                                        disabled={!watchedCountryName || statesList.length === 0}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="text-base h-11">
                                                <SelectValue placeholder={statesList.length === 0 ? "N/A" : "Select State"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="max-h-[300px] overflow-y-auto">
                                            {statesList.map(s => (
                                                <SelectItem key={s.isoCode + s.name} value={s.name}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="city" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter City" {...field} value={field.value ?? ''} className="text-base h-11" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </div>
                )}
                <FormField control={form.control} name="streamUrl" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Meeting URL (Optional)</FormLabel>
                        <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ''} className="text-base h-11" /></FormControl>
                        <Button type="button" variant="outline" size="sm" onClick={handleCreateMeet} className="mt-1">
                          <Video className="mr-2 h-4 w-4" />
                          Google Meet
                        </Button>
                        <FormMessage />
                    </FormItem>
                )} />
                <Button type="submit" disabled={isSubmitting} className="w-full h-11 text-lg">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Fellowship
                </Button>
            </form>
        </Form>
    );
}

function ManageFellowshipForm({ fellowship, onFormSubmit, isSubmitting, onDelete }: { fellowship: Fellowship, onFormSubmit: (values: any) => void, isSubmitting: boolean, onDelete: () => void }) {
  const countriesList = useMemo(() => Country.getAllCountries(), []);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: fellowship.name || "",
      description: fellowship.description || "",
      groupType: fellowship.groupType || "Fellowship",
      schedule: fellowship.schedule || "",
      streamUrl: fellowship.streamUrl || "",
      locationType: fellowship.locationType || 'Physical',
      city: fellowship.city || "",
      state: fellowship.state || "",
      country: fellowship.country || "",
    },
  });

  const watchedCountryName = form.watch('country');
  const selectedCountry = useMemo(() => countriesList.find(c => c.name === watchedCountryName), [countriesList, watchedCountryName]);
  const statesList = useMemo(() => selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : [], [selectedCountry]);

  const handleCreateMeet = () => {
    window.open('https://meet.google.com/new', '_blank');
  };

  return (
    <div className="space-y-8 text-left">
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
            <FormField
                control={form.control}
                name="groupType"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                        <RadioGroup 
                            onValueChange={field.onChange} 
                            defaultValue={field.value} 
                            className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Fellowship" id="m1" />
                                <Label htmlFor="m1" className="font-normal cursor-pointer">Fellowship</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Association" id="m2" />
                                <Label htmlFor="m2" className="font-normal cursor-pointer">Association</Label>
                            </div>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input {...field} className="text-base h-11" /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea {...field} className="text-base min-h-[100px]" /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="schedule" render={({ field }) => (
                <FormItem>
                    <FormLabel>Schedule</FormLabel>
                    <FormControl><Input {...field} className="text-base h-11" /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField
                control={form.control}
                name="locationType"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Location Type</FormLabel>
                    <FormControl>
                        <RadioGroup 
                            onValueChange={field.onChange} 
                            defaultValue={field.value} 
                            className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Physical" id="ml1" />
                                <Label htmlFor="ml1" className="font-normal cursor-pointer">Physical</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Virtual" id="ml2" />
                                <Label htmlFor="ml2" className="font-normal cursor-pointer">Virtual</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Physical and Virtual" id="ml3" />
                                <Label htmlFor="ml3" className="font-normal cursor-pointer">Both</Label>
                            </div>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                    )}
            />
            {(form.watch('locationType') === 'Physical' || form.watch('locationType') === 'Physical and Virtual') && (
                <div className="space-y-4">
                    <FormField control={form.control} name="country" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Country</FormLabel>
                            <Select onValueChange={(val) => { field.onChange(val); form.setValue('state', ''); form.setValue('city', ''); }} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="text-base h-11">
                                        <SelectValue placeholder="Select Country" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="max-h-[300px] overflow-y-auto">
                                    {countriesList.map(c => (
                                        <SelectItem key={c.isoCode} value={c.name}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="state" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State / Region</FormLabel>
                                <Select 
                                    onValueChange={(val) => { field.onChange(val); form.setValue('city', ''); }} 
                                    value={field.value} 
                                    disabled={!watchedCountryName || statesList.length === 0}
                                >
                                    <FormControl>
                                        <SelectTrigger className="text-base h-11">
                                            <SelectValue placeholder={statesList.length === 0 ? "N/A" : "Select State"} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="max-h-[300px] overflow-y-auto">
                                        {statesList.map(s => (
                                            <SelectItem key={s.isoCode + s.name} value={s.name}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="city" render={({ field }) => (
                            <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter City" {...field} value={field.value ?? ''} className="text-base h-11" />
                                    </FormControl>
                                    <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </div>
            )}
            <FormField control={form.control} name="streamUrl" render={({ field }) => (
                <FormItem>
                    <FormLabel>Meeting URL (Optional)</FormLabel>
                    <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ''} className="text-base h-11" /></FormControl>
                    <Button type="button" variant="outline" size="sm" onClick={handleCreateMeet} className="mt-1">
                      <Video className="mr-2 h-4 w-4" />
                      Google Meet
                    </Button>
                    <FormMessage />
                </FormItem>
            )} />
            <Button type="submit" disabled={isSubmitting} className="w-full h-11">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </form>
        </Form>

        <Separator />

        <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2"><Trash2 className="h-5 w-5" /> Delete Group</CardTitle>
                <CardDescription>Permanently remove this {(fellowship.groupType || 'group').toLowerCase()} from BornAgain Global.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant="destructive" onClick={onDelete}>Delete Permanently</Button>
            </CardContent>
        </Card>
    </div>
  );
}

function FellowshipDashboardContent() {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();
    
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createType, setCreateType] = useState<'Fellowship' | 'Association'>( 'Fellowship');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fellowshipToManage, setFellowshipToManage] = useState<Fellowship | null>(null);
    const [fellowshipToDelete, setFellowshipToDelete] = useState<Fellowship | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState("Fellowship");
    const [membershipFilter, setMembershipFilter] = useState("all");
    const [mounted, setMounted] = useState(false);
    const isMobile = useIsMobile();
    
    useEffect(() => {
        setMounted(true);
        setIsSearchVisible(true);
        setSearchPlaceholder("Search groups...");
        return () => {
            setIsSearchVisible(false);
            setSearchTerm("");
        };
    }, [setIsSearchVisible, setSearchPlaceholder, setSearchTerm]);

    const closeAllDialogs = useCallback(() => {
        setIsCreateOpen(false);
        setIsDeleting(false);
        setTimeout(() => {
            setFellowshipToManage(null);
            setFellowshipToDelete(null);
        }, 300);
    }, []);

    const userDocRef = useMemo(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

    const fellowshipsQuery = useMemo(() => query(collection(firestore, "fellowships"), orderBy("createdAt", "desc")), [firestore]);
    const { data: fellowships, loading: fellowshipsLoading } = useCollection<Fellowship>(fellowshipsQuery);
    
    const joinedGroupsRefsQuery = useMemo(() => {
      if (!user?.uid || !firestore) return null;
      return query(collection(firestore, `users/${user.uid}/joinedFellowships`));
    }, [user?.uid, firestore]);
    const { data: joinedFellowshipRefs } = useCollection<JoinedFellowship>(joinedGroupsRefsQuery);

    const handleCreateFellowship = async (values: z.infer<typeof formSchema>) => {
        if (!user || !userProfile || !firestore) return;
        setIsSubmitting(true);

        const newFellowshipRef = doc(collection(firestore, "fellowships"));
        const userFellowshipRef = doc(firestore, 'users', user.uid, 'joinedFellowships', newFellowshipRef.id);
        const fellowshipMemberRef = doc(firestore, 'fellowships', newFellowshipRef.id, 'members', user.uid);

        const location = [values.city, values.state, values.country].filter(Boolean).join(', ');

        const newFellowshipData = {
            name: values.name,
            description: values.description,
            groupType: values.groupType,
            schedule: values.schedule,
            streamUrl: values.streamUrl || null,
            locationType: values.locationType,
            city: values.city || null,
            state: values.state || null,
            country: values.country || null,
            location: values.locationType === 'Virtual' ? 'Global' : location || null,
            latitude: userProfile.location?.latitude || null,
            longitude: userProfile.location?.longitude || null,
            organizerId: user.uid,
            organizerName: `${userProfile.firstName} ${userProfile.lastName}`,
            organizerPhotoURL: userProfile.photoURL || '',
            createdAt: serverTimestamp(),
            memberIds: [user.uid],
            memberCount: 1,
            status: 'active' as const,
            hasGroupChat: false,
        };

        try {
            await runTransaction(firestore, async (transaction) => {
                transaction.set(newFellowshipRef, newFellowshipData);
                transaction.set(userFellowshipRef, { fellowshipId: newFellowshipRef.id, joinedAt: serverTimestamp() });
                transaction.set(fellowshipMemberRef, {
                    userId: user.uid,
                    firstName: userProfile.firstName,
                    lastName: userProfile.lastName,
                    photoURL: userProfile.photoURL || '',
                    joinedAt: serverTimestamp()
                });
            });
            toast({ title: `${values.groupType} Created!` });
            setActiveTab(values.groupType);
            closeAllDialogs();
        } catch (error: any) {
            console.error("Fellowship Creation Error:", error);
            const permissionError = new FirestorePermissionError({
              path: `fellowships/${newFellowshipRef.id}`,
              operation: 'create',
              requestResourceData: newFellowshipData
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateFellowship = async (values: any) => {
        if (!user || !fellowshipToManage) return;
        setIsSubmitting(true);
        const actualFellowshipRef = doc(firestore, 'fellowships', fellowshipToManage.id);
        
        const location = [values.city, values.state, values.country].filter(Boolean).join(', ');
        
        const updateData: { [key: string]: any } = {
            name: values.name,
            description: values.description,
            groupType: values.groupType,
            schedule: values.schedule,
            locationType: values.locationType,
            city: values.city || null,
            state: values.state || null,
            country: values.country || null,
            location: values.locationType === 'Virtual' ? 'Global' : location || null,
            streamUrl: values.streamUrl || null,
        };

        try {
            await updateDoc(actualFellowshipRef, updateData);
            toast({ title: 'Group Updated' });
            closeAllDialogs();
        } catch (e) {
            const permissionError = new FirestorePermissionError({ path: actualFellowshipRef.path, operation: 'update', requestResourceData: updateData }, user);
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteFellowship = async () => {
        if (!fellowshipToDelete || !user || !firestore) return;
        setIsDeleting(true);
        const fellowshipId = fellowshipToDelete.id;
        const fellowshipRef = doc(firestore, 'fellowships', fellowshipId);
        
        try {
            await updateDoc(fellowshipRef, { status: 'deleted' });

            const soulsRef = collection(firestore, 'souls');
            const [fSnapshot, aSnapshot] = await Promise.all([
                getDocs(query(soulsRef, where('fellowshipId', '==', fellowshipId))),
                getDocs(query(soulsRef, where('associationId', '==', fellowshipId)))
            ]);

            const cleanupTasks: Promise<any>[] = [];
            fSnapshot.docs.forEach(sDoc => {
                const sData = sDoc.data();
                const updates = { fellowshipId: deleteField(), fellowshipName: deleteField() };
                cleanupTasks.push(updateDoc(doc(firestore, 'souls', sDoc.id), updates));
                cleanupTasks.push(updateDoc(doc(firestore, 'users', sData.userId, 'souls', sDoc.id), updates));
            });
            aSnapshot.docs.forEach(sDoc => {
                const sData = sDoc.data();
                const updates = { associationId: deleteField(), associationName: deleteField() };
                cleanupTasks.push(updateDoc(doc(firestore, 'souls', sDoc.id), updates));
                cleanupTasks.push(updateDoc(doc(firestore, 'users', sData.userId, 'souls', sDoc.id), updates));
            });

            await Promise.all(cleanupTasks);

            toast({ title: 'Group Deleted', description: 'Associated souls have been automatically unassigned.' });
            closeAllDialogs();
        } catch (e: any) {
            console.error("Cleanup failed:", e);
            errorEmitter.emit('permission-error', new FirestorePermissionError({ 
                path: fellowshipRef.path, 
                operation: 'update',
                requestResourceData: { status: 'deleted' }
            }, user));
        } finally {
            setIsDeleting(false);
            closeAllDialogs();
        }
    };

    const handleCardClick = (fellowshipId: string) => {
        router.push(`/fellowship/${fellowshipId}`);
    };

    const activeFellowships = useMemo(() => {
        if (!fellowships) return [];
        return fellowships.filter(f => f.status !== 'deleted');
    }, [fellowships]);

    const tabFilteredFellowships = useMemo(() => {
        return activeFellowships.filter(f => (f.groupType || "Fellowship") === activeTab);
    }, [activeFellowships, activeTab]);

    const membershipFilterApplied = useMemo(() => {
      if (!user) return tabFilteredFellowships;
      if (membershipFilter === 'owned') return tabFilteredFellowships.filter(f => f.organizerId === user.uid);
      if (membershipFilter === 'joined') {
          const joinedIds = new Set(joinedFellowshipRefs?.map(r => r.fellowshipId));
          return tabFilteredFellowships.filter(f => joinedIds.has(f.id) && f.organizerId !== user.uid);
      }
      return tabFilteredFellowships;
    }, [tabFilteredFellowships, membershipFilter, user, joinedFellowshipRefs]);

    const filteredFellowships = useMemo(() => {
        if (!searchTerm) return membershipFilterApplied;
        const term = searchTerm.toLowerCase();
        return membershipFilterApplied.filter(f => 
            f.name.toLowerCase().includes(term) || 
            f.description.toLowerCase().includes(term) ||
            f.city?.toLowerCase().includes(term) ||
            f.state?.toLowerCase().includes(term) ||
            f.country?.toLowerCase().includes(term)
        );
    }, [membershipFilterApplied, searchTerm]);

    const interleavedFellowships = useMemo(() => {
        const list: (Fellowship & { isAd?: boolean; isGame?: boolean; adType?: 'business' | 'event' })[] = [];
        filteredFellowships.forEach((f, i) => {
            list.push(f);
            if ((i + 1) % 5 === 0) {
                list.push({ id: `game-${i}`, isGame: true } as any);
            }
            if ((i + 1) % 4 === 0 && (i + 1) % 5 !== 0) {
                list.push({ id: `ad-${i}`, isAd: true, adType: (i / 4) % 2 === 0 ? 'business' : 'event' } as any);
            }
        });
        return list;
    }, [filteredFellowships]);

    const loading = userLoading || profileLoading || fellowshipsLoading;

    return (
        <div className="w-full max-w-7xl mx-auto text-left">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-8 pb-32">
                    <Card className="border shadow-sm sm:shadow-md rounded-2xl bg-card/50 backdrop-blur-sm overflow-hidden">
                        <CardContent className="p-3 sm:p-6">
                        <div className="flex flex-row items-center gap-2 sm:gap-4 w-full">
                            <Button 
                                variant="outline" 
                                className="flex-1 justify-start text-muted-foreground font-normal rounded-full h-10 sm:h-12 px-6 hover:bg-muted/50 transition-colors text-sm sm:text-base min-w-0 border-dashed"
                                onClick={() => { setCreateType('Fellowship'); setIsCreateOpen(true); }}
                                disabled={loading}
                            >
                            <span className="truncate">
                                {loading ? "Preparing..." : "Start a new fellowship group?"}
                            </span>
                            </Button>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button 
                                    variant="secondary" 
                                    size="icon" 
                                    className="h-10 sm:h-12 w-10 sm:w-12 rounded-full shadow-lg"
                                    onClick={() => { setCreateType('Fellowship'); setIsCreateOpen(true); }}
                                    disabled={loading}
                                    title="New Fellowship"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-10 sm:h-12 w-10 sm:w-12 rounded-full shadow-md bg-background"
                                    onClick={() => { setCreateType('Association'); setIsCreateOpen(true); }}
                                    disabled={loading}
                                    title="New Association"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Group className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between px-0">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                                <TabsList className="grid w-full grid-cols-2 h-12 sm:h-14 bg-muted/40 p-1 rounded-2xl">
                                    <TabsTrigger value="Fellowship" className="font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl">Fellowships</TabsTrigger>
                                    <TabsTrigger value="Association" className="font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl">Associations</TabsTrigger>
                                </TabsList>
                            </Tabs>
                            <Tabs value={membershipFilter} onValueChange={setMembershipFilter} className="w-full sm:w-auto">
                                <TabsList className="grid w-full grid-cols-3 h-12 sm:h-14 bg-muted/40 p-1 rounded-2xl">
                                    <TabsTrigger value="all" className="font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl">All</TabsTrigger>
                                    <TabsTrigger value="owned" className="font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl">Mine</TabsTrigger>
                                    <TabsTrigger value="joined" className="font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl">Joined</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {loading ? (
                            <div className="flex flex-col gap-6 w-full">
                                {[...Array(3)].map((_, i) => (
                                    <Card key={i} className="rounded-2xl shadow-none h-40">
                                        <CardContent className="h-full animate-pulse bg-muted rounded-2xl" />
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6 w-full">
                                {interleavedFellowships.map((f: any) => (
                                    f.isGame ? (
                                        <BibleGameCard key={f.id} />
                                    ) : f.isAd ? (
                                        <KingdomAdSpot key={f.id} type={f.adType} />
                                    ) : (
                                        <FellowshipCard 
                                            key={f.id} 
                                            fellowship={f} 
                                            userProfile={userProfile ?? null} 
                                            onManage={() => setFellowshipToManage(f)} 
                                            onDelete={() => setFellowshipToDelete(f)} 
                                            onClick={() => handleCardClick(f.id)} 
                                        />
                                    )
                                ))}
                                {filteredFellowships.length === 0 && (
                                    <div className="col-span-full text-center py-32 px-8 flex flex-col items-center">
                                        <Users className="h-20 w-20 text-muted-foreground opacity-10 mb-6" />
                                        <h3 className="text-xl font-bold font-headline uppercase tracking-tight">No {activeTab.toLowerCase()}s Found</h3>
                                        <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-sm mx-auto">Try a different filter or start a new group in your area.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-4">
                    <FeedSidebar mode="fellowships" />
                </div>
            </div>

            {mounted && (
                isMobile ? (
                    <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                                <SheetHeader className="text-left p-0">
                                    <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">New Community Group</SheetTitle>
                                    <SheetDescription className="text-sm font-medium mt-1 text-left">Create a space for community and growth.</SheetDescription>
                                </SheetHeader>
                            </div>
                            <ScrollArea className="flex-grow">
                                <div className="p-8">
                                    <FellowshipForm 
                                        userProfile={userProfile ?? null} 
                                        onFormSubmit={handleCreateFellowship} 
                                        isSubmitting={isSubmitting} 
                                        defaultType={createType}
                                    />
                                </div>
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                ) : (
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-3xl border-none shadow-2xl text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10">
                                <DialogHeader className="text-left p-0">
                                    <DialogTitle className="text-2xl font-bold font-headline uppercase tracking-tight text-left">New Community Group</DialogTitle>
                                    <DialogDescription className="text-sm font-medium">Create a space for community and growth.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="flex-1 min-h-0">
                                <div className="p-8">
                                    <FellowshipForm 
                                        userProfile={userProfile ?? null} 
                                        onFormSubmit={handleCreateFellowship} 
                                        isSubmitting={isSubmitting} 
                                        defaultType={createType}
                                    />
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                )
            )}

            {fellowshipToManage && (
                mounted && isMobile ? (
                    <Sheet open={!!fellowshipToManage} onOpenChange={(open) => !open && closeAllDialogs()}>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                                <SheetHeader className="text-left p-0">
                                    <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Manage Group</SheetTitle>
                                    <SheetDescription className="text-sm font-medium mt-1">Update your group's details.</SheetDescription>
                                </SheetHeader>
                            </div>
                            <ScrollArea className="flex-grow">
                                <div className="p-8">
                                    <ManageFellowshipForm 
                                        fellowship={fellowshipToManage} 
                                        onFormSubmit={handleUpdateFellowship} 
                                        isSubmitting={isSubmitting} 
                                        onDelete={() => { setFellowshipToDelete(fellowshipToManage); setFellowshipToManage(null); }}
                                    />
                                </div>
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                ) : (
                    <Dialog open={!!fellowshipToManage} onOpenChange={(open) => !open && closeAllDialogs()}>
                        <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col overflow-hidden rounded-3xl border-none shadow-2xl text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10">
                                <DialogHeader className="text-left p-0">
                                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Manage Group</DialogTitle>
                                    <DialogDescription className="text-sm font-medium">Update your group's details.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="flex-1 min-h-0">
                                <div className="p-8">
                                     <ManageFellowshipForm 
                                        fellowship={fellowshipToManage} 
                                        onFormSubmit={handleUpdateFellowship} 
                                        isSubmitting={isSubmitting} 
                                        onDelete={() => { setFellowshipToDelete(fellowshipToManage); setFellowshipToManage(null); }}
                                    />
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                )
            )}

            {fellowshipToDelete && (
                <AlertDialog open={!!fellowshipToDelete} onOpenChange={(open) => !open && closeAllDialogs()}>
                    <AlertDialogContent className="w-[90vw] max-w-lg rounded-[2rem] p-8 border-none shadow-2xl text-left">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black font-headline leading-tight">Delete Group?</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                                Are you sure you want to permanently remove this group? All assigned souls will be unassigned from this spiritual history.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-3 mt-6">
                            <AlertDialogCancel className="rounded-2xl h-12 font-bold">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteFellowship} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold text-center">
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Confirm Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}

export default function FellowshipStandalonePage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
        <FellowshipDashboardContent />
      </Suspense>
    </AppShell>
  );
}
