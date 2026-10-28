// ... existing imports
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gamepad2, Trophy, ShieldAlert, BookOpen, Sparkles, CheckCircle2, XCircle, ArrowRight, RefreshCw, HandHeart, Target, HelpCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useUserProfile, useUser } from '@/firebase';
import { BIBLE_GAME_DATA } from '@/lib/bible-game-data';
import { useToast } from '@/hooks/use-toast';

export function BibleGameCard() {
    const { userProfile } = useUserProfile();
    const { user } = useUser();
    const { toast } = useToast();
    const [gameType, setGameType] = useState<'word' | 'prayer' | 'trivia' | 'wisdom'>('word');
    const [quizIndex, setQuizIndex] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'correct' | 'wrong'>('playing');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    const getNewQuestion = (type: 'word' | 'prayer' | 'trivia' | 'wisdom') => {
        const pool = BIBLE_GAME_DATA[type];
        const storageKey = `seen_questions_quick_${type}_${user?.uid || 'guest'}`;
        const seenIndices = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        let available = pool.map((_, i) => i).filter(i => !seenIndices.includes(i));
        
        if (available.length === 0) {
            localStorage.setItem(storageKey, JSON.stringify([]));
            available = pool.map((_, i) => i);
        }
        
        const nextIdx = available[Math.floor(Math.random() * available.length)];
        const nextSeen = [...seenIndices, nextIdx];
        localStorage.setItem(storageKey, JSON.stringify(nextSeen));
        return nextIdx;
    };

    useEffect(() => {
        const types = ['word', 'prayer', 'trivia', 'wisdom'] as const;
        const randomType = types[Math.floor(Math.random() * types.length)];
        setGameType(randomType);
        setQuizIndex(getNewQuestion(randomType));
    }, [user?.uid]);

    const quiz = BIBLE_GAME_DATA[gameType][quizIndex];
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
        const types = ['word', 'prayer', 'trivia', 'wisdom'] as const;
        const nextType = types[Math.floor(Math.random() * types.length)];
        setGameType(nextType);
        setQuizIndex(getNewQuestion(nextType));
        setGameState('playing');
        setSelectedOption(null);
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/signup`;
        const text = "Sharpen your spirit with interactive biblical challenges. Join the Kingdom Arena on Testify!";
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Kingdom Arena | Testify', text: text, url: shareUrl });
            } catch (err) {}
        } else {
            navigator.clipboard.writeText(`${text} ${shareUrl}`);
            toast({ title: "Invite Copied" });
        }
    };

    const getIcon = () => {
        switch(gameType) {
            case 'word': return <BookOpen className="h-5 w-5 text-primary" />;
            case 'prayer': return <HandHeart className="h-5 w-5 text-primary" />;
            case 'trivia': return <HelpCircle className="h-5 w-5 text-primary" />;
            case 'wisdom': return <Sparkles className="h-5 w-5 text-primary" />;
        }
    };

    const getLabel = () => {
        switch(gameType) {
            case 'word': return "Word Arena";
            case 'prayer': return "Prayer Altar";
            case 'trivia': return "Kingdom Trivia";
            case 'wisdom': return "Wisdom Arena";
        }
    };

    return (
        <Card className="rounded-none sm:rounded-[2rem] border-y sm:border-2 border-primary/20 bg-[#09090b] shadow-2xl overflow-hidden mb-6 group transition-all hover:border-primary/40 text-left">
            <CardHeader className="p-6 sm:p-8 pb-4 text-center">
                <div className="flex justify-between items-start mb-4 text-left">
                    <div className="flex items-center gap-2 text-left">
                        {getIcon()}
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">{getLabel()}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400" onClick={handleShare}><Share2 className="h-4 w-4" /><span className="sr-only">Share</span></Button>
                </div>
                <CardTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-white text-center">Interactive Kingdom Exercise</CardTitle>
                <CardDescription className="text-zinc-400 text-sm font-medium text-center mt-2 leading-relaxed">Experience a portion of the Word Arena. Sharpen your spirit daily.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-10 pt-0 space-y-8 text-left">
                <div className="bg-zinc-900 rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-10 border-2 border-dashed border-white/5 shadow-inner flex items-center justify-center min-h-[160px] flex items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none text-left"><Target className="h-16 w-16 text-primary text-left" /></div>
                    <AnimatePresence mode="wait"><motion.p key={`${gameType}-${quizIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-lg sm:text-xl font-serif italic leading-relaxed text-zinc-200 text-balance text-center">&ldquo;{quiz?.text}&rdquo;</motion.p></AnimatePresence>
                </div>
                <div className="grid grid-cols-2 gap-3 text-left">
                    {quiz?.options.map(opt => (
                        <Button key={opt} variant="outline" className={cn("h-12 sm:h-20 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-sm transition-all border-2 text-center whitespace-normal", gameState === 'correct' && opt === quiz.correct ? "bg-green-600 text-white border-green-400 scale-105 shadow-[0_0_20px_rgba(22,163,74,0.4)]" : gameState === 'wrong' && opt === selectedOption ? "bg-red-600 text-white border-red-400 shadow-lg" : "bg-zinc-800/50 border-white/5 text-zinc-300 hover:bg-primary/10 hover:text-primary")} disabled={gameState !== 'playing'} onClick={(e) => { e.stopPropagation(); handleCheck(opt); }}>{opt}</Button>
                    ))}
                </div>
                <AnimatePresence mode="wait">
                    {gameState !== 'playing' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 text-center">
                            <div className={cn("p-6 rounded-3xl flex flex-col items-center text-center gap-4 border-2 border-dashed", gameState === 'correct' ? "bg-green-500/5 border-green-500/20 text-green-500" : "bg-red-500/5 border-red-500/20 text-red-500")}>
                                <div className="flex items-center gap-2"><Trophy className="h-5 w-5 animate-bounce" /><span className="font-black uppercase tracking-[0.2em] text-xs">{gameState === 'correct' ? `WELL DONE, ${firstName.toUpperCase()}!` : "STAY IN THE WORD"}</span></div>
                                <div className="space-y-2 text-center">
                                    <p className="text-base font-black uppercase tracking-widest text-zinc-100">{quiz.ref}</p>
                                    <p className="text-xs font-medium italic opacity-70 leading-relaxed text-balance text-zinc-300">
                                        {quiz.explanation || "This Word serves as a spiritual weapon for your victory and peace."}
                                    </p>
                                </div>
                            </div>
                            <Button onClick={nextChallenge} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-white text-black hover:bg-zinc-200 shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 text-center">NEXT CHALLENGE<ArrowRight className="h-5 w-5" /></Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
            <CardFooter className="p-3 bg-black/40 text-center justify-center"><p className="text-[8px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] text-center">Faith • Power • Truth</p></CardFooter>
        </Card>
    );
}
