'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Gamepad2, 
    Trophy, 
    ShieldAlert, 
    BookOpen, 
    Sparkles, 
    CheckCircle2, 
    XCircle, 
    ArrowRight, 
    RefreshCw, 
    Loader2, 
    ArrowLeft, 
    Target, 
    Award, 
    Star, 
    Info, 
    Timer, 
    History, 
    Play 
} from "lucide-react";
import { cn, safeToDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useUserProfile, useDoc, useCollection } from '@/firebase';
import { 
    doc, 
    updateDoc, 
    increment, 
    serverTimestamp, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    limit 
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { UserProfile, GameSession } from '@/lib/types';
import { format } from 'date-fns';

const bibleQuizzes = [
  {
    text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal ______.",
    correct: "Life",
    options: ["Life", "Wealth", "Glory", "Peace"],
    ref: "John 3:16"
  },
  {
    text: "The Lord is my shepherd, I shall not ______.",
    correct: "Want",
    options: ["Fear", "Wait", "Want", "Fall"],
    ref: "Psalm 23:1"
  },
  {
    text: "I can do all things through ______ who strengthens me.",
    correct: "Christ",
    options: ["Faith", "Christ", "Prayer", "Effort"],
    ref: "Philippians 4:13"
  },
  {
    text: "In the beginning was the ______, and the ______ was with God, and the ______ was God.",
    correct: "Word",
    options: ["Light", "Word", "Spirit", "Life"],
    ref: "John 1:1"
  },
  {
    text: "But seek first the ______ of God and his righteousness, and all these things will be added to you.",
    correct: "Kingdom",
    options: ["Grace", "Power", "Kingdom", "Peace"],
    ref: "Matthew 6:33"
  },
  {
    text: "Trust in the Lord with all your ______, and lean not on your own understanding.",
    correct: "Heart",
    options: ["Might", "Soul", "Heart", "Mind"],
    ref: "Proverbs 3:5"
  },
  {
    text: "The fruit of the Spirit is love, joy, ______, forbearance, kindness, goodness, faithfulness...",
    correct: "Peace",
    options: ["Power", "Peace", "Hope", "Strength"],
    ref: "Galatians 5:22"
  }
];

export function WordChallengeGame({ partnerId, partnerName }: { partnerId: string, partnerName: string }) {
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    // Game States
    const [isGameActive, setIsGameActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [quizIndex, setQuizIndex] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'correct' | 'wrong' | 'finished'>('playing');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSavingSession, setIsSavingSession] = useState(false);

    // Partner Data
    const partnerDocRef = useMemo(() => (firestore && partnerId) ? doc(firestore, 'users', partnerId) : null, [firestore, partnerId]);
    const { data: partnerProfile } = useDoc<UserProfile>(partnerDocRef);

    // History Data
    const historyQuery = useMemo(() => {
        if (!firestore || !user?.uid || !partnerId) return null;
        return query(
            collection(firestore, 'gameSessions'),
            where('participantIds', 'array-contains', user.uid),
            orderBy('createdAt', 'desc'),
            limit(10)
        );
    }, [firestore, user?.uid, partnerId]);
    const { data: allHistory } = useCollection<GameSession>(historyQuery);

    const filteredHistory = useMemo(() => {
        return allHistory?.filter(s => s.participantIds.includes(partnerId)) || [];
    }, [allHistory, partnerId]);

    // Timer Logic
    useEffect(() => {
        let timer: any;
        if (isGameActive && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isGameActive) {
            handleGameEnd();
        }
        return () => clearInterval(timer);
    }, [isGameActive, timeLeft]);

    const handleStart = () => {
        setQuizIndex(Math.floor(Math.random() * bibleQuizzes.length));
        setCorrectCount(0);
        setWrongCount(0);
        setTimeLeft(60);
        setGameState('playing');
        setIsGameActive(true);
        setSelectedOption(null);
    };

    const handleGameEnd = async () => {
        setIsGameActive(false);
        setGameState('finished');
        
        if (!user || !firestore) return;
        setIsSavingSession(true);

        const totalPoints = correctCount * 10;
        const sessionData = {
            participantIds: [user.uid, partnerId].sort(),
            userId: user.uid,
            partnerId: partnerId,
            score: totalPoints,
            correctCount,
            wrongCount,
            createdAt: serverTimestamp()
        };

        // 1. Save Session History
        addDoc(collection(firestore, 'gameSessions'), sessionData)
            .catch(err => console.error("History save failed", err));

        // 2. Update Global Points (Non-blocking)
        const userRef = doc(firestore, 'users', user.uid);
        updateDoc(userRef, {
            kingdomPoints: increment(totalPoints),
            lastGameAt: serverTimestamp()
        }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: { kingdomPoints: `increment by ${totalPoints}` }
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        });

        toast({ title: 'Victory Recorded!', description: `Session saved with ${totalPoints} Kingdom Points.` });
        setIsSavingSession(false);
    };

    const handleCheck = (option: string) => {
        if (!isGameActive || gameState !== 'playing') return;
        
        setSelectedOption(option);
        if (option === bibleQuizzes[quizIndex].correct) {
            setGameState('correct');
            setCorrectCount(prev => prev + 1);
            setTimeout(() => {
                if (isGameActive) nextChallenge();
            }, 800);
        } else {
            setGameState('wrong');
            setWrongCount(prev => prev + 1);
            setTimeout(() => {
                if (isGameActive) nextChallenge();
            }, 1200);
        }
    };

    const nextChallenge = () => {
        setQuizIndex((prev) => (prev + 1) % bibleQuizzes.length);
        setGameState('playing');
        setSelectedOption(null);
    };

    const quiz = bibleQuizzes[quizIndex];

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-32 px-4 sm:px-0 text-left">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full self-start sm:self-auto border bg-background shadow-sm">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-3 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 shadow-sm">
                        <Star className="h-4 w-4 text-primary fill-current" />
                        <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-primary">
                            You: {(userProfile?.kingdomPoints || 0) + (correctCount * 10)}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 bg-muted/30 px-4 py-1.5 rounded-full border border-dashed">
                        <Trophy className="h-4 w-4 text-muted-foreground opacity-60" />
                        <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">
                            {partnerName.split(' ')[0]}: {partnerProfile?.kingdomPoints || 0}
                        </span>
                    </div>
                </div>
            </div>

            <Card className="rounded-[2.5rem] border-2 border-primary/20 bg-[#09090b] shadow-2xl overflow-hidden group transition-all hover:border-primary/40 text-left">
                <CardHeader className="p-8 sm:p-10 pb-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Gamepad2 className="h-5 w-5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Arena of Truth</span>
                    </div>
                    <CardTitle className="text-2xl sm:text-4xl font-black font-headline uppercase tracking-tight text-white leading-none text-center">Sharpening the Word</CardTitle>
                    {!isGameActive && gameState !== 'finished' && (
                        <CardDescription className="text-zinc-400 text-sm font-medium mt-3 text-center">Ready to sharpen your knowledge? 60 seconds on the clock.</CardDescription>
                    )}
                </CardHeader>
                
                <CardContent className="p-8 sm:p-12 pt-0 space-y-8">
                    {!isGameActive && gameState !== 'finished' && (
                        <div className="py-12 flex flex-col items-center gap-8">
                            <div className="h-24 w-24 rounded-[2rem] bg-primary/10 flex items-center justify-center shadow-inner border-2 border-dashed border-primary/30">
                                <Timer className="h-10 w-10 text-primary animate-pulse" />
                            </div>
                            <Button 
                                onClick={handleStart} 
                                size="lg" 
                                className="w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30"
                            >
                                <Play className="mr-2 h-5 w-5 fill-current" />
                                START CHALLENGE
                            </Button>
                        </div>
                    )}

                    {isGameActive && (
                        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors border-2",
                                        timeLeft <= 10 ? "bg-red-500 border-red-400 text-white animate-pulse" : "bg-primary/10 border-primary/20 text-primary"
                                    )}>
                                        <Timer className="h-6 w-6" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Time Remaining</p>
                                        <p className={cn("text-2xl font-black tracking-tighter", timeLeft <= 10 ? "text-red-500" : "text-white")}>
                                            {timeLeft}s
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Current Gain</p>
                                    <p className="text-2xl font-black text-green-500 tracking-tighter">+{correctCount * 10}</p>
                                </div>
                            </div>

                            <div className="bg-zinc-900 rounded-[1.5rem] sm:rounded-[2.5rem] p-8 sm:p-12 border-2 border-dashed border-white/5 shadow-inner relative overflow-hidden text-center min-h-[160px] flex items-center justify-center">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                                    <BookOpen className="h-20 w-20 text-primary" />
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.p 
                                        key={quizIndex}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="text-lg sm:text-2xl font-serif italic leading-relaxed text-zinc-200 text-balance"
                                    >
                                        &ldquo;{quiz.text}&rdquo;
                                    </motion.p>
                                </AnimatePresence>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                {quiz.options.map(opt => (
                                    <Button
                                        key={opt}
                                        variant="outline"
                                        className={cn(
                                            "h-14 sm:h-20 rounded-2xl font-black uppercase tracking-widest text-xs sm:text-sm transition-all border-2",
                                            gameState === 'correct' && opt === quiz.correct ? "bg-green-600 text-white border-green-400 scale-105 shadow-[0_0_25px_rgba(22,163,74,0.4)]" : 
                                            gameState === 'wrong' && opt === selectedOption ? "bg-red-600 text-white border-red-400 shadow-lg" : 
                                            "bg-zinc-800/50 border-white/5 text-zinc-300 hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                                        )}
                                        disabled={gameState !== 'playing'}
                                        onClick={(e) => { e.stopPropagation(); handleCheck(opt); }}
                                    >
                                        {opt}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {gameState === 'finished' && (
                        <div className="space-y-10 animate-in slide-in-from-bottom-6 duration-700">
                            <div className="text-center space-y-4">
                                <div className="h-24 w-24 rounded-[2rem] bg-primary flex items-center justify-center mx-auto shadow-2xl border-4 border-white/10">
                                    <Award className="h-12 w-12 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black uppercase text-white">Challenge Complete!</h3>
                                    <p className="text-zinc-400 font-medium">Excellent labor in the Word.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-zinc-900 rounded-3xl p-4 text-center border border-white/5">
                                    <p className="text-xs font-black text-primary uppercase mb-1">Score</p>
                                    <p className="text-2xl font-black text-white">{correctCount * 10}</p>
                                </div>
                                <div className="bg-zinc-900 rounded-3xl p-4 text-center border border-white/5">
                                    <p className="text-xs font-black text-green-500 uppercase mb-1">Correct</p>
                                    <p className="text-2xl font-black text-white">{correctCount}</p>
                                </div>
                                <div className="bg-zinc-900 rounded-3xl p-4 text-center border border-white/5">
                                    <p className="text-xs font-black text-red-500 uppercase mb-1">Errors</p>
                                    <p className="text-2xl font-black text-white">{wrongCount}</p>
                                </div>
                            </div>

                            <Button 
                                onClick={handleStart}
                                className="w-full h-16 rounded-2xl font-black uppercase tracking-widest bg-white text-black hover:bg-zinc-200 shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95"
                            >
                                <RefreshCw className="h-6 w-6" />
                                RE-ENTER ARENA
                            </Button>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="p-4 bg-black/40 text-center justify-center border-t border-white/5">
                     <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Iron Sharpens Iron • Growth • Victory</p>
                </CardFooter>
            </Card>

            <div className="space-y-6 text-left">
                <div className="flex items-center justify-between px-4 sm:px-1">
                    <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-primary" />
                        <h4 className="font-black text-xs uppercase tracking-widest">Arena History</h4>
                    </div>
                    <Badge variant="secondary" className="h-5 px-2 text-[9px] uppercase font-bold opacity-60">Recent Matches</Badge>
                </div>

                <div className="space-y-2">
                    {filteredHistory.length > 0 ? filteredHistory.map(session => {
                        const date = safeToDate(session.createdAt);
                        const isMyScore = session.userId === user?.uid;
                        return (
                            <Card key={session.id} className="rounded-2xl border bg-card/50 backdrop-blur-sm p-4 hover:shadow-md transition-all">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner",
                                            isMyScore ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/40 text-muted-foreground"
                                        )}>
                                            {isMyScore ? <Star className="h-5 w-5" /> : <Award className="h-5 w-5" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-black text-sm uppercase tracking-tight truncate leading-tight">
                                                {isMyScore ? 'My Session' : `${partnerName.split(' ')[0]}'s Session`}
                                            </p>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                                {date ? format(date, 'MMM d, h:mm a') : 'Recently'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-primary tracking-tighter leading-none">{session.score}</p>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Kingdom Pts</p>
                                    </div>
                                </div>
                            </Card>
                        );
                    }) : (
                        <div className="py-12 text-center bg-muted/20 rounded-[2rem] border-2 border-dashed">
                            <History className="h-10 w-10 text-muted-foreground/10 mx-auto mb-3" />
                            <p className="text-xs text-muted-foreground italic px-12">No recorded matches in the history yet. Start a session to begin tracking progress.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 bg-muted/20 rounded-[2.5rem] border border-dashed flex items-start gap-4 shadow-inner text-left">
                <Info className="h-6 w-6 text-primary shrink-0 mt-1 opacity-60" />
                <div className="space-y-1">
                    <h4 className="font-black text-xs uppercase tracking-widest">Spiritual Training</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium text-left">Challenges are shared sessions. Your scores are visible to your partner, encouraging mutual excellence and accountability in the Word of Truth.</p>
                </div>
            </div>
        </div>
    );
}
