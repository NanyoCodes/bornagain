'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function ProgressRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/testimonies');
  }, [router]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Redirecting to Growth Hub...</p>
    </div>
  );
}
