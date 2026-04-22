import UserProfileClient from "@/components/profile/user-profile-client";

export default function UserProfilePage({ params, searchParams }: { params: { userId: string }, searchParams: { [key: string]: string | string[] | undefined } }) {
    return <UserProfileClient userId={params.userId} />;
}
