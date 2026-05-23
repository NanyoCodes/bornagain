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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, User, Mail, Lock } from "lucide-react";
import { createUserWithEmailAndPassword, updateProfile, AuthError, sendEmailVerification, setPersistence, browserLocalPersistence } from "firebase/auth";
import { useAuth, useFirestore } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

const formSchema = z.object({
  firstName: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  lastName: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions to continue.",
  }),
});

export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      acceptTerms: false,
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
      // Ensure persistence is set
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      const displayName = `${values.firstName} ${values.lastName}`;
      
      await updateProfile(user, {
        displayName: displayName,
      });
      
      await sendEmailVerification(user);

      const userDocRef = doc(firestore, "users", user.uid);
      const fullName = `${values.firstName} ${values.lastName}`;
      const nameTokens = fullName.toLowerCase().split(' ').filter(Boolean);

      const userData = {
        firstName: values.firstName,
        lastName: values.lastName,
        fullName_lowercase: fullName.toLowerCase(),
        name_tokens: nameTokens,
        email: values.email,
        photoURL: user.photoURL,
      };

      setDoc(userDocRef, userData, { merge: true }).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'create',
          requestResourceData: userData,
        }, user);
        errorEmitter.emit('permission-error', permissionError);
      });

      toast({
        title: "Account Created!",
        description: "A verification email has been sent. Please verify your account before logging in.",
      });
      router.push("/login");

    } catch (error) {
      const authError = error as AuthError;
      let description = "An unexpected error occurred. Please try again.";

      switch (authError.code) {
        case 'auth/email-already-in-use':
          description = "This email is already registered. Please try signing in.";
          break;
        case 'auth/invalid-email':
          description = "Invalid email address.";
          break;
        case 'auth/weak-password':
          description = "Password is too weak. Please use at least 8 characters.";
          break;
        default:
          description = authError.message || description;
      }
      
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                    <Input placeholder="John" {...field} className="pl-3" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                    <Input placeholder="Doe" {...field} className="pl-3" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
              <FormLabel>Password</FormLabel>
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

        <FormField
          control={form.control}
          name="acceptTerms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/20">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-xs leading-normal cursor-pointer">
                  I agree to respect all users and abide by the Testify guidelines.
                </FormLabel>
                <FormDescription className="text-[10px]">
                   Read our <Link href="/terms-of-service" className="underline hover:text-primary">Terms of Service</Link> for details.
                </FormDescription>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" variant="destructive" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create account
        </Button>
      </form>
    </Form>
  );
}
