import CampaignPageClient from "@/components/campaigns/campaign-page-client";

export function generateStaticParams() {
  // Returning a dummy param to satisfy a persistent Next.js build error.
  return [{ campaignId: 'do-not-render' }];
}

export default function CampaignPage({ params }: { params: { campaignId: string } }) {
    return <CampaignPageClient campaignId={params.campaignId} />;
}
