'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { collection, query, addDoc, serverTimestamp, doc, orderBy, where } from 'firebase/firestore';
import type { RegionalChallenge, UserProfile } from '@/lib/types';
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
    Globe, 
    MessageSquare, 
    ArrowRight, 
    MapPin, 
    Target, 
    ShieldCheck, 
    Users, 
    Search,
    Filter,
    X,
    Sparkles,
    ChevronDown,
    Flag,
    Camera,
    Info
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Country, State } from 'country-state-city';
import { format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import Link from 'next/link';
import { ImageUpload } from '@/components/common/image-upload';

function ChallengeCard({ challenge }: { challenge: RegionalChallenge }) {
    const createdAt = safeToDate(challenge.createdAt);

    return (
        <Card className="rounded-[2rem] border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden group hover:shadow-xl transition-all duration-500 flex flex-col h-full border-b-8 border-b-primary/5 text-left">
            <CardHeader className="p-6 sm:p-8 pb-4 text-left">
                <div className="flex justify-between items-start mb-4 text-left">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 h-5 px-2 font-black uppercase text-[8px] tracking-widest text-left"> {challenge.country}</Badge>
                    <Flag className="h-4 w-4 text-primary opacity-20 text-left" />
                </div>
                <CardTitle className="text-xl sm:text-2xl font-black font-headline uppercase leading-tight group-hover:text-primary transition-colors text-left">
                    {challenge.title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground text-left">
                    <MapPin className="h-3 w-3 text-primary text-left" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{challenge.city || challenge.state}, {challenge.country}</span>
                </div>
            </CardHeader>
            <CardContent className="px-6 sm:p-8 pt-0 flex-grow text-left">
                <p className="text-sm text-muted-foreground line-clamp-3 font-medium leading-relaxed italic text-left">
                    &ldquo;{challenge.description}&rdquo;
                </p>
                <div className="mt-6 pt-6 border-t border-dashed flex items-center justify-between text-left">
                    <div className="flex items-center gap-2 text-left">
                        <MessageSquare className="h-3.5 w-3.5 text-primary text-left" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{challenge.solutionCount || 0} Solutions</span>
                    </div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase text-left">{createdAt ? format(createdAt, 'PPP') : 'Recently'}</p>
                </div>
            </CardContent>
            <CardFooter className="p-0 border-t mt-auto text-left">
                <Button asChild variant="ghost" className="w-full h-14 rounded-none gap-2 font-black uppercase tracking-widest text-[11px] group/btn hover:bg-primary/5 hover:text-primary transition-all text-center">
                    <Link href={`/territories/${challenge.id}`} className="flex items-center justify-center w-full h-full text-center">
                        PROVIDE SOLUTION <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1 ml-2 text-left" />
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
    const [mounted, setMounted] = useState(false);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [filterCountry, setFilterCountry] = useState<string>('all');
    const [filterState, setFilterState] = useState<string>('all');

    const [regCountry, setRegCountry] = useState('');
    const [regState, setRegState] = useState('');
    const [mediaUrl1, setMediaUrl1] = useState('');
    const [mediaUrl2, setMediaUrl2] = useState('');

    useEffect(() => { setMounted(true); }, []);

    const challengesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'regionalChallenges'), orderBy('createdAt', 'desc'));
    }, [firestore]);
    const { data: challenges, loading } = useCollection<RegionalChallenge>(challengesQuery);

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
        if (!challenges) return [];
        let list = [...challenges];

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
    }, [challenges, searchTerm, filterCountry, filterState]);

    const handleCreateChallenge = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !userProfile || !firestore) return;

        const formData = new FormData(e.currentTarget);
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const city = formData.get('city') as string;

        if (!title || !description || !regCountry) return;

        if (!mediaUrl1 || !mediaUrl2) {
            toast({ variant: 'destructive', title: 'Evidence Required', description: 'Please provide at least two photo evidences for this challenge.' });
            return;
        }

        setIsSubmitting(true);
        const challengeData = {
            title,
            description,
            country: regCountry,
            state: regState,
            city,
            authorId: user.uid,
            authorName: `${userProfile.firstName} ${userProfile.lastName}`,
            authorPhotoURL: userProfile.photoURL || '',
            status: 'open',
            solutionCount: 0,
            createdAt: serverTimestamp(),
            mediaUrl: mediaUrl1,
            mediaUrl2: mediaUrl2
        };

        try {
            await addDoc(collection(firestore, 'regionalChallenges'), challengeData);
            toast({ title: 'Challenge Published', description: 'The global community has been notified.' });
            setIsCreateOpen(false);
            setRegCountry('');
            setRegState('');
            setMediaUrl1('');
            setMediaUrl2('');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Action Failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const creationForm = (
        <form onSubmit={handleCreateChallenge}>
            <div className="p-8 space-y-6 text-left">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Challenge Title</Label>
                    <Input name="title" placeholder="e.g., Spiritual Insecurity in North Lagos" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left" required />
                </div>
                
                <div className="space-y-4 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Territory Location</Label>
                    <Select onValueChange={(val) => { setRegCountry(val); setRegState(''); }} value={regCountry}>
                        <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left">
                            <SelectValue placeholder="Select Country" className="text-left" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] text-left">
                            {countriesList.map(c => <SelectItem key={c.isoCode} value={c.name} className="text-left">{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    
                    <div className="grid grid-cols-2 gap-4 text-left">
                        <Select onValueChange={setRegState} value={regState} disabled={!regCountry || regStatesList.length === 0}>
                            <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left">
                                <SelectValue placeholder="State/Region" className="text-left" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px] text-left">
                                {regStatesList.map(s => <SelectItem key={s.isoCode + s.name} value={s.name} className="text-left">{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input name="city" placeholder="City (Optional)" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner text-left" />
                    </div>
                </div>

                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Description of Challenge</Label>
                    <Textarea name="description" placeholder="Detail the regional challenges and spiritual hurdles..." className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner text-base text-left" required />
                </div>

                <div className="space-y-4 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                        <Camera className="h-3.5 w-3.5 text-primary" /> Mandatory Evidence (2 Photos)
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[8px] font-bold uppercase text-muted-foreground/60 ml-2">Photo 1</Label>
                            <ImageUpload onUploadComplete={setMediaUrl1} storagePath="territories" circularCrop={false} initialImageUrl={mediaUrl1} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[8px] font-bold uppercase text-muted-foreground/60 ml-2">Photo 2</Label>
                            <ImageUpload onUploadComplete={setMediaUrl2} storagePath="territories" circularCrop={false} initialImageUrl={mediaUrl2} />
                        </div>
                    </div>
                    <div className="bg-primary/5 p-4 rounded-2xl border-2 border-dashed border-primary/10 flex items-start gap-3 mt-4 text-left">
                        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                            Visual evidence is critical for global intervention. Challenges with clear photo proof receive prioritized Kingdom response.
                        </p>
                    </div>
                </div>
            </div>
            <div className="p-8 bg-muted/5 border-t flex flex-col sm:flex-row gap-3 text-left">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1 rounded-xl h-12 font-bold text-left">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl h-12 font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-center text-left">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" /> : 'POST CHALLENGE'}
                </Button>
            </div>
        </form>
    );

    if (!mounted) return null;

    return (
        <div className="space-y-10 max-w-4xl mx-auto pb-32 text-left">
            <header className="px-4 sm:px-0 space-y-6 pt-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-left">
                    <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2 mb-1 text-left">
                            <Globe className="h-5 w-5 text-primary text-left" />
                            <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Territories Hub</span>
                        </div>
                        <h1 className="text-2xl sm:text-5xl font-black font-headline tracking-tight uppercase text-left">Region Watch</h1>
                    </div>
                    <Button 
                        onClick={() => setIsCreateOpen(true)} 
                        size="icon"
                        className="rounded-full font-black uppercase tracking-widest h-12 w-12 shadow-xl shadow-primary/20 shrink-0 text-center"
                    >
                        <PlusCircle className="h-6 w-6" />
                        <span className="sr-only">Share Challenge with at least two photo evidences</span>
                    </Button>
                </div>

                <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-6 rounded-[2.5rem] flex items-start gap-4 shadow-inner text-left">
                    <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shrink-0 mt-1 text-left">
                        <Target className="h-6 w-6 text-white text-left" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-black uppercase tracking-tight leading-tight mb-1 text-left">Mapping Kingdom Solutions</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium text-left text-balance">
                            Identify territories requiring spiritual or practical intervention. Share regional hurdles with evidence and collaborate with the global workforce to provide effective Kingdom solutions.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between text-left">
                    <div className="flex-1 flex flex-col sm:flex-row gap-3 text-left">
                        <div className="relative flex-1 text-left">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 text-left" />
                            <Input 
                                placeholder="Search territories..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="h-12 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold w-full text-left"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 text-left">
                            <Select value={filterCountry} onValueChange={(v) => { setFilterCountry(v); setFilterState('all'); }}>
                                <SelectTrigger className="w-[140px] h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-[10px] uppercase tracking-wider text-left">
                                    <SelectValue placeholder="Country" className="text-left" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] text-left">
                                    <SelectItem value="all" className="text-left">All Countries</SelectItem>
                                    {countriesList.map(c => <SelectItem key={c.isoCode} value={c.name} className="text-left">{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={filterState} onValueChange={setFilterState} disabled={filterCountry === 'all' || filterStatesList.length === 0}>
                                <SelectTrigger className="w-[140px] h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-[10px] uppercase tracking-wider text-left">
                                    <SelectValue placeholder="State" className="text-left" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] text-left">
                                    <SelectItem value="all" className="text-left">All Regions</SelectItem>
                                    {filterStatesList.map(s => <SelectItem key={s.isoCode + s.name} value={s.name} className="text-left">{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 sm:px-0 text-left">
                {loading ? (
                    [...Array(4)].map((_, i) => (
                        <Card key={i} className="h-48 rounded-[2rem] animate-pulse bg-muted/30 border-none text-left" />
                    ))
                ) : filteredChallenges.length > 0 ? (
                    filteredChallenges.map(challenge => (
                        <ChallengeCard key={challenge.id} challenge={challenge} />
                    ))
                ) : (
                    <div className="col-span-full py-32 text-center flex flex-col items-center text-left">
                        <Globe className="h-16 w-16 text-muted-foreground opacity-10 mb-6 text-left" />
                        <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-40 text-center text-left">Territory Silence</h3>
                        <p className="text-xs text-muted-foreground italic mt-2 max-w-xs mx-auto text-balance text-center text-left">No regional challenges recorded for this filter. Start one to mobilize solutions.</p>
                    </div>
                )}
            </div>

            {isCreateOpen && (
                isMobile ? (
                    <Drawer open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                                <DrawerHeader className="text-left p-0 text-left">
                                    <div className="flex items-center gap-2 mb-2 text-left">
                                        <Globe className="h-4 w-4 text-primary text-left" />
                                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Registration</span>
                                    </div>
                                    <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Post Regional Challenge</DrawerTitle>
                                    <DrawerDescription className="text-sm font-medium mt-1 text-left text-left">Detail the needs of your territory with evidence.</DrawerDescription>
                                </DrawerHeader>
                            </div>
                            <ScrollArea className="flex-grow text-left">
                                {creationForm}
                            </ScrollArea>
                        </DrawerContent>
                    </Drawer>
                ) : (
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left">
                            <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
                                <DialogHeader className="p-0 text-left">
                                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Regional Challenge</DialogTitle>
                                    <DialogDescription className="text-base font-medium text-left">Share hurdles in your region with at least two photo evidences to mobilize global solutions.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="flex-grow text-left">
                                {creationForm}
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                )
            )}
        </div>
    );
}
