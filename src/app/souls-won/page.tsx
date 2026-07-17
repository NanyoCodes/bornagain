"use client";

import { AppShell } from '@/components/layout/app-shell';
import SoulsWonPage from '@/components/souls/souls-won-page';

export default function SoulsWonStandalonePage() {
  return (
    <AppShell>
      <SoulsWonPage />
    </AppShell>
  );
}
