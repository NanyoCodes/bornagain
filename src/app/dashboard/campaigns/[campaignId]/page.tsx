import CampaignPageClient from "@/components/campaigns/campaign-page-client";

type Params = Promise<{ campaignId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CampaignPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
    const { campaignId } = await params;
    await searchParams;
    
    return <CampaignPageClient campaignId={campaignId} />;
}
