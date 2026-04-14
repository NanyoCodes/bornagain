
'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, getDocs, where, writeBatch, arrayRemove, deleteDoc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, HeartHandshake, MessagesSquare, MoreVertical, UserX, User, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AccountabilitySettingsCard } from '@/components/settings/accountability-settings-card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useSearch } from '@/context/search-context';
import { cn } from '@/lib/utils';

function PartnerDisciplineStatus({ partnerId, date }: { partnerId: string; date: Date }) {
    const firestore = useFirestore();

    const dateStr = useMemo(() => format(date, 'yyyy-MM-dd'), [date]);
    
    const disciplineDocRef = useMemo(() => {
        if (!firestore) return null;
        return doc(firestore, 'users', partnerId, 'disciplineHistory', dateStr);
    }, [firestore, partnerId, dateStr]);

    const { data: partnerDiscipline, loading, error } = useDoc<{ completed?: string[] }>(disciplineDocRef);

    const completedOnDate = useMemo(() => {
        return partnerDiscipline?.completed || [];
    }, [partnerDiscipline]);

    const disciplines = [
        { id: 'pray', label: 'Pray' },
        { id: 'read_bible', label: 'Read Bible' },
        { id: 'attend_church', label: 'Attend Church' },
    ];
    
    if (loading) {
        return <div className="flex justify-around items-center h-10"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
    }

    if (error) {
        return <div className="text-center text-xs text-destructive py-2 h-10 flex items-center justify-center">Permission Denied</div>;
    }

    return (
        <div className="flex justify-around items-center h-10">
            {disciplines.map(d => (
                <div key={d.id} className="flex flex-col items-center gap-1 text-xs text-center">
                    {completedOnDate.includes(d.id) ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground/50" />
                    )}
                    <span className={completedOnDate.includes(d.id) ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{d.label}</span>
                </div>
            ))}
        </div>
    );
}


export default function AccountabilityPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isChatLoading, setIsChatLoading] = useState<string | null>(null);
  
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [removalTarget, setRemovalTarget] = useState<UserProfile['accountabilityPartners'][0] | null>(null);
  const [removalReason, setRemovalReason] = useState('');

  const [today, setToday] = useState<Date | null>(null);
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();

  useEffect(() => {
    // Set date on mount to ensure client-side date is used, avoiding hydration mismatches.
    setToday(new Date());
  }, []);

  useEffect(() => {
    setIsSearchVisible(true);
    setSearchPlaceholder("Search partners by name...");
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setIsSearchVisible, setSearchPlaceholder, setSearchTerm]);

  const userDocRef = useMemo(() => {
    if (!user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);

  const { data: userProfile, loading: loadingProfile } = useDoc<UserProfile>(userDocRef);

  const handleInitiateChat = async (partner: { userId: string, firstName: string, lastName: string, photoURL?: string }) => {
    if (!user || !firestore || !userProfile) return;
    setIsChatLoading(partner.userId);

    try {
        const participantIds = [user.uid, partner.userId].sort();
        const chatsRef = collection(firestore, 'chats');
        
        const q = query(
            chatsRef,
            where('participantIds', '==', participantIds),
            where('isGroupChat', '==', false)
        );

        const querySnapshot = await getDocs(q);
        let existingChat = querySnapshot.docs.find(doc => !doc.data().campaignId);
        
        let chatId: string;

        if (existingChat) {
            chatId = existingChat.id;
        } else {
            const newChatData = {
                participantIds,
                participantInfo: {
                    [user.uid]: {
                        firstName: userProfile.firstName || '',
                        lastName: userProfile.lastName || '',
                        photoURL: userProfile.photoURL || '',
                    },
                    [partner.userId]: {
                        firstName: partner.firstName,
                        lastName: partner.lastName,
                        photoURL: partner.photoURL || '', 
                    },
                },
                lastUpdatedAt: serverTimestamp(),
                isGroupChat: false,
                hasMessages: false,
            };
            const chatDocRef = await addDoc(chatsRef, newChatData);
            chatId = chatDocRef.id;
        }
        router.push(`/dashboard/chats/${chatId}`);

    } catch (error) {
        const permissionError = new FirestorePermissionError({
          path: `chats`,
          operation: 'create',
          requestResourceData: { action: 'initiate partner chat', userId: user.uid }
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsChatLoading(null);
    }
  };

  const handleRemovePartner = async () => {
    if (!user || !firestore || !userProfile?.accountabilityPartners || !removalTarget) {
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
    setIsRemoving(removalTarget.userId);
    
    const partnerId = removalTarget.userId;

    try {
        const batch = writeBatch(firestore);

        const requestId = [user.uid, partnerId].sort().join('_');
        const requestRef = doc(firestore, 'accountabilityRequests', requestId);
        
        const partnerUserRef = doc(firestore, 'users', partnerId);
        const partnerDoc = await getDoc(partnerUserRef);

        if (partnerDoc.exists()) {
             const partnerProfile = partnerDoc.data() as UserProfile;
            const myEntryInPartnersList = partnerProfile.accountabilityPartners?.find(p => p.userId === user.uid);
            if (myEntryInPartnersList) {
                batch.update(partnerUserRef, {
                    accountabilityPartners: arrayRemove(myEntryInPartnersList),
                    partnerIds: arrayRemove(user.uid),
                });
            }
        }

        const myPartnerObject = userProfile.accountabilityPartners.find(p => p.userId === partnerId);
        if (myPartnerObject) {
          const currentUserRef = doc(firestore, 'users', user.uid);
          batch.update(currentUserRef, {
              accountabilityPartners: arrayRemove(myPartnerObject),
              partnerIds: arrayRemove(partnerId),
          });
        }
        
        try {
            const requestDoc = await getDoc(requestRef);
            if (requestDoc.exists()) {
                batch.delete(requestRef);
            }
        } catch (e) {
            console.warn("Could not find accountability request to delete, continuing.", e);
        }
        
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

        await batch.commit();

        toast({ title: 'Partner Removed', description: 'Your accountability partnership has been ended.' });
        setRemovalTarget(null);
    } catch (error) {
        console.error("Error removing partner:", error);
        const permissionError = new FirestorePermissionError({
            path: `BATCH_WRITE:REMOVE_PARTNER:${user.uid}`,
            operation: 'write',
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsRemoving(null);
        setRemovalReason('');
    }
  };

  const isLoading = userLoading || loadingProfile;

  const partners = userProfile?.accountabilityPartners || [];

  const filteredPartners = useMemo(() => {
    if (!searchTerm) {
      return partners;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return partners.filter(partner => 
      `${partner.firstName} ${partner.lastName}`.toLowerCase().includes(lowercasedTerm)
    );
  }, [partners, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading accountability...</p>
      </div>
    );
  }
  
  if (partners.length === 0) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto">
        <div className="flex h-full w-full flex-col items-center justify-center text-center rounded-lg border-2 border-dashed p-6 sm:p-12">
            <HeartHandshake className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-6 text-2xl font-semibold">Find an Accountability Partner</h2>
            <p className="mt-2 max-w-md text-muted-foreground">
            An accountability partner can help you stay on track with your spiritual goals. Send a request to get started!
            </p>
        </div>
        {userProfile && user && <AccountabilitySettingsCard userProfile={userProfile} userId={user.uid} />}
      </div>
    );
  }
  
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
        <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight font-headline">Your Accountability Partners</h1>
            <p className="text-muted-foreground">Your partners in faith. Encourage them and keep each other on track.</p>
        </div>
        <div className="space-y-4">
            {filteredPartners.map(partner => (
                <Card key={partner.userId}>
                    <CardHeader className="flex flex-row items-center justify-between">
                         <div className="flex items-center gap-4">
                            <Dialog>
                              <DialogTrigger asChild disabled={!partner.photoURL}>
                                <Avatar className={cn("h-12 w-12 border", partner.photoURL && "cursor-pointer")}>
                                    <AvatarImage src={partner.photoURL} />
                                    <AvatarFallback>{partner.firstName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                              </DialogTrigger>
                              {partner.photoURL && (
                                  <DialogContent className="p-0 bg-transparent border-0 w-auto max-w-lg">
                                      <DialogHeader className="sr-only">
                                          <DialogTitle>Profile photo of {partner.firstName} {partner.lastName}</DialogTitle>
                                          <DialogDescription>A larger view of the user's profile photo.</DialogDescription>
                                      </DialogHeader>
                                      <Image src={partner.photoURL} alt={`${partner.firstName} ${partner.lastName}`} width={600} height={600} className="rounded-lg object-contain"/>
                                  </DialogContent>
                              )}
                            </Dialog>
                            <div>
                                <Link href={`/dashboard/profile/${partner.userId}`}>
                                    <h2 className="text-lg sm:text-xl font-semibold hover:underline">{partner.firstName} {partner.lastName}</h2>
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={() => handleInitiateChat(partner)} disabled={isChatLoading === partner.userId}>
                                {isChatLoading === partner.userId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessagesSquare className="mr-2 h-4 w-4" />}
                                Chat
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => router.push(`/dashboard/profile/${partner.userId}`)}>
                                      <User className="mr-2 h-4 w-4" /> View Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onSelect={() => {
                                            setRemovalTarget(partner);
                                        }}
                                    >
                                        <UserX className="mr-2 h-4 w-4" /> Remove Partner
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-4">
                        <div className="mt-2 pt-4 border-t space-y-4">
                            <div className="flex justify-between items-center flex-wrap gap-2">
                                <h4 className="text-sm font-semibold text-muted-foreground">Discipline Status for Today</h4>
                            </div>
                            {today ? (
                                <PartnerDisciplineStatus 
                                    partnerId={partner.userId} 
                                    date={today}
                                />
                            ) : (
                                <div className="flex justify-around items-center h-10"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
            {partners.length > 0 && filteredPartners.length === 0 && (
                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                    No partners found matching "{searchTerm}".
                </div>
            )}
        </div>
      {userProfile && user && <AccountabilitySettingsCard userProfile={userProfile} userId={user.uid} />}
      
      {removalTarget && (
        <AlertDialog
            open={!!removalTarget}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setRemovalTarget(null);
                    setRemovalReason('');
                }
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Remove {removalTarget.firstName}?</AlertDialogTitle>
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
                    <AlertDialogCancel disabled={isRemoving === removalTarget.userId}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemovePartner} disabled={isRemoving === removalTarget.userId || !removalReason.trim()} className="bg-destructive hover:bg-destructive/90">
                        {isRemoving === removalTarget.userId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Confirm Removal
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
