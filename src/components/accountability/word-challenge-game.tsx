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
    HelpCircle,
    MessagesSquare,
    Loader2
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
    setDoc
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { UserProfile, GameSession, GameInvitation, GameSessionType } from '@/lib/types';
import { format, differenceInMinutes } from 'date-fns';
import { Label } from '../ui/label';
import { BIBLE_GAME_DATA } from '@/lib/bible-game-data';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { ScrollArea } from '../ui/scroll-area';
import { useIsMobile } from "@/hooks/use-mobile";
import Image from 'next/image';

const timerOptions = [30, 60, 90, 120];

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
  );
}

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
    const [quizIndex, setQuizIndex] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'correct' | 'wrong' | 'finished'>('playing');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSavingSession, setIsSavingSession] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);

    const partnerDocRef = useMemo(() => (firestore && partnerId) ? doc(firestore, 'users', partnerId) : null, [firestore, partnerId]);
    const { data: partnerProfile } = useDoc<UserProfile>(partnerDocRef);
    
    const isPartnerOnline = useMemo(() => {
        const lastActive = safeToDate(partnerProfile?.lastActive);
        if (!lastActive) return false;
        return differenceInMinutes(new Date(), lastActive) < 5;
    }, [partnerProfile?.lastActive]);

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
    }, [invitation?.status, isGameActive, gameState, invitation?.acceptedAt]);

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

        const invitationRef = doc(collection(firestore, 'gameInvitations'));
        
        setDoc(invitationRef, invitationData)
            .then(async () => {
                const notificationRef = doc(collection(firestore, `users/${partnerId}/notifications`));
                setDoc(notificationRef, {
                    userId: partnerId,
                    type: 'org_invite',
                    targetId: user.uid,
                    title: 'Kingdom Challenge!',
                    message: `${userProfile?.firstName} has challenged you to a ${selectedTimer}s ${activeGameType} battle!`,
                    link: `/accountability/challenge/${user.uid}`,
                    isRead: false,
                    createdAt: serverTimestamp()
                }).catch(() => {});

                toast({ title: 'Challenge Issued', description: `Waiting for ${partnerName.split(' ')[0]} to accept.` });
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: 'gameInvitations',
                    operation: 'create',
                    requestResourceData: invitationData
                } satisfies SecurityRuleContext, user);
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsRequesting(false);
            });
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
        }).catch(() => {
            toast({ variant: 'destructive', title: 'Acceptance Failed' });
        });
    };

    const handleDeclineChallenge = async () => {
        if (!invitation || !firestore) return;
        updateDoc(doc(firestore, 'gameInvitations', invitation.id), { status: 'declined' });
        setGameState('playing');
    };

    const handleStart = (type: GameSessionType = activeGameType) => {
        const pool = BIBLE_GAME_DATA[type];
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

        const sessionRef = doc(collection(firestore, 'gameSessions'));
        
        setDoc(sessionRef, sessionData)
            .then(async () => {
                const userRef = doc(firestore, 'users', user.uid);
                await updateDoc(userRef, {
                    kingdomPoints: increment(totalPoints),
                    lastGameAt: serverTimestamp()
                });

                if (invitation) {
                    await deleteDoc(doc(firestore, 'gameInvitations', invitation.id));
                }

                toast({ title: 'Victory Recorded!', description: `Session saved with ${totalPoints} Kingdom Points.` });
            })
            .catch(async (error) => {
                console.error("Session result save failed", error);
            })
            .finally(() => {
                setIsSavingSession(false);
            });
    };

    const handleCheck = (option: string) => {
        if (!isGameActive || gameState !== 'playing') return;
        
        const pool = BIBLE_GAME_DATA[activeGameType];
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
        const pool = BIBLE_GAME_DATA[activeGameType];
        let nextIdx = Math.floor(Math.random() * pool.length);
        if (pool.length > 1 && nextIdx === quizIndex) {
            nextIdx = (nextIdx + 1) % pool.length;
        }
        setQuizIndex(nextIdx);
        setGameState('playing');
        setSelectedOption(null);
    };

    const quiz = BIBLE_GAME_DATA[activeGameType][quizIndex];

    const historyQuery = useMemo(() => {
        if (!firestore || !user?.uid || !partnerId) return null;
        return query(
            collection(firestore, 'gameSessions'),
            where('participantIds', 'array-contains', user.uid),
            orderBy('createdAt', 'desc'),
            limit(15)
        );
    }, [firestore, user?.uid, partnerId]);
    const { data: allHistory, loading: historyLoading } = useCollection<GameSession>(historyQuery);

    const filteredHistory = useMemo(() => {
        return allHistory?.filter(s => s.participantIds.includes(partnerId)) || [];
    }, [allHistory, partnerId]);

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-32 px-4 sm:px-6 text-left">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full self-start sm:self-auto border bg-background shadow-sm text-left">
                    <ArrowLeft className="h-4 w-4 text-left" />
                </Button>
                <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto text-left">
                    <div className="flex-1 sm:flex-none flex items-center gap-3 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 shadow-sm min-w-0 text-left">
                        <Star className="h-4 w-4 text-primary fill-current shrink-0 text-left" />
                        <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-primary text-left">
                            You: {(userProfile?.kingdomPoints || 0) + (isGameActive ? correctCount * 10 : 0)}
                        </span>
                    </div>
                    <div className="flex-1 sm:flex-none flex items-center gap-3 bg-muted/30 px-4 py-1.5 rounded-full border border-dashed min-w-0 relative text-left">
                        <Trophy className="h-4 w-4 text-muted-foreground opacity-60 shrink-0 text-left" />
                        <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground text-left">
                            {partnerName.split(' ')[0]}: {partnerProfile?.kingdomPoints || 0}
                        </span>
                        {isPartnerOnline && (
                            <div className="absolute -top-1 -right-1 flex h-2.5 w-2.5 text-left">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 text-left"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border-2 border-background text-left"></span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Card className="rounded-[2rem] sm:rounded-[3rem] border-2 border-primary/20 bg-[#09090b] shadow-2xl overflow-hidden group transition-all hover:border-primary/40 text-left">
                <CardHeader className="p-6 sm:p-10 pb-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2 text-left">
                        <Gamepad2 className="h-5 w-5 text-primary text-left" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-center">Arena of Truth</span>
                    </div>
                    <CardTitle className="text-2xl sm:text-4xl font-black font-headline uppercase tracking-tight text-white leading-none text-center">Sharpening the Word</CardTitle>
                    {!isGameActive && gameState !== 'finished' && (
                        <CardDescription className="text-zinc-400 text-sm font-medium mt-3 text-center">Select a challenge type and duration to begin.</CardDescription>
                    )}
                </CardHeader>
                
                <CardContent className="p-6 sm:p-12 pt-0 space-y-8 text-left text-left">
                    {!isGameActive && gameState !== 'finished' && (
                        <div className="py-4 sm:py-8 flex flex-col items-center gap-8 text-left text-left">
                            {!invitation ? (
                                <div className="w-full space-y-8 text-left text-left">
                                    <div className="space-y-4 text-left text-left">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 text-left">Choose Challenge Type</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                                            {[
                                                { id: 'word', label: 'Word Arena', icon: BookOpen },
                                                { id: 'prayer', label: 'Prayer Altar', icon: HandHeart },
                                                { id: 'trivia', label: 'Kingdom Trivia', icon: HelpCircle }
                                            ].map(type => (
                                                <Button 
                                                    key={type.id}
                                                    variant="outline"
                                                    onClick={() => setActiveGameType(type.id as any)}
                                                    className={cn(
                                                        "h-20 sm:h-28 flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-4 sm:gap-2 px-6 sm:px-4 rounded-2xl border-2 transition-all text-left sm:text-center text-left",
                                                        activeGameType === type.id ? "bg-primary/20 border-primary text-primary shadow-lg" : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-primary/40"
                                                    )}
                                                >
                                                    <type.icon className="h-6 w-6 shrink-0 text-left" />
                                                    <span className="text-[11px] font-black uppercase tracking-widest text-left text-left">{type.label}</span>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4 text-left text-left">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 text-left">Select Session Duration</Label>
                                        <div className="grid grid-cols-4 gap-2 text-left">
                                            {timerOptions.map(opt => (
                                                <Button 
                                                    key={opt}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedTimer(opt)}
                                                    className={cn(
                                                        "h-10 rounded-xl font-black text-xs transition-all text-left",
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
                                        className="w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 text-center text-left"
                                    >
                                        {isRequesting ? <Loader2 className="mr-2 h-5 w-5 animate-spin mr-2 text-left" /> : <Send className="mr-2 h-5 w-5 mr-2 text-left" />}
                                        ISSUE CHALLENGE
                                    </Button>
                                </div>
                            ) : invitation.hostId === user?.uid ? (
                                <div className="space-y-6 w-full text-center text-left">
                                    <div className="h-24 w-24 rounded-[2.5rem] bg-primary/10 flex items-center justify-center mx-auto border-2 border-dashed border-primary/20 text-center text-left">
                                        <Loader2 className="h-10 w-10 text-primary animate-spin text-left" />
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <Badge variant="outline" className="h-10 px-6 rounded-full border-primary/20 text-primary uppercase font-black tracking-widest animate-pulse text-left">
                                            Waiting for {partnerName.split(' ')[0]}...
                                        </Badge>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-left">{invitation.gameType} Challenge • {invitation.timerDuration}s</p>
                                    </div>
                                    <Button variant="ghost" onClick={() => deleteDoc(doc(firestore!, 'gameInvitations', invitation.id))} className="text-muted-foreground uppercase text-[10px] font-bold text-left">
                                        Cancel Request
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-6 w-full text-center animate-in slide-in-from-bottom-4 text-left">
                                    <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2 text-center text-left">
                                        <Target className="h-10 w-10 text-primary animate-bounce text-center text-left" />
                                    </div>
                                    <div className="space-y-1 text-center text-left">
                                        <p className="text-lg font-black text-white uppercase tracking-widest text-center text-left"> {partnerName.split(' ')[0].toUpperCase()} HAS CHALLENGED YOU!</p>
                                        <p className="text-xs font-bold text-primary uppercase tracking-widest text-center text-left">Mode: {invitation.gameType} • Duration: {invitation.timerDuration}s</p>
                                    </div>
                                    <div className="flex flex-col gap-3 text-center text-left">
                                        <Button onClick={handleAcceptChallenge} size="lg" className="h-16 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl text-center text-left">
                                            <Check className="mr-2 h-5 w-5 text-left" /> ACCEPT CHALLENGE
                                        </Button>
                                        <Button variant="ghost" onClick={handleDeclineChallenge} className="text-destructive font-black uppercase tracking-widest text-xs text-center text-left">
                                            DECLINE
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {isGameActive && (
                        <div className="space-y-6 sm:space-y-10 animate-in fade-in zoom-in duration-500 text-left text-left">
                            <div className="flex items-center justify-between px-2 text-left text-left">
                                <div className="flex items-center gap-3 text-left text-left">
                                    <div className={cn(
                                        "h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors border-2 text-left",
                                        timeLeft <= 10 ? "bg-red-500 border-red-400 text-white animate-pulse" : "bg-primary/10 border-primary/20 text-primary"
                                    )}>
                                        <Timer className="h-5 w-5 sm:h-6 sm:w-6 text-left" />
                                    </div>
                                    <div className="text-left text-left">
                                        <p className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1 text-left">Time Left</p>
                                        <p className={cn("text-xl sm:text-2xl font-black tracking-tighter leading-none text-left", timeLeft <= 10 ? "text-red-500" : "text-white")}>
                                            {timeLeft}s
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right text-left">
                                    <p className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1 text-right text-left">Session Gain</p>
                                    <p className="text-xl sm:text-2xl font-black text-green-500 tracking-tighter leading-none text-right text-left">+{correctCount * 10}</p>
                                </div>
                            </div>

                            <div className="bg-zinc-900 rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-10 border-2 border-dashed border-white/5 shadow-inner relative overflow-hidden text-center min-h-[180px] flex items-center justify-center text-left">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none text-left text-left">
                                    <BookOpen className="h-16 w-16 sm:h-24 sm:w-24 text-primary rotate-12 text-left text-left" />
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.p 
                                        key={quizIndex}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.05 }}
                                        className="text-lg sm:text-2xl font-serif italic leading-relaxed text-zinc-200 text-balance text-center text-left"
                                    >
                                        &ldquo;{quiz.text}&rdquo;
                                    </motion.p>
                                </AnimatePresence>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-left">
                                {quiz.options.map(opt => (
                                    <Button
                                        key={opt}
                                        variant="outline"
                                        className={cn(
                                            "h-14 sm:h-20 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-sm transition-all border-2 text-center whitespace-normal text-left",
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
                        <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-bottom-6 duration-700 text-center text-left">
                            <div className="text-center space-y-4 text-left">
                                <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-[2rem] bg-primary flex items-center justify-center mx-auto shadow-2xl border-4 border-white/10 text-center text-left">
                                    <Award className="h-10 w-10 sm:h-14 sm:w-14 text-white text-center text-left" />
                                </div>
                                <div className="space-y-1 text-center text-left">
                                    <h3 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tight text-center text-left">Session Complete!</h3>
                                    <p className="text-zinc-400 font-medium text-sm sm:text-base text-center text-left">Excellent labor in the Word.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center text-left">
                                <div className="bg-zinc-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 text-center border border-white/5 shadow-inner text-left">
                                    <p className="text-[10px] sm:text-xs font-black text-primary uppercase mb-1 tracking-widest text-center text-left">Points</p>
                                    <p className="text-xl sm:text-4xl font-black text-white text-center text-left">{correctCount * 10}</p>
                                </div>
                                <div className="bg-zinc-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 text-center border border-white/5 shadow-inner text-center text-left text-left text-left">
                                    <p className="text-[10px] sm:text-xs font-black text-green-500 uppercase mb-1 tracking-widest text-center text-left text-left text-left text-left">Correct</p>
                                    <p className="text-xl sm:text-4xl font-black text-white text-center text-left text-left text-left text-left">{correctCount}</p>
                                </div>
                                <div className="bg-zinc-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 text-center border border-white/5 shadow-inner text-center text-left text-left text-left text-left">
                                    <p className="text-[10px] sm:text-xs font-black text-red-500 uppercase mb-1 tracking-widest text-center text-left text-left text-left text-left text-left">Errors</p>
                                    <p className="text-xl sm:text-4xl font-black text-white text-center text-left text-left text-left text-left text-left">{wrongCount}</p>
                                </div>
                            </div>

                            <Button 
                                onClick={() => setGameState('playing')}
                                className="w-full h-16 rounded-2xl font-black uppercase tracking-widest bg-white text-black hover:bg-zinc-200 shadow-xl flex items-center justify-center gap-4 transition-all active:scale-95 text-center text-left"
                            >
                                <RefreshCw className="h-5 w-5 text-left" />
                                NEW SESSION
                            </Button>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="p-4 bg-black/40 text-center justify-center border-t border-white/5 text-center text-left">
                     <p className="text-[8px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] text-center text-left">Iron Sharpens Iron • Growth • Victory</p>
                </CardFooter>
            </Card>

            <div className="space-y-6 text-left text-left">
                <div className="flex items-center justify-between px-1 text-left text-left">
                    <div className="flex items-center gap-2 text-left text-left">
                        <History className="h-4 w-4 text-primary text-left text-left" />
                        <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground text-left text-left">Arena History</h4>
                    </div>
                    <Badge variant="secondary" className="h-5 px-2 text-[9px] uppercase font-bold opacity-60 text-left text-left">Past Sessions</Badge>
                </div>

                <div className="space-y-3 text-left text-left">
                    {historyLoading ? (
                        <div className="space-y-3 text-left text-left">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl text-left" />)}
                        </div>
                    ) : filteredHistory.length > 0 ? filteredHistory.map(session => {
                        const date = safeToDate(session.createdAt);
                        const isMyScore = session.userId === user?.uid;
                        return (
                            <Card key={session.id} className="rounded-2xl border bg-card/50 backdrop-blur-sm p-4 hover:shadow-md transition-all text-left text-left">
                                <div className="flex items-center justify-between gap-4 text-left text-left">
                                    <div className="flex items-center gap-4 flex-1 min-w-0 text-left text-left">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner text-left",
                                            isMyScore ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/40 text-muted-foreground"
                                        )}>
                                            {isMyScore ? <Star className="h-5 w-5 text-left text-left" /> : <Award className="h-5 w-5 text-left text-left" />}
                                        </div>
                                        <div className="min-w-0 flex-1 text-left text-left">
                                            <p className="font-black text-sm uppercase tracking-tight truncate leading-tight text-left text-left">
                                                {isMyScore ? 'My Victory' : `${partnerName.split(' ')[0]}'s Result`}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 text-left text-left">
                                                <Badge variant="outline" className="h-3.5 px-1 text-[7px] font-black uppercase tracking-tighter bg-background/50 text-left text-left">{session.gameType || 'Word'}</Badge>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left text-left">
                                                    {date ? format(date, 'MMM d, p') : 'Recently'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right text-left text-left">
                                        <p className="text-lg sm:text-xl font-black text-primary tracking-tighter leading-none text-right text-left">{session.score}</p>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1 text-right text-left">POINTS</p>
                                    </div>
                                </div>
                            </Card>
                        );
                    }) : (
                        <div className="py-16 text-center bg-muted/20 rounded-[2.5rem] border-2 border-dashed text-center text-left text-left">
                            <History className="h-10 w-10 text-muted-foreground/10 mx-auto mb-3 text-center text-left" />
                            <p className="text-xs text-muted-foreground italic px-12 text-balance text-center text-left">No recorded sessions between you and {partnerName}. Start sharpening each other to see results!</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-8 bg-muted/20 rounded-[2.5rem] border border-dashed flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-inner text-left text-left">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm text-left text-left">
                    <MessagesSquare className="h-6 w-6 text-primary text-left text-left" />
                </div>
                <div className="space-y-3 flex-1 text-center sm:text-left text-left text-left">
                    <div className="space-y-1 text-left sm:text-left text-left">
                        <h4 className="font-black text-sm uppercase tracking-tight text-foreground text-center sm:text-left text-left">Post-Session Fellowship</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium text-balance text-center sm:text-left text-left">The arena is for sharpening, but the hub is for building. Continue the conversation with your partner after each session.</p>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl h-auto py-2 px-6 font-bold border-primary/20 text-primary hover:bg-primary/5 text-center sm:text-left leading-relaxed text-balance text-left" onClick={() => router.push('/chats')}>
                        OPEN KINGDOM CHAT
                    </Button>
                </div>
            </div>
        </div>
    );
}
