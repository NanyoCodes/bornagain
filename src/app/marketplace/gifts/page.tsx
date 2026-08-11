'use client';

import GiftsMarketplaceClient from "@/components/marketplace/gifts-marketplace-client";
import { AppShell } from "@/components/layout/app-shell";

/**
 * @fileOverview Root-level page for the Kindness Center (Gifts).
 */
export default function KindnessCenterPage() {
    return (
        <AppShell>
            <GiftsMarketplaceClient />
        </AppShell>
    );
}
