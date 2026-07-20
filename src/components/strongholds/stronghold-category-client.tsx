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
    Target
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const categoryScriptures: Record<string, { verse: string; text: string; prayer: string }[]> = {
  pride: [
    { verse: "Proverbs 16:18", text: "Pride goes before destruction, a haughty spirit before a fall.", prayer: "Lord, strip away my pride and clothe me in Your humility. Let me never forget that You are the source of my strength. Amen." },
    { verse: "James 4:6", text: "God opposes the proud but shows favor to the humble.", prayer: "I choose to humble myself before You today, Lord. May Your favor rest upon me as I decrease and You increase. Amen." },
    { verse: "1 Peter 5:5", text: "Clothe yourselves, all of you, with humility toward one another.", prayer: "Holy Spirit, help me to serve others with a genuine heart, free from the need for recognition or praise. Amen." },
    { verse: "Proverbs 11:2", text: "When pride comes, then comes disgrace, but with humility comes wisdom.", prayer: "Father, give me a heart that seeks Your wisdom above my own reputation. Protect me from the snare of arrogance. Amen." },
    { verse: "Proverbs 29:23", text: "Pride brings a person low, but the lowly in spirit gain honor.", prayer: "I surrender my need to right or superior. I find my true honor in being Your child. Amen." },
    { verse: "Obadiah 1:3", text: "The pride of your heart has deceived you.", prayer: "Lord, search my heart. Remove any deception that makes me feel self-sufficient without You. Amen." },
    { verse: "Luke 14:11", text: "For all those who exalt themselves will be humbled, and those who humble themselves will be exalted.", prayer: "Jesus, I choose the lowest seat. I trust You to lift me up in Your perfect timing. Amen." }
  ],
  lust: [
    { verse: "1 Corinthians 10:13", text: "No temptation has overtaken you except what is common to mankind. And God is faithful; he will not let you be tempted beyond what you can bear.", prayer: "Lord, I thank You for providing a way out. I choose Your path of escape and declare my freedom in Christ. Amen." },
    { verse: "Matthew 5:28", text: "But I tell you that anyone who looks at a woman lustfully has already committed adultery with her in his heart.", prayer: "Father, purify my vision and my heart. Let my eyes see only what is holy and honoring to You. Amen." },
    { verse: "1 John 2:16", text: "For everything in the world—the lust of the flesh, the lust of the eyes, and the pride of life—comes not from the Father but from the world.", prayer: "I reject the cravings of this world. I feast my soul on Your presence and Your Word. Amen." },
    { verse: "2 Timothy 2:22", text: "Flee the evil desires of youth and pursue righteousness, faith, love and peace.", prayer: "Spirit, give me the strength to turn away and run toward Your righteousness. Amen." },
    { verse: "Galatians 5:16", text: "So I say, walk by the Spirit, and you will not gratify the desires of the flesh.", prayer: "I choose to walk step by step with the Holy Spirit today. Lead me away from temptation. Amen." },
    { verse: "James 1:14-15", text: "But each person is tempted when they are dragged away by their own evil desire and enticed.", prayer: "Lord, kill the roots of wrong desires in my heart. Let Your holy fire consume every ungodly urge. Amen." },
    { verse: "1 Thessalonians 4:3-5", text: "It is God’s will that you should be sanctified: that you should avoid sexual immorality.", prayer: "Sanctify me, O God. Help me to control my own body in a way that is holy and honorable. Amen." }
  ],
  anger: [
    { verse: "James 1:19-20", text: "Everyone should be quick to listen, slow to speak and slow to become angry, because human anger does not produce the righteousness that God desires.", prayer: "Lord, put a guard over my mouth and a peace in my spirit. Let Your righteousness be my response. Amen." },
    { verse: "Ephesians 4:26-27", text: "In your anger do not sin: Do not let the sun go down while you are still angry, and do not give the devil a foothold.", prayer: "I refuse to give the enemy space in my heart through bitterness. I release all anger to You before I sleep. Amen." },
    { verse: "Proverbs 14:29", text: "Whoever is patient has great understanding, but one who is quick-tempered displays folly.", prayer: "Father, grant me Your patience and a heart of understanding for those who provoke me. Amen." },
    { verse: "Proverbs 15:1", text: "A gentle answer turns away wrath, but a harsh word stirs up anger.", prayer: "Holy Spirit, season my speech with grace. Let my gentle responses diffuse every storm. Amen." },
    { verse: "Colossians 3:8", text: "But now you must also rid yourselves of all such things as these: anger, rage, malice, slander, and filthy language.", prayer: "I take off the old self and its rage. I put on Christ, who is my peace. Amen." },
    { verse: "Ecclesiastes 7:9", text: "Do not be quickly provoked in your spirit, for anger resides in the lap of fools.", prayer: "Lord, strengthen my spirit. Make me hard to offend and quick to forgive. Amen." },
    { verse: "Psalm 37:8", text: "Refrain from anger and turn from wrath; do not fret—it leads only to evil.", prayer: "I choose to rest in Your justice, Lord. I release the need to retaliate. Amen." }
  ],
  addiction: [
    { verse: "1 Corinthians 6:12", text: "I will not be mastered by anything.", prayer: "I declare that only Jesus is my Master. No substance or habit has authority over my life. Amen." },
    { verse: "Galatians 5:1", text: "It is for freedom that Christ has set us free. Stand firm, then, and do not let yourselves be burdened again by a yoke of slavery.", prayer: "I stand firm in the freedom bought by the blood of Jesus. I am no longer a slave to addiction. Amen." },
    { verse: "1 Peter 5:8", text: "Be alert and of sober mind. Your enemy the devil prowls around like a roaring lion looking for someone to devour.", prayer: "Lord, keep my mind sharp and my spirit alert. I resist the enemy and he must flee. Amen." },
    { verse: "John 8:36", text: "So if the Son sets you free, you will be free indeed.", prayer: "Jesus, You have set me free. I receive my total deliverance today. I am free indeed! Amen." },
    { verse: "Romans 6:12-14", text: "For sin shall no longer be your master, because you are not under the law, but under grace.", prayer: "I am under Your grace, Lord. Your grace provides the strength I need to overcome every craving. Amen." },
    { verse: "1 Corinthians 10:13", text: "God is faithful; he will not let you be tempted beyond what you can bear.", prayer: "I thank You, Father, that You have equipped me to handle this moment. I trust Your faithfulness. Amen." },
    { verse: "Psalm 107:13-16", text: "He brought them out of darkness, the utter darkness, and broke their chains.", prayer: "Break every chain in my life, Lord. Lead me fully into Your marvelous light. Amen." }
  ],
  laziness: [
    { verse: "Proverbs 6:6-8", text: "Go to the ant, you sluggard; consider its ways and be wise!", prayer: "Lord, give me a diligent heart that works with purpose even when no one is watching. Amen." },
    { verse: "Colossians 3:23", text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.", prayer: "I offer my work today as an act of worship to You, Jesus. Let me be productive for Your Kingdom. Amen." },
    { verse: "Proverbs 10:4", text: "Lazy hands make for poverty, but diligent hands bring wealth.", prayer: "Father, bless the work of my hands. Give me the discipline to be a good steward of my time. Amen." },
    { verse: "Proverbs 13:4", text: "A sluggard’s appetite is never filled, but the desires of the diligent are fully satisfied.", prayer: "I choose to act rather than just wish. Satisfy my soul with the fruit of my labor. Amen." },
    { verse: "Proverbs 20:4", text: "Sluggards do not plow in season; so at harvest time they look but find nothing.", prayer: "Lord, help me to recognize the seasons of work. May I not miss the opportunities You provide. Amen." },
    { verse: "2 Thessalonians 3:10", text: "For even when we were with you, we gave you this rule: 'The one who is unwilling to work shall not eat.'", prayer: "Lord, remove any sense of entitlement from me. Help me to earn my bread with integrity. Amen." },
    { verse: "Romans 12:11", text: "Never be lacking in zeal, but keep your spiritual fervor, serving the Lord.", prayer: "Ignite a fire in my spirit, Lord. Let me be fervent in my service to You and others. Amen." }
  ],
  unbelief: [
    { verse: "Mark 9:24", text: "I do believe; help me overcome my unbelief!", prayer: "Lord, I choose to trust You. Where my faith is weak, strengthen it by Your Spirit. Amen." },
    { verse: "Hebrews 11:6", text: "And without faith it is impossible to please God.", prayer: "Father, I approach You believing that You exist and that You reward those who seek You. Amen." },
    { verse: "Matthew 21:21", text: "Truly I tell you, if you have faith and do not doubt... you can say to this mountain, 'Go, throw yourself into the sea,' and it will be done.", prayer: "I speak to the mountains of doubt in my life: move in the name of Jesus! I choose faith. Amen." },
    { verse: "Romans 10:17", text: "Consequently, faith comes from hearing the message, and the message is heard through the word about Christ.", prayer: "Lord, as I read Your Word, let my faith explode. I build my life on Your promises. Amen." },
    { verse: "James 1:6", text: "But when you ask, you must believe and not doubt.", prayer: "I anchor my soul in Your truth, Lord. I will not be tossed about by the waves of doubt. Amen." },
    { verse: "Hebrews 3:12", text: "See to it, brothers and sisters, that none of you has a sinful, unbelieving heart that turns away from the living God.", prayer: "Guard my heart, O God. Keep me close to You and protect me from the hardness of unbelief. Amen." },
    { verse: "Mark 11:23", text: "Whatever you say will be done for you.", prayer: "I declare that Your Word is true. I align my speech with Your promises and expect Your move. Amen." }
  ],
  greed: [
    { verse: "Luke 12:15", text: "Watch out! Be on your guard against all kinds of greed; life does not consist in an abundance of possessions.", prayer: "Lord, deliver me from the love of things. Let my life consist of Your presence and Your love. Amen." },
    { verse: "Hebrews 13:5", text: "Keep your lives free from the love of money and be content with what you have.", prayer: "I find my satisfaction in You, Lord. I declare that You are my portion and my enough. Amen." },
    { verse: "1 Timothy 6:10", text: "For the love of money is a root of all kinds of evil.", prayer: "Father, pull up any roots of greed in my heart. Give me a spirit of generosity and trust. Amen." },
    { verse: "Proverbs 28:25", text: "The greedy stir up conflict, but those who trust in the Lord will prosper.", prayer: "I choose trust over grasping. I seek Your prosperity that adds no sorrow with it. Amen." },
    { verse: "Matthew 6:24", text: "No one can serve two masters... You cannot serve both God and money.", prayer: "I serve only You, Lord. Money is my tool, not my master. Amen." },
    { verse: "Ecclesiastes 5:10", text: "Whoever loves money never has enough; whoever loves wealth is never satisfied with their income.", prayer: "I break the cycle of never-ending wanting. I am satisfied with Your daily bread. Amen." },
    { verse: "Ephesians 5:3", text: "But among you there must not be even a hint of... greed, because these are improper for God’s holy people.", prayer: "Let my life be marked by holy simplicity and open-handed giving. Amen." }
  ],
  jealousy: [
    { verse: "James 3:16", text: "For where you have envy and selfish ambition, there you find disorder and every evil practice.", prayer: "Lord, cast out the spirit of envy. I speak order and peace into my life and relationships. Amen." },
    { verse: "Proverbs 14:30", text: "A heart at peace gives life to the body, but envy rots the bones.", prayer: "I choose to be at peace with what You have given me. Revitalize my heart with Your joy. Amen." },
    { verse: "Galatians 5:26", text: "Let us not become conceited, provoking and envying each other.", prayer: "Father, help me to rejoice in the blessings of others as if they were my own. Amen." },
    { verse: "1 Corinthians 3:3", text: "You are still worldly. For since there is jealousy and quarreling among you, are you not worldly?", prayer: "Spirit of God, mature me. Help me to walk in love and unity with my brothers and sisters. Amen." },
    { verse: "1 Peter 2:1", text: "Therefore, rid yourselves of all malice and all deceit, hypocrisy, envy, and slander of every kind.", prayer: "I strip off the garment of jealousy. I put on the kindness and sincerity of Christ. Amen." },
    { verse: "Romans 13:13", text: "Let us behave decently, as in the daytime, not in... jealousy.", prayer: "I walk in the light today. I celebrate Your goodness in the lives of those around me. Amen." },
    { verse: "Song of Solomon 8:6", text: "For love is as strong as death, its jealousy unyielding as the grave.", prayer: "Lord, let Your divine love overshadow any human jealousy. Make my heart secure in Your affection. Amen." }
  ],
  other: [
    { verse: "Isaiah 41:10", text: "So do not fear, for I am with you; do not be dismayed, for I am your God.", prayer: "I cast out fear today. You are my God, and You are holding my hand. Amen." },
    { verse: "Philippians 4:13", text: "I can do all this through him who gives me strength.", prayer: "Whatever I face today, I have the victory through Your power, Jesus. Amen." },
    { verse: "Romans 8:37", text: "No, in all these things we are more than conquerors through him who loved us.", prayer: "I am more than a conqueror! I walk in the victory of Your love today. Amen." },
    { verse: "1 John 4:4", text: "The one who is in you is greater than the one who is in the world.", prayer: "Greater is He that is in me than any problem in the world. I am victorious! Amen." },
    { verse: "Deuteronomy 31:6", text: "Be strong and courageous. Do not be afraid or terrified... for the Lord your God goes with you.", prayer: "I take courage today. I am never alone, for the Lord is my constant companion. Amen." },
    { verse: "Psalm 34:17", text: "The righteous cry out, and the Lord hears them; he delivers them from all their troubles.", prayer: "Thank You for hearing my cry, Lord. I trust in Your deliverance from every trouble. Amen." },
    { verse: "2 Corinthians 12:9", text: "My grace is sufficient for you, for my power is made perfect in weakness.", prayer: "I boast in my weakness, for Your power rests on me. Your grace is all I need. Amen." }
  ]
};

function PostResponsesDialog({ post, categoryTitle, children }: { post: any, categoryTitle: string, children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = useState(false);
    const postDate = safeToDate(post.createdAt);

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
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                        <SheetHeader className="text-left flex-shrink-0">
                            <div className="flex items-center gap-2 mb-2 text-left">
                                <Zap className="h-4 w-4 text-primary text-left" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Circle Conversation</span>
                            </div>
                            <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-balance text-left">Victory over {categoryTitle}</SheetTitle>
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
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Victory over {categoryTitle}</DialogTitle>
                        <DialogDescription className="text-base font-medium text-left">Shared wisdom and encouragement for victory.</DialogDescription>
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
    const [newPostText, setNewPostText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Management State
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [amenScriptureIdx, setAmenScriptureIdx] = useState<number | null>(null);

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
        toast({ title: 'Amen!', description: 'May this word be established in your heart and provide lasting victory.' });
        setTimeout(() => setAmenScriptureIdx(null), 2000);
    };

    return (
        <div className="space-y-8 max-w-3xl mx-auto pb-32 text-left">
            <div className="flex items-center gap-4 px-4 sm:px-0 pt-4 text-left">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm text-left">
                    <ArrowLeft className="h-5 w-5 text-left" />
                </Button>
                <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1 text-left">
                        <Users className="h-3.5 w-3.5 text-primary text-left" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Victory Circle</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black font-headline uppercase tracking-tight truncate leading-tight text-balance text-left">Victory over {categoryTitle}</h1>
                </div>
            </div>

            <Card className="rounded-none sm:rounded-[2.5rem] border-x-0 sm:border-x shadow-xl overflow-hidden bg-primary text-primary-foreground text-left">
                <CardContent className="p-8 sm:p-10 space-y-6 text-left">
                    <div className="flex items-start gap-4 text-left">
                        <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 text-left">
                            <ShieldCheck className="h-6 w-6 text-white text-left" />
                        </div>
                        <div className="space-y-1 text-left">
                            <h2 className="text-xl font-black uppercase tracking-tight leading-tight text-left">Lasting Solutions Through Transparency</h2>
                            <p className="text-sm font-medium text-white/80 leading-relaxed text-balance text-left">
                                This is a sanctuary for brethren struggling with <span className="font-bold text-white underline decoration-white/30 underline-offset-4">{categoryTitle}</span>. By bringing our struggles into the light of the Body, we find strength to overcome.
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
                                className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-primary text-left"
                            />
                            <Label htmlFor="anonymous-toggle" className="text-xs font-bold text-white/80 cursor-pointer uppercase tracking-widest text-left">Post Anonymously</Label>
                        </div>
                        <Button 
                            onClick={handleCreatePost} 
                            disabled={isSubmitting || !newPostText.trim()}
                            className="w-full h-12 bg-white text-primary hover:bg-white/90 font-black rounded-2xl shadow-2xl tracking-widest uppercase text-left"
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}
                            SHARE IN THE LIGHT
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <section className="space-y-6 px-4 sm:px-0 text-left">
                <div className="flex items-center gap-3 text-left">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner text-left">
                        <BookOpen className="h-5 w-5 text-primary text-left" />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-left">Armor of the Word</h3>
                </div>

                <Accordion type="single" collapsible className="w-full space-y-3 text-left">
                    {scriptures.map((s, idx) => (
                        <AccordionItem key={idx} value={`item-${idx}`} className="border rounded-2xl overflow-hidden px-4 bg-muted/10 group/item transition-all hover:bg-muted/20 text-left">
                            <AccordionTrigger className="hover:no-underline py-4 text-left">
                                <div className="flex items-center gap-3 text-left">
                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 text-left">
                                        <span className="text-[10px] font-black text-primary text-left">{idx + 1}</span>
                                    </div>
                                    <span className="text-sm font-black uppercase tracking-tight text-foreground/80 group-hover/item:text-primary transition-colors text-left">{s.verse}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-6 pt-2 text-left">
                                <div className="space-y-6 text-left">
                                    <div className="relative pl-6 border-l-4 border-primary/20 bg-background/50 p-4 rounded-r-2xl shadow-inner text-left">
                                        <Quote className="absolute top-2 right-4 h-12 w-12 opacity-5 rotate-12 text-left" />
                                        <p className="text-base text-muted-foreground italic font-medium text-justify text-balance text-left">
                                            &ldquo;{s.text}&rdquo;
                                        </p>
                                    </div>
                                    <div className="space-y-3 p-4 bg-primary/[0.03] rounded-2xl border border-dashed border-primary/20 text-left">
                                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/60 text-left">
                                            <HandHeart className="h-3 w-3 text-left" /> Victory Prayer
                                        </div>
                                        <p className="text-sm font-medium leading-relaxed text-foreground/70 text-balance italic text-left">
                                            &ldquo;{s.prayer}&rdquo;
                                        </p>
                                        <div className="pt-2 text-left">
                                            <Button 
                                                onClick={() => handleAmen(idx)}
                                                variant="outline" 
                                                size="sm" 
                                                className={cn(
                                                    "h-8 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest transition-all text-left",
                                                    amenScriptureIdx === idx ? "bg-primary text-white border-none scale-105 shadow-lg" : "bg-background hover:bg-primary/5 text-primary/60 hover:text-primary"
                                                )}
                                            >
                                                {amenScriptureIdx === idx ? <Check className="h-3.5 w-3.5 text-left" /> : <Sparkles className="h-3.5 w-3.5 text-left" />}
                                                AMEN
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </section>

            <div className="space-y-6 px-4 sm:px-0 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                    <div className="flex items-center gap-3 text-left">
                        <div className="h-10 w-10 rounded-2xl bg-muted/20 flex items-center justify-center shadow-inner text-left">
                            <MessageSquare className="h-5 w-5 text-muted-foreground text-left" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-left">Circle Discussions</h3>
                    </div>
                    <div className="relative flex-1 max-w-sm text-left">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 text-left" />
                        <Input 
                            placeholder="Search discussions..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="h-10 pl-9 rounded-xl bg-muted/20 border-none shadow-inner text-sm text-left"
                        />
                    </div>
                </div>

                <div className="space-y-6 text-left">
                    {loading ? (
                        <div className="flex justify-center py-20 text-left"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20 text-left" /></div>
                    ) : filteredPosts && filteredPosts.length > 0 ? (
                        filteredPosts.map((post: any) => {
                            const postDate = safeToDate(post.createdAt);
                            const isOwner = user?.uid === post.authorId;
                            const isEditing = editingPostId === post.id;

                            return (
                                <Card key={post.id} className="rounded-[2rem] border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden border-b-8 border-b-primary/5 text-left">
                                    <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between text-left">
                                        <div className="flex items-center gap-3 text-left">
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
                                        <div className="flex items-center gap-2 text-left">
                                            <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-black uppercase tracking-widest bg-background/50 text-left">{categoryTitle}</Badge>
                                            {isOwner && !isEditing && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-left">
                                                            <MoreVertical className="h-4 w-4 text-left" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl text-left">
                                                        <DropdownMenuItem onClick={() => { setEditingPostId(post.id); setEditingText(post.text); }} className="rounded-lg text-left">
                                                            <Edit className="mr-2 h-4 w-4 text-primary text-left" /> Edit Story
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="text-left" />
                                                        <DropdownMenuItem onClick={() => handleDeletePost(post.id)} className="text-destructive focus:text-destructive rounded-lg text-left">
                                                            <Trash2 className="mr-2 h-4 w-4 text-left" /> Remove from Circle
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-4 text-left">
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
                                                        <X className="mr-1 h-3 w-3 text-left" /> Cancel
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleUpdatePost(post.id)} disabled={isUpdating || !editingText.trim()} className="rounded-xl font-black uppercase tracking-widest text-[10px] text-left">
                                                        {isUpdating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3 text-left" />}
                                                        Save Changes
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <PostResponsesDialog post={post} categoryTitle={categoryTitle}>
                                                <button className="w-full text-left outline-none group/post text-left">
                                                    <div className="relative pl-6 border-l-4 border-primary/20 bg-muted/5 p-4 rounded-r-2xl shadow-inner transition-all hover:bg-muted/10 active:scale-[0.99] text-left">
                                                        <Quote className="absolute top-2 right-4 h-12 w-12 opacity-5 rotate-12 text-left" />
                                                        <p className="text-base text-muted-foreground leading-relaxed italic font-medium text-left">
                                                            &ldquo;{post.text}&rdquo;
                                                        </p>
                                                    </div>
                                                </button>
                                            </PostResponsesDialog>
                                        )}
                                    </CardContent>
                                    <CardFooter className="p-3 bg-muted/5 flex justify-between items-center text-left">
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
                        <div className="text-center py-24 border-2 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center mx-4 sm:mx-0 text-left">
                            <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6 text-left">
                                <Sparkles className="h-10 w-10 text-muted-foreground opacity-10 text-left" />
                            </div>
                            <h4 className="text-xl font-black uppercase tracking-tight opacity-40 text-left">Circle Silence</h4>
                            <p className="text-sm text-muted-foreground italic mt-2 px-12 max-w-sm text-balance text-left text-center">No brethren have shared in this circle yet. Be the first to bring a word of encouragement or a struggle into the light.</p>
                        </div>
                    )}
                </div>
            </div>
            
            <footer className="text-center pt-12 border-t mt-12 px-8 text-left">
                <p className="text-xs text-muted-foreground italic font-medium leading-relaxed max-w-md mx-auto text-balance text-center text-left">
                    "Confess your faults one to another, and pray one for another, that ye may be healed. The effectual fervent prayer of a righteous man availeth much." — James 5:16
                </p>
            </footer>
        </div>
    );
}
