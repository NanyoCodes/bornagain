'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Redirects internal dashboard progress routes to the global /growth hub.
 */
export default function DashboardProgressRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/growth');
  }, [router]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">
        Relocating to Growth Hub...
      </p>
    </div>
  );
}
