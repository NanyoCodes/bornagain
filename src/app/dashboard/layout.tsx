'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Redirection logic for legacy /dashboard routes.
 * Updated to preserve search parameters (e.g., soulId) during path flattening.
 */
export default function LegacyDashboardRedirectLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (pathname.startsWith('/dashboard')) {
      setIsRedirecting(true);
      const newPath = pathname.replace('/dashboard', '');
      const queryParams = typeof window !== 'undefined' ? window.location.search : '';
      const finalTarget = (newPath || '/testimonies') + queryParams;
      router.replace(finalTarget);
    }
  }, [pathname, router]);

  if (!isRedirecting) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center">
      <div className="relative mb-8 mx-auto w-fit">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
      <p className="text-xl font-black font-headline tracking-[0.4em] uppercase text-primary animate-pulse text-center px-8">
        Optimizing Kingdom Network...
      </p>
    </div>
  );
}
