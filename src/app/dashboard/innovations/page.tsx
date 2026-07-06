'use server';
/**
 * @fileOverview Kingdom Innovation Hub page.
 */

import { AppShell } from '@/components/layout/app-shell';
import InnovationClient from '@/components/innovations/innovation-client';

type Params = Promise<{ [key: string]: string | string[] | undefined }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function InnovationsPage(props: { params: Params; searchParams: SearchParams }) {
    const searchParams = await props.searchParams;
    const soulId = typeof searchParams.soulId === 'string' ? searchParams.soulId : null;

    return (
        <AppShell>
            <InnovationClient soulId={soulId} />
        </AppShell>
    );
}
