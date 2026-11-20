
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { applyActionCode } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/components/auth/auth-layout';
import Link from 'next/link';
import { motion } from 'framer-motion';

function VerifyEmailHandler() {
  const searchParams = useSearchParams();
  const auth = useAuth();
  
  const oobCode = searchParams.get('oobCode');
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!oobCode) {
      setStatus('error');
      setError('Invalid or missing verification code. Please request a new activation link.');
      return;
    }

    const verify = async () => {
      try {
        await applyActionCode(auth, oobCode);
        setStatus('success');
      } catch (err: any) {
        console.error('Verification error:', err);
        setStatus('error');
        setError(err.message || 'The link has expired or already been used.');
      }
    };

    verify();
  }, [auth, oobCode]);

  if (status === 'verifying') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-8">
        <div className="relative">
            <Loader2 className="h-20 w-20 animate-spin text-primary opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="h-10 w-10 text-primary animate-pulse" />
            </div>
        </div>
        <div className="text-center space-y-2">
            <h1 className="text-2xl font-black font-headline uppercase tracking-tight">Verifying Identity</h1>
            <p className="text-sm text-muted-foreground font-medium">Communicating with the Kingdom registry...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="text-center space-y-8 py-6">
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center border-4 border-destructive/20 animate-in zoom-in">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-black font-headline uppercase tracking-tight text-destructive/80">Activation Failed</h1>
          <p className="text-sm text-muted-foreground leading-relaxed italic font-medium px-4 text-balance">{error}</p>
        </div>
        <Button asChild variant="outline" className="w-full h-14 rounded-2xl font-bold border-2">
          <Link href="/login">RETURN TO SIGN IN</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center space-y-10 py-6">
      <div className="flex justify-center">
        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="h-28 w-24 rounded-[2.5rem] bg-primary/10 flex items-center justify-center border-4 border-primary/20 shadow-[0_0_50px_rgba(249,116,22,0.2)]"
        >
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </motion.div>
      </div>
      <div className="space-y-4">
        <h1 className="text-4xl font-black font-headline uppercase tracking-tight">BornAgain!</h1>
        <p className="text-sm text-muted-foreground font-medium leading-relaxed italic px-6 text-balance">
          Your email has been verified. Your new creation identity is now fully active in the global Body of Christ.
        </p>
      </div>
      <Button asChild className="w-full h-16 rounded-3xl font-black shadow-2xl shadow-primary/30 tracking-widest uppercase text-base active:scale-95 transition-all">
        <Link href="/login">
            ENTER SANCTUARY <ArrowRight className="ml-3 h-6 w-6" />
        </Link>
      </Button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" /></div>}>
        <VerifyEmailHandler />
      </Suspense>
    </AuthLayout>
  );
}
