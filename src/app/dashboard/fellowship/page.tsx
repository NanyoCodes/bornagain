'use client';

import { useState, useMemo, useEffect, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { collection, query, orderBy, addDoc, serverTimestamp, doc, runTransaction, arrayUnion, increment, updateDoc } from "firebase/firestore";
import type { UserProfile, Fellowship } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, HeartHandshake, Loader2, Trash2, Video, Search } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useRouter } from 'next/navigation';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FellowshipCard } from '@/components/fellowship/fellowship-card';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useSearch } from '@/context/search-context';

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters.").max(100),
  description: z.string().min(10, "Description must be at least 10 characters.").max(500),
  schedule: z.string().min(3, "Schedule is required.").max(100),
  streamUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  locationType: z.enum(['Physical', 'Virtual', 'Physical and Virtual'], { required_error: "Please select a location type." }),
  location: z.string().max(100).optional(),
}).refine((data) => {
    if (data.locationType === 'Physical' || data.locationType === 'Physical and Virtual') {
        return !!data.location && data.location.trim().length > 2;
    }
    return true;
}, {
    message: "Location is required for physical or 'Physical and Virtual' meetings.",
    path: ["location"],
});

function FellowshipForm({ userProfile, onFormSubmit, isSubmitting }: { userProfile: UserProfile | null, onFormSubmit: (values: z.infer<typeof formSchema>) => void, isSubmitting: boolean }) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            schedule: "",
            streamUrl: userProfile?.defaultMeetingLink || "",
            locationType: 'Physical',
            location: '',
        },
    });

    const handleCreateMeet = () => {
        window.open('https://meet.google.com/new', '_blank');
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Fellowship Name</FormLabel>
                        <FormControl><Input placeholder="e.g., Morning Prayer" {...field} className="text-base" /></FormControl>
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
                        <FormControl><Input placeholder="e.g., Every Friday at 6:00 AM" {...field} className="text-base" /></FormControl>
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
                            className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"
                            >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="Physical" />
                                </FormControl>
                                <FormLabel className="font-normal">Physical</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="Virtual" />
                                </FormControl>
                                <FormLabel className="font-normal">Virtual</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="Physical and Virtual" />
                                </FormControl>
                                <FormLabel className="font-normal">Both</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                {(form.watch('locationType') === 'Physical' || form.watch('locationType') === 'Physical and Virtual') && (
                    <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Physical Location</FormLabel>
                            <FormControl><Input placeholder="Address or City" {...field} value={field.value ?? ''} className="text-base" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                )}
                <FormField control={form.control} name="streamUrl" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Meeting URL (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder="https://..." {...field} value={field.value ?? ''} className="text-base" />
                        </FormControl>
                        <Button type="button" variant="outline" size="sm" onClick={handleCreateMeet} className="mt-1">
                          <Video className="mr-2 h-4 w-4" />
                          Google Meet
                        </Button>
                        <FormMessage />
                    </FormItem>
                )} />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Fellowship
                </Button>
            </form>
        </Form>
    );
}

function ManageFellowshipForm({ fellowship, onFormSubmit, isSubmitting }: { fellowship: Fellowship, onFormSubmit: (values: any) => void, isSubmitting: boolean }) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: fellowship.name || "",
      description: fellowship.description || "",
      schedule: fellowship.schedule || "",
      streamUrl: fellowship.streamUrl || "",
      locationType: fellowship.locationType || 'Physical',
      location: fellowship.location || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
                <FormLabel>Fellowship Name</FormLabel>
                <FormControl><Input {...field} className="text-base" /></FormControl>
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
                <FormControl><Input {...field} className="text-base" /></FormControl>
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
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Physical" /></FormControl>
                            <FormLabel className="font-normal">Physical</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Virtual" /></FormControl>
                            <FormLabel className="font-normal">Virtual</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Physical and Virtual" /></FormControl>
                            <FormLabel className="font-normal">Both</FormLabel>
                        </FormItem>
                    </RadioGroup>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
        </Button>
      </form>
    </Form>
  );
}

export default function FellowshipPage() {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();
    
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fellowshipToManage, setFellowshipToManage] = useState<Fellowship | null>(null);
    const [fellowshipToDelete, setFellowshipToDelete] = useState<Fellowship | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
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

    const userDocRef = useMemo(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

    const fellowshipsQuery = useMemo(() => query(collection(firestore, "fellowships"), orderBy("createdAt", "desc")), [firestore]);
    const { data: fellowships, loading: fellowshipsLoading } = useCollection<Fellowship>(fellowshipsQuery);
    
    const handleCreateFellowship = async (values: z.infer<typeof formSchema>) => {
        if (!user || !userProfile || !firestore) return;
        setIsSubmitting(true);

        const newFellowshipRef = doc(collection(firestore, "fellowships"));
        const userFellowshipRef = doc(firestore, 'users', user.uid, 'fellowships', newFellowshipRef.id);
        const fellowshipMemberRef = doc(firestore, 'fellowships', newFellowshipRef.id, 'members', user.uid);

        const newFellowshipData = {
            name: values.name,
            description: values.description,
            schedule: values.schedule,
            streamUrl: values.streamUrl || null,
            locationType: values.locationType,
            location: values.location || null,
            latitude: userProfile.location?.latitude || null,
            longitude: userProfile.location?.longitude || null,
            organizerId: user.uid,
            organizerName: `${userProfile.firstName} ${userProfile.lastName}`,
            organizerPhotoURL: userProfile.photoURL || '',
            createdAt: serverTimestamp(),
            memberIds: [user.uid],
            memberCount: 1,
            status: 'active' as const,
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
            toast({ title: "Fellowship Created!" });
            setIsCreateOpen(false);
        } catch (e) {
            const permissionError = new FirestorePermissionError({ path: 'fellowships', operation: 'create' }, user);
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateFellowship = async (values: any) => {
        if (!user || !fellowshipToManage) return;
        setIsSubmitting(true);
        const fellowshipRef = doc(firestore, 'fellowships', fellowshipToManage.id);
        try {
            await updateDoc(fellowshipRef, {
                name: values.name,
                description: values.description,
                schedule: values.schedule,
                locationType: values.locationType,
            });
            toast({ title: 'Fellowship Updated' });
            setFellowshipToManage(null);
        } catch (e) {
            const permissionError = new FirestorePermissionError({ path: `fellowships/${fellowshipToManage.id}`, operation: 'update' }, user);
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteFellowship = async () => {
        if (!fellowshipToDelete || !user || !firestore) return;
        setIsDeleting(true);
        const fellowshipRef = doc(firestore, 'fellowships', fellowshipToDelete.id);
        try {
            await updateDoc(fellowshipRef, { status: 'deleted' });
            toast({ title: 'Fellowship Deleted' });
            setFellowshipToDelete(null);
        } catch (e) {
            const permissionError = new FirestorePermissionError({ path: fellowshipRef.path, operation: 'update' }, user);
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCardClick = (fellowshipId: string) => {
        router.push(`/dashboard/fellowship/${fellowshipId}`);
    };

    const activeFellowships = useMemo(() => {
        if (!fellowships) return [];
        return fellowships.filter(f => f.status !== 'deleted');
    }, [fellowships]);

    const filteredFellowships = useMemo(() => {
        if (!activeFellowships) return [];
        if (!searchTerm) return activeFellowships;
        const term = searchTerm.toLowerCase();
        return activeFellowships.filter(f => 
            f.name.toLowerCase().includes(term) || 
            f.description.toLowerCase().includes(term)
        );
    }, [activeFellowships, searchTerm]);

    const loading = userLoading || profileLoading || fellowshipsLoading;

    const triggerButton = (
        <Button disabled={loading}>
            <PlusCircle className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">New Fellowship</span>
        </Button>
    );

    const formContent = <FellowshipForm userProfile={userProfile ?? null} onFormSubmit={handleCreateFellowship} isSubmitting={isSubmitting} />;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-headline">Fellowships</h1>
                {mounted && isMobile ? (
                    <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0">
                            <div className="p-6 border-b flex-shrink-0">
                                <SheetHeader>
                                    <SheetTitle>New Fellowship</SheetTitle>
                                </SheetHeader>
                            </div>
                            <div className="flex-grow overflow-y-auto p-6">
                                {formContent}
                            </div>
                        </SheetContent>
                    </Sheet>
                ) : (
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>New Fellowship</DialogTitle>
                            </DialogHeader>
                            {formContent}
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}><CardContent className="h-40 animate-pulse bg-muted rounded-lg" /></Card>
                    ))}
                </div>
            ) : (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredFellowships.map((f) => (
                        <FellowshipCard 
                          key={f.id}
                          fellowship={f} 
                          userProfile={userProfile ?? null} 
                          onManage={() => setFellowshipToManage(f)} 
                          onDelete={() => setFellowshipToDelete(f)} 
                          onClick={() => handleCardClick(f.id)} 
                        />
                    ))}
                </div>
            )}

            {fellowshipToManage && (
                <Dialog open={!!fellowshipToManage} onOpenChange={() => setFellowshipToManage(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Manage Fellowship</DialogTitle></DialogHeader>
                        <ManageFellowshipForm fellowship={fellowshipToManage} onFormSubmit={handleUpdateFellowship} isSubmitting={isSubmitting} />
                    </DialogContent>
                </Dialog>
            )}

            {fellowshipToDelete && (
                <AlertDialog open={!!fellowshipToDelete} onOpenChange={() => setFellowshipToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete Fellowship?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteFellowship} disabled={isDeleting} className="bg-destructive">
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
