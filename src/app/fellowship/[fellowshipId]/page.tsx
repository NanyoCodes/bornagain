
import FellowshipPageClient from "@/components/fellowship/fellowship-page-client";
import { AppShell } from "@/components/layout/app-shell";

type Params = Promise<{ fellowshipId: string }>;

/**
 * @fileOverview Flattened route for fellowship details.
 * Correctly awaits async params for Next.js 15 compatibility.
 */
export default async function FellowshipDetailsPage({ params }: { params: Params }) {
    const { fellowshipId } = await params;
    
    return (
        <AppShell>
            <FellowshipPageClient fellowshipId={fellowshipId} />
        </AppShell>
    );
}
