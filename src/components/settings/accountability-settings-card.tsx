'use client';

import { useUser } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartHandshake } from 'lucide-react';
import { UserSearch } from '@/components/accountability/user-search';
import { AccountabilityRequests } from './accountability-requests';

export function AccountabilitySettingsCard({ userProfile, userId }: { userProfile: UserProfile; userId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><HeartHandshake className="h-5 w-5" /> Find a Partner & Manage Requests</CardTitle>
        <CardDescription>
          Find a new accountability partner and manage your pending requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
            <AccountabilityRequests currentUserProfile={userProfile} />
            <UserSearch currentUserProfile={userProfile} />
        </div>
      </CardContent>
    </Card>
  );
}
