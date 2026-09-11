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
  Zap,
  ShieldCheck,
  Heart,
  HeartHandshake,
  TrendingUp,
  Sparkles,
  Award,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const gettingStartedItems = [
  { step: "1", title: "Complete Profile", desc: "Set your identity.", icon: UserPlus, color: "text-blue-500", bg: "bg-blue-500/10" },
  { step: "2", title: "Daily Disciplines", desc: "Build consistency.", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
  { step: "3", title: "Testifying", desc: "Share glory.", icon: Newspaper, color: "text-primary", bg: "bg-primary/10" },
  { step: "4", title: "Log Soul", desc: "Record harvest.", icon: Heart, color: "text-red-500", bg: "bg-red-500/10" },
  { step: "5", title: "Accountability", desc: "Stay sharp.", icon: HeartHandshake, color: "text-purple-500", bg: "bg-purple-500/10" },
  { step: "6", title: "Campaigning", desc: "Lead missions.", icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { step: "7", title: "Fellowships", desc: "Connect community.", icon: Users, color: "text-indigo-500", bg: "bg-indigo-500/10" },
];

const journeyPhases = [
  {
    title: "Phase 1: Your Personal Altar",
    description: "Strength begins in the secret place.",
    icon: Zap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    items: [
      { title: "Daily Disciplines", content: "Use the dashboard to track Prayer, Word Study via the Bible Reader, and Church Attendance." },
      { title: "The Revelation Journal", content: "Save meditations and highlights directly from the Word to track your spiritual insights." }
    ]
  },
  {
    title: "Phase 2: Shared Testimony",
    description: "Overcoming by the word of your testimony.",
    icon: Sparkles,
    color: "text-primary",
    bgColor: "bg-primary/10",
    items: [
      { title: "Public Feed", content: "Post God's goodness to encourage the global body and respond to others with 'Amen' or 'Inspired'." },
      { title: "Answered Prayer", content: "Link your testimonies to previous prayer requests to show the full arc of God's faithfulness." }
    ]
  },
  {
    title: "Phase 3: Into the Harvest",
    description: "Mobilize for evangelism and track growth.",
    icon: Flame,
    color: "text-orange-600",
    bgColor: "bg-orange-600/10",
    items: [
      { title: "Soul Winning", content: "Log converts with location and source data. Use AI Insights for personalized follow-up strategies." },
      { title: "Campaign Hub", content: "Join mass missions or launch your own. Use group chats to mobilize your team on the field." }
    ]
  },
  {
    title: "Phase 4: Building the Body",
    description: "Preserving the harvest through community.",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    items: [
      { title: "Fellowship Groups", content: "Nurture converts collectively by sharing follow-up logs and interaction history within groups." },
      { title: "Accountability", content: "Partner with a brother or sister to stay sharp. Nudge each other to maintain daily disciplines." }
    ]
  },
  {
    title: "Phase 5: Spiritual Nourishment",
    description: "Empowering the body through the shared Word.",
    icon: BookOpen,
    color: "text-purple-600",
    bgColor: "bg-purple-600/10",
    items: [
      { title: "Daily Devotionals", content: "Organizers can arrange daily spiritual nourishment and prayer focuses for their Fellowship or Association members." },
      { title: "Shared Agreement", content: "Agree with the word via reactions and share these daily seeds of faith with others to spread the light beyond your group." }
    ]
  }
];

export default function GuidePage() {
  const { toast } = useToast();

  const handleShare = async () => {
    const shareData = {
      title: 'Join Testify - Global Evangelism Platform',
      text: 'Help us organize the harvest and track evangelism progress for the Kingdom of God.',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://testifyglobal.com'
    };
    try {
      if (typeof navigator !== 'undefined' && navigator.share) { await navigator.share(shareData); }
      else { throw new Error(); }
    } catch (err) {
      if (typeof window !== 'undefined') {
        navigator.clipboard.writeText(shareData.url);
        toast({ title: 'Link Copied', description: 'Referral link copied to clipboard.' });
      }
    }
  };

  return (
    <div className="space-y-12 max-w-4xl mx-auto pb-24 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 text-left">
        <div className="space-y-1 text-left">
            <h1 className="text-3xl md:text-5xl font-black font-headline tracking-tight flex items-center gap-3 text-left">
            <BookOpen className="h-8 w-8 text-primary" />
            App Guide
            </h1>
            <p className="text-muted-foreground italic text-sm md:text-base font-medium text-left">
            Equipping the Kingdom workforce for a global harvest.
            </p>
        </div>
        <div className="flex gap-2 text-left">
            <Badge variant="secondary" className="px-3 py-1 font-bold uppercase tracking-widest text-[10px]">Dashboard Guide</Badge>
            <Badge className="bg-primary/20 text-primary border-primary/20 px-3 py-1 font-bold uppercase tracking-widest text-[10px]">Kingdom Force</Badge>
        </div>
      </div>

      <Separator />

      <section className="space-y-8 text-left">
        <h2 className="text-2xl font-black font-headline uppercase flex items-center gap-2 text-left">
          <Sparkles className="h-6 w-6 text-blue-500" /> Getting Started Path
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {gettingStartedItems.map((item) => (
                <Card key={item.step} className="bg-muted/30 border-2 border-dashed relative group text-left">
                    <CardHeader className="p-4 pb-2 text-left">
                        <div className={cn("h-10 w-10 rounded-2xl bg-background flex items-center justify-center mb-3 border shadow-sm transition-transform group-hover:scale-110", item.bg)}>
                            <item.icon className={cn("h-5 w-5", item.color)} />
                        </div>
                        <CardTitle className="text-sm font-black tracking-tight text-left">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-left">
                        <p className="text-xs text-muted-foreground font-medium leading-relaxed text-left">{item.desc}</p>
                    </CardContent>
                    <span className="absolute top-2 right-4 text-3xl font-black text-foreground/5 italic">{item.step}</span>
                </Card>
            ))}
        </div>
      </section>

      <section className="space-y-12 text-left">
        <div className="space-y-2 text-left">
            <h2 className="text-2xl font-black font-headline uppercase tracking-tight text-left">The Believer's Journey</h2>
            <p className="text-sm text-muted-foreground font-medium text-left">Maximize your Kingdom impact using the full platform.</p>
        </div>

        <div className="space-y-12 text-left">
            {journeyPhases.map((phase, idx) => (
                <div key={idx} className="space-y-6 text-left">
                    <div className="flex items-center gap-5 text-left">
                        <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border-2 text-left", phase.bgColor)}>
                            <phase.icon className={cn("h-7 w-7", phase.color)} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-black tracking-tight text-left">{phase.title}</h3>
                            <p className="text-sm text-muted-foreground font-medium text-left">{phase.description}</p>
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 ml-2 sm:ml-20 text-left">
                        {phase.items.map((item, i) => (
                            <Card key={i} className="border-none shadow-none bg-muted/20 rounded-2xl text-left">
                                <CardHeader className="p-6 pb-2 text-left">
                                    <CardTitle className="text-xs font-black uppercase tracking-widest text-primary text-left">{item.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 pt-0 text-left">
                                    <p className="text-sm leading-relaxed text-muted-foreground font-medium text-left">{item.content}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </section>

      <section className="space-y-6 text-left">
        <div className="flex items-center gap-2 text-left">
            <ShieldAlert className="h-6 w-6 text-primary text-left" />
            <h2 className="text-xl font-black font-headline uppercase tracking-tight text-left">Technical Verification</h2>
        </div>
        <Accordion type="single" collapsible className="w-full text-left">
            <AccordionItem value="google-verification" className="border rounded-2xl px-6 bg-amber-500/5 mb-4 shadow-sm overflow-hidden text-left">
                <AccordionTrigger className="hover:no-underline font-bold text-sm text-left">Why do I see a "Google hasn't verified this app" warning?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed font-medium text-left">
                    <p className="mb-4 text-left">This is a standard security measure for new applications using Google services like Contact Sync. While we are in testing mode, you can safely bypass this by clicking <strong>"Advanced"</strong> and then <strong>"Go to testifyglobal.com (unsafe)"</strong>.</p>
                    <p className="text-left">Organizers can remove this warning permanently by following the <Link href="/verification-guide" className="text-primary font-bold hover:underline">Official Verification Guide</Link> in the project documentation.</p>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="referrals" className="border rounded-2xl px-6 bg-card mb-4 shadow-sm overflow-hidden text-left">
                <AccordionTrigger className="hover:no-underline font-bold text-sm text-left">How do I refer other believers?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed font-medium text-left">
                    Testify is most powerful when used collectively. Use the "Share App" button to invite pastors, youth leaders, and friends. A connected network is a prepared network.
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="insights" className="border rounded-2xl px-6 bg-card mb-4 shadow-sm overflow-hidden text-left">
                <AccordionTrigger className="hover:no-underline font-bold text-sm text-left">What are AI Follow-up Insights?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed font-medium text-left">
                    In the "Souls Won" section, the AI assistant analyzes convert history to suggest personalized next steps and natural-sounding messages for you to send.
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      </section>
      
      <section className="mt-16 p-8 rounded-[2.5rem] bg-primary/5 border-2 border-dashed border-primary/20 text-center relative overflow-hidden text-left">
        <div className="absolute -top-4 -right-4 p-4 opacity-5 rotate-12 text-left">
            <Flame className="h-32 w-32 text-primary text-left" />
        </div>
        <div className="max-w-md mx-auto space-y-6 relative z-10 text-left">
            <h3 className="font-black text-3xl font-headline tracking-tight uppercase text-center">Ready to mobilize?</h3>
            <p className="text-sm text-muted-foreground font-medium text-center">Connect more believers to the harvest network by sharing this platform.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 w-full px-4 text-left">
                <Button asChild variant="outline" className="w-full sm:w-auto rounded-2xl h-12 px-8 font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 shadow-lg text-left">
                    <Link href="/dashboard/marketplace" className="text-left">MEALS CENTER</Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto rounded-2xl h-12 px-8 font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 shadow-lg text-left">
                    <Link href="/dashboard/marketplace/gifts" className="text-left">KINDNESS CENTER</Link>
                </Button>
            </div>
        </div>
      </section>

      <footer className="text-center pt-12 border-t mt-12 px-8 text-left">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 mb-12 text-left">
            <div className="col-span-1 sm:col-span-2 space-y-6 text-left">
                <p className="text-muted-foreground text-sm max-w-sm font-medium leading-relaxed italic text-left">
                    Testify is built for believers to share the greatness of Jesus Christ.
                </p>
            </div>
            <div className="space-y-4 text-left">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary text-left">Platform</h4>
                <ul className="space-y-3 text-left">
                    <li><Link href="/testimonies" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Glory Feed</Link></li>
                    <li><Link href="/campaigns" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Mission Hub</Link></li>
                    <li><Link href="/growth" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Harvest Growth</Link></li>
                    <li><Link href="/fellowships" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Directory</Link></li>
                </ul>
            </div>
        </div>
        <p className="text-xs text-muted-foreground italic font-medium text-center">
          "But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the earth." — Acts 1:8
        </p>
      </footer>
    </div>
  );
}