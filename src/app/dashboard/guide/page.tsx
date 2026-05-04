'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { BookOpen, TrendingUp, UserPlus, Target, Newspaper, HeartHandshake, Share2, Users, Flame, UserCheck2, History } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const tutorials = [
  {
    id: 'kingdom-service',
    title: 'Kingdom Service & Great Commission',
    icon: Flame,
    content: [
      'Testify is a tool designed to empower the Great Commission (Matthew 28:19). Every interaction recorded is an act of service to the Lord.',
      'Organize your personal and community evangelism efforts with a spirit of excellence and accountability.',
      'Remember: every soul logged represents a precious child of God being nurtured back to their Father.',
      'Expanding the workforce: Refer the app to your pastors, youth leaders, and fellow believers to mobilize the global body of Christ.',
    ],
  },
  {
    id: 'harvest',
    title: 'The Harvest: Logging Souls Won',
    icon: UserPlus,
    content: [
      'Record new converts immediately to ensure they are never forgotten or neglected.',
      'Logging a soul creates a record in your personal dashboard and the global Kingdom harvest list.',
      'You can export your harvest data to CSV or PDF for church reporting or personal prayer records.',
      'Use AI-powered "Insights" to get practical, personalized suggestions for the best next steps for each convert.',
    ],
  },
  {
    id: 'nurture',
    title: 'Nurture: Assigning to Fellowships',
    icon: Users,
    content: [
      'A soul won is a seed planted; a local Fellowship is the soil where they are nurtured to grow.',
      'On the "Souls Won" page, use the "Assign Fellowship" action to connect a convert to a local group based on their city or proximity.',
      'Once assigned, the Fellowship Organizer is notified, and all members of that group gain access to the convert\'s record.',
      'This transition ensures that discipleship becomes a shared responsibility of the community.',
    ],
  },
  {
    id: 'collaborative-followup',
    title: 'Collaborative Care & History',
    icon: History,
    content: [
      'Within a Fellowship, any authorized member can log a follow-up interaction (e.g., Shared a meal, Studied Bible).',
      'The app automatically records the identity of the member who performed the follow-up.',
      'The "Collective Follow-up History" allows the whole group to see a transparent timeline of spiritual progress.',
      'Sharing the burden: Members can encourage each other and ensure that no convert is left without support.',
    ],
  },
  {
    id: 'mobilize',
    title: 'Mobilize: Campaigns & Coordination',
    icon: Target,
    content: [
      'Join or create soul-winning campaigns to unite with other believers for mass outreach events.',
      'Use the integrated Group Chat feature to coordinate logistics, share real-time updates, and pray together.',
      'Live stream your efforts or gather online via virtual meeting links to include those who cannot be physically present.',
    ],
  },
  {
    id: 'encouragement',
    title: 'Encouragement: Testimonies & Prayer',
    icon: Newspaper,
    content: [
      'Overcome the enemy by the word of your testimony (Revelation 12:11). Share what God is doing to ignite faith in others.',
      'Submit prayer requests and join the community in lifting up the needs of the brethren with an "Amen!".',
      'Linking prayers to answers: When a prayer is answered, share a testimony directly from the request to close the loop of faith.',
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
        throw new Error('Share API not supported or permission denied');
      }
    } catch (err) {
      // Fallback to clipboard
      if (typeof window !== 'undefined') {
        navigator.clipboard.writeText(shareData.url);
        toast({
          title: 'Link Copied',
          description: 'Browser sharing was denied. The referral link has been copied to your clipboard instead.',
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
        <p className="text-sm text-muted-foreground mb-4">Sharing this tool with fellow believers helps build a stronger network dedicated to the Great Commission.</p>
        <Button onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" /> Share App & Refer Brethren
        </Button>
      </div>
    </div>
  );
}
