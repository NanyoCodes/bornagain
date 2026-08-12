import UserProfileClient from "@/components/profile/user-profile-client";
import { AppShell } from "@/components/layout/app-shell";

type Params = Promise<{ userId: string }>;

/**
 * @fileOverview Flattened route for user profiles.
 */
export default async function PublicProfilePage({ params }: { params: Params }) {
    const { userId } = await params;
    
    return (
        <AppShell>
            <UserProfileClient userId={userId} />
        </AppShell>
    );
}
