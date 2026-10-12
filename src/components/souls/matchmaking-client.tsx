'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useUser, useDoc, useFirestore } from '@/firebase';
import type { Soul } from '@/lib/types';
import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HeartHandshake, Loader2, Sparkles, UserPlus } from 'lucide-react';

export default function MatchmakingClient() {
    const searchParams = useSearchParams();
    const soulId = searchParams.get('soulId');
    const soulName = searchParams.get('soulName');
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();

    const soulDocRef = useMemo(() => {
        if (!soulId || !user?.uid || !firestore) return null;
        return doc(firestore, `users/${user.uid}/souls`, soulId);
    }, [soulId, user?.uid, firestore]);

    const { data: soul, loading } = useDoc<Soul>(soulDocRef);

    if (loading) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Accessing Records...</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-32">
            <header className="px-4 sm:px-0 space-y-4 pt-4 text-left">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <HeartHandshake className="h-4 w-4 text-primary" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Kingdom Alliance</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black font-headline tracking-tight uppercase truncate">Proposed Matchmaking</h1>
                    </div>
                </div>

                <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-6 rounded-[2rem] flex items-center justify-between group shadow-inner">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                            <Sparkles className="h-6 w-6 text-white animate-pulse" />
                        </div>
                        <div>
                            <p className="text-lg font-black uppercase tracking-tight leading-tight">Finding a suitable match for {soulName || soul?.firstName}</p>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-80">Divine Connections Protocol Active</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="px-4 sm:px-0">
                <Card className="rounded-[2.5rem] border-none shadow-xl bg-card">
                    <CardContent className="p-12 text-center flex flex-col items-center justify-center">
                        <div className="h-20 w-20 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                            <HeartHandshake className="h-10 w-10 text-primary opacity-20" />
                        </div>
                        <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-40">Coming Soon</h3>
                        <p className="text-sm text-muted-foreground italic mt-2 max-w-xs leading-relaxed text-balance">
                            The Kingdom matchmaking algorithm is currently in training. Soon you will be able to propose godly relationships for the souls in your harvest.
                        </p>
                        <Button variant="outline" className="mt-10 rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-[10px]" onClick={() => router.back()}>
                            RETURN TO DASHBOARD
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
