'use client';

/**
 * @fileOverview This page handles the login experience, including social login (Google)
 * and traditional email/password login. It includes robust error handling and
 * automatic redirection for already-authenticated users.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth/auth-layout';
import { LoginForm } from '@/components/auth/login-form';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAuth, useFirestore, useUser } from '@/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  AuthError,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { user, loading: authLoading } = useUser();

  // Redirect away if already logged in AND verified
  useEffect(() => {
    if (!authLoading && user && (user.emailVerified || user.providerData.some(p => p.providerId === 'google.com'))) {
      router.replace('/testimonies');
    }
  }, [user, authLoading, router]);

  const handleSocialLogin = async (provider: 'google') => {
    if (isGoogleLoading) return;
    
    setIsGoogleLoading(true);
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'System not ready',
        description: 'Please wait a moment and try again.',
      });
      setIsGoogleLoading(false);
      return;
    }

    const authProvider = new GoogleAuthProvider();
    authProvider.setCustomParameters({ prompt: 'select_account' });

    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, authProvider);
      const user = result.user;
      
      const nameParts = user.displayName?.split(' ') || [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ');
      const fullName = `${firstName} ${lastName}`;
      const nameTokens = fullName.toLowerCase().split(' ').filter(Boolean);

      const userDocRef = doc(firestore, 'users', user.uid);
      const userData = {
        firstName: firstName,
        lastName: lastName,
        fullName_lowercase: fullName.toLowerCase(),
        name_tokens: nameTokens,
        email: user.email,
        photoURL: user.photoURL,
      };

      setDoc(userDocRef, userData, { merge: true }).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'write',
          requestResourceData: userData,
        }, user);
        errorEmitter.emit('permission-error', permissionError);
      });

      toast({
        title: 'Welcome Back!',
        description: 'You have been successfully signed in.',
      });
      
      // Force splash screen on dashboard mount
      sessionStorage.setItem('testify_force_splash', 'true');
      router.push('/testimonies');
    } catch (error) {
      const authError = error as AuthError;
      
      // Gracefully handle user cancellation to avoid console noise and overlays
      if (authError.code === 'auth/popup-closed-by-user') {
        setIsGoogleLoading(false);
        return;
      }

      console.error('Social login error:', authError);
      
      let message = 'An unexpected error occurred during sign in.';
      
      if (authError.code === 'auth/popup-blocked') {
        message = 'The login popup was blocked by your browser. Please allow popups and try again.';
      } else if (authError.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection.';
      }

      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: message,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // If user is truthy and verified, we are about to redirect.
  if (authLoading || (user && (user.emailVerified || user.providerData.some(p => p.providerId === 'google.com')))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthLayout>
       <div className="space-y-6">
        <div className="grid gap-2 text-left">
          <h1 className="text-2xl md:text-3xl font-bold">Sign In</h1>
          <p className="text-balance text-muted-foreground">
              Enter your email below to login to your account.
          </p>
        </div>
        
        <LoginForm />

        <div className="text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/" className="underline cursor-pointer font-semibold text-primary">
            Sign up
          </Link>
        </div>

        <div className="relative">
              <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or Continue With
                  </span>
              </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" onClick={() => handleSocialLogin('google')} disabled={isGoogleLoading} className="h-11 rounded-xl">
                  {isGoogleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Icons.google className="mr-2 h-4 w-4" />
                  )}
                  Google
              </Button>
          </div>
      </div>
    </AuthLayout>
  );
}
