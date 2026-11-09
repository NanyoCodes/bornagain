'use client';

import * as React from 'react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { 
    collection, 
    query, 
    addDoc, 
    serverTimestamp, 
    doc, 
    orderBy,
    updateDoc,
    deleteDoc,
    where 
} from 'firebase/firestore';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription,
    CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    Loader2, 
    ArrowLeft, 
    ArrowRight,
    MessageSquare, 
    ShieldCheck, 
    Send,
    MapPin,
    Quote,
    X,
    Target,
    PlusCircle,
    Search,
    Globe,
    Edit,
    Trash2,
    Plus,
    ChevronDown,
    Camera,
    Upload,
    MoreVertical,
    Filter
} from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ImageUpload } from '@/components/common/image-upload';
import { Country, State } from 'country-state-city';
import type { RegionalChallenge, ChallengeType } from '@/lib/types';
import { KingdomAdSpot } from '@/components/testimonies/kingdom-ad-spot';
import { BibleGameCard } from '@/components/testimonies/bible-game-card';

const challengeTypeOptions: { label: string; value: ChallengeType }[] = [
    { label: 'Physical', value: 'Physical' },
    { label: 'Spiritual', value: 'Spiritual' },
];

const subCategories: Record<ChallengeType, string[]> = {
    'Physical': [
        'Infrastructural (Roads, Power, Water)',
        'Health & Medical',
        'Educational',
        'Poverty & Welfare',
        'Economic/Employment',
        'Security/Safety',
        'Other Physical'
    ],
    'Spiritual': [
        'Religious Strongholds (Idolatry, etc.)',
        'Spiritual Blindness',
        'Moral Decay',
        'Persecution',
        'Lack of Gospel Presence',
        'Other Spiritual'
    ]
};

function ChallengeCard({ 
    challenge, 
    userId, 
    onEdit, 
    onDelete 
}: { 
    challenge: RegionalChallenge, 
    userId?: string, 
    onEdit: () => void, 
    onDelete: () => void 
}) {
    const createdAt = safeToDate(challenge.createdAt);
    const isSpiritual = challenge.challengeType === 'Spiritual';
    const isAuthor = userId === challenge.authorId;

    return (
        <Card className="rounded-[2.5rem] border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden group hover:shadow-xl transition-all duration-500 flex flex-col h-full border-b-8 border-b-primary/5">
            <CardHeader className="p-6 sm:p-8 pb-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-1.5 flex-wrap">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 h-5 px-2 font-black uppercase text-[8px] tracking-widest">{challenge.country}</Badge>
                        <Badge className={cn(
                            "h-5 px-2 font-black uppercase text-[8px] tracking-widest border-none",
                            isSpiritual ? "bg-indigo-500 text-white" : "bg-emerald-500 text-white"
                        )}>
                            {challenge.challengeType}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="outline" size="icon" className="h-10 w-10 rounded-full border-primary/20 text-primary hover:bg-primary/10 shadow-md bg-background">
                                        <Link href={`/campaigns?source=territory&title=${encodeURIComponent(challenge.title)}&location=${encodeURIComponent(challenge.city || challenge.state)}, ${encodeURIComponent(challenge.country)}&description=${encodeURIComponent(challenge.description)}`}>
                                            <Target className="h-5 w-5" />
                                            <span className="sr-only">check this</span>
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="rounded-xl border-primary/20 shadow-xl">
                                    <p className="text-[10px] font-black uppercase">check this</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {isAuthor && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl shadow-xl">
                                    <DropdownMenuItem onClick={onEdit} className="rounded-lg">
                                        <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Challenge
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive rounded-lg">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Challenge
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
                <CardTitle className="text-xl sm:text-2xl font-black font-headline uppercase leading-tight group-hover:text-primary transition-colors">
                    {challenge.title}
                </CardTitle>
                <div className="mt-2 flex flex-col gap-2">
                    <Badge variant="secondary" className="w-fit text-[9px] font-bold uppercase tracking-widest px-2 h-5">
                        {challenge.subCategory || 'Other'}
                    </Badge>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{challenge.city || challenge.state}, {challenge.country}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-6 sm:p-8 pt-0 flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3 font-medium leading-relaxed italic">
                    &ldquo;{challenge.description}&rdquo;
                </p>
                <div className="mt-6 pt-6 border-t border-dashed flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{challenge.solutionCount || 0}</span>
                    </div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">{createdAt ? format(createdAt, 'PPP') : 'Recently'}</p>
                </div>
            </CardContent>
            <CardFooter className="p-0 border-t mt-auto">
                <Button asChild variant="ghost" className="w-full h-14 rounded-none gap-2 font-black uppercase tracking-widest text-[11px] group/btn hover:bg-primary/5 hover:text-primary transition-all">
                    <Link href={`/territories/${challenge.id}`} className="flex items-center justify-center w-full h-full">
                        <ArrowRight className="h-6 w-6 text-primary/60 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function TerritoriesPageClient() {
    const router = useRouter();
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

    const [challengeToEdit, setChallengeToEdit] = useState<RegionalChallenge | null>(null);
    const [challengeToDelete, setChallengeToDelete] = useState<RegionalChallenge | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [regCountry, setRegCountry] = useState('');
    const [regState, setRegState] = useState('');
    const [challengeType, setChallengeType] = useState<ChallengeType>('Physical');
    const [subCategory, setSubCategory] = useState('');
    const [mediaUrl1, setMediaUrl1] = useState('');
    const [mediaUrl2, setMediaUrl2] = useState('');

    const [filterCountry, setFilterCountry] = useState<string>('all');
    const [filterState, setFilterState] = useState<string>('all');

    useEffect(() => { setMounted(true); }, []);

    const challengesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'regionalChallenges'), orderBy('createdAt', 'desc'));
    }, [firestore]);
    const { data: allChallenges, loading: loadingChallenges } = useCollection<RegionalChallenge>(challengesQuery);

    const countriesList = useMemo(() => Country.getAllCountries(), []);

    const regStatesList = useMemo(() => {
        const country = countriesList.find(c => c.name === regCountry);
        return country ? State.getStatesOfCountry(country.isoCode) : [];
    }, [regCountry, countriesList]);

    const filterStatesList = useMemo(() => {
        const country = countriesList.find(c => c.name === filterCountry);
        return country ? State.getStatesOfCountry(country.isoCode) : [];
    }, [filterCountry, countriesList]);

    const filteredChallenges = useMemo(() => {
        if (!allChallenges) return [];
        let list = [...allChallenges];

        if (activeTab === 'mine') {
            list = list.filter(c => c.authorId === user?.uid);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            list = list.filter(c => c.title.toLowerCase().includes(term) || c.description.toLowerCase().includes(term));
        }

        if (filterCountry !== 'all') {
            list = list.filter(c => c.country === filterCountry);
        }

        if (filterState !== 'all') {
            list = list.filter(c => c.state === filterState);
        }

        return list;
    }, [allChallenges, activeTab, searchTerm, filterCountry, filterState, user?.uid]);

    // Handle initial state and cleanup for forms
    useEffect(() => {
        if (challengeToEdit) {
            setRegCountry(challengeToEdit.country || '');
            setRegState(challengeToEdit.state || '');
            setChallengeType(challengeToEdit.challengeType || 'Physical');
            setSubCategory(challengeToEdit.subCategory || '');
            setMediaUrl1(challengeToEdit.mediaUrl || '');
            setMediaUrl2(challengeToEdit.mediaUrl2 || '');
        } else if (!isCreateOpen) {
            setRegCountry('');
            setRegState('');
            setChallengeType('Physical');
            setSubCategory('');
            setMediaUrl1('');
            setMediaUrl2('');
        }
    }, [challengeToEdit, isCreateOpen]);

    const handleCreateChallenge = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !userProfile || !firestore) return;

        const formData = new FormData(e.currentTarget);
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const city = formData.get('city') as string;

        if (!title || !description || !regCountry || !subCategory) {
            toast({ variant: 'destructive', title: 'Incomplete Form', description: 'Please fill out all required fields.' });
            return;
        }

        setIsSubmitting(true);
        const challengeData = {
            title,
            description,
            challengeType,
            subCategory,
            country: regCountry,
            state: regState,
            city,
            authorId: user.uid,
            authorName: `${userProfile.firstName} ${userProfile.lastName}`,
            authorPhotoURL: userProfile.photoURL || '',
            status: 'open',
            solutionCount: 0,
            createdAt: serverTimestamp(),
            mediaUrl: mediaUrl1 || null,
            mediaUrl2: mediaUrl2 || null,
            visibility: 'public'
        };

        try {
            await addDoc(collection(firestore, 'regionalChallenges'), challengeData);
            toast({ title: 'Challenge Published', description: 'The global community has been notified.' });
            setIsCreateOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Action Failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateChallenge = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !firestore || !challengeToEdit) return;

        const formData = new FormData(e.currentTarget);
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const city = formData.get('city') as string;

        if (!title || !description) return;

        setIsSubmitting(true);
        const challengeRef = doc(firestore, 'regionalChallenges', challengeToEdit.id);
        const updateData = {
            title,
            description,
            challengeType,
            subCategory,
            country: regCountry,
            state: regState,
            city,
            mediaUrl: mediaUrl1 || null,
            mediaUrl2: mediaUrl2 || null,
            updatedAt: serverTimestamp(),
        };

        try {
            await updateDoc(challengeRef, updateData);
            toast({ title: 'Challenge Updated' });
            setChallengeToEdit(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteChallenge = async () => {
        if (!user || !firestore || !challengeToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(firestore, 'regionalChallenges', challengeToDelete.id));
            toast({ title: 'Challenge Removed' });
            setChallengeToDelete(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Delete Failed' });
        } finally {
            setIsDeleting(false);
        }
    };

    const creationFormElement = (onSubmit: any, isEdit = false) => (
        <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden">
            <ScrollArea className="flex-1 w-full h-full">
                <div className="p-8 space-y-8 pb-32">
                    <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 flex items-center gap-3">
                        <Target className="h-5 w-5 text-primary" />
                        <p className="text-xs font-bold text-primary uppercase tracking-widest">{isEdit ? 'Refining Territorial Intervention' : 'Mobilizing Territorial Intervention'}</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="title">Challenge Title</Label>
                        <Input id="title" name="title" defaultValue={challengeToEdit?.title || ''} placeholder="e.g., Spiritual Insecurity in North Lagos" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" required />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Domain</Label>
                            <Select onValueChange={(val: any) => setChallengeType(val)} value={challengeType}>
                                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                    {challengeTypeOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value} className="rounded-xl font-bold">{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Category</Label>
                            <Select onValueChange={setSubCategory} value={subCategory}>
                                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] rounded-2xl border-none shadow-2xl">
                                    {subCategories[challengeType].map(cat => (
                                        <SelectItem key={cat} value={cat} className="rounded-xl font-bold">{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Territory Location</Label>
                        <Select onValueChange={(val) => { setRegCountry(val); setRegState(''); }} value={regCountry}>
                            <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                                <SelectValue placeholder="Select Country" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {countriesList.map(c => <SelectItem key={c.isoCode} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <Select onValueChange={setRegState} value={regState} disabled={!regCountry || regStatesList.length === 0}>
                                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                                    <SelectValue placeholder={regStatesList.length === 0 ? "N/A" : "State/Region"} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {regStatesList.map(s => <SelectItem key={s.isoCode + s.name} value={s.name}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Input name="city" defaultValue={challengeToEdit?.city || ''} placeholder="City (Optional)" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="description">Description of Challenge</Label>
                        <Textarea id="description" name="description" defaultValue={challengeToEdit?.description || ''} placeholder="Detail the regional challenges and spiritual hurdles..." className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner text-base" required />
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Evidence Photo (Optional)</Label>
                          <ImageUpload 
                              initialImageUrl={mediaUrl1} 
                              onUploadComplete={setMediaUrl1} 
                              storagePath="regions hub" 
                              cropAspect={4/3}
                          />
                        </div>

                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Additional Proof (Optional)</Label>
                          <ImageUpload 
                              initialImageUrl={mediaUrl2} 
                              onUploadComplete={setMediaUrl2} 
                              storagePath="regions hub" 
                              cropAspect={4/3}
                          />
                        </div>
                    </div>
                </div>
            </ScrollArea>
            <div className="p-8 bg-muted/5 border-t flex flex-col sm:flex-row gap-3 shrink-0 absolute bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md">
                <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setChallengeToEdit(null); }} className="flex-1 rounded-xl h-12 font-bold">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl h-12 font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-center">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEdit ? 'SAVE CHANGES' : 'POST CHALLENGE')}
                </Button>
            </div>
        </form>
    );

    return (
        <div className="space-y-10 max-w-4xl mx-auto pb-32 min-h-full">
            <header className="px-4 sm:px-0 space-y-6 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Territories Hub</span>
                        </div>
                        <h1 className="text-2xl sm:text-5xl font-black font-headline tracking-tight uppercase">Region Watch</h1>
                    </div>
                    <Button 
                        onClick={() => setIsCreateOpen(true)} 
                        size="icon"
                        className="rounded-full font-black uppercase tracking-widest h-12 w-12 shadow-xl shadow-primary/20 shrink-0"
                    >
                        <PlusCircle className="h-6 w-6" />
                        <span className="sr-only">Share Challenge</span>
                    </Button>
                </div>

                <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-6 rounded-[2rem] flex items-start gap-4 shadow-inner">
                    <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shrink-0 mt-1">
                        <Target className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight leading-tight mb-1">Mapping Kingdom Solutions</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium text-balance">
                            Identify territories requiring spiritual or practical intervention. Share regional hurdles with evidence and collaborate with the global workforce to provide effective Kingdom solutions.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/40 p-1 rounded-2xl">
                            <TabsTrigger value="all" className="font-black text-[10px] uppercase tracking-widest rounded-xl">Discover</TabsTrigger>
                            <TabsTrigger value="mine" className="font-black text-[10px] uppercase tracking-widest rounded-xl">My Reports</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="relative flex-1 sm:max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                        <Input 
                            placeholder="Search territories..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="h-12 pl-11 rounded-2xl bg-muted/20 border-none shadow-inner font-bold w-full"
                        />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <Select value={filterCountry} onValueChange={(v) => { setFilterCountry(v); setFilterState('all'); }}>
                            <SelectTrigger className="w-[140px] h-10 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-[10px] uppercase tracking-wider text-left">
                                <SelectValue placeholder="Country" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                <SelectItem value="all">All Countries</SelectItem>
                                {countriesList.map(c => <SelectItem key={c.isoCode} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filterState} onValueChange={setFilterState} disabled={filterCountry === 'all' || filterStatesList.length === 0}>
                            <SelectTrigger className="w-[140px] h-10 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-[10px] uppercase tracking-wider text-left">
                                <SelectValue placeholder={filterStatesList.length === 0 ? "N/A" : "State/Region"} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {filterStatesList.map(s => <SelectItem key={s.isoCode + s.name} value={s.name}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 sm:px-0">
                {loadingChallenges ? (
                    [...Array(6)].map((_, i) => (
                        <Card key={i} className="h-48 rounded-[2rem] animate-pulse bg-muted/30 border-none" />
                    ))
                ) : filteredChallenges.length > 0 ? (
                    filteredChallenges.map(challenge => (
                        <ChallengeCard 
                            key={challenge.id} 
                            challenge={challenge} 
                            userId={user?.uid}
                            onEdit={() => setChallengeToEdit(challenge)}
                            onDelete={() => setChallengeToDelete(challenge)}
                        />
                    ))
                ) : (
                    <div className="col-span-full py-32 text-center flex flex-col items-center">
                        <Globe className="h-16 w-16 text-muted-foreground opacity-10 mb-6" />
                        <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-40 text-center">Territory Silence</h3>
                        <p className="text-sm text-muted-foreground italic mt-2 max-w-xs mx-auto text-balance text-center">No regional challenges recorded for this filter. Start one to mobilize solutions.</p>
                    </div>
                )}
            </div>

            <div className="px-4 sm:px-0 space-y-12">
                <KingdomAdSpot type="event" />
                <BibleGameCard />
            </div>

            {isCreateOpen && (
                isMobile ? (
                    <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                                <SheetHeader className="text-left flex-shrink-0 p-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Globe className="h-4 w-4 text-primary" />
                                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Registration</span>
                                    </div>
                                    <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Post Regional Challenge</SheetTitle>
                                    <SheetDescription className="text-sm font-medium mt-1">Detail the needs of your territory with evidence.</SheetDescription>
                                </SheetHeader>
                            </div>
                            <div className="flex-grow min-h-0">
                                {creationFormElement(handleCreateChallenge)}
                            </div>
                        </SheetContent>
                    </Sheet>
                ) : (
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
                            <div className="p-8 border-b shrink-0 bg-muted/10">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Regional Challenge</DialogTitle>
                                    <DialogDescription className="text-sm font-medium mt-1">Share hurdles in your region with photo evidence to mobilize global solutions.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className="flex-1 min-h-0">
                                {creationFormElement(handleCreateChallenge)}
                            </div>
                        </DialogContent>
                    </Dialog>
                )
            )}

            {challengeToEdit && (
                isMobile ? (
                    <Sheet open={!!challengeToEdit} onOpenChange={open => !open && setChallengeToEdit(null)}>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                                <SheetHeader className="text-left p-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Edit className="h-4 w-4 text-primary" />
                                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Refinement</span>
                                    </div>
                                    <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Update Hub Report</SheetTitle>
                                </SheetHeader>
                            </div>
                            <div className="flex-grow min-h-0">
                                {creationFormElement(handleUpdateChallenge, true)}
                            </div>
                        </SheetContent>
                    </Sheet>
                ) : (
                    <Dialog open={!!challengeToEdit} onOpenChange={(open) => !open && setChallengeToEdit(null)}>
                        <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-2xl sm:rounded-[2rem] border-none shadow-2xl">
                            <div className="p-8 border-b shrink-0 bg-muted/10">
                                <DialogHeader>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Edit className="h-4 w-4 text-primary" />
                                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Refinement</span>
                                    </div>
                                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Update Hub Report</DialogTitle>
                                </DialogHeader>
                            </div>
                            <div className="flex-1 min-h-0">
                                {creationFormElement(handleUpdateChallenge, true)}
                            </div>
                        </DialogContent>
                    </Dialog>
                )
            )}

            <AlertDialog open={!!challengeToDelete} onOpenChange={open => !open && setChallengeToDelete(null)}>
                <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black font-headline uppercase leading-tight">Remove Report?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                            Are you sure you want to delete this territorial challenge? All proposed solutions will also be removed. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 mt-6">
                        <AlertDialogCancel className="rounded-xl h-12 font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteChallenge} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold text-center">
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Confirm Removal
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
