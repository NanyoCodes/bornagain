import CampaignPageClient from "@/components/campaigns/campaign-page-client";

export function generateStaticParams() {
  return [];
}

export default function CampaignPage({ params }: { params: { campaignId: string } }) {
    return <CampaignPageClient campaignId={params.campaignId} />;
}
