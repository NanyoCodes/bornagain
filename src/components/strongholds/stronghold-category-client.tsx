'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
    Video,
    Book,
    FileText,
    Mic,
    Globe,
    ExternalLink,
    Plus,
    Target,
    MoreHorizontal,
    User
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { CommentSection } from '../testimonies/comment-section';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { CircleResource } from '@/lib/types';

const categoryScriptures: Record<string, { verse: string; text: string; prayer: string }[]> = {
  insecurity: [
    { verse: "Psalm 91:1-2", text: "Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. I will say of the Lord, 'He is my refuge and my fortress, my God, in whom I trust.'", prayer: "Lord, I refuse to live in fear. You are my refuge and my safe house. I rest secure under Your wings today. Amen." },
    { verse: "Proverbs 3:25-26", text: "Have no fear of sudden disaster... for the Lord will be at your side and will keep your foot from being snared.", prayer: "Father, I trust You to be my constant companion. Guard my steps and preserve my peace in every season. Amen." },
    { verse: "Isaiah 54:14", text: "In righteousness you will be established: Tyranny will be far from you; you will have nothing to fear. Terror will be far removed; it will not come near you.", prayer: "I declare that terror and fear have no place in my heart or my home. I am established in Your righteousness. Amen." }
  ],
  kidnapping: [
    { verse: "Psalm 124:7", text: "We have escaped like a bird from the fowler’s snare; the snare has been broken, and we have escaped.", prayer: "Lord, I speak a total break of every snare of captivity. Deliver the innocent and lead them to safety by Your mighty hand. Amen." },
    { verse: "Isaiah 49:25", text: "But this is what the Lord says: 'Yes, captives will be taken from warriors, and plunder retrieved from the fierce; I will contend with those who contend with you, and your children I will save.'", prayer: "I stand on Your promise to contend with the fierce. Rescue the captives and save our children, O God. Amen." },
    { verse: "Psalm 18:48", text: "He delivers me from my enemies; You exalt me above those who rise up against me; You rescue me from the violent man.", prayer: "Thank You for being a Rescuer. Deliver us from the hands of violent men and establish our safety. Amen." }
  ],
  violent_crime: [
    { verse: "Psalm 34:17", text: "The righteous cry out, and the Lord hears them; he delivers them from all their troubles.", prayer: "We cry out for our land, Lord. Deliver us from the plague of violence and murder. Let Your peace reign. Amen." },
    { verse: "Psalm 55:9", text: "Lord, confuse the wicked, confound their words, for I see violence and strife in the city.", prayer: "Confuse the plans of the wicked, Father. Frustrate the counsel of those who plot destruction in our cities. Amen." },
    { verse: "Matthew 10:28", text: "Do not be afraid of those who kill the body but cannot kill the soul.", prayer: "I refuse to be intimidated by the spirit of death. My life is hidden in Christ, and my eternity is secure. Amen." }
  ],
  pride: [
    { verse: "Proverbs 16:18", text: "Pride goes before destruction, a haughty spirit before a fall.", prayer: "Lord, strip away my pride and clothe me in Your humility. Let me never forget that You are the source of my strength. Amen." },
    { verse: "James 4:6", text: "God opposes the proud but shows favor to the humble.", prayer: "I choose to humble myself before You today, Lord. May Your favor rest upon me as I decrease and You increase. Amen." },
    { verse: "1 Peter 5:5", text: "Clothe yourselves, all of you, with humility toward one another.", prayer: "Holy Spirit, help me to serve others with a genuine heart, free from the need for recognition or praise. Amen." }
  ],
  anxiety: [
    { verse: "1 Peter 5:7", text: "Cast all your anxiety on him because he cares for you.", prayer: "Lord, I release every heavy burden and anxious thought to You. I trust that You care for me deeply. Amen." },
    { verse: "Philippians 4:6-7", text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", prayer: "I trade my worry for Your peace that surpasses understanding. Guard my heart and mind in Christ Jesus. Amen." },
    { verse: "Matthew 6:34", text: "Therefore do not worry about tomorrow, for tomorrow will worry about itself.", prayer: "Help me to live fully in today, trusting Your provision for every moment. Amen." }
  ],
  lust: [
    { verse: "1 Corinthians 10:13", text: "No temptation has overtaken you except what is common to mankind. And God is faithful; he will not let you be tempted beyond what you can bear.", prayer: "Lord, I thank You for providing a way out. I choose Your path of escape and declare my freedom in Christ. Amen." },
    { verse: "Matthew 5:28", text: "But I tell you that anyone who looks at a woman lustfully has already committed adultery with her in his heart.", prayer: "Father, purify my vision and my heart. Let my eyes see only what is holy and honoring to You. Amen." },
    { verse: "1 John 2:16", text: "For everything in the world—the lust of the flesh, the lust of the eyes, and the pride of life—comes not from the Father but from the world.", prayer: "I reject the cravings of this world. I feast my soul on Your presence and Your Word. Amen." }
  ],
  other: [
    { verse: "Isaiah 41:10", text: "So do not fear, for I am with you; do not be dismayed, for I am your God.", prayer: "I cast out fear today. You are my God, and You are holding my hand. Amen." },
    { verse: "Philippians 4:13", text: "I can do all this through him who gives me strength.", prayer: "Whatever I face today, I have the victory through Your power, Jesus. Amen." },
    { verse: "Romans 8:37", text: "No, in all these things we are more than conquerors through him who loved us.", prayer: "I am more than a conqueror! I walk in the victory of Your love today. Amen." }
  ]
};

function PostResponsesDialog({ post, categoryTitle, children }: { post: any, categoryTitle: string, children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = useState(false);
    const postDate = safeToDate(post.createdAt);

    const header = (
        <div className="p-8 border-b bg-muted/10 shrink-0 text-left flex items-center justify-between gap-4">
            <div className="min-w-0 text-left">
                <div className="flex items-center gap-2 mb-2 text-left">
                    <Zap className="h-4 w-4 text-primary text-left" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Circle Conversation</span>
                </div>
                <h2 className="text-2xl font-black font-headline uppercase tracking-tight text-left">Victory over {categoryTitle}</h2>
                <p className="text-sm font-medium mt-1 text-left">Community responses and spiritual solutions.</p>
            </div>
            <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60 hover:text-foreground" onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5 text-left" />
            </Button>
        </div>
    );

    const content = (
        <div className="flex flex-col h-full overflow-hidden text-left">
            <div className="p-6 border-b bg-muted/5 shrink-0 text-left">
                <div className="flex items-center gap-3 mb-4 text-left">
                    <div className="h-10 w-10 rounded-full bg-muted/20 flex items-center justify-center border shadow-inner text-left">
                        <Users className="h-5 w-5 text-muted-foreground/40 text-left" />
                    </div>
                    <div className="min-w-0 text-left">
                        <p className="text-sm font-black uppercase tracking-tight text-left">{post.authorName}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left">
                            {postDate ? format(postDate, 'PPP') : 'Just now'}
                        </p>
                    </div>
                </div>
                <div className="relative pl-6 border-l-4 border-primary/20 bg-muted/5 p-4 rounded-r-2xl shadow-inner mb-2 text-left">
                    <Quote className="absolute top-2 right-4 h-12 w-12 opacity-5 rotate-12 text-left" />
                    <p className="text-sm text-muted-foreground leading-relaxed italic font-medium text-left">
                        &ldquo;{post.text}&rdquo;
                    </p>
                </div>
            </div>
            
            <div className="flex-grow min-h-0 flex flex-col text-left">
                <div className="p-4 sm:p-6 pb-2 shrink-0 text-left">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60 text-left">
                        <Zap className="h-3.5 w-3.5 text-left" /> Circle Responses & Solutions
                    </div>
                </div>
                <div className="flex-1 min-h-0 text-left">
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
                    {header}
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
            <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left text-left">
                {header}
                <div className="flex-grow min-h-0 text-left">
                    {content}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function AddArmorDialog({ category, onArmorAdded }: { category: string, onArmorAdded: () => void }) {
  const { user } = useUser();
  const { userProfile } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [verse, setVerse] = useState('');
  const [text, setText] = useState('');
  const [comment, setComment] = useState('');

  const handleBibleSearch = async () => {
    if (!verse.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://bible-api.com/${encodeURIComponent(verse)}`);
      if (response.ok) {
        const data = await response.json();
        setVerse(data.reference);
        setText(data.text.trim());
        toast({ title: 'Word Found' });
      } else {
        toast({ variant: 'destructive', title: 'Not Found', description: 'Reference e.g. John 3:16' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Search Error' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !verse.trim() || !text.trim()) return;

    setIsSubmitting(true);
    const armorData = {
        verse: verse.trim(),
        text: text.trim(),
        comment: comment.trim(),
        authorId: user.uid,
        authorName: `${userProfile?.firstName || 'User'} ${userProfile?.lastName || ''}`.trim(),
        createdAt: serverTimestamp(),
        supporters: []
    };

    try {
        await addDoc(collection(firestore, 'victoryCircles', category.toLowerCase(), 'armor'), armorData);
        toast({ title: 'Word Established' });
        setIsOpen(false);
        setVerse('');
        setText('');
        setComment('');
        onArmorAdded();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Action Failed' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const header = (
    <div className="p-8 border-b bg-muted/10 shrink-0 text-left flex items-center justify-between gap-4">
        <div className="min-w-0 text-left">
            <DialogHeader className="p-0 text-left">
                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Equip the Body</DialogTitle>
                <DialogDescription className="text-sm font-medium text-left">Add a scripture and your revelation to the circle.</DialogDescription>
            </DialogHeader>
        </div>
        <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60 hover:text-foreground" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5 text-left" />
        </Button>
    </div>
  );

  const formContent = (
    <form id="add-armor-form" onSubmit={handleAdd} className="p-8 space-y-6 text-left text-left">
        <div className="space-y-4 text-left text-left">
            <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Scripture Reference</Label>
                <div className="relative text-left">
                    <Input 
                        placeholder="e.g., Romans 8:31" 
                        value={verse} 
                        onChange={e => setVerse(e.target.value)} 
                        required 
                        className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold pr-20 text-left" 
                    />
                    <Button 
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 text-[9px] font-black uppercase text-primary hover:bg-primary/10 text-left"
                        onClick={handleBibleSearch}
                        disabled={isSearching || !verse.trim()}
                    >
                        {isSearching ? <Loader2 className="h-3 w-3 animate-spin text-left" /> : "SEARCH"}
                    </Button>
                </div>
            </div>
            <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">The Word</Label>
                <Textarea placeholder="Type or search for the scripture text..." value={text} onChange={e => setText(e.target.value)} required className="min-h-[120px] rounded-xl bg-muted/20 border-none shadow-inner text-base text-left" />
            </div>
            <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Personal Comment / Revelation</Label>
                <Textarea placeholder="How did this Word help you overcome?" value={comment} onChange={e => setComment(e.target.value)} className="min-h-[100px] rounded-xl bg-muted/20 border-none shadow-inner text-base text-left" />
            </div>
        </div>
    </form>
  );

  const footer = (
    <div className="p-8 bg-muted/5 border-t flex flex-col sm:flex-row gap-3 shrink-0 text-left">
        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 rounded-xl h-12 font-bold text-left">Cancel</Button>
        <Button type="submit" form="add-armor-form" disabled={isSubmitting} className="flex-1 rounded-xl h-12 font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-center text-left">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" /> : 'CONTRIBUTE'}
        </Button>
    </div>
  );

  if (isMobile) {
    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full shadow-lg border-primary/20 text-primary hover:bg-primary/5 shrink-0 text-left">
                    <Plus className="h-5 w-5 text-left" />
                    <span className="sr-only text-left">Add Scripture</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                {header}
                <ScrollArea className="flex-grow text-left">{formContent}</ScrollArea>
                {footer}
            </SheetContent>
        </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full shadow-lg border-primary/20 text-primary hover:bg-primary/5 shrink-0 text-left">
                <Plus className="h-5 w-5 text-left" />
                <span className="sr-only text-left">Add Scripture</span>
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left">
            {header}
            <ScrollArea className="flex-1 min-h-0 text-left">
                {formContent}
            </ScrollArea>
            {footer}
        </DialogContent>
    </Dialog>
  );
}

function ShareResourceDialog({ category, onResourceAdded }: { category: string, onResourceAdded: () => void }) {
  const { user } = useUser();
  const { userProfile } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'Video' | 'Article' | 'Book' | 'Sermon' | 'Other'>('Video');
  const [description, setDescription] = useState('');

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !title.trim() || !url.trim()) return;

    setIsSubmitting(true);
    const resourceData = {
        title: title.trim(),
        url: url.trim(),
        type,
        description: description.trim(),
        authorId: user.uid,
        authorName: `${userProfile?.firstName || 'User'} ${userProfile?.lastName || ''}`.trim(),
        createdAt: serverTimestamp(),
    };

    try {
        await addDoc(collection(firestore, 'victoryCircles', category.toLowerCase(), 'resources'), resourceData);
        toast({ title: 'Resource Shared' });
        setIsOpen(false);
        setTitle('');
        setUrl('');
        setDescription('');
        onResourceAdded();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Action Failed' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const header = (
    <div className="p-8 border-b bg-muted/10 shrink-0 text-left flex items-center justify-between gap-4">
        <div className="min-w-0 text-left">
            <DialogHeader className="p-0 text-left text-left">
                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Add to Armory</DialogTitle>
                <DialogDescription className="text-sm font-medium text-left text-left">Share a resource that helped you overcome.</DialogDescription>
            </DialogHeader>
        </div>
        <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background text-muted-foreground/60 hover:text-foreground text-left" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5 text-left" />
        </Button>
    </div>
  );

  const formContent = (
    <form id="share-resource-form" onSubmit={handleShare} className="p-8 space-y-6 text-left">
        <div className="space-y-4 text-left">
            <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Resource Title</Label>
                <Input placeholder="e.g., Understanding Grace Video" value={title} onChange={e => setTitle(e.target.value)} required className="h-11 rounded-xl bg-muted/20 border-none shadow-inner text-left" />
            </div>
            <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Type</Label>
                <Select value={type} onValueChange={(val: any) => setType(val)}>
                    <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none shadow-inner text-left text-left text-left">
                        <SelectValue className="text-left text-left text-left" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl text-left text-left">
                        <SelectItem value="Video" className="rounded-lg text-left text-left text-left">Video</SelectItem>
                        <SelectItem value="Article" className="rounded-lg text-left text-left text-left text-left">Article</SelectItem>
                        <SelectItem value="Book" className="rounded-lg text-left text-left text-left text-left">Book</SelectItem>
                        <SelectItem value="Sermon" className="rounded-lg text-left text-left text-left text-left">Sermon</SelectItem>
                        <SelectItem value="Other" className="rounded-lg text-left text-left text-left text-left">Other</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2 text-left text-left text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left">URL / Link</Label>
                <Input type="url" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} required className="h-11 rounded-xl bg-muted/20 border-none shadow-inner text-left text-left" />
            </div>
            <div className="space-y-2 text-left text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Description (Optional)</Label>
                <Textarea placeholder="How did this help you?" value={description} onChange={e => setDescription(e.target.value)} className="min-h-[100px] rounded-xl bg-muted/20 border-none shadow-inner text-base text-left text-left" />
            </div>
        </div>
    </form>
  );

  const footer = (
    <div className="p-8 bg-muted/5 border-t flex flex-col sm:flex-row gap-3 shrink-0 text-left">
        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 rounded-xl h-12 font-bold text-left text-left">Cancel</Button>
        <Button type="submit" form="share-resource-form" disabled={isSubmitting} className="flex-1 rounded-xl h-12 font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-center text-left text-left">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left" /> : 'SHARE NOW'}
        </Button>
    </div>
  );

  if (isMobile) {
    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full shadow-lg border-primary/20 text-primary hover:bg-primary/5 shrink-0 text-left">
                    <PlusCircle className="h-5 w-5 text-left text-left" />
                    <span className="sr-only text-left">Share Resource</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
                {header}
                <ScrollArea className="flex-grow text-left">{formContent}</ScrollArea>
                {footer}
            </SheetContent>
        </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full shadow-lg border-primary/20 text-primary hover:bg-primary/5 shrink-0 text-left">
                <PlusCircle className="h-5 w-5 text-left text-left" />
                <span className="sr-only text-left">Share Resource</span>
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left text-left">
            {header}
            <ScrollArea className="flex-1 min-h-0 text-left text-left">
                {formContent}
            </ScrollArea>
            {footer}
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
    
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [amenScriptureIdx, setAmenScriptureIdx] = useState<number | string | null>(null);

    const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
    const categoryKey = category.toLowerCase().replace(/-/g, '_');
    const scriptures = categoryScriptures[categoryKey] || categoryScriptures['other'];

    const postsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'victoryCircles', categoryKey, 'posts'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, categoryKey]);
    const { data: posts, loading: loadingPosts } = useCollection<any>(postsQuery);

    const resourcesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'victoryCircles', categoryKey, 'resources'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, categoryKey]);
    const { data: resources, loading: loadingResources } = useCollection<CircleResource>(resourcesQuery);

    const contributedArmorQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'victoryCircles', categoryKey, 'armor'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, categoryKey]);
    const { data: contributedArmor, loading: loadingArmor } = useCollection<any>(contributedArmorQuery);

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
            category: categoryKey,
            text: newPostText.trim(),
            createdAt: serverTimestamp(),
            supporters: []
        };

        try {
            await addDoc(collection(firestore, 'victoryCircles', categoryKey, 'posts'), postData);
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

        const postRef = doc(firestore, 'victoryCircles', categoryKey, 'posts', postId);
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
        const postRef = doc(firestore, 'victoryCircles', categoryKey, 'posts', postId);
        try {
            await deleteDoc(postRef);
            toast({ title: 'Post Removed' });
        } catch (error) {
            console.error(error);
        }
    };

    const handleAmen = (idx: number | string) => {
        setAmenScriptureIdx(idx);
        toast({ title: 'Amen!', description: 'May this word be established in your heart.' });
        setTimeout(() => setAmenScriptureIdx(null), 2000);
    };

    const getResourceIcon = (type: string) => {
        switch (type) {
            case 'Video': return <Video className="h-5 w-5 text-red-500" />;
            case 'Book': return <Book className="h-5 w-5 text-blue-500" />;
            case 'Article': return <FileText className="h-5 w-5 text-emerald-500" />;
            case 'Sermon': return <Mic className="h-5 w-5 text-purple-500" />;
            default: return <Globe className="h-5 w-5 text-primary" />;
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-32 text-left">
            <header className="flex items-center gap-4 px-4 sm:px-0 pt-4 text-left text-left">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm text-left">
                    <ArrowLeft className="h-6 w-6 text-left" />
                </Button>
                <div className="min-w-0 flex-1 text-left text-left text-left">
                    <div className="flex items-center gap-2 mb-1 text-left text-left text-left">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary text-left text-left text-left" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left text-left">Victory Hub</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black font-headline uppercase tracking-tight truncate leading-tight text-balance text-left text-left text-left">Victory over {categoryTitle}</h1>
                </div>
            </header>

            <Card className="rounded-none sm:rounded-[2.5rem] border-x-0 sm:border-x shadow-xl overflow-hidden bg-primary text-primary-foreground mx-4 sm:mx-0 text-left text-left text-left">
                <CardContent className="p-8 sm:p-10 space-y-6 text-left text-left text-left">
                    <div className="flex items-start gap-4 text-left text-left text-left">
                        <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 text-left text-left text-left">
                            <ShieldCheck className="h-6 w-6 text-white text-left text-left text-left" />
                        </div>
                        <div className="space-y-1 text-left text-left text-left">
                            <h2 className="text-xl font-black uppercase tracking-tight leading-tight text-left text-left text-left">Lasting Solutions Through Transparency</h2>
                            <p className="text-sm font-medium text-white/80 leading-relaxed text-balance text-left text-left text-left text-left">
                                This is a sanctuary for brethren struggling with <span className="font-bold text-white underline decoration-white/30 underline-offset-4 text-left text-left">{categoryTitle}</span>. By bringing our struggles into the light of the Body, we find strength to overcome.
                            </p>
                        </div>
                    </div>
                    
                    <div className="space-y-4 pt-2 text-left text-left text-left">
                        <Textarea 
                            placeholder="Share your struggle or a victory strategy..."
                            value={newPostText}
                            onChange={(e) => setNewPostText(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 min-h-[120px] rounded-2xl text-base focus-visible:ring-white/30 text-left text-left text-left"
                        />
                        <div className="flex items-center space-x-2 px-1 text-left text-left text-left">
                            <Checkbox 
                                id="anonymous-toggle" 
                                checked={isAnonymous} 
                                onCheckedChange={(val) => setIsAnonymous(!!val)}
                                className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-primary text-left text-left text-left"
                            />
                            <Label htmlFor="anonymous-toggle" className="text-xs font-bold text-white/80 cursor-pointer uppercase tracking-widest text-left text-left text-left">Post Anonymously</Label>
                        </div>
                        <Button 
                            onClick={handleCreatePost} 
                            disabled={isSubmitting || !newPostText.trim()}
                            className="w-full h-12 bg-white text-primary hover:bg-white/90 font-black rounded-2xl shadow-2xl tracking-widest uppercase text-center text-left text-left text-left"
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left text-left" />}
                            SHARE IN THE LIGHT
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="armor" className="w-full text-left text-left text-left">
                <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-muted/40 p-1 h-12 sm:h-14 mb-8 mx-4 sm:mx-0 w-[calc(100%-2rem)] sm:w-full text-left text-left text-left">
                    <TabsTrigger value="armor" className="rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest h-full text-center text-left text-left">Armor</TabsTrigger>
                    <TabsTrigger value="discussion" className="rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest h-full text-center text-left text-left">Discussion</TabsTrigger>
                    <TabsTrigger value="resources" className="rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest h-full text-center text-left text-left">Resources</TabsTrigger>
                </TabsList>

                <TabsContent value="armor" className="space-y-6 outline-none px-4 sm:px-0 text-left text-left text-left">
                    <div className="flex items-center justify-between gap-3 text-left text-left text-left">
                        <div className="flex items-center gap-3 text-left text-left text-left">
                            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner text-left text-left text-left">
                                <BookOpen className="h-5 w-5 text-primary text-left text-left text-left" />
                            </div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-left text-left text-left">Armor of the Word</h3>
                        </div>
                        <AddArmorDialog category={categoryKey} onArmorAdded={() => {}} />
                    </div>

                    <div className="space-y-12 text-left text-left text-left">
                        <div className="space-y-4 text-left text-left text-left">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-1 text-left text-left text-left">Foundational Armor</Label>
                            <Accordion type="single" collapsible className="w-full space-y-3 text-left text-left text-left">
                                {scriptures.map((s, idx) => (
                                    <AccordionItem key={idx} value={`item-${idx}`} className="border rounded-2xl overflow-hidden px-4 bg-muted/10 group/item transition-all hover:bg-muted/20 text-left text-left text-left">
                                        <AccordionTrigger className="hover:no-underline py-4 text-left text-left text-left">
                                            <div className="flex items-center gap-3 text-left text-left text-left">
                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 text-left text-left text-left">
                                                    <span className="text-[10px] font-black text-primary text-left text-left text-left"> {idx + 1}</span>
                                                </div>
                                                <span className="text-sm font-black uppercase tracking-tight text-foreground/80 group-hover/item:text-primary transition-colors text-left text-left text-left">{s.verse}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-6 pt-2 text-left text-left text-left">
                                            <div className="space-y-6 text-left text-left text-left">
                                                <div className="relative pl-6 border-l-4 border-primary/20 bg-background/50 p-4 rounded-r-2xl shadow-inner text-left text-left text-left">
                                                    <Quote className="absolute top-2 right-4 h-12 w-12 opacity-5 rotate-12 text-left text-left text-left" />
                                                    <p className="text-base text-muted-foreground italic font-medium text-justify text-balance text-left text-left text-left">
                                                        &ldquo;{s.text}&rdquo;
                                                    </p>
                                                </div>
                                                <div className="space-y-3 p-4 bg-primary/[0.03] rounded-2xl border border-dashed border-primary/20 text-left text-left text-left">
                                                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/60 text-left text-left text-left">
                                                        <HandHeart className="h-3 w-3 text-left text-left text-left" /> Victory Prayer
                                                    </div>
                                                    <p className="text-sm font-medium leading-relaxed text-foreground/70 text-balance italic text-left text-left text-left">
                                                        &ldquo;{s.prayer}&rdquo;
                                                    </p>
                                                    <div className="pt-2 text-left text-left text-left">
                                                        <Button 
                                                            onClick={() => handleAmen(idx)}
                                                            variant="outline" 
                                                            size="sm" 
                                                            className={cn(
                                                                "h-8 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest transition-all text-left text-left text-left",
                                                                amenScriptureIdx === idx ? "bg-primary text-white border-none scale-105 shadow-lg" : "bg-background hover:bg-primary/5 text-primary/60 hover:text-primary"
                                                            )}
                                                        >
                                                            {amenScriptureIdx === idx ? <Check className="h-3.5 w-3.5 text-left text-left" /> : <Sparkles className="h-3.5 w-3.5 text-left text-left" />}
                                                            AMEN
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="pt-4 border-t border-dashed space-y-4 text-left text-left text-left">
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1 text-left text-left text-left">
                                                        <MessageSquare className="h-3.5 w-3.5 text-left text-left text-left" /> Armor Responses
                                                    </div>
                                                    <CommentSection path={`victoryCircles/${categoryKey}/foundational_armor/${idx}/comments`} inline />
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>

                        {contributedArmor && contributedArmor.length > 0 && (
                            <div className="space-y-6 text-left text-left text-left">
                                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-1 text-left text-left text-left">Community Contributions</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left text-left text-left">
                                    {contributedArmor.map((arm: any) => (
                                        <Card key={arm.id} className="rounded-[2rem] border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col h-full text-left text-left text-left">
                                            <CardHeader className="p-6 pb-2 text-left text-left text-left">
                                                <div className="flex justify-between items-start mb-3 text-left text-left text-left">
                                                    <Badge variant="outline" className="h-5 px-2 text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/20 text-left text-left text-left">{arm.verse}</Badge>
                                                    <Sparkles className="h-4 w-4 text-primary opacity-20 text-left text-left text-left" />
                                                </div>
                                                <div className="relative pl-4 border-l-4 border-primary/20 bg-muted/20 p-4 rounded-r-2xl shadow-inner text-left text-left text-left">
                                                    <Quote className="absolute top-1 right-3 h-8 w-8 opacity-5 text-left text-left text-left" />
                                                    <p className="text-sm text-muted-foreground italic font-medium leading-relaxed text-left text-left text-left">&ldquo;{arm.text}&rdquo;</p>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-6 pt-2 flex-grow text-left text-left text-left">
                                                {arm.comment && (
                                                    <div className="space-y-2 text-left text-left text-left">
                                                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest text-left text-left text-left">Revelation</p>
                                                        <p className="text-xs text-foreground font-medium leading-relaxed text-left text-left text-left">{arm.comment}</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                            <CardFooter className="p-4 bg-muted/5 border-t flex items-center justify-between text-left text-left text-left">
                                                <div className="flex items-center gap-2 text-left text-left text-left">
                                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse text-left text-left text-left" />
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest text-left text-left text-left">BY {arm.authorName}</p>
                                                </div>
                                                <Button variant="ghost" size="sm" className="h-7 rounded-lg text-[9px] font-black text-primary uppercase text-left text-left text-left" onClick={() => handleAmen(arm.id)}>
                                                    <HandHeart className="mr-1.5 h-3 w-3 text-left text-left text-left" /> AMEN
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="discussion" className="space-y-6 outline-none px-4 sm:px-0 text-left text-left text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left text-left text-left">
                        <div className="flex items-center gap-3 text-left text-left text-left">
                            <div className="h-10 w-10 rounded-2xl bg-muted/20 flex items-center justify-center shadow-inner text-left text-left text-left">
                                <MessageSquare className="h-5 w-5 text-muted-foreground text-left text-left text-left" />
                            </div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-left text-left text-left">Circle Discussions</h3>
                        </div>
                        <div className="relative flex-1 max-w-sm text-left text-left text-left">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 text-left text-left text-left" />
                            <Input 
                                placeholder="Search discussions..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="h-11 pl-11 rounded-2xl bg-muted/20 border-none shadow-inner text-sm text-left text-left text-left"
                            />
                        </div>
                    </div>

                    <div className="space-y-6 text-left text-left text-left">
                        {loadingPosts ? (
                            <div className="flex justify-center py-20 text-left text-left text-left text-left"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20 text-left text-left text-left" /></div>
                        ) : filteredPosts && filteredPosts.length > 0 ? (
                            filteredPosts.map((post: any) => {
                                const postDate = safeToDate(post.createdAt);
                                const isAuthor = user?.uid === post.authorId;
                                const isEditing = editingPostId === post.id;

                                return (
                                    <Card key={post.id} className="rounded-[2rem] border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden border-b-8 border-b-primary/5 text-left text-left text-left">
                                        <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between text-left text-left text-left">
                                            <div className="flex items-center gap-3 text-left text-left text-left">
                                                <div className="h-10 w-10 rounded-full bg-muted/20 flex items-center justify-center border shadow-inner text-left text-left text-left">
                                                    <Users className="h-5 w-5 text-muted-foreground/40 text-left text-left text-left" />
                                                </div>
                                                <div className="min-w-0 text-left text-left text-left">
                                                    <p className="text-sm font-black uppercase tracking-tight text-left text-left text-left">{post.authorName}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left text-left text-left">
                                                        {postDate ? format(postDate, 'PPP') : 'Just now'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-left text-left text-left">
                                                {isAuthor && !isEditing && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-left text-left text-left">
                                                                <MoreHorizontal className="h-4 w-4 text-left text-left text-left" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="rounded-xl text-left text-left text-left text-left">
                                                            <DropdownMenuItem onSelect={() => { setEditingPostId(post.id); setEditingText(post.text); }} className="text-left text-left text-left">
                                                                <Edit className="mr-2 h-4 w-4 text-primary text-left text-left text-left" /> Edit Story
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="text-left text-left text-left text-left" />
                                                            <DropdownMenuItem onSelect={() => handleDeletePost(post.id)} className="text-destructive focus:text-destructive text-left text-left text-left text-left">
                                                                <Trash2 className="mr-2 h-4 w-4 text-left text-left text-left text-left" /> Remove from Circle
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6 pt-4 text-left text-left text-left">
                                            {isEditing ? (
                                                <div className="space-y-4 text-left text-left text-left">
                                                    <Textarea 
                                                        value={editingText}
                                                        onChange={(e) => setEditingText(e.target.value)}
                                                        className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner text-base text-left text-left text-left"
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-2 text-left text-left text-left">
                                                        <Button variant="ghost" size="sm" onClick={() => setEditingPostId(null)} className="rounded-xl font-bold text-left text-left text-left">
                                                            <X className="mr-1 h-3 w-3 text-left text-left text-left" /> Cancel
                                                        </Button>
                                                        <Button size="sm" onClick={() => handleUpdatePost(post.id)} disabled={isUpdating || !editingText.trim()} className="rounded-xl font-black uppercase tracking-widest text-[10px] text-center text-left text-left text-left">
                                                            {isUpdating ? <Loader2 className="mr-1 h-3 w-3 animate-spin text-left text-left text-left" /> : <Check className="mr-1 h-3 w-3 text-left text-left text-left" />}
                                                            Save Changes
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <PostResponsesDialog post={post} categoryTitle={categoryTitle}>
                                                    <button className="w-full text-left outline-none group/post text-left text-left text-left">
                                                        <div className="relative pl-6 border-l-4 border-primary/20 bg-muted/5 p-4 rounded-r-2xl shadow-inner transition-all hover:bg-muted/10 active:scale-[0.99] text-left text-left text-left">
                                                            <Quote className="absolute top-2 right-4 h-12 w-12 opacity-5 rotate-12 text-left text-left text-left" />
                                                            <p className="text-base text-muted-foreground leading-relaxed italic font-medium text-left text-left text-left">
                                                                &ldquo;{post.text}&rdquo;
                                                            </p>
                                                        </div>
                                                    </button>
                                                </PostResponsesDialog>
                                            )}
                                        </CardContent>
                                        <CardFooter className="p-3 bg-muted/5 flex justify-between items-center text-left text-left text-left">
                                             <div className="flex items-center gap-2 px-3 text-left text-left text-left">
                                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse text-left text-left text-left" />
                                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60 text-left text-left text-left">Victory Support Active</span>
                                             </div>
                                             <PostResponsesDialog post={post} categoryTitle={categoryTitle}>
                                                <Button variant="ghost" size="sm" className="h-8 rounded-xl font-black uppercase tracking-widest text-[9px] text-primary text-center text-left text-left text-left">
                                                    Participate
                                                </Button>
                                             </PostResponsesDialog>
                                        </CardFooter>
                                    </Card>
                                );
                            })
                        ) : (
                            <div className="text-center py-24 border-2 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center mx-4 sm:mx-0 text-left text-left text-left">
                                <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6 text-left text-left text-left">
                                    <Sparkles className="h-10 w-10 text-muted-foreground opacity-10 text-left text-left text-left" />
                                </div>
                                <h4 className="text-xl font-black uppercase tracking-tight opacity-40 text-center text-left text-left text-left">Circle Silence</h4>
                                <p className="text-sm text-muted-foreground italic mt-2 px-12 max-w-sm text-balance text-center text-left text-left text-left">No brethren have shared in this circle yet. Be the first to bring a word of encouragement or a struggle into the light.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="resources" className="space-y-6 outline-none px-4 sm:px-0 text-left text-left text-left">
                    <div className="flex items-center justify-between gap-4 text-left text-left text-left">
                        <div className="flex items-center gap-3 text-left text-left text-left">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center shadow-inner text-left text-left text-left">
                                <Target className="h-5 w-5 text-indigo-600 text-left text-left text-left" />
                            </div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-left text-left text-left">Kingdom Armory</h3>
                        </div>
                        <ShareResourceDialog category={categoryKey} onResourceAdded={() => {}} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left text-left text-left">
                        {loadingResources ? (
                            [...Array(4)].map((_, i) => (
                                <Card key={i} className="h-32 rounded-2xl animate-pulse bg-muted/30 border-none text-left text-left text-left" />
                            ))
                        ) : resources && resources.length > 0 ? (
                            resources.map(res => (
                                <Card key={res.id} className="rounded-2xl border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden hover:shadow-md transition-all text-left text-left text-left">
                                    <CardContent className="p-5 text-left text-left text-left">
                                        <div className="flex items-start justify-between mb-3 text-left text-left text-left">
                                            <div className="h-10 w-10 rounded-xl bg-muted/5 flex items-center justify-center shrink-0 border text-left text-left text-left">
                                                {getResourceIcon(res.type)}
                                            </div>
                                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest text-left text-left text-left">{res.type}</Badge>
                                        </div>
                                        <h4 className="font-black text-sm uppercase tracking-tight truncate text-left text-left text-left">{res.title}</h4>
                                        {res.description && <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 italic text-left text-left text-left">{res.description}</p>}
                                        <div className="flex items-center justify-between mt-4 text-left text-left text-left">
                                            <p className="text-[8px] font-bold text-muted-foreground uppercase text-left text-left text-left">Shared by {res.authorName}</p>
                                            <Button variant="ghost" size="sm" asChild className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 text-center text-left text-left">
                                                <a href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-left text-left text-left">
                                                    Open <ExternalLink className="ml-1 h-2.5 w-2.5 text-left text-left text-left" />
                                                </a>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-muted/5 flex flex-col items-center text-left text-left text-left">
                                <PlusCircle className="h-12 w-12 text-muted-foreground opacity-10 mb-4 text-left text-left text-left" />
                                <p className="text-sm text-muted-foreground italic text-left text-left text-left">The armory is empty. Share a supply to help others!</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
            
            <footer className="text-center pt-12 border-t mt-12 px-8 text-left text-left text-left">
                <p className="text-xs text-muted-foreground italic font-medium leading-relaxed font-serif text-balance text-center text-left text-left text-left">
                    "Confess your faults one to another, and pray one for another, that ye may be healed. The effectual fervent prayer of a righteous man availeth much." — James 5:16
                </p>
            </footer>
        </div>
    );
}