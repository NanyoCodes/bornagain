import UserProfileClient from "@/components/profile/user-profile-client";

export function generateStaticParams() {
  // This satisfies the Next.js static export build requirement
  // by providing a dummy parameter.
  return [{ userId: 'dummy' }];
}

export default function UserProfilePage({ params }: { params: { userId: string } }) {
    return <UserProfileClient userId={params.userId} />;
}
