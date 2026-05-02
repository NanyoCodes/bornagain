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
        <div className="space-y-6 pb-6">
            {sortedHistory.length > 0 ? sortedHistory.map((log, index) => {
                const logDate = safeToDate(log.date);
                return (
                <div key={index}>
                    <p className="font-semibold text-sm mb-2">
                       {logDate ? format(logDate, "PPP 'at' p") : 'Date not available'}
                    </p>
                    <div className="pl-4 border-l-2 space-y-3">
                       {log.actions && log.actions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {log.actions.map(actionId => {
                                    const action = actionItems.find(a => a.id === actionId);
                                    return action ? (
                                        <Badge key={actionId} variant="secondary" className="font-normal">{action.label}</Badge>
                                    ) : null;
                                })}
                            </div>
                        )}
                       {log.note ? (
                            <blockquote className="text-sm text-muted-foreground italic">
                                &ldquo;{log.note}&rdquo;
                            </blockquote>
                        ) : (
                             <p className="text-sm text-muted-foreground italic">No details recorded for this entry.</p>
                         )}
                    </div>
                     {index < sortedHistory.length - 1 && <Separator className="mt-6" />}
                </div>
            )}) : (
                <p className="text-sm text-muted-foreground text-center py-8">No follow-up history recorded yet.</p>
            )}
        </div>
    </ScrollArea>
  );

  if (!mounted) return null;

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0">
          {soul && (
            <>
              <div className="p-6 border-b flex-shrink-0">
                <SheetHeader className="text-left flex-shrink-0">
                  <SheetTitle>Follow-up History: {soul.firstName}</SheetTitle>
                  <SheetDescription>A complete log of all follow-up interactions.</SheetDescription>
                </SheetHeader>
              </div>
              <div className="flex-grow min-h-0 pt-6 px-6">
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
      <DialogContent className="sm:max-w-md">
        {soul && (
          <>
            <DialogHeader>
              <DialogTitle>Follow-up History for {soul.firstName} {soul.lastName}</DialogTitle>
              <DialogDescription>A complete log of all follow-up interactions.</DialogDescription>
            </DialogHeader>
            {historyContent}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}