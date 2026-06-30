import MealsMarketplaceClient from "@/components/marketplace/meals-marketplace-client";

type Params = Promise<{ [key: string]: string | string[] | undefined }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * @fileOverview Server-side Page component for the Meals Marketplace (Provision Hub).
 * Decouples Promise-based route props from the interactive Client Component 
 * to align with Next.js 15 asynchronous dynamic API standards.
 */
export default async function MealsPage(props: { params: Params; searchParams: SearchParams }) {
    await props.params;
    await props.searchParams;
    
    return <MealsMarketplaceClient />;
}
