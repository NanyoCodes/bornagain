'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn, safeToDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useUserProfile, useDoc, useCollection } from '@/firebase';
import { 
    doc, 
    updateDoc, 
    increment, 
    serverTimestamp, 
    collection, 
    query, 
    where, 
    orderBy, 
    limit,
    deleteDoc,
    setDoc,
    getDocs,
    getDoc,
    addDoc
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { UserProfile, GameSession, GameInvitation, GameSessionType } from '@/lib/types';
import { format, differenceInMinutes } from 'date-fns';
import { Label } from '../ui/label';
import { BIBLE_GAME_DATA } from '@/lib/bible-game-data';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { useIsMobile } from "@/hooks/use-mobile";
import Image from 'next/image';

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
    const [quizIndex, setQuizIndex] = useState(0);
    const [usedIndices, setUsedIndices] = useState<number[]>([]);
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

    const nextChallenge = useCallback(() => {
        const pool = BIBLE_GAME_DATA[activeGameType];
        const availableIndices = pool
            .map((_, i) => i)
            .filter(i => !usedIndices.includes(i));
        
        let targetIdx: number;
        if (availableIndices.length === 0) {
            targetIdx = Math.floor(Math.random() * pool.length);
            setUsedIndices([targetIdx]);
        } else {
            targetIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
            setUsedIndices(prev => [...prev, targetIdx]);
        }
        
        setQuizIndex(targetIdx);
        setGameState('playing');
        setSelectedOption(null);
    }, [activeGameType, usedIndices]);

    const handleStart = (type: GameSessionType = activeGameType) => {
        const pool = BIBLE_GAME_DATA[type];
        const initialIdx = Math.floor(Math.random() * pool.length);
        setQuizIndex(initialIdx);
        setUsedIndices([initialIdx]);
        setCorrectCount(0);
        setWrongCount(0);
        setGameState('playing');
        setIsGameActive(true);
        setSelectedOption(null);
    };

    const handleGameEnd = () => {
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
            .then(() => {
                const userRef = doc(firestore, 'users', user.uid);
                updateDoc(userRef, {
                    kingdomPoints: increment(totalPoints),
                    lastGameAt: serverTimestamp()
                }).catch(async (err) => {
                     errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: userRef.path,
                        operation: 'update',
                        requestResourceData: { kingdomPoints: totalPoints }
                    }, user));
                });

                if (invitation) {
                    deleteDoc(doc(firestore, 'gameInvitations', invitation.id)).catch(async () => {
                        errorEmitter.emit('permission-error', new FirestorePermissionError({
                            path: `gameInvitations/${invitation.id}`,
                            operation: 'delete'
                        }, user));
                    });
                }

                toast({ title: 'Victory Recorded!', description: `Session saved with ${totalPoints} Kingdom Points.` });
            })
            .catch(async () => {
                const permissionError = new FirestorePermissionError({
                    path: sessionRef.path,
                    operation: 'create',
                    requestResourceData: sessionData
                } satisfies SecurityRuleContext, user);
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsSavingSession(false);
            });
    };

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

                toast({ title: 'Challenge Issued', description: `Waiting for ${partnerName} to accept.` });
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
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: invitationRef.path,
                operation: 'update',
                requestResourceData: { status: 'accepted' }
            }, user));
        });
    };

    const handleDeclineChallenge = async () => {
        if (!invitation || !firestore) return;
        const invitationRef = doc(firestore, 'gameInvitations', invitation.id);
        updateDoc(invitationRef, { status: 'declined' })
            .catch(() => {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: invitationRef.path,
                    operation: 'update',
                    requestResourceData: { status: 'declined' }
                }, user));
            });
        setGameState('playing');
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
        if (!allHistory) return [];
        return allHistory.filter(s => s.participantIds.includes(partnerId));
    }, [allHistory, partnerId]);

    const handleOpenPrivateChat = async () => {
        if (!user || !firestore || !userProfile) return;
        try {
            const participantIds = [user.uid, partnerId].sort();
            const chatsRef = collection(firestore, 'chats');
            const q = query(chatsRef, where('participantIds', '==', participantIds), where('isGroupChat', '==', false));
            const querySnapshot = await getDocs(q);
            let existingChat = querySnapshot.docs.find(doc => !doc.data().campaignId);
            
            let chatId: string;

            if (existingChat) {
                chatId = existingChat.id;
            } else {
                const partnerUserRef = doc(firestore, 'users', partnerId);
                const partnerDoc = await getDoc(partnerUserRef);
                const pProfile = partnerDoc.data() as UserProfile;
                
                const chatPayload = {
                    participantIds,
                    participantInfo: {
                        [user.uid]: {
                            firstName: userProfile.firstName || '',
                            lastName: userProfile.lastName || '',
                            photoURL: userProfile.photoURL || '',
                        },
                        [partnerId]: {
                            firstName: partnerName.split(' ')[0],
                            lastName: partnerName.split(' ').slice(1).join(' '),
                            photoURL: pProfile?.photoURL || '',
                        }
                    },
                    vendorId: null,
                    campaignTitle: null,
                    lastUpdatedAt: serverTimestamp(),
                    isGroupChat: false,
                    hasMessages: false
                };
                const chatDocRef = await addDoc(chatsRef, chatPayload);
                chatId = chatDocRef.id;
            }
            router.push(`/chats/${chatId}`);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Chat Error' });
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-32 px-4 sm:px-6 text-left">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full self-start sm:self-auto border bg-background shadow-sm">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-none flex items-center gap-3 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 shadow-sm min-w-0">
                        <Star className="h-4 w-4 text-primary fill-current shrink-0" />
                        <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-primary">
                            You: {(userProfile?.kingdomPoints || 0) + (isGameActive ? correctCount * 10 : 0)}
                        </span>
                    </div>
                    <div className="flex-1 sm:flex-none flex items-center gap-3 bg-muted/30 px-4 py-1.5 rounded-full border border-dashed min-w-0 relative">
                        <Trophy className="h-4 w-4 text-muted-foreground opacity-60 shrink-0" />
                        <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">
                            {partnerName}: {partnerProfile?.kingdomPoints || 0}
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

            <Card className="rounded-[2rem] sm:rounded-[3rem] border-2 border-primary/20 bg-[#09090b] shadow-2xl overflow-hidden group transition-all hover:border-primary/40 text-left">
                <CardHeader className="p-6 sm:p-10 pb-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Gamepad2 className="h-5 w-5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Arena of Truth</span>
                    </div>
                    <CardTitle className="text-2xl sm:text-4xl font-black font-headline uppercase tracking-tight text-white leading-none text-center">Sharpening the Word</CardTitle>
                    {!isGameActive && gameState !== 'finished' && (
                        <CardDescription className="text-zinc-400 text-sm font-medium mt-3 text-center">Select a challenge type and duration to begin.</CardDescription>
                    )}
                </CardHeader>
                
                <CardContent className={cn("p-6 sm:p-12 pt-0 space-y-8", !isGameActive && "text-center flex flex-col items-center justify-center")}>
                    {!isGameActive && gameState !== 'finished' && (
                        <div className="py-4 sm:py-8 flex flex-col items-center gap-8 text-center w-full">
                            {!invitation ? (
                                <div className="w-full space-y-8 text-left">
                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Choose Challenge Type</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                                                        "h-20 sm:h-28 flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-4 sm:gap-2 px-6 sm:px-4 rounded-2xl border-2 transition-all",
                                                        activeGameType === type.id ? "bg-primary/20 border-primary text-primary shadow-lg" : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-primary/40"
                                                    )}
                                                >
                                                    <type.icon className="h-6 w-6 shrink-0" />
                                                    <span className="text-[11px] font-black uppercase tracking-widest">{type.label}</span>
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
                                        className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30"
                                    >
                                        {isRequesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        ISSUE CHALLENGE
                                    </Button>
                                </div>
                            ) : invitation.hostId === user?.uid ? (
                                <div className="space-y-6 w-full flex flex-col items-center justify-center text-center animate-in fade-in">
                                    <div className="h-24 w-24 rounded-[2.5rem] bg-primary/10 flex items-center justify-center mx-auto border-2 border-dashed border-primary/20">
                                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                    </div>
                                    <div className="space-y-2 text-center">
                                        <Badge variant="outline" className="h-10 px-6 rounded-full border-primary/20 text-primary uppercase font-black tracking-widest animate-pulse">
                                            Waiting for {partnerName}...
                                        </Badge>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                            {invitation.gameType.charAt(0).toUpperCase() + invitation.gameType.slice(1)} Challenge • {invitation.timerDuration}s
                                        </p>
                                    </div>
                                    <Button variant="ghost" onClick={() => deleteDoc(doc(firestore!, 'gameInvitations', invitation.id))} className="text-muted-foreground uppercase text-[10px] font-bold">
                                        Cancel Request
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-6 w-full flex flex-col items-center justify-center text-center animate-in slide-in-from-bottom-4">
                                    <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                                        <Target className="h-10 w-10 text-primary animate-bounce" />
                                    </div>
                                    <div className="space-y-1 text-center">
                                        <p className="text-lg font-black text-white uppercase tracking-widest"> {partnerName.toUpperCase()} HAS CHALLENGED YOU!</p>
                                        <p className="text-xs font-bold text-primary uppercase tracking-widest">Mode: {invitation.gameType} • Duration: {invitation.timerDuration}s</p>
                                    </div>
                                    <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
                                        <Button onClick={handleAcceptChallenge} size="lg" className="h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl">
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
                        <div className="space-y-6 sm:space-y-10 animate-in fade-in zoom-in duration-500 text-left">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors border-2",
                                        timeLeft <= 10 ? "bg-red-500 border-red-400 text-white animate-pulse" : "bg-primary/10 border-primary/20 text-primary"
                                    )}>
                                        <Timer className="h-5 w-5 sm:h-6 sm:w-6" />
                                    </div>
                                    <div className="text-left">
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

                            <div className="bg-zinc-900 rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-10 border-2 border-dashed border-white/5 shadow-inner relative overflow-hidden text-center min-h-[180px] flex items-center justify-center">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                                    <BookOpen className="h-16 w-16 sm:h-24 sm:w-24 text-primary rotate-12" />
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.p 
                                        key={quizIndex}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.05 }}
                                        className="text-lg sm:text-2xl font-serif italic leading-relaxed text-zinc-200 text-balance text-center"
                                    >
                                        &ldquo;{quiz?.text}&rdquo;
                                    </motion.p>
                                </AnimatePresence>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {quiz?.options.map((opt: string) => (
                                    <Button
                                        key={opt}
                                        variant="outline"
                                        className={cn(
                                            "h-14 sm:h-20 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-sm transition-all border-2 text-center whitespace-normal",
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
                        <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-bottom-6 duration-700 text-center">
                            <div className="text-center space-y-4">
                                <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-[2rem] bg-primary flex items-center justify-center mx-auto shadow-2xl border-4 border-white/10">
                                    <Award className="h-10 w-10 sm:h-14 sm:w-14 text-white" />
                                </div>
                                <div className="space-y-1 text-center">
                                    <h3 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tight">Session Complete!</h3>
                                    <p className="text-zinc-400 font-medium text-sm sm:text-base">Excellent labor in the Word.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 sm:gap-6">
                                <div className="bg-zinc-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 text-center border border-white/5 shadow-inner">
                                    <p className="text-[10px] sm:text-xs font-black text-primary uppercase mb-1 tracking-widest text-center">Points</p>
                                    <p className="text-xl sm:text-4xl font-black text-white">{correctCount * 10}</p>
                                </div>
                                <div className="bg-zinc-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 text-center border border-white/5 shadow-inner">
                                    <p className="text-[10px] sm:text-xs font-black text-green-500 uppercase mb-1 tracking-widest text-center">Correct</p>
                                    <p className="text-xl sm:text-4xl font-black text-white">{correctCount}</p>
                                </div>
                                <div className="bg-zinc-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 text-center border border-white/5 shadow-inner">
                                    <p className="text-[10px] sm:text-xs font-black text-red-500 uppercase mb-1 tracking-widest text-center">Errors</p>
                                    <p className="text-xl sm:text-4xl font-black text-white">{wrongCount}</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <Button 
                                    onClick={handleOpenPrivateChat}
                                    size="lg"
                                    className="w-full h-16 rounded-2xl font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 shadow-xl flex items-center justify-center gap-4 transition-all active:scale-95"
                                >
                                    <MessagesSquare className="h-5 w-5" />
                                    OPEN PRIVATE CHAT
                                </Button>
                                <Button 
                                    onClick={() => handleStart(activeGameType)}
                                    variant="outline"
                                    className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-transparent border-white/10 text-zinc-400 hover:bg-white/5 shadow-md flex items-center justify-center gap-4 transition-all active:scale-95"
                                >
                                    <RefreshCw className="h-5 w-5" />
                                    NEW SESSION
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="p-4 bg-black/40 text-center justify-center border-t border-white/5">
                     <p className="text-[8px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] text-center">Iron Sharpens Iron • Growth • Victory</p>
                </CardFooter>
            </Card>

            <div className="space-y-6 text-left">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-primary" />
                        <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Arena History</h4>
                    </div>
                    <Badge variant="secondary" className="h-5 px-2 text-[9px] uppercase font-bold opacity-60">Past Sessions</Badge>
                </div>

                <div className="space-y-3">
                    {historyLoading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                        </div>
                    ) : filteredHistory.length > 0 ? filteredHistory.map(session => {
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
                                                {isMyScore ? 'My Victory' : `${partnerName}'s Result`}
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
                                        <p className="text-lg sm:text-xl font-black text-primary tracking-tighter">{session.score}</p>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">POINTS</p>
                                    </div>
                                </div>
                            </Card>
                        );
                    }) : (
                        <div className="py-16 text-center bg-muted/20 rounded-[2rem] border-2 border-dashed">
                            <History className="h-10 w-10 text-muted-foreground/10 mx-auto mb-3" />
                            <p className="text-xs text-muted-foreground italic px-12 text-balance text-center">The points against each other should be recorded. Start sharpening each other to see results!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
