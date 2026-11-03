import { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Flame, ShieldCheck, Award, HeartHandshake, Globe, Zap, Sparkles, Heart } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Our Vision - The New Birth Mission',
  description: 'Learn about BornAgain Global, the premier platform for the new creation in Christ. Are you BornAgain?',
};

export default function AboutPage() {
  return (
    <AuthLayout>
      <div className="space-y-8 max-w-2xl mx-auto pb-12 text-left">
        <header className="space-y-4 text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black font-headline uppercase tracking-tight">BornAgain Global</h1>
            <p className="text-muted-foreground italic font-medium">The most important question of your life: Are you BornAgain?</p>
        </header>

        <Separator />

        <section className="space-y-4">
            <h2 className="text-2xl font-black font-headline uppercase flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Our Core Mission</h2>
            <p className="text-muted-foreground leading-relaxed font-medium">
                BornAgain is built as a sanctuary for the redeemed. We exist to share the greatness of Jesus Christ while providing a framework for the new creation to care for family, friends, and every soul added to the Kingdom. We believe that technology should be an instrument of divine connection.
            </p>
        </section>

        <section className="space-y-4">
            <h2 className="text-2xl font-black font-headline uppercase flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Spiritual Legacy</h2>
            <p className="text-muted-foreground leading-relaxed font-medium">
                We believe that the new birth is the beginning of a lifelong journey of transformation. BornAgain helps you look after your spiritual lineage by tracking disciplines and shared history. Our vision is a global body of Christ where the question "Are you BornAgain?" leads to a life of fruitfulness and unity.
            </p>
        </section>

        <section className="space-y-4">
            <h2 className="text-2xl font-black font-headline uppercase flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> The Mandate</h2>
            <Card className="border-l-4 border-l-primary rounded-2xl bg-primary/5 shadow-none border-none">
                <CardContent className="pt-6 italic text-muted-foreground leading-relaxed font-medium">
                    "I believe that the greatest move of God in our time is marked by the intentionality of the redeemed. BornAgain was birthed to ensure that when a soul enters the light, they are nurtured. It is the platform for the new creation—the one who cares enough to follow up, to pray, and to support their brethren." - by Nanyo Theophilus
                </CardContent>
            </Card>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
            <Card className="rounded-2xl shadow-none">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 font-black uppercase"><ShieldCheck className="h-4 w-4 text-primary" /> Kingdom Safety</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground font-medium leading-relaxed">
                    To maintain an edifying environment, all content is screened for faith alignment. We ensure that BornAgain remains a safe space for the redeemed to share their journey.
                </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-none">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 font-black uppercase"><Zap className="h-4 w-4 text-primary" /> Active Nurturing</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground font-medium leading-relaxed">
                    We use AI-powered insights to provide strategies for nurturing those who have just been BornAgain, ensuring their foundation in Christ is solid.
                </CardContent>
            </section>

        <section className="space-y-4">
            <h2 className="text-2xl font-black font-headline uppercase flex items-center gap-2"><HeartHandshake className="h-5 w-5 text-primary" /> Kingdom Alliances</h2>
            <p className="text-sm text-muted-foreground font-medium">
                We partner with ministries globally to ensure that every 'New Creation' has the resources and community they need to thrive.
            </p>
            <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="font-bold uppercase text-[9px]">Redeemed Networks</Badge>
                <Badge variant="secondary" className="font-bold uppercase text-[9px]">Great Commission Hubs</Badge>
                <Badge variant="secondary" className="font-bold uppercase text-[9px]">New Birth Support</Badge>
                <Badge variant="secondary" className="font-bold uppercase text-[9px]">Alliance of the Spirit</Badge>
            </div>
        </section>

        <footer className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline" className="rounded-xl h-11 px-8 font-bold">
                <Link href="/contact">Connect with our Station</Link>
            </Button>
        </footer>
      </div>
    </AuthLayout>
  );
}
