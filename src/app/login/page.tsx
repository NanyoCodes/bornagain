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
    
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'System not ready',
        description: 'Please wait a moment and try again.',
      });
      return;
    }

    setIsGoogleLoading(true);

    const authProvider = new GoogleAuthProvider();
    authProvider.setCustomParameters({ prompt: 'select_account' });

    try {
      // Persistence is set globally in FirebaseClientProvider.
      const result = await signInWithPopup(auth, authProvider);
      const loggedUser = result.user;
      
      const nameParts = loggedUser.displayName?.split(/\s+/) || [];
      const firstName = nameParts[0] || 'Believer';
      const lastName = nameParts.slice(1).join(' ') || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const nameTokens = fullName.toLowerCase().split(/\s+/).filter(Boolean);

      const userDocRef = doc(firestore, 'users', loggedUser.uid);
      const userData = {
        firstName: firstName,
        lastName: lastName,
        fullName_lowercase: fullName.toLowerCase(),
        name_tokens: nameTokens,
        email: loggedUser.email,
        photoURL: loggedUser.photoURL,
        accountType: 'Personal',
      };

      // Non-blocking sync to Firestore
      setDoc(userDocRef, userData, { merge: true }).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'write',
          requestResourceData: userData,
        }, loggedUser);
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
      
      // Gracefully handle user cancellation
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
      setIsGoogleLoading(false);
    }
  };

  // If user is truthy and verified, we are about to redirect.
  if (authLoading || (user && (user.emailVerified || user.providerData.some(p => p.providerId === 'google.com')))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Entering Sanctuary...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout>
       <div className="space-y-6">
        <div className="grid gap-2 text-left">
          <h1 className="text-2xl md:text-3xl font-bold font-headline uppercase tracking-tight">Sign In</h1>
          <p className="text-sm text-muted-foreground font-medium">
              Enter your credentials to access your Kingdom dashboard.
          </p>
        </div>
        
        <LoginForm />

        <div className="text-center text-sm font-medium">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="underline cursor-pointer font-bold text-primary">
            Join Movement
          </Link>
        </div>

        <div className="relative">
              <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-background px-3 font-black text-muted-foreground tracking-widest">
                    Or Continue With
                  </span>
              </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" onClick={() => handleSocialLogin('google')} disabled={isGoogleLoading} className="h-12 rounded-xl font-bold">
                  {isGoogleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
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
