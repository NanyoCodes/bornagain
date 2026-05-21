'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { collection, query, orderBy, serverTimestamp, doc, runTransaction, updateDoc, writeBatch } from "firebase/firestore";
import type { UserProfile, Fellowship, FellowshipMember } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Loader2, Video, Users, Group, Target, MessagesSquare, Trash2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { useRouter } from 'next/navigation';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FellowshipCard } from '@/components/fellowship/fellowship-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearch } from '@/context/search-context';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters.").max(100),
  description: z.string().min(10, "Description must be at least 10 characters.").max(500),
  groupType: z.enum(['Fellowship', 'Association']),
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
            location: '',
        },
    });

    // Sync default type if it changes from parent
    useEffect(() => {
        form.setValue('groupType', defaultType);
    }, [defaultType, form]);

    const handleCreateMeet = () => {
        window.open('https://meet.google.com/new', '_blank');
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
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
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="Fellowship" />
                                </FormControl>
                                <FormLabel className="font-normal">Fellowship Group</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="Association" />
                                </FormControl>
                                <FormLabel className="font-normal">Association</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><Input placeholder={form.watch('groupType') === 'Fellowship' ? "e.g., Morning Prayer" : "e.g., Youth Association"} {...field} className="text-base" /></FormControl>
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
                                className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0"
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
                <Button type="submit" disabled={isSubmitting} className="w-full h-11 text-lg">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create {form.watch('groupType')}
                </Button>
            </form>
        </Form>
    );
}

function ManageFellowshipForm({ fellowship, onFormSubmit, isSubmitting, onDelete }: { fellowship: Fellowship, onFormSubmit: (values: any) => void, isSubmitting: boolean, onDelete: () => void }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const membersQuery = useMemo(() => {
    if (!firestore || !fellowship.id) return null;
    return query(collection(firestore, 'fellowships', fellowship.id, 'members'), orderBy('joinedAt', 'asc'));
  }, [firestore, fellowship.id]);
  const { data: members, loading: membersLoading } = useCollection<FellowshipMember>(membersQuery);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: fellowship.name || "",
      description: fellowship.description || "",
      groupType: fellowship.groupType || "Fellowship",
      schedule: fellowship.schedule || "",
      streamUrl: fellowship.streamUrl || "",
      locationType: fellowship.locationType || 'Physical',
      location: fellowship.location || "",
    },
  });

  return (
    <div className="space-y-8">
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
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="Fellowship" /></FormControl>
                                <FormLabel className="font-normal">Fellowship</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="Association" /></FormControl>
                                <FormLabel className="font-normal">Association</FormLabel>
                            </FormItem>
                        </RadioGroup>
                    </FormControl>
                    </FormItem>
                )}
            />
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                    <FormLabel>Name</FormLabel>
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
                        <RadioGroup 
                            onValueChange={field.onChange} 
                            defaultValue={field.value} 
                            className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0"
                        >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="Physical" /></FormControl>
                                <FormLabel className="font-normal">Physical</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="Virtual" /></FormControl>
                                <FormLabel className="font-normal">Virtual</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="Both" /></FormControl>
                                <FormLabel className="font-normal">Both</FormLabel>
                            </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <Button type="submit" disabled={isSubmitting} className="w-full h-11">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </form>
        </Form>

        <Separator />

        <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2"><Trash2 className="h-4 w-4" /> Delete Group</CardTitle>
                <CardDescription>Permanently remove this {fellowship.groupType.toLowerCase()} from Testify.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant="destructive" onClick={onDelete}>Delete Permanently</Button>
            </CardContent>
        </Card>
    </div>
  );
}

export default function FellowshipPage() {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();
    
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createType, setCreateType] = useState<'Fellowship' | 'Association'>('Fellowship');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fellowshipToManage, setFellowshipToManage] = useState<Fellowship | null>(null);
    const [fellowshipToDelete, setFellowshipToDelete] = useState<Fellowship | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState("Fellowship");
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
    
    const handleCreateFellowship = async (values: z.infer<typeof formSchema>) => {
        if (!user || !userProfile || !firestore) return;
        setIsSubmitting(true);

        const newFellowshipRef = doc(collection(firestore, "fellowships"));
        const userFellowshipRef = doc(firestore, 'users', user.uid, 'fellowships', newFellowshipRef.id);
        const fellowshipMemberRef = doc(firestore, 'fellowships', newFellowshipRef.id, 'members', user.uid);

        const newFellowshipData = {
            name: values.name,
            description: values.description,
            groupType: values.groupType,
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
                groupType: values.groupType,
                schedule: values.schedule,
                locationType: values.locationType,
            });
            toast({ title: 'Group Updated' });
            closeAllDialogs();
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
            toast({ title: 'Group Deleted' });
            closeAllDialogs();
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

    const tabFilteredFellowships = useMemo(() => {
        return activeFellowships.filter(f => (f.groupType || "Fellowship") === activeTab);
    }, [activeFellowships, activeTab]);

    const filteredFellowships = useMemo(() => {
        if (!searchTerm) return tabFilteredFellowships;
        const term = searchTerm.toLowerCase();
        return tabFilteredFellowships.filter(f => 
            f.name.toLowerCase().includes(term) || 
            f.description.toLowerCase().includes(term)
        );
    }, [tabFilteredFellowships, searchTerm]);

    const loading = userLoading || profileLoading || fellowshipsLoading;

    return (
        <div className="space-y-8">
            {/* Centered Interaction Box */}
            <Card className="border shadow-sm sm:shadow-md rounded-none sm:rounded-lg border-x-0 sm:border-x -mx-4 sm:mx-0">
                <CardContent className="px-4 py-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                    <Button 
                        variant="outline" 
                        className="flex-1 justify-center text-muted-foreground font-normal rounded-full h-9 sm:h-11 px-3 sm:px-4 hover:bg-muted/50 transition-colors text-[11px] sm:text-sm"
                        onClick={() => { setCreateType('Fellowship'); setIsCreateOpen(true); }}
                        disabled={loading}
                    >
                    <span className="truncate">
                        {loading ? "Preparing groups..." : "Start a new fellowship group or association?"}
                    </span>
                    </Button>
                </div>
                <div className="flex items-center justify-center mt-3 pt-3 border-t">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 text-muted-foreground hover:text-primary transition-colors py-2 sm:py-6 h-auto"
                        onClick={() => { setCreateType('Fellowship'); setIsCreateOpen(true); }}
                        disabled={loading}
                    >
                        {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                        <Users className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        )}
                        <span className="text-[11px] sm:text-xs md:text-sm font-medium">New Fellowship</span>
                    </Button>
                    <div className="h-6 w-px bg-border shrink-0" />
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 text-muted-foreground hover:text-primary transition-colors py-2 sm:py-6 h-auto"
                        onClick={() => { setCreateType('Association'); setIsCreateOpen(true); }}
                        disabled={loading}
                    >
                        {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                        <Group className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        )}
                        <span className="text-[11px] sm:text-xs md:text-sm font-medium">New Association</span>
                    </Button>
                </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-8">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="Fellowship">Fellowships</TabsTrigger>
                        <TabsTrigger value="Association">Associations</TabsTrigger>
                    </TabsList>
                </div>

                {loading ? (
                    <div className="grid gap-0 md:gap-6 md:grid-cols-2 lg:grid-cols-3 -mx-4 sm:mx-0">
                        {[...Array(3)].map((_, i) => (
                            <Card key={i}><CardContent className="h-40 animate-pulse bg-muted rounded-lg" /></Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-0 md:gap-6 md:grid-cols-2 lg:grid-cols-3 -mx-4 sm:mx-0">
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
                        {filteredFellowships.length === 0 && (
                            <div className="col-span-full text-center py-20 bg-muted/10 rounded-lg border-2 border-dashed">
                                <Users className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                                <p className="text-muted-foreground font-medium">No {activeTab.toLowerCase()}s found.</p>
                                <p className="text-xs text-muted-foreground mt-1">Try a different search or create a new one.</p>
                            </div>
                        )}
                    </div>
                )}
            </Tabs>

            {mounted && isMobile ? (
                <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-2xl">
                        <div className="p-6 border-b flex-shrink-0 bg-muted/10">
                            <SheetHeader className="text-left">
                                <SheetTitle className="text-xl font-bold font-headline">New Community Group</SheetTitle>
                                <SheetDescription className="text-xs">Create a space for community and growth.</SheetDescription>
                            </SheetHeader>
                        </div>
                        <div className="flex-grow overflow-y-auto p-6">
                            <FellowshipForm 
                                userProfile={userProfile ?? null} 
                                onFormSubmit={handleCreateFellowship} 
                                isSubmitting={isSubmitting} 
                                defaultType={createType}
                            />
                        </div>
                    </SheetContent>
                </Sheet>
            ) : (
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
                        <div className="p-6 border-b shrink-0">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold font-headline">New Community Group</DialogTitle>
                                <DialogDescription>Create a space for community and growth.</DialogDescription>
                            </DialogHeader>
                        </div>
                        <ScrollArea className="flex-grow">
                            <div className="p-6">
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
            )}

            {fellowshipToManage && (
                mounted && isMobile ? (
                    <Sheet open={!!fellowshipToManage} onOpenChange={(open) => !open && closeAllDialogs()}>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-2xl">
                            <div className="p-6 border-b flex-shrink-0 bg-muted/10">
                                <SheetHeader className="text-left">
                                    <SheetTitle className="text-xl font-bold font-headline">Manage Group</SheetTitle>
                                    <SheetDescription className="text-xs">Update your group's details.</SheetDescription>
                                </SheetHeader>
                            </div>
                            <div className="flex-grow overflow-y-auto p-6">
                                <ManageFellowshipForm 
                                    fellowship={fellowshipToManage} 
                                    onFormSubmit={handleUpdateFellowship} 
                                    isSubmitting={isSubmitting} 
                                    onDelete={() => { setFellowshipToDelete(fellowshipToManage); setFellowshipToManage(null); }}
                                />
                            </div>
                        </SheetContent>
                    </Sheet>
                ) : (
                    <Dialog open={!!fellowshipToManage} onOpenChange={(open) => !open && closeAllDialogs()}>
                        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
                            <div className="p-6 border-b shrink-0">
                                <DialogHeader><DialogTitle className="text-2xl font-bold font-headline">Manage Group</DialogTitle></DialogHeader>
                            </div>
                            <ScrollArea className="flex-grow">
                                <div className="p-6">
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
                    <AlertDialogContent className="w-[90vw] max-w-lg rounded-lg">
                        <AlertDialogHeader><AlertDialogTitle>Delete this group?</AlertDialogTitle></AlertDialogHeader>
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