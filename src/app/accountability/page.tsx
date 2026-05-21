"use client";

import { AppShell } from '@/components/layout/app-shell';
import AccountabilityPageContent from '@/app/dashboard/accountability/page';

export default function AccountabilityStandalonePage() {
  return (
    <AppShell>
      <AccountabilityPageContent />
    </AppShell>
  );
}
