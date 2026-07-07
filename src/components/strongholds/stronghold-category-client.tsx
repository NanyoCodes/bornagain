
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
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
    Search,
    BookOpen,
    HandHeart,
    ChevronDown,
    Youtube,
    FileText,
    Mic,
    LinkIcon,
    Library,
    PlusCircle,
    ExternalLink
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { CircleResource } from '@/lib/types';

const categoryScriptures: Record<string, { verse: string; text: string; prayer: string }[]> = {
  pride: [
    { verse: "Proverbs 16:18", text: "Pride goes before destruction, a haughty spirit before a fall.", prayer: "Lord, strip away my pride and clothe me in Your humility. Let me never forget that You are the source of my strength. Amen." },
    { verse: "James 4:6", text: "God opposes the proud but shows favor to the humble.", prayer: "I choose to humble myself before You today, Lord. May Your favor rest upon me as I decrease and You increase. Amen." },
    { verse: "1 Peter 5:5", text: "Clothe yourselves, all of you, with humility toward one another.", prayer: "Holy Spirit, help me to serve others with a genuine heart, free from the need for recognition or praise. Amen." }
  ],
  lust: [
    { verse: "1 Corinthians 10:13", text: "No temptation has overtaken you except what is common to mankind. And God is faithful; he will not let you be tempted beyond what you can bear.", prayer: "Lord, I thank You for providing a way out. I choose Your path of escape and declare my freedom in Christ. Amen." },
    { verse: "Matthew 5:28", text: "But I tell you that anyone who looks at a woman lustfully has already committed adultery with her in his heart.", prayer: "Father, purify my vision and my heart. Let my eyes see only what is holy and honoring to You. Amen." }
  ],
  fear: [
    { verse: "2 Timothy 1:7", text: "For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.", prayer: "I reject the spirit of fear and claim the power, love, and sound mind You have given me, Lord. Amen." },
    { verse: "Psalm 34:4", text: "I sought the Lord, and he answered me; he delivered me from all my fears.", prayer: "Thank You for hearing my cry, Father. I stand delivered from every shadow of anxiety today. Amen." }
  ],
  unforgiveness: [
    { verse: "Matthew 6:14-15", text: "For if you forgive other people when they sin against you, your heavenly Father will also forgive you.", prayer: "Lord, grant me the grace to release those who have hurt me, just as You have forgiven me. Amen." }
  ],
  anger: [
    { verse: "James 1:19-20", text: "Everyone should be quick to listen, slow to speak and slow to become angry, because human anger does not produce the righteousness that God desires.", prayer: "Lord, put a guard over my mouth and a peace in my spirit. Let Your righteousness be my response. Amen." }
  ],
  addiction: [
    { verse: "1 Corinthians 6:12", text: "I will not be mastered by anything.", prayer: "I declare that only Jesus is my Master. No substance or habit has authority over my life. Amen." },
    { verse: "John 8:36", text: "So if the Son sets you free, you will be free indeed.", prayer: "Jesus, You have set me free. I receive my total deliverance today. I am free indeed! Amen." }
  ],
  laziness: [
    { verse: "Colossians 3:23", text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.", prayer: "I offer my work today as an act of worship to You, Jesus. Let me be productive for Your Kingdom. Amen." }
  ],
  unbelief: [
    { verse: "Mark 9:24", text: "I do believe; help me overcome my unbelief!", prayer: "Lord, I choose to trust You. Where my faith is weak, strengthen it by Your Spirit. Amen." }
  ],
  other: [
    { verse: "Philippians 4:13", text: "I can do all this through him who gives me strength.", prayer: "Whatever I face today, I have the victory through Your power, Jesus. Amen." }
  ]
};

function getResourceIcon(type: string) {
    switch (type) {
        case 'Video': return <Youtube className="h-4 w-4 text-red-500" />;
        case 'Article': return <FileText className="h-4 w-4 text-blue-500" />;
        case 'Book': return <Library className="h-4 w-4 text-primary" />;
        case 'Sermon': return <Mic className="h-4 w-4 text-orange-500" />;
        default: return <LinkIcon className="h-4 w-4 text-muted-foreground" />;
    }
}

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
                            <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Victory over {categoryTitle}</SheetTitle>
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
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Victory over {categoryTitle}</DialogTitle>
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
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    
    const [newPostText, setNewPostText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Resource Management
    const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);
    const [isSubmittingResource, setIsSubmittingResource] = useState(false);
    
    // Scripture Dropdown
    const [selectedVerseIdx, setSelectedVerseIdx] = useState<string>("0");
    const [amenScriptureIdx, setAmenScriptureIdx] = useState<number | null>(null);

    // Management State for Posts
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
    const categoryKey = category.toLowerCase();
    const scriptures = categoryScriptures[categoryKey] || categoryScriptures['other'];

    const postsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'victoryCircles', category.toLowerCase(), 'posts'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, category]);
    const { data: posts, loading } = useCollection<any>(postsQuery);

    const resourcesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'victoryCircles', category.toLowerCase(), 'resources'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, category]);
    const { data: resources, loading: resourcesLoading } = useCollection<CircleResource>(resourcesQuery);

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

        const authorName = isAnonymous 
            ? 'Anonymous Brethren' 
            : `${userProfile?.firstName || 'User'} ${userProfile?.lastName || ''}`.trim();

        const postData = {
            authorId: user.uid,
            authorName,
            isAnonymous,
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

    const handleCreateResource = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !firestore || !userProfile) return;
        
        const formData = new FormData(e.currentTarget);
        const title = formData.get('title') as string;
        const url = formData.get('url') as string;
        const type = formData.get('type') as any;

        if (!title || !url) return;

        setIsSubmittingResource(true);
        const resourceData = {
            title,
            url,
            type,
            authorId: user.uid,
            authorName: `${userProfile.firstName} ${userProfile.lastName}`,
            createdAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(firestore, 'victoryCircles', category.toLowerCase(), 'resources'), resourceData);
            toast({ title: 'Provision Shared', description: 'Your resource has been added to the battle supplies.' });
            setIsAddResourceOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Action Failed' });
        } finally {
            setIsSubmittingResource(false);
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

    const handleAmen = (idx: number) => {
        setAmenScriptureIdx(idx);
        toast({ title: 'Amen!', description: 'Establishing this word in your heart.' });
        setTimeout(() => setAmenScriptureIdx(null), 2000);
    };

    const activeScripture = scriptures[parseInt(selectedVerseIdx, 10)] || scriptures[0];

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
                    <h1 className="text-2xl sm:text-4xl font-black font-headline uppercase tracking-tight truncate leading-tight text-balance">Victory over {categoryTitle}</h1>
                </div>
            </div>

            <Card className="rounded-none sm:rounded-[2.5rem] border-x-0 sm:border-x shadow-xl overflow-hidden bg-primary text-primary-foreground">
                <CardContent className="p-8 sm:p-10 space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                            <ShieldCheck className="h-6 w-6 text-white" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-black uppercase tracking-tight leading-tight">Shared Transparency</h2>
                            <p className="text-sm font-medium text-white/80 leading-relaxed text-balance">
                                Bringing struggles into the Light of the Body reveals the path to victory. Share your story or strategy below.
                            </p>
                        </div>
                    </div>
                    
                    <div className="space-y-4 pt-2">
                        <Textarea 
                            placeholder="Share your struggle or a victory strategy..."
                            value={newPostText}
                            onChange={(e) => setNewPostText(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 min-h-[120px] rounded-2xl text-base focus-visible:ring-white/30"
                        />
                        <div className="flex items-center space-x-2 px-1">
                            <Checkbox 
                                id="anonymous-toggle" 
                                checked={isAnonymous} 
                                onCheckedChange={(val) => setIsAnonymous(!!val)}
                                className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-primary"
                            />
                            <Label htmlFor="anonymous-toggle" className="text-xs font-bold text-white/80 cursor-pointer uppercase tracking-widest">Post Anonymously</Label>
                        </div>
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

            {/* Armor of the Word - Dropdown Version */}
            <section className="space-y-4 px-4 sm:px-0">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                        <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black uppercase tracking-tight">Armor of the Word</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select your weapon</p>
                    </div>
                </div>

                <Card className="rounded-[1.5rem] sm:rounded-[2rem] border-2 border-dashed bg-muted/5 overflow-hidden">
                    <CardHeader className="p-4 sm:p-6 pb-2">
                        <Select value={selectedVerseIdx} onValueChange={setSelectedVerseIdx}>
                            <SelectTrigger className="h-12 rounded-xl bg-background shadow-md border-primary/20 text-primary font-black uppercase tracking-widest text-xs">
                                <SelectValue placeholder="Choose Armor" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                {scriptures.map((s, idx) => (
                                    <SelectItem key={idx} value={idx.toString()} className="rounded-lg font-bold uppercase text-[10px] tracking-widest">
                                        {s.verse}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-8 pt-4">
                        <div className="space-y-6">
                            <div className="relative pl-6 border-l-4 border-primary/20 bg-background p-5 rounded-r-3xl shadow-inner group">
                                <Quote className="absolute top-2 right-4 h-12 w-12 opacity-5 rotate-12 transition-transform group-hover:scale-110" />
                                <p className="text-base sm:text-lg text-muted-foreground italic leading-relaxed text-justify text-balance">
                                    &ldquo;{activeScripture.text}&rdquo;
                                </p>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary text-right mt-4">— {activeScripture.verse}</p>
                            </div>
                            <div className="p-5 bg-primary/[0.03] rounded-2xl border border-dashed border-primary/20">
                                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/60 mb-2">
                                    <HandHeart className="h-3 w-3" /> Victory Prayer
                                </div>
                                <p className="text-sm font-medium leading-relaxed text-foreground/70 italic">
                                    &ldquo;{activeScripture.prayer}&rdquo;
                                </p>
                                <div className="pt-4">
                                    <Button 
                                        onClick={() => handleAmen(parseInt(selectedVerseIdx, 10))}
                                        variant="outline" 
                                        size="sm" 
                                        className={cn(
                                            "h-8 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest transition-all",
                                            amenScriptureIdx === parseInt(selectedVerseIdx, 10) ? "bg-primary text-white border-none scale-105 shadow-lg" : "bg-background hover:bg-primary/5 text-primary/60 hover:text-primary"
                                        )}
                                    >
                                        {amenScriptureIdx === parseInt(selectedVerseIdx, 10) ? <Check className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                                        AMEN
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Kingdom Provisions - Resources Box */}
            <section className="space-y-6 px-4 sm:px-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center shadow-inner">
                            <Library className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-lg font-black uppercase tracking-tight">Kingdom Provisions</h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Shared battle supplies</p>
                        </div>
                    </div>
                    <Button onClick={() => setIsAddResourceOpen(true)} variant="outline" size="sm" className="h-9 rounded-xl font-black uppercase tracking-widest text-[9px] border-primary/20 text-primary hover:bg-primary/5 shadow-sm">
                        <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> DROP PROVISION
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {resourcesLoading ? (
                        <div className="col-span-full flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
                    ) : resources && resources.length > 0 ? (
                        resources.map(res => (
                            <Card key={res.id} className="rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden hover:shadow-lg transition-all group">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-muted/50 border flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                                        {getResourceIcon(res.type)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <Badge variant="outline" className="h-4 px-1.5 text-[7px] font-black uppercase tracking-tighter bg-background/50">{res.type}</Badge>
                                            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest truncate opacity-60">By {res.authorName}</span>
                                        </div>
                                        <h4 className="font-black text-xs uppercase tracking-tight truncate leading-tight mb-2">{res.title}</h4>
                                        <Button asChild variant="ghost" size="sm" className="h-7 p-0 hover:bg-transparent hover:text-primary transition-colors text-[9px] font-black uppercase tracking-widest">
                                            <a href={res.url} target="_blank" rel="noopener noreferrer">
                                                GO TO RESOURCE <ExternalLink className="ml-1.5 h-3 w-3" />
                                            </a>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-16 border-2 border-dashed rounded-[2rem] bg-muted/5">
                            <p className="text-xs text-muted-foreground italic font-medium px-12">No provisions dropped yet. Share a sermon or article that helped you!</p>
                        </div>
                    )}
                </div>
            </section>

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

            {/* Drop Provision Dialog */}
            <Dialog open={isAddResourceOpen} onOpenChange={setIsAddResourceOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                    <div className="p-8 border-b bg-muted/10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Drop Provision</DialogTitle>
                            <DialogDescription className="text-sm font-medium mt-1">Share a resource that fueled your victory.</DialogDescription>
                        </DialogHeader>
                    </div>
                    <form onSubmit={handleCreateResource}>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Type of Supply</Label>
                                <Select name="type" defaultValue="Video">
                                    <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                                        <SelectValue placeholder="Resource Type" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        <SelectItem value="Video">Video / YouTube</SelectItem>
                                        <SelectItem value="Article">Article / Link</SelectItem>
                                        <SelectItem value="Sermon">Sermon / Audio</SelectItem>
                                        <SelectItem value="Book">Book Title / PDF</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Title</Label>
                                <Input name="title" placeholder="e.g. Breaking Chains Sermon" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">URL / Link</Label>
                                <Input name="url" placeholder="https://..." className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" required />
                            </div>
                        </div>
                        <div className="p-8 bg-muted/5 border-t flex gap-3">
                            <Button type="button" variant="outline" onClick={() => setIsAddResourceOpen(false)} className="flex-1 h-12 rounded-xl font-bold">Cancel</Button>
                            <Button type="submit" disabled={isSubmittingResource} className="flex-1 h-12 rounded-xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest">
                                {isSubmittingResource && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                SHARE SUPPLY
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
            
            <footer className="text-center pt-12 border-t mt-12 px-8">
                <p className="text-xs text-muted-foreground italic font-medium leading-relaxed max-w-md mx-auto text-balance">
                    "Confess your faults one to another, and pray one for another, that ye may be healed. The effectual fervent prayer of a righteous man availeth much." — James 5:16
                </p>
            </footer>
        </div>
    );
}
