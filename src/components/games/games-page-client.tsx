'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useDoc, useUserProfile, useFirestore, useCollection } from '@/firebase';
import { doc, collection, query, where, orderBy, serverTimestamp, addDoc, setDoc } from 'firebase/firestore';
import type { UserProfile, Fellowship, GameSessionType } from '@/lib/types';
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
    Sword,
    Target,
    ShieldCheck,
    ArrowLeft,
    X,
    ChevronRight,
    Group
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { cn, safeToDate } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { format, differenceInMinutes } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

/**
 * @fileOverview High-fidelity Games Arena Lobby.
 * Supports Individual Duels with partners and Group Crusades with Fellowships.
 */

function PartnerGameCard({ partner }: { partner: UserProfile['accountabilityPartners'][0] }) {
    const router = useRouter();
    const firestore = useFirestore();
    const partnerRef = useMemo(() => partner.userId ? doc(firestore, 'users', partner.userId) : null, [firestore, partner.userId]);
    const { data: profile } = useDoc<UserProfile>(partnerRef);

    const isOnline = useMemo(() => {
        const lastActive = safeToDate(profile?.lastActive);
        if (!lastActive) return false;
        return differenceInMinutes(new Date(), lastActive) < 5;
    }, [profile?.lastActive]);

    return (
        <Card className="rounded-[2rem] border-none shadow-md bg-card/50 backdrop-blur-sm group hover:shadow-xl transition-all overflow-hidden border-l-4 border-l-primary/20 text-left">
            <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 min-w-0 flex-1 w-full sm:w-auto">
                    <div className="relative shrink-0">
                        <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-4 border-background shadow-xl ring-2 ring-primary/5 transition-transform group-hover:scale-105">
                            <AvatarImage src={profile?.photoURL || partner.photoURL} className="object-cover" />
                            <AvatarFallback className="font-black text-xl bg-primary/10 text-primary">
                                {partner.firstName?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                            <div className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-background"></span>
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                        <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight truncate leading-none mb-1.5">
                            {partner.firstName} {partner.lastName}
                        </h3>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="h-5 px-1.5 text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20">Partner</Badge>
                            <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                                <Trophy className="h-3 w-3 text-amber-500" />
                                {profile?.kingdomPoints || 0} XP
                            </div>
                        </div>
                    </div>
                </div>

                <Button 
                    onClick={() => router.push(`/accountability/challenge/${partner.userId}`)}
                    className="w-full sm:w-auto h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 transition-all active:scale-95 group-hover:bg-primary/90"
                >
                    <Sword className="mr-2 h-4 w-4" />
                    DUEL
                </Button>
            </CardContent>
        </Card>
    );
}

function GroupChallengeCard({ fellowship }: { fellowship: Fellowship }) {
    const router = useRouter();
    const isGiftVendor = fellowship.groupType === 'Association';

    return (
        <Card className="rounded-[2rem] border-none shadow-md bg-card/50 backdrop-blur-sm group hover:shadow-xl transition-all overflow-hidden border-l-4 border-l-indigo-500/20 text-left">
            <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 min-w-0 flex-1 w-full sm:w-auto">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                        {isGiftVendor ? <Group className="h-7 w-7 text-indigo-600" /> : <Users className="h-7 w-7 text-indigo-600" />}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                        <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight truncate leading-none mb-1.5">
                            {fellowship.name}
                        </h3>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="h-5 px-1.5 text-[8px] font-black uppercase tracking-widest border-indigo-500/30 text-indigo-600 bg-indigo-500/5">{fellowship.groupType}</Badge>
                            <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                                <Users className="h-3 w-3" />
                                {fellowship.memberCount} Members
                            </div>
                        </div>
                    </div>
                </div>

                <Button 
                    onClick={() => router.push(`/accountability/challenge/${fellowship.id}?mode=group`)}
                    variant="outline"
                    className="w-full sm:w-auto h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-indigo-500/20 text-indigo-600 hover:bg-indigo-500/5 transition-all active:scale-95"
                >
                    <Target className="mr-2 h-4 w-4" />
                    MOBILIZE
                </Button>
            </CardContent>
        </Card>
    );
}

export default function GamesPageClient() {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { userProfile, loading: profileLoading } = useUserProfile();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('individual');
    const isMobile = useIsMobile();

    // Query for Fellowships the user belongs to
    const fellowshipsQuery = useMemo(() => {
        if (!user?.uid || !firestore) return null;
        return query(
            collection(firestore, 'fellowships'),
            where('memberIds', 'array-contains', user.uid),
            where('status', '==', 'active')
        );
    }, [user?.uid, firestore]);
    const { data: fellowships, loading: fellowshipsLoading } = useCollection<Fellowship>(fellowshipsQuery);

    const partners = useMemo(() => userProfile?.accountabilityPartners || [], [userProfile]);

    const filteredPartners = useMemo(() => {
        if (!searchTerm) return partners;
        const term = searchTerm.toLowerCase();
        return partners.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(term));
    }, [partners, searchTerm]);

    const filteredFellowships = useMemo(() => {
        if (!fellowships) return [];
        if (!searchTerm) return fellowships;
        const term = searchTerm.toLowerCase();
        return fellowships.filter(f => f.name.toLowerCase().includes(term));
    }, [fellowships, searchTerm]);

    if (profileLoading || fellowshipsLoading) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center py-24 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse text-center">Opening Kingdom Arena...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-32 px-4 sm:px-0 text-left">
            <header className="space-y-6 pt-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Gamepad2 className="h-6 w-6 text-primary" />
                            <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Kingdom Arena</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black font-headline tracking-tight uppercase">Battle Lobby</h1>
                        <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-2xl leading-relaxed italic text-balance">
                            Sharpen your spirit through interactive biblical challenges. Duel your partners or lead your community into a shared Word crusade.
                        </p>
                    </div>
                </div>

                <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-6 rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Sparkles className="h-24 w-24 text-primary rotate-12" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shrink-0">
                            <Star className="h-7 w-7 text-white animate-pulse" />
                        </div>
                        <div>
                            <p className="text-lg font-black uppercase tracking-tight leading-tight">Your Kingdom XP</p>
                            <p className="text-2xl font-black text-primary tracking-tighter">{userProfile?.kingdomPoints || 0} POINTS</p>
                        </div>
                    </div>
                    <div className="h-px w-full bg-primary/10 sm:hidden" />
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground relative z-10">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        Top Ranked Laborer
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40" />
                        <Input 
                            placeholder={activeTab === 'individual' ? "Search partners..." : "Search groups..."}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="h-14 pl-12 rounded-[1.5rem] bg-muted/20 border-none shadow-inner text-lg font-bold w-full"
                        />
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 h-14 bg-muted/40 p-1 rounded-2xl">
                            <TabsTrigger value="individual" className="rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest h-full flex items-center gap-2">
                                <User className="h-3.5 w-3.5" />
                                Individual Duel
                            </TabsTrigger>
                            <TabsTrigger value="group" className="rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest h-full flex items-center gap-2">
                                <Users className="h-3.5 w-3.5" />
                                Group Crusade
                            </TabsTrigger>
                        </TabsList>
                        
                        <div className="mt-8">
                            <TabsContent value="individual" className="space-y-4 outline-none animate-in fade-in slide-in-from-left-4 duration-500">
                                {filteredPartners.length > 0 ? (
                                    filteredPartners.map(partner => (
                                        <PartnerGameCard key={partner.userId} partner={partner} />
                                    ))
                                ) : (
                                    <div className="py-20 text-center px-8 border-2 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center">
                                        <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6">
                                            <HeartHandshake className="h-10 w-10 text-primary opacity-10" />
                                        </div>
                                        <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-40">No Partners found</h3>
                                        <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-xs mx-auto leading-relaxed text-balance">
                                            {searchTerm ? "Try a different search term." : "Connect with partners in Settings to challenge them here."}
                                        </p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="group" className="space-y-4 outline-none animate-in fade-in slide-in-from-right-4 duration-500">
                                {filteredFellowships.length > 0 ? (
                                    filteredFellowships.map(f => (
                                        <GroupChallengeCard key={f.id} fellowship={f} />
                                    ))
                                ) : (
                                    <div className="py-20 text-center px-8 border-2 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center">
                                        <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6">
                                            <Users className="h-10 w-10 text-primary opacity-10" />
                                        </div>
                                        <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-40">No Groups Found</h3>
                                        <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-xs mx-auto leading-relaxed text-balance">
                                            Join or start a Fellowship/Association to mobilize your community in the arena.
                                        </p>
                                        {!searchTerm && (
                                            <Button asChild variant="outline" className="mt-8 rounded-xl h-11 px-8 font-bold border-primary/20 text-primary hover:bg-primary/5">
                                                <Link href="/fellowships">DISCOVER GROUPS</Link>
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </header>

            <footer className="px-8 pt-12 border-t mt-12 text-center max-w-2xl mx-auto">
                <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-[0.2em] opacity-40 italic text-balance">
                    "Iron sharpens iron, and one man sharpens another." — Proverbs 27:17
                </p>
            </footer>
        </div>
    );
}

