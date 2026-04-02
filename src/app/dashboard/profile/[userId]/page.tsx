import UserProfileClient from "@/components/profile/user-profile-client";

export function generateStaticParams() {
  // Provide a dummy param to satisfy the Next.js static export build process.
  // This page will not be pre-rendered with meaningful data.
  return [{ userId: 'dummy' }];
}

export default function UserProfilePage({ params }: { params: { userId: string } }) {
    return <UserProfileClient userId={params.userId} />;
}
