'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gamepad2, Trophy, ShieldAlert, BookOpen, Sparkles, CheckCircle2, XCircle, ArrowRight, RefreshCw, Loader2, ArrowLeft, Target, Award, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useUserProfile } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

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

    const [quizIndex, setQuizIndex] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'correct' | 'wrong'>('playing');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [points, setPoints] = useState(0);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        setQuizIndex(Math.floor(Math.random() * bibleQuizzes.length));
    }, []);

    const quiz = bibleQuizzes[quizIndex];
    const firstName = userProfile?.firstName || 'Believer';

    const handleCheck = async (option: string) => {
        setSelectedOption(option);
        if (option === quiz.correct) {
            setGameState('correct');
            const winPoints = 10;
            setPoints(prev => prev + winPoints);
            
            if (user && firestore) {
                setIsUpdating(true);
                const userRef = doc(firestore, 'users', user.uid);
                await updateDoc(userRef, {
                    kingdomPoints: increment(winPoints),
                    lastGameAt: serverTimestamp()
                }).catch(console.error);
                setIsUpdating(false);
            }
        } else {
            setGameState('wrong');
        }
    };

    const nextChallenge = () => {
        setQuizIndex((prev) => (prev + 1) % bibleQuizzes.length);
        setGameState('playing');
        setSelectedOption(null);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between px-4 sm:px-0">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
                    <Star className="h-4 w-4 text-primary fill-current" />
                    <span className="font-black text-xs uppercase tracking-widest text-primary">Your Points: {userProfile?.kingdomPoints || 0 + points}</span>
                </div>
            </div>

            <Card className="rounded-none sm:rounded-[2.5rem] border-2 border-primary/20 bg-[#09090b] shadow-2xl overflow-hidden group transition-all hover:border-primary/40 text-left">
                <CardHeader className="p-8 sm:p-10 pb-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Gamepad2 className="h-5 w-5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Kingdom Challenge with {partnerName}</span>
                    </div>
                    <CardTitle className="text-2xl sm:text-4xl font-black font-headline uppercase tracking-tight text-white leading-none">Sharpening the Word</CardTitle>
                    <CardDescription className="text-zinc-400 text-sm font-medium mt-3">Passage completion for spiritual strength.</CardDescription>
                </CardHeader>
                
                <CardContent className="p-8 sm:p-12 pt-0 space-y-8">
                    <div className="bg-zinc-900 rounded-[2rem] p-8 sm:p-12 border-2 border-dashed border-white/5 shadow-inner relative overflow-hidden text-center">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                            <BookOpen className="h-20 w-20 text-primary" />
                        </div>
                        <p className="text-xl sm:text-2xl font-serif italic leading-relaxed text-zinc-200 text-balance">
                            &ldquo;{quiz.text}&rdquo;
                        </p>
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

                    <AnimatePresence mode="wait">
                        {gameState !== 'playing' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className={cn(
                                    "p-8 rounded-[2rem] flex flex-col items-center text-center gap-4 border-2 border-dashed",
                                    gameState === 'correct' ? "bg-green-500/5 border-green-500/20 text-green-500" : "bg-red-500/5 border-red-500/20 text-red-500"
                                )}>
                                    <div className="flex items-center gap-3">
                                        {gameState === 'correct' ? (
                                            <Trophy className="h-6 w-6 animate-bounce" />
                                        ) : (
                                            <ShieldAlert className="h-6 w-6" />
                                        )}
                                        <span className="font-black uppercase tracking-[0.2em] text-sm">
                                            {gameState === 'correct' ? `WELL DONE, ${firstName.toUpperCase()}! (+10 PTS)` : "RETURN TO THE SCRIPTURE"}
                                        </span>
                                    </div>
                                    <p className="text-base font-bold italic opacity-80 text-center text-balance">
                                        &ldquo;The correct word is <span className="underline underline-offset-8 decoration-2">{quiz.correct}</span>. From {quiz.ref}.&rdquo;
                                    </p>
                                </div>

                                <Button 
                                    onClick={nextChallenge}
                                    className="w-full h-16 rounded-2xl font-black uppercase tracking-widest bg-white text-black hover:bg-zinc-200 shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95"
                                >
                                    {isUpdating ? <Loader2 className="h-6 w-6 animate-spin" /> : <RefreshCw className="h-6 w-6" />}
                                    CONTINUE CHALLENGE
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
                <CardFooter className="p-4 bg-black/40 text-center justify-center border-t border-white/5">
                     <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Iron Sharpens Iron • Growth • Victory</p>
                </CardFooter>
            </Card>

            <div className="p-6 bg-muted/20 rounded-[2.5rem] border border-dashed flex items-start gap-4 shadow-inner">
                <Info className="h-6 w-6 text-primary shrink-0 mt-1 opacity-60" />
                <div className="space-y-1">
                    <h4 className="font-black text-xs uppercase tracking-widest">About Challenges</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">Challenge results are visible to your partner, encouraging a healthy and holy competition in the Word of Truth.</p>
                </div>
            </div>
        </div>
    );
}
