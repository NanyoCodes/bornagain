'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function UserProfileClient({ userId }: { userId: string }) {
  const router = useRouter();

  // Since public profiles are disabled, we redirect to the main profile page.
  // This component exists to satisfy the Next.js build process for dynamic routes.
  useEffect(() => {
    router.replace('/dashboard/profile');
  }, [router]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Redirecting...</p>
    </div>
  );
}
