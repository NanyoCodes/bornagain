
'use client';

import TerritoriesPageClient from "@/components/territories/territories-page-client";
import { AppShell } from "@/components/layout/app-shell";

/**
 * @fileOverview Main dashboard for the Regional Territories Hub.
 * Part of the global mobilization initiative for regional problem-solving.
 */
export default function TerritoriesStandalonePage() {
    return (
        <AppShell>
            <TerritoriesPageClient />
        </AppShell>
    );
}
