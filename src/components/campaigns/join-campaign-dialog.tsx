'use client';

import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import type { Campaign, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { doc, runTransaction, serverTimestamp, collection, getDoc } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface JoinCampaignDialogProps {
  campaign: Campaign;
  userProfile: UserProfile;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCampaignJoined: () => void;
}

export function JoinCampaignDialog({
  campaign,
  userProfile,
  isOpen,
  onOpenChange,
  onCampaignJoined,
}: JoinCampaignDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isJoining, setIsJoining] = useState(false);
  const [joinReason, setJoinReason] = useState('');

  const handleJoin = async () => {
    if (!user || !firestore) return;
    setIsJoining(true);

    const campaignRef = doc(firestore, 'campaigns', campaign.id);
    const joinedRef = doc(firestore, 'users', user.uid, 'joinedCampaigns', campaign.id);
    const participantRef = doc(firestore, 'campaigns', campaign.id, 'participants', user.uid);

    try {
      await runTransaction(firestore, async (transaction) => {
        const campaignDoc = await transaction.get(campaignRef);
        if (!campaignDoc.exists()) {
          throw new Error('Campaign does not exist!');
        }

        const currentCampaign = campaignDoc.data() as Campaign;
        if (currentCampaign.maxParticipants && currentCampaign.participants >= currentCampaign.maxParticipants) {
          throw new Error('This campaign is already full.');
        }

        const newParticipantCount = (currentCampaign.participants || 0) + 1;
        transaction.update(campaignRef, { participants: newParticipantCount });

        transaction.set(joinedRef, {
          campaignId: campaign.id,
          joinedAt: serverTimestamp(),
        });

        const participantData: { [key: string]: any } = {
          userId: user.uid,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          photoURL: userProfile.photoURL || null,
          joinedAt: serverTimestamp(),
          joinReason: joinReason || null,
        };
        if (user.email) {
          participantData.email = user.email;
        }
        transaction.set(participantRef, participantData);

        if (user.uid !== campaign.organizerId) {
          const notificationRef = doc(collection(firestore, `users/${campaign.organizerId}/notifications`));
          transaction.set(notificationRef, {
            userId: campaign.organizerId,
            type: 'campaign_join',
            title: 'New Participant!',
            message: `${userProfile.firstName} ${userProfile.lastName} has joined your campaign: "${campaign.title}"`,
            link: `/dashboard/campaigns`,
            isRead: false,
            createdAt: serverTimestamp(),
          });
        }
      });

      toast({
        title: 'Campaign Joined!',
        description: `You have successfully joined the "${campaign.title}" campaign.`,
      });
      onOpenChange(false);
      onCampaignJoined();
    } catch (error: any) {
       if (error.name === 'FirestoreError' && error.code === 'aborted') {
        toast({
          variant: 'destructive',
          title: 'Join Failed',
          description: `Could not join campaign as it was updated during the process. It might be full. Please try again.`,
        });
      } else {
        const permissionError = new FirestorePermissionError({
            path: `TRANSACTION:JOIN_CAMPAIGN:${campaign.id}`,
            operation: 'write',
            requestResourceData: {
                action: 'User joining campaign',
                userId: user.uid,
                campaignId: campaign.id
            }
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join: {campaign.title}</DialogTitle>
          <DialogDescription>
            You're about to join this campaign. You can add an optional note for the organizer.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="joinReason">Why do you want to join? (Optional)</Label>
          <Textarea
            id="joinReason"
            placeholder="Let the organizer know why you're interested in joining..."
            value={joinReason}
            onChange={(e) => setJoinReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isJoining}>
            Cancel
          </Button>
          <Button onClick={handleJoin} disabled={isJoining}>
            {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Join
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
