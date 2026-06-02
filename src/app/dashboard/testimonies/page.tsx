"use client";

import TestimoniesPageContent from "@/components/testimonies/page";

/**
 * @fileOverview Dashboard route for testimonies and prayer requests.
 * Consolidates to the shared TestimoniesPageContent to ensure a 
 * consistent full-width mobile experience and live profile updates.
 */
export default function TestimoniesDashboardPage() {
  return <TestimoniesPageContent />;
}
