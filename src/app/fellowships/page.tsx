"use client";

import { AppShell } from '@/components/layout/app-shell';
import FellowshipPageContent from '@/app/dashboard/fellowship/page';

export default function FellowshipsStandalonePage() {
  return (
    <AppShell>
      <FellowshipPageContent />
    </AppShell>
  );
}
