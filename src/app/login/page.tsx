'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { AuthLayout } from '@/components/auth/auth-layout';
import { LoginForm } from '@/components/auth/login-form';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAuth, useFirestore } from '@/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  AuthError,
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Image from 'next/image';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
      const result = await signInWithPopup(auth, authProvider);
      const user = result.user;
      const displayName = user.displayName || '';

      const userDocRef = doc(firestore, 'users', user.uid);
      const userData = {
        displayName: displayName,
        displayName_lowercase: displayName.toLowerCase(),
        displayName_tokens: displayName.toLowerCase().split(/\s+/).filter(Boolean),
        email: user.email,
        photoURL: user.photoURL,
      };

      // Create or merge user profile in Firestore
      setDoc(userDocRef, userData, { merge: true }).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'write',
          requestResourceData: userData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });

      toast({
        title: 'Success',
        description: 'You are now logged in.',
      });
      router.push('/dashboard');
    } catch (error) {
      const authError = error as AuthError;
      if (authError.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: authError.message || 'An unexpected error occurred.',
        });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <AuthLayout>
       <div className="space-y-6">
        <div className="grid gap-2 text-left">
          {logo && (
              <Image
                  src={logo.imageUrl}
                  alt={logo.description}
                  width={80}
                  height={80}
                  className="mb-2 rounded-lg"
                  data-ai-hint={logo.imageHint}
              />
          )}
          <h1 className="text-2xl md:text-3xl font-bold">Sign In</h1>
          <p className="text-balance text-muted-foreground">
              Enter your email below to login to your account.
          </p>
        </div>
        
        <LoginForm />

        <div className="text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/" className="underline">
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
