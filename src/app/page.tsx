
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
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhoneAuthForm } from "@/components/auth/phone-auth-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";


export default function SignUpPage() {
  const logo = PlaceHolderImages.find((img) => img.id === "logo");
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    if (!auth || !firestore) {
      toast({
        variant: "destructive",
        title: "Firebase not initialized",
        description: "Please wait a moment and try again.",
      });
      return;
    }
    const authProvider = provider === 'google' ? new GoogleAuthProvider() : new FacebookAuthProvider();
    try {
      const result = await signInWithPopup(auth, authProvider);
      const user = result.user;

      const userDocRef = doc(firestore, "users", user.uid);
      const userData = {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL
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
        title: "Account Created",
        description: "Welcome to Testify! You are now logged in.",
      });
      router.push("/dashboard");
    } catch (error) {
      const authError = error as AuthError;
      if (authError.code === 'auth/unauthorized-domain') {
        toast({
          variant: "destructive",
          title: "Sign Up Failed",
          description: "This app's domain is not authorized for authentication. Please contact support.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Sign Up Failed",
          description: authError.message || "An error occurred during social sign-up.",
        });
      }
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            {logo && (
              <Image
                src={logo.imageUrl}
                alt={logo.description}
                width={150}
                height={45}
                className="mx-auto"
                data-ai-hint={logo.imageHint}
                priority
              />
            )}
            <CardTitle className="text-2xl mt-4">Create an Account</CardTitle>
            <CardDescription>
              Enter your information to join the community
            </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
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
          
          <div className="relative">
              <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
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
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
            <p>
                Already have an account?{" "}
                <Link href="/login" className="underline font-semibold">
                Sign in
                </Link>
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
