'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth, useFirestore, useCollection } from '@/firebase';
import { 
    collection, 
    query, 
    addDoc, 
    serverTimestamp, 
    doc, 
    orderBy,
    updateDoc,
    deleteDoc,
    where 
} from 'firebase/firestore';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription,
    CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
    Loader2, 
    ArrowLeft, 
    Users, 
    MessageSquare, 
    Sparkles, 
    ShieldCheck, 
    Send,
    Flame,
    Zap,
    Quote,
    MoreVertical,
    Edit,
    Trash2,
    X,
    Check,
    Search
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { CommentSection } from '../testimonies/comment-section';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';

function PostResponsesDialog({ post, categoryTitle, children }: { post: any, categoryTitle: string, children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = useState(false);
    const postDate = safeToDate(post.createdAt);

    const content = (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b bg-muted/5 shrink-0">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-muted/20 flex items-center justify-center border shadow-inner">
                        <Users className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-black uppercase tracking-tight">{post.authorName}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {postDate ? format(postDate, 'PPP') : 'Just now'}
                        </p>
                    </div>
                </div>
                <div className="relative pl-6 border-l-4 border-primary/20 bg-muted/5 p-4 rounded-r-2xl shadow-inner mb-2">
                    <Quote className="absolute top-2 right-4 h-12 w-12 opacity-5 rotate-12" />
                    <p className="text-sm text-muted-foreground leading-relaxed italic font-medium">
                        &ldquo;{post.text}&rdquo;
                    </p>
                </div>
            </div>
            
            <div className="flex-grow min-h-0 flex flex-col">
                <div className="p-4 sm:p-6 pb-2 shrink-0">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60">
                        <Zap className="h-3.5 w-3.5" /> Circle Responses & Solutions
                    </div>
                </div>
                <div className="flex-1 min-h-0">
                    <CommentSection path={`victoryCircles/${post.category}/posts/${post.id}/comments`} />
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    {children}
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                        <SheetHeader className="text-left flex-shrink-0">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="h-4 w-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Circle Conversation</span>
                            </div>
                            <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Victory over {categoryTitle} Hub</SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1">Community responses and spiritual solutions.</SheetDescription>
                        </SheetHeader>
                    </div>
                    <div className="flex-grow min-h-0">
                        {content}
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[85vh] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl flex flex-col">
                <div className="p-8 border-b bg-muted/10 shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Victory over {categoryTitle} Discussion</DialogTitle>
                        <DialogDescription className="text-base font-medium">Shared wisdom and encouragement for victory.</DialogDescription>
                    </DialogHeader>
                </div>
                <div className="flex-grow min-h-0">
                    {content}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function StrongholdCategoryClient({ category }: { category: string }) {
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [newPostText, setNewPostText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Management State
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);

    const postsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'victoryCircles', category.toLowerCase(), 'posts'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, category]);

    const { data: posts, loading } = useCollection<any>(postsQuery);

    const filteredPosts = useMemo(() => {
        if (!posts) return [];
        if (!searchTerm) return posts;
        const term = searchTerm.toLowerCase();
        return posts.filter((post: any) => 
            post.text.toLowerCase().includes(term) ||
            post.authorName.toLowerCase().includes(term)
        );
    }, [posts, searchTerm]);

    const handleCreatePost = async () => {
        if (!user || !firestore || !newPostText.trim()) return;
        setIsSubmitting(true);

        const postData = {
            authorId: user.uid,
            authorName: 'Anonymous Brethren',
            category: category.toLowerCase(),
            text: newPostText.trim(),
            createdAt: serverTimestamp(),
            supporters: []
        };

        try {
            await addDoc(collection(firestore, 'victoryCircles', category.toLowerCase(), 'posts'), postData);
            toast({ title: 'Shared in the Light', description: 'Your honesty encourages others.' });
            setNewPostText('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdatePost = async (postId: string) => {
        if (!user || !firestore || !editingText.trim()) return;
        setIsUpdating(true);

        const postRef = doc(firestore, 'victoryCircles', category.toLowerCase(), 'posts', postId);
        try {
            await updateDoc(postRef, {
                text: editingText.trim(),
                updatedAt: serverTimestamp()
            });
            toast({ title: 'Post Updated' });
            setEditingPostId(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!user || !firestore) return;

        const postRef = doc(firestore, 'victoryCircles', category.toLowerCase(), 'posts', postId);
        try {
            await deleteDoc(postRef);
            toast({ title: 'Post Removed' });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-8 max-w-3xl mx-auto pb-32">
            <div className="flex items-center gap-4 px-4 sm:px-0 pt-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Victory Circle</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black font-headline uppercase tracking-tight truncate leading-tight">Victory over {categoryTitle}</h1>
                </div>
            </div>

            <Card className="rounded-none sm:rounded-[2.5rem] border-x-0 sm:border-x shadow-xl overflow-hidden bg-primary text-primary-foreground">
                <CardContent className="p-8 sm:p-10 space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                            <ShieldCheck className="h-6 w-6 text-white" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-black uppercase tracking-tight leading-tight">Lasting Solutions Through Transparency</h2>
                            <p className="text-sm font-medium text-white/80 leading-relaxed text-balance">
                                This is a sanctuary for brethren struggling with <span className="font-bold text-white underline decoration-white/30 underline-offset-4">{categoryTitle}</span>. By bringing our struggles into the light of the Body, we find strength to overcome.
                            </p>
                        </div>
                    </div>
                    
                    <div className="space-y-4 pt-2">
                        <Textarea 
                            placeholder="Share your struggle or a victory strategy anonymously..."
                            value={newPostText}
                            onChange={(e) => setNewPostText(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 min-h-[120px] rounded-2xl text-base focus-visible:ring-white/30"
                        />
                        <Button 
                            onClick={handleCreatePost} 
                            disabled={isSubmitting || !newPostText.trim()}
                            className="w-full h-12 bg-white text-primary hover:bg-white/90 font-black rounded-2xl shadow-2xl tracking-widest uppercase"
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            SHARE IN THE LIGHT
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6 px-4 sm:px-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-muted/20 flex items-center justify-center shadow-inner">
                            <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-tight">Circle Discussions</h3>
                    </div>
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                        <Input 
                            placeholder="Search discussions..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="h-10 pl-9 rounded-xl bg-muted/20 border-none shadow-inner text-sm"
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>
                    ) : filteredPosts && filteredPosts.length > 0 ? (
                        filteredPosts.map((post: any) => {
                            const postDate = safeToDate(post.createdAt);
                            const isOwner = user?.uid === post.authorId;
                            const isEditing = editingPostId === post.id;

                            return (
                                <Card key={post.id} className="rounded-[2rem] border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden border-b-8 border-b-primary/5">
                                    <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-muted/20 flex items-center justify-center border shadow-inner">
                                                <Users className="h-5 w-5 text-muted-foreground/40" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black uppercase tracking-tight">{post.authorName}</p>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                    {postDate ? format(postDate, 'PPP') : 'Just now'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="h-5 text-[9px] font-black uppercase tracking-widest bg-background/50">{categoryTitle}</Badge>
                                            {isOwner && !isEditing && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl">
                                                        <DropdownMenuItem onClick={() => { setEditingPostId(post.id); setEditingText(post.text); }} className="rounded-lg">
                                                            <Edit className="mr-2 h-4 w-4" /> Edit Story
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleDeletePost(post.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Remove from Circle
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-4">
                                        {isEditing ? (
                                            <div className="space-y-4">
                                                <Textarea 
                                                    value={editingText}
                                                    onChange={(e) => setEditingText(e.target.value)}
                                                    className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner text-base"
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => setEditingPostId(null)} className="rounded-xl font-bold">
                                                        <X className="mr-1 h-3 w-3" /> Cancel
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleUpdatePost(post.id)} disabled={isUpdating || !editingText.trim()} className="rounded-xl font-black uppercase tracking-widest text-[10px]">
                                                        {isUpdating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                                                        Save Changes
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <PostResponsesDialog post={post} categoryTitle={categoryTitle}>
                                                <button className="w-full text-left outline-none group/post">
                                                    <div className="relative pl-6 border-l-4 border-primary/20 bg-muted/5 p-4 rounded-r-2xl shadow-inner transition-all hover:bg-muted/10 active:scale-[0.99]">
                                                        <Quote className="absolute top-2 right-4 h-12 w-12 opacity-5 rotate-12" />
                                                        <p className="text-base text-muted-foreground leading-relaxed italic font-medium">
                                                            &ldquo;{post.text}&rdquo;
                                                        </p>
                                                    </div>
                                                </button>
                                            </PostResponsesDialog>
                                        )}
                                    </CardContent>
                                    <CardFooter className="p-3 bg-muted/5 flex justify-between items-center">
                                         <div className="flex items-center gap-2 px-3">
                                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Victory Support Active</span>
                                         </div>
                                         <PostResponsesDialog post={post} categoryTitle={categoryTitle}>
                                            <Button variant="ghost" size="sm" className="h-8 rounded-xl font-black uppercase tracking-widest text-[9px] text-primary">
                                                Participate
                                            </Button>
                                         </PostResponsesDialog>
                                    </CardFooter>
                                </Card>
                            );
                        })
                    ) : (
                        <div className="text-center py-24 border-2 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center mx-4 sm:mx-0">
                            <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6">
                                <Sparkles className="h-10 w-10 text-muted-foreground opacity-10" />
                            </div>
                            <h4 className="text-xl font-black uppercase tracking-tight opacity-40">Circle Silence</h4>
                            <p className="text-sm text-muted-foreground italic mt-2 px-12 max-w-sm text-balance">No brethren have shared in this circle yet. Be the first to bring a word of encouragement or a struggle into the light.</p>
                        </div>
                    )}
                </div>
            </div>
            
            <footer className="text-center pt-12 border-t mt-12 px-8">
                <p className="text-xs text-muted-foreground italic font-medium leading-relaxed max-w-md mx-auto text-balance">
                    "Confess your faults one to another, and pray one for another, that ye may be healed. The effectual fervent prayer of a righteous man availeth much." — James 5:16
                </p>
            </footer>
        </div>
    );
}
