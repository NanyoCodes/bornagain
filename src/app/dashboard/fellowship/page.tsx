
'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, addDoc, serverTimestamp, doc, runTransaction, arrayUnion, increment, updateDoc } from "firebase/firestore";
import type { UserProfile, Fellowship } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, HeartHandshake, Loader2, Users, MoreVertical, PlayCircle, Edit } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { haversineDistance, safeToDate } from '@/lib/utils';
import Link from 'next/link';
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
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters.").max(100),
  description: z.string().min(10, "Description must be at least 10 characters.").max(500),
  schedule: z.string().min(3, "Schedule is required.").max(100),
  streamUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  locationType: z.enum(['Physical', 'Virtual', 'Hybrid'], { required_error: "Please select a location type." }),
  location: z.string().max(100).optional(),
}).refine((data) => {
    if (data.locationType === 'Physical' || data.locationType === 'Hybrid') {
        return !!data.location && data.location.trim().length > 2;
    }
    return true;
}, {
    message: "Location is required for physical or hybrid meetings.",
    path: ["location"],
});


function FellowshipForm({ onFormSubmit, isSubmitting }: { onFormSubmit: (values: z.infer<typeof formSchema>) => void, isSubmitting: boolean }) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            schedule: "",
            streamUrl: "",
            locationType: 'Physical',
            location: '',
        },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Fellowship Name</FormLabel>
                        <FormControl><Input placeholder="e.g., Downtown Morning Prayer" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea placeholder="What is the purpose of this fellowship?" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="schedule" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Schedule</FormLabel>
                        <FormControl><Input placeholder="e.g., Every Friday at 6:00 AM" {...field} /></FormControl>
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
                                <RadioGroupItem value="Hybrid" />
                                </FormControl>
                                <FormLabel className="font-normal">Hybrid</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                {(form.watch('locationType') === 'Physical' || form.watch('locationType') === 'Hybrid') && (
                    <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Physical Location</FormLabel>
                            <FormControl><Input placeholder="e.g., 123 Main St, Anytown" {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                )}
                <FormField control={form.control} name="streamUrl" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Live Stream URL (Optional)</FormLabel>
                        <FormControl><Input placeholder="https://youtube.com/live/..." {...field} value={field.value ?? ''} /></FormControl>
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
                <FormLabel>Fellowship Name</FormLabel>
                <FormControl><Input placeholder="e.g., Downtown Morning Prayer" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="What is the purpose of this fellowship?" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="schedule" render={({ field }) => (
            <FormItem>
                <FormLabel>Schedule</FormLabel>
                <FormControl><Input placeholder="e.g., Every Friday at 6:00 AM" {...field} /></FormControl>
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
                        <RadioGroupItem value="Hybrid" />
                        </FormControl>
                        <FormLabel className="font-normal">Hybrid</FormLabel>
                    </FormItem>
                    </RadioGroup>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        {(form.watch('locationType') === 'Physical' || form.watch('locationType') === 'Hybrid') && (
            <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                    <FormLabel>Physical Location</FormLabel>
                    <FormControl><Input placeholder="e.g., 123 Main St, Anytown" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
        )}
        <FormField control={form.control} name="streamUrl" render={({ field }) => (
            <FormItem>
                <FormLabel>Live Stream URL (Optional)</FormLabel>
                <FormControl><Input placeholder="https://youtube.com/live/..." {...field} value={field.value ?? ''} /></FormControl>
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


function FellowshipCard({ fellowship, userProfile, onManage, onClick }: { fellowship: Fellowship; userProfile: UserProfile | null; onManage: () => void; onClick?: () => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isJoining, setIsJoining] = useState(false);
    const isMember = user ? fellowship.memberIds.includes(user.uid) : false;
    const isOrganizer = user ? fellowship.organizerId === user.uid : false;
    
    const distance = useMemo(() => {
        if (!userProfile?.location?.latitude || !userProfile?.location?.longitude || !fellowship.latitude || !fellowship.longitude) {
            return null;
        }
        return haversineDistance(
            { lat: userProfile.location.latitude, lng: userProfile.location.longitude },
            { lat: fellowship.latitude, lng: fellowship.longitude }
        );
    }, [userProfile, fellowship]);

    const handleJoin = async () => {
        if (!user || !userProfile || !firestore || isMember || isOrganizer) return;
        setIsJoining(true);

        const fellowshipRef = doc(firestore, "fellowships", fellowship.id);
        const userFellowshipRef = doc(firestore, 'users', user.uid, 'fellowships', fellowship.id);
        const fellowshipMemberRef = doc(firestore, 'fellowships', fellowship.id, 'members', user.uid);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const fellowshipDoc = await transaction.get(fellowshipRef);
                if (!fellowshipDoc.exists()) throw new Error("Fellowship no longer exists.");

                transaction.update(fellowshipRef, {
                    memberIds: arrayUnion(user.uid),
                    memberCount: increment(1)
                });
                transaction.set(userFellowshipRef, { fellowshipId: fellowship.id, joinedAt: serverTimestamp() });
                transaction.set(fellowshipMemberRef, {
                    userId: user.uid,
                    firstName: userProfile.firstName,
                    lastName: userProfile.lastName,
                    photoURL: userProfile.photoURL || '',
                    joinedAt: serverTimestamp()
                });
            });
            toast({ title: "Successfully Joined!", description: `You are now a member of ${fellowship.name}.`});
        } catch (e) {
            const permissionError = new FirestorePermissionError({ path: `fellowships/${fellowship.id}`, operation: 'update' }, user);
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <Card onClick={onClick} className="cursor-pointer">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle>{fellowship.name}</CardTitle>
                    <div className="flex items-center gap-2">
                        {fellowship.locationType && <Badge variant="secondary">{fellowship.locationType}</Badge>}
                        {isOrganizer && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={onManage}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Manage
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
                <CardDescription className="flex items-center gap-2 pt-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={fellowship.organizerPhotoURL} />
                        <AvatarFallback>{fellowship.organizerName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    Organized by {fellowship.organizerName}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{fellowship.description}</p>
                <div className="text-sm">
                    <p><strong>Schedule:</strong> {fellowship.schedule}</p>
                    {fellowship.location && (fellowship.locationType === 'Physical' || fellowship.locationType === 'Hybrid') && (
                        <p><strong>Location:</strong> {fellowship.location}</p>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" /> {fellowship.memberCount} member(s)
                </div>
                 {distance !== null && <p className="text-xs text-muted-foreground">{distance.toFixed(1)} km away</p>}
                <div className="flex items-center gap-2">
                    {fellowship.streamUrl && (
                        <Button asChild variant="outline" size="sm">
                            <Link href={fellowship.streamUrl} target="_blank" rel="noopener noreferrer">
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Stream
                            </Link>
                        </Button>
                    )}
                    {!isOrganizer && (
                        <Button onClick={handleJoin} disabled={isMember || isJoining} size="sm">
                            {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {isMember ? 'Joined' : 'Join'}
                        </Button>
                    )}
                </div>
            </CardFooter>
        </Card>
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
            location: values.locationType === 'Physical' || values.locationType === 'Hybrid' ? values.location : null,
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
                location: values.locationType === 'Physical' || values.locationType === 'Hybrid' ? values.location : null,
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

    const formContent = <FellowshipForm onFormSubmit={handleCreateFellowship} isSubmitting={isSubmitting} />;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-headline">Fellowship Groups</h1>
                </div>
                {mounted && isMobile ? (
                    <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
                        <SheetContent side="bottom">
                            <SheetHeader>
                                <SheetTitle>Create a New Fellowship</SheetTitle>
                                <SheetDescription>Fill in the details to start your group.</SheetDescription>
                            </SheetHeader>
                            <div className="max-h-[80vh] overflow-y-auto p-1 mt-4">
                                {formContent}
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
                    {activeFellowships.map(f => <FellowshipCard key={f.id} fellowship={f} userProfile={userProfile} onManage={() => setFellowshipToManage(f)} onClick={() => handleCardClick(f.id)} />)}
                </div>
            ) : (
                <div className="text-center py-12 flex flex-col items-center">
                    <HeartHandshake className="h-16 w-16 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">No Fellowships Yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Be the first to create a fellowship group!</p>
                </div>
            )}

            {fellowshipToManage && (
                <Dialog open={!!fellowshipToManage} onOpenChange={() => setFellowshipToManage(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Manage Fellowship</DialogTitle>
                            <DialogDescription>Edit the details of your fellowship group.</DialogDescription>
                        </DialogHeader>
                        <ManageFellowshipForm fellowship={fellowshipToManage} onFormSubmit={handleUpdateFellowship} isSubmitting={isSubmitting} />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
