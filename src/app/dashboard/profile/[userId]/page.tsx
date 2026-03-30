import UserProfileClient from '@/components/profile/user-profile-client';

export async function generateStaticParams() {
  return [];
}

export default function UserProfilePage({ params }: { params: { userId: string } }) {
  return <UserProfileClient userId={params.userId} />;
}
