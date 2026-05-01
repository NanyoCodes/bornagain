import CampaignPageClient from "@/components/campaigns/campaign-page-client";

type Params = Promise<{ campaignId: string }>;

export default async function CampaignPage(props: { params: Params }) {
    const params = await props.params;
    return <CampaignPageClient campaignId={params.campaignId} />;
}
