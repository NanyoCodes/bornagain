import { StrongholdCategoryClient } from '@/components/strongholds/stronghold-category-client';
import { AppShell } from '@/components/layout/app-shell';

type Params = Promise<{ category: string }>;

/**
 * @fileOverview Root-level route for specific Victory Circles (Strongholds).
 * Part of the global URL flattening initiative.
 */
export default async function StrongholdCategoryPage({ params }: { params: Params }) {
  const { category } = await params;
  
  return (
    <AppShell>
      <StrongholdCategoryClient category={category} />
    </AppShell>
  );
}
