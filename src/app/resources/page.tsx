import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  BookOpen, 
  Flame, 
  Zap, 
  Target, 
  BookMarked, 
  Quote, 
  ArrowLeft, 
  ArrowRight,
  Users, 
  ShieldAlert, 
  Crosshair, 
  Sun,
  Sparkles,
  ShieldCheck,
  HeartHandshake,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  Store,
  Package
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Kingdom Library - Testify Global Resources',
  description: 'Access practical guides and growth tracks for your spiritual walk and evangelism mission.',
};

const growthTracks = [
  {
    id: 'foundation',
    title: 'Track 1: Foundation',
    subtitle: 'The Secret Place',
    icon: Zap,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    items: [
      {
        id: 'prayer',
        title: 'Daily Prayer Life',
        desc: 'Deepen your communion with God through purposeful prayer.',
        sections: [
          { label: 'The A.C.T.S. Method', content: 'Adoration (Praise God), Confession (Repent), Thanksgiving (Gratitude), and Supplication (Requests).' },
          { label: 'Intercession for the Lost', content: 'Specifically asking the Spirit to soften hearts and create divine openings for the Gospel.' }
        ],
        verses: ['1 Thessalonians 5:16-18', 'Philippians 4:6-7']
      },
      {
        id: 'bible-study',
        title: 'Effective Word Study',
        desc: 'Grow in the knowledge of the Word of Truth.',
        sections: [
          { label: 'O.I.A Method', content: 'Observation (What it says), Interpretation (What it means), and Application (How it changes me).' },
          { label: 'Consistent Meditation', content: 'Set a regular time and place. Let the Word dwell in you richly through focused daily study.' }
        ],
        verses: ['2 Timothy 2:15', 'Psalm 119:105'],
        link: '/dashboard/bible',
        linkLabel: 'Open Bible'
      }
    ]
  },
  {
    id: 'harvest',
    title: 'Track 2: The Harvest',
    subtitle: 'Great Commission',
    icon: Flame,
    color: 'text-orange-600',
    bgColor: 'bg-orange-600/10',
    items: [
      {
        id: 'evangelism',
        title: 'Sharing the Gospel',
        desc: 'Practical tips for effective personal evangelism.',
        sections: [
          { label: 'The Power of Your Story', content: 'Prepare a 2-minute summary of your life before, during, and after meeting Jesus. It is irrefutable.' },
          { label: 'Listening with Love', content: 'Hear people\'s struggles first. Identify how the Gospel provides the solution to their specific needs.' }
        ],
        verses: ['Mark 16:15', '1 Peter 3:15']
      },
      {
        id: 'soul-winning',
        title: 'Nurture & Discipleship',
        desc: 'Turning new converts into established disciples.',
        sections: [
          { label: 'The First 48 Hours', content: 'Follow-up is critical. Reach out quickly to pray and encourage their first steps of faith.' },
          { label: 'Community Connection', content: 'Help them find a fellowship group or church immediately. No one should grow alone.' }
        ],
        verses: ['Matthew 28:19-20', 'Proverbs 11:30'],
        link: '/dashboard/souls-won',
        linkLabel: 'Log Souls'
      }
    ]
  },
  {
    id: 'unity',
    title: 'Track 3: The Body',
    subtitle: 'Kingdom Unity',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-600/10',
    items: [
      {
        id: 'accountability',
        title: 'Spiritual Partners',
        desc: 'Growing together through transparency and support.',
        sections: [
          { label: 'The Role of a Partner', content: 'A trusted brother or sister who holds you to your spiritual goals and prays for your victory.' },
          { label: 'Mutual Nudging', content: 'Regular check-ins to prevent isolation and spiritual plateaus. Iron sharpens iron.' }
        ],
        verses: ['Proverbs 27:17', 'Ecclesiastes 4:9-10'],
        link: '/dashboard/accountability',
        linkLabel: 'Find Partner'
      },
      {
        id: 'fellowship',
        title: 'Community Groups',
        desc: 'The strength of the local and global Body.',
        sections: [
          { label: 'Shared Discipleship', content: 'Engage with Fellowships and Associations to share the burden of follow-up and growth.' },
          { label: 'Collective Faith', content: 'Unified prayer and agreement bring breakthroughs that individuals cannot achieve alone.' }
        ],
        verses: ['Acts 2:42-47', 'Hebrews 10:24-25'],
        link: '/dashboard/fellowship',
        linkLabel: 'Join Group'
      }
    ]
  },
  {
    id: 'warfare',
    title: 'Track 4: Overcoming',
    subtitle: 'Advanced Warfare',
    icon: ShieldCheck,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-600/10',
    items: [
      {
        id: 'strongholds',
        title: 'Breaking Strongholds',
        desc: 'Victory over deep-seated spiritual challenges.',
        sections: [
          { label: 'Naming the Enemy', content: 'Victory begins by bringing hidden struggles into the light of the Body of Christ.' },
          { label: 'The Word as a Weapon', content: 'Replace ungodly thoughts with specific Kingdom promises. Pull down every high thing.' }
        ],
        verses: ['2 Corinthians 10:4-5', 'Ephesians 6:10-18'],
        link: '/dashboard/victory-hub',
        linkLabel: 'Enter Victory Hub'
      },
      {
        id: 'fasting',
        title: 'Power of Fasting',
        desc: 'Abstaining to feast on the Presence of God.',
        sections: [
          { label: 'Biblical Alignment', content: 'Fasting humbles the flesh and intensifies spiritual focus. It aligns you with God\'s heart.' },
          { label: 'Breakthrough Fasting', content: 'Use fasting for critical spiritual breakthroughs and clarity in your mission assignment.' }
        ],
        verses: ['Matthew 6:16-18', 'Isaiah 58:6-7']
      }
    ]
  }
];

export default function ResourcesPage() {
  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-32 w-full p-4 sm:p-8">
      <header className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <BookMarked className="h-5 w-5 text-primary" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Kingdom Equipping</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black font-headline tracking-tight uppercase">Kingdom Library</h1>
            </div>
            <div className="flex gap-2">
                <Badge className="bg-primary/20 text-primary border-primary/20 px-3 py-1 font-bold uppercase tracking-widest text-[10px]">Active Workforce</Badge>
            </div>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-2xl leading-relaxed italic text-balance px-1">
            Access growth tracks to equip yourself for the harvest field and the building of the Body.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-12 sm:gap-16">
        {growthTracks.map((track) => (
          <section key={track.id} className="space-y-8">
            <div className="flex items-center gap-5 px-5 sm:px-1">
                <div className={cn("h-14 w-14 rounded-[1.25rem] flex items-center justify-center shadow-xl border-2", track.bgColor, "border-white/10")}>
                    <track.icon className={cn("h-7 w-7", track.color)} />
                </div>
                <div>
                    <h2 className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight leading-tight">{track.title}</h2>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1">{track.subtitle}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 sm:gap-8 px-0 sm:px-0 -mx-4 sm:mx-0">
                {track.items.map((res) => (
                    <Card key={res.id} className="rounded-none sm:rounded-[2.5rem] overflow-hidden border-x-0 sm:border shadow-sm bg-card/50 backdrop-blur-sm group hover:shadow-xl transition-all duration-300 flex flex-col h-full border-t-2 sm:border-t-0 border-b-8 border-b-primary/5">
                        <CardHeader className="p-8 pb-4">
                            <div className="flex justify-between items-start mb-4">
                                <CardTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight group-hover:text-primary transition-colors">
                                    {res.title}
                                </CardTitle>
                                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-background/50">Module</Badge>
                            </div>
                            <CardDescription className="text-sm font-medium leading-relaxed italic">
                                &ldquo;{res.desc}&rdquo;
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-8 pb-8 flex-grow">
                            <Accordion type="single" collapsible className="w-full">
                                {res.sections.map((section, idx) => (
                                    <AccordionItem value={`item-${idx}`} key={idx} className="border-none bg-muted/20 rounded-2xl mb-2 px-4 overflow-hidden">
                                        <AccordionTrigger className="text-xs font-black uppercase tracking-widest hover:no-underline py-4 text-left">
                                            {section.label}
                                        </AccordionTrigger>
                                        <AccordionContent className="text-sm text-muted-foreground leading-relaxed font-medium pb-4">
                                            {section.content}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                        <CardFooter className="p-6 bg-muted/30 border-t flex flex-wrap gap-2 items-center justify-between">
                            <div className="flex flex-wrap gap-2">
                                {res.verses.map((v) => (
                                    <Badge key={v} variant="secondary" className="text-[9px] font-bold h-6 px-2 bg-background border-primary/10">
                                        <Quote className="h-2.5 w-2.5 mr-1 text-primary" />
                                        {v}
                                    </Badge>
                                ))}
                            </div>
                            {res.link && (
                                <Button asChild variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-full px-4 group/btn">
                                    <Link href={res.link}>
                                        {res.linkLabel} <ChevronRight className="ml-1 h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
                                    </Link>
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
          </section>
        ))}
      </div>

      {/* Provision Hub Quick Links */}
      <section className="px-4 sm:px-0">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Store className="h-6 w-6 text-blue-500" />
            </div>
            <h2 className="text-2xl font-black font-headline uppercase tracking-tight">Support Services</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card className="rounded-[2rem] bg-blue-500 text-white overflow-hidden border-none shadow-xl">
                    <CardHeader className="p-8">
                        <CardTitle className="text-2xl font-black uppercase tracking-tight leading-tight">Meals Center</CardTitle>
                        <CardDescription className="text-blue-100 text-sm font-medium">Coordinate physical provision for the brethren.</CardDescription>
                    </CardHeader>
                    <CardFooter className="p-0 border-t border-white/10">
                        <Button asChild variant="ghost" className="w-full h-14 rounded-none text-white hover:bg-white/10 font-black uppercase tracking-widest text-xs">
                            <Link href="/dashboard/marketplace">Enter Provision Hub <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </CardFooter>
                </Card>
                <Card className="rounded-[2rem] bg-indigo-600 text-white overflow-hidden border-none shadow-xl">
                    <CardHeader className="p-8">
                        <CardTitle className="text-2xl font-black uppercase tracking-tight leading-tight">Kindness Center</CardTitle>
                        <CardDescription className="text-indigo-100 text-sm font-medium">Gifts and spiritual tokens to nourish the soul.</CardDescription>
                    </CardHeader>
                    <CardFooter className="p-0 border-t border-white/10">
                        <Button asChild variant="ghost" className="w-full h-14 rounded-none text-white hover:bg-white/10 font-black uppercase tracking-widest text-xs">
                            <Link href="/dashboard/marketplace/gifts">Enter Kindness Center <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </CardFooter>
                </Card>
          </div>
      </section>

      <footer className="text-center pt-12 border-t mt-12 px-8">
        <p className="text-[10px] text-muted-foreground italic font-bold uppercase tracking-[0.2em] max-w-md mx-auto opacity-40">
          "© {new Date().getFullYear()} Testify Global • Equipping for the Harvest"
        </p>
      </footer>
    </div>
  );
}
