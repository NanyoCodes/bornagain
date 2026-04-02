import UserProfileClient from "@/components/profile/user-profile-client";

export function generateStaticParams() {
  // This tells Next.js not to pre-render any user profile pages at build time.
  // They will be rendered on the client-side when a user navigates to them.
  return [];
}

export default function UserProfilePage({ params }: { params: { userId: string } }) {
    return <UserProfileClient userId={params.userId} />;
}
