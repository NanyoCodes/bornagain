import { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Flame, ShieldCheck, Award, HeartHandshake, Globe, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About Our Mission - Empowering the Harvest',
  description: 'Learn about Testify Global, a platform built for believers to share the greatness of Jesus Christ and organize evangelism efforts through modern technology.',
};

export default function AboutPage() {
  return (
    <AuthLayout>
      <div className="space-y-8 max-w-2xl mx-auto pb-12">
        <header className="space-y-4 text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Flame className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold font-headline">Testify Global</h1>
            <p className="text-muted-foreground italic">Empowering the harvest through faith and technology.</p>
        </header>

        <Separator />

        <section className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
                Testify is built for believers to share the greatness of Jesus Christ who gave his life as an offering to reconcile the world to GOD so that the kingdom of GOD will be built on Earth.
            </p>
        </section>

        <section className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Founder's Story</h2>
            <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-6 italic text-muted-foreground leading-relaxed">
                    "I believe that technology is a divine gift for this final harvest. Seeing the need for accountability and collective encouragement in evangelism, I was led to create a space where every soul won is celebrated and every miracle is recorded for God's glory. God is great, and His power in Jesus Christ is moving through the earth like never before. Testify is a testimony in itself of God's provision for His people."
                </CardContent>
            </Card>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Moderation Policy</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                    To maintain an edifying environment, all content is screened for faith-alignment, respect, and accuracy. We strictly prohibit profanity, hate speech, political divisiveness, or self-promotion.
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Real Testimonies</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                    We leverage community verification and accountability partners to ensure shared stories are genuine. We encourage linking testimonies to existing prayer requests.
                </CardContent>
            </Card>
        </section>

        <section className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2"><HeartHandshake className="h-5 w-5 text-primary" /> Ministry Partnerships</h2>
            <p className="text-sm text-muted-foreground">
                We collaborate with local churches, missionary organizations, and youth groups to provide specialized dashboards and reporting tools for their outreach teams.
            </p>
            <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Church Networks</Badge>
                <Badge variant="secondary">Global Missions</Badge>
                <Badge variant="secondary">Youth Ministries</Badge>
                <Badge variant="secondary">Evangelism Teams</Badge>
            </div>
        </section>

        <footer className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline">
                <Link href="/contact">Partner With Us</Link>
            </Button>
        </footer>
      </div>
    </AuthLayout>
  );
}
