
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
import { Newspaper, UserPlus, TrendingUp, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
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
        <Card className="rounded-3xl border-primary/20 bg-primary/5 shadow-none">
            <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 text-primary p-3 rounded-2xl">
                        <Newspaper className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-bold text-base">{summaryData.newTestimoniesCount} New Testimonies</p>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">From the global community.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
        <Card className="rounded-3xl border-chart-2/20 bg-chart-2/5 shadow-none">
            <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                    <div className="bg-chart-2/10 text-chart-2 p-3 rounded-2xl">
                        <UserPlus className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-bold text-base">{summaryData.soulsWonCount} Registered Souls</p>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">Currently in follow-up.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-none">
                <CardContent className="p-5">
                <div className="flex items-center gap-4 mb-4">
                    <div className="bg-muted text-muted-foreground p-3 rounded-2xl">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-bold text-base">Faith Consistency</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Past 3 Days</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {summaryData.recentDisciplines && summaryData.recentDisciplines.length > 0 ? summaryData.recentDisciplines.map(item => (
                        <div key={item.date} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-muted/30 border">
                            <p className="text-[10px] font-bold text-muted-foreground">{item.date}</p>
                            {item.completed ? 
                                <CheckCircle2 className="h-6 w-6 text-green-500 fill-current" /> :
                                <XCircle className="h-6 w-6 text-muted-foreground/20" />
                            }
                        </div>
                    )) : (
                        <p className="col-span-3 text-sm text-center text-muted-foreground py-2 italic">No discipline logs found.</p>
                    )}
                </div>
                </CardContent>
        </Card>
    </div>
  ) : null;

  const footer = (
    <Button type="button" onClick={onClose} size="lg" className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 uppercase tracking-widest">
        CONTINUE TO HARVEST
    </Button>
  );

  return (
    <>
      {isMobile ? (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <SheetContent side="bottom" className="h-auto max-h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
            <div className="p-8 border-b flex-shrink-0 bg-muted/10">
              <SheetHeader className="text-left">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Kingdom Welcome</span>
                </div>
                <SheetTitle className="font-black font-headline text-3xl leading-tight">Welcome Back, {userProfile.firstName}!</SheetTitle>
                <SheetDescription className="text-sm font-medium mt-1">We missed your presence in the harvest field. You were last active {lastActiveString}.</SheetDescription>
              </SheetHeader>
            </div>
            <ScrollArea className="flex-grow px-8">
              {body}
            </ScrollArea>
            <div className="p-8 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm">
              {footer}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden">
            <div className="p-6 border-b bg-muted/10">
                <DialogHeader>
                    <DialogTitle className="font-black font-headline text-2xl">Welcome Back, {userProfile.firstName}!</DialogTitle>
                    <DialogDescription className="text-sm">
                        You were last here {lastActiveString}. Here's a quick summary.
                    </DialogDescription>
                </DialogHeader>
            </div>
            <div className="px-6">
                {body}
            </div>
            <div className="p-6 border-t">
                {footer}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
