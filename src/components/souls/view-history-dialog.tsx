"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { type Soul, type FollowUpStatus } from "@/lib/types";
import { format } from "date-fns";
import { actionItems } from "@/lib/follow-up-data";
import { cn, safeToDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { History, Sparkles, MapPin, Church, Phone, Mail, User, X } from "lucide-react";
import { Button } from "../ui/button";

interface ViewHistoryDialogProps {
  soul: Soul | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const getStatusClasses = (status: FollowUpStatus | undefined): string => {
    if (!status) return 'bg-secondary text-secondary-foreground border-border';
    switch (status) {
        case 'New':
            return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-500';
        case 'Contacted':
            return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-500';
        case 'Established':
            return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-500';
        default:
            return 'bg-secondary text-secondary-foreground border-border';
    }
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

  const wonAtDate = React.useMemo(() => soul ? safeToDate(soul.wonAt) : null, [soul]);
  const locationString = React.useMemo(() => {
    if (!soul?.locationWon) return null;
    return [soul.locationWon.city, soul.locationWon.state, soul.locationWon.country].filter(Boolean).join(', ');
  }, [soul?.locationWon]);

  const historyContent = (
    <div className="h-full w-full">
        <div className="space-y-8 p-6 sm:p-10 pb-24 text-left">
            {soul && (
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 p-6 rounded-[2rem] bg-muted/20 border border-dashed shadow-inner">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <Badge className={cn("h-6 px-3 uppercase font-black tracking-widest text-[10px]", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                            {wonAtDate && <span className="text-[10px] font-bold text-muted-foreground uppercase">Won {format(wonAtDate, 'PPP')}</span>}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs text-muted-foreground font-medium">
                            <div className="flex items-center gap-2.5">
                                <User className="h-3.5 w-3.5 text-primary" />
                                <span className="truncate">{soul.gender || 'Gender Unset'} • {soul.relationship || 'Outreach'}</span>
                            </div>
                            {locationString && (
                                <div className="flex items-start gap-2.5">
                                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                    <span className="line-clamp-2">{locationString}</span>
                                </div>
                            )}
                            {soul.phone && (
                                <div className="flex items-center gap-2.5">
                                    <Phone className="h-3.5 w-3.5 text-primary" />
                                    <span className="truncate">{soul.phone}</span>
                                </div>
                            )}
                            {soul.church && (
                                <div className="flex items-start gap-2.5">
                                    <Church className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                    <span className="line-clamp-2">{soul.church}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="space-y-4 pt-2">
                        <h4 className="font-black text-[10px] uppercase tracking-[0.3em] text-primary flex items-center gap-2 px-1">
                            <History className="h-3.5 w-3.5" /> Interaction History
                        </h4>
                        <div className="space-y-8 pl-1">
                            {sortedHistory.length > 0 ? sortedHistory.map((log, index) => {
                                const logDate = safeToDate(log.date);
                                return (
                                <div key={index} className="relative">
                                    <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                                        <p className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                                        {logDate ? format(logDate, "PPP 'at' p") : 'Date not available'}
                                        </p>
                                        {log.memberName && (
                                            <span className="text-[9px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 uppercase tracking-tighter truncate max-w-[140px]">
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
                                            <div className="bg-background rounded-2xl p-4 border shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-3 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                                                    <Sparkles className="h-8 w-8 text-primary rotate-12" />
                                                </div>
                                                <p className="text-sm sm:text-base text-muted-foreground italic leading-relaxed break-words [overflow-wrap:anywhere]">
                                                    &ldquo;{log.note}&rdquo;
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic pl-1 opacity-60">No additional details recorded for this entry.</p>
                                        )}
                                    </div>
                                    {index < sortedHistory.length - 1 && <Separator className="mt-8 opacity-30" />}
                                </div>
                            )}) : (
                                <div className="text-center py-20 flex flex-col items-center border-2 border-dashed rounded-3xl bg-muted/5">
                                    <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6">
                                        <History className="h-10 w-10 text-muted-foreground opacity-10" />
                                    </div>
                                    <p className="text-base font-bold uppercase tracking-tight text-muted-foreground/60">No interactions recorded</p>
                                    <p className="text-xs mt-2 italic px-12 text-muted-foreground/50 text-balance leading-relaxed">Start logging follow-up interactions to build a spiritual journey map for this believer.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );

  if (!mounted) return null;

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
          {soul && (
            <>
              <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                <SheetHeader className="text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Kingdom Journey</span>
                  </div>
                  <SheetTitle className="text-2xl font-black font-headline leading-tight uppercase break-words [overflow-wrap:anywhere]">{soul.firstName} {soul.lastName}</SheetTitle>
                  <SheetDescription className="text-sm font-medium mt-1">Status and spiritual development history.</SheetDescription>
                </SheetHeader>
              </div>
              <ScrollArea className="flex-grow min-h-0">
                {historyContent}
              </ScrollArea>
              <div className="p-8 border-t bg-background/80 backdrop-blur-sm shrink-0">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full h-12 rounded-2xl font-bold">Close History</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh] p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl text-left">
        {soul && (
          <>
            <div className="p-8 border-b shrink-0 bg-muted/10">
                <DialogHeader className="text-left">
                    <DialogTitle className="text-3xl font-black font-headline uppercase tracking-tight break-words [overflow-wrap:anywhere]">{soul.firstName} {soul.lastName}</DialogTitle>
                    <DialogDescription className="text-base font-medium">Harvest Record & Spiritual Progress</DialogDescription>
                </DialogHeader>
                <DialogClose className="absolute right-8 top-10 rounded-full h-10 w-10 bg-background/50 hover:bg-background shadow-sm border border-transparent transition-all hover:scale-105 active:scale-95 flex items-center justify-center outline-none">
                    <X className="h-5 w-5 text-muted-foreground" />
                </DialogClose>
            </div>
            <ScrollArea className="flex-grow min-h-0 overflow-hidden">
                {historyContent}
            </ScrollArea>
            <div className="p-6 border-t bg-muted/5 flex justify-end shrink-0">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full px-10 font-bold h-11">Close</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
