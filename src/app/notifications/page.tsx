"use client";

import { AppShell } from '@/components/layout/app-shell';
import NotificationsPageContent from '@/app/dashboard/notifications/page.tsx';

export default function NotificationsStandalonePage() {
  return (
    <AppShell>
      <NotificationsPageContent />
    </AppShell>
  );
}
