import { Metadata } from 'next';
import FellowshipPageContent from '@/app/dashboard/fellowship/page';

export const metadata: Metadata = {
  title: 'Fellowship Groups & Christian Associations Directory',
  description: 'Find a local or virtual fellowship group to grow in faith and collaborate on follow-up and discipleship. Connect with the global Body of Christ.',
};

/**
 * @fileOverview Flattened route for fellowship hub. 
 * Re-uses the dashboard content without nested shells.
 */
export default function FellowshipsStandalonePage() {
  return (
    <FellowshipPageContent />
  );
}
