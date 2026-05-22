import { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Globe } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us - Ministry Support',
  description: 'Reach out to the Testify Global team for partnership inquiries, technical support, or to learn more about how our platform can serve your ministry.',
};

export default function ContactPage() {
  return (
    <AuthLayout>
      <div className="space-y-8 max-w-md mx-auto pb-12">
        <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold font-headline">Contact Us</h1>
            <p className="text-muted-foreground">We are here to serve and support your ministry.</p>
        </div>

        <div className="grid gap-6">
            <Card className="hover:border-primary transition-colors">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-3">
                        <Mail className="h-5 w-5 text-primary" />
                        Email Support
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <a href="mailto:testifyglobal360@gmail.com" className="text-sm font-medium hover:underline text-primary">
                        testifyglobal360@gmail.com
                    </a>
                </CardContent>
            </Card>

            <Card className="hover:border-primary transition-colors">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-3">
                        <Phone className="h-5 w-5 text-primary" />
                        Call/WhatsApp
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <a href="tel:+2348148538502" className="text-sm font-medium hover:underline text-primary">
                        +234 814 853 8502
                    </a>
                </CardContent>
            </Card>

            <Card className="hover:border-primary transition-colors">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-3">
                        <Globe className="h-5 w-5 text-primary" />
                        Office Address
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    Rivers State, Nigeria<br />
                    Global Support Center
                </CardContent>
            </Card>
        </div>

        <div className="space-y-4 pt-6">
            <Button asChild variant="outline" className="w-full">
                <Link href="/about">Learn About Testify</Link>
            </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
