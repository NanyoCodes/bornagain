'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Share2, 
  Flame, 
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function GuidePageClient() {
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
    <>
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
            <div className="flex justify-center pt-4">
                <Button onClick={handleShare} size="lg" className="font-bold w-full sm:w-auto">
                    <Share2 className="mr-2 h-4 w-4" /> Share App & Refer Brethren
                </Button>
            </div>
        </div>
      </section>
    </>
  );
}
