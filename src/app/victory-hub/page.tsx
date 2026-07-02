"use client";

import { AppShell } from '@/components/layout/app-shell';
import VictoryHubPageContent from '@/app/dashboard/victory-hub/page';

export default function VictoryHubStandalonePage() {
  return (
    <AppShell>
      <VictoryHubPageContent />
    </AppShell>
  );
}
