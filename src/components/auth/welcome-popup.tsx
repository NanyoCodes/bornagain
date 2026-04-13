
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Newspaper, Target, Zap, PartyPopper, UserPlus, HeartHandshake } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

type WelcomePopupProps = {
  isOpen: boolean;
  onClose: () => void;
  userName?: string | null;
};

export function WelcomePopup({ isOpen, onClose, userName }: WelcomePopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xs sm:max-w-sm p-0 grid grid-rows-[auto_1fr_auto] max-h-[90vh] sm:max-h-[80vh] overflow-hidden">
        <div className="bg-muted/40 pt-8 sm:pt-12 pb-6 sm:pb-8 px-6 sm:px-8 text-center row-start-1">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 text-primary rounded-full mx-auto flex items-center justify-center mb-4">
            <PartyPopper className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={1.5} />
          </div>
          <DialogHeader className="items-center text-center">
            <DialogTitle className="text-xl sm:text-2xl md:text-3xl font-bold font-headline">Welcome, {userName || 'User'}!</DialogTitle>
            <DialogDescription className="text-balance pt-2 text-sm sm:text-base">
              You've joined a global movement. Here’s how you can get started.
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="row-start-2 overflow-y-auto">
            <div className="px-6 sm:px-8 py-6 space-y-6">
                <div className="space-y-4 text-sm">

                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0 mt-1">
                            <Zap className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-semibold">Complete Your Daily Disciplines</h4>
                            <p className="text-muted-foreground">Start each day strong by praying, reading the Bible, and logging your church attendance.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0 mt-1">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-semibold">Track Your Evangelism</h4>
                            <p className="text-muted-foreground">Log the souls you win for Christ and use our tools to follow up and nurture their new faith.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0 mt-1">
                            <Target className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-semibold">Join or Create Campaigns</h4>
                            <p className="text-muted-foreground">Organize or participate in local and global soul-winning campaigns to make a collective impact.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0 mt-1">
                        <Newspaper className="h-5 w-5" />
                        </div>
                        <div>
                        <h4 className="font-semibold">Share & Pray</h4>
                        <p className="text-muted-foreground">Encourage the community by sharing your testimony and lift up others by praying for their needs.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0 mt-1">
                        <HeartHandshake className="h-5 w-5" />
                        </div>
                        <div>
                        <h4 className="font-semibold">Find a Partner</h4>
                        <p className="text-muted-foreground">Connect with an accountability partner to stay motivated and grow together in your spiritual journey.</p>
                        </div>
                    </div>

                </div>
            </div>
        </ScrollArea>
        <DialogFooter className="sm:justify-center p-6 row-start-3 border-t flex-shrink-0">
            <Button type="button" onClick={onClose} size="lg" className="w-full">
                Let's Go!
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
