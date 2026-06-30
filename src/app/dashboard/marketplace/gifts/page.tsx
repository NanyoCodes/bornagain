import GiftsMarketplaceClient from "@/components/marketplace/gifts-marketplace-client";

type Params = Promise<{ [key: string]: string | string[] | undefined }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * @fileOverview Server-side Page component for the Gifts Marketplace (Kindness Center).
 * Refactored for Next.js 15 to unwrap route props asynchronously before 
 * rendering the interactive client dashboard.
 */
export default async function GiftsPage(props: { params: Params; searchParams: SearchParams }) {
    await props.params;
    await props.searchParams;
    
    return <GiftsMarketplaceClient />;
}
