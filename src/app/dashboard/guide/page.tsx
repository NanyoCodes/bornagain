
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { BookOpen, TrendingUp, UserPlus, Target, Newspaper, HeartHandshake, Share2, Users, Flame } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const tutorials = [
  {
    id: 'kingdom-service',
    title: 'Service to the Kingdom',
    icon: Flame,
    content: [
      'Testify is more than an app; it is a digital tool for the Great Commission (Matthew 28:19).',
      'Use this platform to organize your personal and community evangelism efforts with a spirit of excellence.',
      'Remember: every soul logged represents a precious child of God returning home.',
      'Encourage others by sharing the app with your church and fellow believers to mobilize the body of Christ.',
    ],
  },
  {
    id: 'dashboard',
    title: 'The Dashboard (Overview)',
    icon: TrendingUp,
    content: [
      'Your main hub for an at-a-glance overview of your spiritual journey and harvest progress.',
      'Complete your Daily Disciplines: Pray, Read the Bible, and Attend Church to stay spiritually sharp.',
      'Track your evangelism progress with the monthly souls won chart and follow-up funnel.',
      'View your streaks for sharing testimonies and completing daily disciplines.',
    ],
  },
  {
    id: 'souls-won',
    title: 'Harvest: Souls Won',
    icon: UserPlus,
    content: [
      'Log every soul you lead to Christ to ensure they are nurtured and not forgotten.',
      'Initial logging creates a record in your personal dashboard and the global Kingdom list.',
      'Export your harvest data to CSV or PDF for church reporting or personal records.',
      'Use AI-powered "Insights" to understand the best next steps for each person\'s spiritual growth.',
    ],
  },
  {
    id: 'fellowship-assignment',
    title: 'Nurture: Fellowship Assignment',
    icon: Users,
    content: [
      'A soul won is a seed planted; a Fellowship is where they are nurtured to grow.',
      'On the Souls Won page, use the "Assign Fellowship" action to connect a convert to a local group.',
      'Fellowships can be filtered by location (Country/State) to find the closest group for the convert.',
      'Once assigned, the Fellowship Organizer is notified, and all group members gain access to help with follow-up.',
    ],
  },
  {
    id: 'collaborative-followup',
    title: 'Growth: Collaborative Follow-up',
    icon: HeartHandshake,
    content: [
      'Fellowship members can collaboratively track the progress of assigned souls.',
      'Any authorized member can log an interaction (Shared a meal, Studied Bible, etc.).',
      'All interactions are added to a "Collective History" visible to the whole group.',
      'This ensures that the burden of discipleship is shared and progress is transparent.',
    ],
  },
  {
    id: 'campaigns',
    title: 'Mobilize: Campaigns',
    icon: Target,
    content: [
      'Join or create soul-winning campaigns to unite with other believers for mass outreach.',
      'Set goals, locations, and inspirational scriptures to define your mission.',
      'Use the Group Chat feature to coordinate logistics and share real-time updates.',
      'Live stream your efforts to allow the global community to pray and watch with you.',
    ],
  },
  {
    id: 'testimonies',
    title: 'Encourage: Testimonies & Prayer',
    icon: Newspaper,
    content: [
      'Overcome the enemy by the word of your testimony (Revelation 12:11).',
      'Share what God has done in your life or during campaigns to ignite faith in others.',
      'Submit prayer requests and join the community in lifting up the needs of the brethren.',
      'Support testimonies with an "Amen!" to let others know you are standing with them.',
    ],
  },
  {
    id: 'sharing',
    title: 'Kingdom Expansion: Referral',
    icon: Share2,
    content: [
      'The harvest is plentiful but the workers are few. Help us expand the workforce.',
      'Refer the Testify app to your Pastors, youth leaders, and friends.',
      'Use the sharing tools on Campaign and Testimony pages to spread the light of the Gospel.',
      'Invite new converts to create their own accounts to begin tracking their disciplines.',
    ],
  },
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
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Not supported');
      }
    } catch (err) {
      // Fallback for browsers that don't support sharing or deny permission (e.g. in some dev environments)
      if (typeof window !== 'undefined') {
        navigator.clipboard.writeText(shareData.url);
        toast({
          title: 'Link Copied',
          description: 'The app link has been copied to your clipboard. Share it with your brethren!',
        });
      }
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          App Guide & Tutorials
        </h1>
        <p className="text-muted-foreground italic">
          Equipping you for every good work in service to the Kingdom of God.
        </p>
      </div>
      <Separator />

      <Accordion type="single" collapsible className="w-full" defaultValue="kingdom-service">
        {tutorials.map((tutorial) => (
          <AccordionItem value={tutorial.id} key={tutorial.id} className="border rounded-lg px-4 mb-4 bg-card shadow-sm">
            <AccordionTrigger className="text-lg hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-md">
                  <tutorial.icon className="h-5 w-5 text-primary" />
                </div>
                {tutorial.title}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc list-outside space-y-3 pl-6 text-sm text-muted-foreground py-2">
                {tutorial.content.map((point, index) => (
                  <li key={index} className="leading-relaxed">{point}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      
      <div className="mt-12 p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
        <h3 className="font-bold text-lg mb-2">Ready to expand the Kingdom?</h3>
        <p className="text-sm text-muted-foreground mb-4">Sharing this tool with others helps build a stronger network of believers dedicated to the Great Commission.</p>
        <Button onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" /> Share App
        </Button>
      </div>
    </div>
  );
}
