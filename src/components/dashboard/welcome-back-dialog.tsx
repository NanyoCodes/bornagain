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
import { Newspaper, UserPlus, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent } from '../ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useState } from 'react';

type WelcomeBackDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  summaryData: {
    newTestimoniesCount: number;
    soulsWonCount: number;
    recentDisciplines: { date: string; completed: boolean }[];
  } | null;
};

export function WelcomeBackDialog({ isOpen, onClose, userProfile, summaryData }: WelcomeBackDialogProps) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const lastActiveDate = userProfile.lastActive?.toDate();
  const lastActiveString = lastActiveDate ? `on ${format(lastActiveDate, 'PPP')}` : 'a while ago';

  const body = summaryData ? (
    <div className="space-y-4 py-4">
        <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 text-primary p-3 rounded-lg">
                        <Newspaper className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-semibold">{summaryData?.newTestimoniesCount ?? 0} New Testimonies</p>
                        <p className="text-sm text-muted-foreground">From the community.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
        <Card className="border-chart-2/20 bg-chart-2/5">
            <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                    <div className="bg-chart-2/10 text-chart-2 p-3 rounded-lg">
                        <UserPlus className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-semibold">{summaryData?.soulsWonCount ?? 0} Souls Won</p>
                        <p className="text-sm text-muted-foreground">Tracked by you.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
        <Card>
                <CardContent className="p-4">
                <div className="flex items-center gap-4 mb-4">
                    <div className="bg-muted text-muted-foreground p-3 rounded-lg">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-semibold">Recent Discipline</p>
                        <p className="text-sm text-muted-foreground">The last 3 days.</p>
                    </div>
                </div>
                <div className="space-y-2">
                    {summaryData?.recentDisciplines && summaryData.recentDisciplines.length > 0 ? summaryData.recentDisciplines.map(item => (
                        <div key={item.date} className="flex items-center justify-between text-sm px-2">
                            <p>{item.date}</p>
                            {item.completed ? 
                                <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                                <XCircle className="h-5 w-5 text-destructive/50" />
                            }
                        </div>
                    )) : (
                        <p className="text-sm text-center text-muted-foreground py-2">No discipline logged recently.</p>
                    )}
                </div>
                </CardContent>
        </Card>
    </div>
  ) : null;

  const footer = (
    <Button type="button" onClick={onClose} size="lg" className="w-full font-semibold">
        Continue to Dashboard
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="h-auto max-h-[90dvh] flex flex-col p-0">
          <div className="p-6 border-b flex-shrink-0">
            <SheetHeader className="text-left">
              <SheetTitle className="font-headline text-2xl">Welcome Back, {userProfile.firstName}!</SheetTitle>
              <SheetDescription>You were last here {lastActiveString}.</SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-grow overflow-y-auto px-6">
            {body}
          </div>
          <div className="p-6 border-t flex-shrink-0">
            {footer}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Welcome Back, {userProfile.firstName}!</DialogTitle>
          <DialogDescription>
            You were last here {lastActiveString}. Here's a quick summary.
          </DialogDescription>
        </DialogHeader>
        {body}
        <DialogFooter>
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
