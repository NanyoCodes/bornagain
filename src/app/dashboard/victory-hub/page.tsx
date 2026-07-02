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
    Eye
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
import { useState, useMemo } from 'react';
import Link from 'next/link';

const strongholdCategories = [
    { 
        name: 'Pride', 
        desc: 'Overcoming the ego to embrace humility in Christ.', 
        mission: 'Trading self-glory for the Glory of the Most High.',
        icon: Award, 
        color: 'text-amber-500', 
        bg: 'bg-amber-500/10' 
    },
    { 
        name: 'Lust', 
        desc: 'Mastering desires through the purity of the Spirit.', 
        mission: 'Cultivating a heart that seeks holy connections.',
        icon: Heart, 
        color: 'text-red-500', 
        bg: 'bg-red-500/10' 
    },
    { 
        name: 'Anger', 
        desc: 'Restoring peace where bitterness once ruled.', 
        mission: 'Finding the calm of the Spirit in every storm.',
        icon: Flame, 
        color: 'text-orange-500', 
        bg: 'bg-orange-500/10' 
    },
    { 
        name: 'Addiction', 
        desc: 'Breaking chains and finding freedom in God\'s presence.', 
        mission: 'Escaping the cycle through divine strength.',
        icon: Zap, 
        color: 'text-blue-500', 
        bg: 'bg-blue-500/10' 
    },
    { 
        name: 'Laziness', 
        desc: 'Activating purpose and Kingdom diligence.', 
        mission: 'Serving the Lord with a fervent and alert spirit.',
        icon: Activity, 
        color: 'text-emerald-500', 
        bg: 'bg-emerald-500/10' 
    },
    { 
        name: 'Unbelief', 
        desc: 'Solidifying faith against the waves of doubt.', 
        mission: 'Standing firm on the promises of the Living God.',
        icon: Sparkles, 
        color: 'text-indigo-500', 
        bg: 'bg-indigo-500/10' 
    },
    { 
        name: 'Greed', 
        desc: 'Finding contentment in God\'s sufficient provision.', 
        mission: 'Living a life of generosity and trust.',
        icon: Target, 
        color: 'text-green-500', 
        bg: 'bg-green-500/10' 
    },
    { 
        name: 'Jealousy', 
        desc: 'Rejoicing in the blessings of our brethren.', 
        mission: 'Unity and love without comparison.',
        icon: Users, 
        color: 'text-purple-500', 
        bg: 'bg-purple-500/10' 
    },
    { 
        name: 'Other', 
        desc: 'A sanctuary for any area requiring spiritual breakthrough.', 
        mission: 'Bringing all things into the Light of the Body.',
        icon: ShieldCheck, 
        color: 'text-primary', 
        bg: 'bg-primary/10' 
    }
];

function CategoryCard({ category }: { category: typeof strongholdCategories[0] }) {
    const circleLink = `/dashboard/strongholds/${category.name.toLowerCase()}`;
    
    return (
        <Card className="rounded-[2.5rem] border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden group hover:shadow-xl transition-all duration-500 flex flex-col h-full border-b-8 border-b-primary/5">
            <CardHeader className="p-8 pb-4">
                <div className="flex justify-between items-start mb-6">
                    <div className={cn("h-16 w-16 rounded-[1.5rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform", category.bg)}>
                        <category.icon className={cn("h-8 w-8", category.color)} />
                    </div>
                    <Badge variant="outline" className="h-6 px-3 text-[10px] font-black uppercase tracking-widest bg-background/50">Circle</Badge>
                </div>
                <CardTitle className="text-2xl font-black font-headline tracking-tight uppercase group-hover:text-primary transition-colors">
                    {category.name}
                </CardTitle>
                <CardDescription className="text-sm font-medium mt-2 leading-relaxed">
                    {category.desc}
                </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8 flex-grow">
                <div className="relative pl-6 border-l-4 border-primary/20 py-1 italic text-xs text-muted-foreground font-medium">
                    <Quote className="absolute top-0 right-0 h-8 w-8 opacity-5 pointer-events-none" />
                    &ldquo;{category.mission}&rdquo;
                </div>
            </CardContent>
            <CardFooter className="p-0 border-t mt-auto">
                <Button asChild variant="ghost" className="w-full h-14 rounded-none gap-2 font-black uppercase tracking-widest text-[11px] group/btn hover:bg-primary/5 hover:text-primary transition-all">
                    <Link href={circleLink}>
                        ENTER VICTORY CIRCLE <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

import { Award } from 'lucide-react';

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
        <div className="space-y-10 max-w-6xl mx-auto pb-32">
            <header className="px-4 sm:px-0 space-y-6 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Kingdom Recovery</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black font-headline tracking-tight uppercase">Victory Hub</h1>
                        <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-xl text-balance italic">
                            A sanctuary for transparency and spiritual breakthrough. Join a circle to find communal solutions for lasting victory.
                        </p>
                    </div>
                </div>

                <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-6 rounded-[2.5rem] flex items-start gap-5 shadow-inner">
                    <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shrink-0 mt-1">
                        <Lock className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight leading-tight mb-1">Confidential Sanctuary</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium text-balance">
                            Participation in Victory Circles is completely <span className="text-foreground font-bold underline decoration-primary/30">anonymous</span>. Your identity is hidden to ensure you can bring your struggles into the Light without fear, receiving support from the global body of Christ.
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40" />
                    <Input 
                        placeholder="Search for a struggle circle..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="h-14 pl-12 rounded-[1.5rem] bg-muted/20 border-none shadow-inner text-lg font-bold"
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 sm:px-0">
                {filteredCategories.length > 0 ? (
                    filteredCategories.map(cat => (
                        <CategoryCard key={cat.name} category={cat} />
                    ))
                ) : (
                    <div className="col-span-full py-32 text-center flex flex-col items-center">
                        <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
                            <ShieldCheck className="h-10 w-10 text-muted-foreground opacity-20" />
                        </div>
                        <p className="text-base font-black uppercase tracking-tight opacity-40">No matching circles found</p>
                        <p className="text-xs text-muted-foreground mt-2 italic">Try a different search term or enter the "Other" circle.</p>
                    </div>
                )}
            </div>

            <footer className="px-8 pt-12 border-t mt-12 text-center max-w-2xl mx-auto">
                <p className="text-xs text-muted-foreground leading-relaxed font-medium italic text-balance">
                    "And they overcame him by the blood of the Lamb, and by the word of their testimony; and they loved not their lives unto the death." — Revelation 12:11
                </p>
            </footer>
        </div>
    );
}
