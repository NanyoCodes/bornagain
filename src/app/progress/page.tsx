'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Redirects legacy /progress routes to the new /growth hub.
 */
export default function ProgressRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/growth');
  }, [router]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-background">
      <div className="relative mb-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
      <p className="text-xl font-black font-headline tracking-[0.4em] uppercase text-primary animate-pulse text-center px-8">
        Moving to Growth Hub...
      </p>
    </div>
  );
}
