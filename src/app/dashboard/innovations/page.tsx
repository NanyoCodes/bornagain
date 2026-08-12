/**
 * @fileOverview Kingdom Innovation Hub page.
 */

import { AppShell } from '@/components/layout/app-shell';
import InnovationClient from '@/components/innovations/innovation-client';

type Params = Promise<{ [key: string]: string | string[] | undefined }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function InnovationsPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
    await params;
    const resolvedSearchParams = await searchParams;
    const soulId = typeof resolvedSearchParams.soulId === 'string' ? resolvedSearchParams.soulId : null;

    return (
        <AppShell>
            <InnovationClient soulId={soulId} />
        </AppShell>
    );
}
