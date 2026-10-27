'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useDoc, useUserProfile, useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import type { UserProfile, Fellowship, GameSession, Notification } from '@/lib/types';
import { 
    Gamepad2, 
    Users, 
    ArrowRight, 
    Star, 
    Trophy,
    Search,
    Loader2,
    Sword,
    Target,
    ShieldCheck,
    ArrowLeft,
    User,
    Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { safeToDate } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { differenceInMinutes } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

function LiveSelectionAvatar({ userId, fallbackUrl, fallbackInitials, className }: { userId: string, fallbackUrl?: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userRef = useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const currentPhotoUrl = profile?.photoURL || fallbackUrl;
    
    return (
        <Avatar className={className}>
            <AvatarImage src={currentPhotoUrl} className="object-cover" />
            <AvatarFallback className="font-black bg-primary/10 text-primary">{fallbackInitials}</AvatarFallback>
        </Avatar>
    );
}

function PartnerGameCard({ 
    partner, 
    onDuel, 
    myPoints, 
    partnerPoints 
}: { 
    partner: UserProfile['accountabilityPartners'][0], 
    onDuel: () => void, 
    myPoints: number, 
    partnerPoints: number 
}) {
    const firestore = useFirestore();
    const partnerRef = useMemo(() => partner.userId ? doc(firestore, 'users', partner.userId) : null, [firestore, partner.userId]);
    const { data: partnerProfile } = useDoc<UserProfile>(partnerRef);
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const isOnline = useMemo(() => {
        if (!now) return false;
        const lastActive = safeToDate(partnerProfile?.lastActive);
        if (!lastActive) return false;
        return differenceInMinutes(now, lastActive) < 5;
    }, [partnerProfile?.lastActive, now]);

    return (
        <Card className="rounded-[1.5rem] sm:rounded-3xl border shadow-sm bg-card/50 backdrop-blur-sm group hover:shadow-xl transition-all overflow-hidden border-l-4 sm:border-l-8 border-l-primary/10 text-left">
            <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-left">
                <div className="flex items-start gap-3 sm:gap-5 min-w-0 flex-1 w-full text-left text-left">
                    <div className="relative shrink-0 text-left text-left text-left">
                        <LiveSelectionAvatar 
                            userId={partner.userId} 
                            fallbackUrl={partner.photoURL} 
                            fallbackInitials={partner.firstName?.charAt(0) || 'U'}
                            className="h-12 w-12 sm:h-20 border-2 sm:border-4 border-background shadow-xl ring-2 ring-primary/5 transition-transform group-hover:scale-105"
                        />
                        {isOnline && (
                            <div className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 text-left text-left text-left"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-background text-left text-left text-left"></span>
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1 text-left text-left text-left">
                        <h3 className="text-base sm:text-2xl font-black uppercase tracking-tight truncate leading-tight mb-1 sm:mb-2 text-left text-left text-left">
                            {partner.firstName} {partner.lastName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-left text-left text-left">
                            <Badge variant="secondary" className="h-5 sm:h-6 px-2 sm:px-3 text-[8px] sm:text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20 text-left text-left">Partner</Badge>
                            {partnerProfile?.gender && (
                                <Badge variant="outline" className="h-5 sm:h-6 px-2 sm:px-3 text-[8px] sm:text-[10px] font-black uppercase tracking-widest border-muted-foreground/30 text-muted-foreground text-left text-left">
                                    {partnerProfile.gender}
                                </Badge>
                            )}
                            <div className="flex items-center gap-2 sm:gap-3 bg-muted/30 px-3 sm:px-4 py-1 sm:py-2 rounded-xl sm:rounded-2xl border shadow-inner text-left text-left">
                                <div className="flex items-center gap-1.5 text-left text-left text-left">
                                    <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary fill-current text-left text-left text-left" />
                                    <span className="text-[8px] sm:text-[10px] font-black uppercase text-primary tracking-widest">You: {myPoints}</span>
                                </div>
                                <Separator orientation="vertical" className="h-3 sm:h-4 bg-primary/20" />
                                <div className="flex items-center gap-1.5 text-left text-left text-left">
                                    <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500 text-left text-left text-left" />
                                    <span className="text-[8px] sm:text-[10px] font-black uppercase text-zinc-500 tracking-widest">Partner: {partnerPoints}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Button 
                    onClick={onDuel}
                    className="w-full sm:w-auto h-11 sm:h-14 px-8 sm:px-10 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest sm:tracking-[0.2em] shadow-lg shadow-primary/20 transition-all active:scale-95 text-xs sm:text-sm text-center text-left"
                >
                    <Sword className="mr-2 h-4 w-4 sm:h-5 w-5 text-left text-left text-left" />
                    DUEL
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
    const { toast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('individual');
    const isMobile = useIsMobile();
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
    }, []);

    const notificationsQuery = useMemo(() => {
        if (!user?.uid || !firestore) return null;
        return query(
            collection(firestore, `users/${user.uid}/notifications`),
            where('type', '==', 'org_invite'),
            where('isRead', '==', false)
        );
    }, [user?.uid, firestore]);
    const { data: challenges } = useCollection<Notification>(notificationsQuery);

    const fellowshipsQuery = useMemo(() => {
        if (!user?.uid || !firestore) return null;
        return query(
            collection(firestore, 'fellowships'),
            where('memberIds', 'array-contains', user.uid),
            where('status', '==', 'active')
        );
    }, [user?.uid, firestore]);
    const { data: fellowships, loading: fellowshipsLoading } = useCollection<Fellowship>(fellowshipsQuery);

    const sessionsQuery = useMemo(() => {
        if (!user?.uid || !firestore) return null;
        return query(
            collection(firestore, 'gameSessions'),
            where('participantIds', 'array-contains', user.uid)
        );
    }, [user?.uid, firestore]);
    const { data: allSessions } = useCollection<GameSession>(sessionsQuery);

    const partnerDuelStats = useMemo(() => {
        const statsMap: Record<string, { myPoints: number, partnerPoints: number }> = {};
        if (!allSessions || !user?.uid) return statsMap;
        
        allSessions.forEach(session => {
            const otherId = session.participantIds.find(id => id !== user.uid);
            if (!otherId) return;

            if (!statsMap[otherId]) {
                statsMap[otherId] = { myPoints: 0, partnerPoints: 0 };
            }

            if (session.userId === user.uid) {
                statsMap[otherId].myPoints += session.score;
            } else {
                statsMap[otherId].partnerPoints += session.score;
            }
        });
        return statsMap;
    }, [allSessions, user?.uid]);

    const partners = useMemo(() => {
        const list = userProfile?.accountabilityPartners || [];
        const uniqueMap = new Map();
        list.forEach(p => {
            if (p.userId) {
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

    const handleAcceptChallenge = async (notifId: string, link: string) => {
        if (!user?.uid || !firestore) return;
        const notifRef = doc(firestore, `users/${user.uid}/notifications`, notifId);
        try {
            await updateDoc(notifRef, { isRead: true });
            router.push(link);
        } catch (e) {
            console.error("Failed to mark notification as read:", e);
            router.push(link); 
        }
    };

    const interleavedPartners = useMemo(() => {
        const list: any[] = [];
        filteredPartners.forEach((p, i) => {
            list.push({ type: 'partner', data: p });
            if ((i + 1) % 4 === 0) {
                list.push({ type: 'ad', id: `ad-partner-${i}` });
            }
        });
        return list;
    }, [filteredPartners]);

    const interleavedFellowshipsList = useMemo(() => {
        const list: any[] = [];
        filteredFellowships.forEach((f, i) => {
            list.push({ type: 'fellowship', data: f });
            if ((i + 1) % 4 === 0) {
                list.push({ type: 'ad', id: `ad-fellowship-${i}` });
            }
        });
        return list;
    }, [filteredFellowships]);

    if (profileLoading || fellowshipsLoading || !now) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center py-24 text-center text-left text-left">
                <Loader2 className="h-12 w-12 animate-spin text-primary text-left text-left" />
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse text-center text-left text-left">Opening Kingdom Arena...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-10 pb-32 px-4 sm:px-6 text-left text-left">
            <header className="space-y-4 sm:space-y-6 pt-4 text-left text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 text-left text-left text-left">
                    <div className="space-y-1.5 text-left text-left">
                        <div className="flex items-center gap-2 mb-1 text-left text-left text-left">
                            <Gamepad2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary text-left text-left text-left text-left" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left text-left text-left text-left">Kingdom Arena</span>
                        </div>
                        <h1 className="text-2xl sm:text-5xl font-black font-headline tracking-tight uppercase text-left text-left">Battle Lobby</h1>
                        <p className="text-xs sm:text-base text-muted-foreground font-medium max-w-2xl leading-relaxed italic text-balance text-left text-left">
                            Sharpen your spirit through interactive biblical challenges. Duel your partners or lead your community into a shared Word crusade.
                        </p>
                    </div>
                </div>

                <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-5 sm:p-8 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 shadow-inner relative overflow-hidden text-left text-left">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-left text-left">
                        <Sparkles className="h-16 w-16 sm:h-24 sm:w-24 text-primary rotate-12 text-left text-left text-left" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10 text-left text-left">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shrink-0 text-left text-left">
                            <Star className="h-6 w-6 sm:h-7 sm:w-7 text-white animate-pulse text-left text-left text-left" />
                        </div>
                        <div className="text-left text-left">
                            <p className="text-lg font-black uppercase tracking-tight leading-tight text-left text-left text-left">Your Kingdom XP</p>
                            <p className="text-xl sm:text-2xl font-black text-primary tracking-tighter text-left text-left text-left">{userProfile?.kingdomPoints || 0} POINTS</p>
                        </div>
                    </div>
                    <div className="h-px w-full bg-primary/10 sm:hidden text-left text-left" />
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground relative z-10 text-left text-left">
                        <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 text-left text-left text-left" />
                        Top Ranked Laborer
                    </div>
                </div>

                {challenges && challenges.length > 0 && (
                    <div className="space-y-4 text-left text-left">
                        <div className="flex items-center gap-2 px-1 text-left text-left">
                            <Sword className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary text-left text-left text-left" />
                            <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left text-left text-left">Received Challenges</h3>
                        </div>
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 text-left text-left">
                            {challenges.map(notif => (
                                <Card key={notif.id} className="rounded-2xl border-2 border-primary/20 bg-primary/5 overflow-hidden animate-in zoom-in text-left text-left">
                                    <CardContent className="p-3 sm:p-4 flex flex-col gap-3 text-left text-left text-left">
                                        <div className="flex items-center gap-3 min-w-0 text-left text-left text-left">
                                            <LiveSelectionAvatar 
                                                userId={notif.targetId || ''} 
                                                fallbackInitials="P" 
                                                className="h-9 w-9 sm:h-10 sm:w-10 border shadow-sm shrink-0 text-left text-left" 
                                            />
                                            <div className="min-w-0 flex-1 text-left text-left">
                                                <p className="text-[11px] sm:text-xs font-black uppercase tracking-tight truncate text-primary text-left text-left text-left">{notif.title}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium line-clamp-2 leading-tight text-left text-left text-left">{notif.message}</p>
                                            </div>
                                        </div>
                                        <Button 
                                            onClick={() => handleAcceptChallenge(notif.id, notif.link || '/games')}
                                            size="sm" 
                                            className="w-full rounded-xl h-9 px-4 font-black uppercase tracking-widest text-[10px] shadow-lg text-center text-left"
                                        >
                                            ENTER ARENA
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-4 text-left text-left">
                    <div className="relative text-left text-left">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 text-left text-left text-left" />
                        <Input 
                            placeholder={activeTab === 'individual' ? "Search partners..." : "Search groups..."}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="h-12 sm:h-14 pl-12 rounded-[1.25rem] sm:rounded-[1.5rem] bg-muted/20 border-none shadow-inner text-sm sm:text-lg font-bold w-full text-left text-left text-left"
                        />
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full text-left text-left">
                        <TabsList className="grid w-full grid-cols-2 h-12 sm:h-14 bg-muted/40 p-1 rounded-2xl text-left text-left text-left">
                            <TabsTrigger value="individual" className="rounded-xl font-black text-[9px] sm:text-xs uppercase tracking-widest h-full flex items-center justify-center gap-1.5 sm:gap-2 text-center text-left text-left">
                                <User className="h-3.5 w-3.5 text-left text-left text-left" />
                                <span className="truncate text-left text-left">Individual Duel</span>
                            </TabsTrigger>
                            <TabsTrigger value="group" className="rounded-xl font-black text-[9px] sm:text-xs uppercase tracking-widest h-full flex items-center justify-center gap-1.5 sm:gap-2 text-center text-left text-left">
                                <Users className="h-3.5 w-3.5 text-left text-left text-left" />
                                <span className="truncate text-left text-left">Group Crusade</span>
                            </TabsTrigger>
                        </TabsList>
                        
                        <div className="mt-6 sm:mt-8 text-left text-left">
                            <TabsContent value="individual" className="space-y-4 outline-none animate-in fade-in slide-in-from-left-4 duration-500 text-left text-left text-left">
                                {interleavedPartners.length > 0 ? (
                                    interleavedPartners.map((item, i) => (
                                        item.type === 'ad' ? (
                                            <Card key={item.id} className="rounded-2xl border-2 border-dashed bg-muted/5 h-24 flex items-center justify-center text-left"><p className="text-[8px] font-black uppercase text-muted-foreground/30 text-left">Kingdom Ad Space</p></Card>
                                        ) : (
                                            <PartnerGameCard 
                                                key={`partner-${item.data.userId}`} 
                                                partner={item.data} 
                                                onDuel={() => router.push(`/accountability/challenge/${item.data.userId}`)} 
                                                myPoints={partnerDuelStats[item.data.userId]?.myPoints || 0}
                                                partnerPoints={partnerDuelStats[item.data.userId]?.partnerPoints || 0}
                                            />
                                        )
                                    ))
                                ) : (
                                    <div className="py-16 sm:py-20 text-center px-8 border-2 border-dashed rounded-[2.5rem] sm:rounded-[3rem] bg-muted/5 flex flex-col items-center text-left text-left">
                                        <div className="h-16 w-16 bg-muted/10 rounded-full flex items-center justify-center mb-6 text-left text-left text-left">
                                            <Users className="h-8 w-8 sm:h-10 sm:w-10 text-primary opacity-10 text-left text-left text-left" />
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-black font-headline uppercase tracking-tight opacity-40 text-center text-left text-left">No Partners found</h3>
                                        <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-xs mx-auto leading-relaxed text-balance text-center text-left text-left">
                                            {searchTerm ? "Try a different search term." : "Connect with partners in Settings to challenge them here."}
                                        </p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="group" className="space-y-4 outline-none animate-in fade-in slide-in-from-right-4 duration-500 text-left text-left text-left">
                                {interleavedFellowshipsList.length > 0 ? (
                                    interleavedFellowshipsList.map((item, i) => (
                                        item.type === 'ad' ? (
                                            <Card key={item.id} className="rounded-2xl border-2 border-dashed bg-muted/5 h-24 flex items-center justify-center text-left"><p className="text-[8px] font-black uppercase text-muted-foreground/30 text-left">Kingdom Ad Space</p></Card>
                                        ) : (
                                            <Card key={`fellowship-${item.data.id}`} className="rounded-2xl sm:rounded-3xl border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden text-left text-left">
                                                <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-left text-left">
                                                    <div className="flex items-center gap-4 text-left w-full sm:w-auto text-left text-left text-left">
                                                        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-left text-left text-left"><Users className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 text-left text-left text-left" /></div>
                                                        <div className="min-w-0 text-left text-left text-left text-left">
                                                            <h3 className="font-black text-base sm:text-lg uppercase truncate text-left text-left text-left">{item.data.name}</h3>
                                                            <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left text-left text-left">{item.data.memberCount} Members</p>
                                                        </div>
                                                    </div>
                                                    <Button className="w-full sm:w-auto h-11 px-8 rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] text-center text-left text-left">START CRUSADE</Button>
                                                </CardContent>
                                            </Card>
                                        )
                                    ))
                                ) : (
                                    <div className="py-16 sm:py-20 text-center px-8 border-2 border-dashed rounded-[2.5rem] sm:rounded-[3rem] bg-muted/5 flex flex-col items-center text-left text-left">
                                        <div className="h-16 w-16 bg-muted/10 rounded-full flex items-center justify-center mb-6 text-left text-left text-left">
                                            <Users className="h-8 w-8 sm:h-10 sm:w-10 text-primary opacity-10 text-left text-left text-left" />
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-black font-headline uppercase tracking-tight opacity-40 text-center text-left text-left">No Groups Found</h3>
                                        <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-xs mx-auto leading-relaxed text-balance text-center text-left text-left">
                                            Join or start a Fellowship/Association to mobilize your community in the arena.
                                        </p>
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </header>

            <footer className="px-6 pt-12 border-t mt-12 text-center max-w-2xl mx-auto text-left text-left">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-[0.2em] opacity-40 italic text-balance text-center text-left text-left text-left">
                    "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend." — Proverbs 27:17
                </p>
            </footer>
        </div>
    );
}