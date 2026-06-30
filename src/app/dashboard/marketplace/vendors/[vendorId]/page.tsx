import VendorPageClient from "@/components/marketplace/vendor-page-client";

type Params = Promise<{ vendorId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * @fileOverview Server-side Page component for individual Vendor storefronts.
 * Following Next.js 15 best practices by unwrapping params asynchronously 
 * before passing them to the high-fidelity client component.
 */
export default async function VendorPage(props: { params: Params; searchParams: SearchParams }) {
    const params = await props.params;
    await props.searchParams;
    
    return <VendorPageClient vendorId={params.vendorId} />;
}
