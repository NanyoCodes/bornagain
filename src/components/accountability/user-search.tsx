'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

export function UserSearch({ currentUserProfile }: { currentUserProfile: UserProfile }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

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
                
                // We'll perform two separate queries and merge the results client-side.
                
                // Query 1: By display name token using 'array-contains'
                const nameQuery = query(
                    usersRef,
                    where('displayName_tokens', 'array-contains', trimmedSearch),
                    limit(5)
                );
                
                // Query 2: By email prefix
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
                        if (doc.id !== user.uid) {
                            usersMap.set(doc.id, { id: doc.id, ...doc.data() } as UserProfile);
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
    
    const handleSendRequest = async (targetUser: UserProfile) => {
        if (!user || !firestore || !currentUserProfile) return;
        
        setSentRequests(prev => new Set(prev).add(targetUser.id));

        try {
            if (currentUserProfile.accountabilityPartnerId) {
                throw new Error('You already have an accountability partner. Please remove your current partner before sending a new request.');
            }
            if (targetUser.accountabilityPartnerId) {
                throw new Error('This user already has an accountability partner.');
            }

            const requestsRef = collection(firestore, 'accountabilityRequests');
            
            // Query for all pending requests the current user is a part of.
            // This query is compatible with the security rule `allow read: if request.auth.uid in resource.data.participantIds`.
            const existingRequestQuery = query(
                requestsRef,
                where('participantIds', 'array-contains', user.uid),
                where('status', '==', 'pending')
            );
            
            const querySnapshot = await getDocs(existingRequestQuery);

            // Now, filter the results on the client to find if a request with the target user already exists.
            const existingRequestDoc = querySnapshot.docs.find(doc => {
                const pIds = doc.data().participantIds as string[];
                return pIds.includes(targetUser.id);
            });

            if (existingRequestDoc) {
                const existingRequest = existingRequestDoc.data();
                if (existingRequest.fromUserId === user.uid) {
                    throw new Error('You have already sent a pending request to this user.');
                } else {
                    throw new Error('This user has already sent you a request. Check your notifications to respond.');
                }
            }

            // If no existing request, create a new one.
            const newRequestData = {
                fromUserId: user.uid,
                fromUserName: currentUserProfile.displayName,
                fromUserPhotoURL: currentUserProfile.photoURL || null,
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
                message: `${currentUserProfile.displayName} wants to be your accountability partner.`,
                link: '/dashboard/accountability',
                isRead: false,
                createdAt: serverTimestamp(),
            });

            toast({ title: 'Request Sent!', description: `Your request has been sent to ${targetUser.displayName}.` });

        } catch (error: any) {
            console.error("Error sending request:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not send request.' });
            setSentRequests(prev => {
                const newSet = new Set(prev);
                newSet.delete(targetUser.id);
                return newSet;
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or email..."
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
                {searchResults.map(foundUser => (
                    <div key={foundUser.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={foundUser.photoURL ?? undefined} alt={foundUser.displayName} />
                                <AvatarFallback>{foundUser.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-sm">{foundUser.displayName}</p>
                                <p className="text-xs text-muted-foreground">{foundUser.email}</p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => handleSendRequest(foundUser)}
                            disabled={sentRequests.has(foundUser.id)}
                        >
                            {sentRequests.has(foundUser.id) ? 'Request Sent' : <><Send className="mr-2 h-4 w-4" />Request</>}
                        </Button>
                    </div>
                ))}
                </div>
                </div>
            </ScrollArea>
        </div>
    );
}
