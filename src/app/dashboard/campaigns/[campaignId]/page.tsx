import CampaignPageClient from "@/components/campaigns/campaign-page-client";

export function generateStaticParams() {
  // This tells Next.js not to pre-render any campaign pages at build time.
  // They will be rendered on the client-side when a user navigates to them.
  return [];
}

export default function CampaignPage({ params }: { params: { campaignId: string } }) {
    return <CampaignPageClient campaignId={params.campaignId} />;
}
