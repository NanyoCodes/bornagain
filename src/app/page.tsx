
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
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black p-4">
        {/* Decorative blob */}
        <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/2 w-[200%] h-2/3 bg-white [clip-path:path('M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,133.3C672,117,768,139,864,165.3C960,192,1056,224,1152,218.7C1248,213,1344,171,1392,149.3L1440,128L1440,0L0,0Z')]"></div>
        
        <div className="absolute top-6 right-6 z-20">
            <p className="text-center text-sm text-gray-300">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-white underline">
                Sign in
                </Link>
            </p>
        </div>

        <div className="relative z-10 w-full max-w-sm">
            <div className="absolute -top-52 left-1/2 w-full -translate-x-1/2 text-center">
                 <h1 className="text-5xl font-bold text-gray-900">Create Account</h1>
            </div>
            
            <div className="space-y-6">
                <Tabs defaultValue="email" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-zinc-900 text-zinc-400">
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
                    <span className="w-full border-t border-zinc-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-black px-2 text-zinc-500">
                        Or Continue With
                    </span>
                    </div>
                </div>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" size="icon" className="rounded-full bg-zinc-900 border-zinc-800 hover:bg-zinc-800" onClick={() => handleSocialLogin('google')}>
                    <Icons.google className="h-5 w-5" />
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full bg-zinc-900 border-zinc-800 hover:bg-zinc-800" onClick={() => handleSocialLogin('facebook')}>
                    <Icons.facebook className="h-5 w-5 text-[#1877F2]" />
                  </Button>
                </div>
            </div>
        </div>
    </div>
  );
}
