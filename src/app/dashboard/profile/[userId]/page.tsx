import UserProfileClient from "@/components/profile/user-profile-client";

// This function is required by Next.js's static export feature for dynamic routes.
export function generateStaticParams() {
  return [];
}

export default function UserProfilePage({ params }: { params: { userId: string } }) {
    // This page wrapper renders the client component, which will handle the redirect.
    return <UserProfileClient userId={params.userId} />;
}
