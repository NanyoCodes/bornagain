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
import { Loader2, Users, MoreVertical, PlayCircle, Edit, Trash2 } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
        } catch (e) {
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
        <Card onClick={onClick} className="cursor-pointer">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-xl flex items-center">{fellowship.name}</CardTitle>
                    <div className="flex items-center gap-2" onClick={stopPropagation}>
                        {fellowship.locationType && <Badge variant="secondary">{fellowship.locationType}</Badge>}
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
                <CardDescription className="flex items-center gap-2 pt-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={fellowship.organizerPhotoURL} />
                        <AvatarFallback>{fellowship.organizerName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    Organized by {fellowship.organizerName}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{fellowship.description}</p>
                <div className="text-sm">
                    <p><strong>Schedule:</strong> {fellowship.schedule}</p>
                    {(fellowship.locationType === 'Physical' || fellowship.locationType === 'Physical and Virtual') && fellowship.location && (
                        <p><strong>Location:</strong> {fellowship.location}</p>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" /> {fellowship.memberCount} member(s)
                </div>
                 {distance !== null && <p className="text-xs text-muted-foreground">{distance.toFixed(1)} km away</p>}
                <div className="flex items-center gap-2" onClick={stopPropagation}>
                    {(isMember || isOrganizer) && fellowship.streamUrl && (
                        <Button asChild variant="outline" size="sm">
                            <Link href={fellowship.streamUrl} target="_blank" rel="noopener noreferrer">
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Stream
                            </Link>
                        </Button>
                    )}
                    {!isOrganizer && (
                        <Button onClick={handleJoin} disabled={isMember || isJoining} size="sm">
                            {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {isMember ? 'Joined' : 'Join'}
                        </Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}

export const FellowshipCard = React.memo(FellowshipCardComponent);
