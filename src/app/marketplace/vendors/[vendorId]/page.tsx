'use client';

import VendorPageClient from "@/components/marketplace/vendor-page-client";
import { AppShell } from "@/components/layout/app-shell";
import { useParams } from "next/navigation";

/**
 * @fileOverview Root-level page for individual vendor storefronts.
 */
export default function VendorStorefrontPage() {
    const params = useParams();
    const vendorId = params.vendorId as string;
    
    return (
        <AppShell>
            <VendorPageClient vendorId={vendorId} />
        </AppShell>
    );
}
