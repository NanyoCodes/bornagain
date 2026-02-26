
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
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
import { signInWithEmailAndPassword, sendPasswordResetEmail, AuthError, signOut, sendEmailVerification, type User } from "firebase/auth";
import { useAuth, useFirestore } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
});

// Component for the Forgot Password dialog
function ForgotPasswordDialog() {
    const { toast } = useToast();
    const auth = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState("");

    const handlePasswordReset = async () => {
        if (!auth) {
            toast({ variant: "destructive", title: "Firebase not initialized." });
            return;
        }
        if (!email) {
            toast({ variant: "destructive", title: "Email is required." });
            return;
        }
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            toast({
                title: "Password Reset Email Sent",
                description: "Check your inbox for a link to reset your password.",
            });
            setIsOpen(false);
            setEmail("");
        } catch (error) {
            const authError = error as AuthError;
            toast({
                variant: "destructive",
                title: "Error Sending Reset Email",
                description: authError.message || "Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="link" className="p-0 text-sm h-auto font-normal" type="button">
                    Forgot password?
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Forgot Your Password?</AlertDialogTitle>
                    <AlertDialogDescription>
                        No problem. Enter your email address below and we'll send you a link to reset it.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reset-email" className="text-right">
                            Email
                        </Label>
                        <Input
                            id="reset-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="col-span-3"
                        />
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePasswordReset} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Reset Link
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// Dialog for handling unverified email
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
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Email Verification Required</AlertDialogTitle>
                    <AlertDialogDescription>
                        You must verify your email address before you can sign in. A verification link was sent to <strong>{user?.email}</strong> when you created your account.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <p className="text-sm text-muted-foreground">
                    Please check your inbox (and spam folder). If you don&apos;t see it, you can request a new one.
                </p>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading} onClick={() => onOpenChange(false)}>Close</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResend} disabled={isLoading}>
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
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      if (!user.emailVerified && user.providerData.some(p => p.providerId === 'password')) {
        setUserForVerification(user);
        setIsVerificationDialogOpen(true);
        await signOut(auth);
        setIsLoading(false);
        return;
      }

      const userDocRef = doc(firestore, "users", user.uid);
      const userData = {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      };

      // Create or merge user profile in Firestore to ensure it exists
      setDoc(userDocRef, userData, { merge: true }).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'write',
          requestResourceData: userData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });

      toast({
        title: "Success",
        description: "You are now logged in.",
      });
      router.push("/dashboard");
    } catch (error) {
      const authError = error as AuthError;
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
          description = "This account has been disabled.";
          break;
        default:
          description = authError.message || description;
      }
      
      toast({
        variant: "destructive",
        title: "Login Failed",
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
                    <Input placeholder="name@example.com" {...field} className="pl-10" />
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
                      <ForgotPasswordDialog />
                  </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} className="pl-10" />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
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

