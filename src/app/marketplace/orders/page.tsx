'use client';

import OrdersListClient from "@/components/marketplace/orders-list-client";
import { AppShell } from "@/components/layout/app-shell";

/**
 * @fileOverview Standalone route for the Kingdom Order Tracker.
 * Accessible at /marketplace/orders.
 */
export default function PersonalOrdersPage() {
    return (
        <AppShell>
            <OrdersListClient />
        </AppShell>
    );
}
