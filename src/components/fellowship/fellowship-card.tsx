'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useUser, useAuth, useDoc, useCollection, useFirestore } from '@/firebase';
import type { Fellowship, UserProfile, DailyDevotional, TestimonyComment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { doc, runTransaction, arrayUnion, arrayRemove, increment, serverTimestamp, collection, query, updateDoc } from 'firebase/firestore';
import { cn, safeToDate } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Users, MoreVertical, PlayCircle, Edit, Trash2, MapPin, BarChart3, BookOpen, LogOut, Quote, Sparkles, HandHeart, Share2, MessageSquare, Target, PartyPopper, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CommentSection } from '@/components/testimonies/comment-section';

type FellowshipCardProps = {
  fellowship: Fellowship;
  userProfile: UserProfile | null;
  onManage: () => void;
  onDelete: () => void;
  onClick?: () => void;
};

/**
 * Ensures the profile photo displayed in the card is always the most recent version.
 */
function LiveAvatar({ userId, fallbackUrl, fallbackInitials, className }: { userId: string, fallbackUrl?: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userRef = useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const currentPhotoUrl = profile?.photoURL || fallbackUrl;
    
    return (
        <Avatar className={className}>
            <AvatarImage src={currentPhotoUrl} className="object-cover" />
            <AvatarFallback className="font-bold bg-primary/10 text-primary">{fallbackInitials}</AvatarFallback>
        </Avatar>
    );
}

function FullDevotionalDialog({ 
    devotional, 
    children,
    fellowshipId,
    commentCount = 0,
    supporters = [],
    inspiredBy = [],
    connectedBy = [],
    onReaction,
    isProcessingReaction
}: { 
    devotional: DailyDevotional, 
    children: React.ReactNode,
    fellowshipId: string,
    commentCount?: number,
    supporters?: string[],
    inspiredBy?: string[],
    connectedBy?: string[],
    onReaction: (type: 'amen' | 'inspired' | 'celebrate', e: React.MouseEvent) => void,
    isProcessingReaction: string | null
}) {
    const { user } = useUser();
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const commentsRef = useRef<HTMLDivElement>(null);
    useEffect(() => setMounted(true), []);

    const hasAmened = user ? supporters.includes(user.uid) : false;
    const hasInspired = user ? inspiredBy.includes(user.uid) : false;
    const hasCelebrated = user ? connectedBy.includes(user.uid) : false;

    const commentPath = `fellowships/${fellowshipId}/devotionals/${devotional.scheduledDate}/comments`;

    const scrollToComments = (e: React.MouseEvent) => {
        e.stopPropagation();
        commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const stopPropagation = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    if (!mounted) return <>{children}</>;

    const content = (
        <div className="space-y-8 text-left" onClick={stopPropagation}>
            <div className="bg-primary/5 rounded-[2rem] p-8 sm:p-12 border-2 border-dashed border-primary/20 relative shadow-inner overflow-hidden">
                <Quote className="absolute top-6 right-8 h-12 w-12 opacity-10 rotate-12" />
                <p className="text-xl sm:text-2xl font-serif italic leading-relaxed text-left text-balance relative z-10 break-words">{devotional.text}</p>
                <p className="text-xs sm:text-sm font-black uppercase text-primary/80 text-right mt-10 tracking-widest border-t border-primary/10 pt-4 relative z-10">— {devotional.scripture}</p>
            </div>
            
            {devotional.prayer && (
                <div className="bg-muted/30 rounded-[2rem] p-8 sm:p-10 border border-muted-foreground/10 shadow-sm relative overflow-hidden text-left">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <HandHeart className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">PRAYER FOR TODAY</span>
                    </div>
                    <p className="text-lg sm:text-xl font-medium leading-relaxed italic text-muted-foreground text-balance break-words text-left">
                        &ldquo;{devotional.prayer}&rdquo;
                    </p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-dashed pt-8 text-left">
                <div className="flex items-center justify-center gap-3 bg-muted/30 px-4 py-2 rounded-full border border-dashed w-fit">
                    <Sparkles className="h-4 w-4 text-primary fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Messenger: {devotional.authorName}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-center w-full sm:w-auto text-left">
                    <div className="flex items-center gap-1.5 flex-wrap justify-center text-left">
                        <Button 
                            onClick={(e) => onReaction('amen', e)} 
                            disabled={isProcessingReaction !== null || !user} 
                            variant="outline" 
                            size="sm" 
                            className={cn("h-9 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest bg-background", hasAmened && "bg-primary/10 border-primary/30 text-primary")}
                        >
                            {isProcessingReaction === 'amen' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HandHeart className={cn("h-3.5 w-3.5", hasAmened && "fill-current")} />}
                            <span>Amen</span>
                        </Button>
                        <Button 
                            onClick={(e) => onReaction('inspired', e)} 
                            disabled={isProcessingReaction !== null || !user} 
                            variant="outline" 
                            size="sm" 
                            className={cn("h-9 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest bg-background", hasInspired && "bg-chart-3/10 border-chart-3/30 text-chart-3")}
                        >
                            {isProcessingReaction === 'inspired' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className={cn("h-3.5 w-3.5", hasInspired && "fill-current")} />}
                            <span>Hallelujah</span>
                        </Button>
                        <Button 
                            onClick={(e) => onReaction('celebrate', e)} 
                            disabled={isProcessingReaction !== null || !user} 
                            variant="outline" 
                            size="sm" 
                            className={cn("h-9 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest bg-background", hasCelebrated && "bg-blue-500/10 border-blue-500/30 text-blue-500")}
                        >
                            {isProcessingReaction === 'celebrate' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PartyPopper className={cn("h-3.5 w-3.5", hasCelebrated && "fill-current")} />}
                            <span>Celebrate</span>
                        </Button>
                    </div>

                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest bg-muted/20 border-primary/20 hover:bg-muted/30 transition-all active:scale-95 px-6 shadow-sm"
                        onClick={scrollToComments}
                    >
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <span>{commentCount} Response{commentCount !== 1 ? 's' : ''}</span>
                    </Button>
                </div>
            </div>

            <div ref={commentsRef} className="border-t border-dashed pt-8 text-left">
                <div className="flex items-center gap-3 mb-6 px-1 text-left">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-left">
                        <MessageSquare className="h-4 w-4 text-primary text-left" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">GATHERED RESPONSES</span>
                </div>
                <CommentSection path={commentPath} inline />
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild onClick={stopPropagation}>{children}</SheetTrigger>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                        <SheetHeader className="text-left flex-shrink-0 p-0 text-left">
                            <SheetTitle className="text-2xl font-black font-headline uppercase leading-tight break-words flex items-center gap-3 text-balance text-left">
                                <MessageSquare className="h-6 w-6 text-primary shrink-0 text-left" />
                                {devotional.title}
                            </SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1 text-left">Word for {format(parseISO(devotional.scheduledDate), 'PPPP')}</SheetDescription>
                        </SheetHeader>
                    </div>
                    <ScrollArea className="flex-grow text-left">
                        <div className="p-8 pb-32 text-left">
                            {content}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild onClick={stopPropagation}>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl text-left flex flex-col max-h-[90dvh]">
                <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
                    <div className="flex items-center gap-3 mb-2 text-left">
                        <Target className="h-5 w-5 text-primary text-left" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left">Mission Overview</span>
                    </div>
                    <DialogHeader className="text-left p-0 text-left">
                        <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight break-words flex items-center gap-3 text-balance text-left">
                            <MessageSquare className="h-6 w-6 text-primary shrink-0 text-left" />
                            {devotional.title}
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium mt-1 text-left">Daily Word • {format(parseISO(devotional.scheduledDate), 'PPPP')}</DialogDescription>
                    </DialogHeader>
                </div>
                <div className="flex-1 min-h-0 text-left">
                  <ScrollArea className="h-full text-left">
                      <div className="p-8 text-left">
                          {content}
                      </div>
                  </ScrollArea>
                </div>
                <div className="p-6 border-t bg-muted/5 flex justify-end gap-3 shrink-0 text-left">
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-full px-8 font-bold text-left">Close Word</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const FellowshipCardComponent = ({ fellowship, userProfile, onManage, onDelete, onClick }: FellowshipCardProps) => {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const [isJoining, setIsJoining] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [isProcessingReaction, setIsProcessingReaction] = useState<string | null>(null);
    
    const devotionalTextRef = useRef<HTMLParagraphElement>(null);
    const [isDevotionalTruncated, setIsDevotionalTruncated] = useState(false);

    const isMember = useMemo(() => {
        if (!user || !fellowship.memberIds) return false;
        return fellowship.memberIds.includes(user.uid);
    }, [user, fellowship.memberIds]);

    const isOrganizer = useMemo(() => {
        if (!user || !fellowship) return false;
        return fellowship.organizerId === user.uid;
    }, [user, fellowship]);

    const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
    const devotionalRef = useMemo(() => {
        if (!firestore || !fellowship.id) return null;
        return doc(firestore, 'fellowships', fellowship.id, 'devotionals', todayStr);
    }, [firestore, fellowship.id, todayStr]);
    const { data: todayDevotional } = useDoc<DailyDevotional>(devotionalRef);

    const commentsQuery = useMemo(() => {
        if (!firestore || !fellowship.id) return null;
        return query(collection(firestore, 'fellowships', fellowship.id, 'devotionals', todayStr, 'comments'));
    }, [firestore, fellowship.id, todayStr]);
    const { data: comments } = useCollection<{id: string}>(commentsQuery);
    const commentCount = comments?.length || 0;

    const supporters = todayDevotional?.supporters || [];
    const inspiredBy = todayDevotional?.inspiredBy || [];
    const connectedBy = todayDevotional?.connectedBy || [];
    const totalReactions = supporters.length + inspiredBy.length + connectedBy.length;

    useEffect(() => {
        if (devotionalTextRef.current) {
            const checkTruncation = () => {
                if (devotionalTextRef.current) {
                    setIsDevotionalTruncated(
                        devotionalTextRef.current.scrollHeight > devotionalTextRef.current.clientHeight || (!!todayDevotional?.prayer)
                    );
                }
            };
            setTimeout(checkTruncation, 100);
            window.addEventListener('resize', checkTruncation);
            return () => window.removeEventListener('resize', checkTruncation);
        }
    }, [todayDevotional]);

    const handleReaction = (type: 'amen' | 'inspired' | 'celebrate', e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user || !firestore || !todayDevotional) return;
        
        const hasAmened = supporters.includes(user.uid);
        const hasInspired = inspiredBy.includes(user.uid);
        const hasCelebrated = connectedBy.includes(user.uid);
        
        const hasReacted = (type === 'amen' && hasAmened) || (type === 'inspired' && hasInspired) || (type === 'celebrate' && hasCelebrated);
        setIsProcessingReaction(type);
        
        const devoRef = doc(firestore, 'fellowships', fellowship.id, 'devotionals', todayStr);
        const field = type === 'amen' ? 'supporters' : type === 'inspired' ? 'inspiredBy' : 'connectedBy';
        const updatePayload = { [field]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid) };
        
        updateDoc(devoRef, updatePayload)
            .catch(() => {
                const permissionError = new FirestorePermissionError({ path: devoRef.path, operation: 'update', requestResourceData: updatePayload }, user);
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => setIsProcessingReaction(null));
    }

    const triggerAction = (action: () => void) => {
        requestAnimationFrame(() => {
            action();
        });
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/fellowship/${fellowship.id}`;
        let shareText = `Join the '${fellowship.name}' community on Testify!`;
        
        if (todayDevotional) {
            shareText = `Read today's word: '${todayDevotional.title}' in the '${fellowship.name}' group on Testify!`;
        }

        const shareData = {
          title: fellowship.name,
          text: shareText,
          url: shareUrl,
        };

        try {
          if (navigator && navigator.share) {
            await navigator.share(shareData);
          } else {
            throw new Error('Native share not supported');
          }
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            try {
                await navigator.clipboard.writeText(shareUrl);
                toast({ title: 'Link Copied!', description: 'Community link copied to clipboard.' });
            } catch (clipErr) {
                console.error("Clipboard fallback failed", clipErr);
            }
        }
    };

    const handleJoin = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user || !userProfile || !firestore || isMember || isOrganizer) return;
        setIsJoining(true);

        const fellowshipRef = doc(firestore, "fellowships", fellowship.id);
        const userFellowshipRef = doc(firestore, 'users', user.uid, 'joinedFellowships', fellowship.id);
        const fellowshipMemberRef = doc(firestore, 'fellowships', fellowship.id, 'members', user.uid);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const fellowshipDoc = await transaction.get(fellowshipRef);
                if (!fellowshipDoc.exists()) throw new Error("Group no longer exists.");

                transaction.update(fellowshipRef, {
                    memberIds: arrayUnion(user.uid),
                    memberCount: increment(1)
                });
                transaction.set(userFellowshipRef, { fellowshipId: fellowship.id, joinedAt: serverTimestamp() });
                transaction.set(fellowshipMemberRef, {
                    userId: user.uid,
                    firstName: userProfile.firstName,
                    lastName: userProfile.lastName,
                    photoURL: userProfile.photoURL || '',
                    joinedAt: serverTimestamp()
                });
            });
            toast({ title: "Successfully Joined!", description: `You are now a member of ${fellowship.name}.`});
        } catch (e: any) {
            if (e.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: `fellowships/${fellowship.id}`, operation: 'update' }, user);
                errorEmitter.emit('permission-error', permissionError);
            } else {
                toast({ variant: 'destructive', title: 'Join Failed', description: e.message || 'An unexpected error occurred.' });
            }
        } finally {
            setIsJoining(false);
        }
    };

    const handleLeave = async (e: any) => {
        if (!user || !firestore || isOrganizer || !isMember) return;
        setIsLeaving(true);

        const fellowshipRef = doc(firestore, "fellowships", fellowship.id);
        const userFellowshipRef = doc(firestore, 'users', user.uid, 'joinedFellowships', fellowship.id);
        const fellowshipMemberRef = doc(firestore, 'fellowships', fellowship.id, 'members', user.uid);

        try {
            await runTransaction(firestore, async (transaction) => {
                transaction.update(fellowshipRef, {
                    memberIds: arrayRemove(user.uid),
                    memberCount: increment(-1)
                });
                transaction.delete(userFellowshipRef);
                transaction.delete(fellowshipMemberRef);
            });
            toast({ title: "Left Group", description: `You have left ${fellowship.name}.` });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Action Failed', description: 'Could not leave group.' });
        } finally {
            setIsLeaving(false);
        }
    };
    
    const stopPropagation = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <Card onClick={onClick} className="cursor-pointer rounded-2xl border transition-all duration-300 shadow-md sm:shadow-lg border-t-2 border-t-primary/10 border-b-8 border-b-primary/10 sm:border-b-8 bg-card/50 backdrop-blur-sm text-left text-left">
            <CardHeader className="p-4 sm:p-6 pb-2 text-left">
                <div className="flex justify-between items-start gap-4 text-left">
                    <div className="min-w-0 flex-1 text-left">
                        <CardTitle className="text-lg sm:text-xl font-black leading-tight mb-2 uppercase tracking-tight break-words [overflow-wrap:anywhere] text-left">
                          {fellowship.name}
                        </CardTitle>
                        <div className="space-y-2 text-left">
                          <CardDescription className="flex items-center gap-2 text-[11px] sm:text-xs font-medium text-left text-left">
                              <LiveAvatar userId={fellowship.organizerId} fallbackUrl={fellowship.organizerPhotoURL} fallbackInitials={fellowship.organizerName?.charAt(0)} className="h-5 w-5 border shadow-sm text-left" />
                              <span className="leading-tight text-left">
                                Organized by{" "}
                                <Link 
                                    href={isOrganizer ? '/profile' : `/profile/${fellowship.organizerId}`}
                                    onClick={stopPropagation}
                                    className="font-bold text-primary hover:underline text-left"
                                >
                                    {fellowship.organizerName}
                                </Link>
                              </span>
                          </CardDescription>
                          <div className="flex gap-1.5 items-center flex-wrap text-left">
                            <Badge variant="default" className="text-[9px] sm:text-[10px] h-5 px-2 w-fit uppercase tracking-widest font-black leading-none text-left">
                                {fellowship.groupType || 'Fellowship'}
                            </Badge>
                            {fellowship.locationType && (
                                <Badge variant="secondary" className="text-[9px] sm:text-[10px] h-5 px-2 w-fit uppercase tracking-widest font-black leading-none text-left">
                                    {fellowship.locationType}
                                </Badge>
                            )}
                          </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-left" onClick={stopPropagation}>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full shadow-sm bg-background border-primary/20 text-primary/60 hover:text-primary hover:bg-primary/5 text-left" onClick={handleShare}>
                                        <Share2 className="h-4 w-4 text-left" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-left text-left"><p className="text-[10px] font-bold uppercase text-left">Share Group</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-9 w-9 sm:h-10 sm:w-10 border-primary/20 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-full shadow-md bg-background text-left" 
                                        onClick={() => triggerAction(() => router.push(`/fellowship/${fellowship.id}`))}
                                    >
                                        <BarChart3 className="h-4 w-4 sm:h-5 w-5 text-left" />
                                        <span className="sr-only text-left">View Details</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-left text-left">
                                    <p className="text-left">Kingdom Insights</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        {(isOrganizer || isMember) && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 -mr-2 rounded-full text-left">
                                        <MoreVertical className="h-4 w-4 text-left" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl text-left">
                                    {isOrganizer ? (
                                        <>
                                            <DropdownMenuItem onSelect={() => triggerAction(onManage)} className="rounded-lg text-left">
                                                <Edit className="mr-2 h-4 w-4 text-primary text-left" />
                                                Manage
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="text-left" />
                                            <DropdownMenuItem onSelect={() => triggerAction(onDelete)} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg text-left">
                                                <Trash2 className="mr-2 h-4 w-4 text-left" />
                                                Delete Group
                                            </DropdownMenuItem>
                                        </>
                                    ) : (
                                        <DropdownMenuItem onSelect={handleLeave} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-lg text-left">
                                            {isLeaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" /> : <LogOut className="mr-2 h-4 w-4 text-left" />}
                                            Leave Fellowship
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="px-4 sm:px-6 pb-4 space-y-4 pt-4 text-left">
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed font-medium break-words [overflow-wrap:anywhere] text-left">{fellowship.description}</p>
                
                {todayDevotional && (
                    <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 relative group/devo overflow-hidden shadow-inner text-left text-left text-left">
                        <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none group-hover/devo:opacity-[0.06] transition-opacity text-left">
                            <BookOpen className="h-12 w-12 text-primary rotate-12 text-left text-left text-left" />
                        </div>
                        <div className="flex items-center gap-2 mb-2 text-left text-left text-left">
                            <div className="h-4 w-4 bg-primary/20 rounded-full flex items-center justify-center text-left text-left">
                                <Sparkles className="h-2.5 w-2.5 text-primary text-left text-left" />
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary text-left text-left text-left">DEVOTIONAL FOR TODAY</span>
                        </div>
                        <p className="font-bold text-xs sm:text-sm mb-1 truncate text-foreground break-words [overflow-wrap:anywhere] text-left text-left">{todayDevotional.title}</p>
                        <div className="space-y-1 text-left text-left text-left">
                            <p 
                                ref={devotionalTextRef}
                                className="text-[10px] sm:text-xs text-muted-foreground italic line-clamp-2 font-medium leading-relaxed break-words [overflow-wrap:anywhere] text-left text-left"
                            >
                                &ldquo;{todayDevotional.text}&rdquo;
                            </p>
                            {todayDevotional.prayer && (
                                <div className="mt-2 pl-3 border-l-2 border-primary/20 text-left text-left text-left">
                                    <p className="text-[9px] font-black uppercase text-primary/60 mb-0.5 text-left text-left">Prayer focus</p>
                                    <p className="text-[10px] text-muted-foreground italic line-clamp-1 leading-tight break-words [overflow-wrap:anywhere] text-left text-left">
                                        &ldquo;{todayDevotional.prayer}&rdquo;
                                    </p>
                                </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-4 text-left text-left text-left text-left">
                                {totalReactions > 0 || commentCount > 0 ? (
                                    <div className="flex items-center gap-3 text-left text-left text-left">
                                        {totalReactions > 0 && (
                                            <div className="flex items-center gap-1 bg-background/50 px-1.5 py-0.5 rounded-full border border-primary/10 shadow-sm text-left text-left text-left text-left">
                                                <div className="flex items-center -space-x-1 text-left text-left text-left text-left">
                                                    {supporters.length > 0 && <HandHeart className="h-3 w-3 text-primary fill-current text-left text-left text-left" />}
                                                    {inspiredBy.length > 0 && <Sparkles className="h-3 w-3 text-chart-3 fill-current text-left text-left text-left" />}
                                                    {connectedBy.length > 0 && <PartyPopper className="h-3 w-3 text-blue-500 text-left text-left text-left" />}
                                                </div>
                                                <span className="text-[8px] font-black text-muted-foreground text-left text-left text-left">{totalReactions}</span>
                                            </div>
                                        )}
                                        {commentCount > 0 && (
                                            <div className="flex items-center gap-1 text-muted-foreground text-left text-left text-left text-left">
                                                <MessageSquare className="h-2.5 w-2.5 text-left text-left text-left text-left" />
                                                <span className="text-[8px] font-black text-left text-left text-left text-left">{commentCount}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : <div className="text-left text-left text-left text-left" />}
                                
                                {isDevotionalTruncated && (
                                    <FullDevotionalDialog 
                                        devotional={todayDevotional}
                                        fellowshipId={fellowship.id}
                                        commentCount={commentCount}
                                        supporters={supporters}
                                        inspiredBy={inspiredBy}
                                        connectedBy={connectedBy}
                                        onReaction={handleReaction}
                                        isProcessingReaction={isProcessingReaction}
                                    >
                                        <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline h-auto p-0 text-left text-left text-left">
                                            Read More
                                        </button>
                                    </FullDevotionalDialog>
                                )}
                            </div>
                        </div>
                        <p className="text-[8px] font-black uppercase text-primary/60 text-right mt-2 tracking-widest break-words [overflow-wrap:anywhere] text-right text-left text-left">— {todayDevotional.scripture}</p>
                    </div>
                )}

                <div className="text-[11px] sm:text-xs space-y-2 p-4 bg-muted/30 rounded-2xl border border-dashed text-left text-left">
                    <div className="flex items-start gap-2.5 text-left text-left text-left">
                        <span className="font-black text-[9px] sm:text-[10px] text-muted-foreground shrink-0 uppercase tracking-widest pt-0.5 text-left text-left">Schedule</span>
                        <span className="text-foreground font-bold leading-tight break-words [overflow-wrap:anywhere] text-left text-left text-left">{fellowship.schedule}</span>
                    </div>
                    {fellowship.location && (
                        <div className="flex items-start gap-2.5 pt-1 border-t border-muted-foreground/10 mt-1 text-left text-left text-left">
                            <span className="font-black text-[9px] sm:text-[10px] text-muted-foreground shrink-0 uppercase tracking-widest pt-0.5 text-left text-left">Area</span>
                            <span className="text-foreground font-bold line-clamp-1 leading-tight flex items-center gap-1.5 break-words [overflow-wrap:anywhere] text-left text-left"><MapPin className="h-3 text-primary text-left text-left" /> {fellowship.location}</span>
                        </div>
                    )}
                </div>
            </CardContent>
            
            <CardFooter className="px-4 sm:px-6 py-4 flex justify-between items-center border-t bg-black/5 text-left text-left">
                <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground font-black uppercase tracking-widest text-left text-left text-left">
                    <Users className="mr-2 h-4 w-4 text-primary text-left text-left text-left" /> {fellowship.memberCount} {fellowship.memberCount === 1 ? 'MEMBER' : 'MEMBERS'}
                </div>
                <div className="flex items-center gap-2 text-left" onClick={stopPropagation}>
                    {(isMember || isOrganizer) && fellowship.streamUrl && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm bg-background text-left text-left">
                                        <Link href={fellowship.streamUrl} target="_blank" rel="noopener noreferrer" className="text-left text-left text-left text-left">
                                            <PlayCircle className="h-4 w-4 text-primary text-left text-left" />
                                            <span className="sr-only text-left text-left">Join Stream</span>
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-left text-left"><p className="text-[10px] font-bold uppercase text-left text-left text-left">Enter Online Meeting</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    {!isOrganizer && (
                        <Button onClick={handleJoin} disabled={isMember || isJoining} size="sm" className="h-9 px-6 text-xs font-black uppercase tracking-widest rounded-xl shadow-lg text-center text-left text-left">
                            {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left" /> : null}
                            {isMember ? 'JOINED' : `JOIN ${fellowship.groupType?.toUpperCase() || 'GROUP'}`}
                        </Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}

export const FellowshipCard = React.memo(FellowshipCardComponent);
