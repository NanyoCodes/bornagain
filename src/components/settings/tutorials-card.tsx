
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { BookOpen, TrendingUp, UserPlus, Target, Newspaper, HeartHandshake } from 'lucide-react';

const tutorials = [
  {
    id: 'dashboard',
    title: 'The Dashboard',
    icon: TrendingUp,
    content: [
      'Your main hub for an at-a-glance overview of your spiritual journey.',
      'Complete your Daily Disciplines: Pray, Read the Bible, and Attend Church.',
      'Track your evangelism progress with the monthly souls won chart and follow-up funnel.',
      'View your streaks for sharing testimonies and completing daily disciplines.',
      'Quickly log a new soul or share a testimony.',
    ],
  },
  {
    id: 'souls-won',
    title: 'Souls Won & Follow-up',
    icon: UserPlus,
    content: [
      'This is your personal directory of every soul you lead to Christ.',
      'Log new souls, edit their details, and track their progress from "New" to "Established".',
      'Use the "Follow-up" action to log interactions like phone calls, Bible studies, or prayers.',
      'View a complete interaction history for each person.',
      'Use the AI-powered "Insights" feature to get suggestions for your next follow-up steps.',
      'Export your data to CSV or PDF for your records.',
    ],
  },
  {
    id: 'campaigns',
    title: 'Campaigns',
    icon: Target,
    content: [
      'Join or create soul-winning campaigns in your area or globally.',
      'Use the filters to find ongoing, upcoming, or past campaigns.',
      'Create your own campaign by setting a goal, location, date, and description.',
      'Manage your campaigns: update details, add a live stream link, and view participants.',
      'Start a group chat with all participants for easy coordination.',
    ],
  },
  {
    id: 'testimonies',
    title: 'Testimonies & Prayer',
    icon: Newspaper,
    content: [
      'Share your story of what God has done to encourage the community.',
      'Read testimonies from others around the world.',
      'Support others by reacting to their testimonies.',
      'Submit confidential prayer requests for the community to pray over.',
      'Pray for others by clicking the "Pray" button on their requests.',
    ],
  },
  {
    id: 'accountability',
    title: 'Accountability Partners',
    icon: HeartHandshake,
    content: [
      'Find and connect with an accountability partner to stay motivated.',
      'Search for users by name or email and send them a request.',
      'Accept or decline incoming requests.',
      'View your partner\'s daily discipline status to encourage them.',
      'Send a "Nudge" to remind them to complete their disciplines.',
      'Start a private chat with your partner directly from the accountability page.',
    ],
  },
];

export function TutorialsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" /> App Guide & Tutorials
        </CardTitle>
        <CardDescription>
          Learn how to use the key features of the Testify app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {tutorials.map((tutorial) => (
            <AccordionItem value={tutorial.id} key={tutorial.id}>
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <tutorial.icon className="h-5 w-5 text-primary" />
                  {tutorial.title}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-outside space-y-2 pl-6 text-sm text-muted-foreground">
                  {tutorial.content.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
