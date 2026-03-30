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
            Welcome to Testify! These terms and conditions outline the rules and regulations for the use of our application. By accessing this application we assume you accept these terms and conditions.
          </p>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">1. User Accounts</h2>
            <p>
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
            </p>
          </div>
          
           <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">2. User Content</h2>
            <p>
              Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, or other material ("Content"). You are responsible for the Content that you post on or through the service, including its legality, reliability, and appropriateness. You retain any and all of your rights to any Content you submit.
            </p>
             <p>
              We reserve the right to remove any content that we determine to be unlawful, offensive, threatening, libelous, defamatory, pornographic, obscene, or otherwise objectionable or that violates any party's intellectual property or these Terms of Service.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">3. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </div>
          
           <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">4. Limitation of Liability</h2>
            <p>
              In no event shall Testify, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
            </p>
          </div>
          
           <p className="pt-2 text-xs text-center text-muted-foreground/80">
                Disclaimer: This is a template Terms of Service. You should consult with a legal professional to ensure it is appropriate for your application and jurisdiction.
            </p>

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
