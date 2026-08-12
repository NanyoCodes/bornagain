import { StrongholdCategoryClient } from '@/components/strongholds/stronghold-category-client';

type Params = Promise<{ category: string }>;

export default async function StrongholdCategoryPage({ params }: { params: Params }) {
  const { category } = await params;
  return <StrongholdCategoryClient category={category} />;
}
