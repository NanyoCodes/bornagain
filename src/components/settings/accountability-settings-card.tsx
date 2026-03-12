
'use client';

import { useUser, useFirestore } from '@/firebase';
import type { UserProfile, AccountabilityRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartHandshake, Loader2, UserX } from 'lucide-react';
import { UserSearch } from '@/components/accountability/user-search';
import { AccountabilityRequests } from './accountability-requests';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useState, useMemo } from 'react';
import { query, collection, where, doc, writeBatch, deleteField, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import { Button } from '../ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export function AccountabilitySettingsCard({ userProfile, userId }: { userProfile: UserProfile; userId: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [removalReason, setRemovalReason] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);
  
  const pendingRequestsQuery = useMemo(() => {
    if (!user) return null;
    return query(
        collection(firestore, 'accountabilityRequests'),
        where('participantIds', 'array-contains', user.uid),
        where('status', '==', 'pending')
    );
  }, [user, firestore]);

  const { data: pendingRequests } = useCollection<AccountabilityRequest>(pendingRequestsQuery);

  const hasPartner = !!userProfile.accountabilityPartnerId;
  const hasPendingRequests = pendingRequests && pendingRequests.length > 0;
  
  const partnerFullName = [userProfile.accountabilityPartnerFirstName, userProfile.accountabilityPartnerLastName].filter(Boolean).join(' ');

  const handleRemovePartner = async () => {
    if (!user || !firestore || !userProfile.accountabilityPartnerId) {
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
    setIsRemoving(true);
    
    const batch = writeBatch(firestore);
    const partnerId = userProfile.accountabilityPartnerId;

    const currentUserRef = doc(firestore, 'users', user.uid);
    batch.update(currentUserRef, {
        accountabilityPartnerId: deleteField(),
        accountabilityPartnerFirstName: deleteField(),
        accountabilityPartnerLastName: deleteField(),
    });

    const partnerUserRef = doc(firestore, 'users', partnerId);
    batch.update(partnerUserRef, {
        accountabilityPartnerId: deleteField(),
        accountabilityPartnerFirstName: deleteField(),
        accountabilityPartnerLastName: deleteField(),
    });
    
    const notificationsCollectionRef = collection(firestore, 'users', partnerId, 'notifications');
    const notificationData = {
        userId: partnerId,
        type: 'accountability_partner_removed',
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
        })
        .catch(() => {
            const permissionError = new FirestorePermissionError({
                path: `BATCH_WRITE:REMOVE_PARTNER:${user.uid}`,
                operation: 'write',
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsRemoving(false);
            setRemovalReason('');
        });
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><HeartHandshake className="h-5 w-5" /> Accountability Partner</CardTitle>
        <CardDescription>
          {hasPartner 
            ? `Manage your partnership with ${partnerFullName}.`
            : "Manage requests or find a new accountability partner to help you stay on track."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasPartner ? (
           <div className="space-y-4">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto">
                        <UserX className="mr-2 h-4 w-4" />
                        Remove Partner
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove {partnerFullName}?</AlertDialogTitle>
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
                        <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemovePartner} disabled={isRemoving || !removalReason.trim()}>
                            {isRemoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Confirm Removal
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
            <div className="space-y-4">
                <AccountabilityRequests currentUserProfile={userProfile} />
                {!hasPendingRequests && <UserSearch currentUserProfile={userProfile} />}
            </div>
        )}
      </CardContent>
    </Card>
  );
}
