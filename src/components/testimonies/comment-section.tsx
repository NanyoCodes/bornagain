'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { TestimonyComment, UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Trash2, HandHeart, Sparkles, PartyPopper, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn, safeToDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useIsMobile } from '@/hooks/use-mobile';

function CommentItem({ 
    comment, 
    testimonyId, 
    isReply = false, 
    onReply 
}: { 
    comment: TestimonyComment, 
    testimonyId: string, 
    isReply?: boolean, 
    onReply?: (comment: TestimonyComment) => void 
}) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [isReacting, setIsReacting] = useState<string | null>(null);

    const createdAt = safeToDate(comment.createdAt);
    const isAuthor = user?.uid === comment.authorId;

    const supporters = comment.supporters || [];
    const inspiredBy = comment.inspiredBy || [];
    const connectedBy = comment.connectedBy || [];

    const hasAmened = user ? supporters.includes(user.uid) : false;
    const hasInspired = user ? inspiredBy.includes(user.uid) : false;
    const hasCelebrated = user ? connectedBy.includes(user.uid) : false;

    const handleReaction = async (type: 'amen' | 'inspired' | 'celebrate') => {
        if (!user || !firestore) return;
        setIsReacting(type);

        const commentRef = doc(firestore, 'testimonies', testimonyId, 'comments', comment.id);
        const field = type === 'amen' ? 'supporters' : type === 'inspired' ? 'inspiredBy' : 'connectedBy';
        const hasReacted = type === 'amen' ? hasAmened : type === 'inspired' ? hasInspired : hasCelebrated;

        const updatePayload = {
            [field]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid)
        };

        try {
            await updateDoc(commentRef, updatePayload);
        } catch (error) {
            console.error("Reaction failed", error);
        } finally {
            setIsReacting(null);
        }
    };

    const handleDelete = async () => {
        if (!user || !firestore) return;
        try {
            await deleteDoc(doc(firestore, 'testimonies', testimonyId, 'comments', comment.id));
            toast({ title: 'Comment deleted' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete comment.' });
        }
    };

    return (
        <div className={cn("flex gap-2 sm:gap-3 items-start group relative", isReply && "ml-8 sm:ml-10")}>
            <Avatar className={cn("shrink-0", isReply ? "h-5 w-5 sm:h-6 sm:w-6" : "h-6 w-6 sm:h-7 sm:w-7")}>
                <AvatarImage src={comment.authorAvatarUrl} />
                <AvatarFallback className="text-[8px] sm:text-[10px]">{comment.authorFirstName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="bg-muted/30 rounded-lg p-2 sm:p-2.5 relative">
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
                                    "h-5 w-5 shrink-0 text-destructive transition-opacity",
                                    isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}
                                onClick={handleDelete}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                        {comment.text}
                    </p>
                    
                    {/* Reaction Counts Overlay */}
                    {(supporters.length > 0 || inspiredBy.length > 0 || connectedBy.length > 0) && (
                        <div className="absolute -bottom-2 right-1 flex items-center gap-0.5 bg-background border rounded-full px-1 py-0.5 shadow-sm z-10">
                            {supporters.length > 0 && <HandHeart className="h-2.5 w-2.5 text-primary fill-current" />}
                            {inspiredBy.length > 0 && <Sparkles className="h-2.5 w-2.5 text-chart-3 fill-current" />}
                            {connectedBy.length > 0 && <PartyPopper className="h-2.5 w-2.5 text-blue-500" />}
                            <span className="text-[8px] font-bold px-0.5 leading-none">{supporters.length + inspiredBy.length + connectedBy.length}</span>
                        </div>
                    )}
                </div>

                {/* Action Row */}
                <div className="flex items-center gap-3 mt-1 px-1">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => handleReaction('amen')}
                            disabled={isReacting !== null}
                            className={cn("text-[9px] sm:text-[10px] font-bold transition-colors hover:text-primary", hasAmened ? "text-primary" : "text-muted-foreground")}
                        >
                            Amen
                        </button>
                        <button 
                            onClick={() => handleReaction('inspired')}
                            disabled={isReacting !== null}
                            className={cn("text-[9px] sm:text-[10px] font-bold transition-colors hover:text-chart-3", hasInspired ? "text-chart-3" : "text-muted-foreground")}
                        >
                            Inspired
                        </button>
                        <button 
                            onClick={() => handleReaction('celebrate')}
                            disabled={isReacting !== null}
                            className={cn("text-[9px] sm:text-[10px] font-bold transition-colors hover:text-blue-500", hasCelebrated ? "text-blue-500" : "text-muted-foreground")}
                        >
                            Celebrate
                        </button>
                        {!isReply && onReply && (
                            <button 
                                onClick={() => onReply(comment)}
                                className="text-[9px] sm:text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Reply
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function CommentSection({ testimonyId }: { testimonyId: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [newComment, setNewMessage] = useState('');
    const [replyingTo, setReplyingTo] = useState<TestimonyComment | null>(null);
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

    const topLevelComments = useMemo(() => comments?.filter(c => !c.parentId) || [], [comments]);
    const repliesMap = useMemo(() => {
        const map: Record<string, TestimonyComment[]> = {};
        comments?.forEach(c => {
            if (c.parentId) {
                if (!map[c.parentId]) map[c.parentId] = [];
                map[c.parentId].push(c);
            }
        });
        return map;
    }, [comments]);

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
            parentId: replyingTo?.id || null,
            supporters: [],
            inspiredBy: [],
            connectedBy: [],
        };

        try {
            await addDoc(collection(firestore, 'testimonies', testimonyId, 'comments'), commentData);
            setNewMessage('');
            setReplyingTo(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to post comment.' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-4 pt-4 border-t mt-4">
            <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Community Engagement</h4>
            
            <div className="space-y-6">
                {loading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin opacity-20" /></div>
                ) : topLevelComments.length > 0 ? (
                    topLevelComments.map(comment => (
                        <div key={comment.id} className="space-y-4">
                            <CommentItem 
                                comment={comment} 
                                testimonyId={testimonyId} 
                                onReply={setReplyingTo}
                            />
                            {repliesMap[comment.id]?.map(reply => (
                                <CommentItem 
                                    key={reply.id} 
                                    comment={reply} 
                                    testimonyId={testimonyId} 
                                    isReply 
                                />
                            ))}
                        </div>
                    ))
                ) : (
                    <p className="text-[10px] sm:text-xs text-muted-foreground italic px-1">No comments yet. Be the first to encourage!</p>
                )}
            </div>

            {user && (
                <div className="space-y-2">
                    {replyingTo && (
                        <div className="flex items-center justify-between bg-muted/20 px-3 py-1 rounded-md text-[10px] text-muted-foreground animate-in slide-in-from-bottom-1 duration-200">
                            <p className="truncate">Replying to <strong>{replyingTo.authorFirstName}</strong></p>
                            <button onClick={() => setReplyingTo(null)} className="hover:text-foreground">
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSendComment} className="flex gap-2 items-center">
                        <Input
                            placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                            value={newComment}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="text-xs sm:text-sm h-8 sm:h-9"
                            disabled={isSending}
                            autoFocus={!!replyingTo}
                        />
                        <Button type="submit" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" disabled={!newComment.trim() || isSending}>
                            {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                </div>
            )}
        </div>
    );
}