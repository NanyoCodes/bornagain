import CampaignPageClient from "@/components/campaigns/campaign-page-client";

export default function CampaignPage(props: { params: { campaignId: string } }) {
    return <CampaignPageClient campaignId={props.params.campaignId} />;
}
