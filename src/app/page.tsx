"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { SignUpForm } from "@/components/auth/signup-form";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, AuthError } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc } from "firebase/firestore";


export default function SignUpPage() {
  const logo = PlaceHolderImages.find((img) => img.id === "logo");
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    const authProvider = provider === 'google' ? new GoogleAuthProvider() : new FacebookAuthProvider();
    try {
      const result = await signInWithPopup(auth, authProvider);
      const user = result.user;

      // Create user profile in Firestore
      await setDoc(doc(firestore, "users", user.uid), {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL
      }, { merge: true });


      toast({
        title: "Account Created",
        description: "Welcome to Testify! You are now logged in.",
      });
      router.push("/dashboard");
    } catch (error) {
      const authError = error as AuthError;
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: authError.message || "An error occurred during social sign-up.",
      });
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4 md:p-8">
        <div className="w-full max-w-md space-y-6 text-center">
          {logo && (
            <Image
              src={logo.imageUrl}
              alt={logo.description}
              width={120}
              height={30}
              className="mx-auto"
              data-ai-hint={logo.imageHint}
              priority
            />
          )}
          <div className="space-y-2">
            <h1 className="font-headline text-4xl font-bold tracking-tighter text-primary">
              Create an Account
            </h1>
            <p className="text-muted-foreground">
              Join believers worldwide to share your faith.
            </p>
          </div>
          <SignUpForm />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or sign up with
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => handleSocialLogin('google')}>
              <Icons.google className="mr-2 h-5 w-5" />
              Google
            </Button>
            <Button variant="outline" onClick={() => handleSocialLogin('facebook')}>
              <Icons.facebook className="mr-2 h-5 w-5 text-[#1877F2]" />
              Facebook
            </Button>
          </div>
          <p className="px-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="underline underline-offset-4 hover:text-primary"
            >
              Log In
            </Link>
            .
          </p>
        </div>
      </div>
      <div className="hidden lg:flex lg:flex-1">
         <Image
            src="https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=2070&auto=format&fit=crop"
            alt="People gathered together in a community setting, smiling and talking."
            width={1920}
            height={1080}
            className="h-full w-full object-cover"
            priority
          />
      </div>
    </div>
  );
}
