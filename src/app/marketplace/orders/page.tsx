'use client';

import OrdersListClient from "@/components/marketplace/orders-list-client";
import { AppShell } from "@/components/layout/app-shell";

/**
 * @fileOverview Root-level page for the Kingdom Order Tracker.
 */
export default function OrderTrackerPage() {
    return (
        <AppShell>
            <OrdersListClient />
        </AppShell>
    );
}
