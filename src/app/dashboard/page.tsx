
"use client";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/progress');
  }, [router]);
  
  return (
     <div className="flex h-full w-full flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Redirecting to Progress page...</p>
    </div>
  );
}
