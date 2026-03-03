
'use client';

import { useUser, useFirestore } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserX, HeartHandshake } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { UserSearch } from '@/components/accountability/user-search';
import { doc, writeBatch, deleteField } from 'firebase/firestore';

export function AccountabilitySettingsCard({ userProfile, userId }: { userProfile: UserProfile; userId: string }) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  
  const handleRemovePartner = async () => {
    if (!user || !firestore || !userProfile.accountabilityPartnerId) return;
    
    try {
        const batch = writeBatch(firestore);

        const currentUserRef = doc(firestore, 'users', user.uid);
        batch.update(currentUserRef, {
            accountabilityPartnerId: deleteField(),
            accountabilityPartnerName: deleteField(),
        });

        const partnerUserRef = doc(firestore, 'users', userProfile.accountabilityPartnerId);
        batch.update(partnerUserRef, {
            accountabilityPartnerId: deleteField(),
            accountabilityPartnerName: deleteField(),
        });

        await batch.commit();

        toast({ title: 'Partner Removed', description: 'Your accountability partnership has been ended.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not remove partner.' });
    }
  };

  const hasPartner = !!userProfile.accountabilityPartnerId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><HeartHandshake className="h-5 w-5" /> Accountability Partner</CardTitle>
        <CardDescription>
          {hasPartner 
            ? `Manage your partnership with ${userProfile.accountabilityPartnerName}.`
            : "Find an accountability partner by searching for them by name."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasPartner ? (
          <div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <UserX className="mr-2 h-4 w-4" /> Remove Partner
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove {userProfile.accountabilityPartnerName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to end this accountability partnership? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemovePartner} className="bg-destructive hover:bg-destructive/90">
                    Confirm Removal
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <UserSearch currentUserProfile={userProfile} />
        )}
      </CardContent>
    </Card>
  );
}
