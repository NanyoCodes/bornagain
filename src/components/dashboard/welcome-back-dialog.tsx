
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
import { Newspaper, UserPlus, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent } from '../ui/card';

type WelcomeBackDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  summaryData: {
    newTestimoniesCount: number;
    soulsWonCount: number;
    recentDisciplines: { date: string; completed: boolean }[];
  };
};

export function WelcomeBackDialog({ isOpen, onClose, userProfile, summaryData }: WelcomeBackDialogProps) {

  const lastActiveDate = userProfile.lastActive?.toDate();
  const lastActiveString = lastActiveDate ? formatDistanceToNowStrict(lastActiveDate, { addSuffix: true }) : 'a while ago';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Welcome Back, {userProfile.displayName}!</DialogTitle>
          <DialogDescription>
            You were last here {lastActiveString}. Here's a quick summary.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <Card>
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 text-primary p-3 rounded-lg">
                           <Newspaper className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="font-semibold">{summaryData.newTestimoniesCount} New Testimonies</p>
                            <p className="text-sm text-muted-foreground">From the community.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardContent className="p-4 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="bg-primary/10 text-primary p-3 rounded-lg">
                           <UserPlus className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="font-semibold">{summaryData.soulsWonCount} Souls Won</p>
                            <p className="text-sm text-muted-foreground">Tracked by you.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                 <CardContent className="p-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-primary/10 text-primary p-3 rounded-lg">
                           <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="font-semibold">Your Recent Discipline</p>
                            <p className="text-sm text-muted-foreground">The last 3 days.</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {summaryData.recentDisciplines.length > 0 ? summaryData.recentDisciplines.map(item => (
                            <div key={item.date} className="flex items-center justify-between text-sm">
                                <p>{item.date}</p>
                                {item.completed ? 
                                    <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                                    <XCircle className="h-5 w-5 text-destructive" />
                                }
                            </div>
                        )) : (
                            <p className="text-sm text-center text-muted-foreground py-2">No discipline logged recently.</p>
                        )}
                    </div>
                 </CardContent>
            </Card>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose} className="w-full">
            Continue to Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
