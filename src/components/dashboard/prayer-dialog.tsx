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
import { Button } from '../ui/button';
import { Loader2, Quote, PlayCircle } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { useUser } from '@/firebase';
import { PrayerLinksSettingsCard } from '../settings/prayer-links-settings-card';
import { Separator } from '../ui/separator';
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
    }
  }, [isOpen]);

  const handleComplete = () => {
    setIsCompleting(true);
    onDisciplineCompleted();
    // Add a small delay to show loader before closing
    setTimeout(() => {
        setIsCompleting(false);
        onOpenChange(false);
        toast({ title: 'Discipline Completed', description: 'You have completed the prayer discipline for today.'});
    }, 500);
  }

  const handleLinkClick = (url: string) => {
    setIsCompleting(true);
    onDisciplineCompleted();
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => {
        setIsCompleting(false);
        onOpenChange(false);
        toast({ title: 'Discipline Completed', description: 'You have completed the prayer discipline for today.'});
    }, 500);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>A Moment to Pray</DialogTitle>
          <DialogDescription>
            Take a moment to reflect, connect with God, or join a prayer stream.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 space-y-6">
            {verse && (
                <div className="space-y-4">
                    <blockquote className="relative border-l-2 pl-6 italic">
                        <Quote className="absolute -left-4 -top-2 h-6 w-6 text-muted-foreground/20" />
                        {verse.text}
                    </blockquote>
                    <p className="text-right font-semibold">- {verse.verse}</p>
                </div>
            )}

            {prayerLinks.length > 0 && (
            <div className="space-y-3">
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
        </div>
        
        <Separator />

        <div className="space-y-2 pt-2">
            <h3 className="font-semibold">Manage Prayer Links</h3>
            {user && userProfile && (
                <div className="pt-2">
                    <p className="text-sm text-muted-foreground mb-4">
                        Add or remove personal links to prayer meetings or streams (up to 5).
                    </p>
                    <PrayerLinksSettingsCard userProfile={userProfile} userId={user.uid} />
                </div>
            )}
        </div>
        
        <DialogFooter className="sm:justify-between gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCompleting}>Cancel</Button>
            <Button onClick={handleComplete} disabled={isCompleting}>
                {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark as Prayed
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
