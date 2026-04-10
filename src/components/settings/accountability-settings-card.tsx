
'use client';

import { useUser, useFirestore } from '@/firebase';
import type { UserProfile, AccountabilityRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartHandshake, Loader2, UserX } from 'lucide-react';
import { UserSearch } from '@/components/accountability/user-search';
import { AccountabilityRequests } from './accountability-requests';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { query, collection, where, doc, writeBatch, deleteField, serverTimestamp, arrayRemove } from 'firebase/firestore';
import Link from 'next/link';
import { Button } from '../ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';


export function AccountabilitySettingsCard({ userProfile, userId }: { userProfile: UserProfile; userId: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [removalReason, setRemovalReason] = useState('');
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  
  const pendingRequestsQuery = useMemo(() => {
    if (!user) return null;
    return query(
        collection(firestore, 'accountabilityRequests'),
        where('participantIds', 'array-contains', user.uid),
        where('status', '==', 'pending')
    );
  }, [user, firestore]);

  const { data: pendingRequests } = useCollection<AccountabilityRequest>(pendingRequestsQuery);
  const partners = userProfile.accountabilityPartners || [];
  const hasPartner = partners.length > 0;
  const hasPendingRequests = pendingRequests && pendingRequests.length > 0;

  const handleRemovePartner = async (partnerToRemove: { userId: string; firstName: string; lastName: string; photoURL?: string; }) => {
    if (!user || !firestore || !userProfile.accountabilityPartners) {
        return;
    }
    if (!removalReason.trim()) {
        toast({
            variant: 'destructive',
            title: 'Reason Required',
            description: 'Please provide a reason for removing your partner.',
        });
        return;
    }
    setIsRemoving(partnerToRemove.userId);
    
    const batch = writeBatch(firestore);
    const partnerId = partnerToRemove.userId;

    // Delete the accepted request document
    const participantIds = [user.uid, partnerId].sort();
    const requestId = participantIds.join('_');
    const requestRef = doc(firestore, 'accountabilityRequests', requestId);
    batch.delete(requestRef);
    
    const myPartnerObject = userProfile.accountabilityPartners.find(p => p.userId === partnerId);
    
    if (myPartnerObject) {
      const currentUserRef = doc(firestore, 'users', user.uid);
      batch.update(currentUserRef, {
          accountabilityPartners: arrayRemove(myPartnerObject),
      });
    }

    const partnerUserRef = doc(firestore, 'users', partnerId);
    const myEntryInPartnersList = {
        userId: user.uid,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        photoURL: userProfile.photoURL || '',
    };
    batch.update(partnerUserRef, {
        accountabilityPartners: arrayRemove(myEntryInPartnersList),
    });
    
    const notificationsCollectionRef = collection(firestore, 'users', partnerId, 'notifications');
    const notificationData = {
        userId: partnerId,
        type: 'accountability_partner_removed' as const,
        title: 'Accountability Partnership Ended',
        message: `${userProfile.firstName} ${userProfile.lastName} has ended your accountability partnership. Reason: ${removalReason}`,
        link: '/dashboard/accountability',
        isRead: false,
        createdAt: serverTimestamp(),
    }
    batch.set(doc(notificationsCollectionRef), notificationData);

    batch.commit()
        .then(() => {
            toast({ title: 'Partner Removed', description: 'Your accountability partnership has been ended.' });
            router.refresh();
        })
        .catch(() => {
            const permissionError = new FirestorePermissionError({
                path: `BATCH_WRITE:REMOVE_PARTNER:${user.uid}`,
                operation: 'write',
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsRemoving(null);
            setRemovalReason('');
        });
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><HeartHandshake className="h-5 w-5" /> Accountability Partner</CardTitle>
        <CardDescription>
          {hasPartner 
            ? `Manage your partnerships.`
            : "Manage requests or find a new accountability partner to help you stay on track."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasPartner ? (
           <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">YOUR PARTNERS</h3>
                {partners.map(partner => (
                    <div key={partner.userId} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={partner.photoURL} />
                                <AvatarFallback>{partner.firstName?.charAt(0)}{partner.lastName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-sm">{partner.firstName} {partner.lastName}</p>
                            </div>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={!!isRemoving}>
                                    {isRemoving === partner.userId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
                                    Remove
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Remove {partner.firstName}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to end this accountability partnership? This action cannot be undone. Please provide a reason below.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="removal-reason">Reason for Removal</Label>
                                        <Textarea
                                            id="removal-reason"
                                            value={removalReason}
                                            onChange={(e) => setRemovalReason(e.target.value)}
                                            placeholder="e.g., We've decided to find different partners."
                                        />
                                    </div>
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isRemoving === partner.userId}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRemovePartner(partner)} disabled={isRemoving === partner.userId || !removalReason.trim()} className="bg-destructive hover:bg-destructive/90">
                                        {isRemoving === partner.userId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Confirm Removal
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                ))}
          </div>
        ) : null}

        <div className="space-y-4">
            <AccountabilityRequests currentUserProfile={userProfile} />
            {!hasPendingRequests && <UserSearch currentUserProfile={userProfile} />}
        </div>
      </CardContent>
    </Card>
  );
}
