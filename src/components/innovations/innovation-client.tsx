'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useUserProfile } from '@/firebase';
import { doc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import type { Soul, UserProfile } from '@/lib/types';
import { generateMinistryInnovation, type InnovationOutput } from '@/ai/flows/generate-ministry-innovation';
import { 
    Loader2, 
    Lightbulb, 
    Sparkles, 
    ChevronLeft, 
    Zap, 
    Quote, 
    CheckCircle2, 
    ArrowRight, 
    Calendar,
    Target,
    Heart,
    ArrowLeft,
    RefreshCw,
    BookOpen,
    Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function InnovationClient({ soulId }: { soulId: string | null }) {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [innovation, setInnovation] = useState<InnovationOutput | null>(null);

    const soulDocRef = useMemo(() => {
        if (!firestore || !user?.uid || !soulId) return null;
        return doc(firestore, `users/${user.uid}/souls`, soulId);
    }, [firestore, user?.uid, soulId]);
    const { data: soul, loading: soulLoading } = useDoc<Soul>(soulDocRef);

    const handleGenerate = async () => {
        if (!soul || !userProfile) return;
        
        setIsLoading(true);
        setInnovation(null);
        
        try {
            const result = await generateMinistryInnovation({
                soulFirstName: soul.firstName,
                soulStatus: soul.status,
                soulRelationship: soul.relationship || 'Outreach',
                userFirstName: userProfile.firstName,
            });
            setInnovation(result);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Generation Failed', description: 'Could not connect to the Strategy Agent.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (soul && userProfile && !innovation && !isLoading) {
            handleGenerate();
        }
    }, [soul, userProfile]);

    const handleSaveToHistory = async () => {
        if (!user || !firestore || !soul || !innovation || !userProfile) return;

        const logEntry = {
            date: new Date(),
            note: `STRATEGY GENERATED: "${innovation.title}". Strategy: ${innovation.description}. Steps: ${innovation.actionSteps.join(', ')}`,
            actions: ['innovate'],
            memberId: user.uid,
            memberName: `${userProfile.firstName} ${userProfile.lastName}`,
        };

        const soulRef = doc(firestore, `users/${user.uid}/souls`, soul.id);
        const globalSoulRef = doc(firestore, 'souls', soul.id);

        try {
            await updateDoc(soulRef, {
                followUpLog: arrayUnion(logEntry),
                lastUpdatedAt: serverTimestamp(),
            });
            await updateDoc(globalSoulRef, {
                followUpLog: arrayUnion(logEntry),
                lastUpdatedAt: serverTimestamp(),
            });
            toast({ title: 'Strategy Anchored', description: 'This innovation has been saved to the history.' });
            router.push('/dashboard/souls-won');
        } catch (e) {
            toast({ variant: 'destructive', title: 'Save Failed' });
        }
    };

    if (soulLoading) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center py-24">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground font-medium">Accessing soul records...</p>
            </div>
        );
    }

    if (!soulId || !soul) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center px-8">
                <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                    <Target className="h-8 w-8 text-muted-foreground opacity-20" />
                </div>
                <h2 className="text-2xl font-black font-headline uppercase tracking-tight">Convert context missing</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm">Please select a convert from your dashboard to generate a Kingdom innovation.</p>
                <Button variant="outline" className="mt-8 rounded-xl h-11 px-8 font-bold" onClick={() => router.back()}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-32">
            <header className="px-4 sm:px-0 space-y-4 pt-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Strategy Agent</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black font-headline tracking-tight uppercase truncate">Kingdom Innovation</h1>
                    </div>
                </div>

                <div className="bg-primary/10 border-2 border-dashed border-primary/20 p-6 rounded-[2rem] flex items-center justify-between group shadow-inner">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                            <Lightbulb className="h-6 w-6 text-white animate-pulse" />
                        </div>
                        <div>
                            <p className="text-lg font-black uppercase tracking-tight leading-tight">Innovating for {soul.firstName}</p>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-80">{soul.status} • {soul.relationship || 'Outreach'}</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="px-4 sm:px-0">
                {isLoading ? (
                    <Card className="rounded-[2.5rem] border-none shadow-xl bg-card animate-in fade-in zoom-in duration-500">
                        <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-6">
                            <div className="relative">
                                <Loader2 className="h-16 w-16 animate-spin text-primary opacity-20" />
                                <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black uppercase tracking-widest">Consulting the Spirit</h3>
                                <p className="text-sm text-muted-foreground italic font-medium max-w-xs mx-auto">Analyzing convert context and generating a strategic Kingdom approach...</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : innovation ? (
                    <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
                        <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                            <CardHeader className="p-8 sm:p-10 pb-4">
                                <CardTitle className="text-3xl sm:text-4xl font-black font-headline uppercase tracking-tight leading-tight">
                                    {innovation.title}
                                </CardTitle>
                                <CardDescription className="text-primary-foreground/70 text-sm sm:text-base font-medium flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" /> Strategy Generated Successfully
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 sm:p-10 pt-0">
                                <div className="bg-black/20 rounded-[2rem] p-6 sm:p-8 border border-white/10 shadow-inner relative overflow-hidden group">
                                    <Quote className="absolute top-4 right-6 h-12 w-12 opacity-5 rotate-12 transition-transform group-hover:scale-110" />
                                    <p className="text-base sm:text-xl font-serif italic leading-relaxed text-justify text-balance relative z-10">
                                        &ldquo;{innovation.description}&rdquo;
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Card className="rounded-[2rem] border-none shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden border-b-8 border-b-primary/5">
                                <CardHeader className="p-6 pb-2">
                                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" /> Scriptural Basis
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 pt-2">
                                    <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed italic border-l-4 border-primary/20 pl-4 py-2 bg-primary/5 rounded-r-xl">
                                        &ldquo;{innovation.scripture}&rdquo;
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="rounded-[2rem] border-none shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden border-b-8 border-b-primary/5">
                                <CardHeader className="p-6 pb-2">
                                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" /> Action Steps
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 pt-2">
                                    <ul className="space-y-3">
                                        {innovation.actionSteps.map((step, i) => (
                                            <li key={i} className="flex items-start gap-3 group">
                                                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                                                    <span className="text-[10px] font-black text-primary">{i + 1}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground font-medium leading-snug">{step}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Button variant="outline" onClick={handleGenerate} className="flex-1 h-14 rounded-2xl font-black shadow-lg uppercase tracking-widest gap-2 bg-background/50">
                                <RefreshCw className="h-4 w-4" /> REGENERATE
                            </Button>
                            <Button onClick={handleSaveToHistory} className="flex-1 h-14 rounded-2xl font-black shadow-xl shadow-primary/20 uppercase tracking-widest gap-2">
                                <CheckCircle2 className="h-4 w-4" /> ANCHOR STRATEGY
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-32 border-2 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center">
                        <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6">
                            <Sparkles className="h-10 w-10 text-muted-foreground opacity-10" />
                        </div>
                        <h4 className="text-xl font-black uppercase tracking-tight opacity-40">Ready to strategize?</h4>
                        <p className="text-sm text-muted-foreground italic mt-2 px-12 max-w-sm text-balance">The Innovation Agent is waiting to suggest a Kingdom strategy for {soul.firstName}.</p>
                        <div className="flex flex-col items-center">
                            <Button onClick={handleGenerate} className="mt-10 rounded-2xl h-12 px-10 font-black uppercase tracking-[0.2em] shadow-lg">INITIALIZE AGENT</Button>
                            
                            <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="h-3 w-3 cursor-help text-primary/40" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-[200px] rounded-xl border-primary/20 shadow-xl">
                                            <p>These AI insights are provided using the Gemini Flash model through the developer free-tier. There are no additional charges to you.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <span>FREE KINGDOM RESOURCE</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <footer className="px-8 pt-12 border-t mt-12 text-center max-w-2xl mx-auto">
                <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-[0.2em] opacity-40 italic text-balance">
                    "I will do a new thing; now it shall spring forth; shall ye not know it? I will even make a way in the wilderness, and rivers in the desert." — Isaiah 43:19
                </p>
            </footer>
        </div>
    );
}
