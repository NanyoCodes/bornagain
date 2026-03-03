
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore, useCollection } from '@/firebase';
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  writeBatch,
  updateDoc,
  deleteDoc,
  runTransaction,
  FieldValue,
  deleteField,
} from 'firebase/firestore';
import type { UserProfile, AccountabilityRequest } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Loader2, Send, Check, X, UserX, HeartHandshake } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';

const sendRequestSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

export function AccountabilitySettingsCard({ userProfile, userId }: { userProfile: UserProfile; userId: string }) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [isSending, setIsSending] = useState(false);
  const [isResponding, setIsResponding] = useState<string | null>(null);

  const form = useForm<z.infer<typeof sendRequestSchema>>({
    resolver: zodResolver(sendRequestSchema),
    defaultValues: { email: '' },
  });

  const requestsQuery = useMemo(() => {
    if (!userId || !firestore) return null;
    return query(
        collection(firestore, 'accountabilityRequests'), 
        where('participantIds', 'array-contains', userId)
    );
  }, [userId, firestore]);
  const { data: allRequests, loading: loadingRequests } = useCollection<AccountabilityRequest>(requestsQuery);

  const incomingRequests = useMemo(() => {
    return allRequests?.filter(r => r.status === 'pending' && r.toUserId === userId)
  }, [allRequests, userId]);
  
  const outgoingRequests = useMemo(() => {
    return allRequests?.filter(r => r.status === 'pending' && r.fromUserId === userId)
  }, [allRequests, userId]);
  
  const loadingIncoming = loadingRequests;
  const loadingOutgoing = loadingRequests;

  const handleSendRequest = async (values: z.infer<typeof sendRequestSchema>) => {
    if (!user || !firestore || !userProfile) return;
    setIsSending(true);

    try {
      if (values.email.toLowerCase() === user.email?.toLowerCase()) {
        throw new Error("You can't send a request to yourself.");
      }

      if (userProfile.accountabilityPartnerId) {
        throw new Error('You already have an accountability partner. Please remove your current partner before sending a new request.');
      }
      
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', values.email), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('No user found with that email address.');
      }

      const targetUserDoc = querySnapshot.docs[0];
      const targetUser = { id: targetUserDoc.id, ...targetUserDoc.data() } as UserProfile;

      if (targetUser.accountabilityPartnerId) {
        throw new Error('This user already has an accountability partner.');
      }
      
      const requestsRef = collection(firestore, 'accountabilityRequests');
      const existingRequestQuery = query(requestsRef, where('fromUserId', '==', user.uid), where('toUserId', '==', targetUser.id), where('status', '==', 'pending'));
      const existingRequestSnapshot = await getDocs(existingRequestQuery);
      if(!existingRequestSnapshot.empty) {
        throw new Error('You have already sent a pending request to this user.');
      }
      
      await addDoc(requestsRef, {
        fromUserId: user.uid,
        fromUserName: userProfile.displayName,
        fromUserPhotoURL: userProfile.photoURL || null,
        toUserId: targetUser.id,
        toUserName: targetUser.displayName,
        toUserPhotoURL: targetUser.photoURL || null,
        status: 'pending',
        createdAt: serverTimestamp(),
        participantIds: [user.uid, targetUser.id].sort(),
      });

      // Send a notification to the target user
      const notificationsRef = collection(firestore, 'users', targetUser.id, 'notifications');
      await addDoc(notificationsRef, {
          userId: targetUser.id,
          type: 'accountability_request',
          title: 'New Accountability Request',
          message: `${userProfile.displayName} has asked you to be their accountability partner.`,
          link: '/dashboard/accountability',
          isRead: false,
          createdAt: serverTimestamp(),
      });
      
      toast({ title: 'Request Sent', description: `Your request has been sent to ${targetUser.displayName}.` });
      form.reset();

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not send request.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleRespondToRequest = async (request: AccountabilityRequest, response: 'accepted' | 'declined') => {
    if (!user || !firestore) return;
    setIsResponding(request.id);
    
    try {
        if (response === 'accepted' && userProfile.accountabilityPartnerId) {
            throw new Error("You already have a partner. Please remove them before accepting a new one.");
        }

        const batch = writeBatch(firestore);
        const requestRef = doc(firestore, 'accountabilityRequests', request.id);

        batch.update(requestRef, { status: response, respondedAt: serverTimestamp() });
        
        if (response === 'accepted') {
            const currentUserRef = doc(firestore, 'users', user.uid);
            batch.update(currentUserRef, {
                accountabilityPartnerId: request.fromUserId,
                accountabilityPartnerName: request.fromUserName,
            });

            const partnerUserRef = doc(firestore, 'users', request.fromUserId);
            batch.update(partnerUserRef, {
                accountabilityPartnerId: user.uid,
                accountabilityPartnerName: userProfile.displayName,
            });
        }
        await batch.commit();
        toast({ title: `Request ${response}`, description: 'The request has been updated.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not respond to request.' });
    } finally {
        setIsResponding(null);
    }
  };
  
  const handleCancelRequest = async (requestId: string) => {
    if (!firestore) return;
    setIsResponding(requestId);
    try {
      const requestRef = doc(firestore, 'accountabilityRequests', requestId);
      await deleteDoc(requestRef);
      toast({ title: 'Request Canceled', description: 'Your partnership request has been withdrawn.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel request.' });
    } finally {
      setIsResponding(null);
    }
  };
  
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
        <CardTitle className="flex items-center gap-2"><HeartHandshake className="h-5 w-5" /> Accountability</CardTitle>
        <CardDescription>
          {hasPartner 
            ? `Your accountability partner is ${userProfile.accountabilityPartnerName}.`
            : "Find an accountability partner to help you stay on track with your spiritual goals."
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
          <>
            <div>
              <h3 className="text-base font-semibold mb-2">Send a Request</h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSendRequest)} className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormControl>
                          <Input placeholder="Enter user's email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSending}>
                    {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                    <span className="sr-only sm:not-sr-only sm:ml-2">Send</span>
                  </Button>
                </form>
              </Form>
            </div>
            
            {(loadingIncoming || (incomingRequests && incomingRequests.length > 0)) && <Separator />}

            <div>
              <h3 className="text-base font-semibold mb-2">Incoming Requests</h3>
              {loadingIncoming ? <Loader2 className="animate-spin" /> : 
                incomingRequests && incomingRequests.length > 0 ? (
                  <div className="space-y-2">
                    {incomingRequests.map(req => (
                        <div key={req.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={req.fromUserPhotoURL ?? undefined} />
                                    <AvatarFallback>{req.fromUserName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-sm">{req.fromUserName}</p>
                                    {req.createdAt && <p className="text-xs text-muted-foreground">{formatDistanceToNow(req.createdAt.toDate(), { addSuffix: true })}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => handleRespondToRequest(req, 'accepted')} disabled={isResponding === req.id}>
                                    {isResponding === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                                    <span className="hidden sm:inline ml-2">Accept</span>
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleRespondToRequest(req, 'declined')} disabled={isResponding === req.id}>
                                    {isResponding === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                                    <span className="hidden sm:inline ml-2">Decline</span>
                                </Button>
                            </div>
                        </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">You have no incoming requests.</p>
                )
              }
            </div>

            {(loadingOutgoing || (outgoingRequests && outgoingRequests.length > 0)) && <Separator />}

            <div>
              <h3 className="text-base font-semibold mb-2">Sent Requests</h3>
               {loadingOutgoing ? <Loader2 className="animate-spin" /> : 
                outgoingRequests && outgoingRequests.length > 0 ? (
                  <div className="space-y-2">
                     {outgoingRequests.map(req => (
                        <div key={req.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={req.toUserPhotoURL ?? undefined} />
                                    <AvatarFallback>{req.toUserName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-sm">{req.toUserName}</p>
                                    {req.createdAt && <p className="text-xs text-muted-foreground">{formatDistanceToNow(req.createdAt.toDate(), { addSuffix: true })}</p>}
                                </div>
                            </div>
                             <Button size="sm" variant="outline" onClick={() => handleCancelRequest(req.id)} disabled={isResponding === req.id}>
                                {isResponding === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                                <span className="hidden sm:inline ml-2">Cancel</span>
                            </Button>
                        </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">You have no pending sent requests.</p>
                )
              }
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
