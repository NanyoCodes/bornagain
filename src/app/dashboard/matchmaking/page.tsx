'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import MatchmakingClient from '@/components/souls/matchmaking-client';
import { Loader2 } from 'lucide-react';

export default function MatchmakingPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
        <MatchmakingClient />
      </Suspense>
    </AppShell>
  );
}
