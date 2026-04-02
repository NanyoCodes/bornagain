import CampaignPageClient from "@/components/campaigns/campaign-page-client";

export function generateStaticParams() {
  // Provide a dummy param to satisfy the Next.js static export build process.
  // This page will not be pre-rendered with meaningful data.
  return [{ campaignId: 'dummy' }];
}

export default function CampaignPage({ params }: { params: { campaignId: string } }) {
    return <CampaignPageClient campaignId={params.campaignId} />;
}
