
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
import { Newspaper, Target, LayoutDashboard, PartyPopper } from 'lucide-react';

type WelcomePopupProps = {
  isOpen: boolean;
  onClose: () => void;
  userName?: string | null;
};

export function WelcomePopup({ isOpen, onClose, userName }: WelcomePopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <div className="bg-muted/40 pt-12 pb-8 px-8 text-center">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full mx-auto flex items-center justify-center mb-4">
            <PartyPopper className="h-10 w-10" strokeWidth={1.5} />
          </div>
          <DialogHeader className="items-center text-center">
            <DialogTitle className="text-3xl font-bold font-headline">Welcome, {userName || 'User'}!</DialogTitle>
            <DialogDescription className="text-balance pt-2 text-base">
              You're now part of a global community of believers.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-8 pb-8 space-y-6">
            <div className="text-left pt-6">
                <h3 className="font-semibold mb-4 text-center">Here are a few things to get you started:</h3>
            </div>
            
            <div className="space-y-3 text-sm">
                <div className="flex items-center gap-4 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0">
                        <Newspaper className="h-5 w-5" />
                    </div>
                    <span>Share your testimony to encourage others.</span>
                </div>
                 <div className="flex items-center gap-4 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0">
                      <Target className="h-5 w-5" />
                    </div>
                    <span>Join or create a soul-winning campaign.</span>
                </div>
                 <div className="flex items-center gap-4 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0">
                      <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <span>Explore your dashboard to track your progress.</span>
                </div>
            </div>

            <DialogFooter className="sm:justify-center pt-4">
              <Button type="button" onClick={onClose} size="lg" className="w-full">
                  Let's Go!
              </Button>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
