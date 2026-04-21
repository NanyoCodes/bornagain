
"use client";

import * as React from "react";
import { format } from "date-fns";
import { MoreHorizontal, Church, UserPlus, Edit, MapPin, Phone, ChevronDown, Trash2, Download } from "lucide-react";
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
  DropdownMenuSeparator,
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
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { actionItems } from "@/lib/follow-up-data";
import { SoulInsightsDialog } from "./soul-insights-dialog";
import { Label } from "../ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";


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

type SoulCardProps = { 
  soul: Soul; 
  onEdit: (soul: Soul) => void; 
  onDelete: (soul: Soul) => void; 
  onFollowUp: (soul: Soul) => void; 
  onViewHistory: (soul: Soul) => void; 
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
};

function SoulCard({ soul, onEdit, onDelete, onFollowUp, onViewHistory, onExportSingle }: SoulCardProps) {
    const latestFollowUp = React.useMemo(() => {
        if (!soul.followUpLog || soul.followUpLog.length === 0) return null;
        return soul.followUpLog.reduce((latest, current) => {
            if (!latest.date?.toDate) return current;
            if (!current.date?.toDate) return latest;
            return current.date.toDate() > latest.date.toDate() ? current : latest;
        });
    }, [soul.followUpLog]);

    const wonAt = React.useMemo(() => soul.wonAt?.toDate ? soul.wonAt.toDate() : new Date(), [soul.wonAt]);
    
    const locationWonString = React.useMemo(() => {
        if (!soul.locationWon) return null;
        return [soul.locationWon.city, soul.locationWon.state, soul.locationWon.country].filter(Boolean).join(', ');
    }, [soul.locationWon]);

    return (
        <Card>
            <Collapsible>
                <CollapsibleTrigger className="group w-full p-4 text-left">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <Dialog>
                                <DialogTrigger asChild disabled={!soul.photoURL}>
                                    <Avatar className={cn(soul.photoURL && "cursor-pointer")}>
                                        <AvatarImage src={soul.photoURL} />
                                        <AvatarFallback>{soul.firstName?.charAt(0)}{soul.lastName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </DialogTrigger>
                                {soul.photoURL && (
                                    <DialogContent className="p-0 bg-transparent border-0 w-auto max-w-lg">
                                        <DialogHeader className="sr-only">
                                            <DialogTitle>Profile photo of {soul.firstName} {soul.lastName}</DialogTitle>
                                        </DialogHeader>
                                        <Image src={soul.photoURL} alt={`${soul.firstName} ${soul.lastName}`} width={600} height={600} className="rounded-lg object-contain"/>
                                    </DialogContent>
                                )}
                            </Dialog>
                            <div className="min-w-0">
                                <SoulInsightsDialog soul={soul}>
                                    <p className="font-semibold truncate cursor-pointer hover:underline">{soul.firstName || 'Unknown'} {soul.lastName || ''}</p>
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
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onSelect={() => onEdit(soul)}>
                                        <Edit className="mr-2 h-4 w-4"/>
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => onFollowUp(soul)}>Follow-up</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => onViewHistory(soul)}>View History</DropdownMenuItem>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <Download className="mr-2 h-4 w-4" />
                                            <span>Export</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem onSelect={() => onExportSingle(soul, 'csv')}>Export as CSV</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => onExportSingle(soul, 'pdf')}>Export as PDF</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => onDelete(soul)} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        
                        <div className="space-y-3 pt-4 border-t">
                            <Label>Follow-up</Label>
                            <div className="border rounded-lg p-4 space-y-4">
                               {latestFollowUp ? (
                                    <div className="text-sm">
                                        <p className="font-semibold text-muted-foreground">Latest Log: {format(latestFollowUp.date.toDate(), "PPP")}</p>
                                        {latestFollowUp.actions && latestFollowUp.actions.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {latestFollowUp.actions.map(actionId => {
                                                    const action = actionItems.find(a => a.id === actionId);
                                                    return action ? <Badge key={actionId} variant="secondary" className="text-xs font-normal">{action.label}</Badge> : null
                                                })}
                                            </div>
                                        )}
                                        <p className="italic line-clamp-2 mt-2">&ldquo;{latestFollowUp.note}&rdquo;</p>
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
                            <span>{soul.source} {soul.sourceDetails ? `(${soul.sourceDetails})` : ''}</span>
                            <span>{format(wonAt, "PPP")}</span>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}

type SoulTableRowProps = { 
  soul: Soul; 
  onEdit: (soul: Soul) => void; 
  onDelete: (soul: Soul) => void; 
  onFollowUp: (soul: Soul) => void; 
  onViewHistory: (soul: Soul) => void;
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
};

function SoulTableRow({ soul, onEdit, onDelete, onFollowUp, onViewHistory, onExportSingle }: SoulTableRowProps) {
    const latestFollowUp = React.useMemo(() => {
        if (!soul.followUpLog || soul.followUpLog.length === 0) return null;
        return soul.followUpLog.reduce((latest, current) => {
            const latestTime = latest.date?.toDate ? latest.date.toDate().getTime() : 0;
            const currentTime = current.date?.toDate ? current.date.toDate().getTime() : 0;
            return currentTime > latestTime ? current : latest;
        });
    }, [soul.followUpLog]);

    const wonAt = React.useMemo(() => soul.wonAt?.toDate ? soul.wonAt.toDate() : new Date(), [soul.wonAt]);

    return (
        <TableRow>
            <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                    <Avatar className="hidden sm:inline-flex h-9 w-9">
                        <AvatarImage src={soul.photoURL} />
                        <AvatarFallback>{soul.firstName?.charAt(0)}{soul.lastName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <SoulInsightsDialog soul={soul}>
                           <div className="cursor-pointer hover:underline">{soul.firstName || 'Unknown'} {soul.lastName || ''}</div>
                        </SoulInsightsDialog>
                        {soul.church && <div className="text-xs text-muted-foreground flex items-center gap-1"><Church className="h-3 w-3" />{soul.church}</div>}
                    </div>
                </div>
            </TableCell>
            <TableCell>
                {soul.phone && <div className="text-xs text-muted-foreground">{soul.phone}</div>}
            </TableCell>
            <TableCell>
                <Badge className={cn("w-[150px] justify-center", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
            </TableCell>
            <TableCell>
                {latestFollowUp ? (
                    <div className="text-xs space-y-1">
                        <div className="text-muted-foreground font-semibold">
                            {format(latestFollowUp.date.toDate(), "PPP")}
                        </div>
                        {latestFollowUp.actions && latestFollowUp.actions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {latestFollowUp.actions.map(actionId => {
                                    const action = actionItems.find(a => a.id === actionId);
                                    return action ? <Badge key={actionId} variant="secondary" className="font-normal">{action.label}</Badge> : null
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-xs text-muted-foreground">No logs</div>
                )}
            </TableCell>
            <TableCell>{format(wonAt, "PPP")}</TableCell>
            <TableCell>
                <div>{soul.source}</div>
                {soul.sourceDetails && <div className="text-xs text-muted-foreground">{soul.sourceDetails}</div>}
            </TableCell>
            <TableCell>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => onEdit(soul)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onFollowUp(soul)}>Follow-up</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onViewHistory(soul)}>View History</DropdownMenuItem>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Download className="mr-2 h-4 w-4" />
                                <span>Export</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onSelect={() => onExportSingle(soul, 'csv')}>Export as CSV</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => onExportSingle(soul, 'pdf')}>Export as PDF</DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => onDelete(soul)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
}

type SoulsWonTableProps = {
  souls: Soul[];
  loading: boolean;
  onEdit: (soul: Soul) => void;
  onDelete: (soul: Soul) => void;
  onFollowUp: (soul: Soul) => void;
  onViewHistory: (soul: Soul) => void;
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
};

export function SoulsWonTable({ souls, loading, onEdit, onDelete, onFollowUp, onViewHistory, onExportSingle }: SoulsWonTableProps) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (loading || !mounted) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full max-w-sm" />
            </CardHeader>
            <CardContent className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-2">
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-24" />
                    </div>
                ))}
            </CardContent>
        </Card>
    )
  }
  
  if (souls.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Follow-up Dashboard</CardTitle>
                <CardDescription>
                A list of souls won. Keep track of their spiritual journey.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-12 flex flex-col items-center">
                    <UserPlus className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Records Found</h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                        No souls match your current search. Try changing your filters or add a new soul to your list.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
  }

  if (isMobile) {
      return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Follow-up Dashboard</CardTitle>
                    <CardDescription>
                    A list of souls won. Keep track of their spiritual journey.
                    </CardDescription>
                </CardHeader>
            </Card>
            {souls.map((soul) => <SoulCard key={soul.id} soul={soul} onEdit={onEdit} onDelete={onDelete} onFollowUp={onFollowUp} onViewHistory={onViewHistory} onExportSingle={onExportSingle} />)}
        </div>
      )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-up Dashboard</CardTitle>
        <CardDescription>
          A list of souls won. Keep track of their spiritual journey.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Follow-up</TableHead>
              <TableHead>Won At</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {souls.map((soul) => (
              <SoulTableRow key={soul.id} soul={soul} onEdit={onEdit} onDelete={onDelete} onFollowUp={onFollowUp} onViewHistory={onViewHistory} onExportSingle={onExportSingle} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
