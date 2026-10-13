
'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import MatchmakingClient from '@/components/souls/matchmaking-client';
import { Loader2 } from 'lucide-react';

export default function MatchmakingStandalonePage() {
  return (
    <AppShell>
      <Suspense fallback={
        <div className="flex h-full w-full flex-col items-center justify-center py-20 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Initializing Alliance Hub...</p>
        </div>
      }>
        <MatchmakingClient />
      </Suspense>
    </AppShell>
  );
}
