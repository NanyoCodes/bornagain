'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, limit, getDocs, setDoc, serverTimestamp, doc, addDoc } from 'firebase/firestore';
import type { AccountabilityRequest, UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection } from '@/firebase/firestore/use-collection';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function UserSearch({ currentUserProfile }: { currentUserProfile: UserProfile }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [isProcessingRequest, setIsProcessingRequest] = useState<string | null>(null);

    // Get pending/accepted requests to disable buttons for users who have already been sent a request.
    const requestsQuery = useMemo(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'accountabilityRequests'),
            where('participantIds', 'array-contains', user.uid),
            where('status', 'in', ['pending', 'accepted'])
        );
    }, [user, firestore]);
    const { data: existingRequests } = useCollection<AccountabilityRequest>(requestsQuery);
    
    const existingRequestUserIds = useMemo(() => 
        new Set(existingRequests?.flatMap(r => r.participantIds).filter(id => id !== user?.uid))
    , [existingRequests, user]);


    useEffect(() => {
        const trimmedSearch = searchTerm.trim().toLowerCase();
        if (trimmedSearch.length < 2) {
            setSearchResults([]);
            if (isSearching) setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const debounceSearch = setTimeout(async () => {
            if (!user || !firestore) {
                setIsSearching(false);
                return;
            }

            try {
                const usersRef = collection(firestore, 'users');
                const searchTokens = trimmedSearch.split(' ').filter(Boolean);
                
                const nameQuery = query(
                    usersRef,
                    where('name_tokens', 'array-contains-any', searchTokens),
                    limit(5)
                );
                
                const emailQuery = query(
                    usersRef,
                    where('email', '>=', trimmedSearch),
                    where('email', '<=', trimmedSearch + '\uf8ff'),
                    limit(5)
                );

                const [nameSnapshot, emailSnapshot] = await Promise.all([
                    getDocs(nameQuery),
                    getDocs(emailQuery)
                ]);

                const usersMap = new Map<string, UserProfile>();
                const processSnapshot = (snapshot: any) => {
                    snapshot.docs.forEach((doc: any) => {
                        const docData = doc.data();
                        if (doc.id !== user.uid && !docData.accountabilityPartnerId) {
                            usersMap.set(doc.id, { id: doc.id, ...docData } as UserProfile);
                        }
                    });
                };

                processSnapshot(nameSnapshot);
                processSnapshot(emailSnapshot);

                setSearchResults(Array.from(usersMap.values()));
                
            } catch (error) {
                console.error("User search failed:", error);
                toast({ variant: 'destructive', title: 'Search Failed', description: 'Could not perform user search.' });
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(debounceSearch);
    }, [searchTerm, user, firestore, toast]);
    
    const handleSendRequest = (targetUser: UserProfile) => {
        if (!user || !firestore || !currentUserProfile) return;
        
        if (currentUserProfile.accountabilityPartnerId) {
            toast({ variant: 'destructive', title: 'Error', description: 'You already have an accountability partner. Please remove your current partner before sending a new request.' });
            return;
        }
        if (targetUser.accountabilityPartnerId) {
            toast({ variant: 'destructive', title: 'Error', description: `${targetUser.firstName} ${targetUser.lastName} already has an accountability partner.` });
            return;
        }
        
        setIsProcessingRequest(targetUser.id);

        const participantIds = [user.uid, targetUser.id].sort();
        const requestId = participantIds.join('_');
        const requestRef = doc(firestore, 'accountabilityRequests', requestId);

        const newRequestData: Omit<AccountabilityRequest, 'id'> = {
            fromUserId: user.uid,
            fromUserFirstName: currentUserProfile.firstName,
            fromUserLastName: currentUserProfile.lastName,
            fromUserPhotoURL: currentUserProfile.photoURL || '',
            toUserId: targetUser.id,
            toUserFirstName: targetUser.firstName,
            toUserLastName: targetUser.lastName,
            toUserPhotoURL: targetUser.photoURL || '',
            status: 'pending' as const,
            createdAt: serverTimestamp() as any,
            participantIds,
        };

        const notificationData = {
            userId: targetUser.id,
            type: 'accountability_request' as const,
            title: 'New Accountability Request',
            message: `${currentUserProfile.firstName} ${currentUserProfile.lastName} wants to be your accountability partner.`,
            link: '/dashboard/accountability',
            isRead: false,
            createdAt: serverTimestamp(),
        };

        setDoc(requestRef, newRequestData)
            .then(() => {
                const notificationsRef = collection(firestore, 'users', targetUser.id, 'notifications');
                return addDoc(notificationsRef, notificationData);
            })
            .then(() => {
                toast({ title: 'Request Sent!', description: `Your request has been sent to ${targetUser.firstName} ${targetUser.lastName}.` });
            })
            .catch((serverError) => {
                 const permissionError = new FirestorePermissionError({
                    path: requestRef.path,
                    operation: 'create',
                    requestResourceData: newRequestData
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsProcessingRequest(null);
            });
    };

    return (
        <div className="space-y-4">
             <h3 className="text-sm font-semibold text-muted-foreground">FIND A PARTNER</h3>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search for users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                    autoComplete="off"
                />
                {isSearching && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin"/>}
            </div>

            <ScrollArea className="h-60 rounded-md border">
                <div className="p-2">
                {searchResults.length === 0 && !isSearching && (
                    <div className="text-center text-muted-foreground p-4 text-sm">
                       {searchTerm.trim().length < 2 ? "Start typing to search for users." : "No users found."}
                    </div>
                )}
                <div className="space-y-2">
                {searchResults.map(foundUser => {
                    const isDisabled = isProcessingRequest === foundUser.id || existingRequestUserIds.has(foundUser.id);
                    let buttonText = 'Request';
                    if (isProcessingRequest === foundUser.id) buttonText = 'Sending...';
                    if (existingRequestUserIds.has(foundUser.id)) buttonText = 'Request Sent';

                    return (
                        <div key={foundUser.id} className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between p-2 rounded-md hover:bg-muted/50">
                            <div className="flex items-center gap-3 w-full">
                                <Avatar>
                                    <AvatarImage src={foundUser.photoURL ?? undefined} alt={`${foundUser.firstName} ${foundUser.lastName}`} />
                                    <AvatarFallback>{foundUser.firstName?.charAt(0)}{foundUser.lastName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm truncate">{foundUser.firstName} {foundUser.lastName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{foundUser.email}</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => handleSendRequest(foundUser)}
                                disabled={isDisabled}
                                className="w-full sm:w-auto shrink-0"
                            >
                                {isProcessingRequest === foundUser.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="mr-2 h-4 w-4" />
                                )}
                                {buttonText}
                            </Button>
                        </div>
                    )
                })}
                </div>
                </div>
            </ScrollArea>
        </div>
    );
}
