'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Redirection logic for legacy /dashboard routes.
 * Preserves search parameters (e.g., soulId) to ensure context is maintained across hubs.
 */
export default function LegacyDashboardRedirectLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (pathname.startsWith('/dashboard')) {
      const searchParams = typeof window !== 'undefined' ? window.location.search : '';
      setIsRedirecting(true);
      
      const parts = pathname.split('/').filter(Boolean);
      // parts[0] is 'dashboard'
      const hubPath = parts.slice(1).join('/');
      const targetPath = hubPath ? `/${hubPath}` : '/testimonies';
      
      router.replace(targetPath + searchParams);
    }
  }, [pathname, router]);

  if (!isRedirecting) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center">
      <div className="relative mb-8 mx-auto w-fit text-left">
        <Loader2 className="h-12 w-12 animate-spin text-primary text-left text-left" />
        <div className="absolute inset-0 flex items-center justify-center text-left text-left">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse text-left text-left" />
        </div>
      </div>
      <p className="text-xl font-black font-headline tracking-[0.4em] uppercase text-primary animate-pulse text-center px-8 text-left text-left">
        Optimizing Kingdom Network...
      </p>
    </div>
  );
}
