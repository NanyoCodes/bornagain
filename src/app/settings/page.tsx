"use client";

import { AppShell } from '@/components/layout/app-shell';
import SettingsPageContent from '@/app/dashboard/settings/page';

export default function SettingsStandalonePage() {
  return (
    <AppShell>
      <SettingsPageContent />
    </AppShell>
  );
}
