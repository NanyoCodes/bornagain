import VendorPageClient from "@/components/marketplace/vendor-page-client";

type Params = Promise<{ vendorId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * @fileOverview Server-side Page component for individual Vendor storefronts.
 * Refactored for Next.js 15 to correctly handle dynamic route params as Promises.
 */
export default async function VendorPage(props: { params: Params; searchParams: SearchParams }) {
    const params = await props.params;
    await props.searchParams;
    
    return <VendorPageClient vendorId={params.vendorId} />;
}