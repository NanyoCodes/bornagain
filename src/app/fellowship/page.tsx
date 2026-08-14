
import { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import FellowshipPageContent from '@/app/dashboard/fellowship/page';

export const metadata: Metadata = {
  title: 'Fellowship Groups & Christian Associations',
  description: 'Connect with local and virtual fellowship groups to grow in faith and collaborate on discipleship.',
};

export default function FellowshipStandalonePage() {
  return (
    <AppShell>
      <FellowshipPageContent />
    </AppShell>
  );
}
