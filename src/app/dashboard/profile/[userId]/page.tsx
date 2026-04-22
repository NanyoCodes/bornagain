import UserProfileClient from "@/components/profile/user-profile-client";

export default function UserProfilePage({ params }: { params: { userId: string } }) {
    return <UserProfileClient userId={params.userId} />;
}
