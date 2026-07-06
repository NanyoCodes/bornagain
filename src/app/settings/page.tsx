"use client";

import { AppShell } from '@/components/layout/app-shell';
import { SettingsPageContent } from '@/components/settings/settings-page-content';

export default function SettingsStandalonePage() {
  return (
    <AppShell>
      <SettingsPageContent />
    </AppShell>
  );
}
