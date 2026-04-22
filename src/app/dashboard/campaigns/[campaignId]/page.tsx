import CampaignPageClient from "@/components/campaigns/campaign-page-client";

export default function CampaignPage({ params, searchParams }: { params: { campaignId: string }, searchParams: { [key: string]: string | string[] | undefined } }) {
    return <CampaignPageClient campaignId={params.campaignId} />;
}
