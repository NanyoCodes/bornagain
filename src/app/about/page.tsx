import { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Flame, ShieldCheck, Award, HeartHandshake, Globe, Zap, Sparkles, Heart } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About Our Mission - Caring for the Kingdom',
  description: 'Learn about Testify Global, the number one app to care for family, friends, souls and the kingdom. Empowering believers with compassionate technology.',
};

export default function AboutPage() {
  return (
    <AuthLayout>
      <div className="space-y-8 max-w-2xl mx-auto pb-12 text-left">
        <header className="space-y-4 text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-black font-headline uppercase tracking-tight">Testify Global</h1>
            <p className="text-muted-foreground italic font-medium">The #1 App to care for family, friends, souls and the Kingdom.</p>
        </header>

        <Separator />

        <section className="space-y-4">
            <h2 className="text-2xl font-black font-headline uppercase flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Our Core Mission</h2>
            <p className="text-muted-foreground leading-relaxed font-medium">
                Testify is built as a heart center for believers. We exist to share the greatness of Jesus Christ while providing a compassionate framework to care for family, friends, and every soul God entrusts to us. We believe that technology should be an instrument of love, helping us reconcile the world to God through intentional, compassionate follow up.
            </p>
        </section>

        <section className="space-y-4">
            <h2 className="text-2xl font-black font-headline uppercase flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> A Vision of Care</h2>
            <p className="text-muted-foreground leading-relaxed font-medium">
                We believe that lasting spiritual growth is nurtured in community. Testify helps believers look after their own by tracking disciplines and shared history. Our vision is a global body of Christ where no one is left behind, and where we follow up on those we care about with the same love Christ showed us.
            </p>
        </section>

        <section className="space-y-4">
            <h2 className="text-2xl font-black font-headline uppercase flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> The Ebenezer of Care</h2>
            <Card className="border-l-4 border-l-primary rounded-2xl bg-primary/5">
                <CardContent className="pt-6 italic text-muted-foreground leading-relaxed font-medium">
                    "I believe that the greatest move of God in our time will be marked by a return to genuine care. Testify was birthed to ensure that when a soul is won, they are nurtured. It is the platform for the laborer who loves—the one who cares enough to follow up, to pray, and to support their brethren as they walk into the light. This is our offering to the King." - by Nanyo Theophilus
                </CardContent>
            </Card>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 font-black uppercase"><ShieldCheck className="h-4 w-4 text-primary" /> Safe Sanctuary</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground font-medium leading-relaxed">
                    To maintain an edifying environment, all content is screened for faith alignment and compassion. We strictly prohibit hate speech, ensuring the platform remains a safe space to care for others.
                </CardContent>
            </Card>
            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 font-black uppercase"><Zap className="h-4 w-4 text-primary" /> Active Following</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground font-medium leading-relaxed">
                    We leverage community insights to provide compassionate follow up strategies. Our tools help you track the spiritual health of your loved ones and friends with ease.
                </CardContent>
            </Card>
        </section>

        <section className="space-y-4">
            <h2 className="text-2xl font-black font-headline uppercase flex items-center gap-2"><HeartHandshake className="h-5 w-5 text-primary" /> Caring Partnerships</h2>
            <p className="text-sm text-muted-foreground font-medium">
                We partner with ministries that prioritize the 'One'—those dedicated to individual growth and long term spiritual care.
            </p>
            <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="font-bold uppercase text-[9px]">Soul Care Networks</Badge>
                <Badge variant="secondary" className="font-bold uppercase text-[9px]">Compassion Ministries</Badge>
                <Badge variant="secondary" className="font-bold uppercase text-[9px]">Discipleship Squads</Badge>
                <Badge variant="secondary" className="font-bold uppercase text-[9px]">Family Altar Support</Badge>
            </div>
        </section>

        <footer className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline" className="rounded-xl h-11 px-8 font-bold">
                <Link href="/contact">Partner with Love</Link>
            </Button>
        </footer>
      </div>
    </AuthLayout>
  );
}
