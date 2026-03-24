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
          <CardDescription>Last updated: July 26, 2024</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-muted-foreground">
          <p>
            Your privacy is important to us. It is Testify's policy to respect your privacy regarding any information we may collect from you across our website, and other sites we own and operate.
          </p>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <p>
              We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.
            </p>
            <p>
              Information we collect includes your name, email address, and any content you voluntarily provide, such as testimonies and profile information.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to operate and maintain our app, to provide you with the features you use, to communicate with you, and to improve your experience.
            </p>
          </div>
          
           <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">3. Security</h2>
            <p>
              We take the security of your data seriously. We protect your information through a variety of security measures, including secure servers and data encryption. However, no method of transmission over the Internet or method of electronic storage is 100% secure.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">4. Your Rights</h2>
            <p>
              You have the right to access, update, or delete your personal information at any time through your account settings.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">5. Changes to This Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
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
