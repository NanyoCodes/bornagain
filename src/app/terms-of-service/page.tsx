'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold font-headline">Terms of Service</CardTitle>
          <CardDescription>Last updated: July 26, 2024</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-muted-foreground">
          <p>
            Welcome to Testify! These terms and conditions outline the rules and regulations for the use of our application.
          </p>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing this application, we assume you accept these terms and conditions. Do not continue to use Testify if you do not agree to all of the terms and conditions stated on this page.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">2. User Accounts</h2>
            <p>
              You are responsible for safeguarding your account and for any activities or actions under your password. You agree not to disclose your password to any third party.
            </p>
          </div>
          
           <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">3. User Content</h2>
            <p>
              You are responsible for the content that you post on or through the service, including its legality, reliability, and appropriateness. By posting content, you grant us the right and license to use, modify, publicly display, and distribute such content on and through the service.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">4. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </div>

           <p className="pt-4 text-center">
            <Button asChild variant="outline">
              <Link href="/">Back to Home</Link>
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
