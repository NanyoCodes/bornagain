import { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import CampaignsPageContent from '@/app/dashboard/campaigns/page';

export const metadata: Metadata = {
  title: 'Evangelism Campaigns - Join the Global Harvest',
  description: 'Discover and join soul-winning mission campaigns in your area. Mobilize with fellow believers to spread the Gospel and coordinate outreach efforts.',
  openGraph: {
    title: 'Active Mission Campaigns | Testify Global',
    description: 'Find a mission, join a team, and win souls for the Kingdom. Explore upcoming evangelism events.',
  },
};

export default function CampaignsStandalonePage() {
  return (
    <AppShell>
      <CampaignsPageContent />
    </AppShell>
  );
}
