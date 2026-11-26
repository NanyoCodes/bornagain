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
    Square
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
    setDoc
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { UserProfile, Fellowship, GameSession, GameSessionType, FellowshipMember } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { BIBLE_GAME_DATA } from '@/lib/bible-game-data';
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

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
    const { userProfile } = useUserProfile();
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const timerOptions = [30, 60, 90, 120];

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
    
    const directoryRef = useRef<HTMLDivElement>(null);
    const correctCountRef = useRef(0);
    const wrongCountRef = useRef(0);

    const fellowshipDocRef = useMemo(() => (firestore && fellowshipId) ? doc(firestore, 'fellowships', fellowshipId) : null, [firestore, fellowshipId]);
    const { data: fellowship, loading: fellowshipLoading } = useDoc<Fellowship>(fellowshipDocRef);

    const isMember = useMemo(() => (user && (fellowship?.memberIds || []).includes(user.uid)) || false, [user, fellowship?.memberIds]);

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
    }, [activeGameType, usedIndices, user?.uid]);

    const handleGameEnd = useCallback(() => {
        const finalCorrect = correctCountRef.current;
        const finalWrong = wrongCountRef.current;
        
        setIsGameActive(false);
        setGameState('finished');
        
        if (!user || !firestore || !fellowship || !isMember) return;
        setIsSavingSession(true);

        const totalPoints = finalCorrect * 10;
        const participantIds = [user.uid];
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
                toast({ title: 'Crusade Victory!', description: `Contribution of ${totalPoints} Points recorded.` });
            })
            .catch(() => toast({ variant: 'destructive', title: 'Save Failed' }))
            .finally(() => setIsSavingSession(false));
    }, [user, firestore, fellowshipId, fellowship, activeGameType, toast, isMember]);

    const handleStart = () => {
        if (!isMember) {
            toast({ variant: 'destructive', title: 'Membership Required', description: `You must join ${fellowship?.name} to participate.` });
            return;
        }
        const pool = BIBLE_GAME_DATA[activeGameType];
        const initialIdx = Math.floor(Math.random() * pool.length);
        
        setQuizIndex(initialIdx);
        setUsedIndices([initialIdx]);
        setCorrectCount(0);
        setWrongCount(0);
        correctCountRef.current = 0;
        wrongCountRef.current = 0;
        setTimeLeft(selectedTimer);
        setGameState('playing');
        setIsGameActive(true);
        setSelectedOption(null);
    };

    useEffect(() => {
        let timer: any;
        if (isGameActive && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        } else if (timeLeft === 0 && isGameActive) {
            handleGameEnd();
        }
        return () => clearInterval(timer);
    }, [isGameActive, timeLeft, handleGameEnd]);

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

    const scrollToDirectory = () => {
        directoryRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    if (fellowshipLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    if (!fellowship) return <div className="p-20 text-center"><h2>Group not found</h2></div>;

    const directoryContent = (
        <div className="space-y-8">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-indigo-600 text-white overflow-hidden border-b-8 border-b-black/20">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.3em] opacity-80 flex items-center gap-2"><Trophy className="h-4 w-4" /> Global Crusade POINTS</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                    <p className="text-5xl font-black tracking-tighter">{totalGroupXP}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-2">Total Community Score</p>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <div className="flex items-center gap-3 px-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Crusade Leaderboard</h3>
                </div>
                <div className="space-y-3">
                    {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
                        <div key={entry.userId} className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group",
                            i === 0 ? "bg-amber-500/10 border-amber-500/30 shadow-md ring-1 ring-amber-500/10" : 
                            i === 1 ? "bg-slate-400/10 border-slate-400/30" :
                            i === 2 ? "bg-orange-700/10 border-orange-700/30" :
                            "bg-muted/30 border-transparent"
                        )}>
                            <div className="flex items-center gap-4">
                                <div className="relative shrink-0">
                                    <LiveMemberAvatar userId={entry.userId} fallbackInitials="L" className="h-10 w-10 border-2 border-background shadow-lg" />
                                    {i < 3 && (
                                        <div className={cn(
                                            "absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center border-2 border-background shadow-lg",
                                            i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : "bg-orange-700"
                                        )}>
                                            <Trophy className="h-2.5 w-2.5 text-white fill-current" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 text-left">
                                    <span className="text-sm font-black uppercase tracking-tight truncate block">{entry.name}</span>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">{entry.sessions} MISSIONS</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={cn("text-base font-black tracking-tighter", i === 0 ? "text-amber-600" : "text-primary")}>{entry.score} POINTS</p>
                            </div>
                        </div>
                    )) : <p className="text-center text-xs text-muted-foreground italic py-10">No sessions recorded yet.</p>}
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-3 px-1">
                    <Users className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Active Workforce</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                    {members?.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/5">
                            <LiveMemberAvatar userId={m.userId} fallbackInitials={m.firstName?.charAt(0)} className="h-8 w-8 border shadow-sm" />
                            <div className="min-w-0 text-left">
                                <p className="text-xs font-black uppercase truncate">{m.firstName} {m.lastName}</p>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase">Member</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-dvh w-full flex flex-col overflow-hidden bg-background">
            <ScrollArea className="flex-1 w-full h-full">
                <div className="max-w-6xl mx-auto space-y-12 pb-32 px-4 sm:px-6">
                    <header className="space-y-6 pt-4">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Sword className="h-4 w-4 text-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Kingdom Crusade</span>
                                </div>
                                <h1 className="text-2xl sm:text-4xl font-black font-headline uppercase truncate leading-tight">{fellowship.name} Arena</h1>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-10 items-start">
                            <div className="flex-1 w-full space-y-10">
                                <Card className="rounded-[2.5rem] sm:rounded-[3.5rem] border-2 border-primary/20 bg-[#09090b] shadow-2xl overflow-hidden relative group/arena transition-all hover:border-primary/40">
                                    <div className="absolute inset-0 z-0 pointer-events-none">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(249,116,22,0.1),transparent_70%)]" />
                                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] transition-transform group-hover/arena:scale-110 group-hover/arena:rotate-12 duration-1000">
                                            <Sword className="h-64 w-64 text-primary" />
                                        </div>
                                        <div className="absolute bottom-0 left-0 p-12 opacity-[0.03] transition-transform group-hover/arena:scale-110 group-hover/arena:-rotate-12 duration-1000">
                                            <ShieldCheck className="h-64 w-64 text-primary" />
                                        </div>
                                    </div>

                                    <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900 overflow-hidden z-20">
                                        {isGameActive && (
                                            <motion.div 
                                                className={cn("h-full", timeLeft <= 10 ? "bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]" : "bg-primary")}
                                                initial={{ width: "100%" }}
                                                animate={{ width: `${(timeLeft / selectedTimer) * 100}%` }}
                                                transition={{ duration: 1, ease: "linear" }}
                                            />
                                        )}
                                    </div>

                                    <CardHeader className="p-8 sm:p-12 pb-4 text-center relative z-10">
                                        <div className="flex items-center justify-center gap-2 mb-4">
                                            <div className="h-px w-8 bg-primary/20" />
                                            <Gamepad2 className="h-5 w-5 text-primary animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Crusade Mission</span>
                                            <div className="h-px w-8 bg-primary/20" />
                                        </div>
                                        <CardTitle className="text-3xl sm:text-6xl font-black font-headline uppercase text-white tracking-tighter leading-none text-center">The Arena</CardTitle>
                                    </CardHeader>
                                    
                                    <CardContent className={cn("p-8 sm:p-16 pt-0 space-y-10 relative z-10", !isGameActive && "flex flex-col items-center justify-center")}>
                                        {!isGameActive && gameState !== 'finished' ? (
                                            <div className="py-8 flex flex-col items-center gap-10 w-full">
                                                <div className="w-full space-y-10">
                                                    <div className="space-y-4">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Crusade Mode</Label>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                            {[ { id: 'word', label: 'Word Arena', icon: BookOpen }, { id: 'prayer', label: 'Prayer Altar', icon: HandHeart }, { id: 'trivia', label: 'Kingdom Trivia', icon: HelpCircle } ].map(type => (
                                                                <Button key={type.id} variant="outline" onClick={() => setActiveGameType(type.id as any)} className={cn("h-24 sm:h-32 flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-5 sm:gap-3 px-8 sm:px-4 rounded-[2rem] border-2 transition-all group/mode", activeGameType === type.id ? "bg-primary/20 border-primary text-primary shadow-2xl scale-[1.02]" : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-primary/40")}>
                                                                    <type.icon className={cn("h-8 w-8 shrink-0 transition-transform group-hover/mode:scale-110", activeGameType === type.id ? "text-primary" : "text-zinc-600")} />
                                                                    <span className="text-xs font-black uppercase tracking-widest">{type.label}</span>
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Mission Duration</Label>
                                                        <div className="grid grid-cols-4 gap-3">
                                                            {timerOptions.map(opt => (
                                                                <Button key={opt} variant="outline" size="sm" onClick={() => setSelectedTimer(opt)} className={cn("h-14 rounded-2xl font-black text-sm transition-all border-2", selectedTimer === opt ? "bg-primary text-white border-primary shadow-xl" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white")}>{opt}s</Button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-4">
                                                        <Button onClick={handleStart} size="lg" className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 text-lg active:scale-95 transition-transform">
                                                            LAUNCH CRUSADE
                                                        </Button>
                                                        <Button variant="ghost" onClick={scrollToDirectory} className="h-12 font-black uppercase tracking-widest text-[10px] text-muted-foreground">
                                                            VIEW WORKFORCE & RANK
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : isGameActive ? (
                                            <div className="space-y-8 sm:space-y-12 animate-in fade-in zoom-in duration-500">
                                                <div className="flex items-center justify-between px-2">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("h-12 w-12 sm:h-16 sm:w-16 rounded-[1.25rem] sm:rounded-[1.5rem] flex items-center justify-center border-2 shadow-2xl transition-all", timeLeft <= 10 ? "bg-red-600 border-red-500 text-white animate-pulse" : "bg-primary/10 border-primary/20 text-primary")}><Timer className="h-6 w-6 sm:h-8 sm:w-8" /></div>
                                                        <div className="text-left text-left"><p className="text-[10px] sm:text-[11px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1 text-left">Time Remaining</p><p className={cn("text-2xl sm:text-4xl font-black tracking-tighter leading-none text-left", timeLeft <= 10 ? "text-red-500" : "text-white")}>{timeLeft}s</p></div>
                                                    </div>
                                                    <div className="text-right"><p className="text-[10px] sm:text-[11px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1 text-right">Contribution</p><p className="text-2xl sm:text-4xl font-black text-green-500 tracking-tighter leading-none">+{correctCount * 10} POINTS</p></div>
                                                </div>
                                                <div className="bg-zinc-900 rounded-[2rem] sm:rounded-[3.5rem] p-8 sm:p-14 border-2 border-dashed border-white/5 shadow-inner flex items-center justify-center min-h-[220px] text-center relative overflow-hidden text-left text-left text-left"><div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none text-left text-left text-left text-left"><Target className="h-24 w-24 text-primary text-left" /></div><AnimatePresence mode="wait"><motion.p key={quizIndex} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="text-xl sm:text-2xl md:text-3xl font-serif italic leading-relaxed text-zinc-100 text-balance text-center">&ldquo;{BIBLE_GAME_DATA[activeGameType][quizIndex]?.text}&rdquo;</motion.p></AnimatePresence></div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {BIBLE_GAME_DATA[activeGameType][quizIndex]?.options.map((opt: string) => (<Button key={opt} variant="outline" className={cn("h-16 sm:h-24 rounded-[1.25rem] sm:rounded-[2rem] font-black uppercase tracking-widest text-xs sm:text-base transition-all border-2 text-center whitespace-normal p-4 text-left text-left", gameState === 'correct' && opt === BIBLE_GAME_DATA[activeGameType][quizIndex].correct ? "bg-green-600 text-white border-green-400 scale-[1.03] shadow-[0_0_40px_rgba(22,163,74,0.4)]" : gameState === 'wrong' && opt === selectedOption ? "bg-red-600 text-white border-red-400 shadow-xl" : "bg-zinc-800/50 border-white/5 text-zinc-300 hover:bg-primary/10 hover:text-primary hover:border-primary/40")} disabled={gameState !== 'playing'} onClick={() => handleCheck(opt)}>{opt}</Button>))}
                                                </div>
                                                <AnimatePresence mode="wait">
                                                    {gameState === 'wrong' && (
                                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-red-600/10 border-2 border-red-600/30 rounded-2xl text-center shadow-xl animate-in zoom-in">
                                                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Correct Answer</p>
                                                            <p className="text-lg font-black text-white">{BIBLE_GAME_DATA[activeGameType][quizIndex].correct}</p>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ) : (
                                            <div className="space-y-10 sm:space-y-16 animate-in slide-in-from-bottom-8 duration-700 text-center">
                                                <div className="space-y-6">
                                                    <div className="relative">
                                                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                                                        <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-[2.5rem] sm:rounded-[3.5rem] bg-primary flex items-center justify-center mx-auto shadow-2xl border-4 border-white/10 relative z-10">
                                                            <Award className="h-14 w-14 sm:h-20 sm:w-20 text-white" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <h3 className="text-3xl sm:text-5xl font-black uppercase text-white tracking-tight">Crusade Complete!</h3>
                                                        <div className="bg-zinc-900 rounded-[2rem] p-8 border-2 border-dashed border-primary/20 max-w-md mx-auto text-left">
                                                            <div className="flex items-center justify-center gap-2 mb-3">
                                                                <Badge className="bg-primary/20 text-primary border-none font-black text-[10px]">KINGDOM VERSE</Badge>
                                                            </div>
                                                            <p className="text-xl font-black text-white uppercase tracking-widest text-center">{BIBLE_GAME_DATA[activeGameType][quizIndex]?.ref}</p>
                                                            <p className="text-sm text-zinc-400 italic mt-3 leading-relaxed text-center text-balance">
                                                                {BIBLE_GAME_DATA[activeGameType][quizIndex]?.explanation || "Your labor in the Word builds an unshakeable foundation for the community."}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div className="bg-zinc-900 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 text-center border border-white/5 shadow-inner">
                                                        <p className="text-[10px] sm:text-xs font-black text-primary uppercase mb-2 tracking-widest">Group Legacy</p>
                                                        <p className="text-3xl sm:text-5xl font-black text-white">+{correctCount * 10} POINTS</p>
                                                    </div>
                                                    <div className="bg-zinc-900 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 text-center border border-white/5 shadow-inner">
                                                        <p className="text-[10px] sm:text-xs font-black text-green-500 uppercase mb-2 tracking-widest">Accuracy</p>
                                                        <p className="text-3xl sm:text-5xl font-black text-white">{Math.round((correctCount / (correctCount + wrongCount || 1)) * 100)}%</p>
                                                    </div>
                                                    <div className="bg-zinc-900 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border border-white/5 text-center shadow-inner">
                                                        <p className="text-[10px] sm:text-xs font-black text-amber-500 uppercase mb-2 tracking-widest">Total XP</p>
                                                        <p className="text-3xl sm:text-5xl font-black text-white">{(userProfile?.kingdomPoints || 0) + correctCount * 10} POINTS</p>
                                                    </div>
                                                </div>
                                                <Button onClick={() => { setGameState('playing'); setIsGameActive(false); setSelectedOption(null); }} className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-[0.3em] shadow-2xl">RETURN TO HUB</Button>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="p-6 bg-black/40 text-center justify-center border-t border-white/5 relative z-10"><p className="text-[10px] sm:text-xs font-black text-zinc-600 uppercase tracking-[0.5em]">United in Truth • Shared in Spirit</p></CardFooter>
                                </Card>
                            </div>

                            <div ref={directoryRef} className="w-full lg:w-96 space-y-8 scroll-mt-24">
                                {directoryContent}
                            </div>
                        </div>
                    </header>

                    <footer className="px-6 pt-12 border-t mt-12 text-center max-w-2xl mx-auto">
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-[0.2em] opacity-40 italic text-balance text-center">
                            "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend." — Proverbs 27:17
                        </p>
                    </footer>
                </div>
            </ScrollArea>
        </div>
    );
}
