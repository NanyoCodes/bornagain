'use client';

/**
 * @fileOverview This page handles Firebase Auth actions such as password reset and email verification.
 * It reads the 'mode' and 'oobCode' (Out Of Band code) from the URL parameters sent in Firebase emails.
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth/auth-layout';
import { useAuth } from '@/firebase';
import { verifyPasswordResetCode, applyActionCode } from 'firebase/auth';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { VerifyEmailContent } from '@/components/auth/verify-email-content';

function AuthActionHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = useAuth();
  
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!oobCode || !mode) {
      setError('Invalid link. Please request a new one.');
      setIsVerifying(false);
      return;
    }

    const verifyCode = async () => {
      try {
        if (mode === 'resetPassword') {
          const userEmail = await verifyPasswordResetCode(auth, oobCode);
          setEmail(userEmail);
        } else if (mode === 'verifyEmail') {
          await applyActionCode(auth, oobCode);
        }
        setIsVerifying(false);
      } catch (err: any) {
        console.error('Auth action error:', err);
        setError(err.message || 'The link has expired or already been used.');
        setIsVerifying(false);
      }
    };

    verifyCode();
  }, [auth, mode, oobCode]);

  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Verifying request...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <Button asChild className="w-full">
          <Link href="/login">Back to Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {mode === 'resetPassword' && oobCode && (
        <ResetPasswordForm oobCode={oobCode} email={email} />
      )}
      {mode === 'verifyEmail' && (
        <VerifyEmailContent />
      )}
      {!['resetPassword', 'verifyEmail'].includes(mode || '') && (
        <div className="text-center space-y-4">
          <p>Redirecting to login...</p>
          <Button asChild className="w-full">
            <Link href="/login">Go to Login</Link>
          </Button>
        </div>
      )}
    </>
  );
}

export default function AuthActionPage() {
  return (
    <AuthLayout>
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }>
        <AuthActionHandler />
      </Suspense>
    </AuthLayout>
  );
}
