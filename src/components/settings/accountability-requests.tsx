
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, doc, writeBatch, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { AccountabilityRequest, UserProfile } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Loader2, Check, X, Hourglass, Trash2, UserPlus, CheckCircle2, XCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function AccountabilityRequests({ currentUserProfile }: { currentUserProfile: UserProfile }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    // Query for INCOMING requests
    const incomingRequestsQuery = useMemo(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'accountabilityRequests'),
            where('toUserId', '==', user.uid),
            where('status', '==', 'pending')
        );
    }, [user, firestore]);
    const { data: incomingRequests, loading: loadingIncoming } = useCollection<AccountabilityRequest>(incomingRequestsQuery);

    // Query for SENT requests
    const sentRequestsQuery = useMemo(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'accountabilityRequests'),
            where('fromUserId', '==', user.uid),
            where('status', '==', 'pending')
        );
    }, [user, firestore]);
    const { data: sentRequests, loading: loadingSent } = useCollection<AccountabilityRequest>(sentRequestsQuery);
    
    // Query for non-pending (completed) requests that need to be displayed for dismissal
    const nonPendingRequestsQuery = useMemo(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'accountabilityRequests'),
            where('participantIds', 'array-contains', user.uid),
            where('status', 'in', ['accepted', 'declined'])
        );
    }, [user, firestore]);
    const { data: nonPendingRequests, loading: loadingNonPending } = useCollection<AccountabilityRequest>(nonPendingRequestsQuery);
    
    const acceptedRequest = useMemo(() => nonPendingRequests?.find(r => r.status === 'accepted'), [nonPendingRequests]);
    const declinedRequests = useMemo(() => nonPendingRequests?.filter(r => r.status === 'declined'), [nonPendingRequests]);

    const loading = loadingIncoming || loadingSent || loadingNonPending;

    // Effect to complete the partnership loop for the sender
    useEffect(() => {
        if (acceptedRequest && acceptedRequest.fromUserId === user?.uid) {
            const myPartnerId = currentUserProfile.accountabilityPartnerId;
            if (!myPartnerId) {
                const userRef = doc(firestore, 'users', user.uid);
                updateDoc(userRef, {
                    accountabilityPartnerId: acceptedRequest.toUserId,
                    accountabilityPartnerName: acceptedRequest.toUserName,
                }).catch(() => {
                     const permissionError = new FirestorePermissionError({
                        path: userRef.path,
                        operation: 'update',
                        requestResourceData: { accountabilityPartnerId: acceptedRequest.toUserId },
                    });
                    errorEmitter.emit('permission-error', permissionError);
                });
            }
        }
    }, [acceptedRequest, user, firestore, currentUserProfile]);

    const handleAccept = async (request: AccountabilityRequest) => {
        if (!user || !firestore || currentUserProfile.accountabilityPartnerId) {
            toast({ variant: 'destructive', title: 'Cannot Accept', description: 'You already have a partner. Please remove your current partner first.' });
            return;
        }
        setIsProcessing(request.id);
        try {
            const batch = writeBatch(firestore);

            // Update my user doc
            const myRef = doc(firestore, 'users', user.uid);
            batch.update(myRef, {
                accountabilityPartnerId: request.fromUserId,
                accountabilityPartnerName: request.fromUserName,
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
                message: `${currentUserProfile.displayName} has accepted your accountability request.`,
                link: '/dashboard/accountability',
                isRead: false,
                createdAt: serverTimestamp(),
            });

            await batch.commit();
            toast({ title: 'Partner Added!', description: `You are now accountability partners with ${request.fromUserName}.` });

        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not accept request.' });
            setIsProcessing(null);
        }
    };

    const handleDecline = async (request: AccountabilityRequest) => {
        setIsProcessing(request.id);
        try {
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
                message: `${currentUserProfile.displayName} has declined your accountability request.`,
                link: '/dashboard/accountability',
                isRead: false,
                createdAt: serverTimestamp(),
            });
            
            await batch.commit();

            toast({ title: 'Request Declined' });

        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not decline request.' });
            setIsProcessing(null);
        }
    };

    const handleCancel = async (request: AccountabilityRequest) => {
        setIsProcessing(request.id);
        try {
            const requestRef = doc(firestore, 'accountabilityRequests', request.id);
            await deleteDoc(requestRef);
            toast({ title: 'Request Canceled' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel request.' });
            setIsProcessing(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!incomingRequests?.length && !sentRequests?.length && !nonPendingRequests?.length) {
        return null; // No requests, render nothing.
    }
    
    return (
        <div className="space-y-6">
            {incomingRequests && incomingRequests.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground"><UserPlus className="h-4 w-4" /> INCOMING REQUESTS</h3>
                    {incomingRequests.map(req => (
                        <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={req.fromUserPhotoURL ?? undefined} alt={req.fromUserName} />
                                    <AvatarFallback>{req.fromUserName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-sm">{req.fromUserName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Sent {req.createdAt ? formatDistanceToNow(req.createdAt.toDate(), { addSuffix: true }) : 'a moment ago'}
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
                    ))}
                </div>
            )}
             {sentRequests && sentRequests.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground"><Hourglass className="h-4 w-4" /> SENT REQUESTS</h3>
                    {sentRequests.map(req => (
                         <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={req.toUserPhotoURL ?? undefined} alt={req.toUserName} />
                                    <AvatarFallback>{req.toUserName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-sm">{req.toUserName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Sent {req.createdAt ? formatDistanceToNow(req.createdAt.toDate(), { addSuffix: true }) : 'a moment ago'}
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
                    ))}
                </div>
            )}
            {declinedRequests && declinedRequests.map(req => (
                <div key={req.id} className="flex items-start justify-between gap-2 p-3 rounded-lg border border-dashed">
                    <div className="flex items-start gap-3">
                        <XCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                             <p className="text-sm text-muted-foreground">
                                {req.fromUserId === user?.uid 
                                    ? `Your request to ${req.toUserName} was declined.`
                                    : `You declined the request from ${req.fromUserName}.`
                                }
                            </p>
                        </div>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteDoc(doc(firestore, 'accountabilityRequests', req.id))}
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
                                You are now accountability partners with {acceptedRequest.fromUserId === user?.uid ? acceptedRequest.toUserName : acceptedRequest.fromUserName}.
                            </p>
                        </div>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteDoc(doc(firestore, 'accountabilityRequests', acceptedRequest.id))}
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
