
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, doc, writeBatch, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { AccountabilityRequest, UserProfile } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Loader2, Check, X, Hourglass, Trash2, UserPlus, CheckCircle2, XCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, isToday } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function AccountabilityRequests({ currentUserProfile }: { currentUserProfile: UserProfile }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    // Query for ALL requests involving the current user. This is more secure and efficient.
    const requestsQuery = useMemo(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'accountabilityRequests'),
            where('participantIds', 'array-contains', user.uid)
        );
    }, [user, firestore]);
    const { data: allRequests, loading } = useCollection<AccountabilityRequest>(requestsQuery);

    // Filter requests on the client-side from the single data source
    const incomingRequests = useMemo(() =>
        allRequests?.filter(r => r.status === 'pending' && r.toUserId === user?.uid)
    , [allRequests, user]);

    const sentRequests = useMemo(() =>
        allRequests?.filter(r => r.status === 'pending' && r.fromUserId === user?.uid)
    , [allRequests, user]);

    const acceptedRequest = useMemo(() =>
        allRequests?.find(r => r.status === 'accepted')
    , [allRequests]);

    const declinedRequests = useMemo(() =>
        allRequests?.filter(r => r.status === 'declined')
    , [allRequests]);

    const handleAccept = async (request: AccountabilityRequest) => {
        if (!user || !firestore || currentUserProfile.accountabilityPartnerId) {
            toast({ variant: 'destructive', title: 'Cannot Accept', description: 'You already have a partner. Please remove your current partner first.' });
            return;
        }
        setIsProcessing(request.id);
        const batch = writeBatch(firestore);

        // Update my user doc (the acceptor)
        const myRef = doc(firestore, 'users', user.uid);
        batch.update(myRef, {
            accountabilityPartnerId: request.fromUserId,
            accountabilityPartnerFirstName: request.fromUserFirstName,
            accountabilityPartnerLastName: request.fromUserLastName,
        });

        // Update sender's user doc
        const senderRef = doc(firestore, 'users', request.fromUserId);
        batch.update(senderRef, {
            accountabilityPartnerId: user.uid,
            accountabilityPartnerFirstName: currentUserProfile.firstName,
            accountabilityPartnerLastName: currentUserProfile.lastName,
        });

        // Update the request status
        const requestRef = doc(firestore, 'accountabilityRequests', request.id);
        batch.update(requestRef, {
            status: 'accepted',
            respondedAt: serverTimestamp(),
        });
        
        // Add notification for the sender
        const notificationRef = doc(collection(firestore, 'users', request.fromUserId, 'notifications'));
        batch.set(notificationRef, {
                userId: request.fromUserId,
            type: 'request_accepted',
            title: 'Request Accepted!',
            message: `${currentUserProfile.firstName} ${currentUserProfile.lastName} has accepted your accountability request.`,
            link: '/dashboard/accountability',
            isRead: false,
            createdAt: serverTimestamp(),
        });

        batch.commit()
            .then(() => {
                toast({ title: 'Partner Added!', description: `You are now accountability partners with ${request.fromUserFirstName} ${request.fromUserLastName}.` });
            })
            .catch(() => {
                 const permissionError = new FirestorePermissionError({
                    path: `BATCH_WRITE:ACCEPT_REQUEST:${request.id}`,
                    operation: 'write',
                }, user);
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsProcessing(null);
            });
    };

    const handleDecline = async (request: AccountabilityRequest) => {
        setIsProcessing(request.id);
        const batch = writeBatch(firestore);
        const requestRef = doc(firestore, 'accountabilityRequests', request.id);
        batch.update(requestRef, {
            status: 'declined',
            respondedAt: serverTimestamp(),
        });
        
        const notificationRef = doc(collection(firestore, 'users', request.fromUserId, 'notifications'));
        batch.set(notificationRef, {
            userId: request.fromUserId,
            type: 'request_declined',
            title: 'Request Declined',
            message: `${currentUserProfile.firstName} ${currentUserProfile.lastName} has declined your accountability request.`,
            link: '/dashboard/accountability',
            isRead: false,
            createdAt: serverTimestamp(),
        });
        
        batch.commit()
            .then(() => {
                toast({ title: 'Request Declined' });
            })
            .catch(() => {
                const permissionError = new FirestorePermissionError({
                    path: `BATCH_WRITE:DECLINE_REQUEST:${request.id}`,
                    operation: 'write',
                }, user);
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsProcessing(null);
            });
    };

    const handleCancel = async (request: AccountabilityRequest) => {
        setIsProcessing(request.id);
        const requestRef = doc(firestore, 'accountabilityRequests', request.id);
        
        deleteDoc(requestRef)
            .then(() => {
                toast({ title: 'Request Canceled' });
            })
            .catch(() => {
                const permissionError = new FirestorePermissionError({
                    path: requestRef.path,
                    operation: 'delete',
                }, user);
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsProcessing(null);
            });
    };

    const dismissRequest = (requestId: string) => {
        if (!firestore || !user) return;
        const reqRef = doc(firestore, 'accountabilityRequests', requestId);
        deleteDoc(reqRef)
            .catch(() => {
                const permissionError = new FirestorePermissionError({ path: reqRef.path, operation: 'delete' }, user);
                errorEmitter.emit('permission-error', permissionError);
            });
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!allRequests || allRequests.length === 0) {
        return null; // No requests, render nothing.
    }
    
    return (
        <div className="space-y-6">
            {incomingRequests && incomingRequests.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground"><UserPlus className="h-4 w-4" /> INCOMING REQUESTS</h3>
                    {incomingRequests.map(req => {
                        const createdAt = req.createdAt.toDate();
                        return (
                        <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={req.fromUserPhotoURL ?? undefined} alt={`${req.fromUserFirstName} ${req.fromUserLastName}`} />
                                    <AvatarFallback>{req.fromUserFirstName?.charAt(0)}{req.fromUserLastName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-sm">{req.fromUserFirstName} {req.fromUserLastName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Sent {isToday(createdAt) ? format(createdAt, 'p') : format(createdAt, 'PPP')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => handleDecline(req)}
                                    disabled={isProcessing === req.id}
                                    className="h-8 w-8 text-destructive"
                                >
                                    {isProcessing === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                    <span className="sr-only">Decline</span>
                                </Button>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => handleAccept(req)}
                                    disabled={isProcessing === req.id}
                                    className="h-8 w-8 text-primary"
                                >
                                    {isProcessing === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    <span className="sr-only">Accept</span>
                                </Button>
                            </div>
                        </div>
                    )})}
                </div>
            )}
             {sentRequests && sentRequests.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground"><Hourglass className="h-4 w-4" /> SENT REQUESTS</h3>
                    {sentRequests.map(req => {
                        const createdAt = req.createdAt.toDate();
                        return (
                         <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={req.toUserPhotoURL ?? undefined} alt={`${req.toUserFirstName} ${req.toUserLastName}`} />
                                    <AvatarFallback>{req.toUserFirstName?.charAt(0)}{req.toUserLastName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-sm">{req.toUserFirstName} {req.toUserLastName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Sent {isToday(createdAt) ? format(createdAt, 'p') : format(createdAt, 'PPP')}
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCancel(req)}
                                disabled={isProcessing === req.id}
                                className="text-destructive"
                            >
                                {isProcessing === req.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Cancel
                            </Button>
                        </div>
                    )})}
                </div>
            )}
            {declinedRequests && declinedRequests.map(req => (
                <div key={req.id} className="flex items-start justify-between gap-2 p-3 rounded-lg border border-dashed">
                    <div className="flex items-start gap-3">
                        <XCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                             <p className="text-sm text-muted-foreground">
                                {req.fromUserId === user?.uid 
                                    ? `Your request to ${req.toUserFirstName} ${req.toUserLastName} was declined.`
                                    : `You declined the request from ${req.fromUserFirstName} ${req.fromUserLastName}.`
                                }
                            </p>
                        </div>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => dismissRequest(req.id)}
                        className="h-8 w-8 shrink-0"
                    >
                        <X className="h-4 w-4 text-muted-foreground" />
                        <span className="sr-only">Dismiss</span>
                    </Button>
                </div>
            ))}
            {acceptedRequest && (
                 <div className="flex items-start justify-between gap-2 p-3 rounded-lg border border-dashed bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <div>
                             <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                                You are now accountability partners with {acceptedRequest.fromUserId === user?.uid ? `${acceptedRequest.toUserFirstName} ${acceptedRequest.toUserLastName}` : `${acceptedRequest.fromUserFirstName} ${acceptedRequest.fromUserLastName}`}.
                            </p>
                        </div>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => dismissRequest(acceptedRequest.id)}
                        className="h-8 w-8 shrink-0"
                    >
                        <X className="h-4 w-4 text-muted-foreground" />
                        <span className="sr-only">Dismiss</span>
                    </Button>
                </div>
            )}
        </div>
    )
}
