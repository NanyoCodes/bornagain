
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '../ui/button';
import { Loader2, Quote, PlayCircle } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { useUser } from '@/firebase';
import { PrayerLinksSettingsCard } from '../settings/prayer-links-settings-card';
import { useToast } from '@/hooks/use-toast';

const prayerVerses = [
    { verse: "Philippians 4:6-7", text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus." },
    { verse: "Jeremiah 29:12", text: "Then you will call on me and come and pray to me, and I will listen to you." },
    { verse: "Matthew 6:6", text: "But when you pray, go into your room, close the door and pray to your Father, who is unseen. Then your Father, who sees what is done in secret, will reward you." },
    { verse: "1 Thessalonians 5:16-18", text: "Rejoice always, pray continually, give thanks in all circumstances; for this is God’s will for you in Christ Jesus." },
    { verse: "Mark 11:24", text: "Therefore I tell you, whatever you ask for in prayer, believe that you have received it, and it will be yours." },
    { verse: "James 5:16", text: "Therefore confess your sins to each other and pray for each other so that you may be healed. The prayer of a righteous person is powerful and effective." }
];

export function PrayerDialog({ isOpen, onOpenChange, onDisciplineCompleted, userProfile }: { isOpen: boolean; onOpenChange: (open: boolean) => void; onDisciplineCompleted: () => void; userProfile: UserProfile | null; }) {
  const { user } = useUser();
  const [verse, setVerse] = useState<{ verse: string; text: string; } | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const { toast } = useToast();

  const prayerLinks = userProfile?.prayerLinks || [];

  useEffect(() => {
    if (isOpen) {
      // Select a random verse when the dialog opens
      const randomIndex = Math.floor(Math.random() * prayerVerses.length);
      setVerse(prayerVerses[randomIndex]);
    } else {
        // Reset state on close to avoid flicker on reopen
        setIsCompleting(false);
    }
  }, [isOpen]);

  const handleComplete = () => {
    setIsCompleting(true);
    onDisciplineCompleted();
    // Add a small delay to show loader before closing
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>A Moment to Pray</DialogTitle>
          <DialogDescription>
            Reflect on the Word, join a prayer stream, or manage your links.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="pray" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pray">Pray</TabsTrigger>
                <TabsTrigger value="manage">Manage Links</TabsTrigger>
            </TabsList>
            <TabsContent value="pray" className="mt-4">
                <Card>
                    <CardContent className="p-6 space-y-6">
                        {verse && (
                            <div className="space-y-4">
                                <blockquote className="relative border-l-2 pl-6 italic text-muted-foreground">
                                    <Quote className="absolute -left-4 -top-2 h-6 w-6 text-muted-foreground/20" />
                                    {verse.text}
                                </blockquote>
                                <p className="text-right font-semibold">- {verse.verse}</p>
                            </div>
                        )}

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
                    <DialogFooter className="p-6 pt-0">
                         <Button onClick={handleComplete} disabled={isCompleting} className="w-full">
                            {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Mark as Prayed
                        </Button>
                    </DialogFooter>
                </Card>
            </TabsContent>
            <TabsContent value="manage" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Manage Prayer Links</CardTitle>
                        <CardDescription>Add, edit, or remove personal links to prayer meetings (up to 5).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {user && userProfile && (
                            <PrayerLinksSettingsCard userProfile={userProfile} userId={user.uid} />
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

      </DialogContent>
    </Dialog>
  );
}
