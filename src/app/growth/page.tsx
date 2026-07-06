import { Metadata } from 'next';
import { ProgressPageContent } from '@/app/dashboard/progress-page-content';
import { AppShell } from '@/components/layout/app-shell';

export const metadata: Metadata = {
  title: 'Spiritual Growth & Evangelism Tracking',
  description: 'Track your personal and city impact. Monitor souls won, discipline streaks, and monthly harvest goals to stay motivated in your service to the Kingdom.',
};

export default function GrowthStandalonePage() {
  return (
    <AppShell>
      <ProgressPageContent />
    </AppShell>
  );
}
