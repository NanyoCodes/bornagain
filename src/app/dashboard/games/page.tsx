'use client';

import { AppShell } from '@/components/layout/app-shell';
import GamesPageClient from '@/components/games/games-page-client';

/**
 * @fileOverview Main dashboard entry point for the Kingdom Games Hub.
 */
export default function GamesHubPage() {
  return (
    <AppShell>
      <GamesPageClient />
    </AppShell>
  );
}
