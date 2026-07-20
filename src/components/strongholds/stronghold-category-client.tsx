'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth, useFirestore, useCollection, useUserProfile } from '@/firebase';
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
import { Input } from '@/components/ui/input';
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
    PlusCircle,
    Link as LinkIcon,
    Youtube,
    FileText,
    Mic,
    ExternalLink,
    Library,
    Target,
    MoreHorizontal
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { CommentSection } from '../testimonies/comment-section';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  anger: [
    { verse: "James 1:19-20", text: "Everyone should be quick to listen, slow to speak and slow to become angry, because human anger does not produce the righteousness that God desires.", prayer: "Lord, put a guard over my mouth and a peace in my spirit. Let Your righteousness be my response. Amen." }
  ],
  poverty: [
    { verse: "2 Corinthians 8:9", text: "For you know the grace of our Lord Jesus Christ, that though he was rich, yet for your sake he became poor, so that you through his poverty might become rich.", prayer: "Lord Jesus, I thank You for Your sacrifice. I break the mindset of lack and declare that through Your poverty, I have been made rich in grace and provision. Amen." }
  ],
  other: [
    { verse: "Philippians 4:13", text: "I can do all this through him who gives me strength.", prayer: "Whatever I face today, I have the victory through Your power, Jesus. Amen." },
    { verse: "Romans 8:37", text: "No, in all these things we are more than conquerors through him who loved us.", prayer: "I am more than a conqueror! I walk in the victory of Your love today. Amen." }
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
        <div className="flex flex-col h-full overflow-hidden text-left">
            <div className="p-6 border-b bg-muted/5 shrink-0 text-left">
                <div className="flex items-center gap-3 mb-4 text-left">
                    <div className="h-10 w-10 rounded-full bg-muted/20 flex items-center justify-center border shadow-inner">
                        <Users className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                    <div className="min-w-0 text-left">
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
                <SheetTrigger asChild onClick={(e) => e.stopPropagation()}>{children}</SheetTrigger>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                        <SheetHeader className="text-left flex-shrink-0">
                            <div className="flex items-center gap-2 mb-2 text-left">
                                <Zap className="h-4 w-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Circle Conversation</span>
                            </div>
                            <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-balance">Victory over {categoryTitle}</SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1 text-left">Community responses and spiritual solutions.</SheetDescription>
                        </SheetHeader>
                    </div>
                    <div className="flex-grow min-h-0 text-left">
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
            <DialogContent className="sm:max-w-xl max-h-[85vh] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl flex flex-col text-left">
                <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Victory over {categoryTitle}</DialogTitle>
                        <DialogDescription className="text-base font-medium">Shared wisdom and encouragement for victory.</DialogDescription>
                    </DialogHeader>
                </div>
                <div className="flex-grow min-h-0 text-left">
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
    const [mounted, setMounted] = useState(false);
    
    const [newPostText, setNewPostText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Resource Management
    const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);
    const [resourceToEdit, setResourceToEdit] = useState<CircleResource | null>(null);
    const [isSubmittingResource, setIsSubmittingResource] = useState(false);
    
    // Scripture Dropdown
    const [selectedVerseIdx, setSelectedVerseIdx] = useState<string>("0");
    const [amenScriptureIdx, setAmenScriptureIdx] = useState<number | null>(null);

    // Post Management
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => { setMounted(true); }, []);

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

    const filteredResources = useMemo(() => {
        if (!resources) return [];
        if (!searchTerm) return resources;
        const term = searchTerm.toLowerCase();
        return resources.filter(res => 
            res.title.toLowerCase().includes(term) ||
            res.description?.toLowerCase().includes(term) ||
            res.authorName.toLowerCase().includes(term)
        );
    }, [resources, searchTerm]);

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

    const handleCreateOrUpdateResource = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !firestore || !userProfile) return;
        
        const formData = new FormData(e.currentTarget);
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const url = formData.get('url') as string;
        const type = formData.get('type') as any;

        if (!title || !url) return;

        setIsSubmittingResource(true);
        
        const resourceData: any = {
            title,
            description,
            url,
            type,
            updatedAt: serverTimestamp(),
        };

        try {
            if (resourceToEdit) {
                const resourceRef = doc(firestore, 'victoryCircles', category.toLowerCase(), 'resources', resourceToEdit.id);
                await updateDoc(resourceRef, resourceData);
                toast({ title: 'Resource Updated' });
            } else {
                resourceData.authorId = user.uid;
                resourceData.authorName = `${userProfile.firstName} ${userProfile.lastName}`;
                resourceData.createdAt = serverTimestamp();
                await addDoc(collection(firestore, 'victoryCircles', category.toLowerCase(), 'resources'), resourceData);
                toast({ title: 'Provision Shared', description: 'Your resource has been added.' });
            }
            setIsAddResourceOpen(false);
            setResourceToEdit(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Action Failed' });
        } finally {
            setIsSubmittingResource(false);
        }
    };

    const handleDeleteResource = async (resourceId: string) => {
        if (!user || !firestore) return;
        const resourceRef = doc(firestore, 'victoryCircles', category.toLowerCase(), 'resources', resourceId);
        try {
            await deleteDoc(resourceRef);
            toast({ title: 'Resource Removed' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Action Failed' });
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

    const supplyForm = (
        <form onSubmit={handleCreateOrUpdateResource} className="text-left">
            <div className="p-8 space-y-6 text-left">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Type of Supply</Label>
                    <Select name="type" defaultValue={resourceToEdit?.type || "Video"}>
                        <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left">
                            <SelectValue placeholder="Resource Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                            <SelectItem value="Video" className="rounded-lg">Video / YouTube</SelectItem>
                            <SelectItem value="Article" className="rounded-lg">Article / Link</SelectItem>
                            <SelectItem value="Sermon" className="rounded-lg">Sermon / Audio</SelectItem>
                            <SelectItem value="Book" className="rounded-lg">Book Title / PDF</SelectItem>
                            <SelectItem value="Other" className="rounded-lg">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Title</Label>
                    <Input name="title" defaultValue={resourceToEdit?.title} placeholder="e.g. Breaking Chains" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left" required />
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Description</Label>
                    <Textarea name="description" defaultValue={resourceToEdit?.description} placeholder="e.g. A message on identity..." className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner" />
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">URL / Link</Label>
                    <Input name="url" defaultValue={resourceToEdit?.url} placeholder="https://..." className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" required />
                </div>
            </div>
            <div className="p-8 bg-muted/5 border-t flex gap-3 text-left">
                <Button type="button" variant="outline" onClick={() => { setIsAddResourceOpen(false); setResourceToEdit(null); }} className="flex-1 h-12 rounded-xl font-bold">Cancel</Button>
                <Button type="submit" disabled={isSubmittingResource} className="flex-1 h-12 rounded-xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest">
                    {isSubmittingResource && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {resourceToEdit ? 'SAVE CHANGES' : 'SHARE SUPPLY'}
                </Button>
            </div>
        </form>
    );

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-32 w-full text-left">
            <header className="px-4 sm:px-0 space-y-6 pt-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-left">
                    <div className="flex items-center gap-4 text-left">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className="min-w-0 text-left">
                            <div className="flex items-center gap-2 mb-1 text-left">
                                <Users className="h-3.5 w-3.5 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Victory Circle</span>
                            </div>
                            <h1 className="text-2xl sm:text-4xl font-black font-headline tracking-tight truncate leading-tight text-balance">Victory over {categoryTitle}</h1>
                        </div>
                    </div>

                    <div className="relative flex-grow max-w-md text-left">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40" />
                        <Input 
                            placeholder={`Search this circle...`} 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="h-12 pl-12 rounded-[1.5rem] bg-muted/20 border-none shadow-inner text-base font-bold"
                        />
                    </div>
                </div>
            </header>

            <Tabs defaultValue="discussions" className="w-full text-left">
                <div className="px-4 sm:px-0 mb-8 text-left">
                    <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/40 p-1 rounded-2xl text-left">
                        <TabsTrigger value="word" className="font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 h-full">
                            <BookOpen className="h-3.5 w-3.5" /> Word
                        </TabsTrigger>
                        <TabsTrigger value="discussions" className="font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 h-full">
                            <MessageSquare className="h-3.5 w-3.5" /> Circle
                        </TabsTrigger>
                        <TabsTrigger value="supplies" className="font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 h-full">
                            <Library className="h-3.5 w-3.5" /> Supplies
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="word" className="space-y-6 outline-none text-left">
                    <section className="space-y-4 px-4 sm:px-0 text-left">
                        <div className="flex items-center gap-3 text-left">
                            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                                <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <h3 className="text-lg font-black uppercase tracking-tight">Armor of the Word</h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select your weapon</p>
                            </div>
                        </div>

                        <Card className="rounded-[1.5rem] sm:rounded-[2.5rem] border-2 border-dashed bg-muted/5 overflow-hidden text-left">
                            <CardHeader className="p-4 sm:p-6 pb-2 text-left">
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
                            <CardContent className="p-4 sm:p-8 pt-4 text-left">
                                <div className="space-y-6 text-left">
                                    <div className="relative pl-6 border-l-4 border-primary/20 bg-background p-5 rounded-r-3xl shadow-inner group text-left">
                                        <Quote className="absolute top-2 right-4 h-12 w-12 opacity-5 rotate-12 transition-transform group-hover:scale-110" />
                                        <p className="text-base text-muted-foreground italic font-medium text-balance text-left">
                                            &ldquo;{activeScripture.text}&rdquo;
                                        </p>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary text-right mt-4">— {activeScripture.verse}</p>
                                    </div>
                                    <div className="p-5 bg-primary/[0.03] rounded-2xl border border-dashed border-primary/20 text-left">
                                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/60 mb-2">
                                            <HandHeart className="h-3 w-3" /> Victory Prayer
                                        </div>
                                        <p className="text-sm font-medium leading-relaxed text-foreground/70 italic text-left">
                                            &ldquo;{activeScripture.prayer}&rdquo;
                                        </p>
                                        <div className="pt-4 flex justify-start">
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
                </TabsContent>

                <TabsContent value="supplies" className="space-y-6 outline-none text-left">
                    <section className="space-y-6 px-4 sm:px-0 text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                            <div className="flex items-center gap-3 text-left">
                                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center shadow-inner">
                                    <Library className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div className="min-w-0 text-left">
                                    <h3 className="text-lg font-black uppercase tracking-tight text-left">Kingdom Provisions</h3>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Shared battle supplies</p>
                                </div>
                            </div>
                            <Button onClick={() => { setResourceToEdit(null); setIsAddResourceOpen(true); }} variant="outline" size="sm" className="h-9 rounded-xl font-black uppercase tracking-widest text-[9px] border-primary/20 text-primary hover:bg-primary/5 shadow-sm text-left">
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> DROP PROVISION
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                            {resourcesLoading ? (
                                <div className="col-span-full flex justify-center py-12 text-left"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
                            ) : filteredResources && filteredResources.length > 0 ? (
                                filteredResources.map(res => {
                                    const isResAuthor = user?.uid === res.authorId;
                                    return (
                                    <Card key={res.id} className="rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full text-left">
                                        <CardContent className="p-4 flex flex-col gap-4 relative flex-grow text-left">
                                            <div className="flex items-center gap-4 text-left">
                                                <div className="h-12 w-12 rounded-xl bg-muted/50 border flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform text-left">
                                                    {getResourceIcon(res.type)}
                                                </div>
                                                <div className="min-w-0 flex-1 text-left">
                                                    <div className="flex items-center gap-2 mb-0.5 text-left">
                                                        <Badge variant="outline" className="h-4 px-1.5 text-[7px] font-black uppercase tracking-tighter bg-background/50">{res.type}</Badge>
                                                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest truncate opacity-60">By {res.authorName}</span>
                                                    </div>
                                                    <h4 className="font-black text-xs uppercase tracking-tight truncate leading-tight mb-2 text-left">{res.title}</h4>
                                                </div>
                                            </div>
                                            
                                            {res.description && (
                                                <p className="text-xs text-muted-foreground leading-relaxed italic px-1 text-balance text-left">
                                                    &ldquo;{res.description}&rdquo;
                                                </p>
                                            )}

                                            <Button asChild variant="ghost" size="sm" className="h-7 p-0 hover:bg-transparent hover:text-primary transition-colors text-[9px] font-black uppercase tracking-widest self-start mt-auto text-left">
                                                <a href={res.url} target="_blank" rel="noopener noreferrer">
                                                    GO TO RESOURCE <ExternalLink className="ml-1.5 h-3 w-3" />
                                                </a>
                                            </Button>

                                            {isResAuthor && (
                                                <div className="absolute top-2 right-2">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="rounded-xl">
                                                            <DropdownMenuItem onClick={() => { setResourceToEdit(res); setIsAddResourceOpen(true); }} className="rounded-lg">
                                                                <Edit className="mr-2 h-4 w-4 text-primary" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleDeleteResource(res.id)} className="text-destructive focus:text-destructive rounded-lg">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )})
                            ) : (
                                <div className="col-span-full text-center py-16 border-2 border-dashed rounded-[2rem] bg-muted/5 text-left">
                                    <p className="text-xs text-muted-foreground italic font-medium px-12 text-center text-left">
                                        {searchTerm ? "No supplies match your search." : "No provisions dropped yet. Share a sermon or article that helped you!"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
                </TabsContent>

                <TabsContent value="discussions" className="space-y-8 outline-none text-left">
                    <Card className="rounded-none sm:rounded-[2.5rem] border-x-0 sm:border-x shadow-xl overflow-hidden bg-primary text-primary-foreground mx-4 sm:mx-0 text-left">
                        <CardContent className="p-8 sm:p-10 space-y-6 text-left">
                            <div className="flex items-start gap-4 text-left">
                                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                                    <ShieldCheck className="h-6 w-6 text-white" />
                                </div>
                                <div className="space-y-1 text-left">
                                    <h2 className="text-xl font-black uppercase tracking-tight leading-tight text-left">Bring it to Light</h2>
                                    <p className="text-sm font-medium text-white/80 leading-relaxed text-balance text-left">
                                        Transparency in the body of Christ breaks the power of isolation. Share your struggle or victory below.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="space-y-4 pt-2 text-left">
                                <Textarea 
                                    placeholder="Share your struggle or a victory strategy..."
                                    value={newPostText}
                                    onChange={(e) => setNewPostText(e.target.value)}
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 min-h-[120px] rounded-2xl text-base focus-visible:ring-white/30 text-left"
                                />
                                <div className="flex items-center space-x-2 px-1 text-left">
                                    <Checkbox 
                                        id="anonymous-toggle" 
                                        checked={isAnonymous} 
                                        onCheckedChange={(val) => setIsAnonymous(!!val)}
                                        className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-primary"
                                    />
                                    <Label htmlFor="anonymous-toggle" className="text-xs font-bold text-white/80 cursor-pointer uppercase tracking-widest text-left">Post Anonymously</Label>
                                </div>
                                <Button 
                                    onClick={handleCreatePost} 
                                    disabled={isSubmitting || !newPostText.trim()}
                                    className="w-full h-12 bg-white text-primary hover:bg-white/90 font-black rounded-2xl shadow-2xl tracking-widest uppercase text-left"
                                >
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    SHARE IN THE LIGHT
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6 px-4 sm:px-0 text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                            <div className="flex items-center gap-3 text-left">
                                <div className="h-10 w-10 rounded-2xl bg-muted/20 flex items-center justify-center shadow-inner">
                                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-left">Circle Discussions</h3>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                            {loading ? (
                                <div className="col-span-full flex justify-center py-20 text-left"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20 text-left" /></div>
                            ) : filteredPosts && filteredPosts.length > 0 ? (
                                filteredPosts.map((post: any) => {
                                    const postDate = safeToDate(post.createdAt);
                                    const isAuthor = user?.uid === post.authorId;
                                    const isEditing = editingPostId === post.id;

                                    return (
                                        <Card key={post.id} className="rounded-[2rem] border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden border-b-8 border-b-primary/5 h-full flex flex-col text-left">
                                            <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between text-left">
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className="h-10 w-10 rounded-full bg-muted/20 flex items-center justify-center border shadow-inner">
                                                        <Users className="h-5 w-5 text-muted-foreground/40" />
                                                    </div>
                                                    <div className="min-w-0 text-left">
                                                        <p className="text-sm font-black uppercase tracking-tight text-left">{post.authorName}</p>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left">
                                                            {postDate ? format(postDate, 'PPP') : 'Just now'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-left">
                                                    <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-black uppercase tracking-widest bg-background/50 text-left">{categoryTitle}</Badge>
                                                    {isAuthor && !isEditing && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="rounded-xl">
                                                                <DropdownMenuItem onClick={() => { setEditingPostId(post.id); setEditingText(post.text); }} className="rounded-lg">
                                                                    <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Story
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => handleDeletePost(post.id)} className="text-destructive focus:text-destructive rounded-lg">
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Remove from Circle
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-6 pt-4 flex-grow text-left">
                                                {isEditing ? (
                                                    <div className="space-y-4 text-left">
                                                        <Textarea 
                                                            value={editingText}
                                                            onChange={(e) => setEditingText(e.target.value)}
                                                            className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner text-base text-left"
                                                            autoFocus
                                                        />
                                                        <div className="flex justify-end gap-2 text-left">
                                                            <Button variant="ghost" size="sm" onClick={() => setEditingPostId(null)} className="rounded-xl font-bold text-left">
                                                                <X className="mr-1 h-3 w-3" /> Cancel
                                                            </Button>
                                                            <Button size="sm" onClick={() => handleUpdatePost(post.id)} disabled={isUpdating || !editingText.trim()} className="rounded-xl font-black uppercase tracking-widest text-[10px] text-left">
                                                                {isUpdating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                                                                Save Changes
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <PostResponsesDialog post={post} categoryTitle={categoryTitle}>
                                                        <button className="w-full text-left outline-none group/post text-left">
                                                            <div className="relative pl-6 border-l-4 border-primary/20 bg-muted/5 p-4 rounded-r-2xl shadow-inner transition-all hover:bg-muted/10 active:scale-[0.99] text-left">
                                                                <Quote className="absolute top-2 right-4 h-12 w-12 opacity-5 rotate-12 transition-transform group-hover:scale-110" />
                                                                <p className="text-base text-muted-foreground italic font-medium text-left text-balance">
                                                                    &ldquo;{post.text}&rdquo;
                                                                </p>
                                                            </div>
                                                        </button>
                                                    </PostResponsesDialog>
                                                )}
                                            </CardContent>
                                            <CardFooter className="p-3 bg-muted/5 flex justify-between items-center mt-auto text-left">
                                                 <div className="flex items-center gap-2 px-3 text-left">
                                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse text-left" />
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60 text-left">Victory Support Active</span>
                                                 </div>
                                                 <PostResponsesDialog post={post} categoryTitle={categoryTitle}>
                                                    <Button variant="ghost" size="sm" className="h-8 rounded-xl font-black uppercase tracking-widest text-[9px] text-primary text-left">
                                                        Participate
                                                    </Button>
                                                 </PostResponsesDialog>
                                            </CardFooter>
                                        </Card>
                                    );
                                })
                            ) : (
                                <div className="col-span-full text-center py-24 border-2 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center mx-4 sm:mx-0 text-left">
                                    <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6 text-left">
                                        <Sparkles className="h-10 w-10 text-muted-foreground opacity-10 text-left" />
                                    </div>
                                    <h4 className="text-xl font-black uppercase tracking-tight opacity-40 text-left">Circle Silence</h4>
                                    <p className="text-sm text-muted-foreground italic mt-2 px-12 max-w-sm text-balance text-center text-left">
                                        {searchTerm ? "No discussions match your search." : "No brethren have shared in this circle yet. Be the first to bring a word of encouragement or a struggle into the light."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {mounted && (
                isMobile ? (
                    <Sheet open={isAddResourceOpen} onOpenChange={(open) => { setIsAddResourceOpen(open); if(!open) setResourceToEdit(null); }}>
                        <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                                <SheetHeader className="text-left flex-shrink-0 text-left">
                                    <div className="flex items-center gap-2.5 mb-1.5 text-left">
                                        <Target className="h-4 w-4 text-primary" />
                                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Supply Drop</span>
                                    </div>
                                    <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-balance">
                                        {resourceToEdit ? 'Update Provision' : 'Drop Provision'}
                                    </SheetTitle>
                                    <SheetDescription className="text-sm font-medium mt-1 text-left">Share a resource that fueled your victory.</SheetDescription>
                                </SheetHeader>
                            </div>
                            <ScrollArea className="flex-grow text-left">
                                {supplyForm}
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                ) : (
                    <Dialog open={isAddResourceOpen} onOpenChange={(open) => { setIsAddResourceOpen(open); if(!open) setResourceToEdit(null); }}>
                        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl flex flex-col max-h-[90vh] text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                                <DialogHeader className="text-left">
                                    <div className="flex items-center gap-2.5 mb-1.5 text-left">
                                        <Target className="h-4 w-4 text-primary" />
                                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Supply Drop</span>
                                    </div>
                                    <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-balance">
                                        {resourceToEdit ? 'Update Provision' : 'Drop Provision'}
                                    </SheetTitle>
                                    <SheetDescription className="text-sm font-medium mt-1 text-left">Share a resource that fueled your victory.</SheetDescription>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="flex-grow text-left">
                                {supplyForm}
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                )
            )}
            
            <footer className="text-center pt-12 border-t mt-12 px-8 text-left">
                <p className="text-xs text-muted-foreground italic font-medium leading-relaxed max-w-md mx-auto text-balance text-center text-left">
                    "Confess your faults one to another, and pray one for another, that ye may be healed. The effectual fervent prayer of a righteous man availeth much." — James 5:16
                </p>
            </footer>
        </div>
    );
}