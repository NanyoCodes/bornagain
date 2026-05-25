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
  ChevronRight
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
    description: "Mobilize for evangelism and track progress.",
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
    <div className="space-y-12 max-w-4xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
            <h1 className="text-3xl md:text-5xl font-black font-headline tracking-tight flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            App Guide
            </h1>
            <p className="text-muted-foreground italic text-sm md:text-base font-medium">
            Equipping the Kingdom workforce for a global harvest.
            </p>
        </div>
        <div className="flex gap-2">
            <Badge variant="secondary" className="px-3 py-1 font-bold uppercase tracking-widest text-[10px]">Dashboard Guide</Badge>
            <Badge className="bg-primary/20 text-primary border-primary/20 px-3 py-1 font-bold uppercase tracking-widest text-[10px]">Kingdom Force</Badge>
        </div>
      </div>

      <Separator />

      <section className="space-y-8">
        <h2 className="text-2xl font-black font-headline uppercase flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-500" /> Getting Started Path
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {gettingStartedItems.map((item) => (
                <Card key={item.step} className="bg-muted/30 border-2 border-dashed relative group">
                    <CardHeader className="p-4 pb-2">
                        <div className={cn("h-10 w-10 rounded-2xl bg-background flex items-center justify-center mb-3 border shadow-sm transition-transform group-hover:scale-110", item.bg)}>
                            <item.icon className={cn("h-5 w-5", item.color)} />
                        </div>
                        <CardTitle className="text-sm font-black tracking-tight">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-xs text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                    </CardContent>
                    <span className="absolute top-2 right-4 text-3xl font-black text-foreground/5 italic">{item.step}</span>
                </Card>
            ))}
        </div>
      </section>

      <section className="space-y-12">
        <div className="space-y-2">
            <h2 className="text-2xl font-black font-headline uppercase tracking-tight">The Believer's Journey</h2>
            <p className="text-sm text-muted-foreground font-medium">Maximize your Kingdom impact using the full platform.</p>
        </div>

        <div className="space-y-12">
            {journeyPhases.map((phase, idx) => (
                <div key={idx} className="space-y-6">
                    <div className="flex items-center gap-5">
                        <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border-2", phase.bgColor)}>
                            <phase.icon className={cn("h-7 w-7", phase.color)} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight">{phase.title}</h3>
                            <p className="text-sm text-muted-foreground font-medium">{phase.description}</p>
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 ml-2 sm:ml-20">
                        {phase.items.map((item, i) => (
                            <Card key={i} className="border-none shadow-none bg-muted/20 rounded-2xl">
                                <CardHeader className="p-6 pb-2">
                                    <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">{item.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 pt-0">
                                    <p className="text-sm leading-relaxed text-muted-foreground font-medium">{item.content}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-black font-headline uppercase tracking-tight">Advanced Features</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="referrals" className="border rounded-2xl px-6 bg-card mb-4 shadow-sm overflow-hidden">
                <AccordionTrigger className="hover:no-underline font-bold text-sm">How do I expand the Kingdom workforce?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed font-medium">
                    Testify is most powerful when used collectively. Use the "Share App" button to invite pastors and youth leaders. A connected network is a prepared network.
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="insights" className="border rounded-2xl px-6 bg-card mb-4 shadow-sm overflow-hidden">
                <AccordionTrigger className="hover:no-underline font-bold text-sm">What are AI Follow-up Insights?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed font-medium">
                    In the "Souls Won" section, the AI assistant analyzes convert history to suggest personalized next steps and natural-sounding messages for you to send.
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      </section>
      
      <section className="mt-16 p-8 rounded-[2.5rem] bg-primary/5 border-2 border-dashed border-primary/20 text-center relative overflow-hidden">
        <div className="absolute -top-4 -right-4 p-4 opacity-5 rotate-12">
            <Flame className="h-32 w-32 text-primary" />
        </div>
        <div className="max-w-md mx-auto space-y-6 relative z-10">
            <h3 className="font-black text-3xl font-headline tracking-tight uppercase">Ready to mobilize?</h3>
            <p className="text-sm text-muted-foreground font-medium">Connect more believers to the harvest network by sharing this platform.</p>
            <Button onClick={handleShare} size="lg" className="w-full sm:w-auto font-black h-12 rounded-2xl shadow-xl shadow-primary/10 tracking-widest uppercase">
                <Share2 className="mr-2 h-4 w-4" /> REFER BRETHREN
            </Button>
        </div>
      </section>

      <footer className="text-center pt-12 border-t mt-12">
        <p className="text-xs text-muted-foreground italic font-medium">
          "But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the earth." — Acts 1:8
        </p>
      </footer>
    </div>
  );
}
