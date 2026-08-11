'use client';

import MealsMarketplaceClient from "@/components/marketplace/meals-marketplace-client";
import { AppShell } from "@/components/layout/app-shell";

/**
 * @fileOverview Root-level page for the Meals Provision Hub.
 */
export default function MealsProvisionPage() {
    return (
        <AppShell>
            <MealsMarketplaceClient />
        </AppShell>
    );
}
