'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '../ui/button';

const scripture = {
    book: "John",
    chapter: 1,
    verses: [
        { verse: 1, text: "In the beginning was the Word, and the Word was with God, and the Word was God." },
        { verse: 2, text: "He was in the beginning with God." },
        { verse: 3, text: "All things were made through him, and without him was not any thing made that was made." },
        { verse: 4, text: "In him was life, and the life was the light of men." },
        { verse: 5, text: "The light shines in the darkness, and the darkness has not overcome it." },
        { verse: 6, text: "There was a man sent from God, whose name was John." },
        { verse: 7, text: "He came as a witness, to bear witness about the light, that all might believe through him." },
        { verse: 8, text: "He was not the light, but came to bear witness about the light." },
        { verse: 9, text: "The true light, which gives light to everyone, was coming into the world." },
        { verse: 10, text: "He was in the world, and the world was made through him, yet the world did not know him." },
        { verse: 11, text: "He came to his own, and his own people did not receive him." },
        { verse: 12, text: "But to all who did receive him, who believed in his name, he gave the right to become children of God," },
        { verse: 13, text: "who were born, not of blood nor of the will of the flesh nor of the will of man, but of God." },
        { verse: 14, text: "And the Word became flesh and dwelt among us, and we have seen his glory, glory as of the only Son from the Father, full of grace and truth." },
    ]
};


export function BibleDialog({ isOpen, onOpenChange, onMarkAsRead }: { isOpen: boolean; onOpenChange: (open: boolean) => void; onMarkAsRead: () => void; }) {
  
  const handleMarkAsRead = () => {
    onMarkAsRead();
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Read the Bible</DialogTitle>
          <DialogDescription>
            {scripture.book} Chapter {scripture.chapter}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 text-lg leading-relaxed font-serif">
                {scripture.verses.map(v => (
                    <p key={v.verse}>
                        <sup className="text-sm font-sans text-muted-foreground mr-2">{v.verse}</sup>
                        {v.text}
                    </p>
                ))}
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={handleMarkAsRead}>Mark as Read</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
