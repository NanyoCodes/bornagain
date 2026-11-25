
'use client';

import { AppShell } from '@/components/layout/app-shell';
import GroupCrusadeClient from '@/components/games/group-crusade-client';
import { useParams } from 'next/navigation';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Fellowship Crusade Arena Page.
 * Members of a fellowship engage in a collective Word battle.
 */
export default function GroupCrusadePage() {
    const params = useParams();
    const fellowshipId = params?.fellowshipId as string;

    return (
        <AppShell>
            <Suspense fallback={
                <div className="flex h-screen w-full flex-col items-center justify-center py-24 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Initializing Crusade Arena...</p>
                </div>
            }>
                {fellowshipId ? (
                    <GroupCrusadeClient fellowshipId={fellowshipId} />
                ) : (
                    <div className="p-20 text-center">Invalid Access</div>
                )}
            </Suspense>
        </AppShell>
    );
}
