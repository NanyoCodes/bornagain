
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Gamepad2, 
    Trophy, 
    BookOpen, 
    Sparkles, 
    CheckCircle2, 
    ArrowRight, 
    ArrowLeft, 
    Target, 
    Award, 
    Star, 
    Timer, 
    History, 
    Send,
    Check,
    X,
    ChevronDown,
    HandHeart,
    HelpCircle,
    Loader2,
    Sword,
    TrendingUp,
    ShieldCheck,
    Quote,
    Users,
    User,
    Square,
    Clock,
    UserMinus
} from "lucide-react";
import { cn, safeToDate } from "@/lib/utils";
import { format, parseISO, isSameDay, differenceInMinutes } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { useUser, useDoc, useCollection, useUserProfile, useFirestore } from '@/firebase';
import { 
    collection, 
    updateDoc, 
    increment, 
    serverTimestamp, 
    query, 
    where, 
    orderBy, 
    limit,
    doc,
    setDoc,
    deleteDoc,
    addDoc,
    writeBatch,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { UserProfile, Fellowship, GameSession, GameSessionType, FellowshipMember, GameInvitation } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { BIBLE_GAME_DATA } from '@/lib/bible-game-data';
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

const timerOptions = [30, 60, 90, 120];

function LiveMemberAvatar({ userId, fallbackInitials, className }: { userId: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userRef = useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const photoURL = profile?.photoURL;
    
    return (
        <Avatar className={className}>
            <AvatarImage src={photoURL} className="object-cover" />
            <AvatarFallback className="font-black bg-primary/10 text-primary">{fallbackInitials || 'U'}</AvatarFallback>
        </Avatar>
    );
}

export default function GroupCrusadeClient({ fellowshipId }: { fellowshipId: string }) {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { userProfile, loading: profileLoading } = useUserProfile();
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const [isGameActive, setIsGameActive] = useState(false);
    const [activeGameType, setActiveGameType] = useState<GameSessionType>('word');
    const [timeLeft, setTimeLeft] = useState(60);
    const [selectedTimer, setSelectedTimer] = useState(60);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [quizIndex, setQuizIndex] = useState(0);
    const [usedIndices, setUsedIndices] = useState<number[]>([]);
    const [gameState, setGameState] = useState<'playing' | 'correct' | 'wrong' | 'finished'>('playing');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSavingSession, setIsSavingSession] = useState(false);
    const [initialXP, setInitialXP] = useState(0);
    const [isRequesting, setIsRequesting] = useState(false);
    const [now, setNow] = useState<Date | null>(null);
    
    const correctCountRef = useRef(0);
    const wrongCountRef = useRef(0);

    useEffect(() => {
        setNow(new Date());
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fellowshipDocRef = useMemo(() => (firestore && fellowshipId) ? doc(firestore, 'fellowships', fellowshipId) : null, [firestore, fellowshipId]);
    const { data: fellowship, loading: fellowshipLoading, error: fellowshipError } = useDoc<Fellowship>(fellowshipDocRef);

    const isMember = useMemo(() => (user && (fellowship?.memberIds || []).includes(user.uid)) || false, [user, fellowship?.memberIds]);

    const invitationQuery = useMemo(() => {
        if (!firestore || !user?.uid || !fellowshipId) return null;
        return query(
            collection(firestore, 'gameInvitations'),
            where('participantIds', 'array-contains', user.uid),
            where('status', 'in', ['pending', 'accepted'])
        );
    }, [firestore, user?.uid, fellowshipId]);
    const { data: invitations } = useCollection<GameInvitation>(invitationQuery);
    const activeInvitation = useMemo(() => invitations?.find(i => (i as any).fellowshipId === fellowshipId), [invitations, fellowshipId]);

    const sessionsQuery = useMemo(() => {
        if (!firestore || !fellowshipId) return null;
        return query(
            collection(firestore, 'gameSessions'),
            where('fellowshipId', '==', fellowshipId),
            orderBy('createdAt', 'desc'),
            limit(100)
        );
    }, [firestore, fellowshipId]);
    const { data: groupSessions, loading: sessionsLoading } = useCollection<GameSession>(sessionsQuery);

    const membersQuery = useMemo(() => (firestore && fellowshipId && isMember) ? query(collection(firestore, 'fellowships', fellowshipId, 'members'), orderBy('joinedAt', 'desc')) : null, [firestore, fellowshipId, isMember]);
    const { data: members } = useCollection<FellowshipMember>(membersQuery);

    const leaderboard = useMemo(() => {
        if (!groupSessions) return [];
        const map: Record<string, { userId: string, name: string, score: number, sessions: number }> = {};
        
        groupSessions.forEach(s => {
            if (!map[s.userId]) {
                const memberInfo = members?.find(m => m.userId === s.userId);
                map[s.userId] = { 
                    userId: s.userId, 
                    name: memberInfo ? `${memberInfo.firstName} ${memberInfo.lastName}` : 'Kingdom Laborer', 
                    score: 0, 
                    sessions: 0 
                };
            }
            map[s.userId].score += s.score;
            map[s.userId].sessions++;
        });

        return Object.values(map).sort((a, b) => b.score - a.score).slice(0, 10);
    }, [groupSessions, members]);

    const totalGroupXP = useMemo(() => {
        return groupSessions?.reduce((acc, s) => acc + s.score, 0) || 0;
    }, [groupSessions]);

    const handleGameEnd = useCallback(() => {
        const finalCorrect = correctCountRef.current;
        const finalWrong = wrongCountRef.current;
        
        setIsGameActive(false);
        setGameState('finished');
        
        if (!user || !firestore || !fellowship || !isMember) return;
        setIsSavingSession(true);

        const totalPoints = finalCorrect * 10;
        const participantIds = fellowship.memberIds;
        const sessionData = {
            participantIds,
            userId: user.uid,
            fellowshipId: fellowshipId,
            fellowshipName: fellowship.name,
            gameType: activeGameType,
            score: totalPoints,
            correctCount: finalCorrect,
            wrongCount: finalWrong,
            createdAt: serverTimestamp()
        };

        const sessionRef = doc(collection(firestore, 'gameSessions'));
        
        setDoc(sessionRef, sessionData)
            .then(() => {
                const userRef = doc(firestore, 'users', user.uid);
                updateDoc(userRef, {
                    kingdomPoints: increment(totalPoints),
                    lastGameAt: serverTimestamp()
                });
                
                if (activeInvitation && activeInvitation.hostId === user.uid) {
                    deleteDoc(doc(firestore, 'gameInvitations', activeInvitation.id));
                }

                toast({ title: 'Crusade Victory!', description: `Contribution of ${totalPoints} Points recorded.` });
            })
            .catch(() => toast({ variant: 'destructive', title: 'Save Failed' }))
            .finally(() => setIsSavingSession(false));
    }, [user, firestore, fellowshipId, fellowship, activeGameType, toast, isMember, activeInvitation]);

    const nextChallenge = useCallback(() => {
        const pool = BIBLE_GAME_DATA[activeGameType];
        const storageKey = `seen_questions_crusade_${activeGameType}_${user?.uid}`;
        const seenIndices = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        const availableIndices = pool.map((_, i) => i).filter(i => !usedIndices.includes(i) && !seenIndices.includes(i));
        
        let targetIdx: number;
        
        if (availableIndices.length === 0) {
            localStorage.setItem(storageKey, JSON.stringify([]));
            const freshIndices = pool.map((_, i) => i).filter(i => !usedIndices.includes(i));
            if (freshIndices.length === 0) {
                handleGameEnd();
                return;
            }
            targetIdx = freshIndices[Math.floor(Math.random() * freshIndices.length)];
        } else {
            targetIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        }

        setUsedIndices(prev => [...prev, targetIdx]);
        const newSeen = [...seenIndices, targetIdx];
        localStorage.setItem(storageKey, JSON.stringify(newSeen));
        
        setQuizIndex(targetIdx);
        setGameState('playing');
        setSelectedOption(null);
    }, [activeGameType, usedIndices, user?.uid, handleGameEnd]);

    const handleStartGame = useCallback((type: GameSessionType = activeGameType, duration?: number) => {
        setInitialXP(userProfile?.kingdomPoints || 0);
        const pool = BIBLE_GAME_DATA[type];
        const initialIdx = Math.floor(Math.random() * pool.length);
        
        setQuizIndex(initialIdx);
        setUsedIndices([initialIdx]);
        setCorrectCount(0);
        setWrongCount(0);
        correctCountRef.current = 0;
        wrongCountRef.current = 0;
        setTimeLeft(duration || selectedTimer);
        setGameState('playing');
        setIsGameActive(true);
        setSelectedOption(null);
    }, [activeGameType, userProfile?.kingdomPoints, selectedTimer]);

    const handleLaunchCrusade = async () => {
        if (!user || !firestore || !fellowship || !isMember) return;
        setIsRequesting(true);

        const participantIds = fellowship.memberIds;
        const invitationData = {
            hostId: user.uid,
            guestId: fellowshipId,
            fellowshipId: fellowshipId,
            participantIds,
            status: 'pending' as const,
            gameType: activeGameType,
            timerDuration: selectedTimer,
            createdAt: serverTimestamp()
        };

        const invitationRef = doc(collection(firestore, 'gameInvitations'));
        
        try {
            await setDoc(invitationRef, invitationData);
            
            const batch = writeBatch(firestore);
            const otherMemberIds = fellowship.memberIds.filter(id => id !== user.uid);
            
            otherMemberIds.forEach(mId => {
                const notifRef = doc(collection(firestore, `users/${mId}/notifications`));
                batch.set(notifRef, {
                    userId: mId,
                    type: 'org_invite',
                    targetId: user.uid,
                    title: 'Fellowship Crusade!',
                    message: `${userProfile?.firstName} has called a ${selectedTimer}s ${activeGameType} crusade for ${fellowship.name}!`,
                    link: `/games/crusade/${fellowshipId}`,
                    isRead: false,
                    createdAt: serverTimestamp()
                });
            });

            await batch.commit();
            toast({ title: 'Crusade Mobilized', description: 'Members have been notified to join the arena.' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Mobilization Failed' });
        } finally {
            setIsRequesting(false);
        }
    };

    const handleAcceptCrusade = async () => {
        if (!activeInvitation || !firestore || !user) return;
        const invitationRef = doc(firestore, 'gameInvitations', activeInvitation.id);
        updateDoc(invitationRef, {
            status: 'accepted',
            acceptedAt: serverTimestamp()
        }).then(() => {
            handleStartGame(activeInvitation.gameType, activeInvitation.timerDuration);
        });
    };

    const handleDeclineCrusade = async () => {
        if (!activeInvitation || !firestore) return;
        if (activeInvitation.hostId === user?.uid) {
            deleteDoc(doc(firestore, 'gameInvitations', activeInvitation.id));
        } else {
            toast({ title: 'Invitation Ignored' });
        }
    };

    const handleCheck = (option: string) => {
        if (!isGameActive || gameState !== 'playing') return;
        
        const pool = BIBLE_GAME_DATA[activeGameType];
        setSelectedOption(option);
        if (option === pool[quizIndex].correct) {
            setGameState('correct');
            setCorrectCount(prev => {
                const next = prev + 1;
                correctCountRef.current = next;
                return next;
            });
            setTimeout(() => { if (isGameActive) nextChallenge(); }, 600);
        } else {
            setGameState('wrong');
            setWrongCount(prev => {
                const next = prev + 1;
                wrongCountRef.current = next;
                return next;
            });
            setTimeout(() => { if (isGameActive) nextChallenge(); }, 1500);
        }
    };

    useEffect(() => {
        if (activeInvitation?.status === 'accepted' && !isGameActive && gameState === 'playing' && now) {
            const acceptedAt = safeToDate(activeInvitation.acceptedAt);
            if (acceptedAt && differenceInMinutes(now, acceptedAt) < 1) {
                handleStartGame(activeInvitation.gameType, activeInvitation.timerDuration);
            }
        }
    }, [activeInvitation?.status, isGameActive, gameState, activeInvitation?.acceptedAt, now, handleStartGame]);

    useEffect(() => {
        let timer: any;
        if (isGameActive && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        } else if (timeLeft === 0 && isGameActive) {
            handleGameEnd();
        }
        return () => clearInterval(timer);
    }, [isGameActive, timeLeft, handleGameEnd]);

    const directoryContent = (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-left">
            <div className="bg-muted/10 rounded-[2rem] p-6 sm:p-10 border border-muted-foreground/10 text-center text-left text-left">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.4em] mb-2 text-center text-left text-left">Global Crusade POINTS</p>
                <p className="text-4xl sm:text-6xl font-black text-primary tracking-tighter text-center text-left text-left">{totalGroupXP}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2 opacity-60 text-center text-left text-left">Total Community Score</p>
            </div>

            <div className="space-y-4 text-left text-left">
                <div className="flex items-center gap-2 px-1 text-left text-left">
                    <Trophy className="h-4 w-4 text-amber-500 text-left text-left" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground text-left text-left">Crusade Leaderboard</h3>
                </div>
                {leaderboard.length > 0 ? (
                    <div className="grid gap-3 text-left">
                        {leaderboard.map((entry, idx) => (
                            <div key={entry.userId} className="flex items-center justify-between p-4 rounded-2xl bg-card/50 border shadow-sm group hover:border-primary/20 transition-all text-left">
                                <div className="flex items-center gap-4 min-w-0 text-left">
                                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 text-left text-left">
                                        <span className="text-[10px] font-black text-muted-foreground text-left text-left"> {idx + 1}</span>
                                    </div>
                                    <LiveMemberAvatar userId={entry.userId} fallbackInitials={entry.name.charAt(0)} className="h-10 w-10 border shadow-sm shrink-0 text-left text-left" />
                                    <div className="min-w-0 text-left text-left">
                                        <p className="font-black text-sm uppercase truncate group-hover:text-primary transition-colors text-left text-left">{entry.name}</p>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-left text-left text-left text-left">{entry.sessions} Missions Logged</p>
                                    </div>
                                </div>
                                <div className="text-right text-left">
                                    <p className="text-lg font-black text-primary tracking-tighter text-left text-left text-left">{entry.score}</p>
                                    <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-40 text-left text-left text-left">Points</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center border-2 border-dashed rounded-[2rem] bg-muted/5 text-left text-left text-left">
                        <p className="text-xs text-muted-foreground italic font-medium text-center text-left text-left">No sessions recorded yet.</p>
                    </div>
                )}
            </div>

            <div className="space-y-4 text-left text-left">
                <div className="flex items-center gap-2 px-1 text-left text-left">
                    <Users className="h-4 w-4 text-primary text-left text-left" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground text-left text-left">Active Workforce</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-left text-left">
                    {members?.map(m => (
                        <div key={m.userId} className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/20 text-left text-left text-left">
                            <LiveMemberAvatar userId={m.userId} fallbackInitials={m.firstName.charAt(0)} className="h-9 w-9 border shadow-sm text-left text-left text-left" />
                            <div className="min-w-0 text-left text-left text-left">
                                <p className="font-black text-xs uppercase truncate text-left text-left text-left">{m.firstName} {m.lastName}</p>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-left text-left text-left">Member</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    if (fellowshipLoading || profileLoading || sessionsLoading || !now) return <div className="flex h-full w-full flex-col items-center justify-center py-24 text-center text-left text-left"><Loader2 className="h-12 w-12 animate-spin text-primary text-left text-left text-left" /><p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse text-center text-left">Entering Arena...</p></div>;
    if (fellowshipError || !fellowship) return <div className="flex h-full w-full flex-col items-center justify-center py-24 text-center text-left text-left text-left text-left"><h2 className="text-2xl font-black font-headline uppercase tracking-tight text-center text-left text-left">Crusade Lost</h2><p className="mt-2 text-sm text-muted-foreground text-center text-left">The fellowship arena is no longer active.</p><Button variant="outline" className="mt-8 rounded-xl h-11 px-8 text-left" onClick={() => router.back()}>Go Back</Button></div>;

    return (
        <div className="h-dvh w-full flex flex-col overflow-hidden bg-background text-left text-left text-left">
            <ScrollArea className="flex-1 w-full h-full text-left">
                <div className="max-w-6xl mx-auto space-y-12 pb-32 px-4 sm:px-6 text-left text-left">
                    <header className="space-y-6 pt-4 text-left text-left">
                        <div className="flex items-center gap-4 text-left text-left">
                            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm text-left text-left text-left">
                                <ArrowLeft className="h-6 w-6 text-left text-left text-left" />
                            </Button>
                            <div className="min-w-0 text-left text-left text-left">
                                <div className="flex items-center gap-2 mb-1 text-left text-left text-left text-left">
                                    <Sword className="h-4 w-4 text-primary text-left text-left text-left" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left text-left">Kingdom Crusade</span>
                                </div>
                                <h1 className="text-2xl sm:text-4xl font-black font-headline uppercase truncate leading-tight text-left text-left text-left text-left">{fellowship.name} Arena</h1>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-10 items-start text-left text-left text-left">
                            <div className="flex-1 w-full space-y-10 text-left text-left text-left">
                                <Card className="rounded-[2.5rem] sm:rounded-[3.5rem] border-2 border-primary/20 bg-[#09090b] shadow-2xl overflow-hidden relative group/arena transition-all hover:border-primary/40 text-left text-left text-left">
                                    <div className="absolute inset-0 z-0 pointer-events-none text-left text-left">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(249,116,22,0.1),transparent_70%)] text-left text-left text-left" />
                                    </div>

                                    <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900 overflow-hidden z-20 text-left text-left">
                                        {isGameActive && (
                                            <motion.div 
                                                className={cn("h-full", timeLeft <= 10 ? "bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]" : "bg-primary")}
                                                initial={{ width: "100%" }}
                                                animate={{ width: `${(timeLeft / selectedTimer) * 100}%` }}
                                                transition={{ duration: 1, ease: "linear" }}
                                            />
                                        )}
                                    </div>

                                    <CardHeader className="p-8 sm:p-12 pb-4 text-center relative z-10 text-left text-left">
                                        <div className="flex items-center justify-center gap-2 mb-4 text-left text-left text-left">
                                            <div className="h-px w-8 bg-primary/20 text-left text-left text-left" />
                                            <Gamepad2 className="h-5 w-5 text-primary animate-pulse text-left text-left text-left" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary text-left text-left text-left text-left">Crusade Mission</span>
                                            <div className="h-px w-8 bg-primary/20 text-left text-left text-left" />
                                        </div>
                                        <CardTitle className="text-3xl sm:text-6xl font-black font-headline uppercase text-white tracking-tighter leading-none text-center text-left text-left text-left text-left">The Arena</CardTitle>
                                    </CardHeader>
                                    
                                    <CardContent className={cn("p-8 sm:p-16 pt-0 space-y-10 relative z-10 text-left text-left text-left", !isGameActive && "flex flex-col items-center justify-center")}>
                                        {!isGameActive && gameState !== 'finished' ? (
                                            <div className="py-8 flex flex-col items-center gap-10 w-full text-left text-left">
                                                {!activeInvitation ? (
                                                    <div className="w-full space-y-10 text-left text-left text-left">
                                                        <div className="space-y-4 text-left text-left text-left">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2 text-left text-left">Crusade Mode</Label>
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left text-left">
                                                                {[ { id: 'word', label: 'Word Arena', icon: BookOpen }, { id: 'prayer', label: 'Prayer Altar', icon: HandHeart }, { id: 'trivia', label: 'Kingdom Trivia', icon: HelpCircle } ].map(type => (
                                                                    <Button key={type.id} variant="outline" onClick={() => setActiveGameType(type.id as any)} className={cn("h-24 sm:h-32 flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-5 sm:gap-3 px-8 sm:px-4 rounded-[2rem] border-2 transition-all group/mode text-left text-left", activeGameType === type.id ? "bg-primary/20 border-primary text-primary shadow-2xl scale-[1.02]" : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-primary/40")}>
                                                                        <type.icon className={cn("h-8 w-8 shrink-0 transition-transform group-hover/mode:scale-110 text-left text-left", activeGameType === type.id ? "text-primary" : "text-zinc-600")} />
                                                                        <span className="text-xs font-black uppercase tracking-widest text-left text-left">{type.label}</span>
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4 text-left text-left text-left">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2 text-left text-left">Mission Duration</Label>
                                                            <div className="grid grid-cols-4 gap-3 text-left text-left text-left text-left">
                                                                {timerOptions.map(opt => (
                                                                    <Button key={opt} variant="outline" size="sm" onClick={() => setSelectedTimer(opt)} className={cn("h-14 rounded-2xl font-black text-sm transition-all border-2 text-left text-left", selectedTimer === opt ? "bg-primary text-white border-primary shadow-xl" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white")}>{opt}s</Button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-4 text-left text-left text-left">
                                                            <Button onClick={handleLaunchCrusade} size="lg" className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 text-lg active:scale-95 transition-transform text-center text-left text-left text-left" disabled={isRequesting}>
                                                                {isRequesting ? <Loader2 className="h-5 w-5 animate-spin mr-2 text-left text-left text-left" /> : <Sword className="h-5 w-5 mr-2 text-left text-left text-left" />}
                                                                LAUNCH CRUSADE
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : activeInvitation.hostId === user?.uid ? (
                                                    <div className="space-y-8 w-full flex flex-col items-center justify-center animate-in fade-in text-center text-left text-left">
                                                        <div className="relative text-left text-left">
                                                            <div className="flex -space-x-8 sm:-space-x-12 items-center justify-center text-left text-left">
                                                                <Avatar className="h-20 w-20 sm:h-28 sm:w-28 border-4 border-background shadow-2xl ring-2 ring-primary/20 transition-all duration-500 text-left text-left">
                                                                    <AvatarImage src={user?.photoURL || undefined} className="object-cover text-left text-left text-left" />
                                                                    <AvatarFallback className="font-black text-xl bg-primary/10 text-primary uppercase text-left text-left text-left">Y</AvatarFallback>
                                                                </Avatar>
                                                                <Avatar className="h-20 w-20 sm:h-28 sm:w-28 border-4 border-background shadow-2xl ring-2 ring-zinc-800 transition-all duration-500 text-left text-left">
                                                                    <AvatarImage src={members?.find(m => m.userId !== user.uid)?.photoURL || undefined} className="object-cover text-left text-left text-left" />
                                                                    <AvatarFallback className="font-black text-xl bg-muted text-muted-foreground uppercase text-left text-left text-left text-left">F</AvatarFallback>
                                                                </Avatar>
                                                            </div>
                                                            <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/40 animate-spin duration-[15s] opacity-20 pointer-events-none text-left text-left text-left" />
                                                        </div>
                                                        
                                                        <div className="space-y-2 text-center text-left text-left text-left">
                                                            <Badge variant="outline" className="h-10 px-6 rounded-full border-primary/20 text-primary uppercase font-black tracking-widest animate-pulse text-left text-left text-left">
                                                                Mobilizing Members...
                                                            </Badge>
                                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] opacity-60 text-center text-left text-left">Awaiting brethren to join the crusade</p>
                                                        </div>

                                                        <Button onClick={handleAcceptCrusade} size="lg" className="w-full h-16 rounded-2xl font-black uppercase tracking-widest shadow-xl text-center text-left text-left text-left">
                                                            ENTER ARENA NOW
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-8 w-full flex flex-col items-center justify-center animate-in slide-in-from-bottom-4 text-center text-left text-left text-left text-left">
                                                        <div className="relative text-left text-left text-left">
                                                            <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-background animate-bounce text-left text-left text-left">
                                                                <Sword className="h-10 w-10 text-white text-left text-left text-left text-left" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1 text-center text-left text-left text-left">
                                                            <p className="text-xl font-black text-white uppercase tracking-widest text-center text-left text-left">CRUSADE CALL!</p>
                                                            <p className="text-sm text-zinc-400 font-medium text-center text-left text-left">{fellowship.name} is entering the Arena.</p>
                                                        </div>
                                                        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto text-left text-left text-left text-left">
                                                            <Button onClick={handleAcceptCrusade} size="lg" className="h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl text-center text-left text-left">
                                                                <Check className="mr-2 h-5 w-5 text-left text-left text-left" /> JOIN CRUSADE
                                                            </Button>
                                                            <Button variant="ghost" onClick={handleDeclineCrusade} className="text-destructive font-black uppercase tracking-widest text-xs text-center text-left text-left text-left">
                                                                DECLINE
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : isGameActive ? (
                                            <div className="space-y-8 sm:space-y-12 animate-in fade-in zoom-in duration-500 text-left text-left text-left text-left">
                                                <div className="flex items-center justify-between px-2 text-left text-left text-left">
                                                    <div className="flex items-center gap-4 text-left text-left text-left">
                                                        <div className={cn("h-12 w-12 sm:h-16 sm:w-16 rounded-[1.25rem] sm:rounded-[1.5rem] flex items-center justify-center border-2 shadow-2xl transition-all text-left text-left", timeLeft <= 10 ? "bg-red-600 border-red-500 text-white animate-pulse" : "bg-primary/10 border-primary/20 text-primary")}><Timer className="h-6 w-6 sm:h-8 sm:w-8 text-left text-left" /></div>
                                                        <div className="text-left text-left text-left text-left"><p className="text-[10px] sm:text-[11px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1 text-left text-left text-left">Time Remaining</p><p className={cn("text-2xl sm:text-4xl font-black tracking-tighter leading-none text-left text-left", timeLeft <= 10 ? "text-red-500" : "text-white")}>{timeLeft}s</p></div>
                                                    </div>
                                                    <div className="text-right text-left text-left text-left"><p className="text-[10px] sm:text-[11px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1 text-right text-left text-left text-left">Contribution</p><p className="text-2xl sm:text-4xl font-black text-green-500 tracking-tighter leading-none text-right text-left text-left text-left">+{correctCount * 10} POINTS</p></div>
                                                </div>
                                                <div className="bg-zinc-900 rounded-[2rem] sm:rounded-[3.5rem] p-8 sm:p-14 border-2 border-dashed border-white/5 shadow-inner flex items-center justify-center min-h-[220px] text-center relative overflow-hidden text-left text-left text-left text-left"><div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none text-left text-left text-left text-left text-left text-left"><Target className="h-24 w-24 text-primary text-left text-left text-left text-left text-left" /></div><AnimatePresence mode="wait"><motion.p key={quizIndex} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="text-xl sm:text-2xl md:text-3xl font-serif italic leading-relaxed text-zinc-100 text-balance text-center text-left text-left text-left">&ldquo;{BIBLE_GAME_DATA[activeGameType][quizIndex]?.text}&rdquo;</motion.p></AnimatePresence></div>
                                                <div className="grid grid-cols-2 gap-4 text-left text-left text-left text-left">
                                                    {BIBLE_GAME_DATA[activeGameType][quizIndex]?.options.map((opt: string) => (<Button key={opt} variant="outline" className={cn("h-16 sm:h-24 rounded-[1.25rem] sm:rounded-[2rem] font-black uppercase tracking-widest text-xs sm:text-base transition-all border-2 text-center whitespace-normal p-4 text-left text-left text-left", gameState === 'correct' && opt === BIBLE_GAME_DATA[activeGameType][quizIndex].correct ? "bg-green-600 text-white border-green-400 scale-[1.03] shadow-[0_0_40px_rgba(22,163,74,0.4)]" : gameState === 'wrong' && opt === selectedOption ? "bg-red-600 text-white border-red-400 shadow-xl" : "bg-zinc-800/50 border-white/5 text-zinc-300 hover:bg-primary/10 hover:text-primary hover:border-primary/40")} disabled={gameState !== 'playing'} onClick={() => handleCheck(opt)}>{opt}</Button>))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-10 sm:space-y-16 animate-in slide-in-from-bottom-8 duration-700 text-center text-left text-left text-left">
                                                <div className="space-y-6 text-center text-left text-left">
                                                    <div className="relative text-left text-left text-left">
                                                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse text-left text-left text-left text-left" />
                                                        <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-[2.5rem] sm:rounded-[3.5rem] bg-primary flex items-center justify-center mx-auto shadow-2xl border-4 border-white/10 relative z-10 text-left text-left text-left text-left">
                                                            <Award className="h-14 w-14 sm:h-20 sm:w-20 text-white text-left text-left text-left text-left text-left" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4 text-center text-left text-left">
                                                        <h3 className="text-3xl sm:text-5xl font-black uppercase text-white tracking-tight text-center text-left text-left text-left">Crusade Complete!</h3>
                                                        <div className="bg-zinc-900 rounded-[2rem] p-8 border-2 border-dashed border-primary/20 max-w-md mx-auto text-left text-left text-left text-left text-left">
                                                            <div className="flex items-center justify-center gap-2 mb-3 text-left text-left text-left text-left">
                                                                <Badge className="bg-primary/20 text-primary border-none font-black text-[10px] text-left text-left text-left text-left text-left">KINGDOM VERSE</Badge>
                                                            </div>
                                                            <p className="text-xl font-black text-white uppercase tracking-widest text-center text-left text-left text-left text-left">{BIBLE_GAME_DATA[activeGameType][quizIndex]?.ref}</p>
                                                            <p className="text-sm text-zinc-400 italic mt-3 leading-relaxed text-balance text-center text-left text-left text-left text-left text-left">
                                                                {BIBLE_GAME_DATA[activeGameType][quizIndex]?.explanation || "Your labor in the Word builds an unshakeable foundation for the community."}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left text-left text-left text-left text-left text-left"><div className="bg-zinc-900 rounded-2xl sm:rounded-[2rem] p-6 sm:p-8 text-center border border-white/5 shadow-inner text-center text-left text-left text-left text-left"><p className="text-[10px] sm:text-xs font-black text-primary uppercase mb-2 tracking-widest text-center text-left text-left text-left text-left">Group Legacy</p><p className="text-2xl font-black text-white text-center text-left text-left text-left text-left text-left">+{correctCount * 10} POINTS</p></div><div className="bg-zinc-900 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 text-center border border-white/5 shadow-inner text-center text-left text-left text-left text-left text-left"><p className="text-[10px] sm:text-xs font-black text-green-500 uppercase mb-2 tracking-widest text-center text-left text-left text-left text-left">Accuracy</p><p className="text-2xl font-black text-white text-center text-left text-left text-left text-left text-left">{Math.round((correctCount / (correctCount + wrongCount || 1)) * 100)}%</p></div><div className="bg-zinc-900 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border border-white/5 text-center shadow-inner text-center text-left text-left text-left text-left text-left"><p className="text-[10px] sm:text-xs font-black text-amber-500 uppercase mb-2 tracking-widest text-center text-left text-left text-left text-left">Total XP</p><p className="text-2xl font-black text-white text-center text-left text-left text-left text-left text-left">{initialXP + (correctCount * 10)} POINTS</p></div></div>
                                                <Button onClick={() => { setGameState('playing'); setIsGameActive(false); setSelectedOption(null); }} className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-[0.3em] shadow-2xl text-center text-left text-left text-left text-left">RETURN TO HUB</Button>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="p-6 bg-black/40 text-center justify-center border-t border-white/5 relative z-10 text-left text-left text-left text-left text-left text-left"><p className="text-[10px] sm:text-xs font-black text-zinc-600 uppercase tracking-[0.5em] text-center text-left text-left text-left text-left text-left">United in Truth • Shared in Spirit</p></CardFooter>
                                </Card>

                                <div className="w-full space-y-8 text-left text-left text-left text-left text-left">
                                    {directoryContent}
                                </div>
                            </div>
                        </div>
                    </header>

                    <footer className="px-6 pt-12 border-t mt-12 text-center max-w-2xl mx-auto text-left text-left text-left text-left">
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-[0.2em] opacity-40 italic text-balance text-center text-left text-left text-left text-left">
                            "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend." — Proverbs 27:17
                        </p>
                    </footer>
                </div>
            </ScrollArea>
        </div>
    );
}
