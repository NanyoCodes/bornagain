
"use client";

import * as React from "react";
import { format } from "date-fns";
import { 
  MoreHorizontal, 
  Church, 
  MapPin, 
  Phone, 
  ChevronDown, 
  Download, 
  HeartHandshake, 
  Edit, 
  Trash2, 
  Users, 
  History, 
  Group, 
  Heart, 
  Sparkles,
  ArrowRight,
  Gift,
  Utensils,
  Hourglass,
  ClipboardList
} from "lucide-react";
import type { Soul, FollowUpStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { actionItems } from "@/lib/follow-up-data";
import { Label } from "../ui/label";
import Link from "next/link";
import { useUser } from "@/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const SoulCard = React.memo(({ soul, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit, onDelete, onAssess }: { 
  soul: Soul; 
  onFollowUp: (soul: Soul) => void; 
  onViewHistory: (soul: Soul) => void; 
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
  onOpenAssignDialog: (soul: Soul) => void;
  onEdit: (soul: Soul) => void;
  onDelete: (soul: Soul) => void;
  onAssess: (soul: Soul) => void;
}) => {
    const { user } = useUser();
    const [pendingProvisions, setPendingProvisions] = React.useState<{ soulId: string; actionId: string }[]>([]);

    const checkPending = React.useCallback(() => {
        if (typeof window === 'undefined' || !user?.uid) {
            setPendingProvisions([]);
            return;
        }
        const key = `testify_pending_provisions_${user.uid}`;
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setPendingProvisions(Array.isArray(parsed) ? parsed : []);
            } catch (e) { setPendingProvisions([]); }
        } else { setPendingProvisions([]); }
    }, [user?.uid]);

    React.useEffect(() => {
        checkPending();
        window.addEventListener('testify_pending_action_update', checkPending);
        window.addEventListener('storage', checkPending);
        return () => {
            window.removeEventListener('testify_pending_action_update', checkPending);
            window.removeEventListener('storage', checkPending);
        };
    }, [checkPending]);

    const myPending = React.useMemo(() => 
        pendingProvisions.filter(p => p.soulId === soul.id), 
    [pendingProvisions, soul.id]);

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

    const triggerAction = (action: (s: Soul) => void) => {
      requestAnimationFrame(() => {
        action(soul);
      });
    };

    return (
        <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-b-2 sm:border-b shadow-none bg-card/50 backdrop-blur-sm transition-all duration-300">
            <Collapsible>
                <div className="flex items-center justify-between p-4 gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Dialog>
                            <DialogTrigger asChild disabled={!soul.photoURL}>
                                <Avatar className={cn("h-10 w-10 sm:h-11 sm:w-11 shrink-0 border shadow-inner transition-transform active:scale-95", soul.photoURL && "cursor-pointer hover:scale-105")}>
                                    <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                                    <AvatarFallback className="font-black bg-primary/10 text-primary text-xs">
                                        {soul.firstName?.charAt(0) || 'S'}
                                    </AvatarFallback>
                                </Avatar>
                            </DialogTrigger>
                            {soul.photoURL && (
                                <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center">
                                    <DialogHeader className="sr-only">
                                        <DialogTitle>Photo of {soul.firstName}</DialogTitle>
                                        <DialogDescription>Full screen view of the convert's photo.</DialogDescription>
                                    </DialogHeader>
                                    <div className="relative h-full w-full flex items-center justify-center p-4">
                                        <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center">
                                            <Image 
                                                src={soul.photoURL} 
                                                alt={soul.firstName} 
                                                fill 
                                                className="object-contain shadow-2xl ring-4 ring-white/10" 
                                                unoptimized 
                                            />
                                        </div>
                                    </div>
                                </DialogContent>
                            )}
                        </Dialog>
                        <CollapsibleTrigger className="min-w-0 text-left flex-1 outline-none">
                            <div className="min-w-0">
                                <p className="font-bold truncate text-sm sm:text-base leading-tight capitalize tracking-tight">
                                  {soul.firstName || 'Unknown'} {soul.lastName || ''}
                                </p>
                                <div className="flex flex-wrap gap-1.5 items-center mt-1.5">
                                    <Badge className={cn("h-5 px-1.5 text-[9px] uppercase font-black tracking-widest", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                                    {soul.fellowshipName && <Badge variant="secondary" className="h-5 px-1.5 text-[8px] uppercase font-black tracking-tighter bg-primary/5 text-primary border-primary/20">Fellowship</Badge>}
                                    {soul.associationName && <Badge variant="outline" className="h-5 px-1.5 text-[8px] uppercase font-black tracking-tighter border-blue-500/20 text-blue-600 bg-blue-500/5">Association</Badge>}
                                    {myPending.length > 0 && <Badge className="h-5 px-1.5 text-[8px] uppercase font-black tracking-tighter bg-primary text-white animate-pulse border-none">Pending Gift</Badge>}
                                </div>
                            </div>
                        </CollapsibleTrigger>
                    </div>
                    <CollapsibleTrigger asChild>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0 cursor-pointer" />
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="px-4 pb-4">
                    <div className="border-t pt-4 space-y-5">
                        <div className="flex justify-between items-start gap-4">
                            <div className="text-xs sm:text-sm text-muted-foreground space-y-3 flex-1 min-w-0 font-medium">
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="h-4 px-1.5 rounded uppercase tracking-widest text-[8px] font-black opacity-80">Ref: {soul.source}</Badge>
                                    {soul.sourceDetails && <span className="truncate text-[10px] opacity-60 font-bold uppercase tracking-tight">• {soul.sourceDetails}</span>}
                                </div>
                                {soul.phone && <div className="truncate flex items-center gap-2.5 font-bold"><Phone className="h-3.5 w-3.5 text-primary"/>{soul.phone}</div>}
                                {soul.church && <div className="flex items-center gap-2.5 leading-snug"><Church className="h-3.5 w-3.5 text-primary shrink-0" /> {soul.church}</div>}
                                {locationWonString && <div className="flex items-start gap-2.5 leading-snug"><MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> <span className="line-clamp-2">{locationWonString}</span></div>}
                                {soul.fellowshipName && <div className="flex items-center gap-2.5 font-black text-[10px] text-primary uppercase tracking-widest"><HeartHandshake className="h-3.5 w-3.5" /> FELLOWSHIP: {soul.fellowshipName}</div>}
                                {soul.associationName && <div className="flex items-center gap-2.5 font-black text-[10px] text-blue-500 uppercase tracking-widest"><Group className="h-3.5 w-3.5" /> ASSOCIATION: {soul.associationName}</div>}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost" className="h-9 w-9 shrink-0 rounded-full hover:bg-background shadow-sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl">
                                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Record Control</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => triggerAction(onEdit)} className="rounded-lg">
                                        <Edit className="mr-2 h-4 w-4" /> Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => triggerAction(onAssess)} className="rounded-lg">
                                        <ClipboardList className="mr-2 h-4 w-4 text-primary" /> Assess Needs
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => triggerAction(onFollowUp)} className="rounded-lg">
                                        <HeartHandshake className="mr-2 h-4 w-4 text-primary" /> Log Follow-up
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => triggerAction(onViewHistory)} className="rounded-lg">
                                        <History className="mr-2 h-4 w-4" /> Interaction History
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => triggerAction(onOpenAssignDialog)} className="rounded-lg">
                                        <Users className="mr-2 h-4 w-4" /> Assign Community
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="rounded-lg"><Download className="mr-2 h-4 w-4" /> Export Report</DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent className="rounded-xl">
                                                <DropdownMenuItem onClick={() => onExportSingle(soul, 'csv')} className="rounded-lg">CSV (Excel)</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onExportSingle(soul, 'pdf')} className="rounded-lg">PDF Document</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg" onClick={() => triggerAction(onDelete)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        
                        <div className="space-y-3 p-4 rounded-2xl border-2 border-dashed bg-background/40">
                            <div className="flex items-center justify-between">
                                <Label className="text-[9px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Harvest Follow-up</Label>
                            </div>
                            
                            <div className="space-y-4">
                               {/* Pending Gifting Reminders */}
                               {myPending.length > 0 && (
                                   <div className="space-y-2">
                                       {myPending.map(p => {
                                           const path = p.actionId === 'shared_meal' ? '/dashboard/marketplace' : '/dashboard/marketplace/gifts';
                                           const label = p.actionId === 'shared_meal' ? 'Meal' : 'Gift';
                                           const Icon = p.actionId === 'shared_meal' ? Utensils : Gift;
                                           return (
                                               <div key={p.actionId} className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-2 shadow-inner">
                                                   <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center shrink-0">
                                                            <Icon className="h-3.5 w-3.5 text-white" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-black uppercase text-primary leading-tight">PENDING {label} PROVISION</p>
                                                            <p className="text-[9px] text-primary/60 font-bold uppercase truncate">Click to finish act of kindness</p>
                                                        </div>
                                                   </div>
                                                   <Button asChild size="sm" className="h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md">
                                                       <Link href={`${path}?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}&actionId=${p.actionId}`}>
                                                           FINISH
                                                       </Link>
                                                   </Button>
                                               </div>
                                           );
                                       })}
                                   </div>
                               )}

                               {latestFollowUp && latestFollowUpDate ? (
                                    <div className="text-xs">
                                        <p className="font-black uppercase tracking-tighter text-primary/70 mb-2">LAST LOG: {format(latestFollowUpDate, "MMM d, yyyy")}</p>
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {latestFollowUp.actions?.map(actionId => {
                                                const action = actionItems.find(a => a.id === actionId);
                                                return action ? (
                                                    <Badge key={actionId} variant="secondary" className="text-[8px] px-1.5 h-4 font-black uppercase tracking-tight bg-background border leading-none">
                                                        {action.label}
                                                    </Badge>
                                                ) : null;
                                            })}
                                            {latestFollowUp.note?.includes('₦') && (
                                                <Badge variant="outline" className="text-[8px] px-1.5 h-4 font-black uppercase tracking-tight bg-green-500/10 text-green-600 border-green-500/20 leading-none">FULFILLED</Badge>
                                            )}
                                        </div>
                                        {latestFollowUp.note && (
                                            <p className={cn(
                                                "italic leading-relaxed text-balance",
                                                latestFollowUp.note.includes('₦') ? "text-foreground font-medium not-italic" : "text-muted-foreground line-clamp-3"
                                            )}>
                                                &ldquo;{latestFollowUp.note}&rdquo;
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic py-2 opacity-60">No follow-up interactions recorded yet. Begin their journey today!</p>
                                )}
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <Button size="sm" className="h-9 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md" onClick={() => triggerAction(onFollowUp)}>FOLLOW-UP</Button>
                                    <Button size="sm" variant="outline" className="h-9 text-[10px] font-black uppercase tracking-widest rounded-xl bg-background/50" onClick={() => triggerAction(onViewHistory)}>HISTORY</Button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 pt-2 border-t border-dashed">
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

const SoulTableRow = React.memo(({ soul, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit, onDelete, onAssess }: { 
  soul: Soul; 
  onFollowUp: (soul: Soul) => void; 
  onViewHistory: (soul: Soul) => void; 
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
  onOpenAssignDialog: (soul: Soul) => void;
  onEdit: (soul: Soul) => void;
  onDelete: (soul: Soul) => void;
  onAssess: (soul: Soul) => void;
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

    const triggerAction = (action: (s: Soul) => void) => {
      requestAnimationFrame(() => {
        action(soul);
      });
    };

    return (
        <TableRow className="hover:bg-muted/30 transition-colors">
            <TableCell className="font-medium p-4">
                <div className="flex items-center gap-4">
                    <Dialog>
                        <DialogTrigger asChild disabled={!soul.photoURL}>
                            <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 transition-transform active:scale-95", soul.photoURL && "cursor-pointer hover:scale-105")}>
                                <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                                <AvatarFallback className="font-black bg-primary/10 text-primary text-xs">
                                    {soul.firstName?.charAt(0) || 'S'}
                                </AvatarFallback>
                            </Avatar>
                        </DialogTrigger>
                        {soul.photoURL && (
                            <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center">
                                <DialogHeader className="sr-only">
                                    <DialogTitle>Photo of {soul.firstName}</DialogTitle>
                                    <DialogDescription>Full screen view of the convert's photo.</DialogDescription>
                                </DialogHeader>
                                <div className="relative h-full w-full flex items-center justify-center p-4">
                                    <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center">
                                        <Image 
                                            src={soul.photoURL} 
                                            alt={soul.firstName} 
                                            fill 
                                            className="object-contain shadow-2xl ring-4 ring-white/10" 
                                            unoptimized 
                                        />
                                    </div>
                                </div>
                            </DialogContent>
                        )}
                    </Dialog>
                    <div className="min-w-0">
                        <div className="font-black text-sm sm:text-base truncate capitalize tracking-tight">{soul.firstName} {soul.lastName}</div>
                        {soul.church && <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 font-medium truncate opacity-70"><Church className="h-3 w-3 shrink-0" />{soul.church}</div>}
                    </div>
                </div>
            </TableCell>
            <TableCell className="hidden md:table-cell p-4">{soul.phone && <div className="text-xs font-bold text-muted-foreground">{soul.phone}</div>}</TableCell>
            <TableCell className="p-4"><Badge className={cn("w-[110px] justify-center text-[10px] uppercase font-black tracking-widest leading-none h-6", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge></TableCell>
            <TableCell className="hidden lg:table-cell p-4">
                <div className="space-y-1.5">
                    {soul.fellowshipName ? (
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary leading-none">
                            <HeartHandshake className="h-3 w-3 shrink-0" />
                            {soul.fellowshipName}
                        </div>
                    ) : null}
                    {soul.associationName ? (
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-blue-500 leading-none">
                            <Group className="h-3 w-3 shrink-0" />
                            {soul.associationName}
                        </div>
                    ) : null}
                    {!soul.fellowshipName && !soul.associationName && <span className="text-muted-foreground text-[9px] font-black uppercase tracking-widest opacity-30 italic">Unplaced</span>}
                </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell p-4">
                {latestFollowUpDate ? (
                    <div className="text-[10px] space-y-1">
                        <div className="text-muted-foreground font-black uppercase tracking-widest">{format(latestFollowUpDate, "MMM d, yyyy")}</div>
                    </div>
                ) : <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-20">—</span>}
            </TableCell>
            <TableCell className="hidden md:table-cell p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{format(wonAt, "MMM d, yyyy")}</TableCell>
            <TableCell className="hidden xl:table-cell p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-foreground/80">{soul.source}</div>
                {soul.sourceDetails && <div className="text-[9px] font-bold text-muted-foreground/60 uppercase truncate max-w-[120px]">{soul.sourceDetails}</div>}
            </TableCell>
            <TableCell className="p-4 text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 rounded-full"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-black">Soul Control</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => triggerAction(onEdit)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => triggerAction(onAssess)}>
                            <ClipboardList className="mr-2 h-4 w-4 text-primary" /> Assess Needs
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => triggerAction(onFollowUp)}>
                            <HeartHandshake className="mr-2 h-4 w-4 text-primary" /> Log Follow-up
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => triggerAction(onViewHistory)}>
                            <History className="mr-2 h-4 w-4" /> Interaction History
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => triggerAction(onOpenAssignDialog)}>
                            <Users className="mr-2 h-4 w-4" /> Assign Community
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="rounded-lg"><Download className="mr-2 h-4 w-4" /> Export Report</DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent className="rounded-xl">
                                    <DropdownMenuItem onClick={() => onExportSingle(soul, 'csv')} className="rounded-lg">CSV (Excel)</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onExportSingle(soul, 'pdf')} className="rounded-lg">PDF Document</DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg" onClick={() => triggerAction(onDelete)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Record
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
});
SoulTableRow.displayName = "SoulTableRow";

export function SoulsWonTable({ souls, loading, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit, onDelete, onAssess }: {
  souls: Soul[];
  loading: boolean;
  onFollowUp: (soul: Soul) => void;
  onViewHistory: (soul: Soul) => void;
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
  onOpenAssignDialog: (soul: Soul) => void;
  onEdit: (soul: Soul) => void;
  onDelete: (soul: Soul) => void;
  onAssess: (soul: Soul) => void;
}) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  if (loading || !mounted) {
    return (
        <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border-b last:border-0 bg-card/50 backdrop-blur-sm rounded-xl">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
                    <Skeleton className="h-9 w-24 rounded-xl" />
                </div>
            ))}
        </div>
    )
  }
  
  if (souls.length === 0) {
    return (
        <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x shadow-none bg-card/50 backdrop-blur-sm border-2 border-dashed">
            <CardContent>
                <div className="text-center py-24 flex flex-col items-center">
                    <div className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-primary/20">
                        <HeartHandshake className="h-10 w-10 text-primary opacity-40" />
                    </div>
                    <h3 className="text-xl font-black font-headline uppercase tracking-tight">Your Harvest Field</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-[280px] leading-relaxed font-medium italic opacity-60">The souls you lead to Christ will appear here for collaborative discipleship and strategic follow-up.</p>
                </div>
            </CardContent>
        </Card>
    );
  }

  if (isMobile) {
      return (
        <div className="space-y-px">
            {souls.map((soul) => (
                <SoulCard key={soul.id} soul={soul} onFollowUp={onFollowUp} onViewHistory={onViewHistory} onExportSingle={onExportSingle} onOpenAssignDialog={onOpenAssignDialog} onEdit={onEdit} onDelete={onDelete} onAssess={onAssess} />
            ))}
        </div>
      )
  }

  return (
    <Card className="rounded-none sm:rounded-[2rem] border-x-0 sm:border-x shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="p-8 border-b bg-muted/5">
        <CardTitle className="text-2xl font-black font-headline tracking-tight flex items-center gap-3 uppercase">
            <Heart className="h-6 w-6 text-primary fill-current" />
            Harvest Dashboard
        </CardTitle>
        <CardDescription className="text-base font-medium">Keep track of the spiritual development and community integration of every convert.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/10">
            <TableRow className="hover:bg-transparent">
              <TableHead className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Soul Identity</TableHead>
              <TableHead className="hidden md:table-cell p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contact</TableHead>
              <TableHead className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
              <TableHead className="hidden lg:table-cell p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Placements</TableHead>
              <TableHead className="hidden sm:table-cell p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Latest Log</TableHead>
              <TableHead className="hidden md:table-cell p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date Won</TableHead>
              <TableHead className="hidden xl:table-cell p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Source</TableHead>
              <TableHead className="p-4 text-right"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {souls.map((soul) => (
              <SoulTableRow key={soul.id} soul={soul} onFollowUp={onFollowUp} onViewHistory={onViewHistory} onExportSingle={onExportSingle} onOpenAssignDialog={onOpenAssignDialog} onEdit={onEdit} onDelete={onDelete} onAssess={onAssess} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
