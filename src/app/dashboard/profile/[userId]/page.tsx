import UserProfileClient from "@/components/profile/user-profile-client";

type Params = Promise<{ userId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function UserProfilePage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
    const { userId } = await params;
    await searchParams;
    
    return <UserProfileClient userId={userId} />;
}
