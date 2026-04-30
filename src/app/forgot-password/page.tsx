'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/firebase';
import { sendPasswordResetEmail, AuthError } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const auth = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setIsSent(true);
      toast({
        title: "Link Sent",
        description: "Please check your inbox for the password reset link.",
      });
    } catch (error) {
      const authError = error as AuthError;
      toast({
        variant: "destructive",
        title: "Error",
        description: authError.message || "Could not send reset link. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <AuthLayout>
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-muted-foreground">
              We've sent a password reset link to <span className="font-semibold text-foreground">{email}</span>.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/login">Return to Sign In</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Didn't receive the email? Check your spam folder or{' '}
            <button onClick={() => setIsSent(false)} className="underline hover:text-primary">
              try another email address
            </button>.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="grid gap-2 text-left">
          <Link href="/login" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || !email}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
