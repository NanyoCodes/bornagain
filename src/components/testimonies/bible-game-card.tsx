
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gamepad2, Trophy, ShieldAlert, BookOpen, Sparkles, CheckCircle2, XCircle, ArrowRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useUserProfile } from '@/firebase';

const bibleQuizzes = [
  { text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal ______.", correct: "Life", options: ["Life", "Wealth", "Glory", "Peace"], ref: "John 3:16" },
  { text: "The Lord is my shepherd, I shall not ______.", correct: "Want", options: ["Fear", "Wait", "Want", "Fall"], ref: "Psalm 23:1" },
  { text: "I can do all things through ______ who strengthens me.", correct: "Christ", options: ["Faith", "Christ", "Prayer", "Effort"], ref: "Philippians 4:13" },
  { text: "In the beginning was the ______, and the ______ was with God, and the ______ was God.", correct: "Word", options: ["Light", "Word", "Spirit", "Life"], ref: "John 1:1" },
  { text: "But seek first the ______ of God and his righteousness, and all these things will be added to you.", correct: "Kingdom", options: ["Grace", "Power", "Kingdom", "Peace"], ref: "Matthew 6:33" },
  { text: "Trust in the Lord with all your ______, and lean not on your own understanding.", correct: "Heart", options: ["Might", "Soul", "Heart", "Mind"], ref: "Proverbs 3:5" },
  { text: "Jesus wept. (Shortest verse in the Bible). This happened at the tomb of ______.", correct: "Lazarus", options: ["Peter", "Lazarus", "John", "Moses"], ref: "John 11:35" },
  { text: "The fruit of the Spirit is love, joy, ______, forbearance, kindness, goodness, faithfulness...", correct: "Peace", options: ["Power", "Peace", "Hope", "Strength"], ref: "Galatians 5:22" },
  { text: "For I know the plans I have for you, declares the Lord, plans to ______ you and not to harm you.", correct: "Prosper", options: ["Help", "Prosper", "Heal", "Guide"], ref: "Jeremiah 29:11" },
  { text: "Your word is a ______ for my feet, a light on my path.", correct: "Lamp", options: ["Guide", "Light", "Lamp", "Fire"], ref: "Psalm 119:105" },
  { text: "But you will receive ______ when the Holy Spirit comes on you.", correct: "Power", options: ["Peace", "Wisdom", "Power", "Grace"], ref: "Acts 1:8" },
  { text: "The name of the Lord is a fortified ______, the righteous run to it and are safe.", correct: "Tower", options: ["City", "Tower", "Wall", "Rock"], ref: "Proverbs 18:10" },
  { text: "He has shown you, O mortal, what is good. And what does the Lord require of you? To act ______ and to love mercy.", correct: "Justly", options: ["Wisely", "Justly", "Holy", "Boldly"], ref: "Micah 6:8" },
  { text: "Be still, and know that I am ______; I will be exalted among the nations.", correct: "God", options: ["Lord", "God", "King", "With you"], ref: "Psalm 46:10" },
  { text: "Now ______ is confidence in what we hope for and assurance about what we do not see.", correct: "Faith", options: ["Faith", "Love", "Hope", "Prayer"], ref: "Hebrews 11:1" },
  { text: "If any of you lacks ______, you should ask God, who gives generously to all.", correct: "Wisdom", options: ["Faith", "Peace", "Wisdom", "Strength"], ref: "James 1:5" },
  { text: "Do not be conformed to this ______, but be transformed by the renewing of your mind.", correct: "World", options: ["Age", "World", "Sin", "Life"], ref: "Romans 12:2" },
  { text: "The ______ of the Lord is the beginning of wisdom.", correct: "Fear", options: ["Love", "Word", "Fear", "Spirit"], ref: "Proverbs 9:10" },
  { text: "Come to me, all you who are weary and burdened, and I will give you ______.", correct: "Rest", options: ["Peace", "Life", "Strength", "Rest"], ref: "Matthew 11:28" },
  { text: "I am the way and the ______ and the life. No one comes to the Father except through me.", correct: "Truth", options: ["Truth", "Light", "Word", "Spirit"], ref: "John 14:6" },
  { text: "Let everything that has breath ______ the Lord.", correct: "Praise", options: ["Love", "Fear", "Serve", "Praise"], ref: "Psalm 150:6" },
  { text: "God is our ______ and strength, an ever-present help in trouble.", correct: "Refuge", options: ["Refuge", "Shield", "Rock", "King"], ref: "Psalm 46:1" },
  { text: "The thief comes only to steal and kill and destroy; I have come that they may have ______.", correct: "Life", options: ["Hope", "Peace", "Life", "Freedom"], ref: "John 10:10" },
  { text: "Greater is he that is in you, than he that is in the ______.", correct: "World", options: ["Darkness", "World", "Flesh", "Enemy"], ref: "1 John 4:4" },
  { text: "The grass withers and the flowers fall, but the ______ of our God endures forever.", correct: "Word", options: ["Word", "Love", "Spirit", "Kingdom"], ref: "Isaiah 40:8" },
  { text: "Blessed are the ______ in heart, for they will see God.", correct: "Pure", options: ["Kind", "Pure", "Humble", "Merciful"], ref: "Matthew 5:8" },
  { text: "But the fruit of the Spirit is love, joy, peace, ______, kindness, goodness, faithfulness...", correct: "Patience", options: ["Power", "Wisdom", "Patience", "Grace"], ref: "Galatians 5:22" },
  { text: "For we walk by ______, not by sight.", correct: "Faith", options: ["Spirit", "Faith", "Truth", "Grace"], ref: "2 Corinthians 5:7" },
  { text: "Jesus Christ is the ______ yesterday and today and forever.", correct: "Same", options: ["Lord", "King", "Same", "God"], ref: "Hebrews 13:8" },
  { text: "Create in me a pure ______, O God, and renew a steadfast spirit within me.", correct: "Heart", options: ["Heart", "Soul", "Mind", "Spirit"], ref: "Psalm 51:10" },
  { text: "Every good and perfect ______ is from above, coming down from the Father.", correct: "Gift", options: ["Gift", "Word", "Grace", "Seed"], ref: "James 1:17" }
];

export function BibleGameCard() {
    const { userProfile } = useUserProfile();
    const [quizIndex, setQuizIndex] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'correct' | 'wrong'>('playing');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    useEffect(() => {
        setQuizIndex(Math.floor(Math.random() * bibleQuizzes.length));
    }, []);

    const quiz = bibleQuizzes[quizIndex];
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
                                        {gameState === 'correct' ? `EXCELLENT, ${firstName.toUpperCase()}!` : "RETURN TO THE WORD"}
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
