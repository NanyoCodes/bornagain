import FellowshipPageClient from "@/components/fellowship/fellowship-page-client";

export default function FellowshipDetailsPage({ params }: { params: { fellowshipId: string } }) {
    return <FellowshipPageClient fellowshipId={params.fellowshipId} />;
}
