'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShieldAlert, Heart, Globe, Scale } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-12">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold font-headline">Terms of Service</CardTitle>
          <CardDescription>Last updated: June 23, 2025</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-8 text-muted-foreground pt-8">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" /> 1. Mission and Vision
            </h2>
            <p className="leading-relaxed">
                The Testify movement exists to glorify God through technology by encouraging believers, organizing evangelism efforts, and connecting the global Body of Christ. By using this application, you agree to align your conduct with this mission of unity and Great Commission focus.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" /> 2. Community Standards & Respect
            </h2>
            <p className="leading-relaxed">
                Testify is a sanctuary for faith. We require all users to treat one another with dignity, love, and respect. No form of harassment, hate speech, or derogatory behavior will be tolerated. Content shared must be edifying and aimed at building up the community.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-destructive" /> 3. Zero Tolerance for Confusion
            </h2>
            <p className="leading-relaxed font-medium text-foreground">
                Users who intentionally cause confusion, promote division, or spread misinformation within the community will be subject to immediate review. Testify Global reserves the right to suspend or permanently ban any account that violates these spiritual and community safeguards.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" /> 4. Data and Accountability
            </h2>
            <p className="leading-relaxed">
                We believe in accountability. Your identity is verified through secure authentication to ensure the integrity of testimonies and campaign progress. You are responsible for the truthfulness of the souls you log and stories you share.
            </p>
          </section>

          <Separator />
          
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Contact Support</h2>
            <p>If you have questions about these terms, contact us at <a href="mailto:testifyglobal360@gmail.com" className="text-primary hover:underline font-medium">testifyglobal360@gmail.com</a>.</p>
          </div>
          
          <div className="pt-4 flex justify-center">
            <Button asChild variant="outline" size="lg">
                <Link href="/">Return to Testify</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Testify Global. Built for the Great Commission.
      </footer>
    </div>
  );
}
