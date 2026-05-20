"use client";

import * as React from "react";
import { format } from "date-fns";
import { MoreHorizontal, Church, MapPin, Phone, ChevronDown, Download, HeartHandshake, Edit } from "lucide-react";
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

const SoulCard = React.memo(({ soul, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit }: { 
  soul: Soul; 
  onFollowUp: (soul: Soul) => void; 
  onViewHistory: (soul: Soul) => void; 
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
  onOpenAssignDialog: (soul: Soul) => void;
  onEdit: (soul: Soul) => void;
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
        <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
            <Collapsible>
                <CollapsibleTrigger className="group w-full p-4 text-left">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback>{soul.firstName?.charAt(0)}{soul.lastName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <SoulInsightsDialog soul={soul}>
                                    <p className="font-bold font-headline truncate cursor-pointer hover:underline text-base sm:text-lg">
                                      {soul.firstName || 'Unknown'} {soul.lastName || ''}
                                    </p>
                                </SoulInsightsDialog>
                                <Badge className={cn("mt-1", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                            </div>
                        </div>
                        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                    <div className="border-t pt-4 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="text-sm text-muted-foreground space-y-1">
                                {soul.phone && <div className="truncate flex items-center gap-2 mt-1"><Phone className="h-4 w-4"/>{soul.phone}</div>}
                                {soul.church && <div className="flex items-center gap-1 pt-2"><Church className="h-4 w-4" /> {soul.church}</div>}
                                {locationWonString && <div className="flex items-center gap-1 pt-1"><MapPin className="h-4 w-4" /> {locationWonString}</div>}
                                {soul.fellowshipName && <div className="flex items-center gap-1 pt-1"><HeartHandshake className="h-4 w-4" /> {soul.fellowshipName}</div>}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                    < MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onEdit(soul); }}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onViewHistory(soul); }}>View History</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onOpenAssignDialog(soul); }}><HeartHandshake className="mr-2 h-4 w-4" />Assign Fellowship</DropdownMenuItem>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger><Download className="mr-2 h-4 w-4" />Export</DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem onSelect={() => onExportSingle(soul, 'csv')}>CSV</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => onExportSingle(soul, 'pdf')}>PDF</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="space-y-3 pt-4 border-t">
                            <Label>Follow-up</Label>
                            <div className="border rounded-lg p-4 space-y-4">
                               {latestFollowUp && latestFollowUpDate ? (
                                    <div className="text-sm">
                                        <p className="font-semibold text-muted-foreground">Latest Log: {format(latestFollowUpDate, "PPP")}</p>
                                        {latestFollowUp.actions && latestFollowUp.actions.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {latestFollowUp.actions.map(actionId => {
                                                    const action = actionItems.find(a => a.id === actionId);
                                                    return action ? <Badge key={actionId} variant="secondary" className="text-xs font-normal">{action.label}</Badge> : null
                                                })}
                                            </div>
                                        )}
                                        {latestFollowUp.note && <p className="italic line-clamp-2 mt-2">&ldquo;{latestFollowUp.note}&rdquo;</p>}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No follow-up logged yet.</p>
                                )}
                                <div className="flex gap-2 w-full">
                                    <Button size="sm" className="w-full" onClick={() => onFollowUp(soul)}>Follow-up</Button>
                                    <Button size="sm" variant="outline" className="w-full" onClick={() => onViewHistory(soul)}>View History</Button>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground pt-4">
                            <span>{soul.source}</span>
                            <span>{format(wonAt, "PPP")}</span>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
});
SoulCard.displayName = "SoulCard";

const SoulTableRow = React.memo(({ soul, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit }: { 
  soul: Soul; 
  onFollowUp: (soul: Soul) => void; 
  onViewHistory: (soul: Soul) => void; 
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
  onOpenAssignDialog: (soul: Soul) => void;
  onEdit: (soul: Soul) => void;
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
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onEdit(soul); }}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onFollowUp(soul); }}>Follow-up</DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onViewHistory(soul); }}>View History</DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onOpenAssignDialog(soul); }}><HeartHandshake className="mr-2 h-4 w-4" />Assign Fellowship</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
});
SoulTableRow.displayName = "SoulTableRow";

export function SoulsWonTable({ souls, loading, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit }: {
  souls: Soul[];
  loading: boolean;
  onFollowUp: (soul: Soul) => void;
  onViewHistory: (soul: Soul) => void;
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
  onOpenAssignDialog: (soul: Soul) => void;
  onEdit: (soul: Soul) => void;
}) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  if (loading || !mounted) {
    return (
        <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
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
        <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
            <CardHeader><CardTitle className="text-2xl font-bold font-headline">Follow-up Dashboard</CardTitle><CardDescription>A list of souls won.</CardDescription></CardHeader>
            <CardContent>
                <div className="text-center py-12 flex flex-col items-center">
                    <HeartHandshake className="h-12 w-12 text-muted-foreground opacity-20" />
                    <h3 className="mt-4 text-lg font-semibold">No Records Found</h3>
                    <p className="text-sm text-muted-foreground mt-1">Souls you log will appear here for follow-up.</p>
                </div>
            </CardContent>
        </Card>
    );
  }

  if (isMobile) {
      return (
        <div className="space-y-4">
            <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold font-headline">Follow-up Dashboard</CardTitle>
                    <CardDescription>A list of souls won.</CardDescription>
                </CardHeader>
            </Card>
            {souls.map((soul) => (
                <SoulCard key={soul.id} soul={soul} onFollowUp={onFollowUp} onViewHistory={onViewHistory} onExportSingle={onExportSingle} onOpenAssignDialog={onOpenAssignDialog} onEdit={onEdit} />
            ))}
        </div>
      )
  }

  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
      <CardHeader><CardTitle className="text-2xl font-bold font-headline">Follow-up Dashboard</CardTitle><CardDescription>Keep track of their spiritual journey.</CardDescription></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fellowship</TableHead>
              <TableHead>Last Log</TableHead>
              <TableHead>Won At</TableHead>
              <TableHead>Source</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {souls.map((soul) => (
              <SoulTableRow key={soul.id} soul={soul} onFollowUp={onFollowUp} onViewHistory={onViewHistory} onExportSingle={onExportSingle} onOpenAssignDialog={onOpenAssignDialog} onEdit={onEdit} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}