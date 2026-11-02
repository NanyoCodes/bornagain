
'use client';

import ChallengeDetailsClient from "@/components/territories/challenge-details-client";
import { AppShell } from "@/components/layout/app-shell";
import { useParams } from "next/navigation";

/**
 * @fileOverview Dynamic route for regional challenge details and solutions.
 */
export default function TerritoryChallengePage() {
    const params = useParams();
    const challengeId = params?.challengeId as string;
    
    return (
        <AppShell>
            {challengeId ? <ChallengeDetailsClient challengeId={challengeId} /> : <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>}
        </AppShell>
    );
}
