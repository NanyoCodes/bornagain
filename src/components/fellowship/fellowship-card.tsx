'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useDoc } from '@/firebase';
import type { Fellowship, UserProfile, DailyDevotional } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { doc, runTransaction, arrayUnion, arrayRemove, increment, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { haversineDistance, cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Users, MoreVertical, PlayCircle, Edit, Trash2, Group, MapPin, BarChart3, BookOpen, LogOut, Quote } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

type FellowshipCardProps = {
  fellowship: Fellowship;
  userProfile: UserProfile | null;
  onManage: () => void;
  onDelete: () => void;
  onClick?: () => void;
};

const FellowshipCardComponent = ({ fellowship, userProfile, onManage, onDelete, onClick }: FellowshipCardProps) => {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const [isJoining, setIsJoining] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    
    const isMember = useMemo(() => {
        if (!user || !fellowship.memberIds) return false;
        return fellowship.memberIds.includes(user.uid);
    }, [user, fellowship.memberIds]);

    const isOrganizer = useMemo(() => {
        if (!user) return false;
        return fellowship.organizerId === user.uid;
    }, [user, fellowship.organizerId]);

    // Fetch Today's Word for members/organizers
    const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
    const devotionalRef = useMemo(() => {
        if (!firestore || !fellowship.id || !(isMember || isOrganizer)) return null;
        return doc(firestore, 'fellowships', fellowship.id, 'devotionals', todayStr);
    }, [firestore, fellowship.id, isMember, isOrganizer, todayStr]);
    
    const { data: todayDevotional } = useDoc<DailyDevotional>(devotionalRef);

    const distance = useMemo(() => {
        if (!userProfile?.location?.latitude || !userProfile?.location?.longitude || !fellowship.latitude || !fellowship.longitude) {
            return null;
        }
        return haversineDistance(
            { lat: userProfile.location.latitude, lng: userProfile.location.longitude },
            { lat: fellowship.latitude, lng: fellowship.longitude }
        );
    }, [userProfile?.location?.latitude, userProfile?.location?.longitude, fellowship.latitude, fellowship.longitude]);

    const triggerAction = (action: () => void) => {
        requestAnimationFrame(() => {
            action();
        });
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
        <Card onClick={onClick} className="cursor-pointer rounded-none sm:rounded-lg border-x-0 sm:border-x transition-all duration-300 hover:shadow-lg border-t-2 border-t-primary/10 border-b-2 sm:border-b bg-card/50 backdrop-blur-sm">
            <CardHeader className="p-5 sm:p-6">
                <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg sm:text-xl font-black leading-tight mb-2 uppercase tracking-tight">
                          {fellowship.name}
                        </CardTitle>
                        <div className="space-y-2">
                          <CardDescription className="flex items-center gap-2 text-[11px] sm:text-xs font-medium">
                              <Avatar className="h-5 w-5 border shadow-sm">
                                  <AvatarImage src={fellowship.organizerPhotoURL} />
                                  <AvatarFallback className="text-[8px] font-black bg-primary/10 text-primary">{fellowship.organizerName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="leading-tight">
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
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-9 w-9 sm:h-10 sm:w-10 border-primary/20 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-full shadow-md bg-background" 
                                        onClick={() => triggerAction(() => router.push(`/dashboard/fellowship/${fellowship.id}`))}
                                    >
                                        <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
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
            <CardContent className="px-5 sm:px-6 pb-4 space-y-4">
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed font-medium">{fellowship.description}</p>
                
                {(isMember || isOrganizer) && todayDevotional && (
                    <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 relative group/devo overflow-hidden shadow-inner">
                        <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none group-hover/devo:opacity-[0.06] transition-opacity">
                            <BookOpen className="h-12 w-12 text-primary rotate-12" />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-4 w-4 bg-primary/20 rounded-full flex items-center justify-center">
                                <Sparkles className="h-2.5 w-2.5 text-primary" />
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary">Daily Word</span>
                        </div>
                        <p className="font-bold text-xs sm:text-sm mb-1 truncate text-foreground">{todayDevotional.title}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground italic line-clamp-2 font-medium">
                            &ldquo;{todayDevotional.text}&rdquo;
                        </p>
                        <p className="text-[8px] font-black uppercase text-primary/60 text-right mt-2 tracking-widest">— {todayDevotional.scripture}</p>
                    </div>
                )}

                <div className="text-[11px] sm:text-xs space-y-2 p-4 bg-muted/30 rounded-2xl border border-dashed">
                    <div className="flex items-start gap-2.5">
                        <span className="font-black text-[9px] sm:text-[10px] text-muted-foreground shrink-0 uppercase tracking-widest pt-0.5">Schedule</span>
                        <span className="text-foreground font-bold leading-tight">{fellowship.schedule}</span>
                    </div>
                    {fellowship.location && (
                        <div className="flex items-start gap-2.5 pt-1 border-t border-muted-foreground/10 mt-1">
                            <span className="font-black text-[9px] sm:text-[10px] text-muted-foreground shrink-0 uppercase tracking-widest pt-0.5">Area</span>
                            <span className="text-foreground font-bold line-clamp-1 leading-tight flex items-center gap-1.5"><MapPin className="h-3 w-3 text-primary" /> {fellowship.location}</span>
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
