'use client';

import { AppShell } from '@/components/layout/app-shell';
import GamesPageClient from '@/components/games/games-page-client';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Root-level standalone page for the Kingdom Arena.
 * Part of the global URL flattening initiative.
 */
export default function GamesStandalonePage() {
  return (
    <AppShell>
      <Suspense fallback={
          <div className="flex h-screen w-full flex-col items-center justify-center py-24 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Initializing Kingdom Arena...</p>
          </div>
      }>
        <GamesPageClient />
      </Suspense>
    </AppShell>
  );
}
