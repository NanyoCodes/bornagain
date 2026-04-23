
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { PlusCircle, HeartHandshake, Loader2, Users, MoreVertical, Trash2, PlayCircle, Edit } from 'lucide-react';
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

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters.").max(100),
  description: z.string().min(10, "Description must be at least 10 characters.").max(500),
  schedule: z.string().min(3, "Schedule is required.").max(100),
  streamUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

function FellowshipForm({ onFormSubmit, isSubmitting }: { onFormSubmit: (values: z.infer<typeof formSchema>) => void, isSubmitting: boolean }) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            schedule: "",
            streamUrl: "",
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

const manageFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters.").max(100),
  description: z.string().min(10, "Description must be at least 10 characters.").max(500),
  schedule: z.string().min(3, "Schedule is required.").max(100),
  streamUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

function ManageFellowshipForm({ fellowship, onFormSubmit, isSubmitting }: { fellowship: Fellowship, onFormSubmit: (values: z.infer<typeof manageFormSchema>) => void, isSubmitting: boolean }) {
  const form = useForm<z.infer<typeof manageFormSchema>>({
    resolver: zodResolver(manageFormSchema),
    defaultValues: {
      name: fellowship.name || "",
      description: fellowship.description || "",
      schedule: fellowship.schedule || "",
      streamUrl: fellowship.streamUrl || "",
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


function FellowshipCard({ fellowship, userProfile, onManage }: { fellowship: Fellowship; userProfile: UserProfile | null; onManage: () => void; }) {
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
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle>{fellowship.name}</CardTitle>
                    {isOrganizer && (
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
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
                    {fellowship.location && <p><strong>Location:</strong> {fellowship.location}</p>}
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
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fellowshipToManage, setFellowshipToManage] = useState<Fellowship | null>(null);
    
    const userDocRef = useMemo(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

    const fellowshipsQuery = useMemo(() => query(collection(firestore, "fellowships"), orderBy("createdAt", "desc")), [firestore]);
    const { data: fellowships, loading: fellowshipsLoading } = useCollection<Fellowship>(fellowshipsQuery);
    
    const activeFellowships = useMemo(() => {
        if (!fellowships) return [];
        return fellowships;
    }, [fellowships]);

    const loading = userLoading || profileLoading || fellowshipsLoading;

    const handleCreateFellowship = async (values: z.infer<typeof formSchema>) => {
        if (!user || !userProfile || !firestore) return;
        
        setIsSubmitting(true);

        const newFellowshipRef = doc(collection(firestore, "fellowships"));
        const userFellowshipRef = doc(firestore, 'users', user.uid, 'fellowships', newFellowshipRef.id);
        const fellowshipMemberRef = doc(firestore, 'fellowships', newFellowshipRef.id, 'members', user.uid);
        
        let locationString = 'Not specified';
        if (userProfile.churchInfo?.name) {
            locationString = [userProfile.churchInfo.name, userProfile.churchInfo.location].filter(Boolean).join(', ');
        } else if (userProfile.location?.city) {
            locationString = [userProfile.location.city, userProfile.location.country].filter(Boolean).join(', ');
        }


        const newFellowshipData = {
            name: values.name,
            description: values.description,
            schedule: values.schedule,
            streamUrl: values.streamUrl || null,
            location: locationString,
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
    
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-headline">Fellowship Groups</h1>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button disabled={loading}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Create Fellowship
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create a New Fellowship</DialogTitle>
                            <DialogDescription>Fill in the details to start your group.</DialogDescription>
                        </DialogHeader>
                        <FellowshipForm onFormSubmit={handleCreateFellowship} isSubmitting={isSubmitting} />
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>
                    ))}
                </div>
            ) : activeFellowships && activeFellowships.length > 0 ? (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {activeFellowships.map(f => <FellowshipCard key={f.id} fellowship={f} userProfile={userProfile} onManage={() => setFellowshipToManage(f)} />)}
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
