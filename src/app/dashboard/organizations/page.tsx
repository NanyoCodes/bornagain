
'use client';

/**
 * @fileOverview Kingdom Organizations & Corporate Hub.
 * Users can discover, register, and manage church departments or businesses.
 */

import OrganizationPageClient from "@/components/organizations/organization-page-client";
import { AppShell } from "@/components/layout/app-shell";

export default function OrganizationsDashboardPage() {
  return (
    <AppShell>
      <OrganizationPageClient />
    </AppShell>
  );
}
