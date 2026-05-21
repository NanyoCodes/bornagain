'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/testimonies'); }, [router]);
  return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
}
