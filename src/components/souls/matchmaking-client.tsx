'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useUser, useDoc, useFirestore, useCollection } from '@/firebase';
import type { Soul } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HeartHandshake, Loader2, Sparkles, MapPin, Search, User, MessageSquare, ChevronDown, Quote } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, safeToDate } from '@/lib/utils';
import { format } from 'date-fns';

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

export default function MatchmakingClient({ soulId }: { soulId: string | null }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const soulDocRef = useMemo(() => {
        const id = soulId || searchParams.get('soulId');
        if (!id || !user?.uid || !firestore) return null;
        return doc(firestore, `users/${user.uid}/souls`, id);
    }, [soulId, searchParams, user?.uid, firestore]);

    const { data: targetSoul, loading: targetLoading } = useDoc<Soul>(soulDocRef);

    const allSoulsQuery = useMemo(() => {
        if (!user?.uid || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/souls`), orderBy("firstName", "asc"));
    }, [user?.uid, firestore]);

    const { data: allSouls, loading: allLoading } = useCollection<Soul>(allSoulsQuery);

    const matches = useMemo(() => {
        if (!targetSoul || !allSouls) return [];
        
        return allSouls.filter(s => {
            if (s.id === targetSoul.id) return false;
            
            // Core Logic: Connecting Singles of the Opposite Gender
            const isSingle = s.maritalStatus === 'Single';
            const isOppositeGender = targetSoul.gender && s.gender && targetSoul.gender !== s.gender;
            
            // Allow showing all singles if gender is not set, but prioritize opposite gender
            const matchesBasic = isSingle && (isOppositeGender || !targetSoul.gender || !s.gender);
            
            if (!matchesBasic) return false;

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return `${s.firstName} ${s.lastName}`.toLowerCase().includes(term);
            }

            return true;
        }).sort((a, b) => {
            // Prioritize opposite gender matches
            if (targetSoul.gender) {
                const aCorrect = a.gender !== targetSoul.gender;
                const bCorrect = b.gender !== targetSoul.gender;
                if (aCorrect && !bCorrect) return -1;
                if (!aCorrect && bCorrect) return 1;
            }
            return 0;
        });
    }, [targetSoul, allSouls, searchTerm]);

    const handleContact = (match: Soul, channel: 'whatsapp' | 'sms') => {
        if (!match.phone) return;
        const cleanPhone = match.phone.replace(/[^\d+]/g, '');
        const message = `Hi ${match.firstName}, I'm reaching out from Testify. I'd love to introduce you to a brother/sister in our community for fellowship. Let me know if you're open to a connection!`;
        
        if (channel === 'whatsapp') {
            window.open(`https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(message)}`, '_blank');
        } else {
            window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
        }
    };

    if (targetLoading || allLoading || !mounted) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center py-24 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground font-medium uppercase tracking-widest text-[10px] animate-pulse">Identifying Potential Connections...</p>
            </div>
        );
    }

    if (!targetSoul) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center px-8">
                <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                    <HeartHandshake className="h-8 w-8 text-muted-foreground opacity-20" />
                </div>
                <h2 className="text-2xl font-black font-headline uppercase tracking-tight">Convert context missing</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm">Please select a single convert from your dashboard to propose a godly connection.</p>
                <Button variant="outline" className="mt-8 rounded-xl h-11 px-8 font-bold" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-32 text-left">
            <header className="px-4 sm:px-0 space-y-6 pt-4 text-left">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 border bg-background shadow-sm">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 text-left">
                            <HeartHandshake className="h-4 w-4 text-primary" />
                            <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Kingdom Alliance</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black font-headline tracking-tight uppercase truncate">Proposed Matchmaking</h1>
                    </div>
                </div>

                <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-5 sm:p-8 rounded-[2rem] flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Sparkles className="h-16 w-16 text-primary animate-pulse" />
                    </div>
                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-xl shrink-0">
                        <AvatarImage src={targetSoul.photoURL || undefined} className="object-cover" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xl">{targetSoul.firstName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <p className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight">Finding a match for {targetSoul.firstName}</p>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                            <Badge variant="outline" className="text-[9px] sm:text-[10px] uppercase font-black bg-background h-6 border-primary/20 text-primary">{targetSoul.gender || 'Gender unset'}</Badge>
                            <Badge className="text-[9px] sm:text-[10px] uppercase font-black bg-primary text-white h-6">Single</Badge>
                            <Badge variant="secondary" className="text-[9px] sm:text-[10px] uppercase font-bold h-6 tracking-tighter opacity-60">ID: {targetSoul.id.slice(0,6)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3 font-medium italic max-w-md leading-relaxed text-balance">
                            The Kingdom matchmaking protocol prioritizes connections between singles of the opposite gender within your local harvest field.
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40" />
                    <Input 
                        placeholder="Filter potential matches by name..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="h-14 pl-12 rounded-[1.5rem] bg-muted/20 border-none shadow-inner text-lg font-bold"
                    />
                </div>
            </header>

            <div className="px-4 sm:px-0 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                {matches.length > 0 ? matches.map(match => (
                    <Card key={match.id} className="rounded-[2rem] overflow-hidden border-none shadow-md hover:shadow-xl transition-all group bg-card/50 backdrop-blur-sm flex flex-col h-full">
                        <CardHeader className="p-6 pb-4 flex flex-row items-center gap-4">
                            <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-lg shrink-0">
                                <AvatarImage src={match.photoURL || undefined} className="object-cover" />
                                <AvatarFallback className="font-black bg-primary/5 text-primary text-lg">{match.firstName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 text-left">
                                <h3 className="font-black text-lg uppercase tracking-tight truncate leading-tight mb-1">{match.firstName} {match.lastName}</h3>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge variant="secondary" className="h-5 px-1.5 text-[8px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/20">
                                        {match.gender}
                                    </Badge>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                        <MapPin className="h-2.5 w-2.5" /> {match.locationWon?.city || 'Global'}
                                    </span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-6 pb-4 flex-grow text-left">
                             {match.hobbies && (
                                <div className="p-3 rounded-xl bg-muted/30 border border-dashed text-xs text-muted-foreground italic font-medium leading-relaxed mb-4 relative overflow-hidden group/text">
                                    <Quote className="absolute -top-1 right-2 h-8 w-8 opacity-5 rotate-12 transition-transform group-hover/text:rotate-0" />
                                    <p className="relative z-10">&ldquo;{match.hobbies}&rdquo;</p>
                                </div>
                             )}
                             <div className="grid grid-cols-2 gap-4 text-left">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest">Work Status</p>
                                    <p className="text-xs font-bold truncate">{match.workStatus || 'N/A'}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest">Age</p>
                                    <p className="text-xs font-bold">{match.age ? `${match.age} yrs` : 'N/A'}</p>
                                </div>
                             </div>
                        </CardContent>
                        <CardFooter className="p-4 bg-muted/10 border-t flex flex-col sm:flex-row gap-2">
                            <Button 
                                onClick={() => handleContact(match, 'whatsapp')} 
                                disabled={!match.phone}
                                className="flex-1 h-11 rounded-xl gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95"
                            >
                                <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                            </Button>
                            <Button 
                                onClick={() => handleContact(match, 'sms')} 
                                disabled={!match.phone}
                                variant="outline"
                                className="flex-1 h-11 rounded-xl gap-2 font-black uppercase tracking-widest text-[10px] border-2 border-primary/20 text-primary hover:bg-primary/5 transition-all active:scale-95"
                            >
                                <MessageSquare className="h-4 w-4" /> SMS Intro
                            </Button>
                        </CardFooter>
                    </Card>
                )) : (
                    <div className="col-span-full py-24 text-center flex flex-col items-center border-2 border-dashed rounded-[3rem] bg-muted/5">
                        <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6 text-left">
                            <HeartHandshake className="h-10 w-10 text-primary opacity-10" />
                        </div>
                        <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-40">No Potential Matches</h3>
                        <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-sm mx-auto leading-relaxed text-balance px-12">
                            We couldn't find any other single converts of the opposite gender in your harvest. Keep sharing the Light!
                        </p>
                    </div>
                )}
            </div>
            
            <footer className="px-8 pt-12 border-t mt-12 text-center max-w-2xl mx-auto">
                <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-[0.2em] opacity-40 italic text-balance">
                    "Two are better than one, because they have a good reward for their toil." — Ecclesiastes 4:9
                </p>
            </footer>
        </div>
    );
}

