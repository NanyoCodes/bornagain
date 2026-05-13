import CampaignPageClient from "@/components/campaigns/campaign-page-client";

type Params = Promise<{ campaignId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CampaignPage(props: { params: Params; searchParams: SearchParams }) {
    const params = await props.params;
    // Next.js 15 requires awaiting searchParams if the component is async, 
    // even if they aren't explicitly used, to prevent internal key-access errors.
    await props.searchParams;
    
    return <CampaignPageClient campaignId={params.campaignId} />;
}
