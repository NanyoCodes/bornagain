import { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import TestimoniesPageContent from '@/components/testimonies/page';

export const metadata: Metadata = {
  title: 'Christian Testimonies - Faith Stories from Around the World',
  description: 'Read inspiring stories of God\'s power and grace. Share your own testimony to encourage the Body of Christ and give glory to Jesus for His miracles and provisions.',
  openGraph: {
    title: 'Christian Testimonies Feed | Testify Global',
    description: 'A living stream of God\'s goodness. See how Jesus is transforming lives across the globe.',
  },
};

export default function TestimoniesStandalonePage() {
  return (
    <AppShell>
      <TestimoniesPageContent />
    </AppShell>
  );
}
