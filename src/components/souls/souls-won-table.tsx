'use client';

import * as React from "react";
import { format } from "date-fns";
import { 
  MoreHorizontal, 
  Church, 
  MapPin, 
  Phone, 
  Download, 
  HeartHandshake, 
  Edit, 
  Trash2, 
  Users, 
  History, 
  Heart, 
  Sparkles,
  ArrowRight,
  ClipboardList,
  Zap,
  ShieldCheck,
  Target,
  Mail,
  ArrowLeft,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import type { Soul, FollowUpStatus, UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Skeleton } from "../ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, safeToDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { actionItems } from "@/lib/follow-up-data";
import Link from "next/link";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import Image from 'next/image';
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { MutualConnectBadge } from "./mutual-connect-badge";

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

const getSoulAddress = (soul: Soul) => {
  const loc = soul.locationWon;
  if (!loc) return '';
  return [loc.street, loc.city, loc.state, loc.country].filter(Boolean).join(', ');
};

function SoulProfileContent({ 
  soul, 
  onFollowUp,
  onViewHistory,
  onEdit,
  onAssess,
  onOpenAssignDialog,
  onExportSingle,
  onDelete
}: { 
  soul: Soul; 
  onFollowUp: (s: Soul) => void;
  onViewHistory: (s: Soul) => void;
  onEdit: (s: Soul) => void;
  onAssess: (s: Soul) => void;
  onOpenAssignDialog: (s: Soul) => void;
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
  onDelete: (s: Soul) => void;
}) {
  const address = getSoulAddress(soul);
  const needs = soul.needsAssessment;

  const sortedHistory = React.useMemo(() => {
    if (!soul.followUpLog || soul.followUpLog.length === 0) return [];
    return [...soul.followUpLog].sort((a, b) => {
      const dateB = safeToDate(b.date)?.getTime() ?? 0;
      const dateA = safeToDate(a.date)?.getTime() ?? 0;
      return dateB - dateA;
    });
  }, [soul.followUpLog]);

  return (
    <div className="space-y-6 text-left">
      <Card className="rounded-none sm:rounded-[2rem] overflow-hidden border-none shadow-2xl bg-card/50 backdrop-blur-sm border-t-8 border-t-primary/20 text-left">
        <CardHeader className="p-8 pb-4 text-center text-left">
            <div className="relative inline-block mx-auto mb-4 text-left">
                <Dialog>
                    <DialogTrigger asChild disabled={!soul.photoURL}>
                        <Avatar className={cn("h-48 w-48 border-4 border-background shadow-xl ring-2 ring-primary/10 transition-all active:scale-95 text-left", soul.photoURL && "cursor-pointer hover:scale-105")}>
                            <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                            <AvatarFallback className="text-3xl font-black bg-primary/10 text-primary text-left">{soul.firstName?.charAt(0) || soul.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </DialogTrigger>
                    {soul.photoURL && (
                        <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-left">
                            <DialogHeader className="sr-only text-left"><DialogTitle className="text-left">Soul Photo</DialogTitle></DialogHeader>
                            <div className="relative h-full w-full flex items-center justify-center p-4 text-left">
                                <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-left">
                                    <Image src={soul.photoURL} alt={soul.firstName} fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized />
                                </div>
                            </div>
                        </DialogContent>
                    )}
                </Dialog>
                {address && (
                    <Button 
                        size="icon" 
                        className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full shadow-lg border-2 border-background text-left"
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')}
                        title="View Map"
                    >
                        <MapPin className="h-5 w-5 text-left" />
                    </Button>
                )}
            </div>
            <div className="flex flex-col items-center gap-2 text-left">
                <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-center sm:text-left truncate w-full">{soul.nickname || `${soul.firstName} ${soul.lastName}`}</CardTitle>
                <div className="flex gap-2 justify-center text-left items-center">
                    <Badge className={cn("h-5 px-2 text-[9px] uppercase font-black tracking-widest justify-center text-left", getStatusClasses(soul.status))} variant="outline">
                        {soul.status}
                    </Badge>
                    <MutualConnectBadge soul={soul} />
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-8 pt-0 space-y-6 text-left">
            <Separator className="opacity-50 text-left" />
            
            <div className="space-y-4 text-left">
                <div className="flex items-center justify-between text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Spiritual Identity</p>
                    <div className="flex items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10">
                                    <Download className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl">
                                <DropdownMenuItem onSelect={() => onExportSingle(soul, 'csv')}>CSV Export</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => onExportSingle(soul, 'pdf')}>PDF Report</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left" onClick={() => onEdit(soul)}>
                            <Edit className="h-4 w-4 text-left" />
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-1 text-left">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Full Name</p>
                        <p className="text-[11px] sm:text-xs font-bold truncate capitalize text-left">{soul.firstName} {soul.lastName}</p>
                    </div>
                    <div className="space-y-1 text-left">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Gender/Age</p>
                        <p className="text-[11px] sm:text-xs font-bold text-left">{soul.gender || 'N/A'} • {soul.age ? `${soul.age} yrs` : 'Age N/A'}</p>
                    </div>
                </div>
            </div>

            <Separator className="opacity-20 text-left" />

            <div className="space-y-3 text-left">
                <div className="flex items-center justify-between text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Contact Identity</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left" onClick={() => onEdit(soul)}>
                        <Edit className="h-4 w-4 text-left" />
                    </Button>
                </div>
                <div className="space-y-2 text-left">
                    {soul.phone ? (
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-foreground text-left">
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0 text-left" />
                            {soul.phone}
                        </div>
                    ) : (
                        <p className="text-[9px] text-muted-foreground/40 italic text-left">No phone recorded</p>
                    )}
                    {soul.email && (
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-foreground text-left">
                            <Mail className="h-3.5 w-3.5 text-primary shrink-0 text-left" />
                            {soul.email}
                        </div>
                    )}
                </div>
            </div>

            <Separator className="opacity-20 text-left" />

            <div className="space-y-4 text-left">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Harvest Context</p>
                <div className="space-y-1 text-left">
                    <p className="text-[11px] sm:text-xs font-bold flex items-center gap-1.5 truncate text-left">
                        <Target className="h-3 w-3 text-primary text-left" />
                        Source: {soul.source}
                    </p>
                </div>
            </div>

            <Separator className="opacity-20 text-left" />

            <div className="space-y-4 text-left">
                <div className="flex items-center justify-between text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Kingdom Placement</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left" onClick={() => onOpenAssignDialog(soul)}>
                        <Edit className="h-4 w-4 text-left" />
                    </Button>
                </div>
                <div className="space-y-3 text-left">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-primary/5 border border-primary/10 text-left">
                        <HeartHandshake className="h-4 w-4 text-primary shrink-0 text-left" />
                        <div className="min-w-0 text-left">
                            <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Fellowship</p>
                            <p className="text-[11px] sm:text-xs font-bold truncate capitalize text-left">{soul.fellowshipName || 'No Fellowship'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-blue-500/5 border border-blue-500/10 text-left">
                        <Users className="h-4 w-4 text-blue-500 shrink-0 text-left" />
                        <div className="min-w-0 text-left">
                            <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Association</p>
                            <p className="text-[11px] sm:text-xs font-bold truncate capitalize text-left">{soul.associationName || 'No Association'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <Separator className="opacity-20 text-left" />

            <div className="space-y-4 text-left">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Spiritual Milestones</p>
                <div className="grid grid-cols-2 gap-2 text-left">
                    {[
                        { label: 'Church', val: soul.attendingChurch, icon: Church },
                        { label: 'Word Study', val: soul.inBibleStudy, icon: BookOpen },
                        { label: 'Prayer', val: soul.attendingPrayer, icon: Zap },
                        { label: 'Service', val: soul.inServiceDepartment, icon: ShieldCheck },
                    ].map(milestone => (
                        <div key={milestone.label} className={cn(
                            "flex items-center gap-2 p-2 rounded-xl border transition-all text-left",
                            milestone.val ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/10 border-transparent text-muted-foreground/40"
                        )}>
                            <milestone.icon className="h-3 w-3 text-left" />
                            <span className="text-[10px] font-black uppercase tracking-tight text-left">{milestone.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Interaction History Section */}
            <Separator className="opacity-20 text-left" />
            <div className="space-y-4 text-left">
                <div className="flex items-center justify-between text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2 text-left">
                        <History className="h-3.5 w-3.5 text-left" /> Interaction History
                    </p>
                    <Button variant="ghost" className="h-6 text-[8px] font-black uppercase text-primary hover:bg-primary/5" onClick={() => onViewHistory(soul)}>
                        View All
                    </Button>
                </div>
                <div className="space-y-4 pl-1 text-left">
                    {sortedHistory.length > 0 ? (
                        sortedHistory.slice(0, 3).map((log, index) => {
                            const date = safeToDate(log.date);
                            return (
                                <div key={index} className="relative pl-4 border-l-2 border-primary/20 text-left">
                                    <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest mb-1 text-left">
                                        {date ? format(date, "MMM d, yyyy") : 'Recently'}
                                        {log.memberName && <span className="ml-2 text-primary/40">• By {log.memberName.split(' ')[0]}</span>}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 italic text-left">
                                        &ldquo;{log.note || 'Interaction logged.'}&rdquo;
                                    </p>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-4 text-center border border-dashed rounded-xl bg-muted/5">
                            <p className="text-sm text-muted-foreground/40 italic">No interactions recorded.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3 p-5 bg-muted/20 rounded-[2rem] border-2 border-dashed border-primary/10 shadow-inner text-left">
                <div className="flex items-center justify-between text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-1 text-left">
                        <ClipboardList className="h-3.5 w-3.5 text-left" /> Assessed Needs
                    </p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left" onClick={() => onAssess(soul)}>
                        <Edit className="h-4 w-4 text-left" />
                    </Button>
                </div>
                {needs ? (
                    <div className="space-y-4 text-left">
                        {needs.generalImpression && <p className="text-xs text-muted-foreground italic leading-relaxed text-balance text-left">&ldquo;{needs.generalImpression}&rdquo;</p>}
                        
                        <div className="grid grid-cols-2 gap-3 text-left">
                            {needs.emotionalNeeds && (
                                <div className="space-y-1 text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-red-500/10 text-red-600 border-none px-1.5 uppercase font-black text-left">Emotional</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left">{needs.emotionalNeeds}</p>
                                </div>
                            )}
                            {needs.physicalNeeds && (
                                <div className="space-y-1 text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-amber-500/10 text-amber-600 border-none px-1.5 uppercase font-black text-left">Physical</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left">{needs.physicalNeeds}</p>
                                </div>
                            )}
                            {needs.financialNeeds && (
                                <div className="space-y-1 text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-green-500/10 text-green-600 border-none px-1.5 uppercase font-black text-left">Financial</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left">{needs.financialNeeds}</p>
                                </div>
                            )}
                            {needs.socialNeeds && (
                                <div className="space-y-1 text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-indigo-500/10 text-indigo-600 border-none px-1.5 uppercase font-black text-left">Social</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left">{needs.socialNeeds}</p>
                                </div>
                            )}
                        </div>

                        {needs.followUpPlan && (
                            <div className="pt-2 border-t border-primary/10 text-left">
                                <p className="text-[8px] font-black uppercase text-primary/60 mb-1 flex items-center gap-1.5 text-left">
                                    <Target className="h-2.5 w-2.5 text-left" /> Strategy
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed italic text-left">{needs.followUpPlan}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-4 text-center text-left">
                        <Button variant="outline" size="sm" className="h-8 rounded-xl text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 text-left" onClick={() => onAssess(soul)}>
                            BEGIN ASSESSMENT
                        </Button>
                    </div>
                )}
            </div>

            <div className="pt-2 text-left space-y-3">
                <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 text-left" onClick={() => onFollowUp(soul)}>
                    LOG FOLLOW-UP
                </Button>
                <Button variant="ghost" className="w-full h-11 text-destructive font-bold uppercase tracking-widest text-[10px]" onClick={() => onDelete(soul)}>
                    <Trash2 className="mr-2 h-4 w-4" /> DELETE RECORD
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

const SoulCard = React.memo(({ soul, onClick }: { 
  soul: Soul; 
  onClick: () => void;
}) => {
    return (
        <Card onClick={onClick} className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-b-2 sm:border-b shadow-none bg-card/50 backdrop-blur-sm transition-all duration-300 cursor-pointer hover:bg-primary/[0.02] text-left">
            <div className="flex items-center justify-between p-4 gap-4 text-left">
                <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                    <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 transition-transform active:scale-95 text-left")}>
                        <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-left">
                            {soul.firstName?.charAt(0) || 'S'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2 text-left flex-wrap">
                            <p className="font-bold truncate text-[13px] sm:text-base leading-tight capitalize tracking-tight text-left">
                              {soul.firstName || 'Unknown'} {soul.lastName || ''}
                            </p>
                            <MutualConnectBadge soul={soul} />
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center mt-1.5 text-left">
                            <Badge className={cn("h-5 px-1.5 text-[9px] uppercase font-black tracking-widest text-left", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                            {soul.fellowshipName && <Badge variant="secondary" className="h-5 px-1.5 text-[8px] uppercase font-black tracking-tighter bg-primary/5 text-primary border-primary/20 shrink-0 text-left">Fellowship</Badge>}
                        </div>
                    </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-20 text-left" />
            </div>
        </Card>
    );
});
SoulCard.displayName = "SoulCard";

const SoulTableRow = React.memo(({ soul, isSelected, onSelect }: { 
  soul: Soul; 
  isSelected: boolean;
  onSelect: () => void;
}) => {
    return (
        <TableRow 
            className={cn("border-b hover:bg-muted/30 transition-colors cursor-pointer text-left", isSelected && "bg-primary/[0.03]")}
            onClick={() => onSelect()}
        >
            <TableCell className="font-medium p-4 text-left">
                <div className="flex items-center gap-4 text-left">
                    <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 text-left")}>
                        <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-left">
                            {soul.firstName?.charAt(0) || 'S'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2 text-left">
                            <div className="font-black text-[13px] sm:text-sm md:text-base truncate capitalize tracking-tight text-left">
                              {soul.firstName} {soul.lastName}
                            </div>
                            <MutualConnectBadge soul={soul} />
                        </div>
                        {soul.church && <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 font-medium truncate opacity-70 text-left"><Church className="h-3 w-3 shrink-0 text-left" />{soul.church}</div>}
                    </div>
                </div>
            </TableCell>
            <TableCell className="md:hidden p-4 text-left">
                 <Badge className={cn("h-5 px-1.5 text-[9px] uppercase font-black tracking-widest text-left", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
            </TableCell>
        </TableRow>
    );
});
SoulTableRow.displayName = "SoulTableRow";

export function SoulsWonTable({ souls, loading, selectedId, onSelect, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit, onDelete, onAssess }: {
  souls: Soul[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
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

  React.useEffect(() => { 
    setMounted(true); 
  }, []);

  const selectedSoul = React.useMemo(() => 
    souls.find(s => s.id === selectedId) || null
  , [souls, selectedId]);

  if (loading || !mounted) {
    return (
        <div className="space-y-4 text-left">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border-b last:border-0 bg-card/50 backdrop-blur-sm rounded-xl text-left">
                    <Skeleton className="h-12 w-12 rounded-full text-left" />
                    <div className="space-y-2 flex-1 text-left"><Skeleton className="h-5 w-3/4 text-left" /><Skeleton className="h-4 w-1/2 text-left" /></div>
                    <Skeleton className="h-9 w-24 rounded-xl text-left" />
                </div>
            ))}
        </div>
    )
  }
  
  if (souls.length === 0) {
    return (
        <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm border-2 border-dashed text-left">
            <CardContent className="text-left">
                <div className="text-center py-24 flex flex-col items-center text-left">
                    <div className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-primary/20 text-left">
                        <HeartHandshake className="h-10 w-10 text-primary opacity-40 text-left" />
                    </div>
                    <h3 className="text-xl font-black font-headline uppercase tracking-tight text-left">Your Harvest Field</h3>
                    <p className="text-sm text-muted-foreground italic font-medium max-w-[280px] leading-relaxed opacity-60 text-balance text-center text-left">The souls you lead to Christ will appear here for collaborative discipleship and strategic follow-up.</p>
                </div>
            </CardContent>
        </Card>
    );
  }

  if (isMobile) {
      return (
        <div className="space-y-px text-left">
            {souls.map((soul) => (
                <SoulCard key={soul.id} soul={soul} onClick={() => onSelect(soul.id)} />
            ))}
            <Sheet open={isMobile && !!selectedId} onOpenChange={(open) => !open && onSelect(null)}>
                <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                        <SheetHeader className="text-left flex-shrink-0 text-left">
                            <div className="flex items-center gap-2 mb-2 text-left">
                                <Sparkles className="h-4 w-4 text-primary text-left" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Identity Hub</span>
                            </div>
                            <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">
                                {selectedSoul?.nickname ? `Profile: ${selectedSoul.nickname}` : "Kingdom Identity Profile"}
                            </SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1 text-left">Full spiritual snapshot for the harvest workforce.</SheetDescription>
                        </SheetHeader>
                    </div>
                    <ScrollArea className="flex-grow min-h-0 text-left">
                        <div className="p-6 pb-24 text-left">
                            {selectedSoul && (
                              <SoulProfileContent 
                                soul={selectedSoul} 
                                onFollowUp={onFollowUp} 
                                onViewHistory={onViewHistory}
                                onEdit={onEdit} 
                                onAssess={onAssess} 
                                onOpenAssignDialog={onOpenAssignDialog} 
                                onExportSingle={onExportSingle} 
                                onDelete={onDelete}
                              />
                            )}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </div>
      )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start text-left">
        <Card className="rounded-none sm:rounded-[2rem] border-x-0 sm:border-x shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden flex-1 w-full text-left">
            <CardHeader className="p-8 border-b bg-muted/5 text-left">
                <CardTitle className="text-2xl font-black font-headline tracking-tight flex items-center gap-3 uppercase text-left">
                    <Heart className="h-6 w-6 text-primary fill-current text-left" />
                    Harvest Dashboard
                </CardTitle>
                <CardDescription className="text-base font-medium text-left">Keep track of spiritual development and community integration.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 text-left">
                <div className="overflow-x-auto text-left">
                    <Table className="text-left">
                    <TableHeader className="bg-muted/10 text-left">
                        <TableRow className="hover:bg-transparent text-left">
                            <TableHead className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Soul Identity</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="text-left">
                        {souls.map((soul) => (
                        <SoulTableRow 
                            key={soul.id} 
                            soul={soul} 
                            isSelected={selectedId === soul.id}
                            onSelect={() => onSelect(soul.id)}
                        />
                        ))}
                    </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        {/* Desktop Detailed Preview Panel */}
        <div className="hidden lg:block w-[320px] shrink-0 sticky top-24 text-left">
            <AnimatePresence mode="wait">
                {selectedSoul ? (
                    <motion.div
                        key={selectedSoul.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6 text-left"
                    >
                        <SoulProfileContent 
                          soul={selectedSoul} 
                          onFollowUp={onFollowUp} 
                          onViewHistory={onViewHistory}
                          onEdit={onEdit} 
                          onAssess={onAssess} 
                          onOpenAssignDialog={onOpenAssignDialog} 
                          onExportSingle={onExportSingle} 
                          onDelete={onDelete}
                        />
                        <p className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.3em] text-center text-left text-left">
                            {selectedSoul.nickname ? `Profile: ${selectedSoul.nickname}` : "Kingdom Identity Profile"}
                        </p>
                    </motion.div>
                ) : (
                    <div className="text-center py-20 px-8 border-2 border-dashed rounded-[2rem] bg-muted/5 text-left">
                        <Users className="h-10 w-10 text-muted-foreground opacity-10 mx-auto mb-4 text-left" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center text-balance text-left">Select a record to preview identity</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    </div>
  );
}
