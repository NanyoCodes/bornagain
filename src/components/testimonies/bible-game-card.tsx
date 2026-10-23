'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gamepad2, Trophy, ShieldAlert, BookOpen, Sparkles, CheckCircle2, XCircle, ArrowRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
    text: "Jesus wept. (Shortest verse in the Bible). This happened at the tomb of ______.",
    correct: "Lazarus",
    options: ["Peter", "Lazarus", "John", "Moses"],
    ref: "John 11:35"
  },
  {
    text: "The fruit of the Spirit is love, joy, ______, forbearance, kindness, goodness, faithfulness...",
    correct: "Peace",
    options: ["Power", "Peace", "Hope", "Strength"],
    ref: "Galatians 5:22"
  }
];

export function BibleGameCard() {
    const [quizIndex, setQuizIndex] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'correct' | 'wrong'>('playing');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    useEffect(() => {
        // Randomize initial quiz
        setQuizIndex(Math.floor(Math.random() * bibleQuizzes.length));
    }, []);

    const quiz = bibleQuizzes[quizIndex];

    const handleCheck = (option: string) => {
        setSelectedOption(option);
        if (option === quiz.correct) {
            setGameState('correct');
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
        <Card className="rounded-none sm:rounded-[2rem] border-y sm:border-2 border-primary/20 bg-[#09090b] shadow-2xl overflow-hidden mb-6 group transition-all hover:border-primary/40 text-left">
            <CardHeader className="p-6 sm:p-8 pb-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Gamepad2 className="h-5 w-5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Kingdom Word Challenge</span>
                </div>
                <CardTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-white">Complete the Passage</CardTitle>
                <CardDescription className="text-zinc-400 text-sm font-medium">Strengthen your spirit with the Word.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-10 pt-0 space-y-8">
                <div className="bg-zinc-900 rounded-[1.5rem] p-6 sm:p-10 border-2 border-dashed border-white/5 shadow-inner relative overflow-hidden text-center">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                        <BookOpen className="h-16 w-16 text-primary" />
                    </div>
                    <p className="text-lg sm:text-xl font-serif italic leading-relaxed text-zinc-200 text-balance">
                        &ldquo;{quiz.text}&rdquo;
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {quiz.options.map(opt => (
                        <Button
                            key={opt}
                            variant="outline"
                            className={cn(
                                "h-12 sm:h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all",
                                gameState === 'correct' && opt === quiz.correct ? "bg-green-600 text-white border-none scale-105 shadow-[0_0_20px_rgba(22,163,74,0.4)]" : 
                                gameState === 'wrong' && opt === selectedOption ? "bg-red-600 text-white border-none shadow-lg" : 
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
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className={cn(
                                "p-6 rounded-2xl flex flex-col items-center text-center gap-3 border-2 border-dashed",
                                gameState === 'correct' ? "bg-green-500/5 border-green-500/20 text-green-500" : "bg-red-500/5 border-red-500/20 text-red-500"
                            )}>
                                <div className="flex items-center gap-2">
                                    {gameState === 'correct' ? <Trophy className="h-5 w-5 animate-bounce" /> : <ShieldAlert className="h-5 w-5" />}
                                    <span className="font-black uppercase tracking-[0.2em] text-xs">
                                        {gameState === 'correct' ? "EXCELLENT, BELIEVER!" : "RETURN TO THE WORD"}
                                    </span>
                                </div>
                                <p className="text-sm font-bold italic opacity-80 text-center">
                                    &ldquo;The correct word is <span className="underline underline-offset-4 decoration-2"> {quiz.correct}</span>. Ref: {quiz.ref}&rdquo;
                                </p>
                            </div>

                            <Button 
                                onClick={nextChallenge}
                                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-white text-black hover:bg-zinc-200 shadow-xl flex items-center justify-center gap-3"
                            >
                                NEXT CHALLENGE
                                <ArrowRight className="h-5 w-5" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
            <CardFooter className="p-3 bg-black/40 text-center justify-center">
                 <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.4em]">Knowledge • Wisdom • Truth</p>
            </CardFooter>
        </Card>
    );
}