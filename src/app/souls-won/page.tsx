'use client';

import { AppShell } from '@/components/layout/app-shell';
import SoulsWonPage from '@/components/souls/souls-won-page';

/**
 * @fileOverview Standalone route for managing souls won.
 * Correctly imports the default exported component from the shared components folder.
 */
export default function SoulsWonStandalonePage() {
  return (
    <AppShell>
      <SoulsWonPage />
    </AppShell>
  );
}
