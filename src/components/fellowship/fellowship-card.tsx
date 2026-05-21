'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useUser, useFirestore } from '@/firebase';
import type { Fellowship, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { doc, runTransaction, arrayUnion, increment, serverTimestamp } from 'firebase/firestore';
import { haversineDistance } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Users, MoreVertical, PlayCircle, Edit, Trash2, Group } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    const [isJoining, setIsJoining] = useState(false);
    
    const isMember = useMemo(() => user ? fellowship.memberIds.includes(user.uid) : false, [user, fellowship.memberIds]);
    const isOrganizer = useMemo(() => user ? fellowship.organizerId === user.uid : false, [user, fellowship.organizerId]);

    const distance = useMemo(() => {
        if (!userProfile?.location?.latitude || !userProfile?.location?.longitude || !fellowship.latitude || !fellowship.longitude) {
            return null;
        }
        return haversineDistance(
            { lat: userProfile.location.latitude, lng: userProfile.location.longitude },
            { lat: fellowship.latitude, lng: fellowship.longitude }
        );
    }, [userProfile?.location?.latitude, userProfile?.location?.longitude, fellowship.latitude, fellowship.longitude]);

    const handleJoin = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user || !userProfile || !firestore || isMember || isOrganizer) return;
        setIsJoining(true);

        const fellowshipRef = doc(firestore, "fellowships", fellowship.id);
        const userFellowshipRef = doc(firestore, 'users', user.uid, 'fellowships', fellowship.id);
        const fellowshipMemberRef = doc(firestore, 'fellowships', fellowship.id, 'members', user.uid);
        const chatRef = doc(firestore, 'chats', fellowship.id);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const fellowshipDoc = await transaction.get(fellowshipRef);
                if (!fellowshipDoc.exists()) throw new Error("Fellowship no longer exists.");

                const chatDoc = await transaction.get(chatRef);

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

                if (chatDoc.exists()) {
                    transaction.update(chatRef, {
                        participantIds: arrayUnion(user.uid),
                        [`participantInfo.${user.uid}`]: {
                            firstName: userProfile.firstName,
                            lastName: userProfile.lastName,
                            photoURL: userProfile.photoURL || '',
                        }
                    });
                }
            });
            toast({ title: "Successfully Joined!", description: `You are now a member of ${fellowship.name}.`});
        } catch (e: any) {
            const permissionError = new FirestorePermissionError({ path: `fellowships/${fellowship.id}`, operation: 'update' }, user);
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsJoining(false);
        }
    };
    
    const stopPropagation = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <Card onClick={onClick} className="cursor-pointer rounded-none sm:rounded-lg border-x-0 sm:border-x transition-shadow duration-300 hover:shadow-lg border-t-2 border-t-primary/10 border-b-2 sm:border-b">
            <CardHeader className="p-5 sm:p-6">
                <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg sm:text-xl font-bold font-headline leading-tight mb-2">
                          {fellowship.name}
                        </CardTitle>
                        <div className="space-y-2">
                          <CardDescription className="flex items-center gap-2 text-[11px] sm:text-xs">
                              <Avatar className="h-5 w-5 border">
                                  <AvatarImage src={fellowship.organizerPhotoURL} />
                                  <AvatarFallback className="text-[8px]">{fellowship.organizerName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="leading-tight">
                                Organized by <span className="font-semibold text-primary">{fellowship.organizerName}</span>
                              </span>
                          </CardDescription>
                          <div className="flex gap-1.5 items-center flex-wrap">
                            {fellowship.groupType && (
                                <Badge variant="default" className="text-[9px] sm:text-[10px] h-5 px-1.5 w-fit uppercase tracking-wider font-bold">
                                    {fellowship.groupType}
                                </Badge>
                            )}
                            {fellowship.locationType && (
                                <Badge variant="secondary" className="text-[9px] sm:text-[10px] h-5 px-1.5 w-fit uppercase tracking-wider font-bold">
                                    {fellowship.locationType}
                                </Badge>
                            )}
                          </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={stopPropagation}>
                        {isOrganizer && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={onManage}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Manage
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-5 sm:px-6 pb-4 space-y-4">
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">{fellowship.description}</p>
                <div className="text-[11px] sm:text-xs space-y-1.5 p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-start gap-2">
                        <span className="font-bold text-muted-foreground shrink-0 uppercase tracking-tighter">Schedule:</span>
                        <span className="text-foreground leading-snug">{fellowship.schedule}</span>
                    </div>
                    {fellowship.location && (
                        <div className="flex items-start gap-2">
                            <span className="font-bold text-muted-foreground shrink-0 uppercase tracking-tighter">Area:</span>
                            <span className="text-foreground line-clamp-1">{fellowship.location}</span>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="px-5 sm:px-6 py-4 flex justify-between items-center border-t bg-muted/10">
                <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground font-medium">
                    <Users className="mr-1.5 h-3.5 w-3.5 text-primary" /> {fellowship.memberCount} member{fellowship.memberCount === 1 ? '' : 's'}
                </div>
                <div className="flex items-center gap-2" onClick={stopPropagation}>
                    {(isMember || isOrganizer) && fellowship.streamUrl && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="outline" size="icon" className="h-8 w-8">
                                        <Link href={fellowship.streamUrl} target="_blank" rel="noopener noreferrer">
                                            <PlayCircle className="h-4 w-4" />
                                            <span className="sr-only">Stream</span>
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Join Stream</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    {!isOrganizer && (
                        <Button onClick={handleJoin} disabled={isMember || isJoining} size="sm" className="h-8 px-4 text-xs font-bold">
                            {isJoining ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin"/> : null}
                            {isMember ? 'Joined' : 'Join'}
                        </Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}

export const FellowshipCard = React.memo(FellowshipCardComponent);