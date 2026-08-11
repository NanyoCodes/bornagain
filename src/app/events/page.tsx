import { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import EventPageClient from '@/components/events/event-page-client';

export const metadata: Metadata = {
  title: 'Kingdom Events & Gatherings',
  description: 'Discover and join worship nights, conferences, and outreach gatherings in the global Body of Christ.',
};

export default function EventsStandalonePage() {
  return (
    <AppShell>
      <EventPageClient />
    </AppShell>
  );
}
