'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth/auth-layout';
import { SignUpForm } from '@/components/auth/signup-form';
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

export default function Page() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { user, loading: authLoading } = useUser();

  // Redirect away if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard/testimonies');
    }
  }, [user, authLoading, router]);

  const handleSocialLogin = async (provider: 'google') => {
    setIsGoogleLoading(true);
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Firebase not initialized',
        description: 'Please wait a moment and try again.',
      });
      setIsGoogleLoading(false);
      return;
    }
    const authProvider = new GoogleAuthProvider();
    try {
      // Ensure persistence is set before sign in
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

      // Create user profile in Firestore
      setDoc(userDocRef, userData, { merge: true }).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'write',
          requestResourceData: userData,
        }, user);
        errorEmitter.emit('permission-error', permissionError);
      });

      toast({
        title: 'Success',
        description: 'You are now logged in.',
      });

      // Force splash screen on dashboard mount
      sessionStorage.setItem('testify_force_splash', 'true');
      router.push('/dashboard/testimonies');
    } catch (error) {
      const authError = error as AuthError;
      if (authError.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: 'destructive',
          title: 'Sign Up Failed',
          description: authError.message || 'An unexpected error occurred.',
        });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // STRIKE: If user is truthy, we are about to redirect. Return the loader to prevent the signup form from flickering.
  if (authLoading || user) {
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
          <h1 className="text-2xl md:text-3xl font-bold">Create an account</h1>
          <p className="text-balance text-muted-foreground">
            Enter your details below to create your account and join the global movement.
          </p>
        </div>

        <SignUpForm />

        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline cursor-pointer">
            Sign in
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
              <Button variant="outline" onClick={() => handleSocialLogin('google')} disabled={isGoogleLoading}>
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
