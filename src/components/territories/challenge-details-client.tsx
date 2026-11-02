
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useUserProfile } from '@/firebase';
import { collection, query, addDoc, serverTimestamp, doc, updateDoc, writeBatch, where, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { RegionalChallenge, ChallengeSolution, UserProfile } from '@/lib/types';
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
    CheckCircle2,
    Calendar,
    Award
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
        <Card className="rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden text-left">
            <CardContent className="p-4 sm:p-6 space-y-4 text-left">
                <div className="flex items-center justify-between text-left">
                    <div className="flex items-center gap-3 text-left">
                        <Avatar className="h-8 w-8 border shadow-sm text-left">
                            <AvatarImage src={solution.authorPhotoURL} />
                            <AvatarFallback className="font-bold text-[10px] text-left">{solution.authorName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                            <p className="text-xs font-black uppercase tracking-tight text-left">{solution.authorName}</p>
                            <p className="text-[9px] text-muted-foreground font-bold text-left">{createdAt ? format(createdAt, 'MMM d, p') : 'Recently'}</p>
                        </div>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap text-left">{solution.text}</p>
            </CardContent>
            <CardFooter className="p-2 bg-muted/5 border-t flex items-center justify-end text-left">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleUpvote}
                    disabled={isUpvoting || !user}
                    className={cn(
                        "h-8 rounded-lg gap-2 font-black uppercase text-[9px] tracking-widest text-left",
                        hasUpvoted ? "text-primary bg-primary/10" : "text-muted-foreground"
                    )}
                >
                    {isUpvoting ? <Loader2 className="h-3 w-3 animate-spin text-left" /> : <HandHeart className={cn("h-3.5 w-3.5 text-left", hasUpvoted && "fill-current")} />}
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
            <div className="flex h-full w-full flex-col items-center justify-center py-24 text-left">
                <Loader2 className="h-12 w-12 animate-spin text-primary text-left" />
                <p className="mt-4 text-sm text-muted-foreground font-medium uppercase tracking-widest text-[10px] animate-pulse text-left">Connecting to Territory Hub...</p>
            </div>
        );
    }

    const createdAt = safeToDate(challenge.createdAt);

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-32 px-4 sm:px-6 text-left">
            <header className="space-y-6 pt-4 text-left">
                <div className="flex items-center gap-4 text-left">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm text-left">
                        <ArrowLeft className="h-6 w-6 text-left" />
                    </Button>
                    <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2 mb-1 text-left">
                            <ShieldCheck className="h-4 w-4 text-primary text-left" />
                            <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Strategic Intervention</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black font-headline uppercase truncate leading-tight text-left">{challenge.title}</h1>
                    </div>
                </div>

                <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-card/50 backdrop-blur-md border-t-8 border-t-primary/20 text-left">
                    <CardHeader className="p-8 sm:p-10 pb-4 text-left">
                        <div className="flex justify-between items-start mb-6 text-left">
                            <div className="flex items-center gap-3 text-left">
                                <Avatar className="h-10 w-10 border shadow-md text-left">
                                    <AvatarImage src={challenge.authorPhotoURL} />
                                    <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-left">{challenge.authorName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="text-left">
                                    <p className="text-xs font-black uppercase tracking-tight text-left">Reporter: {challenge.authorName}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left">{createdAt ? format(createdAt, 'PPP') : 'Recently'}</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="h-6 px-3 bg-primary/5 text-primary border-primary/20 font-black uppercase text-[8px] tracking-widest text-left">Open Challenge</Badge>
                        </div>
                        <div className="flex items-center gap-3 mb-6 bg-muted/20 p-3 rounded-2xl border border-dashed w-fit text-left">
                            <MapPin className="h-4 w-4 text-primary text-left" />
                            <span className="text-xs font-black uppercase tracking-widest text-left">Location: {challenge.city || challenge.state}, {challenge.country}</span>
                        </div>
                        <div className="relative pl-6 border-l-4 border-primary/20 py-2 text-left">
                            <Quote className="absolute top-0 right-0 h-16 w-16 opacity-[0.03] pointer-events-none text-left" />
                            <p className="text-base sm:text-xl font-medium leading-relaxed italic text-balance text-left">
                                &ldquo;{challenge.description}&rdquo;
                            </p>
                        </div>
                    </CardHeader>
                </Card>
            </header>

            <div className="space-y-8 text-left">
                <div className="flex items-center gap-3 px-1 text-left">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner text-left">
                        <Sparkles className="h-5 w-5 text-primary text-left" />
                    </div>
                    <h3 className="text-xl font-black font-headline uppercase tracking-tight text-left">Kingdom Solutions</h3>
                </div>

                <div className="space-y-4 text-left">
                    <div className="p-6 rounded-[2rem] bg-muted/20 border-2 border-dashed border-primary/10 space-y-4 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-2 text-left">Propose a Word or Solution</Label>
                        <Textarea 
                            placeholder="Share a strategy, scripture, or practical step for this territory..."
                            value={newSolution}
                            onChange={(e) => setNewSolution(e.target.value)}
                            className="min-h-[140px] rounded-2xl border-none bg-background shadow-inner text-base p-6 text-left"
                        />
                        <Button 
                            onClick={handlePostSolution}
                            disabled={isSubmitting || !newSolution.trim() || !user}
                            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 text-center"
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin text-left" /> : <Send className="mr-2 h-5 w-5 text-left" />}
                            PUBLISH SOLUTION
                        </Button>
                    </div>
                </div>

                <div className="space-y-6 text-left">
                    {solutionsLoading ? (
                        <div className="flex justify-center py-20 text-left"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20 text-left" /></div>
                    ) : solutions && solutions.length > 0 ? (
                        solutions.map(sol => (
                            <SolutionItem key={sol.id} solution={sol} challengeId={challengeId} />
                        ))
                    ) : (
                        <div className="text-center py-24 border-2 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center text-left">
                            <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6 text-left">
                                <MessageSquare className="h-10 w-10 text-primary opacity-10 text-left" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight opacity-40 text-center text-left">No Solutions Yet</h3>
                            <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-sm mx-auto text-balance text-center text-left">Be the first to provide a Kingdom insight for this regional challenge.</p>
                        </div>
                    )}
                </div>
            </div>

            <footer className="px-8 pt-12 border-t mt-12 text-center max-w-2xl mx-auto text-left">
                <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-[0.2em] opacity-40 italic text-balance text-center text-left">
                    "Thy kingdom come, Thy will be done in earth, as it is in heaven." — Matthew 6:10
                </p>
            </footer>
        </div>
    );
}
