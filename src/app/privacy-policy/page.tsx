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
            Welcome to Testify. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you use our application and tell you about your privacy rights and how the law protects you.
          </p>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <p>We may collect, use, store, and transfer different kinds of personal data about you which we have grouped together as follows:</p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li><strong>Identity Data:</strong> includes first name, last name, and username.</li>
              <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
              <li><strong>Profile Data:</strong> includes your profile picture, bio, location, and any content you voluntarily provide, such as testimonies, prayer requests, and campaign details.</li>
              <li><strong>Usage Data:</strong> includes information about how you use our application, products, and services.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>
              We will only use your personal data when the law allows us to. Most commonly, we will use your personal data to:
            </p>
             <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Register you as a new user.</li>
                <li>Operate and maintain the functionality of the app.</li>
                <li>Manage our relationship with you, including notifying you about changes to our terms or privacy policy.</li>
                <li>Enable you to participate in community features.</li>
             </ul>
          </div>
          
           <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">3. Data Security</h2>
            <p>
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way. We use secure cloud infrastructure and limit access to your personal data to those who have a business need to know.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">4. Your Legal Rights</h2>
            <p>
              You have the right to access, update, or request deletion of your personal information at any time through your account settings or by contacting us.
            </p>
          </div>
           <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">5. Contact Us</h2>
                <p>If you have any questions about this privacy policy, please contact us at <a href="mailto:testifyitsaboutjesus@gmail.com" className="text-primary hover:underline">testifyitsaboutjesus@gmail.com</a>.</p>
           </div>
           
            <p className="pt-2 text-xs text-center text-muted-foreground/80">
                Disclaimer: This is a template privacy policy. You should consult with a legal professional to ensure it meets all legal requirements for your specific situation.
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
