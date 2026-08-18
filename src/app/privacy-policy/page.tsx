'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl rounded-[2.5rem] shadow-2xl border-none">
        <CardHeader className="text-center p-8 border-b bg-muted/10">
          <CardTitle className="text-3xl font-black font-headline uppercase tracking-tight">Privacy Policy</CardTitle>
          <CardDescription className="text-sm font-bold uppercase tracking-widest text-primary">Last updated: March 5, 2025</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 text-muted-foreground p-8">
          <p className="text-base leading-relaxed font-medium">Welcome to Testify. We respect your privacy and are committed to protecting your personal data in alignment with our mission to serve the Body of Christ.</p>
          
          <div className="space-y-4">
            <h2 className="text-xl font-black font-headline text-foreground uppercase">1. Information We Collect</h2>
            <ul className="list-disc list-inside pl-4 space-y-2 text-sm leading-relaxed">
              <li><strong>Identity Data:</strong> Legal names used for account verification and accountability.</li>
              <li><strong>Contact Data:</strong> Verified email and optional phone numbers for secure communication.</li>
              <li><strong>Profile Data:</strong> Pictures, personal testimonies, and public Kingdom impact statistics.</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our Bible reader, groups, and campaigns.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-black font-headline text-foreground uppercase">2. Use of Data</h2>
            <p className="text-sm leading-relaxed">Your data is used to connect you with fellow believers, coordinate evangelism campaigns, and maintain the integrity of our shared testimony feed. We do not sell your personal information to third parties.</p>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-tight">Contact Support</h2>
            <p className="text-sm">If you have questions about our data practices, contact us at <a href="mailto:testifyglobal360@gmail.com" className="text-primary font-bold hover:underline">testifyglobal360@gmail.com</a>.</p>
          </div>
          
          <div className="pt-6 flex justify-center">
            <Button asChild variant="outline" className="rounded-xl h-11 px-8 font-bold">
                <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
