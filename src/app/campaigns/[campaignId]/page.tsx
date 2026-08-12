import CampaignPageClient from "@/components/campaigns/campaign-page-client";

type Params = Promise<{ campaignId: string }>;

/**
 * @fileOverview Root-level route for campaign details and Kingdom Insights.
 * In Next.js 15, dynamic route params are provided as Promises and must be awaited.
 */
export default async function CampaignDetailsPage({ params }: { params: Params }) {
    const { campaignId } = await params;
    
    return <CampaignPageClient campaignId={campaignId} />;
}
