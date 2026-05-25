
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { type Soul } from "@/lib/types";
import { format } from "date-fns";
import { actionItems } from "@/lib/follow-up-data";
import { cn, safeToDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { History, Sparkles } from "lucide-react";

interface ViewHistoryDialogProps {
  soul: Soul | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewHistoryDialog({ soul, isOpen, onOpenChange }: ViewHistoryDialogProps) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const sortedHistory = React.useMemo(() => {
    if (!isOpen || !soul?.followUpLog || soul.followUpLog.length === 0) return [];
    return [...soul.followUpLog].sort((a, b) => {
      const dateB = safeToDate(b.date)?.getTime() ?? 0;
      const dateA = safeToDate(a.date)?.getTime() ?? 0;
      return dateB - dateA;
    });
  }, [soul, isOpen]);

  const historyContent = (
    <ScrollArea className={cn("pr-4", isMobile ? "h-full" : "max-h-[60vh]")}>
        <div className="space-y-8 pb-12">
            {sortedHistory.length > 0 ? sortedHistory.map((log, index) => {
                const logDate = safeToDate(log.date);
                return (
                <div key={index} className="relative">
                    <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                        <p className="font-black text-[10px] uppercase tracking-[0.2em] text-primary">
                           {logDate ? format(logDate, "PPP 'at' p") : 'Date not available'}
                        </p>
                        {log.memberName && (
                            <span className="text-[9px] font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border uppercase tracking-tighter truncate max-w-[120px]">
                                By {log.memberName}
                            </span>
                        )}
                    </div>
                    <div className="pl-6 border-l-4 border-primary/20 space-y-4">
                       {log.actions && log.actions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {log.actions.map(actionId => {
                                    const action = actionItems.find(a => a.id === actionId);
                                    return action ? (
                                        <Badge key={actionId} variant="secondary" className="font-bold text-[9px] px-2 h-4 uppercase tracking-tight bg-background border">{action.label}</Badge>
                                    ) : null;
                                })}
                            </div>
                        )}
                       {log.note ? (
                            <div className="bg-muted/10 rounded-2xl p-4 border border-dashed relative">
                                <span className="absolute -top-3 left-4 bg-background px-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Note</span>
                                <p className="text-sm sm:text-base text-muted-foreground italic leading-relaxed">
                                    &ldquo;{log.note}&rdquo;
                                </p>
                            </div>
                        ) : (
                             <p className="text-sm text-muted-foreground italic pl-1 opacity-60">No additional details recorded for this entry.</p>
                         )}
                    </div>
                     {index < sortedHistory.length - 1 && <Separator className="mt-8 opacity-50" />}
                </div>
            )}) : (
                <div className="text-center py-24 flex flex-col items-center">
                    <div className="h-20 w-20 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                        <History className="h-10 w-10 text-muted-foreground opacity-10" />
                    </div>
                    <p className="text-base font-bold uppercase tracking-tight text-muted-foreground/60">No history found</p>
                    <p className="text-xs mt-2 italic px-12 text-muted-foreground/50">Start logging follow-up interactions to build a spiritual journey map.</p>
                </div>
            )}
        </div>
    </ScrollArea>
  );

  if (!mounted) return null;

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
          {soul && (
            <>
              <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                <SheetHeader className="text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Spiritual Journey</span>
                  </div>
                  <SheetTitle className="text-2xl font-black font-headline leading-tight">History: {soul.firstName}</SheetTitle>
                  <SheetDescription className="text-sm font-medium">Chronological log of all Kingdom interactions.</SheetDescription>
                </SheetHeader>
              </div>
              <div className="flex-grow min-h-0 pt-8 px-8">
                {historyContent}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl flex flex-col max-h-[90vh] p-0 rounded-3xl overflow-hidden">
        {soul && (
          <>
            <div className="p-6 border-b shrink-0 bg-muted/10">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold font-headline">Follow-up History</DialogTitle>
                    <DialogDescription className="text-sm font-medium">A complete record for {soul.firstName} {soul.lastName}.</DialogDescription>
                </DialogHeader>
            </div>
            <div className="flex-grow overflow-y-auto p-6">
                {historyContent}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
