import UserProfileClient from "@/components/profile/user-profile-client";

type Params = Promise<{ userId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function UserProfilePage(props: { params: Params; searchParams: SearchParams }) {
    const params = await props.params;
    await props.searchParams;
    
    return <UserProfileClient userId={params.userId} />;
}
