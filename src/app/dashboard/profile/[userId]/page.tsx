import UserProfileClient from "@/components/profile/user-profile-client";

// This function is required by Next.js's static export feature for dynamic routes.
// It provides a "dummy" param to satisfy the build process. No pages are actually
// generated at build time for this, but it prevents the build from failing.
export function generateStaticParams() {
  return [{ userId: 'dummy' }];
}

export default function UserProfilePage({ params }: { params: { userId: string } }) {
    // The dummy page should not be rendered. Real routes are handled by the client.
    if (params.userId === 'dummy') {
        return null;
    }
    
    // This page wrapper renders the client component, which will handle the redirect.
    return <UserProfileClient userId={params.userId} />;
}
