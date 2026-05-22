'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  BookOpen, 
  UserPlus, 
  Target, 
  Newspaper, 
  Share2, 
  Users, 
  Flame, 
  History, 
  ArrowLeft,
  Zap,
  ShieldCheck,
  Award,
  HeartHandshake,
  TrendingUp,
  LayoutGrid
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const journeyPhases = [
  {
    title: "Phase 1: Your Personal Altar",
    description: "Strength begins in the secret place. Build your daily discipline.",
    icon: Zap,
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
    items: [
      {
        title: "Daily Disciplines",
        content: "Use the dashboard to track your Prayer, Bible Reading, and Church Attendance. Consistency builds spiritual authority."
      },
      {
        title: "The Bible Reader",
        content: "Access the Word directly in-app. Highlight revelations and save personal meditation notes in your digital journal."
      }
    ]
  },
  {
    title: "Phase 2: Into the Harvest",
    description: "Mobilize for evangelism and track your progress in the field.",
    icon: Flame,
    color: "text-primary",
    bgColor: "bg-primary/10",
    items: [
      {
        title: "Logging Souls Won",
        content: "Record new converts immediately. Add contact details and initial notes so no soul is forgotten in the follow-up process."
      },
      {
        title: "Mission Campaigns",
        content: "Join mass outreach events or organize your own. Use group chats to coordinate with your team in real-time."
      }
    ]
  },
  {
    title: "Phase 3: Building the Body",
    description: "Discipleship is a communal effort. Connect and grow together.",
    icon: Users,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
    items: [
      {
        title: "Fellowship Groups",
        content: "Assign souls to local fellowships for long-term nurturing. Members collaborate on follow-up logs to track spiritual growth."
      },
      {
        title: "Accountability",
        content: "Find a partner to stay motivated. Nudge each other to complete daily disciplines and celebrate victories together."
      }
    ]
  }
];

export default function GuidePage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleShare = async () => {
    const shareData = {
      title: 'Join Testify - Global Evangelism Platform',
      text: 'Help us organize the harvest and track evangelism progress for the Kingdom of God.',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://testifyglobal.com'
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Share API not supported');
      }
    } catch (err) {
      if (typeof window !== 'undefined') {
        navigator.clipboard.writeText(shareData.url);
        toast({
          title: 'Link Copied',
          description: 'Referral link has been copied to your clipboard.',
        });
      }
    }
  };

  return (
    <div className="space-y-12 max-w-4xl mx-auto p-4 md:p-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-headline flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              App Guide
            </h1>
            <p className="text-muted-foreground italic text-sm md:text-base">
              Equipping you for every good work in service to the Kingdom.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
            <Badge variant="secondary" className="px-3 py-1">v1.2 Platform</Badge>
            <Badge className="bg-primary/20 text-primary border-primary/20 px-3 py-1">Kingdom Force</Badge>
        </div>
      </div>

      <Separator />

      {/* Quick Start Grid */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Zap className="h-5 w-5 text-chart-5" /> Getting Started
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-muted/30 border-dashed">
                <CardHeader className="p-4 pb-2">
                    <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center mb-2 border shadow-sm">
                        <UserPlus className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm">1. Complete Profile</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <p className="text-xs text-muted-foreground">Add your name, photo, and home church to join the active workforce.</p>
                </CardContent>
            </Card>
            <Card className="bg-muted/30 border-dashed">
                <CardHeader className="p-4 pb-2">
                    <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center mb-2 border shadow-sm">
                        <LayoutGrid className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm">2. Daily Disciplines</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <p className="text-xs text-muted-foreground">Log your prayers and Bible study daily to build a consistent spiritual streak.</p>
                </CardContent>
            </Card>
            <Card className="bg-muted/30 border-dashed">
                <CardHeader className="p-4 pb-2">
                    <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center mb-2 border shadow-sm">
                        <Flame className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm">3. Log Your First Soul</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <p className="text-xs text-muted-foreground">Record your first convert and see your personal and city impact grow.</p>
                </CardContent>
            </Card>
        </div>
      </section>

      {/* Journey Phases */}
      <section className="space-y-8">
        <div className="space-y-2">
            <h2 className="text-2xl font-bold font-headline">The Believer's Journey</h2>
            <p className="text-sm text-muted-foreground">Follow these phases to maximize your impact on the platform.</p>
        </div>

        <div className="space-y-12">
            {journeyPhases.map((phase, idx) => (
                <div key={idx} className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border", phase.bgColor)}>
                            <phase.icon className={cn("h-6 w-6", phase.color)} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">{phase.title}</h3>
                            <p className="text-sm text-muted-foreground">{phase.description}</p>
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 ml-2 sm:ml-16">
                        {phase.items.map((item, i) => (
                            <Card key={i} className="border-none shadow-none bg-muted/20">
                                <CardHeader className="p-4 pb-1">
                                    <CardTitle className="text-sm font-bold text-foreground/80">{item.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <p className="text-xs leading-relaxed text-muted-foreground">{item.content}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </section>

      {/* Advanced Features FAQ */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Deep Dive</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="referrals" className="border rounded-xl px-4 bg-card mb-4 shadow-sm">
                <AccordionTrigger className="hover:no-underline font-semibold">How do I refer other believers?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    Testify is most powerful when used collectively. Use the "Share App" button below or in the sidebar to invite your pastors, youth leaders, and friends. A stronger network means a more organized harvest.
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="insights" className="border rounded-xl px-4 bg-card mb-4 shadow-sm">
                <AccordionTrigger className="hover:no-underline font-semibold">What are AI Follow-up Insights?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    On the "Souls Won" page, click the "Insights" lightbulb on any convert's record. Our AI analyzes their status and history to suggest the best next steps and personalized messages for you to send.
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="amen" className="border rounded-xl px-4 bg-card mb-4 shadow-sm">
                <AccordionTrigger className="hover:no-underline font-semibold">The power of "Amen" and "Inspired"</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    Interaction on the testimonies feed isn't just social—it's spiritual support. Marking a story with an "Amen" lets the author know you are standing with them in faith, while "Inspired" notes that their story has ignited your own courage.
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      </section>
      
      {/* Referral & CTA */}
      <section className="mt-16 p-8 rounded-3xl bg-primary/5 border border-primary/20 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
            <Flame className="h-24 w-24 text-primary" />
        </div>
        <div className="max-w-md mx-auto space-y-4">
            <h3 className="font-bold text-2xl font-headline">Ready to mobilize?</h3>
            <p className="text-sm text-muted-foreground">Sharing this tool with fellow believers helps build a stronger network dedicated to the Great Commission.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
                <Button onClick={handleShare} size="lg" className="font-bold">
                    <Share2 className="mr-2 h-4 w-4" /> Share App & Refer Brethren
                </Button>
                <Button variant="outline" asChild size="lg">
                    <Link href="/login">Launch Dashboard</Link>
                </Button>
            </div>
        </div>
      </section>

      <footer className="text-center pt-8 border-t">
        <p className="text-xs text-muted-foreground italic">
          "The harvest is plentiful, but the laborers are few; therefore pray earnestly to the Lord of the harvest to send out laborers into his harvest." — Matthew 9:37-38
        </p>
      </footer>
    </div>
  );
}
