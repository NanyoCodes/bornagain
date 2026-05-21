"use client";

import { AppShell } from '@/components/layout/app-shell';
import SoulsWonPageContent from '@/components/souls/souls-won-page';

export default function SoulsWonStandalonePage() {
  return (
    <AppShell>
      <SoulsWonPageContent />
    </AppShell>
  );
}
