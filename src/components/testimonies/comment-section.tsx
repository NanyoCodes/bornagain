'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { TestimonyComment, UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Trash2, HandHeart, Sparkles, PartyPopper, X, Edit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn, safeToDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import Link from 'next/link';

function CommentAuthorAvatar({ userId, fallbackInitials, className }: { userId: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userRef = useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const photoURL = profile?.photoURL;
    
    return (
        <Avatar className={className}>
            <AvatarImage src={photoURL} />
            <AvatarFallback className="font-bold">{fallbackInitials || 'U'}</AvatarFallback>
        </Avatar>
    );
}

function CommentItem({ 
    comment, 
    testimonyId, 
    level = 0,
    onReply,
    children
}: { 
    comment: TestimonyComment, 
    testimonyId: string, 
    level?: number,
    onReply: (comment: TestimonyComment) => void,
    children?: React.ReactNode
}) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [isReacting, setIsReacting] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(comment.text);

    const createdAt = safeToDate(comment.createdAt);
    const updatedAt = safeToDate(comment.updatedAt);
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

    const handleUpdate = () => {
        if (!editedText.trim()) return;
        if (editedText.trim() === comment.text) {
            setIsEditing(false);
            return;
        }

        const commentRef = doc(firestore, 'testimonies', testimonyId, 'comments', comment.id);
        updateDoc(commentRef, { 
            text: editedText.trim(),
            updatedAt: serverTimestamp() 
        }).catch(() => {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update comment.' });
        });
        setIsEditing(false);
    };

    const authorName = `${comment.authorFirstName || 'User'} ${comment.authorLastName || ''}`.trim();
    const profileLink = isAuthor ? "/dashboard/profile" : `/dashboard/profile/${comment.authorId}`;
    const initials = comment.authorFirstName?.charAt(0) || 'U';

    return (
        <div className={cn("space-y-4", level > 0 && (isMobile ? "ml-4" : "ml-10"))}>
            <div className="flex gap-2 sm:gap-4 items-start group relative">
                <Link href={profileLink} className="shrink-0">
                    <CommentAuthorAvatar 
                        userId={comment.authorId} 
                        fallbackInitials={initials}
                        className={cn(
                            "shrink-0 hover:opacity-80 transition-opacity shadow-sm border", 
                            level > 0 ? (isMobile ? "h-5 w-5" : "h-7 w-7") : "h-8 w-8 sm:h-10 sm:w-10"
                        )}
                    />
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="bg-muted/30 rounded-2xl p-3 sm:p-4 relative border">
                        <div className="flex justify-between items-start mb-1 gap-2">
                            <div className="min-w-0 flex-1">
                                <Link href={profileLink} className="hover:underline decoration-primary/30 underline-offset-2">
                                    <p className="text-sm font-bold truncate leading-tight">
                                        {authorName}
                                    </p>
                                </Link>
                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 opacity-70">
                                    {createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : 'just now'}
                                    {updatedAt && <span className="ml-2">• edited</span>}
                                </p>
                            </div>
                            {isAuthor && !isEditing && (
                                <div className={cn(
                                    "flex items-center gap-1 shrink-0",
                                    isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"
                                )}>
                                    <button
                                        className="h-6 w-6 text-muted-foreground hover:text-primary transition-all rounded-full hover:bg-primary/10 flex items-center justify-center"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        className="h-6 w-6 text-destructive/60 hover:text-destructive transition-all rounded-full hover:bg-destructive/10 flex items-center justify-center"
                                        onClick={handleDelete}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {isEditing ? (
                            <div className="space-y-3 py-1">
                                <Input 
                                    value={editedText}
                                    onChange={(e) => setEditedText(e.target.value)}
                                    className="h-9 text-sm bg-background"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleUpdate();
                                        if (e.key === 'Escape') {
                                            setIsEditing(false);
                                            setEditedText(comment.text);
                                        }
                                    }}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold uppercase tracking-widest" onClick={() => {
                                        setIsEditing(false);
                                        setEditedText(comment.text);
                                    }}>Cancel</Button>
                                    <Button size="sm" className="h-7 text-[10px] font-bold uppercase tracking-widest" onClick={handleUpdate}>Save</Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                                {comment.text}
                            </p>
                        )}
                        
                        {(supporters.length > 0 || inspiredBy.length > 0 || connectedBy.length > 0) && (
                            <div className="absolute -bottom-2.5 right-2 flex items-center gap-1 bg-background border rounded-full px-1.5 py-0.5 shadow-sm z-10">
                                <div className="flex items-center -space-x-1">
                                    {supporters.length > 0 && <HandHeart className="h-3 w-3 text-primary fill-current" />}
                                    {inspiredBy.length > 0 && <Sparkles className="h-3 w-3 text-chart-3 fill-current" />}
                                    {connectedBy.length > 0 && <PartyPopper className="h-3 w-3 text-blue-500" />}
                                </div>
                                <span className="text-[10px] font-bold px-0.5 leading-none text-muted-foreground">
                                    {(supporters.length + inspiredBy.length + connectedBy.length)}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 px-1">
                        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap">
                            <button 
                                onClick={() => handleReaction('amen')}
                                disabled={isReacting !== null}
                                className={cn("text-xs font-bold transition-colors hover:text-primary py-1", hasAmened ? "text-primary" : "text-muted-foreground")}
                            >
                                Amen
                            </button>
                            <button 
                                onClick={() => handleReaction('inspired')}
                                disabled={isReacting !== null}
                                className={cn("text-xs font-bold transition-colors hover:text-chart-3 py-1", hasInspired ? "text-chart-3" : "text-muted-foreground")}
                            >
                                Hallelujah
                            </button>
                            <button 
                                onClick={() => handleReaction('celebrate')}
                                disabled={isReacting !== null}
                                className={cn("text-xs font-bold transition-colors hover:text-blue-500 py-1", hasCelebrated ? "text-blue-500" : "text-muted-foreground")}
                            >
                                Celebrate
                            </button>
                            {!isEditing && (
                                <button 
                                    onClick={() => onReply(comment)}
                                    className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors py-1"
                                >
                                    Reply
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {children}
        </div>
    );
}

export function CommentSection({ testimonyId }: { testimonyId: string }) {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [newComment, setNewMessage] = useState('');
    const [replyingTo, setReplyingTo] = useState<TestimonyComment | null>(null);
    const [isSending, setIsSending] = useState(false);

    const { userProfile: profile, loading: profileLoading } = useUserProfile();

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

    const renderComment = (comment: TestimonyComment, level = 0) => {
        const children = repliesMap[comment.id] || [];
        const indentLevel = level > 3 ? 3 : level;
        
        return (
            <CommentItem 
                key={comment.id} 
                comment={comment} 
                testimonyId={testimonyId} 
                level={indentLevel}
                onReply={setReplyingTo}
            >
                {children.map(child => renderComment(child, level + 1))}
            </CommentItem>
        );
    };

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden bg-background">
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
                <div className="space-y-6 p-4 sm:p-6 pb-24">
                    {(loading || userLoading || (profileLoading && !profile)) ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>
                    ) : topLevelComments.length > 0 ? (
                        topLevelComments.map(comment => renderComment(comment))
                    ) : (
                        <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed mx-2 flex flex-col items-center">
                             <Sparkles className="h-10 w-10 text-muted-foreground/20 mb-4" />
                             <p className="text-sm text-muted-foreground italic px-8 text-balance">No comments yet. Be the first to share a word of encouragement!</p>
                        </div>
                    )}
                </div>
            </div>

            {user && (
                <div className="shrink-0 p-3 sm:p-4 border-t bg-background/80 backdrop-blur-md shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]">
                    {replyingTo && (
                        <div className="flex items-center justify-between bg-primary/5 px-4 py-2 rounded-t-2xl text-[11px] text-muted-foreground border-x border-t mb-0 border-primary/20">
                            <p className="truncate">Replying to <span className="font-bold text-primary">{replyingTo.authorFirstName}</span></p>
                            <button onClick={() => setReplyingTo(null)} className="hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted">
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSendComment} className={cn("flex gap-2 items-center", replyingTo && "border-x border-b p-1.5 rounded-b-2xl bg-muted/5 border-primary/20")}>
                        <Input
                            placeholder={replyingTo ? "Write your reply..." : "Encourage with a comment..."}
                            value={newComment}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="text-sm sm:text-base h-11 sm:h-12 shadow-inner rounded-2xl focus-visible:ring-primary/20 border-muted-foreground/20"
                            disabled={isSending || profileLoading}
                        />
                        <Button type="submit" size="icon" className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-2xl shadow-lg transition-transform active:scale-90" disabled={!newComment.trim() || isSending || profileLoading}>
                            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </Button>
                    </form>
                </div>
            )}
        </div>
    );
}