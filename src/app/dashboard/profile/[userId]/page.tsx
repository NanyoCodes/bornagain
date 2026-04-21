import UserProfileClient from "@/components/profile/user-profile-client";

export default function UserProfilePage(props: { params: { userId: string } }) {
    return <UserProfileClient userId={props.params.userId} />;
}
