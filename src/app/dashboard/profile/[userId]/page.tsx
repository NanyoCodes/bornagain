import UserProfileClient from "@/components/profile/user-profile-client";

type Params = Promise<{ userId: string }>;

export default async function UserProfilePage(props: { params: Params }) {
    const params = await props.params;
    return <UserProfileClient userId={params.userId} />;
}
