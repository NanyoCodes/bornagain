'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { 
    collection, 
    query, 
    addDoc, 
    serverTimestamp, 
    doc, 
    orderBy,
    where 
} from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
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
    Quote
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { CommentSection } from '../testimonies/comment-section';

export function StrongholdCategoryClient({ category }: { category: string }) {
    const router = useRouter();
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [newPostText, setNewPostText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);

    const postsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'victoryCircles', category.toLowerCase(), 'posts'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, category]);

    const { data: posts, loading } = useCollection<any>(postsQuery);

    const handleCreatePost = async () => {
        if (!user || !firestore || !newPostText.trim()) return;
        setIsSubmitting(true);

        const postData = {
            authorId: user.uid,
            authorName: 'Anonymous Brethren', // Keep it anonymous to encourage sharing
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
                    <h1 className="text-2xl sm:text-4xl font-black font-headline uppercase tracking-tight truncate leading-tight">{categoryTitle} Community</h1>
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
                            <p className="text-sm font-medium text-white/80 leading-relaxed">
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
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-muted/20 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight">Circle Discussions</h3>
                </div>

                <div className="space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>
                    ) : posts && posts.length > 0 ? (
                        posts.map((post: any) => {
                            const postDate = safeToDate(post.createdAt);
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
                                        <Badge variant="outline" className="h-5 text-[9px] font-black uppercase tracking-widest bg-background/50">{categoryTitle}</Badge>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-4">
                                        <div className="relative pl-6 border-l-4 border-primary/20 bg-muted/5 p-4 rounded-r-2xl shadow-inner">
                                            <Quote className="absolute top-2 right-4 h-12 w-12 opacity-5 rotate-12" />
                                            <p className="text-base text-muted-foreground leading-relaxed italic font-medium">
                                                &ldquo;{post.text}&rdquo;
                                            </p>
                                            <div className="mt-4 flex items-center gap-2 text-primary/60">
                                                <MessageSquare className="h-4 w-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">View Responses</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-0 border-t bg-muted/10">
                                        <div className="w-full">
                                            <div className="p-6 pb-2">
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60 mb-4">
                                                    <Zap className="h-3.5 w-3.5" /> Circle Responses & Solutions
                                                </div>
                                                <CommentSection path={`victoryCircles/${category.toLowerCase()}/posts/${post.id}/comments`} inline />
                                            </div>
                                        </div>
                                    </CardFooter>
                                </Card>
                            );
                        })
                    ) : (
                        <div className="text-center py-24 border-2 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center">
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
