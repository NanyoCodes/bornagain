import CampaignPageClient from "@/components/campaigns/campaign-page-client";

export function generateStaticParams() {
  return [{ campaignId: 'dummy' }];
}

export default function CampaignPage({ params }: { params: { campaignId: string } }) {
    if (params.campaignId === 'dummy') {
        return null;
    }
    return <CampaignPageClient campaignId={params.campaignId} />;
}
