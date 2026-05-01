'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Newspaper, Target, Zap, PartyPopper, UserPlus, HeartHandshake, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useState } from 'react';

type WelcomePopupProps = {
  isOpen: boolean;
  onClose: () => void;
  userName?: string | null;
};

export function WelcomePopup({ isOpen, onClose, userName }: WelcomePopupProps) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const title = `Welcome, ${userName || 'friend'}!`;
  const desc = "You've joined a global movement. Here's how you can get started.";

  const body = (
    <div className="space-y-6 py-2">
        <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0 mt-1">
                <Zap className="h-5 w-5" />
            </div>
            <div>
                <h4 className="font-semibold text-sm sm:text-base">Complete Your Daily Disciplines</h4>
                <p className="text-muted-foreground text-xs sm:text-sm">Start each day strong by praying, reading the Bible, and logging your church attendance.</p>
            </div>
        </div>

        <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-chart-2/10 text-chart-2 rounded-md flex items-center justify-center shrink-0 mt-1">
                <UserPlus className="h-5 w-5" />
            </div>
            <div>
                <h4 className="font-semibold text-sm sm:text-base">Track Your Evangelism</h4>
                <p className="text-muted-foreground text-xs sm:text-sm">Log the souls you win for Christ and use our tools to follow up and nurture their new faith.</p>
            </div>
        </div>

        <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-chart-4/10 text-chart-4 rounded-md flex items-center justify-center shrink-0 mt-1">
                <Target className="h-5 w-5" />
            </div>
            <div>
                <h4 className="font-semibold text-sm sm:text-base">Join or Create Campaigns</h4>
                <p className="text-muted-foreground text-xs sm:text-sm">Organize or participate in local and global soul-winning campaigns to make a collective impact.</p>
            </div>
        </div>
        
        <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-chart-3/10 text-chart-3 rounded-md flex items-center justify-center shrink-0 mt-1">
            <Newspaper className="h-5 w-5" />
            </div>
            <div>
            <h4 className="font-semibold text-sm sm:text-base">Share & Pray</h4>
            <p className="text-muted-foreground text-xs sm:text-sm">Encourage the community by sharing your testimony and lift up others by praying for their needs.</p>
            </div>
        </div>
        
        <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0 mt-1">
            <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
            <h4 className="font-semibold text-sm sm:text-base">Find a Partner</h4>
            <p className="text-muted-foreground text-xs sm:text-sm">Connect with an accountability partner to stay motivated and grow together in your spiritual journey.</p>
            </div>
        </div>
    </div>
  );

  const footer = (
    <Button type="button" onClick={onClose} size="lg" className="w-full h-12 text-lg font-bold">
        Let's Go!
    </Button>
  );

  if (!mounted) return null;

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0">
          <div className="bg-muted/40 pt-10 pb-6 px-6 text-center border-b flex-shrink-0">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full mx-auto flex items-center justify-center mb-4">
                <PartyPopper className="h-8 w-8" strokeWidth={1.5} />
            </div>
            <SheetHeader className="items-center text-center">
                <SheetTitle className="text-2xl font-bold font-headline">{title}</SheetTitle>
                <SheetDescription className="text-balance text-sm">{desc}</SheetDescription>
            </SheetHeader>
          </div>
          <ScrollArea className="flex-grow px-6 py-4">
            {body}
          </ScrollArea>
          <div className="p-6 border-t flex-shrink-0">
            {footer}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-md p-0 flex flex-col max-h-[90vh] overflow-hidden">
        <div className="bg-muted/40 pt-8 pb-6 px-8 text-center border-b flex-shrink-0">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full mx-auto flex items-center justify-center mb-4">
            <PartyPopper className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <DialogHeader className="items-center text-center">
            <DialogTitle className="text-2xl font-bold font-headline">{title}</DialogTitle>
            <DialogDescription className="text-balance text-sm">{desc}</DialogDescription>
          </DialogHeader>
        </div>
        <ScrollArea className="flex-grow px-8">
            <div className="py-6">
                {body}
            </div>
        </ScrollArea>
        <DialogFooter className="p-6 border-t flex-shrink-0">
            {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
