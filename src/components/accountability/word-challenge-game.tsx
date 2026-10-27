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
    XCircle, 
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
    Clock
} from "lucide-react";
import { cn, safeToDate } from "@/lib/utils";
import { format, differenceInMinutes } from "date-fns";
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
    deleteDoc,
    setDoc,
    doc
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { UserProfile, GameSession, GameInvitation, GameSessionType } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { BIBLE_GAME_DATA } from '@/lib/bible-game-data';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useIsMobile } from "@/hooks/use-mobile";
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from "@/components/ui/skeleton";

const timerOptions = [30, 60, 90, 120];

export function WordChallengeGame({ partnerId, partnerName }: { partnerId: string, partnerName: string }) {
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
    const [now, setNow] = useState<Date | null>(null);
    
    const correctCountRef = useRef(0);
    const wrongCountRef = useRef(0);

    const [quizIndex, setQuizIndex] = useState(0);
    const [usedIndices, setUsedIndices] = useState<number[]>([]);
    const [gameState, setGameState] = useState<'playing' | 'correct' | 'wrong' | 'finished'>('playing');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSavingSession, setIsSavingSession] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);

    useEffect(() => {
        setNow(new Date());
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const partnerDocRef = useMemo(() => (firestore && partnerId) ? doc(firestore, 'users', partnerId) : null, [firestore, partnerId]);
    const { data: partnerProfile } = useDoc<UserProfile>(partnerDocRef);
    
    const isPartnerOnline = useMemo(() => {
        if (!now) return false;
        const lastActive = safeToDate(partnerProfile?.lastActive);
        if (!lastActive) return false;
        return differenceInMinutes(now, lastActive) < 5;
    }, [partnerProfile?.lastActive, now]);

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

    const historyQuery = useMemo(() => {
        if (!firestore || !user?.uid || !partnerId) return null;
        return query(
            collection(firestore, 'gameSessions'),
            where('participantIds', 'array-contains', user.uid),
            limit(100)
        );
    }, [firestore, user?.uid, partnerId]);
    const { data: allHistory, loading: historyLoading } = useCollection<GameSession>(historyQuery);

    const headToHeadStats = useMemo(() => {
        let me = 0;
        let them = 0;
        if (!allHistory || !user?.uid || !partnerId) return { me, them };
        
        allHistory.filter(s => s.participantIds.includes(partnerId)).forEach(session => {
            if (session.userId === user.uid) {
                me += session.score;
            } else {
                them += session.score;
            }
        });
        return { me, them };
    }, [allHistory, partnerId, user?.uid]);

    const nextChallenge = useCallback(() => {
        const pool = BIBLE_GAME_DATA[activeGameType];
        const storageKey = `seen_questions_${activeGameType}_${user?.uid}`;
        const seenIndices = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        const availableIndices = pool
            .map((_, i) => i)
            .filter(i => !usedIndices.includes(i) && !seenIndices.includes(i));
        
        let targetIdx: number;
        
        if (availableIndices.length === 0) {
            localStorage.setItem(storageKey, JSON.stringify([]));
            const freshIndices = pool
                .map((_, i) => i)
                .filter(i => !usedIndices.includes(i));
            
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
        
        if (!user || !firestore) return;
        setIsSavingSession(true);

        const totalPoints = finalCorrect * 10;
        const participantIds = [user.uid, partnerId].sort();
        const sessionData = {
            participantIds,
            userId: user.uid,
            partnerId: partnerId,
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

                if (invitation) {
                    deleteDoc(doc(firestore, 'gameInvitations', invitation.id));
                }

                toast({ title: 'Victory Recorded!', description: `Session saved with ${totalPoints} Kingdom Points.` });
            })
            .catch(() => {
                toast({ variant: 'destructive', title: 'Save Failed' });
            })
            .finally(() => {
                setIsSavingSession(false);
            });
    }, [user, firestore, partnerId, activeGameType, invitation, toast]);

    const handleStart = (type: GameSessionType = activeGameType) => {
        const pool = BIBLE_GAME_DATA[type];
        const storageKey = `seen_questions_${type}_${user?.uid}`;
        const seenIndices = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const availableIndices = pool.map((_, i) => i).filter(i => !seenIndices.includes(i));
        
        let initialIdx: number;
        if (availableIndices.length === 0) {
            localStorage.setItem(storageKey, JSON.stringify([]));
            initialIdx = Math.floor(Math.random() * pool.length);
        } else {
            initialIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        }

        localStorage.setItem(storageKey, JSON.stringify([...seenIndices, initialIdx]));
        
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

    const resetToSelection = () => {
        setIsGameActive(false);
        setGameState('playing');
        setSelectedOption(null);
        setUsedIndices([]);
        setCorrectCount(0);
        setWrongCount(0);
        correctCountRef.current = 0;
        wrongCountRef.current = 0;
        setTimeLeft(selectedTimer);
    };

    const handleCancelRequest = async () => {
        if (!invitation || !firestore) return;
        setIsRequesting(true);
        deleteDoc(doc(firestore, 'gameInvitations', invitation.id))
            .then(() => toast({ title: 'Request Cancelled' }))
            .finally(() => setIsRequesting(false));
    };

    useEffect(() => {
        if (invitation?.status === 'accepted' && !isGameActive && gameState === 'playing' && now) {
            const acceptedAt = safeToDate(invitation.acceptedAt);
            if (acceptedAt && differenceInMinutes(now, acceptedAt) < 1) {
                const duration = invitation.timerDuration || 60;
                setActiveGameType(invitation.gameType || 'word');
                setTimeLeft(duration);
                setSelectedTimer(duration);
                handleStart(invitation.gameType || 'word');
            }
        }
    }, [invitation?.status, isGameActive, gameState, invitation?.acceptedAt, now]);

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
    }, [isGameActive, timeLeft, handleGameEnd]);

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

        const invitationRef = doc(collection(firestore, 'gameInvitations'));
        
        setDoc(invitationRef, invitationData)
            .then(async () => {
                const notificationData = {
                    userId: partnerId,
                    type: 'org_invite' as any,
                    targetId: user.uid,
                    title: 'Kingdom Challenge!',
                    message: `${userProfile?.firstName} has challenged you to a ${selectedTimer}s ${activeGameType} battle!`,
                    link: `/accountability/challenge/${user.uid}`,
                    isRead: false,
                    createdAt: serverTimestamp()
                };
                addDoc(collection(firestore, `users/${partnerId}/notifications`), notificationData).catch(() => {});
                toast({ title: 'Challenge Issued' });
            })
            .finally(() => setIsRequesting(false));
    };

    const handleAcceptChallenge = async () => {
        if (!invitation || !firestore || !user) return;
        const invitationRef = doc(firestore, 'gameInvitations', invitation.id);
        updateDoc(invitationRef, {
            status: 'accepted',
            acceptedAt: serverTimestamp()
        }).then(() => {
            const duration = invitation.timerDuration || 60;
            const type = invitation.gameType || 'word';
            setActiveGameType(type);
            setSelectedTimer(duration);
            setTimeLeft(duration);
            handleStart(type);
        });
    };

    const handleDeclineChallenge = async () => {
        if (!invitation || !firestore) return;
        deleteDoc(doc(firestore, 'gameInvitations', invitation.id));
        setGameState('playing');
    };

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
            setTimeout(() => {
                if (isGameActive) nextChallenge();
            }, 500);
        } else {
            setGameState('wrong');
            setWrongCount(prev => {
                const next = prev + 1;
                wrongCountRef.current = next;
                return next;
            });
            setTimeout(() => {
                if (isGameActive) nextChallenge();
            }, 800);
        }
    };

    const quiz = BIBLE_GAME_DATA[activeGameType][quizIndex];

    const matchHistory = useMemo(() => {
        if (!allHistory) return [];
        const groups: { id: string; date: Date; mySession?: GameSession; partnerSession?: GameSession; gameType: string }[] = [];
        const filtered = allHistory.filter(s => s.participantIds.includes(partnerId)).sort((a,b) => (safeToDate(b.createdAt)?.getTime() ?? 0) - (safeToDate(a.createdAt)?.getTime() ?? 0));
        
        filtered.forEach(session => {
            const date = safeToDate(session.createdAt);
            if (!date) return;
            const group = groups.find(g => Math.abs(g.date.getTime() - date.getTime()) < 120000 && g.gameType === session.gameType);
            if (group) {
                if (session.userId === user?.uid) group.mySession = session;
                else group.partnerSession = session;
            } else {
                groups.push({ 
                    id: session.id,
                    date, 
                    gameType: session.gameType, 
                    mySession: session.userId === user?.uid ? session : undefined, 
                    partnerSession: session.userId !== user?.uid ? session : undefined 
                });
            }
        });
        return groups.slice(0, 10);
    }, [allHistory, partnerId, user?.uid]);

    const handleShareMatch = async (match: any) => {
        const message = `Kingdom Arena Duel Summary\nMode: ${match.gameType.toUpperCase()}\n\nBeliever 1: ${match.mySession?.score || 0} Points\nBeliever 2: ${match.partnerSession?.score || 0} Points\n\nJoin the harvest at Testify: ${window.location.origin}/games`;
        if (navigator.share) {
            navigator.share({ title: 'Kingdom Arena Match Result', text: message, url: `${window.location.origin}/games` }).catch(() => {});
        } else {
            navigator.clipboard.writeText(message);
            toast({ title: 'Result Copied' });
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-32 px-4 sm:px-6 text-left">
            <div className="flex flex-col items-center gap-6 w-full text-left text-left text-left">
                <div className="w-full flex items-center justify-between text-left text-left text-left">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full border bg-background shadow-sm text-left text-left">
                        <ArrowLeft className="h-4 w-4 text-left text-left" />
                    </Button>
                    <div className="hidden sm:flex items-center gap-2 text-left text-left text-left text-left">
                        <Gamepad2 className="h-4 w-4 text-primary text-left text-left text-left" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left text-left text-left">Kingdom Arena</span>
                    </div>
                </div>

                <div className="w-full max-w-2xl bg-muted/20 p-4 sm:p-8 rounded-[2rem] border-2 border-dashed border-primary/20 shadow-inner flex flex-col items-center gap-6 relative overflow-hidden text-left text-left">
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center overflow-hidden text-left">
                        <Target className="h-64 w-64 text-primary rotate-12 text-left text-left" />
                    </div>

                    <div className="flex items-center justify-center gap-4 sm:gap-16 w-full relative z-10 text-left text-left text-left">
                        <div className="flex flex-col items-center gap-3 flex-1 min-w-0 text-left text-left text-left">
                            <div className="relative text-left text-left">
                                <Avatar className="h-16 w-16 sm:h-24 sm:w-24 border-4 border-background shadow-2xl ring-2 ring-primary/10 text-left text-left text-left text-left">
                                    <AvatarImage src={user?.photoURL || undefined} className="object-cover text-left text-left" />
                                    <AvatarFallback className="font-black text-xl bg-primary/10 text-primary uppercase text-left text-left">Y</AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 shadow-lg border-2 border-background text-left text-left">
                                    <Star className="h-3 w-3 text-white fill-current text-left text-left" />
                                </div>
                            </div>
                            <div className="text-center text-left">
                                <p className="text-[10px] font-black uppercase text-primary/60 tracking-widest mb-1 text-center text-left text-left">YOU</p>
                                <p className="text-2xl sm:text-4xl font-black tracking-tighter leading-none text-center text-left text-left">
                                    {headToHeadStats.me + (isGameActive ? correctCount * 10 : 0)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-center shrink-0 text-left text-left">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-xl backdrop-blur-md text-left text-left text-left">
                                <span className="text-xs font-black text-primary italic text-left text-left">VS</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-3 flex-1 min-w-0 text-left text-left text-left text-left text-left">
                            <div className="relative text-left text-left text-left text-left">
                                <Avatar className="h-16 w-16 sm:h-24 sm:w-24 border-4 border-background shadow-2xl ring-2 ring-muted-foreground/10 text-left text-left text-left">
                                    <AvatarImage src={partnerProfile?.photoURL || undefined} className="object-cover text-left text-left" />
                                    <AvatarFallback className="font-black bg-muted text-muted-foreground text-left text-left">{partnerName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {isPartnerOnline && (
                                    <div className="absolute -bottom-1 -left-1 flex h-4 w-4 text-left text-left">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 text-left text-left text-left"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-background text-left text-left text-left"></span>
                                    </div>
                                )}
                            </div>
                            <div className="text-center min-w-0 w-full px-2 text-left text-left">
                                <p className="text-[10px] sm:text-xs font-black uppercase text-muted-foreground/60 tracking-widest mb-1 text-center w-full text-left text-left">
                                    {partnerName}
                                </p>
                                <p className="text-2xl sm:text-4xl font-black tracking-tighter leading-none text-muted-foreground text-center text-left text-left">
                                    {headToHeadStats.them}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-2 px-6 pb-2 bg-background/50 rounded-full border border-primary/10 shadow-sm relative z-10 text-left text-left">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary text-left text-left">Head-to-Head Duel Points</p>
                    </div>
                </div>
            </div>

            <Card className="rounded-[2rem] sm:rounded-[3rem] border-2 border-primary/20 bg-[#09090b] shadow-2xl overflow-hidden group transition-all hover:border-primary/40 text-left text-left">
                <CardHeader className="p-6 sm:p-10 pb-4 text-center text-left text-left">
                    <div className="flex items-center justify-center gap-2 mb-2 text-left text-left text-left">
                        <Gamepad2 className="h-5 w-5 text-primary text-left text-left text-left" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left text-left">Arena of Truth</span>
                    </div>
                    <CardTitle className="text-2xl sm:text-4xl font-black font-headline uppercase tracking-tight text-white leading-none text-center text-left text-left">Sharpening the Word</CardTitle>
                    {!isGameActive && gameState !== 'finished' && (
                        <CardDescription className="text-zinc-400 text-sm font-medium mt-3 text-center text-left text-left">Select challenge type and duration.</CardDescription>
                    )}
                </CardHeader>
                
                <CardContent className={cn("p-6 sm:p-12 pt-0 space-y-8 text-left text-left text-left", !isGameActive && "flex flex-col items-center justify-center")}>
                    {!isGameActive && gameState !== 'finished' && (
                        <div className="py-4 sm:py-8 flex flex-col items-center gap-8 w-full text-left text-left">
                            {!invitation ? (
                                <div className="w-full space-y-8 text-left text-left">
                                    <div className="space-y-4 text-left text-left">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 text-left text-left">Challenge Mode</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left text-left">
                                            {[ { id: 'word', label: 'Word Arena', icon: BookOpen }, { id: 'prayer', label: 'Prayer Altar', icon: HandHeart }, { id: 'trivia', label: 'Kingdom Trivia', icon: HelpCircle } ].map(type => (
                                                <Button key={type.id} variant="outline" onClick={() => setActiveGameType(type.id as any)} className={cn("h-20 sm:h-28 flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-4 sm:gap-2 px-6 sm:px-4 rounded-2xl border-2 transition-all text-left text-left", activeGameType === type.id ? "bg-primary/20 border-primary text-primary shadow-lg" : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-primary/40")}>
                                                    <type.icon className="h-6 w-6 shrink-0 text-left text-left" />
                                                    <span className="text-[11px] font-black uppercase tracking-widest text-left text-left">{type.label}</span>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-4 text-left text-left">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 text-left text-left">Session Duration</Label>
                                        <div className="grid grid-cols-4 gap-2 text-left text-left">
                                            {timerOptions.map(opt => (
                                                <Button key={opt} variant="outline" size="sm" onClick={() => setSelectedTimer(opt)} className={cn("h-10 rounded-xl font-black text-xs transition-all text-left text-left", selectedTimer === opt ? "bg-primary text-white border-none shadow-lg" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white")}>{opt}s</Button>
                                            ))}
                                        </div>
                                    </div>
                                    <Button onClick={handleSendChallenge} disabled={isRequesting} size="lg" className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 text-center text-left text-left">
                                        {isRequesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left" /> : <Send className="mr-2 h-4 w-4 text-left text-left" />}
                                        ISSUE CHALLENGE
                                    </Button>
                                </div>
                            ) : invitation.hostId === user?.uid ? (
                                <div className="space-y-8 w-full flex flex-col items-center justify-center animate-in fade-in text-center text-left text-left">
                                    <div className="relative text-left text-left">
                                        <div className="flex -space-x-8 sm:-space-x-12 items-center justify-center text-left text-left">
                                            <Avatar className="h-20 w-20 sm:h-28 sm:w-28 border-4 border-background shadow-2xl ring-2 ring-primary/20 transition-all duration-500 text-left text-left text-left text-left">
                                                <AvatarImage src={user?.photoURL || undefined} className="object-cover text-left text-left" />
                                                <AvatarFallback className="font-black text-xl bg-primary/10 text-primary uppercase text-left text-left text-left">Y</AvatarFallback>
                                            </Avatar>
                                            <Avatar className="h-20 w-20 sm:h-28 sm:w-28 border-4 border-background shadow-2xl ring-2 ring-zinc-800 transition-all duration-500 text-left text-left text-left text-left">
                                                <AvatarImage src={partnerProfile?.photoURL || undefined} className="object-cover text-left text-left" />
                                                <AvatarFallback className="font-black text-xl bg-muted text-muted-foreground uppercase text-left text-left text-left">{partnerName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/40 animate-spin duration-[15s] opacity-20 pointer-events-none text-left text-left" />
                                    </div>
                                    
                                    <div className="space-y-2 text-center text-left text-left">
                                        <Badge variant="outline" className="h-10 px-6 rounded-full border-primary/20 text-primary uppercase font-black tracking-widest animate-pulse text-left text-left">
                                            Waiting for {partnerName}...
                                        </Badge>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] opacity-60 text-center text-left text-left">Awaiting acceptance from the alliance member</p>
                                    </div>

                                    <Button variant="outline" onClick={handleCancelRequest} disabled={isRequesting} className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white transition-all active:scale-95 text-center text-left text-left">
                                        Cancel Request
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-8 w-full flex flex-col items-center justify-center animate-in slide-in-from-bottom-4 text-center text-left text-left text-left text-left">
                                    <div className="relative text-left text-left text-left text-left">
                                        <div className="flex -space-x-8 sm:-space-x-12 items-center justify-center text-left text-left text-left text-left text-left">
                                            <Avatar className="h-20 w-20 sm:h-28 sm:w-28 border-4 border-background shadow-2xl ring-2 ring-zinc-800 text-left text-left text-left text-left text-left">
                                                <AvatarImage src={partnerProfile?.photoURL || undefined} className="object-cover text-left text-left" />
                                                <AvatarFallback className="font-black text-xl bg-muted text-muted-foreground uppercase text-left text-left text-left">{partnerName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <Avatar className="h-20 w-20 sm:h-28 sm:w-28 border-4 border-background shadow-2xl ring-2 ring-primary/20 text-left text-left text-left text-left text-left text-left">
                                                <AvatarImage src={user?.photoURL || undefined} className="object-cover text-left text-left" />
                                                <AvatarFallback className="font-black text-xl bg-primary/10 text-primary uppercase text-left text-left text-left">Y</AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-background animate-bounce text-left text-left">
                                            <Target className="h-5 w-5 text-white text-left text-left" />
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-center text-left text-left text-left text-left">
                                        <p className="text-xl font-black text-white uppercase tracking-widest text-center text-left text-left">CHALLENGE RECEIVED!</p>
                                        <p className="text-sm text-zinc-400 font-medium text-center text-left text-left">{partnerName} has called you to the Arena.</p>
                                    </div>
                                    <div className="flex flex-col gap-3 w-full max-w-xs mx-auto text-left text-left text-left text-left text-left">
                                        <Button onClick={handleAcceptChallenge} size="lg" className="h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl text-center text-left text-left">
                                            <Check className="mr-2 h-5 w-5 text-left text-left" /> ACCEPT
                                        </Button>
                                        <Button variant="ghost" onClick={handleDeclineChallenge} className="text-destructive font-black uppercase tracking-widest text-xs text-center text-left text-left">
                                            DECLINE
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {isGameActive && (
                        <div className="space-y-6 sm:space-y-10 animate-in fade-in zoom-in duration-500 text-left text-left text-left text-left text-left">
                            <div className="flex items-center justify-between px-2 text-left text-left text-left text-left text-left">
                                <div className="flex items-center gap-3 text-left text-left text-left text-left text-left">
                                    <div className={cn("h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center border-2 shadow-lg text-left text-left text-left", timeLeft <= 10 ? "bg-red-500 border-red-400 text-white animate-pulse" : "bg-primary/10 border-primary/20 text-primary")}><Timer className="h-5 w-5 sm:h-6 sm:w-6 text-left text-left text-left" /></div>
                                    <div className="text-left text-left text-left text-left text-left"><p className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1 text-left text-left text-left text-left">Time Left</p><p className={cn("text-xl sm:text-2xl font-black tracking-tighter leading-none text-left text-left text-left", timeLeft <= 10 ? "text-red-500" : "text-white")}>{timeLeft}s</p></div>
                                </div>
                                <div className="text-right text-left text-left text-left text-left text-left text-left"><p className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1 text-right text-left text-left text-left text-left">Gain</p><p className="text-xl sm:text-2xl font-black text-green-500 tracking-tighter leading-none text-right text-left text-left text-left">{correctCount * 10}</p></div>
                            </div>
                            <div className="bg-zinc-900 rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-10 border-2 border-dashed border-white/5 shadow-inner flex items-center justify-center min-h-[160px] text-center relative overflow-hidden text-left text-left text-left text-left"><div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none text-left text-left text-left text-left text-left text-left"><Target className="h-16 w-16 text-primary text-left text-left text-left text-left" /></div><AnimatePresence mode="wait"><motion.p key={quizIndex} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="text-lg sm:text-xl font-serif italic leading-relaxed text-zinc-200 text-balance text-center text-left text-left text-left">&ldquo;{quiz?.text}&rdquo;</motion.p></AnimatePresence></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-left text-left text-left text-left">
                                {quiz?.options.map((opt: string) => (<Button key={opt} variant="outline" className={cn("h-14 sm:h-20 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-sm transition-all border-2 text-center whitespace-normal text-left text-left text-left", gameState === 'correct' && opt === quiz.correct ? "bg-green-600 text-white border-green-400 scale-105 shadow-[0_0_25px_rgba(22,163,74,0.4)]" : gameState === 'wrong' && opt === selectedOption ? "bg-red-600 text-white border-red-400 shadow-lg" : "bg-zinc-800/50 border-white/5 text-zinc-300 hover:bg-primary/10 hover:text-primary")} disabled={gameState !== 'playing'} onClick={(e) => { e.stopPropagation(); handleCheck(opt); }}>{opt}</Button>))}
                            </div>
                        </div>
                    )}

                    {gameState === 'finished' && (
                        <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-bottom-6 duration-700 text-center text-left text-left text-left text-left text-left">
                            <div className="space-y-4 text-center text-left text-left text-left text-left text-left"><div className="h-20 w-20 sm:h-28 sm:w-28 rounded-[2rem] bg-primary flex items-center justify-center mx-auto shadow-2xl border-4 border-white/10 text-left text-left text-left text-left text-left"><Award className="h-10 w-10 sm:h-14 sm:w-14 text-white text-left text-left text-left text-left" /></div><div className="space-y-1 text-center text-left text-left text-left text-left text-left"><h3 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tight text-center text-left text-left text-left">Session Complete!</h3><p className="text-zinc-400 font-medium text-center text-left text-left text-left">{isSavingSession ? "Archiving victory..." : "Excellent labor in the Word."}</p></div></div>
                            <div className="grid grid-cols-3 gap-3 sm:gap-6 text-left text-left text-left text-left text-left text-left text-left"><div className="bg-zinc-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 text-center border border-white/5 shadow-inner text-left text-left text-left text-left text-left text-left text-left"><p className="text-[10px] sm:text-xs font-black text-primary uppercase mb-1 tracking-widest text-center text-left text-left text-left text-left text-left">Points</p><p className="text-xl sm:text-4xl font-black text-white text-center text-left text-left text-left text-left text-left">{correctCount * 10}</p></div><div className="bg-zinc-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 text-center border border-white/5 shadow-inner text-left text-left text-left text-left text-left text-left text-left"><p className="text-[10px] sm:text-xs font-black text-green-500 uppercase mb-1 tracking-widest text-center text-left text-left text-left text-left text-left">Correct</p><p className="text-xl sm:text-4xl font-black text-white text-center text-left text-left text-left text-left text-left">{correctCount}</p></div><div className="bg-zinc-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 text-center border border-white/5 shadow-inner text-left text-left text-left text-left text-left text-left text-left"><p className="text-[10px] sm:text-xs font-black text-red-500 uppercase mb-1 tracking-widest text-center text-left text-left text-left text-left text-left">Errors</p><p className="text-xl sm:text-4xl font-black text-white text-center text-left text-left text-left text-left text-left">{wrongCount}</p></div></div>
                            <div className="flex flex-col gap-4 text-left text-left text-left text-left text-left text-left text-left"><Button onClick={resetToSelection} disabled={isSavingSession} size="lg" className="w-full h-16 rounded-2xl font-black uppercase tracking-widest shadow-xl text-center text-left text-left text-left text-left text-left text-left text-left">NEW SESSION</Button></div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="p-4 bg-black/40 text-center justify-center border-t border-white/5 text-left text-left text-left text-left text-left"><p className="text-[8px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] text-center text-left text-left text-left text-left text-left">Faith • Power • Truth</p></CardFooter>
            </Card>

            <div className="space-y-6 text-left text-left text-left text-left text-left text-left text-left text-left">
                <div className="flex items-center gap-2 px-1 text-left text-left text-left text-left text-left text-left text-left"><History className="h-4 w-4 text-primary text-left text-left text-left text-left text-left text-left text-left" /><h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground text-left text-left text-left text-left text-left text-left text-left">Arena History</h4></div>
                <div className="space-y-4 text-left text-left text-left text-left text-left text-left text-left text-left">
                    {historyLoading ? (<div className="space-y-3 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                        {[...Array(2)].map((_, i) => <Skeleton key={`history-skel-${i}`} className="h-28 w-full rounded-2xl text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left" />)}
                    </div>) : matchHistory.length > 0 ? (
                      matchHistory.map((match) => (
                            <Card key={match.id} className="rounded-[1.5rem] sm:rounded-[2rem] border-none shadow-md bg-card/50 backdrop-blur-sm overflow-hidden border-l-4 border-l-primary/10 text-left text-left text-left text-left text-left text-left text-left text-left">
                                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between border-b bg-muted/5 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                    <div className="flex items-center gap-2 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                        <Badge variant="outline" className="h-4 px-1.5 text-[7px] font-black uppercase bg-background/50 border-primary/20 text-primary text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{match.gameType}</Badge>
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{format(match.date, 'MMM d, p')}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left" onClick={() => handleShareMatch(match)}>
                                        <Share2 className="h-3.5 w-3.5 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 grid grid-cols-7 items-center gap-2 text-center text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                    <div className="col-span-3 flex flex-col items-center text-center space-y-2 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                        <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">YOU</p>
                                        {match.mySession ? (
                                            <div className="space-y-1 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                                <p className="text-2xl sm:text-3xl font-black text-primary tracking-tighter text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{match.mySession.score}</p>
                                                <div className="flex items-center justify-center gap-1 text-[8px] font-bold text-green-500 uppercase text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><CheckCircle2 className="h-2.5 w-2.5 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left" />{match.mySession.correctCount} Correct</div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 opacity-20 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                                <Hourglass className="h-6 w-6 animate-pulse text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left" /><p className="text-[8px] font-black uppercase text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Wait</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-1 flex flex-col items-center justify-center text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><span className="text-[10px] font-black text-primary/40 italic text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">VS</span></div>
                                    <div className="col-span-3 flex flex-col items-center text-center space-y-2 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                        <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest truncate max-w-full text-center text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{partnerName.toUpperCase()}</p>
                                        {match.partnerSession ? (
                                            <div className="space-y-1 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                                <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{match.partnerSession.score}</p>
                                                <div className="flex items-center justify-center gap-1 text-[8px] font-bold text-muted-foreground uppercase text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><CheckCircle2 className="h-2.5 w-2.5 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left" />{match.partnerSession.correctCount} Correct</div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 opacity-20 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                                <Hourglass className="h-6 w-6 animate-pulse text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left" /><p className="text-[8px] font-black uppercase text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Wait</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (<div className="py-16 text-center bg-muted/20 rounded-[2rem] border-2 border-dashed flex flex-col items-center text-left text-left text-left text-left text-left text-left text-left text-left text-left"><History className="h-10 w-10 text-muted-foreground/10 mx-auto mb-3 text-left text-left text-left text-left text-left text-left text-left text-left text-left" /><p className="text-xs text-muted-foreground italic px-12 text-center text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">No matches recorded between you and {partnerName}.</p></div>)}
                </div>
            </div>
        </div>
    );
}
