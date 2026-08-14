'use client';

/**
 * @fileOverview This file provides the content for the personal profile page.
 * It has been refactored to export the ProfilePageContent as a default export
 * and use the UserProfileClient to show the current user's profile.
 */

import UserProfileClient from "@/components/profile/user-profile-client";
import { useUser } from "@/firebase";
import { Loader2 } from "lucide-react";

export default function ProfilePageContent() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
            Loading Identity...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
        <div className="flex h-full w-full items-center justify-center py-20">
            <p className="text-sm text-muted-foreground italic">Please sign in to view your profile.</p>
        </div>
    );
  }

  return <UserProfileClient userId={user.uid} />;
}
