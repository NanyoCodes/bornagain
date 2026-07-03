import OrdersListClient from "@/components/marketplace/orders-list-client";

/**
 * @fileOverview Server component for the personal Order Tracker page.
 * Users can view the status of gifts and meals they have sent.
 */
export default async function PersonalOrdersPage() {
    return <OrdersListClient />;
}
