'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Loader2, PlayCircle, ChevronDown, Zap, HandHeart, UserPlus, BookMarked, Edit, Church, HeartHandshake, X } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { useUser } from '@/firebase';
import { PrayerLinksSettingsCard } from '../settings/prayer-links-settings-card';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from '../ui/accordion';
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

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
    actionId: 'souls',
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
    actionId: 'partners',
  },
];

interface DialogBodyProps {
  userProfile: UserProfile | null;
  checkedPrayers: string[];
  setCheckedPrayers: React.Dispatch<React.SetStateAction<string[]>>;
  handleLinkClick: (url: string) => void;
  isCompleting: boolean;
  onOpenSouls?: () => void;
  onOpenNotes?: () => void;
  onOpenChurch?: () => void;
  onOpenBible?: () => void;
  onOpenChange: (open: boolean) => void;
}

function DialogBody({ 
  userProfile, 
  checkedPrayers, 
  setCheckedPrayers, 
  handleLinkClick, 
  isCompleting,
  onOpenSouls,
  onOpenNotes,
  onOpenChurch,
  onOpenBible,
  onOpenChange
}: DialogBodyProps) {
  const { user } = useUser();
  const prayerLinks = userProfile?.prayerLinks || [];

  return (
    <div className="space-y-6 text-left">
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

      <Card className="rounded-3xl border shadow-sm text-left">
        <CardHeader className="pb-3 px-6 pt-6">
          <CardTitle className="text-xl font-black font-headline text-left">Prayer Focus</CardTitle>
          <CardDescription className="text-sm font-medium text-left">Lifting up needs before the Throne of Grace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-6 text-left">
          <div className="space-y-px text-left">
            {prayerPoints.map((point, i) => (
              <Accordion type="single" collapsible className="w-full" key={i}>
                <AccordionItem value={`item-${i}`} className="border-b last:border-0 border-muted/50 text-left">
                  <AccordionPrimitive.Header className="flex w-full items-center justify-between py-4 font-medium">
                     <div className="flex items-center gap-4 text-left">
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
                        <label htmlFor={`prayer-${point.label}`} className="cursor-pointer font-bold text-sm sm:text-base leading-tight text-left">
                            {point.label}
                        </label>
                    </div>
                     <AccordionPrimitive.Trigger className={cn("transition-transform duration-200 text-muted-foreground hover:text-primary [&[data-state=open]>svg]:rotate-180 p-2")}>
                        <ChevronDown className="h-4 w-4" />
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <AccordionContent className="text-left">
                    <div className="pt-2 pb-6 space-y-4 px-1 text-left">
                      <p className="text-sm text-muted-foreground leading-relaxed font-medium text-left">{point.prayer}</p>
                      
                      {point.actionId === 'souls' && onOpenSouls && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 rounded-xl font-black uppercase text-[10px] tracking-widest border-primary/20 text-primary hover:bg-primary/5"
                            onClick={onOpenSouls}
                        >
                            <UserPlus className="mr-2 h-3.5 w-3.5" />
                            Log Soul Won
                        </Button>
                      )}

                      {point.label === 'Loved Ones' && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            asChild
                            className="h-9 rounded-xl font-black uppercase text-[10px] tracking-widest border-primary/20 text-primary hover:bg-primary/5"
                        >
                            <a href="/accountability" onClick={() => onOpenChange(false)}>
                                <HeartHandshake className="mr-2 h-3.5 w-3.5" />
                                Check Partners
                            </a>
                        </Button>
                      )}

                      <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 relative text-left">
                        <span className="absolute top-2 left-4 text-primary/20 font-black text-4xl leading-none text-left">"</span>
                        <p className="italic text-sm text-foreground/80 leading-relaxed text-left">
                            {point.text}
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary text-right mt-3 text-right">- {point.verse}</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ))}
          </div>

          <div className="pt-6 border-t mt-4 space-y-4 text-left">
            <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1 text-left text-left">
                KINGDOM HUB
            </h4>
            <div className="grid grid-cols-2 gap-3 text-left">
                <Button variant="outline" className="h-14 rounded-2xl flex flex-col gap-1 items-center justify-center p-2 group transition-all hover:border-primary/40 text-left" onClick={onOpenSouls}>
                    <UserPlus className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Log Soul</span>
                </Button>
                <Button variant="outline" className="h-14 rounded-2xl flex flex-col gap-1 items-center justify-center p-2 group transition-all hover:border-primary/40 text-left" onClick={onOpenBible}>
                    <BookMarked className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Study Word</span>
                </Button>
                <Button variant="outline" className="h-14 rounded-2xl flex flex-col gap-1 items-center justify-center p-2 group transition-all hover:border-primary/40 text-left" onClick={onOpenNotes}>
                    <Edit className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Journal</span>
                </Button>
                <Button variant="outline" className="h-14 rounded-2xl flex flex-col gap-1 items-center justify-center p-2 group transition-all hover:border-primary/40 text-left" onClick={onOpenChurch}>
                    <Church className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Attend</span>
                </Button>
            </div>
          </div>

          {prayerLinks.length > 0 && (
            <div className="space-y-4 pt-6 border-t mt-4 text-left">
              <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1 text-left">
                JOIN A PRAYER STREAM
              </h4>
              <div className="space-y-3 text-left">
                {prayerLinks.map((link, index) => (
                  <Button
                    key={index}
                    variant="secondary"
                    className="w-full justify-start h-12 rounded-2xl px-5 font-bold transition-transform active:scale-95 text-left"
                    onClick={() => handleLinkClick(link.url)}
                    disabled={isCompleting}
                  >
                    <PlayCircle className="mr-3 h-5 w-5 text-primary text-left" />
                    <span className="truncate text-left">{link.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function PrayerDialog({
  isOpen,
  onOpenChange,
  onDisciplineCompleted,
  userProfile,
  onOpenSouls,
  onOpenNotes,
  onOpenChurch,
  onOpenBible,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDisciplineCompleted: () => void;
  userProfile: UserProfile | null;
  onOpenSouls?: () => void;
  onOpenNotes?: () => void;
  onOpenChurch?: () => void;
  onOpenBible?: () => void;
}) {
  const [isCompleting, setIsCompleting] = useState(false);
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [checkedPrayers, setCheckedPrayers] = useState<string[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsCompleting(false);
      setCheckedPrayers([]);
    }
  }, [isOpen]);

  const handleComplete = () => {
    setIsCompleting(true);
    onDisciplineCompleted();
    onOpenChange(false);
    toast({
      title: 'Discipline Completed',
      description: 'You have completed the prayer discipline for today.',
    });
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

  const titleText = "Secret Place";
  const descText = "Communing with the Father in the secret place.";

  if (!mounted) return null;

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent
          className="p-0 flex flex-col h-[95dvh] rounded-t-[2.5rem] text-left"
        >
          <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
            <DrawerHeader className="text-left p-0 text-left">
                <div className="flex items-center gap-3 mb-1 text-left">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-left">
                        <Zap className="h-5 w-5 text-primary fill-current text-left" />
                    </div>
                    <DrawerTitle className="text-2xl font-black font-headline text-left">{titleText}</DrawerTitle>
                </div>
                <DrawerDescription className="text-sm font-medium text-left">
                {descText}
                </DrawerDescription>
            </DrawerHeader>
          </div>
          <ScrollArea className="flex-grow px-8 text-left">
            <div className="py-6 text-left">
              <DialogBody 
                userProfile={userProfile}
                checkedPrayers={checkedPrayers}
                setCheckedPrayers={setCheckedPrayers}
                handleLinkClick={handleLinkClick}
                isCompleting={isCompleting}
                onOpenSouls={() => { onOpenChange(false); onOpenSouls?.(); }}
                onOpenNotes={() => { onOpenChange(false); onOpenNotes?.(); }}
                onOpenChurch={() => { onOpenChange(false); onOpenChurch?.(); }}
                onOpenBible={() => { onOpenChange(false); onOpenBible?.(); }}
                onOpenChange={onOpenChange}
              />
            </div>
          </ScrollArea>
          <div className="p-8 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm text-left">
            <Button
              onClick={handleComplete}
              disabled={isCompleting || checkedPrayers.length < prayerPoints.length}
              size="lg"
              className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 text-center"
            >
              {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}
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
      <DialogContent className="sm:max-w-xl flex flex-col h-[85vh] max-h-[85vh] p-0 overflow-hidden text-left">
        <div className="p-6 border-b shrink-0 text-left">
            <DialogHeader className="text-left text-left">
                <DialogTitle className="text-left text-left">{titleText}</DialogTitle>
                <DialogDescription className="text-left text-left">{descText}</DialogDescription>
            </DialogHeader>
        </div>
        <ScrollArea className="flex-1 min-h-0 px-6 text-left">
            <div className="py-6 text-left">
              <DialogBody 
                userProfile={userProfile}
                checkedPrayers={checkedPrayers}
                setCheckedPrayers={setCheckedPrayers}
                handleLinkClick={handleLinkClick}
                isCompleting={isCompleting}
                onOpenSouls={() => { onOpenChange(false); onOpenSouls?.(); }}
                onOpenNotes={() => { onOpenChange(false); onOpenNotes?.(); }}
                onOpenChurch={() => { onOpenChange(false); onOpenChurch?.(); }}
                onOpenBible={() => { onOpenChange(false); onOpenBible?.(); }}
                onOpenChange={onOpenChange}
              />
            </div>
        </ScrollArea>
        <div className="flex-shrink-0 p-6 border-t text-left">
          <Button
            onClick={handleComplete}
            disabled={isCompleting || checkedPrayers.length < prayerPoints.length}
            className="w-full h-12 font-bold text-lg text-center"
          >
            {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}
            Mark as Prayed
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}