
'use client';

import { useState } from 'react';
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

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedSearch = searchTerm.trim();
        if (!trimmedSearch) return;
        if (!user || !firestore) return;

        setIsSearching(true);
        setSearchResults([]);

        try {
            const usersRef = collection(firestore, 'users');
            const searchLower = trimmedSearch.toLowerCase();
            
            const q = query(
                usersRef,
                where('displayName_lowercase_parts', 'array-contains', searchLower),
                limit(10)
            );
            
            const querySnapshot = await getDocs(q);
            const users = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as UserProfile))
                .filter(u => u.id !== user.uid); // Filter out current user
            
            setSearchResults(users);
             if (users.length === 0) {
                toast({
                    title: 'No Users Found',
                    description: 'Try a different name.',
                });
            }
        } catch (error) {
            console.error("User search failed:", error);
            toast({ variant: 'destructive', title: 'Search Failed', description: 'Could not perform user search. This may be a permissions issue.' });
        } finally {
            setIsSearching(false);
        }
    };
    
    const handleSendRequest = async (targetUser: UserProfile) => {
        if (!user || !firestore || !currentUserProfile) return;
        
        setSentRequests(prev => new Set(prev).add(targetUser.id));

        try {
            if (currentUserProfile.accountabilityPartnerId) {
                throw new Error('You already have an accountability partner.');
            }
            if (targetUser.accountabilityPartnerId) {
                throw new Error('This user already has an accountability partner.');
            }

            const requestsRef = collection(firestore, 'accountabilityRequests');
            // Check for existing pending request from current user to target user
            const existingRequestQuery1 = query(requestsRef, where('fromUserId', '==', user.uid), where('toUserId', '==', targetUser.id), where('status', '==', 'pending'));
            // Check for existing pending request from target user to current user
            const existingRequestQuery2 = query(requestsRef, where('fromUserId', '==', targetUser.id), where('toUserId', '==', user.uid), where('status', '==', 'pending'));
            
            const [snapshot1, snapshot2] = await Promise.all([getDocs(existingRequestQuery1), getDocs(existingRequestQuery2)]);

            if(!snapshot1.empty) {
                toast({ variant: 'default', title: 'Request Already Sent', description: 'You have already sent a pending request to this user.' });
                return;
            }

            if(!snapshot2.empty) {
                throw new Error('This user has already sent you a request. Check your notifications to respond.');
            }

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
            <form onSubmit={handleSearch} className="flex items-center gap-2">
                <Input
                    placeholder="Search for a user by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button type="submit" size="icon" disabled={isSearching || !searchTerm.trim()}>
                    {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
                </Button>
            </form>
            <p className="text-xs text-muted-foreground px-1">
                Tip: Search for one name at a time (e.g., "John" instead of "John Doe").
            </p>

            <ScrollArea className="h-64 rounded-md border">
                <div className="p-4">
                {isSearching && <div className="flex justify-center p-4"><Loader2 className="animate-spin"/></div>}
                {!isSearching && searchResults.length === 0 && (
                    <div className="text-center text-muted-foreground p-4">
                        Type a name and click search to find users.
                    </div>
                )}
                <div className="space-y-4">
                {!isSearching && searchResults.map(foundUser => (
                    <div key={foundUser.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={foundUser.photoURL ?? undefined} alt={foundUser.displayName} />
                                <AvatarFallback>{foundUser.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{foundUser.displayName}</p>
                                <p className="text-sm text-muted-foreground">{foundUser.email}</p>
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

    