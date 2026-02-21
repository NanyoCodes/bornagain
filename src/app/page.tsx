
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { AuthLayout } from '@/components/auth/auth-layout';
import { SignUpForm } from '@/components/auth/signup-form';
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

export default function SignUpPage() {
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleSocialLogin = async (provider: 'google') => {
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Firebase not initialized',
        description: 'Please wait a moment and try again.',
      });
      return;
    }
    const authProvider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, authProvider);
      const user = result.user;

      const userDocRef = doc(firestore, 'users', user.uid);
      const userData = {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      };

      // Create user profile in Firestore
      setDoc(userDocRef, userData, { merge: true }).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'create',
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
      if (authError.code === 'auth/unauthorized-domain') {
        toast({
          variant: 'destructive',
          title: 'Sign Up Failed',
          description:
            "This app's domain is not authorized for authentication. Please contact support.",
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Sign Up Failed',
          description: 'An unexpected error occurred.',
        });
      }
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
                  width={50}
                  height={50}
                  className="mb-2 rounded-lg"
                  data-ai-hint={logo.imageHint}
              />
          )}
          <h1 className="text-2xl md:text-3xl font-bold">Create an account</h1>
          <p className="text-balance text-muted-foreground">
            Enter your details below to join the movement
          </p>
        </div>

        <SignUpForm />

        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline">
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

          <div className="flex justify-center gap-4">
              <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() => handleSocialLogin('google')}
              >
                  <Icons.google className="h-5 w-5" />
              </Button>
          </div>
        </div>
    </AuthLayout>
  );
}
