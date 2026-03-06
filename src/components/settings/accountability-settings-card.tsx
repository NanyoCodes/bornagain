
'use client';

import { useUser, useFirestore } from '@/firebase';
import type { UserProfile, AccountabilityRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartHandshake } from 'lucide-react';
import { UserSearch } from '@/components/accountability/user-search';
import { AccountabilityRequests } from './accountability-requests';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemo } from 'react';
import { query, collection, where } from 'firebase/firestore';
import Link from 'next/link';

export function AccountabilitySettingsCard({ userProfile, userId }: { userProfile: UserProfile; userId: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><HeartHandshake className="h-5 w-5" /> Accountability Partner</CardTitle>
        <CardDescription>
          {hasPartner 
            ? `You are partners with ${partnerFullName}.`
            : "Manage requests or find a new accountability partner to help you stay on track."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasPartner ? (
           <div>
            <p className="text-sm text-muted-foreground">You can manage your partnership on the <Link href="/dashboard/accountability" className="underline text-primary">Partner page</Link>.</p>
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
