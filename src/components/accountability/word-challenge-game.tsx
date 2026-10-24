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
    Play,
    Send,
    Check,
    X,
    ChevronDown,
    HandHeart,
    HelpCircle
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
    limit,
    deleteDoc,
    onSnapshot
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import type { UserProfile, GameSession, GameInvitation, GameSessionType } from '@/lib/types';
import { format, differenceInMinutes } from 'date-fns';
import { Label } from '../ui/label';

// MASSIVE SCRIPTURE DATASET
const gameData: Record<GameSessionType, any[]> = {
  word: [
    { text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal ______.", correct: "Life", options: ["Life", "Wealth", "Glory", "Peace"], ref: "John 3:16" },
    { text: "The Lord is my shepherd, I shall not ______.", correct: "Want", options: ["Fear", "Wait", "Want", "Fall"], ref: "Psalm 23:1" },
    { text: "I can do all things through ______ who strengthens me.", correct: "Christ", options: ["Faith", "Christ", "Prayer", "Effort"], ref: "Philippians 4:13" },
    { text: "In the beginning was the ______, and the ______ was with God, and the ______ was God.", correct: "Word", options: ["Light", "Word", "Spirit", "Life"], ref: "John 1:1" },
    { text: "But seek first the ______ of God and his righteousness, and all these things will be added to you.", correct: "Kingdom", options: ["Grace", "Power", "Kingdom", "Peace"], ref: "Matthew 6:33" },
    { text: "Trust in the Lord with all your ______, and lean not on your own understanding.", correct: "Heart", options: ["Might", "Soul", "Heart", "Mind"], ref: "Proverbs 3:5" },
    { text: "The fruit of the Spirit is love, joy, ______, forbearance, kindness, goodness, faithfulness...", correct: "Peace", options: ["Power", "Peace", "Hope", "Strength"], ref: "Galatians 5:22" },
    { text: "For I know the plans I have for you, declares the Lord, plans to ______ you and not to harm you.", correct: "Prosper", options: ["Help", "Prosper", "Heal", "Guide"], ref: "Jeremiah 29:11" },
    { text: "Your word is a ______ for my feet, a light on my path.", correct: "Lamp", options: ["Guide", "Light", "Lamp", "Fire"], ref: "Psalm 119:105" },
    { text: "But you will receive ______ when the Holy Spirit comes on you.", correct: "Power", options: ["Peace", "Wisdom", "Power", "Grace"], ref: "Acts 1:8" }
  ],
  prayer: [
    { text: "I am feeling overwhelmed and anxious today. Which word should I stand on?", correct: "1 Peter 5:7", options: ["1 Peter 5:7", "Luke 12:15", "James 4:6", "Exodus 14:14"], ref: "Cast all your anxiety on him." },
    { text: "I need divine healing in my body. Which promise is for me?", correct: "Isaiah 53:5", options: ["Isaiah 53:5", "Psalm 23:1", "John 14:6", "Acts 1:8"], ref: "By His wounds we are healed." },
    { text: "I am facing a giant that seems too big. What should I declare?", correct: "1 Samuel 17:47", options: ["1 Samuel 17:47", "John 3:16", "Proverbs 3:5", "Psalm 119:105"], ref: "The battle is the Lord's." },
    { text: "I need wisdom for a difficult decision. Where should I look?", correct: "James 1:5", options: ["James 1:5", "Mark 11:24", "Isaiah 40:31", "Hebrews 11:1"], ref: "If any of you lacks wisdom..." }
  ],
  trivia: [
    { text: "Who was the first person to see the resurrected Jesus?", correct: "Mary Magdalene", options: ["Peter", "John", "Mary Magdalene", "Thomas"], ref: "John 20:14" },
    { text: "How many days and nights did Jonah spend in the belly of the big fish?", correct: "3", options: ["1", "3", "7", "40"], ref: "Jonah 1:17" },
    { text: "What was the first miracle Jesus performed?", correct: "Water into wine", options: ["Healing the blind", "Water into wine", "Walking on water", "Feeding 5000"], ref: "John 2:1-11" },
    { text: "Who was the oldest man mentioned in the Bible?", correct: "Methuselah", options: ["Adam", "Noah", "Methuselah", "Abraham"], ref: "Genesis 5:27" }
  ]
};

const timerOptions = [30, 60, 90, 120];

export function WordChallengeGame({ partnerId, partnerName }: { partnerId: string, partnerName: string }) {
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    // Game States
    const [isGameActive, setIsGameActive] = useState(false);
    const [activeGameType, setActiveGameType] = useState<GameSessionType>('word');
    const [timeLeft, setTimeLeft] = useState(60);
    const [selectedTimer, setSelectedTimer] = useState(60);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [quizIndex, setQuizIndex] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'correct' | 'wrong' | 'finished'>('playing');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSavingSession, setIsSavingSession] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);

    // Partner Data & Status
    const partnerDocRef = useMemo(() => (firestore && partnerId) ? doc(firestore, 'users', partnerId) : null, [firestore, partnerId]);
    const { data: partnerProfile } = useDoc<UserProfile>(partnerDocRef);
    
    const isPartnerOnline = useMemo(() => {
        const lastActive = safeToDate(partnerProfile?.lastActive);
        if (!lastActive) return false;
        return differenceInMinutes(new Date(), lastActive) < 5;
    }, [partnerProfile?.lastActive]);

    // Invitation Listener
    const invitationQuery = useMemo(() => {
        if (!firestore || !user?.uid || !partnerId) return null;
        return query(
            collection(firestore, 'gameInvitations'),
            where('participantIds', 'array-contains', user.uid),
            where('status', 'in', ['pending', 'accepted'])
        );
    }, [firestore, user?.uid, partnerId]);
    
    const { data: activeInvitations } = useCollection<GameInvitation>(invitationQuery);
    
    const invitation = useMemo(() => {
        return activeInvitations?.find(i => i.participantIds.includes(partnerId)) || null;
    }, [activeInvitations, partnerId]);

    // Auto-start game if invitation is accepted
    useEffect(() => {
        if (invitation?.status === 'accepted' && !isGameActive && gameState === 'playing') {
            const acceptedAt = safeToDate(invitation.acceptedAt);
            if (acceptedAt && differenceInMinutes(new Date(), acceptedAt) < 1) {
                const duration = invitation.timerDuration || 60;
                setActiveGameType(invitation.gameType || 'word');
                setTimeLeft(duration);
                setSelectedTimer(duration);
                handleStart(invitation.gameType || 'word');
            }
        }
    }, [invitation?.status, isGameActive, gameState, invitation?.acceptedAt, invitation?.timerDuration, invitation?.gameType]);

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

    const handleSendChallenge = async () => {
        if (!user || !firestore) return;
        setIsRequesting(true);

        const participantIds = [user.uid, partnerId].sort();
        const invitationData = {
            hostId: user.uid,
            guestId: partnerId,
            participantIds,
            status: 'pending' as const,
            gameType: activeGameType,
            timerDuration: selectedTimer,
            createdAt: serverTimestamp()
        };

        try {
            await addDoc(collection(firestore, 'gameInvitations'), invitationData);
            
            await addDoc(collection(firestore, `users/${partnerId}/notifications`), {
                userId: partnerId,
                type: 'org_invite',
                title: 'Kingdom Challenge!',
                message: `${userProfile?.firstName} has challenged you to a ${selectedTimer}s ${activeGameType} battle!`,
                link: `/accountability/challenge/${user.uid}`,
                isRead: false,
                createdAt: serverTimestamp()
            });

            toast({ title: 'Challenge Issued', description: `Waiting for ${partnerName.split(' ')[0]} to accept.` });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Request Failed' });
        } finally {
            setIsRequesting(false);
        }
    };

    const handleAcceptChallenge = async () => {
        if (!invitation || !firestore || !user) return;
        
        try {
            await updateDoc(doc(firestore, 'gameInvitations', invitation.id), {
                status: 'accepted',
                acceptedAt: serverTimestamp()
            });
            const duration = invitation.timerDuration || 60;
            const type = invitation.gameType || 'word';
            setActiveGameType(type);
            setSelectedTimer(duration);
            setTimeLeft(duration);
            handleStart(type);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Acceptance Failed' });
        }
    };

    const handleDeclineChallenge = async () => {
        if (!invitation || !firestore) return;
        await updateDoc(doc(firestore, 'gameInvitations', invitation.id), { status: 'declined' });
        setGameState('playing');
    };

    const handleStart = (type: GameSessionType = activeGameType) => {
        const pool = gameData[type];
        setQuizIndex(Math.floor(Math.random() * pool.length));
        setCorrectCount(0);
        setWrongCount(0);
        setGameState('playing');
        setIsGameActive(true);
        setSelectedOption(null);
    };

    const handleGameEnd = async () => {
        setIsGameActive(false);
        setGameState('finished');
        
        if (!user || !firestore) return;
        setIsSavingSession(true);

        if (invitation) {
            deleteDoc(doc(firestore, 'gameInvitations', invitation.id)).catch(() => {});
        }

        const totalPoints = correctCount * 10;
        const sessionData = {
            participantIds: [user.uid, partnerId].sort(),
            userId: user.uid,
            partnerId: partnerId,
            gameType: activeGameType,
            score: totalPoints,
            correctCount,
            wrongCount,
            createdAt: serverTimestamp()
        };

        addDoc(collection(firestore, 'gameSessions'), sessionData)
            .catch(err => console.error("History save failed", err));

        const userRef = doc(firestore, 'users', user.uid);
        updateDoc(userRef, {
            kingdomPoints: increment(totalPoints),
            lastGameAt: serverTimestamp()
        }).catch(() => {});

        toast({ title: 'Victory Recorded!', description: `Session saved with ${totalPoints} Kingdom Points.` });
        setIsSavingSession(false);
    };

    const handleCheck = (option: string) => {
        if (!isGameActive || gameState !== 'playing') return;
        
        const pool = gameData[activeGameType];
        setSelectedOption(option);
        if (option === pool[quizIndex].correct) {
            setGameState('correct');
            setCorrectCount(prev => prev + 1);
            setTimeout(() => {
                if (isGameActive) nextChallenge();
            }, 500);
        } else {
            setGameState('wrong');
            setWrongCount(prev => prev + 1);
            setTimeout(() => {
                if (isGameActive) nextChallenge();
            }, 800);
        }
    };

    const nextChallenge = () => {
        const pool = gameData[activeGameType];
        // Ensure "new" challenge per turn by avoiding same index if pool > 1
        let nextIdx = Math.floor(Math.random() * pool.length);
        if (pool.length > 1 && nextIdx === quizIndex) {
            nextIdx = (nextIdx + 1) % pool.length;
        }
        setQuizIndex(nextIdx);
        setGameState('playing');
        setSelectedOption(null);
    };

    const quiz = gameData[activeGameType][quizIndex];

    const historyQuery = useMemo(() => {
        if (!firestore || !user?.uid || !partnerId) return null;
        return query(
            collection(firestore, 'gameSessions'),
            where('participantIds', 'array-contains', user.uid),
            orderBy('createdAt', 'desc'),
            limit(15)
        );
    }, [firestore, user?.uid, partnerId]);
    const { data: allHistory } = useCollection<GameSession>(historyQuery);

    const filteredHistory = useMemo(() => {
        return allHistory?.filter(s => s.participantIds.includes(partnerId)) || [];
    }, [allHistory, partnerId]);

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-32 px-4 sm:px-0 text-left">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full self-start sm:self-auto border bg-background shadow-sm">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-none flex items-center gap-3 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 shadow-sm min-w-0">
                        <Star className="h-4 w-4 text-primary fill-current shrink-0" />
                        <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-primary truncate">
                            You: {(userProfile?.kingdomPoints || 0) + (correctCount * 10)}
                        </span>
                    </div>
                    <div className="flex-1 sm:flex-none flex items-center gap-3 bg-muted/30 px-4 py-1.5 rounded-full border border-dashed min-w-0 relative">
                        <Trophy className="h-4 w-4 text-muted-foreground opacity-60 shrink-0" />
                        <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground truncate">
                            {partnerName.split(' ')[0]}: {partnerProfile?.kingdomPoints || 0}
                        </span>
                        {isPartnerOnline && (
                            <div className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border-2 border-background"></span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Card className="rounded-[2rem] sm:rounded-[2.5rem] border-2 border-primary/20 bg-[#09090b] shadow-2xl overflow-hidden group transition-all hover:border-primary/40 text-left">
                <CardHeader className="p-6 sm:p-10 pb-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Gamepad2 className="h-5 w-5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Arena of Truth</span>
                    </div>
                    <CardTitle className="text-2xl sm:text-4xl font-black font-headline uppercase tracking-tight text-white leading-none">Sharpening the Word</CardTitle>
                    {!isGameActive && gameState !== 'finished' && (
                        <CardDescription className="text-zinc-400 text-sm font-medium mt-3">Select a challenge type and duration to begin.</CardDescription>
                    )}
                </CardHeader>
                
                <CardContent className="p-6 sm:p-12 pt-0 space-y-8 text-left">
                    {!isGameActive && gameState !== 'finished' && (
                        <div className="py-4 sm:py-8 flex flex-col items-center gap-8">
                            {!invitation ? (
                                <div className="w-full space-y-8">
                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Choose Challenge Type</Label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'word', label: 'Word Arena', icon: BookOpen },
                                                { id: 'prayer', label: 'Prayer Altar', icon: HandHeart },
                                                { id: 'trivia', label: 'Trivia', icon: HelpCircle }
                                            ].map(type => (
                                                <Button 
                                                    key={type.id}
                                                    variant="outline"
                                                    onClick={() => setActiveGameType(type.id as any)}
                                                    className={cn(
                                                        "h-24 flex flex-col gap-2 rounded-2xl border-2 transition-all",
                                                        activeGameType === type.id ? "bg-primary/20 border-primary text-primary shadow-lg" : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-primary/40"
                                                    )}
                                                >
                                                    <type.icon className="h-6 w-6" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{type.label}</span>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Select Session Duration</Label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {timerOptions.map(opt => (
                                                <Button 
                                                    key={opt}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedTimer(opt)}
                                                    className={cn(
                                                        "h-10 rounded-xl font-black text-xs transition-all",
                                                        selectedTimer === opt ? "bg-primary text-white border-none shadow-lg" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                                                    )}
                                                >
                                                    {opt}s
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={handleSendChallenge} 
                                        disabled={isRequesting}
                                        size="lg" 
                                        className="w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30"
                                    >
                                        {isRequesting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                                        ISSUE CHALLENGE
                                    </Button>
                                </div>
                            ) : invitation.hostId === user?.uid ? (
                                <div className="space-y-6 w-full text-center">
                                    <div className="h-24 w-24 rounded-[2.5rem] bg-primary/10 flex items-center justify-center mx-auto border-2 border-dashed border-primary/20">
                                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                    </div>
                                    <div className="space-y-2">
                                        <Badge variant="outline" className="h-10 px-6 rounded-full border-primary/20 text-primary uppercase font-black tracking-widest animate-pulse">
                                            Waiting for {partnerName.split(' ')[0]}...
                                        </Badge>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{invitation.gameType} Challenge • {invitation.timerDuration}s</p>
                                    </div>
                                    <Button variant="ghost" onClick={() => deleteDoc(doc(firestore!, 'gameInvitations', invitation.id))} className="text-muted-foreground uppercase text-[10px] font-bold">
                                        Cancel Request
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-6 w-full text-center animate-in slide-in-from-bottom-4">
                                    <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                                        <Target className="h-10 w-10 text-primary animate-bounce" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-lg font-black text-white uppercase tracking-widest"> {partnerName.split(' ')[0].toUpperCase()} HAS CHALLENGED YOU!</p>
                                        <p className="text-xs font-bold text-primary uppercase tracking-widest">Mode: {invitation.gameType} • Duration: {invitation.timerDuration}s</p>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <Button onClick={handleAcceptChallenge} size="lg" className="h-16 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl">
                                            <Check className="mr-2 h-5 w-5" /> ACCEPT CHALLENGE
                                        </Button>
                                        <Button variant="ghost" onClick={handleDeclineChallenge} className="text-destructive font-black uppercase tracking-widest text-xs">
                                            DECLINE
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {isGameActive && (
                        <div className="space-y-6 sm:space-y-8 animate-in fade-in zoom-in duration-500">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors border-2",
                                        timeLeft <= 10 ? "bg-red-500 border-red-400 text-white animate-pulse" : "bg-primary/10 border-primary/20 text-primary"
                                    )}>
                                        <Timer className="h-5 w-5 sm:h-6 sm:w-6" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Time Left</p>
                                        <p className={cn("text-xl sm:text-2xl font-black tracking-tighter leading-none", timeLeft <= 10 ? "text-red-500" : "text-white")}>
                                            {timeLeft}s
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Session Gain</p>
                                    <p className="text-xl sm:text-2xl font-black text-green-500 tracking-tighter leading-none">+{correctCount * 10}</p>
                                </div>
                            </div>

                            <div className="bg-zinc-900 rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-12 border-2 border-dashed border-white/5 shadow-inner relative overflow-hidden text-center min-h-[160px] flex items-center justify-center">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                                    {activeGameType === 'word' ? <BookOpen className="h-16 w-16 sm:h-20 sm:w-20 text-primary" /> : <Target className="h-16 w-16 sm:h-20 sm:w-20 text-primary" />}
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.p 
                                        key={quizIndex}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="text-base sm:text-2xl font-serif italic leading-relaxed text-zinc-200 text-balance"
                                    >
                                        &ldquo;{quiz.text}&rdquo;
                                    </motion.p>
                                </AnimatePresence>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                {quiz.options.map(opt => (
                                    <Button
                                        key={opt}
                                        variant="outline"
                                        className={cn(
                                            "h-14 sm:h-20 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-sm transition-all border-2",
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
                        <div className="space-y-8 sm:space-y-10 animate-in slide-in-from-bottom-6 duration-700">
                            <div className="text-center space-y-4">
                                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-[2rem] bg-primary flex items-center justify-center mx-auto shadow-2xl border-4 border-white/10">
                                    <Award className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl sm:text-3xl font-black uppercase text-white">Session Complete!</h3>
                                    <p className="text-zinc-400 font-medium text-sm">Excellent labor in the Word.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                <div className="bg-zinc-900 rounded-2xl sm:rounded-3xl p-3 sm:p-5 text-center border border-white/5">
                                    <p className="text-[9px] sm:text-xs font-black text-primary uppercase mb-1">Points</p>
                                    <p className="text-lg sm:text-3xl font-black text-white">{correctCount * 10}</p>
                                </div>
                                <div className="bg-zinc-900 rounded-2xl sm:rounded-3xl p-3 sm:p-5 text-center border border-white/5">
                                    <p className="text-[9px] sm:text-xs font-black text-green-500 uppercase mb-1">Correct</p>
                                    <p className="text-lg sm:text-3xl font-black text-white">{correctCount}</p>
                                </div>
                                <div className="bg-zinc-900 rounded-2xl sm:rounded-3xl p-3 sm:p-5 text-center border border-white/5">
                                    <p className="text-[9px] sm:text-xs font-black text-red-500 uppercase mb-1">Errors</p>
                                    <p className="text-lg sm:text-3xl font-black text-white">{wrongCount}</p>
                                </div>
                            </div>

                            <Button 
                                onClick={() => setGameState('playing')}
                                className="w-full h-16 rounded-2xl font-black uppercase tracking-widest bg-white text-black hover:bg-zinc-200 shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95"
                            >
                                <RefreshCw className="h-5 w-5" />
                                NEW SESSION
                            </Button>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="p-4 bg-black/40 text-center justify-center border-t border-white/5">
                     <p className="text-[8px] sm:text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em]">Iron Sharpens Iron • Growth • Victory</p>
                </CardFooter>
            </Card>

            <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-primary" />
                        <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Arena History</h4>
                    </div>
                    <Badge variant="secondary" className="h-5 px-2 text-[9px] uppercase font-bold opacity-60">Recent Results</Badge>
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
                                                {isMyScore ? 'My Victory' : `${partnerName.split(' ')[0]}'s Result`}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="h-3.5 px-1 text-[7px] font-black uppercase tracking-tighter bg-background/50">{session.gameType || 'Word'}</Badge>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                    {date ? format(date, 'MMM d, p') : 'Recently'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg sm:text-xl font-black text-primary tracking-tighter leading-none">{session.score}</p>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">POINTS</p>
                                    </div>
                                </div>
                            </Card>
                        );
                    }) : (
                        <div className="py-12 text-center bg-muted/20 rounded-[2rem] border-2 border-dashed">
                            <History className="h-10 w-10 text-muted-foreground/10 mx-auto mb-3" />
                            <p className="text-xs text-muted-foreground italic px-12 text-balance leading-relaxed">No recorded sessions in the history. Start sharpening each other to see results here.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 bg-muted/20 rounded-[2.5rem] border border-dashed flex items-start gap-4 shadow-inner">
                <div className="h-6 w-6 text-primary shrink-0 mt-1 opacity-60">
                    <Info className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                    <h4 className="font-black text-xs uppercase tracking-widest">About Challenges</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium text-balance">Live challenges are synchronized. Once the guest accepts, the timer begins for both participants. Your Kingdom Points reflect your growth and knowledge of Truth.</p>
                </div>
            </div>
        </div>
    );
}