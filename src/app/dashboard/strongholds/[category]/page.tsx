
import { StrongholdCategoryClient } from '@/components/strongholds/stronghold-category-client';

type Params = Promise<{ category: string }>;

export default async function StrongholdCategoryPage(props: { params: Params }) {
  const params = await props.params;
  return <StrongholdCategoryClient category={params.category} />;
}
