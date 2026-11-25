
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
    Share2,
    Hourglass,
    Clock,
    Users,
    Lock,
    ShieldAlert,
    TrendingUp,
    ShieldCheck,
    Quote,
    Activity,
    ChevronRight,
    User
} from "lucide-react";
import { cn, safeToDate } from "@/lib/utils";
import { format, isSameDay } from "date-fns";
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
    addDoc,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import Link from 'next/link';

const timerOptions = [60, 90, 120];

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
    const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);

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

    const membersQuery = useMemo(() => {
        if (!firestore || !fellowshipId || !isMember) return null;
        return query(collection(firestore, 'fellowships', fellowshipId, 'members'), orderBy('joinedAt', 'desc'));
    }, [firestore, fellowshipId, isMember]);
    const { data: members, loading: membersLoading } = useCollection<FellowshipMember>(membersQuery);

    const leaderboard = useMemo(() => {
        if (!groupSessions) return [];
        const map: Record<string, { userId: string, name: string, score: number, sessions: number }> = {};
        
        groupSessions.forEach(s => {
            if (!map[s.userId]) {
                map[s.userId] = { userId: s.userId, name: 'Kingdom Laborer', score: 0, sessions: 0 };
            }
            map[s.userId].score += s.score;
            map[s.userId].sessions++;
        });

        return Object.values(map).sort((a, b) => b.score - a.score).slice(0, 10);
    }, [groupSessions]);

    const totalGroupXP = useMemo(() => {
        return groupSessions?.reduce((acc, s) => acc + s.score, 0) || 0;
    }, [groupSessions]);

    const nextChallenge = useCallback(() => {
        const pool = BIBLE_GAME_DATA[activeGameType];
        const availableIndices = pool.map((_, i) => i).filter(i => !usedIndices.includes(i));
        
        if (availableIndices.length === 0) {
            handleGameEnd();
            return;
        }

        const targetIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        setUsedIndices(prev => [...prev, targetIdx]);
        setQuizIndex(targetIdx);
        setGameState('playing');
        setSelectedOption(null);
    }, [activeGameType, usedIndices]);

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
                toast({ title: 'Crusade Victory!', description: `Contribution of ${totalPoints} XP recorded for ${fellowship.name}.` });
            })
            .catch(() => toast({ variant: 'destructive', title: 'Save Failed' }))
            .finally(() => setIsSavingSession(false));
    }, [user, firestore, fellowshipId, fellowship, activeGameType, toast, isMember]);

    const handleStart = () => {
        if (!isMember) {
            toast({ variant: 'destructive', title: 'Membership Required', description: `You must join ${fellowship?.name} to participate in this crusade.` });
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

    if (fellowshipLoading) return <div className="flex h-screen items-center justify-center text-left"><Loader2 className="animate-spin text-primary" /></div>;
    if (!fellowship) return <div className="p-20 text-center text-left"><h2>Group not found</h2></div>;

    const directoryContent = (
        <div className="space-y-10 text-left">
            <Card className="rounded-[2rem] border-none shadow-xl bg-indigo-600 text-white overflow-hidden border-b-8 border-b-black/20 text-left">
                <CardHeader className="p-8 pb-4 text-left">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.3em] opacity-80 flex items-center gap-2 text-left"><Trophy className="h-4 w-4" /> Global Crusade XP</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0 text-left">
                    <p className="text-5xl font-black tracking-tighter text-left">{totalGroupXP}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-2 text-left">Total Community Score</p>
                </CardContent>
            </Card>

            <div className="space-y-6 text-left">
                <div className="flex items-center gap-3 px-1 text-left">
                    <TrendingUp className="h-4 w-4 text-primary text-left" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground text-left">Crusade Leaderboard</h3>
                </div>
                <div className="space-y-3 text-left">
                    {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
                        <div key={entry.userId} className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group text-left",
                            i === 0 ? "bg-amber-500/10 border-amber-500/30 shadow-md ring-1 ring-amber-500/10" : 
                            i === 1 ? "bg-slate-400/10 border-slate-400/30" :
                            i === 2 ? "bg-orange-700/10 border-orange-700/30" :
                            "bg-muted/30 border-transparent"
                        )}>
                            <div className="flex items-center gap-4 text-left">
                                <div className="relative shrink-0 text-left">
                                    <LiveMemberAvatar userId={entry.userId} fallbackInitials="L" className="h-10 w-10 border-2 border-background shadow-lg" />
                                    {i < 3 && (
                                        <div className={cn(
                                            "absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center border-2 border-background shadow-lg text-left",
                                            i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : "bg-orange-700"
                                        )}>
                                            <Trophy className="h-2.5 w-2.5 text-white fill-current text-left" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 text-left">
                                    <span className="text-sm font-black uppercase tracking-tight truncate block text-left"> {entry.name}</span>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase text-left">{entry.sessions} MISSIONS</span>
                                </div>
                            </div>
                            <div className="text-right text-left">
                                <p className={cn("text-base font-black tracking-tighter", i === 0 ? "text-amber-600" : "text-primary")}>{entry.score} XP</p>
                            </div>
                        </div>
                    )) : <p className="text-center text-xs text-muted-foreground italic py-10">No sessions recorded yet.</p>}
                </div>
            </div>

            <div className="space-y-6 text-left">
                <div className="flex items-center gap-3 px-1 text-left">
                    <Users className="h-4 w-4 text-primary text-left" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground text-left">Active Workforce</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    {members?.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/5 text-left">
                            <LiveMemberAvatar userId={m.userId} fallbackInitials={m.firstName?.charAt(0)} className="h-8 w-8 border shadow-sm text-left" />
                            <div className="min-w-0 text-left">
                                <p className="text-xs font-black uppercase truncate text-left">{m.firstName} {m.lastName}</p>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase text-left">Member</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32 px-4 sm:px-6 text-left">
            <header className="space-y-6 pt-4 text-left">
                <div className="flex items-center gap-4 text-left">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm text-left">
                        <ArrowLeft className="h-5 w-5 text-left" />
                    </Button>
                    <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-2 mb-1 text-left">
                            <Sword className="h-4 w-4 text-primary text-left" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Kingdom Crusade</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black font-headline uppercase truncate text-left">{fellowship.name} Arena</h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                    <Card className="lg:col-span-2 rounded-[2rem] sm:rounded-[3.5rem] border-2 border-primary/20 bg-[#09090b] shadow-2xl overflow-hidden relative text-left">
                        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900 overflow-hidden text-left">
                            {isGameActive && (
                                <motion.div 
                                    className={cn("h-full", timeLeft <= 10 ? "bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]" : "bg-primary")}
                                    initial={{ width: "100%" }}
                                    animate={{ width: `${(timeLeft / selectedTimer) * 100}%` }}
                                    transition={{ duration: 1, ease: "linear" }}
                                />
                            )}
                        </div>

                        <CardHeader className="p-8 sm:p-12 pb-4 text-center text-left">
                            <div className="flex items-center justify-center gap-2 mb-2 text-left">
                                <Gamepad2 className="h-5 w-5 text-primary text-left" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Crusade Mission</span>
                            </div>
                            <CardTitle className="text-2xl sm:text-5xl font-black font-headline uppercase text-white text-center text-left">The Arena</CardTitle>
                        </CardHeader>
                        
                        <CardContent className={cn("p-8 sm:p-16 pt-0 space-y-10 text-left", !isGameActive && "flex flex-col items-center justify-center text-left")}>
                            {!isGameActive && gameState !== 'finished' ? (
                                <div className="py-8 flex flex-col items-center gap-10 w-full text-left">
                                    <div className="w-full space-y-10 text-left">
                                        <div className="space-y-4 text-left">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2 text-left">Crusade Mode</Label>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                                                {[ { id: 'word', label: 'Word Arena', icon: BookOpen }, { id: 'prayer', label: 'Prayer Altar', icon: HandHeart }, { id: 'trivia', label: 'Kingdom Trivia', icon: HelpCircle } ].map(type => (
                                                    <Button key={type.id} variant="outline" onClick={() => setActiveGameType(type.id as any)} className={cn("h-24 sm:h-32 flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-5 sm:gap-3 px-8 sm:px-4 rounded-[2rem] border-2 transition-all group/mode text-left", activeGameType === type.id ? "bg-primary/20 border-primary text-primary shadow-2xl scale-[1.02]" : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-primary/40")}>
                                                        <type.icon className={cn("h-8 w-8 shrink-0 transition-transform group-hover/mode:scale-110", activeGameType === type.id ? "text-primary" : "text-zinc-600")} />
                                                        <span className="text-xs font-black uppercase tracking-widest text-left">{type.label}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-4 text-left">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2 text-left">Mission Duration</Label>
                                            <div className="grid grid-cols-3 gap-3 text-left">
                                                {timerOptions.map(opt => (
                                                    <Button key={opt} variant="outline" size="sm" onClick={() => setSelectedTimer(opt)} className={cn("h-14 rounded-2xl font-black text-sm transition-all border-2", selectedTimer === opt ? "bg-primary text-white border-primary shadow-xl" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white")}>{opt}s</Button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-4 text-left">
                                            <Button onClick={handleStart} size="lg" className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 text-center text-lg active:scale-95 transition-transform text-left">
                                                LAUNCH CRUSADE
                                            </Button>
                                            <Button variant="ghost" onClick={() => setIsDirectoryOpen(true)} className="h-12 font-black uppercase tracking-widest text-[10px] text-muted-foreground text-center">
                                                VIEW WORKFORCE & RANK
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : isGameActive ? (
                                <div className="space-y-8 sm:space-y-12 animate-in fade-in zoom-in duration-500 text-left">
                                    <div className="flex items-center justify-between px-2 text-left">
                                        <div className="flex items-center gap-4 text-left">
                                            <div className={cn("h-12 w-12 sm:h-16 sm:w-16 rounded-[1.25rem] sm:rounded-[1.5rem] flex items-center justify-center border-2 shadow-2xl transition-all", timeLeft <= 10 ? "bg-red-600 border-red-500 text-white animate-pulse" : "bg-primary/10 border-primary/20 text-primary")}><Timer className="h-6 w-6 sm:h-8 sm:w-8" /></div>
                                            <div className="text-left"><p className="text-[10px] sm:text-[11px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1 text-left">Time Remaining</p><p className={cn("text-2xl sm:text-4xl font-black tracking-tighter leading-none text-left", timeLeft <= 10 ? "text-red-500" : "text-white")}>{timeLeft}s</p></div>
                                        </div>
                                        <div className="text-right"><p className="text-[10px] sm:text-[11px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1 text-right">Contribution</p><p className="text-2xl sm:text-4xl font-black text-green-500 tracking-tighter leading-none text-right">+{correctCount * 10} XP</p></div>
                                    </div>
                                    <div className="bg-zinc-900 rounded-[2rem] sm:rounded-[3.5rem] p-8 sm:p-14 border-2 border-dashed border-white/5 shadow-inner flex items-center justify-center min-h-[220px] text-center relative overflow-hidden text-left"><div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none text-left"><Target className="h-24 w-24 text-primary text-left" /></div><AnimatePresence mode="wait"><motion.p key={quizIndex} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="text-xl sm:text-2xl md:text-3xl font-serif italic leading-relaxed text-zinc-100 text-balance text-center">&ldquo;{BIBLE_GAME_DATA[activeGameType][quizIndex]?.text}&rdquo;</motion.p></AnimatePresence></div>
                                    <div className="grid grid-cols-2 gap-4 text-left">
                                        {BIBLE_GAME_DATA[activeGameType][quizIndex]?.options.map((opt: string) => (<Button key={opt} variant="outline" className={cn("h-16 sm:h-24 rounded-[1.25rem] sm:rounded-[2rem] font-black uppercase tracking-widest text-xs sm:text-base transition-all border-2 text-center whitespace-normal p-4", gameState === 'correct' && opt === BIBLE_GAME_DATA[activeGameType][quizIndex].correct ? "bg-green-600 text-white border-green-400 scale-[1.03] shadow-[0_0_40px_rgba(22,163,74,0.4)]" : gameState === 'wrong' && opt === selectedOption ? "bg-red-600 text-white border-red-400 shadow-xl" : "bg-zinc-800/50 border-white/5 text-zinc-300 hover:bg-primary/10 hover:text-primary hover:border-primary/40")} disabled={gameState !== 'playing'} onClick={() => handleCheck(opt)}>{opt}</Button>))}
                                    </div>
                                    <AnimatePresence mode="wait">
                                        {gameState === 'wrong' && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-red-600/10 border-2 border-red-600/30 rounded-2xl text-center shadow-xl animate-in zoom-in text-left">
                                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 text-center">Correct Answer</p>
                                                <p className="text-lg font-black text-white text-center">{BIBLE_GAME_DATA[activeGameType][quizIndex].correct}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <div className="space-y-10 sm:space-y-16 animate-in slide-in-from-bottom-8 duration-700 text-center text-left">
                                    <div className="space-y-6 text-center text-left">
                                        <div className="relative text-left">
                                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse text-left" />
                                            <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-[2.5rem] sm:rounded-[3.5rem] bg-primary flex items-center justify-center mx-auto shadow-2xl border-4 border-white/10 relative z-10 text-left text-left">
                                                <Award className="h-14 w-14 sm:h-20 sm:w-20 text-white text-left" />
                                            </div>
                                        </div>
                                        <div className="space-y-4 text-center text-left">
                                            <h3 className="text-3xl sm:text-5xl font-black uppercase text-white tracking-tight text-center">Crusade Complete!</h3>
                                            <div className="bg-zinc-900 rounded-[2rem] p-8 border-2 border-dashed border-primary/20 max-w-md mx-auto text-left">
                                                <div className="flex items-center justify-center gap-2 mb-3 text-left">
                                                    <Badge className="bg-primary/20 text-primary border-none font-black text-[10px] text-left">KINGDOM VERSE</Badge>
                                                </div>
                                                <p className="text-xl font-black text-white uppercase tracking-widest text-center">{BIBLE_GAME_DATA[activeGameType][quizIndex]?.ref}</p>
                                                <p className="text-sm text-zinc-400 italic mt-3 leading-relaxed text-center text-balance text-left">
                                                    {BIBLE_GAME_DATA[activeGameType][quizIndex]?.explanation || "Your labor in the Word builds an unshakeable foundation for the community."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                                        <div className="bg-zinc-900 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border border-white/5 text-center shadow-inner text-left">
                                            <p className="text-[10px] sm:text-xs font-black text-primary uppercase mb-2 tracking-widest text-center">Group Legacy</p>
                                            <p className="text-3xl sm:text-5xl font-black text-white text-center">+{correctCount * 10}</p>
                                        </div>
                                        <div className="bg-zinc-900 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border border-white/5 text-center shadow-inner text-left">
                                            <p className="text-[10px] sm:text-xs font-black text-green-500 uppercase mb-2 tracking-widest text-center">Accuracy</p>
                                            <p className="text-3xl sm:text-5xl font-black text-white text-center">{Math.round((correctCount / (correctCount + wrongCount || 1)) * 100)}%</p>
                                        </div>
                                        <div className="bg-zinc-900 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border border-white/5 text-center shadow-inner text-left">
                                            <p className="text-[10px] sm:text-xs font-black text-amber-500 uppercase mb-2 tracking-widest text-center">Total XP</p>
                                            <p className="text-3xl sm:text-5xl font-black text-white text-center">{(userProfile?.kingdomPoints || 0) + correctCount * 10}</p>
                                        </div>
                                    </div>
                                    <Button onClick={() => { setGameState('playing'); resetToSelection(); }} className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-2xl text-center">RETURN TO HUB</Button>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="p-6 bg-black/40 text-center justify-center border-t border-white/5 text-left"><p className="text-[10px] sm:text-xs font-black text-zinc-600 uppercase tracking-[0.5em] text-center">United in Truth • Shared in Spirit</p></CardFooter>
                    </Card>

                    <div className="hidden lg:block space-y-8 text-left">
                        {directoryContent}
                    </div>
                </div>
            </header>

            <Sheet open={isDirectoryOpen} onOpenChange={setIsDirectoryOpen}>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                        <SheetHeader className="text-left flex-shrink-0 p-0 text-left">
                            <div className="flex items-center gap-3 mb-2 text-left">
                                <Users className="h-5 w-5 text-primary text-left" />
                                <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Crusade Directory</span>
                            </div>
                            <SheetTitle className="text-2xl font-black font-headline uppercase text-left">Mission Workforce</SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1 text-left">Active laborers and leaderboard for {fellowship.name}.</SheetDescription>
                        </SheetHeader>
                    </div>
                    <ScrollArea className="flex-grow text-left">
                        <div className="p-6 sm:p-8 text-left">
                            {directoryContent}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            <footer className="px-6 pt-12 border-t mt-12 text-center max-w-2xl mx-auto text-left">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-[0.2em] opacity-40 italic text-balance text-center">
                    "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend." — Proverbs 27:17
                </p>
            </footer>
        </div>
    );

    function resetToSelection() {
        setIsGameActive(false);
        setGameState('playing');
        setSelectedOption(null);
        setUsedIndices([]);
        setCorrectCount(0);
        setWrongCount(0);
        correctCountRef.current = 0;
        wrongCountRef.current = 0;
        setTimeLeft(selectedTimer);
    }
}
