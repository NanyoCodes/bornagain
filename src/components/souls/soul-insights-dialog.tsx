'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Loader2, Lightbulb, MessageSquare, ListChecks, Clipboard, ChevronRight } from 'lucide-react';
import { type Soul } from '@/lib/types';
import { generateFollowUpInsights, type FollowUpInsightsOutput } from '@/ai/flows/generate-follow-up-insights';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn, safeToDate } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '../ui/scroll-area';

function formatHistory(soul: Soul): string {
  const wonAtDate = safeToDate(soul.wonAt);
  if (!wonAtDate) {
    return "No interactions logged yet.";
  }

  if (!soul.followUpLog || soul.followUpLog.length === 0) {
    return `No interactions logged since they were won ${formatDistanceToNow(wonAtDate, { addSuffix: true })}.`;
  }
  const latestLog = [...soul.followUpLog].sort((a, b) => (safeToDate(b.date)?.getTime() ?? 0) - (safeToDate(a.date)?.getTime() ?? 0))[0];
  const logDate = safeToDate(latestLog.date);
  if (!logDate) {
    return `No interactions logged since they were won ${formatDistanceToNow(wonAtDate, { addSuffix: true })}.`;
  }
  
  let history = `Last interaction was ${formatDistanceToNow(logDate, { addSuffix: true })}.`;
  if (latestLog.note) {
    history += ` Note: "${latestLog.note}"`;
  }
  if (latestLog.actions && latestLog.actions.length > 0) {
    history += ` Actions taken: ${latestLog.actions.join(', ')}.`;
  }
  return history;
}

export function SoulInsightsDialog({ soul, children }: { soul: Soul, children: React.ReactNode }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<FollowUpInsightsOutput | null>(null);
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setInsights(null);
    try {
      const result = await generateFollowUpInsights({
        firstName: soul.firstName,
        status: soul.status,
        followUpHistory: formatHistory(soul),
        attendingChurch: soul.attendingChurch || false,
        inBibleStudy: soul.inBibleStudy || false,
        hasAppAccount: !!soul.email,
      });
      setInsights(result);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to generate insights',
        description: 'The AI assistant could not be reached. Please try again.',
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      handleGenerateInsights();
    } else {
      setInsights(null);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
  };

  const titleText = `Follow-up Insights: ${soul.firstName}`;
  const descText = `AI-powered suggestions for your next steps with ${soul.firstName}.`;

  const bodyContent = (
    <ScrollArea className={cn("pr-4", isMobile ? "h-full" : "max-h-[60vh]")}>
        {!insights || isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">AI is generating insights...</p>
          </div>
        ) : (
          <div className="space-y-6 pb-6">
            <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider text-primary"><Lightbulb className="h-4 w-4" /> Key Insight</h3>
                <p className="text-muted-foreground text-sm italic border-l-4 border-primary/20 pl-4 py-2 bg-primary/5 rounded-r-lg">
                    &ldquo;{insights.keyInsight}&rdquo;
                </p>
            </div>
             <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider text-primary"><ListChecks className="h-4 w-4" /> Suggested Next Steps</h3>
                <ul className="space-y-2">
                    {insights.suggestedNextSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                            <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>{step}</span>
                        </li>
                    ))}
                </ul>
            </div>
             <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider text-primary"><MessageSquare className="h-4 w-4" /> Suggested Message</h3>
                <div className="relative rounded-md border p-4 bg-muted/30 text-sm text-muted-foreground group">
                     <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(insights.suggestedMessage)}
                     >
                        <Clipboard className="h-4 w-4" />
                    </Button>
                    <p className="whitespace-pre-wrap italic">
                        &ldquo;{insights.suggestedMessage}&rdquo;
                    </p>
                </div>
                <p className="text-[10px] text-center text-muted-foreground italic">Tip: Personalize this message before sending.</p>
            </div>
          </div>
        )}
    </ScrollArea>
  );

  if (!mounted) return <>{children}</>;

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0">
          <div className="p-6 border-b flex-shrink-0">
            <SheetHeader className="text-left flex-shrink-0">
              <SheetTitle>{titleText}</SheetTitle>
              <SheetDescription>{descText}</SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-grow min-h-0 pt-6 px-6">
            {bodyContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
          <DialogDescription>{descText}</DialogDescription>
        </DialogHeader>
        {bodyContent}
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}