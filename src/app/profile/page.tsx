"use client";

import { AppShell } from '@/components/layout/app-shell';
import ProfilePageContent from '@/app/dashboard/profile/page.tsx';

export default function ProfileStandalonePage() {
  return (
    <AppShell>
      <ProfilePageContent />
    </AppShell>
  );
}
