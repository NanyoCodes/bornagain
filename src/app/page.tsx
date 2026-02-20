'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlaceHolderImages } from '@/lib/placeholder-images';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhoneAuthForm } from '@/components/auth/phone-auth-form';

export default function SignUpPage() {
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');
  const authHero = PlaceHolderImages.find((img) => img.id === 'auth-hero');
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
        title: 'Account Created',
        description: 'Welcome to Testify! You are now logged in.',
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
          description: authError.message || 'An error occurred during social sign-up.',
        });
      }
    }
  };

  return (
    <main className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="mx-auto grid w-full max-w-xs gap-4">
          <div className="grid gap-2 text-center">
            {logo && (
              <Image
                src={logo.imageUrl}
                alt={logo.description}
                width={120}
                height={120}
                className="mx-auto mb-2 rounded-full"
                data-ai-hint={logo.imageHint}
              />
            )}
            <h1 className="text-2xl font-bold tracking-tight">Create an Account</h1>
            <p className="text-balance text-muted-foreground text-sm">
              Already have an account?{' '}
              <Link href="/login" className="underline">
                Sign in
              </Link>
            </p>
          </div>

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>
            <TabsContent value="email" className="pt-4">
              <SignUpForm />
            </TabsContent>
            <TabsContent value="phone" className="pt-4">
              <PhoneAuthForm />
            </TabsContent>
          </Tabs>

          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or Continue With
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Button
              variant="outline"
              className="w-full h-9"
              onClick={() => handleSocialLogin('google')}
            >
              <Icons.google className="mr-2 h-4 w-4" /> Google
            </Button>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        {authHero && (
          <Image
            src={authHero.imageUrl}
            alt={authHero.description}
            width="1920"
            height="1080"
            className="h-full w-full object-cover"
            data-ai-hint={authHero.imageHint}
            priority
          />
        )}
      </div>
    </main>
  );
}
