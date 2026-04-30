'use client';

/**
 * @fileOverview This page handles Firebase Auth actions such as password reset and email verification.
 * It reads the 'mode' and 'oobCode' (Out Of Band code) from the URL parameters sent in Firebase emails.
 * Next.js rewrites in next.config.ts ensure that standard Firebase links are routed here.
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
  const auth = useAuth();
  
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!oobCode || !mode) {
      setError('Invalid link parameters. Please request a new link from the app.');
      setIsVerifying(false);
      return;
    }

    const verifyCode = async () => {
      try {
        if (mode === 'resetPassword') {
          // Get the email associated with the reset code to show the user
          const userEmail = await verifyPasswordResetCode(auth, oobCode);
          setEmail(userEmail);
        } else if (mode === 'verifyEmail') {
          // Immediately apply the verification code
          await applyActionCode(auth, oobCode);
        }
        setIsVerifying(false);
      } catch (err: any) {
        console.error('Auth action verification error:', err);
        let message = 'The link has expired or already been used. Please try requesting a new one.';
        if (err.code === 'auth/invalid-action-code') {
          message = 'This link is invalid or has expired.';
        } else if (err.code === 'auth/user-not-found') {
          message = 'The user associated with this link could not be found.';
        }
        setError(message);
        setIsVerifying(false);
      }
    };

    verifyCode();
  }, [auth, mode, oobCode]);

  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Verifying security code...</p>
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
          <h1 className="text-2xl font-bold">Verification Failed</h1>
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
          <p>This action is not supported by the custom UI. Redirecting to login...</p>
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
