import CampaignPageClient from "@/components/campaigns/campaign-page-client";

export function generateStaticParams() {
  // This satisfies the Next.js static export build requirement
  // by providing a dummy parameter.
  return [{ campaignId: 'dummy' }];
}

export default function CampaignPage({ params }: { params: { campaignId: string } }) {
    return <CampaignPageClient campaignId={params.campaignId} />;
}
