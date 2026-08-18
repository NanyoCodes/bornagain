'use client';

import { 
    ShieldCheck, 
    Zap, 
    Flame, 
    Sparkles, 
    ArrowRight, 
    Users, 
    Heart, 
    Activity,
    Search,
    ChevronRight,
    Lock,
    Award,
    Target,
    Quote,
    ShieldAlert,
    HeartOff,
    CloudRain,
    Eye,
    Cloud,
    Globe,
    BookOpen,
    Share2,
    Banknote,
    ShoppingBag,
    Loader2,
    HelpCircle,
    Utensils,
    Timer,
    HeartHandshake,
    AlertCircle,
    User
} from 'lucide-react';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription,
    CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';

const strongholdCategories = [
    { 
        name: 'Pride', 
        desc: 'Overcoming the ego to embrace humility in Christ.', 
        mission: 'Proverbs 16:18 - Pride goes before destruction, a haughty spirit before a fall.',
        icon: Award, 
        color: 'text-amber-500', 
        bg: 'bg-amber-500/10' 
    },
    { 
        name: 'Lust', 
        desc: 'Mastering desires through the purity of the Spirit.', 
        mission: 'Matthew 5:28 - But I tell you that anyone who looks at a woman lustfully has already committed adultery with her in his heart.',
        icon: Heart, 
        color: 'text-red-500', 
        bg: 'bg-red-500/10' 
    },
    { 
        name: 'Fear', 
        desc: 'Conquering anxiety with the perfect love of God.', 
        mission: '2 Timothy 1:7 - For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.',
        icon: ShieldAlert, 
        color: 'text-blue-600', 
        bg: 'bg-blue-600/10' 
    },
    { 
        name: 'Bitterness', 
        desc: 'Uprooting resentment to allow the peace of God to reign.', 
        mission: 'Hebrews 12:15 - See to it that no one falls short of the grace of God and that no bitter root grows up.',
        icon: AlertCircle, 
        color: 'text-orange-700', 
        bg: 'bg-orange-700/10' 
    },
    { 
        name: 'Poverty', 
        desc: 'Breaking the spirit of lack to walk in divine abundance and stewardship.', 
        mission: '2 Corinthians 8:9 - For you know the grace of our Lord Jesus Christ, that though he was rich, yet for your sake he became poor.',
        icon: Banknote, 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-600/10' 
    },
    { 
        name: 'Unforgiveness', 
        desc: 'Releasing bitterness to find heart freedom.', 
        mission: 'Matthew 6:14 - For if you forgive other people when they sin against you, your heavenly Father will also forgive you.',
        icon: HeartOff, 
        color: 'text-rose-500', 
        bg: 'bg-rose-500/10' 
    },
    { 
        name: 'Anger', 
        desc: 'Restoring peace where bitterness once ruled.', 
        mission: 'James 1:19 - Everyone should be quick to listen, slow to speak and slow to become angry.',
        icon: Flame, 
        color: 'text-orange-500', 
        bg: 'bg-orange-500/10' 
    },
    { 
        name: 'Discouragement', 
        desc: 'Renewing hope when the weight of the journey feels heavy.', 
        mission: 'Psalm 42:11 - Why, my soul, are you downcast? ... Put your hope in God.',
        icon: CloudRain, 
        color: 'text-slate-500', 
        bg: 'bg-slate-500/10' 
    },
    { 
        name: 'Addiction', 
        desc: 'Breaking chains and finding freedom in God\'s presence.', 
        mission: '1 Corinthians 6:12 - Everything is permissible for me, but I will not be mastered by anything.',
        icon: Zap, 
        color: 'text-blue-500', 
        bg: 'bg-blue-500/10' 
    },
    { 
        name: 'Loneliness', 
        desc: 'Finding comfort in the constant presence of the Great Companion.', 
        mission: 'Matthew 28:20 - And surely I am with you always, to the very end of the age.',
        icon: User, 
        color: 'text-blue-400', 
        bg: 'bg-blue-400/10' 
    },
    { 
        name: 'Laziness', 
        desc: 'Activating purpose and Kingdom diligence.', 
        mission: 'Colossians 3:23 - Whatever you do, work at it with all your heart, as working for the Lord.',
        icon: Activity, 
        color: 'text-emerald-500', 
        bg: 'bg-emerald-500/10' 
    },
    { 
        name: 'Confusion', 
        desc: 'Seeking clarity and sound mind through the Word of Truth.', 
        mission: '1 Corinthians 14:33 - For God is not a God of disorder but of peace.',
        icon: HelpCircle, 
        color: 'text-purple-400', 
        bg: 'bg-purple-400/10' 
    },
    { 
        name: 'Grief', 
        desc: 'Walking through loss into the comfort of God.', 
        mission: 'Psalm 34:18 - The Lord is close to the brokenhearted and saves those who are crushed in spirit.',
        icon: CloudRain, 
        color: 'text-indigo-600', 
        bg: 'bg-indigo-600/10' 
    },
    { 
        name: 'Disobedience', 
        desc: 'Aligning the will with the perfect commands of the Father.', 
        mission: '1 Samuel 15:22 - To obey is better than sacrifice.',
        icon: Target, 
        color: 'text-red-600', 
        bg: 'bg-red-600/10' 
    },
    { 
        name: 'Comparison', 
        desc: 'Finding security in your unique Kingdom purpose.', 
        mission: '2 Corinthians 10:12 - When they measure themselves by themselves... they are not wise.',
        icon: Eye, 
        color: 'text-violet-500', 
        bg: 'bg-violet-500/10' 
    },
    { 
        name: 'Self-Righteousness', 
        desc: 'Trading human merit for the perfect righteousness of Christ.', 
        mission: 'Isaiah 64:6 - All our righteous acts are like filthy rags.',
        icon: Award, 
        color: 'text-amber-600', 
        bg: 'bg-amber-600/10' 
    },
    { 
        name: 'Unbelief', 
        desc: 'Solidifying faith against the waves of doubt.', 
        mission: 'Mark 9:24 - I do believe; help me overcome my unbelief!',
        icon: Sparkles, 
        color: 'text-indigo-500', 
        bg: 'bg-indigo-500/10' 
    },
    { 
        name: 'Gluttony', 
        desc: 'Cultivating self-control and honoring the temple of the Holy Spirit.', 
        mission: '1 Corinthians 6:19-20 - Do you not know that your bodies are temples of the Holy Spirit?',
        icon: Utensils, 
        color: 'text-orange-400', 
        bg: 'bg-orange-400/10' 
    },
    { 
        name: 'Depression', 
        desc: 'Lifting the weight of heaviness through spiritual light.', 
        mission: 'Psalm 42:11 - Why, my soul, are you downcast? ... Put your hope in God.',
        icon: Cloud, 
        color: 'text-slate-600', 
        bg: 'bg-slate-600/10' 
    },
    { 
        name: 'Procrastination', 
        desc: 'Redeeming the time for the work of the Kingdom.', 
        mission: 'Ephesians 5:16 - Making the most of every opportunity, because the days are evil.',
        icon: Timer, 
        color: 'text-teal-600', 
        bg: 'bg-teal-600/10' 
    },
    { 
        name: 'Greed', 
        desc: 'Finding contentment in God\'s sufficient provision.', 
        mission: 'Luke 12:15 - Watch out! Be on your guard against all kinds of greed.',
        icon: Target, 
        color: 'text-green-500', 
        bg: 'bg-green-500/10' 
    },
    { 
        name: 'Rejection', 
        desc: 'Embracing your eternal acceptance as a child of the Most High.', 
        mission: 'Ephesians 1:6 - To the praise of his glorious grace, which he has freely given us.',
        icon: HeartHandshake, 
        color: 'text-pink-500', 
        bg: 'bg-pink-500/10' 
    },
    { 
        name: 'Worldliness', 
        desc: 'Prioritizing the eternal over the temporary.', 
        mission: '1 John 2:15 - Do not love the world or anything in the world.',
        icon: Globe, 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-600/10' 
    },
    { 
        name: 'Jealousy', 
        desc: 'Rejoicing in the blessings of our brethren.', 
        mission: 'Proverbs 14:30 - A heart at peace gives life to the body, but envy rots the bones.',
        icon: Users, 
        color: 'text-purple-500', 
        bg: 'bg-purple-400/10' 
    },
    { 
        name: 'Other', 
        desc: 'A sanctuary for any area requiring spiritual breakthrough.', 
        mission: 'Philippians 4:13 - I can do all this through him who gives me strength.',
        icon: ShieldCheck, 
        color: 'text-primary', 
        bg: 'bg-primary/10' 
    }
];

function CategoryCard({ category }: { category: typeof strongholdCategories[0] }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const circleLink = `/strongholds/${category.name.toLowerCase()}`;
    const Icon = category.icon;

    const [participantCount, setParticipantCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        const fetchParticipants = async () => {
            try {
                const postsRef = collection(firestore, 'victoryCircles', category.name.toLowerCase(), 'posts');
                const snapshot = await getCountFromServer(postsRef);
                setParticipantCount(snapshot.data().count);
            } catch (e) {
                console.error("Failed to fetch circle participants:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchParticipants();
    }, [firestore, category.name]);

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const shareUrl = `${window.location.origin}${circleLink}`;
        const text = `Join the Victory Circle for ${category.name} on Testify! We overcome by the blood of the Lamb and the word of our testimony.`;
        
        if (navigator.share) {
            navigator.share({
                title: `Victory Over ${category.name}`,
                text: text,
                url: shareUrl,
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(`${text} ${shareUrl}`);
            toast({ title: "Link Copied", description: "You can now share this circle with others." });
        }
    };
    
    return (
        <Card className="rounded-[2.5rem] border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden group hover:shadow-xl transition-all duration-500 flex flex-col h-full border-b-8 border-b-primary/5 text-left">
            <CardHeader className="p-8 pb-4 text-left">
                <div className="flex justify-between items-start mb-6 text-left">
                    <div className={cn("h-16 w-16 rounded-[1.5rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform", category.bg)}>
                        <Icon className={cn("h-8 w-8", category.color)} />
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-full bg-muted/20 hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
                        onClick={handleShare}
                    >
                        <Share2 className="h-4 w-4" />
                        <span className="sr-only">Share Circle</span>
                    </Button>
                </div>
                <CardTitle className="text-2xl font-black font-headline uppercase group-hover:text-primary transition-colors text-left">
                    VICTORY OVER {category.name}
                </CardTitle>
                <CardDescription className="text-sm font-medium mt-2 leading-relaxed text-left">
                    {category.desc}
                </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8 flex-grow text-left">
                <div className="relative pl-6 border-l-4 border-primary/20 py-1 italic text-xs text-muted-foreground font-medium text-left">
                    <Quote className="absolute top-0 right-0 h-8 w-8 opacity-5 pointer-events-none" />
                    &ldquo;{category.mission}&rdquo;
                </div>
            </CardContent>
            <CardFooter className="p-0 border-t mt-auto text-left">
                <Button asChild variant="ghost" className="w-full h-14 rounded-none gap-2 font-black uppercase tracking-widest text-[11px] group/btn hover:bg-primary/5 hover:text-primary transition-all">
                    <Link href={circleLink}>
                        ENTER VICTORY CIRCLE <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function VictoryHubPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCategories = useMemo(() => {
        if (!searchTerm) return strongholdCategories;
        const term = searchTerm.toLowerCase();
        return strongholdCategories.filter(c => 
            c.name.toLowerCase().includes(term) || 
            c.desc.toLowerCase().includes(term)
        );
    }, [searchTerm]);

    return (
        <div className="space-y-10 max-w-6xl mx-auto pb-32 text-left">
            <header className="px-4 sm:px-0 space-y-6 pt-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-left">
                    <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2 mb-2 text-left">
                            <ShieldCheck className="h-5 w-5 text-primary text-left" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Kingdom Recovery</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black font-headline tracking-tight uppercase text-left">Victory Hub</h1>
                        <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-xl text-balance italic text-left">
                            A sanctuary for transparency and spiritual breakthrough. Join a circle to find communal solutions for lasting victory.
                        </p>
                    </div>
                </div>

                <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-6 rounded-[2.5rem] flex items-start gap-5 shadow-inner text-left">
                    <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shrink-0 mt-1">
                        <Lock className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-black uppercase tracking-tight leading-tight mb-1 text-left">Choice-Based Sanctuary</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium text-balance text-left">
                            Participation in Victory Circles offers <span className="text-foreground font-bold underline decoration-primary/30">choice-based anonymity</span>. You can choose to appear as yourself or post anonymously to ensure you can bring your struggles into the Light without fear.
                        </p>
                    </div>
                </div>

                <div className="relative text-left">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 text-left" />
                    <Input 
                        placeholder="Search for a struggle circle..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="h-14 pl-12 rounded-[1.5rem] bg-muted/20 border-none shadow-inner text-lg font-bold w-full text-left"
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 sm:px-0 text-left">
                {filteredCategories.length > 0 ? (
                    filteredCategories.map(cat => (
                        <CategoryCard key={cat.name} category={cat} />
                    ))
                ) : (
                    <div className="col-span-full py-32 text-center flex flex-col items-center">
                        <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center mb-6 text-left">
                            <ShieldCheck className="h-10 w-10 text-muted-foreground opacity-20 text-left" />
                        </div>
                        <p className="text-base font-black uppercase tracking-tight opacity-40 text-center text-left">No matching circles found</p>
                        <p className="text-xs text-muted-foreground mt-2 italic text-center text-left">Try a different search term or enter the "Other" circle.</p>
                    </div>
                )}
            </div>

            <footer className="px-8 pt-12 border-t mt-12 text-center max-w-2xl mx-auto text-left">
                <p className="text-xs text-muted-foreground leading-relaxed font-medium italic text-balance text-center text-left">
                    "And they overcame him by the blood of the Lamb, and by the word of their testimony; and they loved not their lives unto the death." — Revelation 12:11
                </p>
            </footer>
        </div>
    );
}