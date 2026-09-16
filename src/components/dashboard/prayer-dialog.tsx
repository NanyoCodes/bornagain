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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, PlayCircle, ChevronDown, Zap } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { useUser } from '@/firebase';
import { PrayerLinksSettingsCard } from '../settings/prayer-links-settings-card';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from '../ui/accordion';
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';

const prayerPoints = [
  {
    label: 'The Kingdom',
    verse: 'Matthew 6:10',
    text: 'Your kingdom come, your will be done, on earth as it is in heaven.',
    prayer: 'Pray for God\'s will to be done and His kingdom to come on earth, transforming lives, communities, and nations to reflect His righteousness and peace.',
  },
  {
    label: 'Prophets & Pastors',
    verse: 'Colossians 4:3',
    text: 'And pray for us, too, that God may open a door for our message, so that we may proclaim the mystery of Christ, for which I am in chains.',
    prayer: "Pray for our spiritual leaders, asking God to grant them wisdom, strength, and a bold voice to proclaim the gospel.",
  },
  {
    label: 'Governments',
    verse: '1 Timothy 2:1-2',
    text: 'I urge, then, first of all, that petitions, prayers, intercession and thanksgiving be made for all people— for kings and all those in authority, that we may live peaceful and quiet lives in all godliness and holiness.',
    prayer: "Pray for our leaders and all those in authority, that they may govern with justice and righteousness, allowing us to live peaceful and godly lives.",
  },
  {
    label: 'Other Believers',
    verse: 'Ephesians 6:18',
    text: 'And pray in the Spirit on all occasions with all kinds of prayers and requests. With this in mind, be alert and always keep on praying for all the Lord’s people.',
    prayer: "Pray for our brothers and sisters in Christ around the world, for their protection, strength, and unity in the Spirit.",
  },
  {
    label: 'The Earth',
    verse: 'Psalm 24:1',
    text: 'The earth is the LORD’s, and everything in it, the world, and all who live in it.',
    prayer: "Pray for the stewardship of the earth, acknowledging it as the Lord's creation and asking for wisdom in its care.",
  },
  {
    label: 'Souls',
    verse: '2 Peter 3:9',
    text: 'The Lord is not slow in keeping his promise, as some understand slowness. Instead he is patient with you, not wanting anyone to perish, but everyone to come to repentance.',
    prayer: "Pray for the salvation of the lost, that God's patient love would draw them to repentance and faith in Jesus Christ.",
  },
  {
    label: 'You',
    verse: 'Mark 11:24',
    text: 'Therefore I tell you, whatever you ask for in prayer, believe that you have received it, and it will be yours.',
    prayer: "Pray for your personal needs, presenting them to God and believing with faith that He hears and will provide according to His will.",
  },
  {
    label: 'Loved Ones',
    verse: 'Philippians 1:3-4',
    text: 'I thank my God in all my remembrance of you, always in every prayer of mine for you all making my prayer with joy.',
    prayer: "Pray for our family and friends, thanking God for them and lifting up their specific needs with joy.",
  },
];

export function PrayerDialog({
  isOpen,
  onOpenChange,
  onDisciplineCompleted,
  userProfile,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDisciplineCompleted: () => void;
  userProfile: UserProfile | null;
}) {
  const { user } = useUser();
  const [isCompleting, setIsCompleting] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [checkedPrayers, setCheckedPrayers] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const prayerLinks = userProfile?.prayerLinks || [];

  useEffect(() => {
    if (!isOpen) {
      setIsCompleting(false);
      setCheckedPrayers([]);
    }
  }, [isOpen]);

  const handleComplete = () => {
    setIsCompleting(true);
    onDisciplineCompleted();
    setTimeout(() => {
      onOpenChange(false);
      toast({
        title: 'Discipline Completed',
        description: 'You have completed the prayer discipline for today.',
      });
    }, 500);
  };

  const handleLinkClick = (url: string) => {
    onDisciplineCompleted();
    window.open(url, '_blank', 'noopener,noreferrer');
    onOpenChange(false);
    toast({
      title: 'Discipline Completed',
      description: 'You have completed the prayer discipline for today.',
    });
  };

  const DialogBody = () => (
    <div className="space-y-6">
      <Accordion type="single" collapsible className="w-full border rounded-2xl overflow-hidden px-4 bg-muted/20">
        <AccordionItem value="manage-links" className="border-none">
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="flex w-full flex-1 items-center justify-between py-4 text-sm font-bold uppercase tracking-widest text-muted-foreground transition-all hover:text-primary [&[data-state=open]>svg]:rotate-180">
              Manage Prayer Links
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionContent>
            <p className="text-xs text-muted-foreground mt-1 mb-4 italic">
              Add, edit, or remove personal links to prayer meetings.
            </p>
            {user && userProfile && (
              <PrayerLinksSettingsCard userProfile={userProfile} userId={user.uid} />
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="rounded-3xl border shadow-sm">
        <CardHeader className="pb-3 px-6 pt-6">
          <CardTitle className="text-xl font-black font-headline">Prayer Focus</CardTitle>
          <CardDescription className="text-sm font-medium">Lifting up needs before the Throne of Grace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-6">
          <div className="space-y-px">
            {prayerPoints.map((point, i) => (
              <Accordion type="single" collapsible className="w-full" key={i}>
                <AccordionItem value={`item-${i}`} className="border-b last:border-0 border-muted/50">
                  <AccordionPrimitive.Header className="flex w-full items-center justify-between py-4 font-medium">
                     <div className="flex items-center gap-4">
                        <Checkbox
                          id={`prayer-${point.label}`}
                          checked={checkedPrayers.includes(point.label)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCheckedPrayers((prev) => [...prev, point.label]);
                            } else {
                              setCheckedPrayers((prev) =>
                                prev.filter((p) => p !== point.label)
                              );
                            }
                          }}
                          className="h-5 w-5 rounded-md"
                        />
                        <label htmlFor={`prayer-${point.label}`} className="cursor-pointer font-bold text-sm sm:text-base leading-tight">
                            {point.label}
                        </label>
                    </div>
                     <AccordionPrimitive.Trigger className={cn("transition-transform duration-200 text-muted-foreground hover:text-primary [&[data-state=open]>svg]:rotate-180 p-2")}>
                        <ChevronDown className="h-4 w-4" />
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <AccordionContent>
                    <div className="pt-2 pb-6 space-y-4 px-1">
                      <p className="text-sm text-muted-foreground leading-relaxed font-medium">{point.prayer}</p>
                      <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 relative">
                        <span className="absolute top-2 left-4 text-primary/20 font-black text-4xl leading-none">"</span>
                        <p className="italic text-sm text-foreground/80 leading-relaxed">
                            {point.text}
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary text-right mt-3">- {point.verse}</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ))}
          </div>

          {prayerLinks.length > 0 && (
            <div className="space-y-4 pt-6 border-t mt-4">
              <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">
                JOIN A PRAYER STREAM
              </h4>
              <div className="space-y-3">
                {prayerLinks.map((link, index) => (
                  <Button
                    key={index}
                    variant="secondary"
                    className="w-full justify-start h-12 rounded-2xl px-5 font-bold transition-transform active:scale-95"
                    onClick={() => handleLinkClick(link.url)}
                    disabled={isCompleting}
                  >
                    <PlayCircle className="mr-3 h-5 w-5 text-primary" />
                    <span className="truncate">{link.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const titleText = "Secret Place";
  const descText = "Communing with the Father in the secret place.";

  if (!mounted) return null;

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent
          className="p-0 flex flex-col h-[95dvh] rounded-t-[2.5rem]"
        >
          <div className="p-8 border-b flex-shrink-0 bg-muted/10">
            <DrawerHeader className="text-left">
                <div className="flex items-center gap-3 mb-1">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-primary fill-current" />
                    </div>
                    <DrawerTitle className="text-2xl font-black font-headline">{titleText}</DrawerTitle>
                </div>
                <DrawerDescription className="text-sm font-medium">
                {descText}
                </DrawerDescription>
            </DrawerHeader>
          </div>
          <ScrollArea className="flex-grow px-8">
            <div className="py-6">
              <DialogBody />
            </div>
          </ScrollArea>
          <div className="p-8 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm">
            <Button
              onClick={handleComplete}
              disabled={isCompleting || checkedPrayers.length < prayerPoints.length}
              size="lg"
              className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20"
            >
              {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              MARK AS PRAYED
            </Button>
            <p className="text-[10px] text-center text-muted-foreground mt-4 font-medium tracking-wide">
                Complete all {prayerPoints.length} focus points to mark as finished.
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl flex flex-col h-[85vh] max-h-[85vh] p-0 overflow-hidden">
        <div className="p-6 border-b shrink-0">
            <DialogHeader>
                <DialogTitle>{titleText}</DialogTitle>
                <DialogDescription>{descText}</DialogDescription>
            </DialogHeader>
        </div>
        <ScrollArea className="flex-1 min-h-0 px-6">
            <div className="py-6">
                <DialogBody />
            </div>
        </ScrollArea>
        <div className="flex-shrink-0 p-6 border-t">
          <Button
            onClick={handleComplete}
            disabled={isCompleting || checkedPrayers.length < prayerPoints.length}
            className="w-full h-12 font-bold text-lg"
          >
            {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mark as Prayed
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
