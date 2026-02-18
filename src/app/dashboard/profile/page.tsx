"use client";

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function ProfileRedirectPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(`/dashboard/profile/${user.uid}`);
    }
    // If not loading and no user, the main layout's effect will handle redirection to /login.
  }, [user, loading, router]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Loading your profile...</p>
    </div>
  );
}
