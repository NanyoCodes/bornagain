
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { type Soul } from "@/lib/types";
import { format } from "date-fns";
import { actionItems } from "@/lib/follow-up-data";
import { safeToDate } from "@/lib/utils";

interface ViewHistoryDialogProps {
  soul: Soul;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewHistoryDialog({ soul, isOpen, onOpenChange }: ViewHistoryDialogProps) {
  const sortedHistory = React.useMemo(() => {
    if (!isOpen || !soul.followUpLog || soul.followUpLog.length === 0) return [];
    return [...soul.followUpLog].sort((a, b) => {
      const dateB = safeToDate(b.date)?.getTime() ?? 0;
      const dateA = safeToDate(a.date)?.getTime() ?? 0;
      return dateB - dateA;
    });
  }, [soul.followUpLog, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Follow-up History for {soul.firstName} {soul.lastName}</DialogTitle>
          <DialogDescription>A complete log of all follow-up interactions.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
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
                                            <Badge key={actionId} variant="secondary">{action.label}</Badge>
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
      </DialogContent>
    </Dialog>
  );
}
