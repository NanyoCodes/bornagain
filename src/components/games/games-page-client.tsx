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
    Group,
    User,
    Quote
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn, safeToDate } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { format, differenceInMinutes } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogTrigger 
} from '@/components/ui/dialog';
import { 
    Drawer, 
    DrawerContent, 
    DrawerHeader, 
    DrawerTitle, 
    DrawerDescription 
} from '@/components/ui/drawer';

/**
 * @fileOverview High-fidelity Games Arena Lobby.
 * Supports Individual Duels with partners and Group Crusades with Fellowships.
 */

function ChallengePartnerDialog({ 
    partnerName, 
    onChallenge, 
    isProcessing, 
    isOpen, 
    onOpenChange 
}: { 
    partnerName: string, 
    onChallenge: () => void, 
    isProcessing: boolean, 
    isOpen: boolean, 
    onOpenChange: (open: boolean) => void 
}) {
    const isMobile = useIsMobile();
    const header = (
        <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
            <div className="flex items-center gap-2 mb-2 text-left text-left">
                <Gamepad2 className="h-5 w-5 text-primary text-left text-left" />
                <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left text-left">Kingdom Arena</span>
            </div>
            <DialogHeader className="text-left p-0 text-left">
                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Kingdom Challenge</DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-left text-left">You're about to enter the arena with {partnerName}.</DialogDescription>
            </DialogHeader>
        </div>
    );

    const content = (
        <div className="p-8 space-y-8 text-left text-left">
            <div className="bg-primary/5 rounded-[2rem] p-6 border-2 border-dashed border-primary/20 relative overflow-hidden text-left text-left">
                <Quote className="absolute top-4 right-6 h-12 w-12 opacity-5 rotate-12 text-left text-left" />
                <p className="text-base font-serif italic leading-relaxed relative z-10 text-left text-left">
                    "Iron sharpens iron, and one man sharpens another."
                </p>
                <p className="text-[10px] font-black uppercase text-primary/60 text-right mt-3 tracking-widest text-right text-left text-left">— Proverbs 27:17</p>
            </div>

            <p className="text-sm text-muted-foreground font-medium leading-relaxed text-balance text-left text-left">
                In the next screen, you will select the challenge type (Word Arena, Prayer Altar, or Trivia) and the session duration.
            </p>

            <Button onClick={onChallenge} disabled={isProcessing} className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-center text-left">
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-2 text-left text-left" /> : <ArrowRight className="h-5 w-5 mr-2 text-left text-left" />}
                PROCEED TO ARENA
            </Button>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onOpenChange}>
                <DrawerContent className="h-auto max-h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
                    {header}
                    <ScrollArea className="flex-grow text-left text-left">{content}</ScrollArea>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left text-left text-left">
                {header}
                {content}
            </DialogContent>
        </Dialog>
    );
}

function PartnerGameCard({ partner, onDuel }: { partner: UserProfile['accountabilityPartners'][0], onDuel: () => void }) {
    const firestore = useFirestore();
    const partnerRef = useMemo(() => partner.userId ? doc(firestore, 'users', partner.userId) : null, [firestore, partner.userId]);
    const { data: profile } = useDoc<UserProfile>(partnerRef);

    const isOnline = useMemo(() => {
        const lastActive = safeToDate(profile?.lastActive);
        if (!lastActive) return false;
        return differenceInMinutes(new Date(), lastActive) < 5;
    }, [profile?.lastActive]);

    return (
        <Card className="rounded-[2rem] border-none shadow-md bg-card/50 backdrop-blur-sm group hover:shadow-xl transition-all overflow-hidden border-l-4 border-l-primary/20 text-left text-left text-left">
            <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
                <div className="flex items-center gap-4 min-w-0 flex-1 w-full sm:w-auto text-left text-left text-left text-left">
                    <div className="relative shrink-0 text-left text-left">
                        <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-4 border-background shadow-xl ring-2 ring-primary/5 transition-transform group-hover:scale-105 text-left text-left">
                            <AvatarImage src={profile?.photoURL || partner.photoURL} className="object-cover text-left text-left" />
                            <AvatarFallback className="font-black text-xl bg-primary/10 text-primary text-center flex items-center justify-center h-full w-full text-left text-left">
                                {partner.firstName?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                            <div className="absolute -top-0.5 -right-0.5 flex h-4 w-4 text-left text-left">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 text-left text-left"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-background text-left text-left"></span>
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1 text-left text-left text-left">
                        <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight truncate leading-none mb-1.5 text-left text-left">
                            {partner.firstName} {partner.lastName}
                        </h3>
                        <div className="flex items-center gap-2 text-left">
                            <Badge variant="secondary" className="h-5 px-1.5 text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20 text-left text-left">Partner</Badge>
                            <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-bold uppercase tracking-widest text-left text-left">
                                <Trophy className="h-3 w-3 text-amber-500 text-left text-left" />
                                {profile?.kingdomPoints || 0} XP
                            </div>
                        </div>
                    </div>
                </div>

                <Button 
                    onClick={onDuel}
                    className="w-full sm:w-auto h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 transition-all active:scale-95 group-hover:bg-primary/90 text-center text-left"
                >
                    <Sword className="mr-2 h-4 w-4 text-left text-left" />
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
        <Card className="rounded-[2rem] border-none shadow-md bg-card/50 backdrop-blur-sm group hover:shadow-xl transition-all overflow-hidden border-l-4 border-l-indigo-500/20 text-left text-left">
            <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
                <div className="flex items-center gap-4 min-w-0 flex-1 w-full sm:w-auto text-left text-left">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform text-left text-left">
                        {isGiftVendor ? <Group className="h-7 w-7 text-indigo-600 text-left text-left" /> : <Users className="h-7 w-7 text-indigo-600 text-left text-left" />}
                    </div>
                    <div className="min-w-0 flex-1 text-left text-left">
                        <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight truncate leading-none mb-1.5 text-left text-left">
                            {fellowship.name}
                        </h3>
                        <div className="flex items-center gap-2 text-left text-left">
                            <Badge variant="outline" className="h-5 px-1.5 text-[8px] font-black uppercase tracking-widest border-indigo-500/30 text-indigo-600 bg-indigo-500/5 text-left text-left"> {fellowship.groupType}</Badge>
                            <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-bold uppercase tracking-widest text-left text-left">
                                <Users className="h-3 w-3 text-left text-left" />
                                {fellowship.memberCount} Members
                            </div>
                        </div>
                    </div>
                </div>

                <Button 
                    onClick={() => router.push(`/accountability/challenge/${fellowship.id}?mode=group`)}
                    variant="outline"
                    className="w-full sm:w-auto h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-indigo-500/20 text-indigo-600 hover:bg-indigo-500/5 transition-all active:scale-95 text-center text-left"
                >
                    <Target className="mr-2 h-4 w-4 text-left text-left" />
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
    const [selectedPartnerForDuel, setSelectedPartnerForDuel] = useState<any>(null);

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

    const partners = useMemo(() => {
        const list = userProfile?.accountabilityPartners || [];
        const uniqueMap = new Map();
        list.forEach(p => {
            if (p.userId) {
                // Keep the one with a photoURL if available
                if (!uniqueMap.has(p.userId) || (!uniqueMap.get(p.userId).photoURL && p.photoURL)) {
                    uniqueMap.set(p.userId, p);
                }
            }
        });
        return Array.from(uniqueMap.values());
    }, [userProfile]);

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
            <div className="flex h-full w-full flex-col items-center justify-center py-24 text-center text-left">
                <Loader2 className="h-12 w-12 animate-spin text-primary text-left text-left" />
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse text-center text-left">Opening Kingdom Arena...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-32 px-4 sm:px-0 text-left text-left text-left">
            <header className="space-y-6 pt-4 text-left text-left text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-left text-left text-left">
                    <div className="space-y-1 text-left text-left text-left">
                        <div className="flex items-center gap-2 mb-2 text-left text-left text-left">
                            <Gamepad2 className="h-6 w-6 text-primary text-left text-left text-left" />
                            <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left text-left text-left">Kingdom Arena</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black font-headline tracking-tight uppercase text-left text-left text-left">Battle Lobby</h1>
                        <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-2xl leading-relaxed italic text-balance text-left text-left text-left">
                            Sharpen your spirit through interactive biblical challenges. Duel your partners or lead your community into a shared Word crusade.
                        </p>
                    </div>
                </div>

                <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-inner relative overflow-hidden text-left text-left text-left">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-left text-left text-left">
                        <Sparkles className="h-24 w-24 text-primary rotate-12 text-left text-left text-left" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10 text-left text-left text-left">
                        <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shrink-0 text-left text-left text-left">
                            <Star className="h-7 w-7 text-white animate-pulse text-left text-left text-left" />
                        </div>
                        <div className="text-left text-left text-left">
                            <p className="text-lg font-black uppercase tracking-tight leading-tight text-left text-left text-left">Your Kingdom XP</p>
                            <p className="text-2xl font-black text-primary tracking-tighter text-left text-left text-left">{userProfile?.kingdomPoints || 0} POINTS</p>
                        </div>
                    </div>
                    <div className="h-px w-full bg-primary/10 sm:hidden text-left text-left text-left" />
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground relative z-10 text-left text-left text-left">
                        <Trophy className="h-4 w-4 text-amber-500 text-left text-left text-left" />
                        Top Ranked Laborer
                    </div>
                </div>

                <div className="space-y-4 text-left text-left text-left">
                    <div className="relative text-left text-left text-left text-left">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 text-left text-left text-left" />
                        <Input 
                            placeholder={activeTab === 'individual' ? "Search partners..." : "Search groups..."}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="h-14 pl-12 rounded-[1.5rem] bg-muted/20 border-none shadow-inner text-lg font-bold w-full text-left text-left text-left"
                        />
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full text-left text-left text-left">
                        <TabsList className="grid w-full grid-cols-2 h-14 bg-muted/40 p-1 rounded-2xl text-left text-left text-left">
                            <TabsTrigger value="individual" className="rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest h-full flex items-center gap-2 text-center text-left text-left">
                                <User className="h-3.5 w-3.5 text-left text-left text-left" />
                                Individual Duel
                            </TabsTrigger>
                            <TabsTrigger value="group" className="rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest h-full flex items-center gap-2 text-center text-left text-left">
                                <Users className="h-3.5 w-3.5 text-left text-left text-left" />
                                Group Crusade
                            </TabsTrigger>
                        </TabsList>
                        
                        <div className="mt-8 text-left text-left text-left text-left">
                            <TabsContent value="individual" className="space-y-4 outline-none animate-in fade-in slide-in-from-left-4 duration-500 text-left text-left text-left">
                                {filteredPartners.length > 0 ? (
                                    filteredPartners.map(partner => (
                                        <PartnerGameCard key={partner.userId} partner={partner} onDuel={() => setSelectedPartnerForDuel(partner)} />
                                    ))
                                ) : (
                                    <div className="py-20 text-center px-8 border-2 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center text-left text-left text-left">
                                        <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6 text-left text-left text-left">
                                            <HeartHandshake className="h-10 w-10 text-primary opacity-10 text-left text-left text-left" />
                                        </div>
                                        <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-40 text-center text-left text-left">No Partners found</h3>
                                        <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-xs mx-auto leading-relaxed text-balance text-center text-left text-left">
                                            {searchTerm ? "Try a different search term." : "Connect with partners in Settings to challenge them here."}
                                        </p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="group" className="space-y-4 outline-none animate-in fade-in slide-in-from-right-4 duration-500 text-left text-left text-left text-left">
                                {filteredFellowships.length > 0 ? (
                                    filteredFellowships.map(f => (
                                        <GroupChallengeCard key={f.id} fellowship={f} />
                                    ))
                                ) : (
                                    <div className="py-20 text-center px-8 border-2 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center text-left text-left text-left">
                                        <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6 text-left text-left text-left">
                                            <Users className="h-10 w-10 text-primary opacity-10 text-left text-left text-left" />
                                        </div>
                                        <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-40 text-center text-left text-left">No Groups Found</h3>
                                        <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-xs mx-auto leading-relaxed text-balance text-center text-left text-left">
                                            Join or start a Fellowship/Association to mobilize your community in the arena.
                                        </p>
                                        {!searchTerm && (
                                            <Button asChild variant="outline" className="mt-8 rounded-xl h-11 px-8 font-bold border-primary/20 text-primary hover:bg-primary/5 text-center text-left">
                                                <Link href="/fellowships" className="text-left text-left text-left text-left">DISCOVER GROUPS</Link>
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </header>

            <footer className="px-8 pt-12 border-t mt-12 text-center max-w-2xl mx-auto text-left text-left text-left">
                <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-[0.2em] opacity-40 italic text-balance text-center text-left text-left text-left">
                    "Iron sharpens iron, and one man sharpens another." — Proverbs 27:17
                </p>
            </footer>

            <ChallengePartnerDialog 
                partnerName={selectedPartnerForDuel?.firstName || ''}
                isOpen={!!selectedPartnerForDuel}
                onOpenChange={(open) => !open && setSelectedPartnerForDuel(null)}
                onChallenge={() => {
                    const id = selectedPartnerForDuel.userId;
                    setSelectedPartnerForDuel(null);
                    router.push(`/accountability/challenge/${id}`);
                }}
                isProcessing={false}
            />
        </div>
    );
}
