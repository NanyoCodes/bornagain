
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
import { Loader2, Quote } from 'lucide-react';

const prayerVerses = [
    { verse: "Philippians 4:6-7", text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus." },
    { verse: "Jeremiah 29:12", text: "Then you will call on me and come and pray to me, and I will listen to you." },
    { verse: "Matthew 6:6", text: "But when you pray, go into your room, close the door and pray to your Father, who is unseen. Then your Father, who sees what is done in secret, will reward you." },
    { verse: "1 Thessalonians 5:16-18", text: "Rejoice always, pray continually, give thanks in all circumstances; for this is God’s will for you in Christ Jesus." },
    { verse: "Mark 11:24", text: "Therefore I tell you, whatever you ask for in prayer, believe that you have received it, and it will be yours." },
    { verse: "James 5:16", text: "Therefore confess your sins to each other and pray for each other so that you may be healed. The prayer of a righteous person is powerful and effective." }
];

export function PrayerDialog({ isOpen, onOpenChange, onDisciplineCompleted }: { isOpen: boolean; onOpenChange: (open: boolean) => void; onDisciplineCompleted: () => void; }) {
  const [verse, setVerse] = useState<{ verse: string; text: string; } | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

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
    }, 500);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>A Moment to Pray</DialogTitle>
          <DialogDescription>
            Take a moment to reflect and connect with God.
          </DialogDescription>
        </DialogHeader>

        {verse && (
            <div className="my-4 space-y-4">
                 <blockquote className="relative border-l-2 pl-6 italic">
                    <Quote className="absolute -left-4 -top-2 h-6 w-6 text-muted-foreground/20" />
                    {verse.text}
                </blockquote>
                <p className="text-right font-semibold">- {verse.verse}</p>
            </div>
        )}
        
        <DialogFooter>
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
