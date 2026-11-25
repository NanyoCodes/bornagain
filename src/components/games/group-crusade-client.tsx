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
    Users
} from "lucide-react";
import { cn, safeToDate } from "@/lib/utils";
import { format, isSameDay } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { useUser, useDoc, useCollection, useFirestore, useUserProfile } from '@/firebase';
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
import type { UserProfile, Fellowship, GameSession, GameSessionType } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { BIBLE_GAME_DATA } from '@/lib/bible-game-data';
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const timerOptions = [60, 90, 120];

export default function GroupCrusadeClient({ fellowshipId }: { fellowshipId: string }) {
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
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

    const correctCountRef = useRef(0);
    const wrongCountRef = useRef(0);

    const fellowshipDocRef = useMemo(() => (firestore && fellowshipId) ? doc(firestore, 'fellowships', fellowshipId) : null, [firestore, fellowshipId]);
    const { data: fellowship, loading: fellowshipLoading } = useDoc<Fellowship>(fellowshipDocRef);

    const sessionsQuery = useMemo(() => {
        if (!firestore || !fellowshipId || !user?.uid) return null;
        // Optimization: List all sessions for this fellowship, rules now allow membership-based listing
        return query(
            collection(firestore, 'gameSessions'),
            where('fellowshipId', '==', fellowshipId),
            orderBy('createdAt', 'desc'),
            limit(100)
        );
    }, [firestore, fellowshipId, user?.uid]);
    const { data: groupSessions, loading: sessionsLoading } = useCollection<GameSession>(sessionsQuery);

    const leaderboard = useMemo(() => {
        if (!groupSessions) return [];
        const map: Record<string, { userId: string, name: string, photoURL?: string, score: number, sessions: number }> = {};
        
        groupSessions.forEach(s => {
            if (!map[s.userId]) {
                map[s.userId] = { userId: s.userId, name: 'Member', score: 0, sessions: 0 };
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
        
        if (!user || !firestore || !fellowship) return;
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
    }, [user, firestore, fellowshipId, fellowship, activeGameType, toast]);

    const handleStart = () => {
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
            setTimeout(() => { if (isGameActive) nextChallenge(); }, 500);
        } else {
            setGameState('wrong');
            setWrongCount(prev => {
                const next = prev + 1;
                wrongCountRef.current = next;
                return next;
            });
            setTimeout(() => { if (isGameActive) nextChallenge(); }, 1200);
        }
    };

    if (fellowshipLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    if (!fellowship) return <div className="p-20 text-center">Group not found</div>;

    const quiz = BIBLE_GAME_DATA[activeGameType][quizIndex];

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32 px-4 sm:px-6 text-left">
            <header className="space-y-6 pt-4 text-left">
                <div className="flex items-center gap-4 text-left">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full border bg-background shadow-sm text-left">
                        <ArrowLeft className="h-4 w-4 text-left" />
                    </Button>
                    <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2 mb-1 text-left">
                            <Sword className="h-4 w-4 text-primary text-left" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Kingdom Crusade</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black font-headline uppercase truncate text-left">{fellowship.name} Arena</h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                    <Card className="lg:col-span-2 rounded-[2rem] sm:rounded-[3rem] border-2 border-primary/20 bg-[#09090b] shadow-2xl overflow-hidden text-left">
                        <CardHeader className="p-6 sm:p-10 pb-4 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2 text-left">
                                <Gamepad2 className="h-5 w-5 text-primary text-left" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Mission Field</span>
                            </div>
                            <CardTitle className="text-2xl sm:text-4xl font-black font-headline uppercase text-white text-center">Group Crusade</CardTitle>
                        </CardHeader>
                        
                        <CardContent className="p-6 sm:p-12 pt-0 space-y-8 text-left">
                            {!isGameActive && gameState !== 'finished' ? (
                                <div className="py-8 flex flex-col items-center gap-8 w-full text-left">
                                    <div className="w-full space-y-8 text-left">
                                        <div className="space-y-4 text-left">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Challenge Type</Label>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                                                {[ { id: 'word', label: 'Word Arena', icon: BookOpen }, { id: 'prayer', label: 'Prayer Altar', icon: HandHeart }, { id: 'trivia', label: 'Kingdom Trivia', icon: HelpCircle } ].map(type => (
                                                    <Button key={type.id} variant="outline" onClick={() => setActiveGameType(type.id as any)} className={cn("h-20 sm:h-28 flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-4 sm:gap-2 px-6 sm:px-4 rounded-2xl border-2 transition-all text-left", activeGameType === type.id ? "bg-primary/20 border-primary text-primary shadow-lg" : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-primary/40")}>
                                                        <type.icon className="h-6 w-6 shrink-0" />
                                                        <span className="text-[11px] font-black uppercase tracking-widest">{type.label}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-4 text-left">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Session Duration</Label>
                                            <div className="grid grid-cols-3 gap-2 text-left">
                                                {timerOptions.map(opt => (
                                                    <Button key={opt} variant="outline" size="sm" onClick={() => setSelectedTimer(opt)} className={cn("h-12 rounded-xl font-black text-xs transition-all text-left", selectedTimer === opt ? "bg-primary text-white border-none shadow-lg" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white")}>{opt}s</Button>
                                                ))}
                                            </div>
                                        </div>
                                        <Button onClick={handleStart} size="lg" className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 text-center">
                                            ENTER ARENA
                                        </Button>
                                    </div>
                                </div>
                            ) : isGameActive ? (
                                <div className="space-y-6 sm:space-y-10 animate-in fade-in zoom-in duration-500 text-left">
                                    <div className="flex items-center justify-between px-2 text-left">
                                        <div className="flex items-center gap-3 text-left text-left">
                                            <div className={cn("h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center border-2 shadow-lg", timeLeft <= 10 ? "bg-red-500 border-red-400 text-white animate-pulse" : "bg-primary/10 border-primary/20 text-primary")}><Timer className="h-5 w-5 sm:h-6 sm:w-6" /></div>
                                            <div className="text-left text-left"><p className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1 text-left">Time Left</p><p className={cn("text-xl sm:text-2xl font-black tracking-tighter leading-none text-left", timeLeft <= 10 ? "text-red-500" : "text-white")}>{timeLeft}s</p></div>
                                        </div>
                                        <div className="text-right text-left text-left"><p className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1 text-right">Contribution</p><p className="text-xl sm:text-2xl font-black text-green-500 tracking-tighter leading-none text-right">{correctCount * 10} XP</p></div>
                                    </div>
                                    <div className="bg-zinc-900 rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-10 border-2 border-dashed border-white/5 shadow-inner flex items-center justify-center min-h-[160px] text-center relative overflow-hidden text-left"><div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none text-left"><Target className="h-16 w-16 text-primary text-left" /></div><AnimatePresence mode="wait"><motion.p key={quizIndex} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="text-lg sm:text-xl font-serif italic leading-relaxed text-zinc-200 text-balance text-center">&ldquo;{quiz?.text}&rdquo;</motion.p></AnimatePresence></div>
                                    <div className="grid grid-cols-2 gap-3 text-left">
                                        {quiz?.options.map((opt: string) => (<Button key={opt} variant="outline" className={cn("h-14 sm:h-20 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-sm transition-all border-2 text-center whitespace-normal", gameState === 'correct' && opt === quiz.correct ? "bg-green-600 text-white border-green-400 scale-105 shadow-[0_0_25px_rgba(22,163,74,0.4)]" : gameState === 'wrong' && opt === selectedOption ? "bg-red-600 text-white border-red-400 shadow-lg" : "bg-zinc-800/50 border-white/5 text-zinc-300 hover:bg-primary/10 hover:text-primary")} disabled={gameState !== 'playing'} onClick={() => handleCheck(opt)}>{opt}</Button>))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-bottom-6 duration-700 text-center text-left">
                                    <div className="space-y-4 text-center text-left">
                                        <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-[2rem] bg-primary flex items-center justify-center mx-auto shadow-2xl border-4 border-white/10 text-left">
                                            <Award className="h-10 w-10 sm:h-14 sm:w-14 text-white text-left" />
                                        </div>
                                        <div className="space-y-2 text-center text-left">
                                            <h3 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tight text-center">Crusade Complete!</h3>
                                            <p className="text-sm text-zinc-400 italic font-medium text-center">You've contributed to the group legacy.</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 sm:gap-6 text-left"><div className="bg-zinc-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 text-center border border-white/5 shadow-inner text-left"><p className="text-[10px] sm:text-xs font-black text-primary uppercase mb-1 tracking-widest text-center">Group XP</p><p className="text-xl sm:text-4xl font-black text-white text-center">+{correctCount * 10}</p></div><div className="bg-zinc-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 text-center border border-white/5 shadow-inner text-left"><p className="text-[10px] sm:text-xs font-black text-green-500 uppercase mb-1 tracking-widest text-center">Accuracy</p><p className="text-xl sm:text-4xl font-black text-white text-center">{Math.round((correctCount / (correctCount + wrongCount || 1)) * 100)}%</p></div><div className="bg-zinc-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 text-center border border-white/5 shadow-inner text-left"><p className="text-[10px] sm:text-xs font-black text-amber-500 uppercase mb-1 tracking-widest text-center">XP Total</p><p className="text-xl sm:text-4xl font-black text-white text-center">{(userProfile?.kingdomPoints || 0) + correctCount * 10}</p></div></div>
                                    <Button onClick={() => setGameState('playing')} className="w-full h-16 rounded-2xl font-black uppercase tracking-widest shadow-xl text-center text-left">RETURN TO LOBBY</Button>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="p-4 bg-black/40 text-center justify-center border-t border-white/5 text-left"><p className="text-[8px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] text-center">United in Truth • Shared in Spirit</p></CardFooter>
                    </Card>

                    <div className="space-y-6 text-left">
                        <Card className="rounded-[2rem] border shadow-md bg-indigo-600 text-white overflow-hidden text-left">
                            <CardHeader className="p-6 pb-2 text-left text-left">
                                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] opacity-80 flex items-center gap-2 text-left"><Trophy className="h-4 w-4 text-left" /> Global Group XP</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 pt-0 text-left">
                                <p className="text-4xl font-black tracking-tighter text-left">{totalGroupXP}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1 text-left">Lifetime Community Score</p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2rem] border shadow-md bg-card/50 backdrop-blur-sm overflow-hidden text-left">
                            <CardHeader className="p-6 pb-2 border-b bg-muted/5 text-left">
                                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-left"><Award className="h-4 w-4 text-primary text-left" /> Group Leaderboard</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 text-left">
                                <ScrollArea className="h-72 text-left">
                                    <div className="space-y-3 text-left">
                                        {leaderboard.map((entry, i) => (
                                            <div key={entry.userId} className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-transparent group hover:border-primary/20 transition-all text-left">
                                                <div className="flex items-center gap-3 text-left">
                                                    <span className="text-[10px] font-black text-muted-foreground w-4 text-left">{i + 1}</span>
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 border-2 border-background shadow-sm flex items-center justify-center font-black text-[10px] text-primary text-left">{entry.name.charAt(0)}</div>
                                                    <span className="text-xs font-black uppercase tracking-tight truncate max-w-[80px] text-left">{entry.name}</span>
                                                </div>
                                                <div className="text-right text-left">
                                                    <p className="text-xs font-black text-primary text-right">{entry.score} XP</p>
                                                    <p className="text-[8px] font-bold text-muted-foreground uppercase text-right">{entry.sessions} SESSIONS</p>
                                                </div>
                                            </div>
                                        ))}
                                        {leaderboard.length === 0 && (
                                            <div className="py-20 text-center text-muted-foreground italic text-left">
                                                <p className="text-xs text-center">No sessions recorded.</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </header>
        </div>
    );
}