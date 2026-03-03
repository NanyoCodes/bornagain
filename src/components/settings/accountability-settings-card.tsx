
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore } from '@/firebase';
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
  deleteField,
} from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Loader2, Send, UserX, HeartHandshake, Search } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserSearch } from '@/components/accountability/user-search';

const sendRequestSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

export function AccountabilitySettingsCard({ userProfile, userId }: { userProfile: UserProfile; userId: string }) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [isSending, setIsSending] = useState(false);

  const form = useForm<z.infer<typeof sendRequestSchema>>({
    resolver: zodResolver(sendRequestSchema),
    defaultValues: { email: '' },
  });

  const handleSendRequestByEmail = async (values: z.infer<typeof sendRequestSchema>) => {
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
      const existingRequestQuery1 = query(requestsRef, where('fromUserId', '==', user.uid), where('toUserId', '==', targetUser.id), where('status', '==', 'pending'));
      const existingRequestQuery2 = query(requestsRef, where('fromUserId', '==', targetUser.id), where('toUserId', '==', user.uid), where('status', '==', 'pending'));
            
      const [snapshot1, snapshot2] = await Promise.all([getDocs(existingRequestQuery1), getDocs(existingRequestQuery2)]);
      
      if(!snapshot1.empty) {
        throw new Error('You have already sent a pending request to this user.');
      }
       if(!snapshot2.empty) {
        throw new Error('This user has already sent you a request. Check your notifications to respond.');
      }
      
      const newRequestData = {
        fromUserId: user.uid,
        fromUserName: userProfile.displayName,
        fromUserPhotoURL: userProfile.photoURL || null,
        toUserId: targetUser.id,
        toUserName: targetUser.displayName,
        toUserPhotoURL: targetUser.photoURL || null,
        status: 'pending' as 'pending',
        createdAt: serverTimestamp(),
        participantIds: [user.uid, targetUser.id].sort(),
      };

      await addDoc(requestsRef, newRequestData);

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
            : "Find an accountability partner by searching for them or sending a request via email."
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
          <Tabs defaultValue="search" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="search">
                      <Search className="mr-2 h-4 w-4"/> Search Users
                  </TabsTrigger>
                  <TabsTrigger value="email">
                      <Send className="mr-2 h-4 w-4"/> Request by Email
                  </TabsTrigger>
              </TabsList>
              <TabsContent value="search" className="mt-6">
                 <UserSearch currentUserProfile={userProfile} />
              </TabsContent>
              <TabsContent value="email" className="mt-6">
                  <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleSendRequestByEmail)} className="flex items-start gap-2">
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
              </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
