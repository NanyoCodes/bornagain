'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useUser, useDoc, useFirestore, useCollection, useUserProfile } from '@/firebase';
import type { Soul } from '@/lib/types';
import { useMemo, useState, useEffect, Suspense } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HeartHandshake, Loader2, Sparkles, MapPin, Search, User, MessageSquare, ChevronDown, Quote, Smartphone, ShieldAlert } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, safeToDate } from '@/lib/utils';
import { format } from 'date-fns';

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
  );
}

function MatchmakingInner({ soulId }: { soulId?: string | null }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();
    const { userProfile } = useUserProfile();
    const [searchTerm, setSearchTerm] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const effectiveSoulId = useMemo(() => soulId || searchParams.get('soulId'), [soulId, searchParams]);

    const soulDocRef = useMemo(() => {
        if (!effectiveSoulId || !user?.uid || !firestore) return null;
        return doc(firestore, `users/${user.uid}/souls`, effectiveSoulId);
    }, [effectiveSoulId, user?.uid, firestore]);

    const { data: targetSoul, loading: targetLoading } = useDoc<Soul>(soulDocRef);

    const allSoulsQuery = useMemo(() => {
        if (!user?.uid || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/souls`), orderBy("firstName", "asc"));
    }, [user?.uid, firestore]);

    const { data: allSouls, loading: allLoading } = useCollection<Soul>(allSoulsQuery);

    const matches = useMemo(() => {
        if (!targetSoul || !allSouls) return [];
        
        // Safety: Target soul under 20 cannot be matched
        if (targetSoul.age && targetSoul.age < 20) return [];
        
        return allSouls.filter(s => {
            if (s.id === targetSoul.id) return false;
            
            // Age Restriction: Individuals younger than 20 are exempted
            if (s.age && s.age < 20) return false;
            
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
            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
        } else {
            window.location.href = `sms:${match.phone}?body=${encodeURIComponent(message)}`;
        }
    };

    if (targetLoading || allLoading || !mounted) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center py-24 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-sm text-muted-foreground font-medium uppercase tracking-widest text-[10px] animate-pulse text-center">Identifying Potential Connections...</p>
            </div>
        );
    }

    if (!targetSoul) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center px-8">
                <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                    <HeartHandshake className="h-8 w-8 text-muted-foreground opacity-20" />
                </div>
                <h2 className="text-2xl font-black font-headline uppercase tracking-tight text-center">Convert context missing</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm text-center">Please select a single convert from your dashboard to propose a godly connection.</p>
                <Button variant="outline" className="mt-8 rounded-xl h-11 px-8 font-bold mx-auto block" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
            </div>
        );
    }

    // Explicit check for target soul age
    if (targetSoul.age && targetSoul.age < 20) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center px-8">
                <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-destructive/20 text-center">
                    <ShieldAlert className="h-8 w-8 text-destructive opacity-40" />
                </div>
                <h2 className="text-2xl font-black font-headline uppercase tracking-tight text-destructive/80 text-center">Matchmaking Restricted</h2>
                <p className="mt-4 text-sm text-muted-foreground max-w-sm leading-relaxed font-medium italic text-center">
                    Younger than 20 years old are exempted from matchmaking protocol to prioritize spiritual focus and safety.
                </p>
                <Button variant="outline" className="mt-10 rounded-xl h-12 px-10 font-black uppercase tracking-widest text-[10px] mx-auto block" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> RETURN TO HARVEST
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-32 text-left">
            <header className="px-4 sm:px-0 space-y-6 pt-4 text-left">
                <div className="flex items-center gap-4 text-left">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 border bg-background shadow-sm text-left">
                        <ArrowLeft className="h-4 w-4 text-left" />
                    </Button>
                    <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2 mb-1 text-left">
                            <HeartHandshake className="h-4 w-4 text-primary text-left" />
                            <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Kingdom Alliance</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black font-headline tracking-tight uppercase truncate text-left">Proposed Matchmaking</h1>
                    </div>
                </div>

                <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-5 sm:p-8 rounded-[2rem] flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6 shadow-inner relative overflow-hidden text-left">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-left">
                        <Sparkles className="h-16 w-16 text-primary animate-pulse text-left" />
                    </div>
                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-xl shrink-0 text-left">
                        <AvatarImage src={targetSoul.photoURL || undefined} className="object-cover text-left" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xl text-left"> {targetSoul.firstName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 text-center sm:text-left">
                        <p className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight text-center sm:text-left">{targetSoul.firstName} {targetSoul.lastName}</p>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2 text-left">
                            <Badge variant="outline" className="text-[9px] sm:text-[10px] uppercase font-black bg-background h-6 border-primary/20 text-primary text-left">{targetSoul.gender || 'Gender unset'}</Badge>
                            <Badge className="text-[9px] sm:text-[10px] uppercase font-black bg-primary text-white h-6 text-left">Single</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3 font-medium italic max-w-md leading-relaxed text-balance text-center sm:text-left">
                            Younger than 20 years old are exempted from matchmaking.
                        </p>
                    </div>
                </div>

                <div className="relative text-left">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 text-left" />
                    <Input 
                        placeholder="Filter potential matches by name..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="h-14 pl-12 rounded-[1.5rem] bg-muted/20 border-none shadow-inner text-lg font-bold w-full text-left"
                    />
                </div>
            </header>

            <div className="px-4 sm:px-0 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                {matches.length > 0 ? matches.map(match => (
                    <Card key={match.id} className="rounded-[2rem] overflow-hidden border-none shadow-md hover:shadow-xl transition-all group bg-card/50 backdrop-blur-sm flex flex-col h-full text-left">
                        <CardHeader className="p-6 pb-4 flex flex-row items-center gap-4 text-left">
                            <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-lg shrink-0 text-left">
                                <AvatarImage src={match.photoURL || undefined} className="object-cover text-left" />
                                <AvatarFallback className="font-black bg-primary/5 text-primary text-lg text-left"> {match.firstName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 text-left">
                                <h3 className="font-black text-lg uppercase tracking-tight truncate leading-tight mb-1 text-left">{match.firstName} {match.lastName}</h3>
                                <div className="flex items-center gap-1.5 flex-wrap text-left">
                                    <Badge variant="secondary" className="h-5 px-1.5 text-[8px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/20 text-left">
                                        {match.gender}
                                    </Badge>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1 text-left">
                                        <MapPin className="h-2.5 w-2.5 text-left" /> {match.locationWon?.city || 'Global'}
                                    </span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-6 pb-4 flex-grow text-left">
                             {match.hobbies && (
                                <div className="p-3 rounded-xl bg-muted/30 border border-dashed text-xs text-muted-foreground italic font-medium leading-relaxed mb-4 relative overflow-hidden group/text text-left">
                                    <Quote className="absolute -top-1 right-2 h-8 w-8 opacity-5 rotate-12 transition-transform group-hover:text-rotate-0 text-left" />
                                    <p className="relative z-10 text-left">&ldquo;{match.hobbies}&rdquo;</p>
                                </div>
                             )}
                             <div className="grid grid-cols-2 gap-4 text-left">
                                <div className="space-y-1 text-left">
                                    <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Work Status</p>
                                    <p className="text-xs font-bold truncate text-left">{match.workStatus || 'N/A'}</p>
                                </div>
                                <div className="space-y-1 text-right text-left">
                                    <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest text-right text-left">Age</p>
                                    <p className="text-xs font-bold text-right text-left">{match.age ? `${match.age} yrs` : 'N/A'}</p>
                                </div>
                             </div>
                        </CardContent>
                        <CardFooter className="p-4 bg-muted/10 border-t flex flex-col sm:flex-row gap-2 text-left">
                            <Button 
                                onClick={() => handleContact(match, 'whatsapp')} 
                                disabled={!match.phone}
                                className="flex-1 h-11 rounded-xl gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95 text-center text-left"
                            >
                                <WhatsAppIcon className="h-4 w-4 text-left" /> WhatsApp
                            </Button>
                            <Button 
                                onClick={() => handleContact(match, 'sms')} 
                                disabled={!match.phone}
                                variant="outline"
                                className="flex-1 h-11 rounded-xl gap-2 font-black uppercase tracking-widest text-[10px] border-2 border-primary/20 text-primary hover:bg-primary/5 transition-all active:scale-95 text-center text-left"
                            >
                                <MessageSquare className="h-4 w-4 text-left" /> SMS Intro
                            </Button>
                        </CardFooter>
                    </Card>
                )) : (
                    <div className="col-span-full py-24 text-center flex flex-col items-center border-2 border-dashed rounded-[3rem] bg-muted/5 text-left">
                        <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6 text-left">
                            <HeartHandshake className="h-10 w-10 text-primary opacity-10 text-left" />
                        </div>
                        <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-40 text-center">No Potential Matches</h3>
                        <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-sm mx-auto leading-relaxed text-balance px-12 text-center">
                            We couldn't find any other single converts (aged 20+) of the opposite gender in your harvest. Keep sharing the Light!
                        </p>
                    </div>
                )}
            </div>
            
            <footer className="px-8 pt-12 border-t mt-12 text-center max-w-2xl mx-auto text-left">
                <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-[0.2em] opacity-40 italic text-balance text-center text-left">
                    "Two are better than one, because they have a good reward for their toil." — Ecclesiastes 4:9
                </p>
            </footer>
        </div>
    );
}

export default function MatchmakingClient({ soulId }: { soulId?: string | null }) {
    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center py-20 text-left"><Loader2 className="h-10 w-10 animate-spin text-primary text-left" /></div>}>
            <MatchmakingInner soulId={soulId} />
        </Suspense>
    );
}
