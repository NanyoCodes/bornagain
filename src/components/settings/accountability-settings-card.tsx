'use client';

import { useUser } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartHandshake } from 'lucide-react';
import { UserSearch } from '@/components/accountability/user-search';
import { AccountabilityRequests } from './accountability-requests';

export function AccountabilitySettingsCard({ userProfile, userId }: { userProfile: UserProfile; userId: string }) {
  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-sm">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg font-bold font-headline"><HeartHandshake className="h-5 w-5 text-primary" /> Management</CardTitle>
        <CardDescription>
          Find a new accountability partner and manage your pending requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-6 space-y-8">
        <div className="space-y-6">
            <AccountabilityRequests currentUserProfile={userProfile} />
            <UserSearch currentUserProfile={userProfile} />
        </div>
      </CardContent>
    </Card>
  );
}
