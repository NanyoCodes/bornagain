
"use client";

/**
 * @fileOverview This component handles the email/password login form.
 * It includes logic for handling unverified email addresses and enforcing
 * session persistence.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import React, { useState } from "react";
import { Loader2, Mail, Lock } from "lucide-react";
import { signInWithEmailAndPassword, AuthError, sendEmailVerification, type User, setPersistence, browserLocalPersistence } from "firebase/auth";
import { useAuth, useFirestore } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
});

function EmailVerificationDialog({ user, isOpen, onOpenChange }: { user: User | null; isOpen: boolean; onOpenChange: (open: boolean) => void; }) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleResend = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            await sendEmailVerification(user);
            toast({
                title: "Verification Email Sent",
                description: `A new verification link has been sent to ${user.email}.`,
            });
            onOpenChange(false);
        } catch (error) {
            const authError = error as AuthError;
            toast({
                variant: "destructive",
                title: "Error",
                description: authError.code === 'auth/too-many-requests' 
                    ? 'Too many requests. Please try again later.'
                    : authError.message || "Could not send verification email.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent className="w-[90vw] max-w-md rounded-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle>Email Verification Required</AlertDialogTitle>
                    <AlertDialogDescription>
                        You must verify your email address before you can sign in. A verification link was sent to <strong>{user?.email}</strong>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <p className="text-sm text-muted-foreground">
                    Please check your inbox (and spam folder). If you don&apos;t see it, you can request a new one.
                </p>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel disabled={isLoading} onClick={() => onOpenChange(false)}>Close</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResend} disabled={isLoading} className="bg-primary text-primary-foreground">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Resend Verification Email
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const [userForVerification, setUserForVerification] = useState<User | null>(null);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isLoading) return;
    
    setIsLoading(true);
    if (!auth || !firestore) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "Firebase is not ready. Please try again.",
      });
      setIsLoading(false);
      return;
    }
    try {
      // Explicitly reinforce persistence to local for consistent behavior
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Check for email verification if using standard password login
      if (!user.emailVerified && user.providerData.some(p => p.providerId === 'password')) {
        setUserForVerification(user);
        setIsVerificationDialogOpen(true);
        setIsLoading(false);
        return;
      }

      // Background sync profile
      const userDocRef = doc(firestore, "users", user.uid);
      const nameParts = user.displayName?.split(' ') || [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ');
      const fullName = `${firstName} ${lastName}`;
      const nameTokens = fullName.toLowerCase().split(' ').filter(Boolean);

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
        title: "Welcome Back!",
        description: "You have been successfully signed in.",
      });
      
      router.push("/dashboard/testimonies");
    } catch (error) {
      const authError = error as AuthError;
      console.error('Email sign in error:', authError);
      
      let description = "An unexpected error occurred. Please try again.";
      
      switch (authError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          description = "Invalid email or password. Please check your credentials and try again.";
          break;
        case 'auth/too-many-requests':
          description = "Access to this account has been temporarily disabled due to many failed login attempts. You can restore it by resetting your password or try again later.";
          break;
        case 'auth/user-disabled':
          description = "This account has been disabled. Please contact support.";
          break;
        case 'auth/network-request-failed':
          description = "Network error. Please check your internet connection.";
          break;
        default:
          description = authError.message || description;
      }
      
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: description,
      });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} className="pl-10 h-11" />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                  <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link href="/forgot-password" size="sm" className="text-sm text-primary hover:underline font-medium">
                        Forgot password?
                      </Link>
                  </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} className="pl-10 h-11" />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" variant="default" className="w-full h-11 font-bold shadow-md" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </Form>
      <EmailVerificationDialog 
        user={userForVerification} 
        isOpen={isVerificationDialogOpen} 
        onOpenChange={setIsVerificationDialogOpen} 
      />
    </>
  );
}
