'use client';

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useDoc, useCollection, useUserProfile, useFirestore } from '@/firebase';
import { collection, query, addDoc, serverTimestamp, doc, updateDoc, where, arrayUnion, arrayRemove, orderBy } from 'firebase/firestore';
import type { RegionalChallenge, ChallengeSolution } from '@/lib/types';
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
    MessageSquare, 
    Sparkles, 
    ShieldCheck, 
    Send,
    HandHeart,
    MapPin,
    Quote,
    X,
    Target
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { CommentSection } from '../testimonies/comment-section';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function SolutionItem({ solution, challengeId }: { solution: ChallengeSolution, challengeId: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isUpvoting, setIsUpvoting] = useState(false);
    
    const createdAt = safeToDate(solution.createdAt);
    const hasUpvoted = user ? solution.upvotes?.includes(user.uid) : false;

    const handleUpvote = async () => {
        if (!user || !firestore || isUpvoting) return;
        setIsUpvoting(true);
        const solRef = doc(firestore, `regionalChallenges/${challengeId}/solutions`, solution.id);
        try {
            await updateDoc(solRef, {
                upvotes: hasUpvoted ? arrayRemove(user.uid) : arrayUnion(user.uid)
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsUpvoting(false);
        }
    };

    return (
        <Card className="rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border shadow-sm">
                            <AvatarImage src={solution.authorPhotoURL} />
                            <AvatarFallback className="font-bold text-[10px]">{solution.authorName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-xs font-black uppercase tracking-tight">{solution.authorName}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{createdAt ? format(createdAt, 'PPP') : 'Recently'}</p>
                        </div>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{solution.text}</p>
            </CardContent>
            <CardFooter className="p-2 bg-muted/5 border-t flex items-center justify-end">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleUpvote}
                    disabled={isUpvoting || !user}
                    className={cn(
                        "h-8 rounded-lg gap-2 font-black uppercase text-[9px] tracking-widest",
                        hasUpvoted ? "text-primary bg-primary/10" : "text-muted-foreground"
                    )}
                >
                    {isUpvoting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HandHeart className={cn("h-3.5 w-3.5", hasUpvoted && "fill-current")} />}
                    AMEN {solution.upvotes?.length || 0}
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function ChallengeDetailsClient({ challengeId }: { challengeId: string }) {
    const router = useRouter();
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    
    const [newSolution, setNewSolution] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const challengeRef = useMemo(() => (firestore && challengeId) ? doc(firestore, 'regionalChallenges', challengeId) : null, [firestore, challengeId]);
    const { data: challenge, loading: challengeLoading } = useDoc<RegionalChallenge>(challengeRef);

    const solutionsQuery = useMemo(() => {
        if (!firestore || !challengeId) return null;
        return query(collection(firestore, 'regionalChallenges', challengeId, 'solutions'), orderBy('createdAt', 'desc'));
    }, [firestore, challengeId]);
    const { data: solutions, loading: solutionsLoading } = useCollection<ChallengeSolution>(solutionsQuery);

    const handlePostSolution = async () => {
        if (!user || !userProfile || !firestore || !newSolution.trim()) return;
        setIsSubmitting(true);

        const solutionData = {
            text: newSolution.trim(),
            authorId: user.uid,
            authorName: `${userProfile.firstName} ${userProfile.lastName}`,
            authorPhotoURL: userProfile.photoURL || '',
            createdAt: serverTimestamp(),
            upvotes: []
        };

        try {
            await addDoc(collection(firestore, `regionalChallenges/${challengeId}/solutions`), solutionData);
            await updateDoc(doc(firestore, 'regionalChallenges', challengeId), {
                solutionCount: (challenge?.solutionCount || 0) + 1
            });
            toast({ title: 'Solution Shared', description: 'Your Kingdom insight has been posted.' });
            setNewSolution('');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Action Failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (challengeLoading || !challenge) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center py-24">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-sm text-muted-foreground font-medium uppercase tracking-widest text-[10px] animate-pulse text-center">Connecting to Territory Hub...</p>
            </div>
        );
    }

    const createdAt = safeToDate(challenge.createdAt);

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-32 px-4 sm:px-6">
            <header className="space-y-6 pt-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Strategic Intervention</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black font-headline uppercase truncate leading-tight">{challenge.title}</h1>
                    </div>
                </div>

                <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-card/50 backdrop-blur-md border-t-8 border-t-primary/20">
                    <CardHeader className="p-8 sm:p-10 pb-4">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border shadow-md">
                                    <AvatarImage src={challenge.authorPhotoURL} />
                                    <AvatarFallback className="font-bold bg-primary/10 text-primary text-xs">{challenge.authorName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-tight">Reporter: {challenge.authorName}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{createdAt ? format(createdAt, 'PPP') : 'Recently'}</p>
                                </div>
                            </div>
                            
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button asChild variant="outline" size="icon" className="h-10 w-10 rounded-full border-primary/20 text-primary hover:bg-primary/10 shadow-md bg-background">
                                            <Link href={`/campaigns?source=territory&title=${encodeURIComponent(challenge.title)}&location=${encodeURIComponent(challenge.city || challenge.state)}, ${encodeURIComponent(challenge.country)}&description=${encodeURIComponent(challenge.description)}`}>
                                                <Target className="h-5 w-5" />
                                                <span className="sr-only">Check this</span>
                                            </Link>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="rounded-xl border-primary/20 shadow-xl">
                                        <p className="text-[10px] font-black uppercase">Check this</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 mb-6">
                            <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-2xl border border-dashed w-fit">
                                <MapPin className="h-4 w-4 text-primary" />
                                <span className="text-xs font-black uppercase tracking-widest">Location: {challenge.city || challenge.state}, {challenge.country}</span>
                            </div>
                        </div>

                        <div className="relative pl-6 border-l-4 border-primary/20 py-2">
                            <Quote className="absolute top-0 right-0 h-16 w-16 opacity-[0.03] pointer-events-none" />
                            <p className="text-base sm:text-xl font-medium leading-relaxed italic text-balance">
                                &ldquo;{challenge.description}&rdquo;
                            </p>
                        </div>
                    </CardHeader>
                </Card>
            </header>

            <div className="space-y-8">
                <div className="flex items-center gap-3 px-1">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-black font-headline uppercase tracking-tight">Kingdom Solutions</h3>
                </div>

                <div className="space-y-4">
                    <div className="p-6 rounded-[2rem] bg-muted/20 border-2 border-dashed border-primary/10 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-2">Propose a Word or Solution</Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-primary/20 text-primary hover:bg-primary/5 shadow-sm group/launch">
                                            <Link href={`/campaigns?source=territory&title=${encodeURIComponent(challenge.title)}&location=${encodeURIComponent(challenge.city || challenge.state)}, ${encodeURIComponent(challenge.country)}&description=${encodeURIComponent(challenge.description)}`} className="text-center">
                                                <Target className="h-5 w-5" />
                                                <span className="sr-only">Check this</span>
                                            </Link>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-xl border-primary/20 shadow-xl">
                                        <p className="text-[10px] font-bold uppercase">Check this</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <Textarea 
                            placeholder="Share a strategy, scripture, or practical step for this territory..."
                            value={newSolution}
                            onChange={(e) => setNewSolution(e.target.value)}
                            className="min-h-[140px] rounded-2xl border-none bg-background shadow-inner text-base p-6"
                        />
                        <Button 
                            onClick={handlePostSolution}
                            disabled={isSubmitting || !newSolution.trim() || !user}
                            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                        >
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            PUBLISH SOLUTION
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                    {solutionsLoading ? (
                        <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>
                    ) : solutions && solutions.length > 0 ? (
                        solutions.map(sol => (
                            <SolutionItem key={sol.id} solution={sol} challengeId={challengeId} />
                        ))
                    ) : (
                        <div className="text-center py-24 border-2 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center">
                            <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6">
                                <MessageSquare className="h-10 w-10 text-primary opacity-10" />
                            </div>
                            <h3 className="text-xl font-black font-headline uppercase tracking-tight text-center opacity-40">No Solutions Yet</h3>
                            <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-sm mx-auto text-balance text-center">Be the first to provide a Kingdom insight for this regional challenge.</p>
                        </div>
                    )}
                </div>
            </div>

            <footer className="px-8 pt-12 border-t mt-12 text-center max-w-2xl mx-auto">
                <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-[0.2em] opacity-40 italic text-balance text-center">
                    "Thy kingdom come, Thy will be done in earth, as it is in heaven." — Matthew 6:10
                </p>
            </footer>
        </div>
    );
}
