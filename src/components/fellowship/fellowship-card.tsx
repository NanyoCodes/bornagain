'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import type { Fellowship, UserProfile, DailyDevotional, TestimonyComment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { doc, runTransaction, arrayUnion, arrayRemove, increment, serverTimestamp, collection, query } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Users, MoreVertical, PlayCircle, Edit, Trash2, MapPin, BarChart3, BookOpen, LogOut, Quote, Sparkles, HandHeart, Share2, MessageSquare } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

type FellowshipCardProps = {
  fellowship: Fellowship;
  userProfile: UserProfile | null;
  onManage: () => void;
  onDelete: () => void;
  onClick?: () => void;
};

function FullDevotionalDialog({ devotional, children }: { devotional: DailyDevotional, children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return <>{children}</>;

    const content = (
        <div className="space-y-8">
            <div className="bg-primary/5 rounded-[2rem] p-8 sm:p-12 border-2 border-dashed border-primary/20 relative shadow-inner overflow-hidden">
                <Quote className="absolute top-6 right-8 h-12 w-12 opacity-10 rotate-12" />
                <p className="text-xl sm:text-2xl font-serif italic leading-relaxed text-justify text-balance relative z-10 break-words [overflow-wrap:anywhere]">{devotional.text}</p>
                <p className="text-xs sm:text-sm font-black uppercase text-primary/80 text-right mt-10 tracking-widest border-t border-primary/10 pt-4 relative z-10 break-words [overflow-wrap:anywhere]">— {devotional.scripture}</p>
            </div>
            
            {devotional.prayer && (
                <div className="bg-muted/30 rounded-[2rem] p-8 sm:p-10 border border-muted-foreground/10 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <HandHeart className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">PRAYER FOR TODAY</span>
                    </div>
                    <p className="text-lg sm:text-xl font-medium leading-relaxed italic text-muted-foreground text-balance break-words [overflow-wrap:anywhere]">
                        &ldquo;{devotional.prayer}&rdquo;
                    </p>
                </div>
            )}

            <div className="flex items-center justify-center gap-3 bg-muted/30 px-4 py-2 rounded-full border border-dashed w-fit mx-auto">
                <Sparkles className="h-4 w-4 text-primary fill-current" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Messenger: {devotional.authorName}</span>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild onClick={(e) => e.stopPropagation()}>{children}</SheetTrigger>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                        <SheetHeader className="text-left flex-shrink-0">
                            <SheetTitle className="text-2xl font-black font-headline uppercase leading-tight break-words [overflow-wrap:anywhere]">{devotional.title}</SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1">Word for {format(parseISO(devotional.scheduledDate), 'PPPP')}</SheetDescription>
                        </SheetHeader>
                    </div>
                    <ScrollArea className="flex-grow">
                        <div className="p-8 pb-32">
                            {content}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                <div className="p-8 border-b bg-muted/10">
                    <div className="flex items-center gap-3 mb-2">
                        <Target className="h-5 w-5 text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Mission Overview</span>
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black font-headline uppercase leading-tight break-words [overflow-wrap:anywhere]">{devotional.title}</DialogTitle>
                        <DialogDescription className="text-sm font-medium mt-1">Daily Word • {format(parseISO(devotional.scheduledDate), 'PPPP')}</DialogDescription>
                    </DialogHeader>
                </div>
                <ScrollArea className="max-h-[70vh]">
                    <div className="p-8">
                        {content}
                    </div>
                </ScrollArea>
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
    const { data: comments } = useCollection<TestimonyComment>(commentsQuery);
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

    const triggerAction = (action: () => void) => {
        requestAnimationFrame(() => {
            action();
        });
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/dashboard/fellowship/${fellowship.id}`;
        let shareText = `Join the '${fellowship.name}' fellowship on Testify!`;
        
        if (todayDevotional) {
            shareText = `Read today's word: '${todayDevotional.title}' in the '${fellowship.name}' fellowship on Testify!`;
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
              await navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`);
              toast({ title: 'Link Copied!', description: 'Fellowship link has been copied to your clipboard.' });
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
        const userFellowshipRef = doc(firestore, 'users', user.uid, 'fellowships', fellowship.id);
        const fellowshipMemberRef = doc(firestore, 'fellowships', fellowship.id, 'members', user.uid);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const fellowshipDoc = await transaction.get(fellowshipRef);
                if (!fellowshipDoc.exists()) throw new Error("Fellowship no longer exists.");

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
        const userFellowshipRef = doc(firestore, 'users', user.uid, 'fellowships', fellowship.id);
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
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: 'Could not leave group.' });
        } finally {
            setIsLeaving(false);
        }
    };
    
    const stopPropagation = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <Card onClick={onClick} className="cursor-pointer rounded-none sm:rounded-lg border-x-0 sm:border-x transition-all duration-300 hover:shadow-lg border-t-2 border-t-primary/10 border-b-8 border-b-primary/10 sm:border-b-8 bg-card/50 backdrop-blur-sm">
            <CardHeader className="p-5 sm:p-6 pb-2">
                <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg sm:text-xl font-black leading-tight mb-2 uppercase tracking-tight break-words [overflow-wrap:anywhere]">
                          {fellowship.name}
                        </CardTitle>
                        <div className="space-y-2">
                          <CardDescription className="flex items-center gap-2 text-[11px] sm:text-xs font-medium">
                              <Avatar className="h-5 w-5 border shadow-sm">
                                  <AvatarImage src={fellowship.organizerPhotoURL} />
                                  <AvatarFallback className="text-[8px] font-black bg-primary/10 text-primary">{fellowship.organizerName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="leading-tight truncate">
                                Organized by{" "}
                                <Link 
                                    href={isOrganizer ? '/dashboard/profile' : `/dashboard/profile/${fellowship.organizerId}`}
                                    onClick={stopPropagation}
                                    className="font-bold text-primary hover:underline"
                                >
                                    {fellowship.organizerName}
                                </Link>
                              </span>
                          </CardDescription>
                          <div className="flex gap-1.5 items-center flex-wrap">
                            <Badge variant="default" className="text-[9px] sm:text-[10px] h-5 px-2 w-fit uppercase tracking-widest font-black leading-none">
                                {fellowship.groupType || 'Fellowship'}
                            </Badge>
                            {fellowship.locationType && (
                                <Badge variant="secondary" className="text-[9px] sm:text-[10px] h-5 px-2 w-fit uppercase tracking-widest font-black leading-none">
                                    {fellowship.locationType}
                                </Badge>
                            )}
                          </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={stopPropagation}>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full shadow-sm bg-background border-primary/20 text-primary/60 hover:text-primary hover:bg-primary/5" onClick={handleShare}>
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p className="text-[10px] font-bold uppercase">Share Group</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-9 w-9 sm:h-10 sm:w-10 border-primary/20 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-full shadow-md bg-background" 
                                        onClick={() => triggerAction(() => router.push(`/dashboard/fellowship/${fellowship.id}`))}
                                    >
                                        <BarChart3 className="h-4 w-4 sm:h-5 w-5" />
                                        <span className="sr-only">View Details</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Kingdom Insights</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        {(isOrganizer || isMember) && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 -mr-2 rounded-full">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                    {isOrganizer ? (
                                        <>
                                            <DropdownMenuItem onSelect={() => triggerAction(onManage)} className="rounded-lg">
                                                <Edit className="mr-2 h-4 w-4" />
                                                Manage
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={() => triggerAction(onDelete)} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete Group
                                            </DropdownMenuItem>
                                        </>
                                    ) : (
                                        <DropdownMenuItem onSelect={handleLeave} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-lg">
                                            {isLeaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                                            Leave Fellowship
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="px-5 sm:px-6 pb-4 space-y-4 pt-4">
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed font-medium break-words [overflow-wrap:anywhere]">{fellowship.description}</p>
                
                {todayDevotional && (
                    <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 relative group/devo overflow-hidden shadow-inner">
                        <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none group-hover/devo:opacity-[0.06] transition-opacity">
                            <BookOpen className="h-12 w-12 text-primary rotate-12" />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-4 w-4 bg-primary/20 rounded-full flex items-center justify-center">
                                <Sparkles className="h-2.5 w-2.5 text-primary" />
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary">DEVOTIONAL FOR TODAY</span>
                        </div>
                        <p className="font-bold text-xs sm:text-sm mb-1 truncate text-foreground break-words [overflow-wrap:anywhere]">{todayDevotional.title}</p>
                        <div className="space-y-1">
                            <p 
                                ref={devotionalTextRef}
                                className="text-[10px] sm:text-xs text-muted-foreground italic line-clamp-2 font-medium leading-relaxed break-words [overflow-wrap:anywhere]"
                            >
                                &ldquo;{todayDevotional.text}&rdquo;
                            </p>
                            {todayDevotional.prayer && (
                                <div className="mt-2 pl-3 border-l-2 border-primary/20">
                                    <p className="text-[9px] font-black uppercase text-primary/60 mb-0.5">Prayer focus</p>
                                    <p className="text-[10px] text-muted-foreground italic line-clamp-1 leading-tight break-words [overflow-wrap:anywhere]">
                                        &ldquo;{todayDevotional.prayer}&rdquo;
                                    </p>
                                </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-4">
                                {totalReactions > 0 || commentCount > 0 ? (
                                    <div className="flex items-center gap-3">
                                        {totalReactions > 0 && (
                                            <div className="flex items-center gap-1 bg-background/50 px-1.5 py-0.5 rounded-full border border-primary/10 shadow-sm">
                                                <div className="flex items-center -space-x-1">
                                                    {supporters.length > 0 && <HandHeart className="h-2.5 w-2.5 text-primary fill-current" />}
                                                    {inspiredBy.length > 0 && <Sparkles className="h-2.5 w-2.5 text-chart-3 fill-current" />}
                                                    {connectedBy.length > 0 && <PartyPopper className="h-2.5 w-2.5 text-blue-500" />}
                                                </div>
                                                <span className="text-[8px] font-black text-muted-foreground">{totalReactions}</span>
                                            </div>
                                        )}
                                        {commentCount > 0 && (
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <MessageSquare className="h-2.5 w-2.5" />
                                                <span className="text-[8px] font-black">{commentCount}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : <div />}
                                
                                {isDevotionalTruncated && (
                                    <FullDevotionalDialog devotional={todayDevotional}>
                                        <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline h-auto p-0">
                                            Read More
                                        </button>
                                    </FullDevotionalDialog>
                                )}
                            </div>
                        </div>
                        <p className="text-[8px] font-black uppercase text-primary/60 text-right mt-2 tracking-widest break-words [overflow-wrap:anywhere]">— {todayDevotional.scripture}</p>
                    </div>
                )}

                <div className="text-[11px] sm:text-xs space-y-2 p-4 bg-muted/30 rounded-2xl border border-dashed">
                    <div className="flex items-start gap-2.5">
                        <span className="font-black text-[9px] sm:text-[10px] text-muted-foreground shrink-0 uppercase tracking-widest pt-0.5">Schedule</span>
                        <span className="text-foreground font-bold leading-tight break-words [overflow-wrap:anywhere]">{fellowship.schedule}</span>
                    </div>
                    {fellowship.location && (
                        <div className="flex items-start gap-2.5 pt-1 border-t border-muted-foreground/10 mt-1">
                            <span className="font-black text-[9px] sm:text-[10px] text-muted-foreground shrink-0 uppercase tracking-widest pt-0.5">Area</span>
                            <span className="text-foreground font-bold line-clamp-1 leading-tight flex items-center gap-1.5 break-words [overflow-wrap:anywhere]"><MapPin className="h-3 text-primary" /> {fellowship.location}</span>
                        </div>
                    )}
                </div>
            </CardContent>
            
            <CardFooter className="px-5 sm:px-6 py-4 flex justify-between items-center border-t bg-black/5">
                <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground font-black uppercase tracking-widest">
                    <Users className="mr-2 h-4 w-4 text-primary" /> {fellowship.memberCount} SOUL WINNERS
                </div>
                <div className="flex items-center gap-2" onClick={stopPropagation}>
                    {(isMember || isOrganizer) && fellowship.streamUrl && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm bg-background">
                                        <Link href={fellowship.streamUrl} target="_blank" rel="noopener noreferrer">
                                            <PlayCircle className="h-4 w-4 text-primary" />
                                            <span className="sr-only">Join Stream</span>
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p className="text-[10px] font-bold uppercase">Enter Online Meeting</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    {!isOrganizer && (
                        <Button onClick={handleJoin} disabled={isMember || isJoining} size="sm" className="h-9 px-6 text-xs font-black uppercase tracking-widest rounded-xl shadow-lg">
                            {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {isMember ? 'JOINED' : 'JOIN GROUP'}
                        </Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}

export const FellowshipCard = React.memo(FellowshipCardComponent);
