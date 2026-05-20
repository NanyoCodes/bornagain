
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import type { TestimonyComment, UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn, safeToDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useIsMobile } from '@/hooks/use-mobile';

export function CommentSection({ testimonyId }: { testimonyId: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [newComment, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const userProfileRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: profile } = useDoc<UserProfile>(userProfileRef);

    const commentsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'testimonies', testimonyId, 'comments'),
            orderBy('createdAt', 'asc')
        );
    }, [firestore, testimonyId]);

    const { data: comments, loading } = useCollection<TestimonyComment>(commentsQuery);

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user || !profile || isSending) return;

        setIsSending(true);
        const commentData = {
            authorId: user.uid,
            authorFirstName: profile.firstName,
            authorLastName: profile.lastName,
            authorAvatarUrl: profile.photoURL || '',
            text: newComment.trim(),
            createdAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(firestore, 'testimonies', testimonyId, 'comments'), commentData);
            setNewMessage('');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to post comment.' });
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!user || !firestore) return;
        try {
            await deleteDoc(doc(firestore, 'testimonies', testimonyId, 'comments', commentId));
            toast({ title: 'Comment deleted' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete comment.' });
        }
    };

    return (
        <div className="space-y-4 pt-4 border-t mt-4">
            <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Comments</h4>
            
            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin opacity-20" /></div>
                ) : comments && comments.length > 0 ? (
                    comments.map(comment => {
                        const createdAt = safeToDate(comment.createdAt);
                        const isAuthor = user?.uid === comment.authorId;

                        return (
                            <div key={comment.id} className="flex gap-2 sm:gap-3 items-start group">
                                <Avatar className="h-6 w-6 sm:h-7 sm:w-7 shrink-0">
                                    <AvatarImage src={comment.authorAvatarUrl} />
                                    <AvatarFallback className="text-[10px]">{comment.authorFirstName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0 bg-muted/30 rounded-lg p-2 sm:p-2.5 relative">
                                    <div className="flex justify-between items-start mb-1 gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] sm:text-xs font-bold truncate">
                                                {comment.authorFirstName} {comment.authorLastName}
                                            </p>
                                            <p className="text-[8px] sm:text-[9px] text-muted-foreground">
                                                {createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : 'just now'}
                                            </p>
                                        </div>
                                        {isAuthor && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    "h-6 w-6 shrink-0 text-destructive transition-opacity",
                                                    isMobile ? "opacity-100" : "absolute -right-8 top-0 opacity-0 group-hover:opacity-100"
                                                )}
                                                onClick={() => handleDeleteComment(comment.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                                        {comment.text}
                                    </p>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <p className="text-[10px] sm:text-xs text-muted-foreground italic px-1">No comments yet. Be the first to encourage!</p>
                )}
            </div>

            {user && (
                <form onSubmit={handleSendComment} className="flex gap-2 items-center pt-2">
                    <Input
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="text-xs sm:text-sm h-8 sm:h-9"
                        disabled={isSending}
                    />
                    <Button type="submit" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" disabled={!newComment.trim() || isSending}>
                        {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            )}
        </div>
    );
}
