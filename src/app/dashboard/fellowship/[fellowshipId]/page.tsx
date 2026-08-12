import FellowshipPageClient from "@/components/fellowship/fellowship-page-client";

type Params = Promise<{ fellowshipId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * @fileOverview Server component for the fellowship details page.
 * In Next.js 15, dynamic route params must be awaited even if accessed 
 * via useParams in a child client component.
 */
export default async function FellowshipDetailsPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
    // Ensure async params and searchParams are unwrapped to comply with Next.js 15 dynamic API requirements.
    const { fellowshipId } = await params;
    await searchParams;
    
    return <FellowshipPageClient fellowshipId={fellowshipId} />;
}
