
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '../ui/button';
import { Loader2, Quote, PlayCircle } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { useUser } from '@/firebase';
import { PrayerLinksSettingsCard } from '../settings/prayer-links-settings-card';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

const prayerPoints = [
    { label: 'The Kingdom', verse: 'Matthew 6:10', text: 'Your kingdom come, your will be done, on earth as it is in heaven.' },
    { label: 'Prophets & Pastors', verse: 'Colossians 4:3', text: 'And pray for us, too, that God may open a door for our message, so that we may proclaim the mystery of Christ, for which I am in chains.' },
    { label: 'Governments', verse: '1 Timothy 2:1-2', text: 'I urge, then, first of all, that petitions, prayers, intercession and thanksgiving be made for all people— for kings and all those in authority, that we may live peaceful and quiet lives in all godliness and holiness.' },
    { label: 'Other Believers', verse: 'Ephesians 6:18', text: 'And pray in the Spirit on all occasions with all kinds of prayers and requests. With this in mind, be alert and always keep on praying for all the Lord’s people.' },
    { label: 'The Earth', verse: 'Psalm 24:1', text: 'The earth is the LORD’s, and everything in it, the world, and all who live in it.' },
    { label: 'Souls', verse: '2 Peter 3:9', text: 'The Lord is not slow in keeping his promise, as some understand slowness. Instead he is patient with you, not wanting anyone to perish, but everyone to come to repentance.' },
    { label: 'You', verse: 'Mark 11:24', text: 'Therefore I tell you, whatever you ask for in prayer, believe that you have received it, and it will be yours.' },
];

export function PrayerDialog({ isOpen, onOpenChange, onDisciplineCompleted, userProfile }: { isOpen: boolean; onOpenChange: (open: boolean) => void; onDisciplineCompleted: () => void; userProfile: UserProfile | null; }) {
  const { user } = useUser();
  const [isCompleting, setIsCompleting] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const prayerLinks = userProfile?.prayerLinks || [];

  useEffect(() => {
    if (!isOpen) {
        setIsCompleting(false);
    }
  }, [isOpen]);

  const handleComplete = () => {
    setIsCompleting(true);
    onDisciplineCompleted();
    setTimeout(() => {
        onOpenChange(false);
        toast({ title: 'Discipline Completed', description: 'You have completed the prayer discipline for today.'});
    }, 500);
  }

  const handleLinkClick = (url: string) => {
    onDisciplineCompleted();
    window.open(url, '_blank', 'noopener,noreferrer');
    onOpenChange(false);
    toast({ title: 'Discipline Completed', description: 'You have completed the prayer discipline for today.'});
  }

  const DialogBody = () => (
      <div className="space-y-6">
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="manage-links">
                <AccordionTrigger>Manage Prayer Links</AccordionTrigger>
                <AccordionContent>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">Add, edit, or remove personal links to prayer meetings (up to 5).</p>
                    {user && userProfile && (
                        <PrayerLinksSettingsCard userProfile={userProfile} userId={user.uid} />
                    )}
                </AccordionContent>
            </AccordionItem>
        </Accordion>

        <Card>
            <CardHeader>
                <CardTitle>Prayer Focus</CardTitle>
                <CardDescription>Key prayer points with related scripture.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Accordion type="single" collapsible className="w-full">
                    {prayerPoints.map((point, i) => (
                        <AccordionItem value={`item-${i}`} key={i}>
                            <AccordionTrigger>{point.label}</AccordionTrigger>
                            <AccordionContent>
                                <blockquote className="border-l-2 pl-4 italic text-sm text-muted-foreground">
                                    {point.text}
                                    <footer className="text-right not-italic mt-2">- {point.verse}</footer>
                                </blockquote>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
                
                {prayerLinks.length > 0 && (
                    <div className="space-y-3 pt-4 border-t">
                        <h4 className="font-medium text-sm text-muted-foreground">Join a Prayer Stream</h4>
                        <div className="space-y-2">
                            {prayerLinks.map((link, index) => (
                                <Button
                                    key={index}
                                    variant="secondary"
                                    className="w-full justify-start"
                                    onClick={() => handleLinkClick(link.url)}
                                    disabled={isCompleting}
                                >
                                    <PlayCircle className="mr-2 h-4 w-4" />
                                    {link.name}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
  );

  const Header = ({ isSheet = false }: { isSheet?: boolean}) => (
    isSheet ? (
        <SheetHeader>
          <SheetTitle>A Moment to Pray</SheetTitle>
          <SheetDescription>
            Reflect on the Word, join a prayer stream, or manage your links.
          </SheetDescription>
        </SheetHeader>
    ) : (
        <DialogHeader>
          <DialogTitle>A Moment to Pray</DialogTitle>
          <DialogDescription>
            Reflect on the Word, join a prayer stream, or manage your links.
          </DialogDescription>
        </DialogHeader>
    )
  );

  if (!mounted) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></DialogContent>
        </Dialog>
    );
  }

  if (isMobile) {
    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="p-0 flex flex-col h-auto max-h-[90dvh]">
                <div className="p-6 border-b flex-shrink-0">
                    <Header isSheet />
                </div>
                <div className="flex-grow min-h-0 overflow-y-auto">
                    <div className="p-6">
                        <DialogBody />
                    </div>
                </div>
                <div className="p-6 border-t flex-shrink-0">
                     <Button onClick={handleComplete} disabled={isCompleting} className="w-full">
                        {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Mark as Prayed
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl flex flex-col max-h-[80vh]">
        <Header />
        <div className="flex-grow min-h-0 overflow-y-auto pr-4 -mr-4 mt-4">
          <DialogBody />
        </div>
        <div className="flex-shrink-0 pt-4 border-t -mx-6 px-6 pb-4">
             <Button onClick={handleComplete} disabled={isCompleting} className="w-full">
                {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark as Prayed
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
