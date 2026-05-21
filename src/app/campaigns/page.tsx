"use client";

import { AppShell } from '@/components/layout/app-shell';
import CampaignsPageContent from '@/app/dashboard/campaigns/page';

export default function CampaignsStandalonePage() {
  return (
    <AppShell>
      <CampaignsPageContent />
    </AppShell>
  );
}
