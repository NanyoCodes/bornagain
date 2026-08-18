'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold font-headline">Privacy Policy</CardTitle>
          <CardDescription>Last updated: June 23, 2025</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-muted-foreground">
          <p>Welcome to Testify. We respect your privacy.</p>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li><strong>Identity Data:</strong> name, username.</li>
              <li><strong>Contact Data:</strong> email, phone.</li>
              <li><strong>Profile Data:</strong> picture, bio, location, content.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">5. Contact Us</h2>
            <p>Email: <a href="mailto:testifyglobal360@gmail.com" className="text-primary hover:underline">testifyglobal360@gmail.com</a>.</p>
          </div>
           <p className="pt-4 text-center"><Button asChild variant="outline"><Link href="/">Back</Link></Button></p>
        </CardContent>
      </Card>
    </div>
  );
}
