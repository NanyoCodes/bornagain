
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
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Lightbulb, MessageSquare, ListChecks, Clipboard } from 'lucide-react';
import { type Soul } from '@/lib/types';
import { generateFollowUpInsights, type FollowUpInsightsOutput } from '@/ai/flows/generate-follow-up-insights';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { safeToDate } from '@/lib/utils';

function formatHistory(soul: Soul): string {
  const wonAtDate = safeToDate(soul.wonAt);
  if (!wonAtDate) {
    return "No interactions logged yet.";
  }

  if (!soul.followUpLog || soul.followUpLog.length === 0) {
    return `No interactions logged since they were won ${formatDistanceToNow(wonAtDate, { addSuffix: true })}.`;
  }
  const latestLog = [...soul.followUpLog].sort((a, b) => b.date.seconds - a.date.seconds)[0];
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
      // Reset state when dialog closes to ensure a fresh load next time
      setInsights(null);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Follow-up Insights for {soul.firstName}</DialogTitle>
          <DialogDescription>
            Get AI-powered suggestions for your next steps with {soul.firstName}.
          </DialogDescription>
        </DialogHeader>

        {!insights || isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">AI is generating insights...</p>
          </div>
        ) : (
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2 text-sm"><Lightbulb className="h-4 w-4 text-primary" /> Key Insight</h3>
                <p className="text-muted-foreground text-sm italic border-l-2 pl-4 py-1">
                    {insights.keyInsight}
                </p>
            </div>
             <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2 text-sm"><ListChecks className="h-4 w-4 text-primary" /> Suggested Next Steps</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                    {insights.suggestedNextSteps.map((step, i) => <li key={i}>{step}</li>)}
                </ul>
            </div>
             <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4 text-primary" /> Suggested Message</h3>
                <div className="relative rounded-md border p-4 bg-muted/50 text-sm text-muted-foreground">
                     <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={() => copyToClipboard(insights.suggestedMessage)}
                     >
                        <Clipboard className="h-4 w-4" />
                    </Button>
                    <p className="whitespace-pre-wrap italic">
                        {insights.suggestedMessage}
                    </p>
                </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
