'use client';

import { AppShell } from '@/components/layout/app-shell';
import CheckoutPageContent from '@/components/marketplace/checkout/page';

/**
 * @fileOverview Marketplace Checkout Hub.
 * Wraps the checkout content in the AppShell for consistent Kingdom navigation.
 */
export default function CheckoutPage() {
    return (
        <AppShell>
            <CheckoutPageContent />
        </AppShell>
    );
}
