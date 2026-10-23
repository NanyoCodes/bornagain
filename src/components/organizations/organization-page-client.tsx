
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { collection, query, addDoc, serverTimestamp, doc, updateDoc, writeBatch, where, getDocs, deleteDoc } from 'firebase/firestore';
import type { Organization, UserProfile, Soul } from '@/lib/types';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription,
    CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Loader2, 
    PlusCircle, 
    ShieldCheck, 
    Users, 
    Target, 
    ArrowRight, 
    Briefcase,
    Building2,
    Trash2,
    Edit,
    ArrowLeft,
    CheckCircle2,
    Mail,
    Search,
    Globe,
    ChevronDown,
    Plus,
    X,
    Sparkles,
    UserPlus,
    Info
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OrganizationPageClient() {
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [mounted, setMounted] = useState(false);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { setMounted(true); }, []);

    const orgsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'organizations'), where('status', '==', 'active'));
    }, [firestore]);
    const { data: allOrgs, loading } = useCollection<Organization>(orgsQuery);

    const filteredOrgs = useMemo(() => {
        if (!allOrgs) return [];
        let list = [...allOrgs];
        
        if (activeTab === 'mine') {
            list = list.filter(o => o.organizerId === user?.uid || o.memberIds?.includes(user?.uid || ''));
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            list = list.filter(o => o.name.toLowerCase().includes(term) || o.description.toLowerCase().includes(term));
        }

        return list;
    }, [allOrgs, activeTab, searchTerm, user?.uid]);

    const handleCreateOrg = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !userProfile || !firestore) return;
        
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const type = formData.get('type') as any;
        const location = formData.get('location') as string;

        if (!name || !type) return;

        setIsSubmitting(true);
        const orgData = {
            name,
            description,
            type,
            location,
            organizerId: user.uid,
            organizerName: `${userProfile.firstName} ${userProfile.lastName}`,
            memberIds: [user.uid],
            status: 'active',
            createdAt: serverTimestamp(),
        };

        try {
            const docRef = await addDoc(collection(firestore, 'organizations'), orgData);
            await updateDoc(doc(firestore, 'users', user.uid), { organizationId: docRef.id });
            toast({ title: 'Organization Registered', description: 'Welcome to the Corporate workforce.' });
            setIsCreateOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Action Failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const creationForm = (
        <form onSubmit={handleCreateOrg}>
            <div className="p-8 space-y-6 text-left">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Entity Name</Label>
                    <Input name="name" placeholder="e.g., Evangelism Department" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" required />
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Entity Type</Label>
                    <Select name="type" defaultValue="Church Department">
                        <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                            <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                            <SelectItem value="Church Department">Church Department</SelectItem>
                            <SelectItem value="Business">Business / Enterprise</SelectItem>
                            <SelectItem value="Ministry">Independent Ministry</SelectItem>
                            <SelectItem value="Other">Other Organization</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Location / Base</Label>
                    <Input name="location" placeholder="e.g., City, HQ Branch" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" />
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vision / Mission</Label>
                    <Textarea name="description" placeholder="Describe the core focus of this entity..." className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner" />
                </div>
            </div>
            <div className="p-8 bg-muted/5 border-t flex flex-col sm:flex-row gap-3">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1 rounded-xl h-12 font-bold">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl h-12 font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-center">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'REGISTER ENTITY'}
                </Button>
            </div>
        </form>
    );

    if (!mounted) return null;

    return (
        <div className="space-y-10 max-w-4xl mx-auto pb-32 text-left">
            <header className="px-4 sm:px-0 space-y-6 pt-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-5 w-5 text-primary" />
                            <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Corporate Station</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black font-headline uppercase tracking-tight">Organization Hub</h1>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="rounded-2xl font-black uppercase tracking-widest h-12 shadow-xl shadow-primary/20">
                        <PlusCircle className="mr-2 h-4 w-4" /> REGISTER ACCOUNT
                    </Button>
                </div>

                <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-6 rounded-[2.5rem] flex items-start gap-4 shadow-inner">
                    <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shrink-0 mt-1">
                        <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight leading-tight mb-1">Professional Kingdom Presence</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
                            Church departments, ministries, and Kingdom businesses can register here to organize their workforce, track collective progress, and manage members.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/40 p-1 rounded-2xl">
                            <TabsTrigger value="all" className="font-black text-[10px] uppercase tracking-widest rounded-xl">Discover</TabsTrigger>
                            <TabsTrigger value="mine" className="font-black text-[10px] uppercase tracking-widest rounded-xl">My Affiliation</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                        <Input 
                            placeholder="Search entities..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="h-12 pl-11 rounded-2xl bg-muted/20 border-none shadow-inner font-bold w-full"
                        />
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 sm:px-0">
                {loading ? (
                    [...Array(4)].map((_, i) => (
                        <Card key={i} className="h-48 rounded-[2rem] animate-pulse bg-muted/30 border-none" />
                    ))
                ) : filteredOrgs.length > 0 ? (
                    filteredOrgs.map(org => (
                        <Card key={org.id} className="rounded-[2.5rem] border-none shadow-md hover:shadow-xl transition-all group bg-card/50 backdrop-blur-sm overflow-hidden border-b-8 border-b-primary/5 flex flex-col h-full">
                            <CardHeader className="p-8 pb-4">
                                <div className="flex justify-between items-start mb-4">
                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 h-6 px-3 font-black uppercase text-[8px] tracking-widest">{org.type}</Badge>
                                    <Building2 className="h-5 w-5 text-primary opacity-20" />
                                </div>
                                <CardTitle className="text-xl sm:text-2xl font-black font-headline uppercase leading-tight group-hover:text-primary transition-colors truncate">{org.name}</CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-2">
                                    <MapPin className="h-3 w-3 text-primary" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{org.location || 'Global'}</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-8 pb-8 flex-grow">
                                <p className="text-sm text-muted-foreground line-clamp-2 font-medium leading-relaxed italic">&ldquo;{org.description}&rdquo;</p>
                                <div className="mt-6 pt-6 border-t border-dashed flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-primary" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{org.memberIds?.length || 0} Workforce</span>
                                    </div>
                                    <Button variant="ghost" asChild className="h-8 rounded-xl font-black text-[10px] uppercase tracking-widest text-primary hover:bg-primary/5">
                                        <Link href={`/dashboard/organizations/${org.id}`}>ENTER HUB <ArrowRight className="ml-1.5 h-3 w-3" /></Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-32 text-center flex flex-col items-center">
                        <Building2 className="h-16 w-16 text-muted-foreground opacity-10 mb-6" />
                        <h3 className="text-xl font-black uppercase tracking-tight opacity-40">Hub Silence</h3>
                        <p className="text-xs text-muted-foreground italic mt-2 max-w-xs mx-auto text-balance">Kingdom entities and departments will appear here once registered.</p>
                    </div>
                )}
            </div>

            {isCreateOpen && (
                isMobile ? (
                    <Drawer open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                                <DrawerHeader className="text-left p-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Building2 className="h-4 w-4 text-primary" />
                                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Registration</span>
                                    </div>
                                    <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Establish Entity</DrawerTitle>
                                    <DrawerDescription className="text-sm font-medium mt-1 text-left">Create a corporate presence for your ministry or business.</DrawerDescription>
                                </DrawerHeader>
                            </div>
                            <ScrollArea className="flex-grow">
                                {creationForm}
                            </ScrollArea>
                        </DrawerContent>
                    </Drawer>
                ) : (
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
                            <div className="p-8 border-b bg-muted/10 shrink-0">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Establish Entity</DialogTitle>
                                    <DialogDescription className="text-base font-medium">Create a formal account for your church department or Kingdom project.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="flex-grow">
                                {creationForm}
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                )
            )}
        </div>
    );
}

