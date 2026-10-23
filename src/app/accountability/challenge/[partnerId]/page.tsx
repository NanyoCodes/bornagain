
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { WordChallengeGame } from '@/components/accountability/word-challenge-game';
import { AppShell } from '@/components/layout/app-shell';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import React, { useMemo } from 'react';

export default function PartnerChallengePage() {
    const params = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const partnerId = params?.partnerId as string;

    const partnerDocRef = useMemo(() => {
        if (!firestore || !partnerId) return null;
        return doc(firestore, 'users', partnerId);
    }, [firestore, partnerId]);

    const { data: partnerProfile, loading } = useDoc<UserProfile>(partnerDocRef);

    if (loading) {
        return (
            <AppShell>
                <div className="flex h-screen w-full flex-col items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-sm font-black uppercase tracking-widest text-primary animate-pulse text-center">Initializing Kingdom Arena...</p>
                </div>
            </AppShell>
        );
    }

    if (!partnerProfile) {
        return (
            <AppShell>
                <div className="flex h-full w-full flex-col items-center justify-center py-24 text-center">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-center">Partner not found</h2>
                    <Button variant="outline" onClick={() => router.back()} className="mt-8 rounded-xl h-11 px-8 font-bold text-center">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                    </Button>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="pt-4 sm:pt-10">
                <WordChallengeGame 
                    partnerId={partnerId} 
                    partnerName={`${partnerProfile.firstName} ${partnerProfile.lastName}`} 
                />
            </div>
        </AppShell>
    );
}
