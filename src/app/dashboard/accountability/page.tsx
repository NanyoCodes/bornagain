'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, getDocs, where, writeBatch, arrayRemove, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, HeartHandshake, MessagesSquare, MoreVertical, UserX, User, CheckCircle2, XCircle, BellRing, BookOpen, Edit } from 'lucide-react';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { useSearch } from '@/context/search-context';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from '@/components/ui/input';

function PartnerDisciplineStatus({ partnerId, date }: { partnerId: string; date: Date }) {
    const firestore = useFirestore();

    const dateStr = useMemo(() => format(date, 'yyyy-MM-dd'), [date]);
    
    const disciplineDocRef = useMemo(() => {
        if (!firestore) return null;
        return doc(firestore, 'users', partnerId, 'disciplineHistory', dateStr);
    }, [firestore, partnerId, dateStr]);

    const { data: partnerDiscipline, loading } = useDoc<{ completed?: string[] }>(disciplineDocRef);

    const completedOnDate = useMemo(() => {
        return partnerDiscipline?.completed || [];
    }, [partnerDiscipline]);

    const disciplines = [
        { id: 'pray', label: 'Pray' },
        { id: 'read_bible', label: 'Read Bible' },
        { id: 'attend_church', label: 'Church' },
        { id: 'take_notes', label: 'Journal' },
    ];
    
    if (loading) {
        return (
            <div className="flex justify-around items-center h-12 bg-muted/5 rounded-xl border border-dashed">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Checking records...</span>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-4 gap-1 items-center h-14">
            {disciplines.map(d => (
                <div key={d.id} className="flex flex-col items-center gap-1.5 text-[9px] sm:text-[10px] text-center min-w-0">
                    {completedOnDate.includes(d.id) ? (
                        <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </div>
                    ) : (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                            <XCircle className="h-4 w-4 text-muted-foreground/30" />
                        </div>
                    )}
                    <span className={cn(
                        "leading-tight uppercase font-black tracking-tighter truncate w-full px-1",
                        completedOnDate.includes(d.id) ? 'text-foreground' : 'text-muted-foreground/60'
                    )}>
                        {d.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

function PartnerCard({ 
    partner, 
    onNudge, 
    onChat, 
    onRemove 
}: { 
    partner: UserProfile['accountabilityPartners'][0], 
    onNudge: (p: any) => void, 
    onChat: (p: any) => void, 
    onRemove: (p: any) => void 
}) {
    const router = useRouter();
    const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
    
    const selectedDate = useMemo(() => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }, [dateStr]);

    return (
        <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x border-b-2 sm:border-b shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 gap-4">
                 <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Dialog>
                      <DialogTrigger asChild disabled={!partner.photoURL}>
                        <Avatar className={cn("h-11 w-11 sm:h-12 sm:w-12 border shadow-sm shrink-0", partner.photoURL && "cursor-pointer active:scale-95 transition-transform")}>
                            <AvatarImage src={partner.photoURL} />
                            <AvatarFallback className="font-bold text-lg bg-primary/10 text-primary">{partner.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </DialogTrigger>
                      {partner.photoURL && (
                          <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center">
                              <DialogHeader className="sr-only">
                                  <DialogTitle>Profile photo of {partner.firstName} {partner.lastName}</DialogTitle>
                                  <DialogDescription>Full screen view of the user's profile photo.</DialogDescription>
                              </DialogHeader>
                              <div className="relative h-full w-full flex items-center justify-center p-4">
                                <Avatar className="h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] rounded-2xl sm:rounded-[3rem] shadow-2xl ring-4 ring-white/10">
                                    <AvatarImage src={partner.photoURL} className="object-cover" />
                                    <AvatarFallback className="font-bold text-lg bg-primary/10 text-primary">{partner.firstName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                              </div>
                          </DialogContent>
                      )}
                    </Dialog>
                    <div className="min-w-0">
                        <Link href={`/dashboard/profile/${partner.userId}`} className="group inline-flex flex-col">
                            <h2 className="text-sm sm:text-base font-black truncate group-hover:underline leading-none">{partner.firstName} {partner.lastName}</h2>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">Partner</span>
                        </Link>
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 rounded-full"
                                    onClick={() => onNudge(partner)}
                                >
                                    <BellRing className="h-4 w-4" />
                                    <span className="sr-only">Nudge Partner</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Nudge {partner.firstName}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 rounded-full"
                                    onClick={() => onChat(partner)}
                                >
                                    <MessagesSquare className="h-4 w-4" />
                                    <span className="sr-only">Chat</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Chat with {partner.firstName}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                            <DropdownMenuItem onSelect={() => router.push(`/dashboard/profile/${partner.userId}`)} className="rounded-lg">
                              <User className="mr-2 h-4 w-4" /> View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => router.push('/dashboard/bible')} className="rounded-lg">
                              <BookOpen className="mr-2 h-4 w-4" /> Read Bible
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive rounded-lg"
                                onSelect={() => onRemove(partner)}
                            >
                                <UserX className="mr-2 h-4 w-4" /> Remove Partner
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6">
                <div className="pt-4 border-t border-dashed space-y-4">
                    <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Discipline Records</h4>
                        </div>
                        <Input 
                            type="date" 
                            value={dateStr} 
                            onChange={(e) => setDateStr(e.target.value)} 
                            className="w-[140px] h-8 text-[10px] sm:text-xs font-bold uppercase tracking-tighter bg-muted/20 border-none rounded-lg"
                        />
                    </div>
                    <PartnerDisciplineStatus 
                        partnerId={partner.userId} 
                        date={selectedDate}
                    />
                </div>
            </CardContent>
        </Card>
    );
}


export default function AccountabilityPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isChatLoading, setIsChatLoading] = useState<string | null>(null);
  const [isNudging, setIsNudging] = useState<string | null>(null);
  
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [removalTarget, setRemovalTarget] = useState<UserProfile['accountabilityPartners'][0] | null>(null);
  const [removalReason, setRemovalReason] = useState('');

  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();

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

  const partners = userProfile?.accountabilityPartners || [];

  const filteredPartners = useMemo(() => {
    // 1. Deduplicate by userId to prevent rendering errors
    const uniqueMap = new Map();
    partners.forEach(p => {
        if (p.userId) {
          // If we have multiple entries, keep the most complete one (has photoURL)
          if (!uniqueMap.has(p.userId) || (!uniqueMap.get(p.userId).photoURL && p.photoURL)) {
            uniqueMap.set(p.userId, p);
          }
        }
    });
    const uniquePartners = Array.from(uniqueMap.values());

    // 2. Apply search filter
    if (!searchTerm) {
      return uniquePartners;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return uniquePartners.filter(partner => 
      `${partner.firstName} ${partner.lastName}`.toLowerCase().includes(lowercasedTerm)
    );
  }, [partners, searchTerm]);

  const handleNudgePartner = async (partner: { userId: string, firstName: string, lastName: string }) => {
    if (!user || !firestore || !userProfile) return;

    setIsNudging(partner.userId);
    try {
        const notificationsCollectionRef = collection(firestore, 'users', partner.userId, 'notifications');
        const notificationData = {
            userId: partner.userId,
            type: 'accountability_nudge' as const,
            title: 'A friendly nudge!',
            message: `${userProfile.firstName} ${userProfile.lastName} is encouraging you to complete your daily disciplines.`,
            link: '/dashboard',
            isRead: false,
            createdAt: serverTimestamp(),
        };

        await addDoc(notificationsCollectionRef, notificationData);

        toast({
            title: 'Nudge Sent!',
            description: `You've sent an encouragement to ${partner.firstName}.`,
        });

    } catch (error) {
        const permissionError = new FirestorePermissionError({
            path: `users/${partner.userId}/notifications`,
            operation: 'create',
            requestResourceData: { action: 'nudge partner', from: user.uid }
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsNudging(null);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Establishing Connection...</p>
      </div>
    );
  }
  
  if (partners.length === 0) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto -mx-4 sm:mx-auto pb-32 px-4 sm:px-0">
        <div className="flex flex-col items-center justify-center text-center p-10 sm:p-16 bg-primary/5 rounded-[2.5rem] border-2 border-dashed border-primary/20">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <HeartHandshake className="h-10 w-10 text-primary opacity-40" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-headline tracking-tight uppercase">Find a Partner</h2>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground font-medium leading-relaxed">
            "Two are better than one... for if they fall, the one will lift up his fellow." — Ecclesiastes 4:9-10
            </p>
        </div>
        <div>
            {userProfile && user && <AccountabilitySettingsCard userProfile={userProfile} userId={user.uid} />}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-10 max-w-3xl mx-auto -mx-4 sm:mx-auto pb-32">
      <div className="px-4 sm:px-0 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight uppercase">My Partners</h1>
        <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">Spiritual Accountability</p>
      </div>

      <div className="space-y-4">
          {filteredPartners.map(partner => (
              <PartnerCard 
                  key={partner.userId}
                  partner={partner}
                  onNudge={handleNudgePartner}
                  onChat={handleInitiateChat}
                  onRemove={setRemovalTarget}
              />
          ))}
          {partners.length > 0 && filteredPartners.length === 0 && (
              <div className="text-center py-20 text-muted-foreground bg-muted/10 border-y sm:border-2 border-dashed rounded-none sm:rounded-[2.5rem]">
                  <p className="font-bold">No partners found matching "{searchTerm}".</p>
              </div>
          )}
      </div>

      <div className="px-4 sm:px-0 pt-4">
        {userProfile && user && <AccountabilitySettingsCard userProfile={userProfile} userId={user.uid} />}
      </div>

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
            <AlertDialogContent className="w-[90vw] max-w-lg rounded-[2rem] p-8">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black font-headline leading-tight">End Partnership?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium">
                        You're about to end your accountability partnership with {removalTarget.firstName}. This will remove both of you from each other's active tracking lists.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-4 py-6">
                    <div className="grid gap-2">
                        <Label htmlFor="removal-reason" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reason for Removal</Label>
                        <Textarea
                            id="removal-reason"
                            value={removalReason}
                            onChange={(e) => setRemovalReason(e.target.value)}
                            placeholder="e.g., Seasonal change, moved church..."
                            className="text-base rounded-2xl min-h-[100px] bg-muted/20"
                        />
                    </div>
                </div>
                <AlertDialogFooter className="gap-3">
                    <AlertDialogCancel disabled={isRemoving === removalTarget.userId} className="rounded-xl h-11">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemovePartner} disabled={isRemoving === removalTarget.userId || !removalReason.trim()} className="bg-destructive hover:bg-destructive/90 rounded-xl h-11 font-bold">
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
