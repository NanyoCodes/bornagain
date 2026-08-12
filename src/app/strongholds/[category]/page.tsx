import { StrongholdCategoryClient } from '@/components/strongholds/stronghold-category-client';
import { AppShell } from '@/components/layout/app-shell';

type Params = Promise<{ category: string }>;

/**
 * @fileOverview Root-level route for specific Victory Circles (Strongholds).
 * Part of the global URL flattening initiative.
 */
export default async function StrongholdCategoryPage(props: { params: Params }) {
  const params = await props.params;
  
  return (
    <AppShell>
      <StrongholdCategoryClient category={params.category} />
    </AppShell>
  );
}
