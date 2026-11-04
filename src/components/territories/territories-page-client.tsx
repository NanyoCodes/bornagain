'use client';

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth, useDoc, useCollection, useUserProfile } from '@/firebase';
import { collection, query, addDoc, serverTimestamp, doc, orderBy, where, updateDoc, deleteDoc } from 'firebase/firestore';
import type { RegionalChallenge, UserProfile, ChallengeType } from '@/lib/types';
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
    Globe, 
    MessageSquare, 
    ArrowRight, 
    MapPin, 
    Target, 
    ShieldCheck, 
    Search,
    Filter,
    X,
    Sparkles,
    ChevronDown,
    Flag,
    Info,
    Edit,
    Trash2,
    MoreVertical,
    PlusCircle
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Country, State } from 'country-state-city';
import Link from 'next/link';
import { ImageUpload } from '@/components/common/image-upload';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
        <Card className="rounded-[2rem] border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden group hover:shadow-xl transition-all duration-500 flex flex-col h-full border-b-8 border-b-primary/5 text-left text-left">
            <CardHeader className="p-6 sm:p-8 pb-4 text-left text-left">
                <div className="flex justify-between items-start mb-4 text-left text-left">
                    <div className="flex gap-1.5 flex-wrap text-left text-left">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 h-5 px-2 font-black uppercase text-[8px] tracking-widest text-left"> {challenge.country}</Badge>
                        <Badge className={cn(
                            "h-5 px-2 font-black uppercase text-[8px] tracking-widest border-none text-left text-left",
                            isSpiritual ? "bg-indigo-500 text-white" : "bg-emerald-500 text-white"
                        )}>
                            {challenge.challengeType}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-left text-left">
                        {isAuthor && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-left text-left">
                                        <MoreVertical className="h-4 w-4 text-left text-left" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl shadow-xl text-left text-left">
                                    <DropdownMenuItem onClick={onEdit} className="rounded-lg text-left text-left text-left">
                                        <Edit className="mr-2 h-4 w-4 text-primary text-left text-left text-left" /> Edit Challenge
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="text-left text-left text-left" />
                                    <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive rounded-lg text-left text-left text-left">
                                        <Trash2 className="mr-2 h-4 w-4 text-left text-left text-left" /> Delete Challenge
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {!isAuthor && <Flag className="h-4 w-4 text-primary opacity-20 text-left text-left" />}
                    </div>
                </div>
                <CardTitle className="text-xl sm:text-2xl font-black font-headline uppercase leading-tight group-hover:text-primary transition-colors text-left text-left">
                    {challenge.title}
                </CardTitle>
                <div className="mt-2 flex flex-col gap-2 text-left text-left">
                    <Badge variant="secondary" className="w-fit text-[9px] font-bold uppercase tracking-widest px-2 h-5 text-left text-left">
                        {challenge.subCategory || 'Other'}
                    </Badge>
                    <div className="flex items-center gap-2 text-muted-foreground text-left text-left">
                        <MapPin className="h-3 w-3 text-primary text-left text-left" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-left text-left">{challenge.city || challenge.state}, {challenge.country}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-6 sm:p-8 pt-0 flex-grow text-left text-left">
                <p className="text-sm text-muted-foreground line-clamp-3 font-medium leading-relaxed italic text-left text-left">
                    &ldquo;{challenge.description}&rdquo;
                </p>
                <div className="mt-6 pt-6 border-t border-dashed flex items-center justify-between text-left text-left">
                    <div className="flex items-center gap-2 text-left text-left">
                        <MessageSquare className="h-3.5 w-3.5 text-primary text-left text-left" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left text-left">{challenge.solutionCount || 0} Solutions</span>
                    </div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase text-left text-left">{createdAt ? format(createdAt, 'PPP') : 'Recently'}</p>
                </div>
            </CardContent>
            <CardFooter className="p-0 border-t mt-auto text-left text-left">
                <Button asChild variant="ghost" className="w-full h-14 rounded-none gap-2 font-black uppercase tracking-widest text-[11px] group/btn hover:bg-primary/5 hover:text-primary transition-all text-center text-left">
                    <Link href={`/territories/${challenge.id}`} className="flex items-center justify-center w-full h-full text-center text-left">
                        PROVIDE SOLUTION <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1 ml-2 text-left text-left" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function TerritoriesPageClient() {
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const router = useRouter();
    
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

    useEffect(() => { setMounted(true); }, []);

    const challengesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'regionalChallenges'), orderBy('createdAt', 'desc'));
    }, [firestore]);
    const { data: allChallenges, loading } = useCollection<RegionalChallenge>(challengesQuery);

    const countriesList = useMemo(() => Country.getAllCountries(), []);
    const regStatesList = useMemo(() => {
        const country = countriesList.find(c => c.name === regCountry);
        return country ? State.getStatesOfCountry(country.isoCode) : [];
    }, [regCountry, countriesList]);

    const filterStatesList = useMemo(() => {
        const country = countriesList.find(c => c.name === filterCountry);
        return country ? State.getStatesOfCountry(country.isoCode) : [];
    }, [filterCountry, countriesList]);

    const [filterCountry, setFilterCountry] = useState<string>('all');
    const [filterState, setFilterState] = useState<string>('all');

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

    useEffect(() => {
        if (!challengeToEdit) {
            setSubCategory(subCategories[challengeType][0]);
        }
    }, [challengeType, challengeToEdit]);

    useEffect(() => {
        if (challengeToEdit) {
            setRegCountry(challengeToEdit.country || '');
            setRegState(challengeToEdit.state || '');
            setChallengeType(challengeToEdit.challengeType || 'Physical');
            setSubCategory(challengeToEdit.subCategory || '');
            setMediaUrl1(challengeToEdit.mediaUrl || '');
            setMediaUrl2(challengeToEdit.mediaUrl2 || '');
        } else {
            setRegCountry('');
            setRegState('');
            setChallengeType('Physical');
            setSubCategory('');
            setMediaUrl1('');
            setMediaUrl2('');
        }
    }, [challengeToEdit]);

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
            mediaUrl2: mediaUrl2 || null
        };

        try {
            await addDoc(collection(firestore, 'regionalChallenges'), challengeData);
            toast({ title: 'Challenge Published', description: 'The global community has been notified.' });
            setIsCreateOpen(false);
            setRegCountry('');
            setRegState('');
            setMediaUrl1('');
            setMediaUrl2('');
            setSubCategory('');
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

    const creationForm = (onSubmit: any, isEdit = false) => (
        <form onSubmit={onSubmit}>
            <div className="p-8 space-y-6 text-left text-left text-left">
                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 flex items-center gap-3 text-left text-left text-left">
                    <Target className="h-5 w-5 text-primary text-left text-left text-left" />
                    <p className="text-xs font-bold text-primary uppercase tracking-widest text-left text-left text-left">{isEdit ? 'Refining Territorial Intervention' : 'Mobilizing Territorial Intervention'}</p>
                </div>

                <div className="space-y-2 text-left text-left text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left" htmlFor="title">Challenge Title</Label>
                    <Input id="title" name="title" defaultValue={challengeToEdit?.title || ''} placeholder="e.g., Spiritual Insecurity in North Lagos" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left text-left text-left" required />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-left text-left">
                    <div className="space-y-2 text-left text-left text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left">Domain</Label>
                        <Select onValueChange={(val: any) => setChallengeType(val)} value={challengeType}>
                            <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left text-left text-left text-left">
                                <SelectValue placeholder="Select Type" className="text-left text-left text-left text-left" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl text-left text-left text-left text-left">
                                {challengeTypeOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value} className="rounded-xl font-bold text-left text-left text-left text-left">{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 text-left text-left text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left">Category</Label>
                        <Select onValueChange={setSubCategory} value={subCategory}>
                            <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left text-left text-left text-left">
                                <SelectValue placeholder="Select Category" className="text-left text-left text-left text-left" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px] rounded-2xl border-none shadow-2xl text-left text-left text-left text-left">
                                {subCategories[challengeType].map(cat => (
                                    <SelectItem key={cat} value={cat} className="rounded-xl font-bold text-left text-left text-left text-left">{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-4 text-left text-left text-left text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left text-left">Territory Location</Label>
                    <Select onValueChange={(val) => { setRegCountry(val); setRegState(''); }} value={regCountry}>
                        <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left text-left text-left text-left">
                            <SelectValue placeholder="Select Country" className="text-left text-left text-left text-left" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] text-left text-left text-left text-left">
                            {countriesList.map(c => <SelectItem key={c.isoCode} value={c.name} className="text-left text-left text-left text-left">{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    
                    <div className="grid grid-cols-2 gap-4 text-left text-left text-left text-left">
                        <Select onValueChange={setRegState} value={regState} disabled={!regCountry || regStatesList.length === 0}>
                            <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left text-left text-left text-left">
                                <SelectValue placeholder="State/Region" className="text-left text-left text-left text-left" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px] text-left text-left text-left text-left text-left text-left">
                                {regStatesList.map(s => <SelectItem key={s.isoCode + s.name} value={s.name} className="text-left text-left text-left text-left">{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input name="city" defaultValue={challengeToEdit?.city || ''} placeholder="City (Optional)" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner text-left text-left text-left text-left text-left" />
                    </div>
                </div>

                <div className="space-y-2 text-left text-left text-left text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left text-left" htmlFor="description">Description of Challenge</Label>
                    <Textarea id="description" name="description" defaultValue={challengeToEdit?.description || ''} placeholder="Detail the regional challenges and spiritual hurdles..." className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner text-base text-left text-left text-left text-left" required />
                </div>

                <div className="space-y-8 text-left text-left text-left text-left">
                    <div className="space-y-4 text-left text-left text-left text-left">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left text-left">Evidence Photo (Optional)</Label>
                      <ImageUpload 
                          initialImageUrl={mediaUrl1} 
                          onUploadComplete={setMediaUrl1} 
                          storagePath="territories" 
                          cropAspect={4/3}
                      />
                    </div>

                    <div className="space-y-4 text-left text-left text-left text-left">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left text-left">Additional Proof (Optional)</Label>
                      <ImageUpload 
                          initialImageUrl={mediaUrl2} 
                          onUploadComplete={setMediaUrl2} 
                          storagePath="territories" 
                          cropAspect={4/3}
                      />
                    </div>
                </div>
            </div>
            <div className="p-8 bg-muted/5 border-t flex flex-col sm:flex-row gap-3 text-left text-left text-left text-left">
                <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setChallengeToEdit(null); }} className="flex-1 rounded-xl h-12 font-bold text-left text-left text-left text-left">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl h-12 font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-center text-left text-left text-left text-left">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left text-left text-left" /> : (isEdit ? 'SAVE CHANGES' : 'POST CHALLENGE')}
                </Button>
            </div>
        </form>
    );

    if (!mounted) return null;

    return (
        <div className="space-y-10 max-w-4xl mx-auto pb-32 text-left text-left text-left text-left">
            <header className="px-4 sm:px-0 space-y-6 pt-4 text-left text-left text-left text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 text-left text-left text-left text-left text-left">
                    <div className="space-y-1 text-left text-left text-left text-left">
                        <div className="flex items-center gap-2 mb-1 text-left text-left text-left text-left text-left text-left">
                            <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-primary text-left text-left text-left text-left text-left text-left" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left text-left text-left text-left text-left text-left">Territories Hub</span>
                        </div>
                        <h1 className="text-2xl sm:text-5xl font-black font-headline tracking-tight uppercase text-left text-left text-left text-left">Region Watch</h1>
                    </div>
                    <Button 
                        onClick={() => setIsCreateOpen(true)} 
                        size="icon"
                        className="rounded-full font-black uppercase tracking-widest h-12 w-12 shadow-xl shadow-primary/20 shrink-0 text-center text-left text-left text-left"
                    >
                        <PlusCircle className="h-6 w-6 text-left text-left text-left text-left" />
                        <span className="sr-only text-left text-left text-left text-left">Share Challenge</span>
                    </Button>
                </div>

                <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-6 rounded-[2.5rem] flex items-start gap-4 shadow-inner text-left text-left text-left text-left">
                    <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shrink-0 mt-1 text-left text-left text-left text-left">
                        <Target className="h-6 w-6 text-white text-left text-left text-left text-left" />
                    </div>
                    <div className="text-left text-left text-left text-left">
                        <h3 className="text-lg font-black uppercase tracking-tight leading-tight mb-1 text-left text-left text-left text-left">Mapping Kingdom Solutions</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium text-left text-balance text-left text-left text-left text-left">
                            Identify territories requiring spiritual or practical intervention. Share regional hurdles with evidence and collaborate with the global workforce to provide effective Kingdom solutions.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between text-left text-left text-left text-left">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto text-left text-left text-left text-left">
                        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/40 p-1 rounded-2xl text-left text-left text-left text-left">
                            <TabsTrigger value="all" className="font-black text-[10px] uppercase tracking-widest rounded-xl text-left text-left text-left text-left">Discover</TabsTrigger>
                            <TabsTrigger value="mine" className="font-black text-[10px] uppercase tracking-widest rounded-xl text-left text-left text-left text-left">My Reports</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="relative flex-1 w-full sm:max-w-sm text-left text-left text-left text-left text-left">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 text-left text-left text-left text-left text-left" />
                        <Input 
                            placeholder="Search territories..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="h-12 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold w-full text-left text-left text-left text-left text-left"
                        />
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 sm:px-0 text-left text-left text-left text-left">
                {loading ? (
                    [...Array(4)].map((_, i) => (
                        <Card key={i} className="h-48 rounded-[2rem] animate-pulse bg-muted/30 border-none text-left text-left text-left text-left" />
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
                    <div className="col-span-full py-32 text-center flex flex-col items-center text-left text-left text-left text-left">
                        <Globe className="h-16 w-16 text-muted-foreground opacity-10 mb-6 text-left text-left text-left text-left" />
                        <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-40 text-center text-left text-left text-left text-left">Territory Silence</h3>
                        <p className="text-xs text-muted-foreground italic mt-2 max-w-xs mx-auto text-balance text-center text-left text-left text-left text-left">No regional challenges recorded for this filter. Start one to mobilize solutions.</p>
                    </div>
                )}
            </div>

            {isCreateOpen && (
                isMobile ? (
                    <Drawer open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left text-left text-left text-left">
                                <DrawerHeader className="text-left p-0 text-left text-left text-left text-left">
                                    <div className="flex items-center gap-2 mb-2 text-left text-left text-left text-left text-left">
                                        <Globe className="h-4 w-4 text-primary text-left text-left text-left text-left text-left" />
                                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left text-left text-left text-left text-left">Registration</span>
                                    </div>
                                    <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left text-left">Post Regional Challenge</DrawerTitle>
                                    <DrawerDescription className="text-sm font-medium mt-1 text-left text-left text-left text-left text-left text-left text-left">Detail the needs of your territory with evidence.</DrawerDescription>
                                </DrawerHeader>
                            </div>
                            <ScrollArea className="flex-grow text-left text-left text-left text-left text-left">
                                <div className="overflow-y-auto text-left text-left text-left text-left text-left">
                                    {creationForm(handleCreateChallenge)}
                                </div>
                            </ScrollArea>
                        </DrawerContent>
                    </Drawer>
                ) : (
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left text-left text-left text-left">
                            <div className="p-8 border-b bg-muted/10 shrink-0 text-left text-left text-left text-left text-left">
                                <DialogHeader className="text-left p-0 text-left text-left text-left text-left">
                                    <div className="flex items-center gap-2 mb-2 text-left text-left text-left text-left text-left">
                                        <Globe className="h-4 w-4 text-primary text-left text-left text-left text-left text-left" />
                                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left text-left text-left text-left text-left">Registration</span>
                                    </div>
                                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left text-left">Regional Challenge</DialogTitle>
                                    <DialogDescription className="text-sm font-medium mt-1 text-left text-left text-left text-left text-left">Share hurdles in your region with photo evidence to mobilize global solutions.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="flex-1 min-h-0 text-left text-left text-left text-left text-left">
                                <div className="overflow-y-auto text-left text-left text-left text-left text-left">
                                    {creationForm(handleCreateChallenge)}
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                )
            )}

            {challengeToEdit && (
                isMobile ? (
                    <Drawer open={!!challengeToEdit} onOpenChange={open => !open && setChallengeToEdit(null)}>
                        <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left text-left text-left text-left">
                                <DrawerHeader className="text-left p-0 text-left text-left text-left text-left text-left">
                                    <div className="flex items-center gap-2 mb-2 text-left text-left text-left text-left text-left">
                                        <Edit className="h-4 w-4 text-primary text-left text-left text-left text-left text-left" />
                                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left text-left text-left text-left text-left">Refinement</span>
                                    </div>
                                    <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left text-left">Update Hub Report</DrawerTitle>
                                </DrawerHeader>
                            </div>
                            <ScrollArea className="flex-grow text-left text-left text-left text-left text-left">
                                <div className="overflow-y-auto text-left text-left text-left text-left text-left">
                                    {creationForm(handleUpdateChallenge, true)}
                                </div>
                            </ScrollArea>
                        </DrawerContent>
                    </Drawer>
                ) : (
                    <Dialog open={!!challengeToEdit} onOpenChange={open => !open && setChallengeToEdit(null)}>
                        <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left text-left text-left text-left">
                            <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left text-left">
                                <DialogHeader className="p-0 text-left text-left text-left text-left text-left">
                                    <div className="flex items-center gap-2 mb-2 text-left text-left text-left text-left text-left">
                                        <Edit className="h-4 w-4 text-primary text-left text-left text-left text-left text-left" />
                                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left text-left text-left text-left text-left">Refinement</span>
                                    </div>
                                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left text-left">Update Hub Report</DialogTitle>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="flex-1 min-h-0 text-left text-left text-left text-left text-left">
                                <div className="overflow-y-auto text-left text-left text-left text-left text-left">
                                    {creationForm(handleUpdateChallenge, true)}
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                )
            )}

            <AlertDialog open={!!challengeToDelete} onOpenChange={open => !open && setChallengeToDelete(null)}>
                <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl text-left text-left text-left text-left">
                    <AlertDialogHeader className="text-left text-left text-left text-left text-left">
                        <AlertDialogTitle className="text-2xl font-black font-headline uppercase leading-tight text-left text-left text-left text-left text-left">Remove Report?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium leading-relaxed text-left text-left text-left text-left text-left text-left">
                            Are you sure you want to delete this territorial challenge? All proposed solutions will also be removed. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 mt-6 text-left text-left text-left text-left text-left">
                        <AlertDialogCancel className="rounded-xl h-12 font-bold text-left text-left text-left text-left text-left">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteChallenge} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold text-center text-left text-left text-left text-left text-left">
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left text-left text-left text-left" /> : <Trash2 className="mr-2 h-4 w-4 text-left text-left text-left text-left text-left" />}
                            Confirm Removal
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

const categoryScriptures: Record<string, { verse: string; text: string; prayer: string }[]> = {
  insecurity: [
    { verse: "Psalm 91:1-2", text: "Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. I will say of the Lord, 'He is my refuge and my fortress, my God, in whom I trust.'", prayer: "Lord, I refuse to live in fear. You are my refuge and my safe house. I rest secure under Your wings today. Amen." },
    { verse: "Proverbs 3:25-26", text: "Have no fear of sudden disaster... for the Lord will be at your side and will keep your foot from being snared.", prayer: "Father, I trust You to be my constant companion. Guard my steps and preserve my peace in every season. Amen." },
    { verse: "Isaiah 54:14", text: "In righteousness you will be established: Tyranny will be far from you; you will have nothing to fear. Terror will be far removed; it will not come near you.", prayer: "I declare that terror and fear have no place in my heart or my home. I am established in Your righteousness. Amen." }
  ],
  kidnapping: [
    { verse: "Psalm 124:7", text: "We have escaped like a bird from the fowler’s snare; the snare has been broken, and we have escaped.", prayer: "Lord, I speak a total break of every snare of captivity. Deliver the innocent and lead them to safety by Your mighty hand. Amen." },
    { verse: "Isaiah 49:25", text: "But this is what the Lord says: 'Yes, captives will be taken from warriors, and plunder retrieved from the fierce; I will contend with those who contend with you, and your children I will save.'", prayer: "I stand on Your promise to contend with the fierce. Rescue the captives and save our children, O God. Amen." },
    { verse: "Psalm 18:48", text: "He delivers me from my enemies; You exalt me above those who rise up against me; You rescue me from the violent man.", prayer: "Thank You for being a Rescuer. Deliver us from the hands of violent men and establish our safety. Amen." }
  ],
  violent_crime: [
    { verse: "Psalm 34:17", text: "The righteous cry out, and the Lord hears them; he delivers them from all their troubles.", prayer: "We cry out for our land, Lord. Deliver us from the plague of violence and murder. Let Your peace reign. Amen." },
    { verse: "Psalm 55:9", text: "Lord, confuse the wicked, confound their words, for I see violence and strife in the city.", prayer: "Confuse the plans of the wicked, Father. Frustrate the counsel of those who plot destruction in our cities. Amen." },
    { verse: "Matthew 10:28", text: "Do not be afraid of those who kill the body but cannot kill the soul.", prayer: "I refuse to be intimidated by the spirit of death. My life is hidden in Christ, and my eternity is secure. Amen." }
  ],
  pride: [
    { verse: "Proverbs 16:18", text: "Pride goes before destruction, a haughty spirit before a fall.", prayer: "Lord, strip away my pride and clothe me in Your humility. Let me never forget that You are the source of my strength. Amen." },
    { verse: "James 4:6", text: "God opposes the proud but shows favor to the humble.", prayer: "I choose to humble myself before You today, Lord. May Your favor rest upon me as I decrease and You increase. Amen." },
    { verse: "1 Peter 5:5", text: "Clothe yourselves, all of you, with humility toward one another.", prayer: "Holy Spirit, help me to serve others with a genuine heart, free from the need for recognition or praise. Amen." }
  ],
  anxiety: [
    { verse: "1 Peter 5:7", text: "Cast all your anxiety on him because he cares for you.", prayer: "Lord, I release every heavy burden and anxious thought to You. I trust that You care for me deeply. Amen." },
    { verse: "Philippians 4:6-7", text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", prayer: "I trade my worry for Your peace that surpasses understanding. Guard my heart and mind in Christ Jesus. Amen." },
    { verse: "Matthew 6:34", text: "Therefore do not worry about tomorrow, for tomorrow will worry about itself.", prayer: "Help me to live fully in today, trusting Your provision for every moment. Amen." }
  ],
  lust: [
    { verse: "1 Corinthians 10:13", text: "No temptation has overtaken you except what is common to mankind. And God is faithful; he will not let you be tempted beyond what you can bear.", prayer: "Lord, I thank You for providing a way out. I choose Your path of escape and declare my freedom in Christ. Amen." },
    { verse: "Matthew 5:28", text: "But I tell you that anyone who looks at a woman lustfully has already committed adultery with her in his heart.", prayer: "Father, purify my vision and my heart. Let my eyes see only what is holy and honoring to You. Amen." },
    { verse: "1 John 2:16", text: "For everything in the world—the lust of the flesh, the lust of the eyes, and the pride of life—comes not from the Father but from the world.", prayer: "I reject the cravings of this world. I feast my soul on Your presence and Your Word. Amen." }
  ],
  other: [
    { verse: "Isaiah 41:10", text: "So do not fear, for I am with you; do not be dismayed, for I am your God.", prayer: "I cast out fear today. You are my God, and You are holding my hand. Amen." },
    { verse: "Philippians 4:13", text: "I can do all this through him who gives me strength.", prayer: "Whatever I face today, I have the victory through Your power, Jesus. Amen." },
    { verse: "Romans 8:37", text: "No, in all these things we are more than conquerors through him who loved us.", prayer: "I am more than a conqueror! I walk in the victory of Your love today. Amen." }
  ]
};