import { Metadata } from 'next';
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
  ArrowLeft,
  Zap,
  ShieldCheck,
  Heart,
  HeartHandshake,
  LayoutGrid,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Award
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GuidePageClient } from '@/components/guide/guide-page-client';

export const metadata: Metadata = {
  title: 'App Guide - Testify Global',
  description: 'A complete guide to using Testify Global for soul winning and testifying. Learn how to log souls, join campaigns, and grow in the Kingdom.',
};

const gettingStartedItems = [
  { 
    step: "1", 
    title: "Complete Profile", 
    description: "Add your photo and church info to join the active workforce.", 
    icon: UserPlus,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10"
  },
  { 
    step: "2", 
    title: "Daily Disciplines", 
    description: "Build spiritual strength by logging prayer and Bible study daily.", 
    icon: Zap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10"
  },
  { 
    step: "3", 
    title: "Testifying", 
    description: "Share what God has done to encourage the Body and give Him glory.", 
    icon: Newspaper,
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  { 
    step: "4", 
    title: "Log Soul", 
    description: "Record every convert you lead to Christ to begin their follow-up.", 
    icon: Heart,
    color: "text-red-500",
    bgColor: "bg-red-500/10"
  },
  { 
    step: "5", 
    title: "Accountability", 
    description: "Find a partner to stay sharp and motivated in your walk.", 
    icon: HeartHandshake,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10"
  },
  { 
    step: "6", 
    title: "Campaigning", 
    description: "Join or lead mission campaigns to impact cities and nations.", 
    icon: Target,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10"
  },
  { 
    step: "7", 
    title: "Fellowships", 
    description: "Connect converts to community groups for long-term growth.", 
    icon: Users,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10"
  },
];

const journeyPhases = [
  {
    title: "Phase 1: Personal Preparation",
    description: "Victory in the field starts with victory in the secret place.",
    icon: Zap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    items: [
      {
        title: "The Personal Altar",
        content: "Use the Daily Disciplines tracker to maintain a consistent habit of Prayer, Word Study (using the built-in Bible Reader), and Church Attendance."
      },
      {
        title: "Digital Journaling",
        content: "Capture revelations as you read the Word. Highlight verses and save notes in your private journal to track your spiritual journey."
      }
    ]
  },
  {
    title: "Phase 2: Public Proclamation",
    description: "Your testimony is a weapon that overcomes the enemy.",
    icon: Sparkles,
    color: "text-primary",
    bgColor: "bg-primary/10",
    items: [
      {
        title: "Sharing Miracles",
        content: "Post testimonies in the global feed. Categorize them so others looking for specific encouragement (Healing, Provision, etc.) can find them."
      },
      {
        title: "Answered Prayers",
        content: "When God answers a prayer request, link it to a testimony. This creates a powerful chain of evidence for God's faithfulness."
      }
    ]
  },
  {
    title: "Phase 3: Active Harvesting",
    description: "Mobilizing for the Great Commission through coordinated effort.",
    icon: Flame,
    color: "text-orange-600",
    bgColor: "bg-orange-600/10",
    items: [
      {
        title: "Soul Winning",
        content: "Log every convert immediately. Record their contact info and initial spiritual state so the follow-up process is seamless and organized."
      },
      {
        title: "Mission Campaigns",
        content: "Organize mass outreach events using the Campaigns tool. Recruit participants, set goals, and use group chats for real-time field coordination."
      }
    ]
  },
  {
    title: "Phase 4: Kingdom Preservation",
    description: "Nurturing new life through accountability and community.",
    icon: HeartHandshake,
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    items: [
      {
        title: "Collaborative Follow-up",
        content: "Assign souls to Fellowship Groups. Members share a follow-up log, allowing the whole community to participate in a convert's growth."
      },
      {
        title: "AI Growth Insights",
        content: "Use AI-powered analysis to get personalized follow-up suggestions and encouraging message templates for every soul you log."
      }
    ]
  }
];

export default function GuidePage() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto p-4 md:p-8 pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0 rounded-full h-10 w-10">
            <Link href="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl md:text-5xl font-black font-headline tracking-tight flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              App Guide
            </h1>
            <p className="text-muted-foreground italic text-sm md:text-base font-medium">
              Equipping the Kingdom workforce for a global harvest.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
            <Badge className="bg-primary/20 text-primary border-primary/20 px-3 py-1 font-bold uppercase tracking-widest text-[10px]">Great Commission</Badge>
        </div>
      </div>

      <Separator />

      {/* Getting Started Path */}
      <section className="space-y-8">
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-blue-500" />
            </div>
            <h2 className="text-2xl font-black font-headline uppercase tracking-tight">The 7-Step Mobilization Path</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {gettingStartedItems.map((item) => (
                <Card key={item.step} className="border-2 border-dashed bg-muted/20 relative group hover:bg-muted/40 transition-colors">
                    <CardHeader className="p-5 pb-2">
                        <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center mb-3 border shadow-sm transition-transform group-hover:scale-110", item.bgColor)}>
                            <item.icon className={cn("h-5 w-5", item.color)} />
                        </div>
                        <CardTitle className="text-base font-black tracking-tight">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">{item.description}</p>
                    </CardContent>
                    <div className="absolute top-2 right-4 text-3xl font-black text-foreground/5 italic">
                        {item.step}
                    </div>
                </Card>
            ))}
        </div>
      </section>

      {/* Journey Phases */}
      <section className="space-y-12">
        <div className="space-y-2">
            <h2 className="text-3xl font-black font-headline uppercase tracking-tight">The Believer's Journey</h2>
            <p className="text-sm text-muted-foreground font-medium">Strategic phases for maximum Kingdom impact.</p>
        </div>

        <div className="space-y-16">
            {journeyPhases.map((phase, idx) => (
                <div key={idx} className="space-y-6">
                    <div className="flex items-center gap-5">
                        <div className={cn("h-14 w-14 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-lg border-2", phase.bgColor)}>
                            <phase.icon className={cn("h-7 w-7", phase.color)} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight leading-tight">{phase.title}</h3>
                            <p className="text-sm text-muted-foreground font-medium">{phase.description}</p>
                        </div>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 ml-2 sm:ml-20">
                        {phase.items.map((item, i) => (
                            <Card key={i} className="border-none shadow-none bg-muted/30 hover:bg-muted/50 transition-colors rounded-2xl">
                                <CardHeader className="p-6 pb-2">
                                    <CardTitle className="text-sm font-black uppercase tracking-wider text-primary">{item.title}</CardTitle>
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

      <Separator />

      <GuidePageClient />

      <footer className="text-center py-12 border-t bg-muted/5 rounded-[2rem] border-dashed">
        <blockquote className="max-w-2xl mx-auto px-8">
            <p className="text-lg text-muted-foreground italic font-medium leading-relaxed">
            "The harvest is plentiful, but the laborers are few; therefore pray earnestly to the Lord of the harvest to send out laborers into his harvest."
            </p>
            <footer className="mt-4">
                <cite className="text-sm font-black text-primary uppercase tracking-[0.2em]">— Matthew 9:37-38</cite>
            </footer>
        </blockquote>
      </footer>
    </div>
  );
}
