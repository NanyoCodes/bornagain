"use client";

import * as React from "react";
import { format } from "date-fns";
import { MoreHorizontal, Church, MapPin, Phone, ChevronDown, Download, HeartHandshake, Edit, Trash2 } from "lucide-react";
import type { Soul, FollowUpStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "../ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, safeToDate } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { actionItems } from "@/lib/follow-up-data";
import { SoulInsightsDialog } from "./soul-insights-dialog";
import { Label } from "../ui/label";

const getStatusClasses = (status: FollowUpStatus | undefined): string => {
    if (!status) return 'bg-secondary text-secondary-foreground border-border';
    switch (status) {
        case 'New':
            return 'bg-[hsl(var(--status-new)/0.1)] text-[hsl(var(--status-new))] border-[hsl(var(--status-new)/0.2)]';
        case 'Contacted':
            return 'bg-[hsl(var(--status-contacted)/0.1)] text-[hsl(var(--status-contacted))] border-[hsl(var(--status-contacted)/0.2)]';
        case 'Established':
            return 'bg-[hsl(var(--status-established)/0.1)] text-[hsl(var(--status-established))] border-[hsl(var(--status-established)/0.2)]';
        default:
            return 'bg-secondary text-secondary-foreground border-border';
    }
}

const SoulCard = React.memo(({ soul, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit, onDelete }: { 
  soul: Soul; 
  onFollowUp: (soul: Soul) => void; 
  onViewHistory: (soul: Soul) => void; 
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
  onOpenAssignDialog: (soul: Soul) => void;
  onEdit: (soul: Soul) => void;
  onDelete: (soul: Soul) => void;
}) => {
    const latestFollowUp = React.useMemo(() => {
        if (!soul.followUpLog || soul.followUpLog.length === 0) return null;
        return [...soul.followUpLog].sort((a, b) => {
            const dateB = safeToDate(b.date)?.getTime() ?? 0;
            const dateA = safeToDate(a.date)?.getTime() ?? 0;
            return dateB - dateA;
        })[0];
    }, [soul.followUpLog]);

    const wonAt = React.useMemo(() => safeToDate(soul.wonAt) ?? new Date(), [soul.wonAt]);
    const locationWonString = React.useMemo(() => {
        if (!soul.locationWon) return null;
        return [soul.locationWon.city, soul.locationWon.state, soul.locationWon.country].filter(Boolean).join(', ');
    }, [soul.locationWon]);
    const latestFollowUpDate = latestFollowUp ? safeToDate(latestFollowUp.date) : null;

    return (
        <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x border-b-2 sm:border-b shadow-none">
            <Collapsible>
                <CollapsibleTrigger className="group w-full p-4 text-left hover:bg-muted/30 transition-colors">
                     <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 border">
                                <AvatarFallback className="font-bold">{soul.firstName?.charAt(0)}{soul.lastName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="font-bold font-headline truncate text-sm sm:text-base leading-tight">
                                  {soul.firstName || 'Unknown'} {soul.lastName || ''}
                                </p>
                                <Badge className={cn("mt-1.5 h-5 px-1.5 text-[10px] sm:text-xs", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                            </div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0" />
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                    <div className="border-t pt-4 space-y-5">
                        <div className="flex justify-between items-start gap-4">
                            <div className="text-xs sm:text-sm text-muted-foreground space-y-2.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2 font-medium">
                                    <Badge variant="secondary" className="h-5 px-1.5 rounded uppercase tracking-wider text-[9px] font-bold">Source: {soul.source}</Badge>
                                    {soul.sourceDetails && <span className="truncate opacity-70">• {soul.sourceDetails}</span>}
                                </div>
                                {soul.phone && <div className="truncate flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary"/>{soul.phone}</div>}
                                {soul.church && <div className="flex items-center gap-2"><Church className="h-3.5 w-3.5 text-primary" /> {soul.church}</div>}
                                {locationWonString && <div className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> <span className="line-clamp-2">{locationWonString}</span></div>}
                                {soul.fellowshipName && <div className="flex items-center gap-2 font-semibold text-primary"><HeartHandshake className="h-3.5 w-3.5" /> {soul.fellowshipName}</div>}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Record Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onSelect={() => onEdit(soul)}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => onFollowUp(soul)}>
                                        <HeartHandshake className="mr-2 h-4 w-4" /> Log Follow-up
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => onViewHistory(soul)}>
                                        <History className="mr-2 h-4 w-4" /> View History
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => onOpenAssignDialog(soul)}>
                                        <Users className="mr-2 h-4 w-4" /> Assign Group
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger><Download className="mr-2 h-4 w-4" />Export</DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem onSelect={() => onExportSingle(soul, 'csv')}>CSV</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => onExportSingle(soul, 'pdf')}>PDF</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={() => onDelete(soul)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Record
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        
                        <div className="space-y-3 p-4 rounded-xl border bg-muted/20">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Follow-up History</Label>
                                <SoulInsightsDialog soul={soul}>
                                    <Button variant="link" className="h-auto p-0 text-[10px] font-bold text-primary">Get AI Insights</Button>
                                </SoulInsightsDialog>
                            </div>
                            
                            <div className="space-y-3">
                               {latestFollowUp && latestFollowUpDate ? (
                                    <div className="text-xs">
                                        <p className="font-bold text-foreground/80">Latest Interaction: {format(latestFollowUpDate, "PPP")}</p>
                                        {latestFollowUp.actions && latestFollowUp.actions.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {latestFollowUp.actions.map(actionId => {
                                                    const action = actionItems.find(a => a.id === actionId);
                                                    return action ? <Badge key={actionId} variant="secondary" className="text-[9px] px-1.5 h-4 font-bold uppercase tracking-tight bg-background border">{action.label}</Badge> : null
                                                })}
                                            </div>
                                        )}
                                        {latestFollowUp.note && <p className="italic text-muted-foreground line-clamp-3 mt-2 leading-relaxed">&ldquo;{latestFollowUp.note}&rdquo;</p>}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic py-2">No follow-up interactions logged yet.</p>
                                )}
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <Button size="sm" className="h-8 text-xs font-bold" onClick={() => onFollowUp(soul)}>Log New</Button>
                                    <Button size="sm" variant="outline" className="h-8 text-xs font-bold" onClick={() => onViewHistory(soul)}>History</Button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-2 border-t border-dashed">
                            <span>{soul.source} Outreach</span>
                            <span>Won {format(wonAt, "PPP")}</span>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
});
SoulCard.displayName = "SoulCard";

const SoulTableRow = React.memo(({ soul, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit, onDelete }: { 
  soul: Soul; 
  onFollowUp: (soul: Soul) => void; 
  onViewHistory: (soul: Soul) => void; 
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
  onOpenAssignDialog: (soul: Soul) => void;
  onEdit: (soul: Soul) => void;
  onDelete: (soul: Soul) => void;
}) => {
    const latestFollowUp = React.useMemo(() => {
        if (!soul.followUpLog || soul.followUpLog.length === 0) return null;
        return [...soul.followUpLog].sort((a, b) => {
            const dateB = safeToDate(b.date)?.getTime() ?? 0;
            const dateA = safeToDate(a.date)?.getTime() ?? 0;
            return dateB - dateA;
        })[0];
    }, [soul.followUpLog]);

    const wonAt = React.useMemo(() => safeToDate(soul.wonAt) ?? new Date(), [soul.wonAt]);
    const latestFollowUpDate = latestFollowUp ? safeToDate(latestFollowUp.date) : null;

    return (
        <TableRow>
            <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                    <Avatar className="hidden sm:inline-flex h-9 w-9">
                        <AvatarFallback>{soul.firstName?.charAt(0)}{soul.lastName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <SoulInsightsDialog soul={soul}>
                           <div className="font-bold font-headline cursor-pointer hover:underline text-base">{soul.firstName} {soul.lastName}</div>
                        </SoulInsightsDialog>
                        {soul.church && <div className="text-xs text-muted-foreground flex items-center gap-1"><Church className="h-3 w-3" />{soul.church}</div>}
                    </div>
                </div>
            </TableCell>
            <TableCell>{soul.phone && <div className="text-xs text-muted-foreground">{soul.phone}</div>}</TableCell>
            <TableCell><Badge className={cn("w-[130px] justify-center", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge></TableCell>
            <TableCell>{soul.fellowshipName ? <div className="flex items-center gap-2 text-xs"><HeartHandshake className="h-3 w-3" />{soul.fellowshipName}</div> : <span className="text-muted-foreground text-xs">N/A</span>}</TableCell>
            <TableCell>
                {latestFollowUpDate ? (
                    <div className="text-xs space-y-1">
                        <div className="text-muted-foreground font-semibold">{format(latestFollowUpDate, "PPP")}</div>
                    </div>
                ) : <span className="text-muted-foreground text-xs">No logs</span>}
            </TableCell>
            <TableCell>{format(wonAt, "PPP")}</TableCell>
            <TableCell>
                <div className="text-sm">{soul.source}</div>
                {soul.sourceDetails && <div className="text-xs text-muted-foreground">{soul.sourceDetails}</div>}
            </TableCell>
            <TableCell>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => onEdit(soul)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onFollowUp(soul)}>Log Follow-up</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onViewHistory(soul)}>View History</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onOpenAssignDialog(soul)}><HeartHandshake className="mr-2 h-4 w-4" />Assign Group</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(soul)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Record
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
});
SoulTableRow.displayName = "SoulTableRow";

export function SoulsWonTable({ souls, loading, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit, onDelete }: {
  souls: Soul[];
  loading: boolean;
  onFollowUp: (soul: Soul) => void;
  onViewHistory: (soul: Soul) => void;
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
  onOpenAssignDialog: (soul: Soul) => void;
  onEdit: (soul: Soul) => void;
  onDelete: (soul: Soul) => void;
}) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  if (loading || !mounted) {
    return (
        <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-sm">
            <CardHeader><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-full max-w-sm" /></CardHeader>
            <CardContent className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-2">
                        <div className="space-y-2 flex-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
                        <Skeleton className="h-8 w-24" />
                    </div>
                ))}
            </CardContent>
        </Card>
    )
  }
  
  if (souls.length === 0) {
    return (
        <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-sm">
            <CardHeader><CardTitle className="text-lg font-bold font-headline">Follow-up Dashboard</CardTitle><CardDescription>A list of souls won.</CardDescription></CardHeader>
            <CardContent>
                <div className="text-center py-16 flex flex-col items-center">
                    <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                        <HeartHandshake className="h-8 w-8 text-muted-foreground opacity-30" />
                    </div>
                    <h3 className="text-lg font-semibold">No Records Found</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">The harvest you log will appear here for follow-up and discipleship.</p>
                </div>
            </CardContent>
        </Card>
    );
  }

  if (isMobile) {
      return (
        <div className="space-y-0">
            <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x border-b shadow-sm mb-4">
                <CardHeader className="p-4">
                    <CardTitle className="text-lg font-bold font-headline">Follow-up Dashboard</CardTitle>
                    <CardDescription className="text-xs">Manage and nurture your converts.</CardDescription>
                </CardHeader>
            </Card>
            <div className="space-y-px">
                {souls.map((soul) => (
                    <SoulCard key={soul.id} soul={soul} onFollowUp={onFollowUp} onViewHistory={onViewHistory} onExportSingle={onExportSingle} onOpenAssignDialog={onOpenAssignDialog} onEdit={onEdit} onDelete={onDelete} />
                ))}
            </div>
        </div>
      )
  }

  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-sm">
      <CardHeader><CardTitle className="text-lg font-bold font-headline">Follow-up Dashboard</CardTitle><CardDescription>Keep track of their spiritual journey.</CardDescription></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Last Log</TableHead>
              <TableHead>Won At</TableHead>
              <TableHead>Source</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {souls.map((soul) => (
              <SoulTableRow key={soul.id} soul={soul} onFollowUp={onFollowUp} onViewHistory={onViewHistory} onExportSingle={onExportSingle} onOpenAssignDialog={onOpenAssignDialog} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}