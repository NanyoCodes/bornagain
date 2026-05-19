'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { BookOpen, Flame, Heart, Zap, Target, BookMarked, Quote, ArrowLeft, Users, ShieldAlert, Crosshair } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const resources = [
  {
    id: 'prayer',
    title: 'Daily Prayer Life',
    description: 'Deepen your communion with God through purposeful prayer.',
    icon: Zap,
    color: 'text-chart-5',
    subsections: [
      {
        subtitle: 'The A.C.T.S. Method',
        content: 'Adoration (Praise God for who He is), Confession (Repent of sins), Thanksgiving (Gratitude for blessings), and Supplication (Requests for yourself and others).',
      },
      {
        subtitle: 'Intercession for the Lost',
        content: 'Specific prayer for those who do not yet know Christ. Ask the Holy Spirit to soften their hearts and create divine opportunities for the Gospel.',
      },
    ],
    verses: ['1 Thessalonians 5:16-18', 'Philippians 4:6-7'],
  },
  {
    id: 'bible-study',
    title: 'Effective Bible Study',
    description: 'Grow in the knowledge of the Word of Truth.',
    icon: BookOpen,
    color: 'text-chart-2',
    subsections: [
      {
        subtitle: 'Observation, Interpretation, Application',
        content: 'What does the text say? What does it mean? How does it apply to my life today? Always read in context.',
      },
      {
        subtitle: 'Consistent Devotion',
        content: 'Set a regular time and place. Start with prayer, asking for revelation and a spirit of understanding.',
      },
    ],
    verses: ['2 Timothy 2:15', 'Psalm 119:105'],
  },
  {
    id: 'evangelism',
    title: 'Sharing the Gospel',
    description: 'Practical tips for effective personal evangelism.',
    icon: Flame,
    color: 'text-chart-1',
    subsections: [
      {
        subtitle: 'The Power of Your Story',
        content: 'Your personal testimony is unique and irrefutable. Prepare a 2-minute summary of your life before, during, and after meeting Jesus.',
      },
      {
        subtitle: 'Listening with Love',
        content: 'Evangelism starts with hearing. Listen to people\'s struggles and identify how the Gospel provides the ultimate answer to their needs.',
      },
    ],
    verses: ['Mark 16:15', '1 Peter 3:15'],
  },
  {
    id: 'soul-winning',
    title: 'Soul Winning & Discipleship',
    description: 'Nurture new converts into established disciples.',
    icon: Target,
    color: 'text-chart-4',
    subsections: [
      {
        subtitle: 'The First 48 Hours',
        content: 'Follow-up is critical. Reach out within 48 hours to pray with a new convert and encourage their first steps of faith.',
      },
      {
        subtitle: 'Connecting to Community',
        content: 'New converts need the support of the local body. Help them find a fellowship group or church where they can grow with others.',
      },
    ],
    verses: ['Matthew 28:19-20', 'Proverbs 11:30'],
  },
  {
    id: 'accountability',
    title: 'Spiritual Accountability',
    description: 'Growing together through transparency and mutual support.',
    icon: Users,
    color: 'text-primary',
    subsections: [
      {
        subtitle: 'The Role of a Partner',
        content: 'An accountability partner is someone you trust to hold you to your spiritual goals. Share your wins and struggles honestly.',
      },
      {
        subtitle: 'Mutual Encouragement',
        content: 'Hebrews 10:24-25 tells us to stir up one another to love and good works. Regular check-ins prevent isolation and spiritual plateau.',
      },
    ],
    verses: ['Proverbs 27:17', 'Ecclesiastes 4:9-10'],
  },
  {
    id: 'fasting',
    title: 'The Power of Fasting',
    description: 'Abstaining to feast on the Presence of God.',
    icon: ShieldAlert,
    color: 'text-destructive',
    subsections: [
      {
        subtitle: 'Biblical Fasting',
        content: 'Fasting is not just about hunger; it\'s about humbling yourself and intensifying your focus on God. Pair fasting with increased prayer and Word study.',
      },
      {
        subtitle: 'Breaking Strongholds',
        content: 'Some spiritual breakthroughs require the additional discipline of fasting. It aligns your spirit, soul, and body with God\'s purposes.',
      },
    ],
    verses: ['Matthew 6:16-18', 'Isaiah 58:6-7'],
  },
];

export default function ResourcesPage() {
  const router = useRouter();

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-6 pb-12">
      <header className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl">
                <BookMarked className="h-8 w-8 text-primary" />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Spiritual Resources</h1>
                <p className="text-muted-foreground text-sm">Equipping the Body of Christ for the harvest.</p>
            </div>
          </div>
        </div>
        <Separator />
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        {resources.map((res) => (
          <Card key={res.id} className="flex flex-col border-t-4 border-t-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <res.icon className={cn("h-6 w-6", res.color)} />
                <CardTitle className="text-xl">{res.title}</CardTitle>
              </div>
              <CardDescription>{res.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <Accordion type="single" collapsible className="w-full">
                {res.subsections.map((sub, idx) => (
                  <AccordionItem value={`item-${idx}`} key={idx} className="border-none">
                    <AccordionTrigger className="text-sm font-semibold hover:no-underline py-2 text-left">
                      {sub.subtitle}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {sub.content}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
            <CardFooter className="pt-4 border-t bg-muted/30 flex flex-wrap gap-2">
              {res.verses.map((v) => (
                <Badge key={v} variant="secondary" className="text-[10px] font-normal">
                  <Quote className="h-3 w-3 mr-1 opacity-50" />
                  {v}
                </Badge>
              ))}
            </CardFooter>
          </Card>
        ))}
      </section>

      <section className="bg-muted/40 rounded-2xl p-8 border border-dashed">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="text-2xl font-bold font-headline">Growing Daily in Grace</h2>
          <p className="text-muted-foreground italic text-sm">
            "But grow in the grace and knowledge of our Lord and Savior Jesus Christ. To him be glory both now and forever! Amen." — 2 Peter 3:18
          </p>
          <div className="grid gap-4 text-left pt-6">
            <div className="flex gap-4 items-start">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary text-xs font-bold">1</div>
              <p className="text-sm text-muted-foreground">Start every day with the Word and Prayer before engaging with the world.</p>
            </div>
            <div className="flex gap-4 items-start">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary text-xs font-bold">2</div>
              <p className="text-sm text-muted-foreground">Log your spiritual activities to maintain a consistent discipline.</p>
            </div>
          </div>
          <div className="pt-6">
              <Button asChild>
                  <Link href="/login">Get Started Tracking</Link>
              </Button>
          </div>
        </div>
      </section>

      <footer className="text-center pt-8 border-t mt-12">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Testify Global. Equipping saints for the harvest.
        </p>
      </footer>
    </div>
  );
}