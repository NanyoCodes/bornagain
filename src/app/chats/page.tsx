"use client";

import { AppShell } from '@/components/layout/app-shell';
import ChatsPageContent from '@/app/dashboard/chats/page';

export default function ChatsStandalonePage() {
  return (
    <AppShell>
      <ChatsPageContent />
    </AppShell>
  );
}
