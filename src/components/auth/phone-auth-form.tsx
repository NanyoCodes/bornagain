
"use client";

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

// Need to declare this on the window object for recaptcha
declare global {
    interface Window {
        recaptchaVerifier?: RecaptchaVerifier;
        confirmationResult?: ConfirmationResult;
        grecaptcha?: any;
    }
}

const phoneSchema = z.object({
  phone: z.string().min(10, "Please enter a valid phone number with country code."),
});

const codeSchema = z.object({
  code: z.string().length(6, "Verification code must be 6 digits."),
});

export function PhoneAuthForm() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const [isLoading, setIsLoading] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    if (!auth) return;

    // Set up reCAPTCHA verifier when component mounts
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
    window.recaptchaVerifier = verifier;

    return () => {
      // Cleanup verifier on unmount
      window.recaptchaVerifier?.clear();
    };
  }, [auth]);


  async function onPhoneSubmit(values: z.infer<typeof phoneSchema>) {
    setIsLoading(true);
    if (!auth || !firestore || !window.recaptchaVerifier) {
        toast({ variant: "destructive", title: "Firebase not initialized." });
        setIsLoading(false);
        return;
    }
    
    const appVerifier = window.recaptchaVerifier;
    // Sanitize the phone number to E.164 format by removing non-digits and adding '+'
    const phoneNumber = `+${values.phone.replace(/\D/g, '')}`;

    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      window.confirmationResult = confirmationResult;
      setIsCodeSent(true);
      toast({ title: "Verification code sent", description: `A code has been sent to ${phoneNumber}` });
    } catch (error) {
      const authError = error as AuthError;
      console.error("Phone Auth Error:", authError);
      toast({
        variant: "destructive",
        title: "Could not send code",
        description: authError.message || "Please check the phone number and try again.",
      });
      // Reset reCAPTCHA on error to allow retries
      window.recaptchaVerifier?.render().then((widgetId) => {
        if(window.grecaptcha) {
            window.grecaptcha.reset(widgetId);
        }
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onCodeSubmit(values: z.infer<typeof codeSchema>) {
    setIsLoading(true);
    if (!window.confirmationResult || !firestore) {
        toast({ variant: "destructive", title: "An error occurred", description: "Please try sending the code again." });
        setIsLoading(false);
        return;
    }

    try {
      const result = await window.confirmationResult.confirm(values.code);
      const user = result.user;

      const userDocRef = doc(firestore, "users", user.uid);
      const userData = {
        displayName: user.displayName || `User ${user.uid.substring(0, 5)}`,
        email: user.email, // will be null
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

      toast({ title: "Login Successful", description: "Welcome!" });
      router.push("/dashboard");
    } catch (error) {
      const authError = error as AuthError;
      console.error("Code Confirmation Error:", authError);
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

  if (isCodeSent) {
    return (
      <Form {...codeForm}>
        <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-4">
          <FormField
            control={codeForm.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification Code</FormLabel>
                <FormControl>
                  <Input placeholder="123456" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify Code
          </Button>
          <Button variant="link" className="w-full" onClick={() => setIsCodeSent(false)}>
            Use a different phone number
          </Button>
        </form>
      </Form>
    );
  }

  return (
    <>
      <div id="recaptcha-container"></div>
      <Form {...phoneForm}>
        <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
          <FormField
            control={phoneForm.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+1 123 456 7890" {...field} />
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
    </>
  );
}
