'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export function VerifyEmailContent() {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <CheckCircle2 className="h-16 w-16 text-primary" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Email Verified</h1>
        <p className="text-muted-foreground">
          Thank you for verifying your email. Your account is now fully active and ready for the global movement.
        </p>
      </div>
      <Button asChild className="w-full">
        <Link href="/login">Continue to Sign In</Link>
      </Button>
    </div>
  );
}
