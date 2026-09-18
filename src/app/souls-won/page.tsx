'use client';

import { AppShell } from '@/components/layout/app-shell';
import SoulsWonPage from '@/components/souls/souls-won-page';

/**
 * @fileOverview Standalone route for managing souls won.
 */
export default function SoulsWonStandalonePage() {
  return (
    <AppShell>
      <SoulsWonPage />
    </AppShell>
  );
}
