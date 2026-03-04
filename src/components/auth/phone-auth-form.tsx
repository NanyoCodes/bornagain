
"use client";

import 'react-phone-number-input/style.css'
import PhoneInput, { isPossiblePhoneNumber } from 'react-phone-number-input'
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Loader2 } from "lucide-react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  AuthError,
} from "firebase/auth";
import { useAuth, useFirestore } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from '@/lib/utils';

const phoneSchema = z.object({
  phone: z.string().refine(value => value && isPossiblePhoneNumber(value), { message: "Invalid phone number." }),
});

const codeSchema = z.object({
  code: z.string().length(6, "Verification code must be 6 digits."),
});

// Add a global declaration for window.grecaptcha
declare global {
    interface Window {
        grecaptcha?: any;
    }
}

export function PhoneAuthForm() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const [isLoading, setIsLoading] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  async function onPhoneSubmit(values: z.infer<typeof phoneSchema>) {
    setIsLoading(true);
    if (!auth || !firestore) {
        toast({ variant: "destructive", title: "Authentication service not ready. Please try again." });
        setIsLoading(false);
        return;
    }

    // Ensure the container is empty before creating a new verifier
    const recaptchaContainer = document.getElementById('recaptcha-container');
    if (recaptchaContainer) {
        recaptchaContainer.innerHTML = '';
    }

    try {
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
      
      const phoneNumber = values.phone;
      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);

      setConfirmationResult(result);
      codeForm.reset({ code: "" });
      setIsCodeSent(true);
      toast({ title: "Verification code sent", description: `A code has been sent to ${phoneNumber}` });
    } catch (error) {
      const authError = error as AuthError;
      console.error("Phone Auth Error:", authError);
      
      // Reset reCAPTCHA on error
      if (window.grecaptcha) {
        try {
            window.grecaptcha.reset();
        } catch (e) {
            console.error("Error resetting grecaptcha", e);
        }
      }

      toast({
        variant: "destructive",
        title: "Could not send code",
        description: authError.message || "An internal error occurred. Please check the phone number and try again.",
      });
      setIsCodeSent(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function onCodeSubmit(values: z.infer<typeof codeSchema>) {
    setIsLoading(true);
    if (!confirmationResult || !firestore) {
        toast({ variant: "destructive", title: "An error occurred", description: "Please try sending the code again." });
        setIsLoading(false);
        return;
    }

    try {
      const result = await confirmationResult.confirm(values.code);
      const user = result.user;

      const userDocRef = doc(firestore, "users", user.uid);
      const displayName = user.displayName || `User ${user.uid.substring(0, 5)}`;
      const userData = {
        displayName: displayName,
        displayName_lowercase: displayName.toLowerCase(),
        displayName_tokens: displayName.toLowerCase().split(/\s+/).filter(Boolean),
        email: user.email,
        photoURL: user.photoURL,
        phone: user.phoneNumber,
      };

      await setDoc(userDocRef, userData, { merge: true }).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'write',
          requestResourceData: userData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
      });

      toast({ title: "Success", description: "You are now logged in." });
      router.push("/dashboard");
    } catch (error) {
      const authError = error as AuthError;
      console.error("Code Confirmation Error:", authError);
      codeForm.reset({ code: "" });
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: authError.code === "auth/invalid-verification-code"
          ? "The code you entered is invalid. Please try again."
          : authError.message || "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div id="recaptcha-container" />
      {!isCodeSent ? (
        <Form {...phoneForm}>
          <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-3">
             <FormField
                control={phoneForm.control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                        <PhoneInput
                            international
                            defaultCountry="US"
                            placeholder="Enter phone number"
                            {...field}
                            className={cn(
                                "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                                "PhoneInput",
                                phoneForm.formState.errors.phone && "border-destructive"
                            )}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Verification Code
            </Button>
          </form>
        </Form>
      ) : (
        <Form {...codeForm}>
          <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-3">
            <FormField
              control={codeForm.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input placeholder="123456" {...field} autoComplete="one-time-code" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Sign In
            </Button>
            <Button variant="link" className="w-full" onClick={() => setIsCodeSent(false)}>
              Use a different phone number
            </Button>
          </form>
        </Form>
      )}
    </>
  );
}
