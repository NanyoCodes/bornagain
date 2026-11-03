'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShieldAlert, Heart, Globe, Scale } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-12">
      <Card className="w-full max-w-3xl rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="text-center space-y-2 p-8 bg-muted/10 border-b">
          <CardTitle className="text-3xl font-black font-headline uppercase tracking-tight">Terms of Service</CardTitle>
          <CardDescription className="text-sm font-bold uppercase tracking-widest text-primary">Last updated: March 5, 2025</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 text-muted-foreground p-8 sm:p-12 text-left">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 uppercase tracking-tight">
                <Globe className="h-5 w-5 text-primary" /> 1. Mission and Vision
            </h2>
            <p className="leading-relaxed text-sm font-medium">
                The BornAgain movement exists to glorify God through technology by empowering the redeemed, organizing evangelism efforts, and connecting the global Body of Christ. By using this application, you agree to align your conduct with this mission of transformation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 uppercase tracking-tight">
                <Heart className="h-5 w-5 text-primary" /> 2. The Redeemed Community
            </h2>
            <p className="leading-relaxed text-sm font-medium">
                BornAgain is a sanctuary for faith. We require all users to treat one another with the honor due to a brother or sister in Christ. No form of harassment, hate speech, or derogatory behavior will be tolerated.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 uppercase tracking-tight">
                <ShieldAlert className="h-5 w-5 text-destructive" /> 3. Accountability
            </h2>
            <p className="leading-relaxed font-medium text-foreground text-sm">
                Users who intentionally cause division or spread misinformation will be subject to review. BornAgain Global reserves the right to protect the integrity of this spiritual platform by suspending accounts that violate our covenant of unity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 uppercase tracking-tight">
                <Scale className="h-5 w-5 text-primary" /> 4. Data Integrity
            </h2>
            <p className="leading-relaxed text-sm font-medium">
                Your identity is verified to ensure the truthfulness of the harvest. You are responsible for the accuracy of the souls you log and the testimonies you share.
            </p>
          </section>

          <Separator className="opacity-50" />
          
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-tight">Contact Station</h2>
            <p className="text-sm">If you have questions about these terms, contact us at <a href="mailto:testifyglobal360@gmail.com" className="text-primary hover:underline font-bold">testifyglobal360@gmail.com</a>.</p>
          </div>
          
          <div className="pt-4 flex justify-center">
            <Button asChild variant="outline" className="h-11 rounded-xl px-8 font-bold">
                <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
        &copy; {new Date().getFullYear()} BornAgain Global • Built for the Great Commission
      </footer>
    </div>
  );
}
