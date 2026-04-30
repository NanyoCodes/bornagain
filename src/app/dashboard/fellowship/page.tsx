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
import { PlusCircle, HeartHandshake, Loader2, Trash2, Video } from 'lucide-react';
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
import AdsenseAd from '@/components/common/adsense-ad';
import { generateGoogleMeetLink } from '@/lib/utils';

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
        const link = generateGoogleMeetLink();
        form.setValue('streamUrl', link, { shouldDirty: true, shouldValidate: true });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Fellowship Name</FormLabel>
                        <FormControl><Input placeholder="e.g., Downtown Morning Prayer" {...field} className="text-base" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea placeholder="What is the purpose of this fellowship?" {...field} className="text-base min-h-[100px]" /></FormControl>
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
                                <FormLabel className="font-normal">Physical and Virtual</FormLabel>
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
                            <FormControl><Input placeholder="e.g., 123 Main St, Anytown" {...field} value={field.value ?? ''} className="text-base" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                )}
                <FormField control={form.control} name="streamUrl" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Meeting or Stream URL (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder="https://..." {...field} value={field.value ?? ''} className="text-base" />
                        </FormControl>
                        <Button type="button" variant="outline" size="sm" onClick={handleCreateMeet} className="mt-1">
                          <Video className="mr-2 h-4 w-4" />
                          Create Google Meet
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

const manageFormSchema = formSchema; // Use the same schema for management

function ManageFellowshipForm({ fellowship, onFormSubmit, isSubmitting }: { fellowship: Fellowship, onFormSubmit: (values: z.infer<typeof manageFormSchema>) => void, isSubmitting: boolean }) {
  const form = useForm<z.infer<typeof manageFormSchema>>({
    resolver: zodResolver(manageFormSchema),
    defaultValues: {
      name: fellowship.name || "",
      description: fellowship.description || "",
      schedule: fellowship.schedule || "",
      streamUrl: fellowship.streamUrl || "",
      locationType: fellowship.locationType || 'Physical',
      location: fellowship.location || "",
    },
  });

  const handleCreateMeet = () => {
    const link = generateGoogleMeetLink();
    form.setValue('streamUrl', link, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
                <FormLabel>Fellowship Name</FormLabel>
                <FormControl><Input placeholder="e.g., Downtown Morning Prayer" {...field} className="text-base" /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="What is the purpose of this fellowship?" {...field} className="text-base min-h-[100px]" /></FormControl>
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
                        <FormLabel className="font-normal">Physical and Virtual</FormLabel>
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
                    <FormControl><Input placeholder="e.g., 123 Main St, Anytown" {...field} value={field.value ?? ''} className="text-base" /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
        )}
        <FormField control={form.control} name="streamUrl" render={({ field }) => (
            <FormItem>
                <FormLabel>Meeting or Stream URL (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="https://..." {...field} value={field.value ?? ''} className="text-base" />
                </FormControl>
                <Button type="button" variant="outline" size="sm" onClick={handleCreateMeet} className="mt-1">
                  <Video className="mr-2 h-4 w-4" />
                  Create Google Meet
                </Button>
                <FormMessage />
            </FormItem>
        )} />
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
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fellowshipToManage, setFellowshipToManage] = useState<Fellowship | null>(null);
    const [fellowshipToDelete, setFellowshipToDelete] = useState<Fellowship | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [mounted, setMounted] = useState(false);
    const isMobile = useIsMobile();
    
    useEffect(() => {
        setMounted(true);
    }, []);

    const userDocRef = useMemo(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

    const fellowshipsQuery = useMemo(() => query(collection(firestore, "fellowships"), orderBy("createdAt", "desc")), [firestore]);
    const { data: fellowships, loading: fellowshipsLoading } = useCollection<Fellowship>(fellowshipsQuery);
    
    const activeFellowships = useMemo(() => {
        if (!fellowships) return [];
        return fellowships.filter(f => f.status !== 'deleted');
    }, [fellowships]);

    const loading = userLoading || profileLoading || fellowshipsLoading;

    const handleCardClick = (fellowshipId: string) => {
        router.push(`/dashboard/fellowship/${fellowshipId}`);
    };

    const handleDeleteFellowship = async () => {
        if (!fellowshipToDelete || !user || !firestore) return;
        setIsDeleting(true);
        const fellowshipRef = doc(firestore, 'fellowships', fellowshipToDelete.id);
        const deleteData = {
            status: 'deleted' as const,
        };
        
        try {
            await updateDoc(fellowshipRef, deleteData);
            toast({ title: 'Fellowship Deleted', description: 'The fellowship group has been deleted.' });
            setFellowshipToDelete(null);
        } catch (e) {
            const permissionError = new FirestorePermissionError({ path: fellowshipRef.path, operation: 'update' }, user);
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsDeleting(false);
        }
    };

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
            location: values.locationType === 'Physical' || values.locationType === 'Physical and Virtual' ? values.location : null,
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
            toast({ title: "Fellowship Created!", description: "Your new fellowship group is now live." });
            setIsCreateOpen(false);
        } catch (e) {
            const permissionError = new FirestorePermissionError({ path: 'fellowships', operation: 'create' }, user);
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateFellowship = async (values: z.infer<typeof manageFormSchema>) => {
        if (!user || !fellowshipToManage) return;
        setIsSubmitting(true);
        const fellowshipRef = doc(firestore, 'fellowships', fellowshipToManage.id);
        
        try {
            await updateDoc(fellowshipRef, {
                name: values.name,
                description: values.description,
                schedule: values.schedule,
                streamUrl: values.streamUrl || null,
                locationType: values.locationType,
                location: values.locationType === 'Physical' || values.locationType === 'Physical and Virtual' ? values.location : null,
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
    
    const triggerButton = (
        <Button disabled={loading} size={isMobile ? 'icon' : 'default'}>
            <PlusCircle className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Create Fellowship</span>
        </Button>
    );

    const formContent = <FellowshipForm userProfile={userProfile ?? null} onFormSubmit={handleCreateFellowship} isSubmitting={isSubmitting} />;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-headline">Fellowship Groups</h1>
                </div>
                {mounted && isMobile ? (
                    <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0">
                            <div className="p-6 border-b flex-shrink-0">
                                <SheetHeader>
                                    <SheetTitle>Create a New Fellowship</SheetTitle>
                                    <SheetDescription>Fill in the details to start your group.</SheetDescription>
                                </SheetHeader>
                            </div>
                            <div className="flex-grow overflow-y-auto p-6 pt-2">
                                {formContent}
                                <Button variant="ghost" className="w-full mt-4" onClick={() => setIsCreateOpen(false)}>Close</Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                ) : (
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create a New Fellowship</DialogTitle>
                                <DialogDescription>Fill in the details to start your group.</DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[70vh] overflow-y-auto pr-2">
                                {formContent}
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>
                    ))}
                </div>
            ) : activeFellowships && activeFellowships.length > 0 ? (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {activeFellowships.map((f, index) => (
                      <Fragment key={f.id}>
                        <FellowshipCard 
                          fellowship={f} 
                          userProfile={userProfile ?? null} 
                          onManage={() => setFellowshipToManage(f)} 
                          onDelete={() => setFellowshipToDelete(f)} 
                          onClick={() => handleCardClick(f.id)} 
                        />
                        {(index + 1) % 4 === 0 && (
                          <AdsenseAd adSlot={`fellowships-grid-ad-${index}`} className="h-full" />
                        )}
                      </Fragment>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 flex flex-col items-center">
                    <HeartHandshake className="h-16 w-16 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">No Fellowships Yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Be the first to create a fellowship group!</p>
                </div>
            )}

            {fellowshipToManage && (
                mounted && isMobile ? (
                    <Sheet open={!!fellowshipToManage} onOpenChange={(open) => !open && setFellowshipToManage(null)}>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0">
                            <div className="p-6 border-b flex-shrink-0">
                                <SheetHeader>
                                    <SheetTitle>Manage Fellowship</SheetTitle>
                                    <SheetDescription>Edit the details of your fellowship group.</SheetDescription>
                                </SheetHeader>
                            </div>
                            <div className="flex-grow overflow-y-auto p-6 pt-2">
                                <ManageFellowshipForm fellowship={fellowshipToManage} onFormSubmit={handleUpdateFellowship} isSubmitting={isSubmitting} />
                                <Button variant="ghost" className="w-full mt-4" onClick={() => setFellowshipToManage(null)}>Close</Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                ) : (
                    <Dialog open={!!fellowshipToManage} onOpenChange={() => setFellowshipToManage(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Manage Fellowship</DialogTitle>
                                <DialogDescription>Edit the details of your fellowship group.</DialogDescription>
                            </DialogHeader>
                            <ManageFellowshipForm fellowship={fellowshipToManage} onFormSubmit={handleUpdateFellowship} isSubmitting={isSubmitting} />
                        </DialogContent>
                    </Dialog>
                )
            )}

            {fellowshipToDelete && (
                <AlertDialog open={!!fellowshipToDelete} onOpenChange={() => setFellowshipToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <div className="text-sm text-muted-foreground">
                                This will mark the fellowship as deleted and hide it from the list. This action cannot be undone.
                            </div>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteFellowship} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Deletion
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
