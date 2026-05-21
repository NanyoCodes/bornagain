"use client";

import { AppShell } from '@/components/layout/app-shell';
import TestimoniesPageContent from '@/components/testimonies/page';

export default function TestimoniesStandalonePage() {
  return (
    <AppShell>
      <TestimoniesPageContent />
    </AppShell>
  );
}
