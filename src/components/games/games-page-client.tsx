'use client';

import { useMemo, useState } from 'react';
import { useUser, useDoc, useUserProfile, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { 
    Gamepad2, 
    Users, 
    ArrowRight, 
    Sparkles, 
    Star, 
    Trophy,
    Search,
    Loader2,
    HeartHandshake,
    Sword
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Games Hub page client component. 
 * Lists accountability partners and allows users to challenge them to games.
 */

function PartnerGameCard({ partner }: { partner: UserProfile['accountabilityPartners'][0] }) {
    const router = useRouter();
    const firestore = useFirestore();
    
    // Live lookup for points and status
    const partnerRef = useMemo(() => partner.userId ? doc(firestore, 'users', partner.userId) : null, [firestore, partner.userId]);
    const { data: profile, loading } = useDoc<UserProfile>(partnerRef);

    const handleChallenge = () => {
        router.push(`/accountability/challenge/${partner.userId}`);
    };

    return (
        <Card className="rounded-[2rem] border-none shadow-md bg-card/50 backdrop-blur-sm group hover:shadow-xl transition-all overflow-hidden border-l-4 border-l-primary/20 text-left">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
                <div className="flex items-center gap-4 min-w-0 flex-1 text-left">
                    <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-4 border-background shadow-xl ring-2 ring-primary/5 transition-transform group-hover:scale-105 text-left">
                        <AvatarImage src={profile?.photoURL || partner.photoURL} className="object-cover text-left" />
                        <AvatarFallback className="font-black text-xl bg-primary/10 text-primary text-left">
                            {partner.firstName?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 text-left">
                        <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight truncate leading-none mb-1.5 text-left">
                            {partner.firstName} {partner.lastName}
                        </h3>
                        <div className="flex items-center gap-2 text-left">
                            <Badge variant="secondary" className="h-5 px-1.5 text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20 text-left">Partner</Badge>
                            <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-bold uppercase tracking-widest text-left">
                                <Trophy className="h-3 w-3 text-amber-500 text-left" />
                                {profile?.kingdomPoints || 0} Points
                            </div>
                        </div>
                    </div>
                </div>

                <Button 
                    onClick={handleChallenge}
                    className="w-full sm:w-auto h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 transition-all active:scale-95 text-center text-left"
                >
                    <Sword className="mr-2 h-4 w-4 text-left" />
                    CHALLENGE
                </Button>
            </CardContent>
        </Card>
    );
}

export default function GamesPageClient() {
    const { userProfile, loading: profileLoading } = useUserProfile();
    const [searchTerm, setSearchTerm] = useState('');

    const partners = userProfile?.accountabilityPartners || [];

    const filteredPartners = useMemo(() => {
        if (!searchTerm) return partners;
        const term = searchTerm.toLowerCase();
        return partners.filter(p => 
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(term)
        );
    }, [partners, searchTerm]);

    if (profileLoading) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center py-24 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-sm font-black uppercase tracking-widest text-primary animate-pulse text-center">Accessing Kingdom Arena...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-32 px-4 sm:px-0 text-left">
            <header className="space-y-6 pt-4 text-left">
                <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2 mb-2 text-left">
                        <Gamepad2 className="h-5 w-5 text-primary text-left" />
                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Kingdom Arena</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black font-headline tracking-tight uppercase text-left">Arena Lobby</h1>
                    <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-2xl leading-relaxed italic text-balance text-left">
                        Sharpen your knowledge of the Word with your accountability partners. Iron sharpens iron!
                    </p>
                </div>

                <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-inner text-left">
                    <div className="flex items-center gap-4 text-left">
                        <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shrink-0 text-left">
                            <Star className="h-7 w-7 text-white animate-pulse text-left" />
                        </div>
                        <div className="text-left">
                            <p className="text-lg font-black uppercase tracking-tight leading-tight text-left">Your Kingdom Score</p>
                            <p className="text-2xl font-black text-primary tracking-tighter text-left">{userProfile?.kingdomPoints || 0} POINTS</p>
                        </div>
                    </div>
                    <div className="h-px w-full bg-primary/10 sm:hidden text-left" />
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">
                        <Trophy className="h-4 w-4 text-amber-500 text-left" />
                        Top Ranked Laborer
                    </div>
                </div>

                <div className="relative text-left">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 text-left" />
                    <Input 
                        placeholder="Search partners for battle..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="h-14 pl-12 rounded-[1.5rem] bg-muted/20 border-none shadow-inner text-lg font-bold w-full text-left"
                    />
                </div>
            </header>

            <div className="space-y-4 text-left">
                {filteredPartners.length > 0 ? (
                    filteredPartners.map(partner => (
                        <PartnerGameCard key={partner.userId} partner={partner} />
                    ))
                ) : (
                    <div className="py-24 text-center px-8 border-2 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center text-left">
                        <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6 text-left">
                            <HeartHandshake className="h-10 w-10 text-primary opacity-10 text-left" />
                        </div>
                        <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-40 text-center text-left">No Partners Found</h3>
                        <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-sm mx-auto leading-relaxed text-balance text-center text-left">
                            {searchTerm 
                                ? "No partners match your search. Try a different name." 
                                : "You need accountability partners to enter the Kingdom Arena. Connect with some in Settings!"
                            }
                        </p>
                        {!searchTerm && (
                            <Button asChild variant="outline" className="mt-8 rounded-xl h-11 px-8 font-bold border-primary/20 text-primary hover:bg-primary/5 text-left">
                                <Link href="/accountability" className="text-left">FIND PARTNERS</Link>
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <footer className="px-8 pt-12 border-t mt-12 text-center max-w-2xl mx-auto text-left">
                <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-[0.2em] opacity-40 italic text-balance text-center text-left">
                    "Iron sharpens iron, and one man sharpens another." — Proverbs 27:17
                </p>
            </footer>
        </div>
    );
}
