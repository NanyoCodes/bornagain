'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gamepad2, Trophy, ShieldAlert, BookOpen, Sparkles, CheckCircle2, XCircle, ArrowRight, RefreshCw, HandHeart, Target, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useUserProfile } from '@/firebase';

const gameData = {
    word: [
        { text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal ______.", correct: "Life", options: ["Life", "Wealth", "Glory", "Peace"], ref: "John 3:16" },
        { text: "The Lord is my shepherd, I shall not ______.", correct: "Want", options: ["Fear", "Wait", "Want", "Fall"], ref: "Psalm 23:1" },
        { text: "I can do all things through ______ who strengthens me.", correct: "Christ", options: ["Faith", "Christ", "Prayer", "Effort"], ref: "Philippians 4:13" },
        { text: "In the beginning was the ______, and the ______ was with God, and the ______ was God.", correct: "Word", options: ["Light", "Word", "Spirit", "Life"], ref: "John 1:1" }
    ],
    prayer: [
        { text: "I am feeling overwhelmed and anxious today. Which word should I stand on?", correct: "1 Peter 5:7", options: ["1 Peter 5:7", "Luke 12:15", "James 4:6", "Exodus 14:14"], ref: "Cast all your anxiety on him." },
        { text: "I need divine healing in my body. Which promise is for me?", correct: "Isaiah 53:5", options: ["Isaiah 53:5", "Psalm 23:1", "John 14:6", "Acts 1:8"], ref: "By His wounds we are healed." },
        { text: "I am facing a giant that seems too big. What should I declare?", correct: "1 Samuel 17:47", options: ["1 Samuel 17:47", "John 3:16", "Proverbs 3:5", "Psalm 119:105"], ref: "The battle is the Lord's." }
    ],
    trivia: [
        { text: "Who was the first person to see the resurrected Jesus?", correct: "Mary Magdalene", options: ["Peter", "John", "Mary Magdalene", "Thomas"], ref: "John 20:14" },
        { text: "How many days and nights did Jonah spend in the belly of the big fish?", correct: "3", options: ["1", "3", "7", "40"], ref: "Jonah 1:17" },
        { text: "What was the first miracle Jesus performed?", correct: "Water into wine", options: ["Healing the blind", "Water into wine", "Walking on water", "Feeding 5000"], ref: "John 2:1-11" }
    ]
};

export function BibleGameCard() {
    const { userProfile } = useUserProfile();
    const [gameType, setGameType] = useState<'word' | 'prayer' | 'trivia'>('word');
    const [quizIndex, setQuizIndex] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'correct' | 'wrong'>('playing');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    useEffect(() => {
        const types = ['word', 'prayer', 'trivia'] as const;
        const randomType = types[Math.floor(Math.random() * types.length)];
        setGameType(randomType);
        setQuizIndex(Math.floor(Math.random() * gameData[randomType].length));
    }, []);

    const quiz = gameData[gameType][quizIndex];
    const firstName = userProfile?.firstName || 'Believer';

    const handleCheck = (option: string) => {
        setSelectedOption(option);
        if (option === quiz.correct) {
            setGameState('correct');
        } else {
            setGameState('wrong');
        }
    };

    const nextChallenge = () => {
        const types = ['word', 'prayer', 'trivia'] as const;
        const nextType = types[Math.floor(Math.random() * types.length)];
        setGameType(nextType);
        setQuizIndex(Math.floor(Math.random() * gameData[nextType].length));
        setGameState('playing');
        setSelectedOption(null);
    };

    const getIcon = () => {
        switch(gameType) {
            case 'word': return <BookOpen className="h-5 w-5 text-primary" />;
            case 'prayer': return <HandHeart className="h-5 w-5 text-primary" />;
            case 'trivia': return <HelpCircle className="h-5 w-5 text-primary" />;
        }
    };

    const getLabel = () => {
        switch(gameType) {
            case 'word': return "Word Arena";
            case 'prayer': return "Prayer Altar";
            case 'trivia': return "Kingdom Trivia";
        }
    };

    return (
        <Card className="rounded-none sm:rounded-[2rem] border-y sm:border-2 border-primary/20 bg-[#09090b] shadow-2xl overflow-hidden mb-6 group transition-all hover:border-primary/40 text-left">
            <CardHeader className="p-6 sm:p-8 pb-4 text-center text-left">
                <div className="flex items-center justify-center gap-2 mb-2 text-left">
                    {getIcon()}
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">{getLabel()}</span>
                </div>
                <CardTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-white text-left">Interactive Kingdom Exercise</CardTitle>
                <CardDescription className="text-zinc-400 text-sm font-medium text-left">Test your knowledge and align your spirit with Truth.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-10 pt-0 space-y-8 text-left">
                <div className="bg-zinc-900 rounded-[1.5rem] p-6 sm:p-10 border-2 border-dashed border-white/5 shadow-inner relative overflow-hidden text-center text-left">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none text-left">
                        <Target className="h-16 w-16 text-primary text-left" />
                    </div>
                    <p className="text-lg sm:text-xl font-serif italic leading-relaxed text-zinc-200 text-balance text-left">
                        &ldquo;{quiz.text}&rdquo;
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                    {quiz.options.map(opt => (
                        <Button
                            key={opt}
                            variant="outline"
                            className={cn(
                                "h-12 sm:h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all text-left",
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
                            className="space-y-6 text-left"
                        >
                            <div className={cn(
                                "p-6 rounded-2xl flex flex-col items-center text-center gap-3 border-2 border-dashed text-left",
                                gameState === 'correct' ? "bg-green-500/5 border-green-500/20 text-green-500" : "bg-red-500/5 border-red-500/20 text-red-500"
                            )}>
                                <div className="flex items-center gap-2 text-left">
                                    {gameState === 'correct' ? <Trophy className="h-5 w-5 animate-bounce text-left" /> : <ShieldAlert className="h-5 w-5 text-left" />}
                                    <span className="font-black uppercase tracking-[0.2em] text-xs text-left">
                                        {gameState === 'correct' ? `WELL DONE, ${firstName.toUpperCase()}!` : "STAY IN THE WORD"}
                                    </span>
                                </div>
                                <p className="text-sm font-bold italic opacity-80 text-center text-left">
                                    {gameType === 'word' ? (
                                        `The correct word is "${quiz.correct}". Ref: ${quiz.ref}`
                                    ) : (
                                        `The correct answer is "${quiz.correct}". ${quiz.ref}`
                                    )}
                                </p>
                            </div>

                            <Button 
                                onClick={nextChallenge}
                                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-white text-black hover:bg-zinc-200 shadow-xl flex items-center justify-center gap-3 text-center"
                            >
                                NEXT CHALLENGE
                                <ArrowRight className="h-5 w-5 text-left" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
            <CardFooter className="p-3 bg-black/40 text-center justify-center text-left">
                 <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.4em] text-left">Faith • Power • Truth</p>
            </CardFooter>
        </Card>
    );
}