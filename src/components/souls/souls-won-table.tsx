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
  ClipboardList,
  Zap,
  ShieldCheck,
  Info,
  Target,
  Mail,
  ArrowLeft,
  CalendarDays,
  BookOpen,
  Banknote,
  Plus
} from "lucide-react";
import type { Soul, FollowUpStatus, UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Skeleton } from "../ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, safeToDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { actionItems } from "@/lib/follow-up-data";
import { Label } from "../ui/label";
import Link from "next/link";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import Image from 'next/image';
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  onEdit,
  onAssess,
  onOpenAssignDialog
}: { 
  soul: Soul; 
  onFollowUp: (s: Soul) => void;
  onEdit: (s: Soul) => void;
  onAssess: (s: Soul) => void;
  onOpenAssignDialog: (s: Soul) => void;
}) {
  const address = getSoulAddress(soul);
  const needs = soul.needsAssessment;
  const wonAt = safeToDate(soul.wonAt);

  return (
    <div className="space-y-6">
      <Card className="rounded-none sm:rounded-[2rem] overflow-hidden border-none shadow-2xl bg-card/50 backdrop-blur-sm border-t-8 border-t-primary/20">
        <CardHeader className="p-8 pb-4 text-center">
            <div className="relative inline-block mx-auto mb-4">
                <Dialog>
                    <DialogTrigger asChild onClick={(e) => e.stopPropagation()} disabled={!soul.photoURL}>
                        <Avatar className={cn("h-48 w-48 border-4 border-background shadow-xl ring-2 ring-primary/10 transition-transform active:scale-95", soul.photoURL && "cursor-pointer hover:scale-105")}>
                            <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                            <AvatarFallback className="text-3xl font-black bg-primary/10 text-primary">{soul.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </DialogTrigger>
                    {soul.photoURL && (
                        <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center">
                            <DialogHeader className="sr-only"><DialogTitle>Soul Photo</DialogTitle></DialogHeader>
                            <div className="relative h-full w-full flex items-center justify-center p-4">
                                <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center">
                                    <Image src={soul.photoURL} alt={soul.firstName} fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized />
                                </div>
                            </div>
                        </DialogContent>
                    )}
                </Dialog>
                {address && (
                    <Button 
                        size="icon" 
                        className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full shadow-lg border-2 border-background"
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')}
                        title="View Map"
                    >
                        <MapPin className="h-5 w-5" />
                    </Button>
                )}
            </div>
            <div className="flex flex-col items-center gap-2">
                <CardTitle className="text-xl font-black uppercase tracking-tight">{soul.firstName} {soul.lastName}</CardTitle>
                <div className="flex gap-2">
                    <Badge className={cn("h-5 px-2 text-[9px] uppercase font-black tracking-widest justify-center", getStatusClasses(soul.status))} variant="outline">
                        {soul.status}
                    </Badge>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-8 pt-0 space-y-6">
            <Separator className="opacity-50" />
            
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Spiritual Identity</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-primary hover:bg-primary/10" onClick={() => onEdit(soul)}>
                        <Edit className="h-3.5 w-3.5" />
                    </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-1">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Full Name</p>
                        <p className="text-xs font-bold truncate capitalize">{soul.firstName} {soul.lastName}</p>
                    </div>
                    {soul.nickname && (
                        <div className="space-y-1">
                            <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Nickname</p>
                            <p className="text-xs font-bold truncate capitalize">{soul.nickname}</p>
                        </div>
                    )}
                    <div className="space-y-1">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Gender/Age</p>
                        <p className="text-xs font-bold">{soul.gender || 'N/A'} • {soul.age ? `${soul.age} yrs` : 'Age N/A'}</p>
                    </div>
                    {soul.nationality && (
                        <div className="space-y-1">
                            <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Nationality</p>
                            <p className="text-xs font-bold truncate">{soul.nationality}</p>
                        </div>
                    )}
                </div>
            </div>

            <Separator className="opacity-20" />

            <div className="space-y-3 text-left">
                <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Contact Identity</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-primary hover:bg-primary/10" onClick={() => onEdit(soul)}>
                        <Edit className="h-3.5 w-3.5" />
                    </Button>
                </div>
                <div className="space-y-2">
                    {soul.email ? (
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground truncate">
                            <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                            {soul.email}
                        </div>
                    ) : null}
                    {soul.phone ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                            {soul.phone}
                        </div>
                    ) : (
                        <p className="text-[9px] text-muted-foreground/40 italic">No contact details recorded</p>
                    )}
                </div>
            </div>

            <Separator className="opacity-20" />

            <div className="space-y-4 text-left">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Mission Logistics</p>
                <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-muted/20 border border-dashed space-y-2">
                        <div className="flex items-start gap-2 text-left">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Location Won</p>
                                <p className="text-xs font-bold leading-snug break-words capitalize">{address || 'Global Network'}</p>
                                {soul.locationWon?.landmark && <p className="text-[10px] text-primary/60 mt-1 italic font-medium break-words capitalize">Near: {soul.locationWon.landmark}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Harvest Source</p>
                            <p className="text-xs font-bold flex items-center gap-1.5 truncate">
                                <Target className="h-3 w-3 text-primary" />
                                {soul.source}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Date Won</p>
                            <p className="text-xs font-bold flex items-center gap-1.5 truncate">
                                <CalendarDays className="h-3 w-3 text-primary" />
                                {wonAt ? format(wonAt, 'MMM d, yyyy') : 'Recently'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Separator className="opacity-20" />

            <div className="space-y-4 text-left">
                <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Kingdom Placement</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-primary hover:bg-primary/10" onClick={() => onOpenAssignDialog(soul)}>
                        <Edit className="h-3.5 w-3.5" />
                    </Button>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-primary/5 border border-primary/10">
                        <HeartHandshake className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest">Fellowship</p>
                            <p className="text-xs font-bold truncate capitalize">{soul.fellowshipName || 'Awaiting Placement'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-blue-500/5 border border-blue-500/10">
                        <Group className="h-4 w-4 text-blue-500 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest">Association</p>
                            <p className="text-xs font-bold truncate capitalize">{soul.associationName || 'Awaiting Placement'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <Separator className="opacity-20" />

            <div className="space-y-4 text-left">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Spiritual Milestones</p>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'Church', val: soul.attendingChurch, icon: Church },
                        { label: 'Word Study', val: soul.inBibleStudy, icon: BookOpen },
                        { label: 'Prayer', val: soul.attendingPrayer, icon: Zap },
                        { label: 'Service', val: soul.inServiceDepartment, icon: ShieldCheck },
                    ].map(milestone => (
                        <div key={milestone.label} className={cn(
                            "flex items-center gap-2 p-2 rounded-xl border transition-all",
                            milestone.val ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/10 border-transparent text-muted-foreground/40"
                        )}>
                            <milestone.icon className="h-3 w-3" />
                            <span className="text-[10px] font-black uppercase tracking-tight">{milestone.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-3 p-5 bg-muted/20 rounded-[2rem] border-2 border-dashed border-primary/10 shadow-inner text-left">
                <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-1 text-left">
                        <ClipboardList className="h-3.5 w-3.5" /> Assessed Needs
                    </p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-primary hover:bg-primary/10" onClick={() => onAssess(soul)}>
                        <Edit className="h-3.5 w-3.5" />
                    </Button>
                </div>
                {needs ? (
                    <div className="space-y-4 text-left">
                        {needs.generalImpression && <p className="text-xs text-muted-foreground italic leading-relaxed text-balance text-left">&ldquo;{needs.generalImpression}&rdquo;</p>}
                        
                        <div className="space-y-3">
                            {needs.emotionalNeeds && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[7px] h-4 bg-red-500/10 text-red-600 border-none px-1.5 uppercase font-black">Emotional</Badge>
                                        <Heart className="h-3 w-3 text-red-500" />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground pl-1 font-medium leading-relaxed">{needs.emotionalNeeds}</p>
                                </div>
                            )}
                            {needs.physicalNeeds && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[7px] h-4 bg-amber-500/10 text-amber-600 border-none px-1.5 uppercase font-black">Physical</Badge>
                                        <Zap className="h-3 w-3 text-amber-500" />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground pl-1 font-medium leading-relaxed">{needs.physicalNeeds}</p>
                                </div>
                            )}
                            {needs.financialNeeds && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[7px] h-4 bg-green-500/10 text-green-600 border-none px-1.5 uppercase font-black">Financial</Badge>
                                        <Banknote className="h-3 w-3 text-green-600" />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground pl-1 font-medium leading-relaxed">{needs.financialNeeds}</p>
                                </div>
                            )}
                            {needs.socialNeeds && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[7px] h-4 bg-indigo-500/10 text-indigo-600 border-none px-1.5 uppercase font-black">Social</Badge>
                                        <Users className="h-3 w-3 text-indigo-600" />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground pl-1 font-medium leading-relaxed">{needs.socialNeeds}</p>
                                </div>
                            )}
                            {needs.otherNeeds && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[7px] h-4 bg-slate-500/10 text-slate-600 border-none px-1.5 uppercase font-black">Other</Badge>
                                        <Info className="h-3 w-3 text-slate-500" />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground pl-1 font-medium leading-relaxed">{needs.otherNeeds}</p>
                                </div>
                            )}
                        </div>

                        {needs.followUpPlan && (
                            <div className="pt-2 border-t border-primary/10 text-left">
                                <p className="text-[8px] font-black uppercase text-primary/60 mb-1 flex items-center gap-1.5">
                                    <Target className="h-2.5 w-2.5" /> Strategy
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed italic">{needs.followUpPlan}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-2">
                        <Button variant="ghost" size="sm" className="h-9 text-[9px] font-black uppercase border-2 border-primary/20 text-primary w-full rounded-xl hover:bg-primary/5" onClick={() => onAssess(soul)}>
                            BEGIN ASSESSMENT
                        </Button>
                    </div>
                )}
            </div>

            <div className="pt-2">
                <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20" onClick={() => onFollowUp(soul)}>
                    LOG INTERACTION
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
        <Card onClick={onClick} className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-b-2 sm:border-b shadow-none bg-card/50 backdrop-blur-sm transition-all duration-300 cursor-pointer hover:bg-primary/[0.02]">
            <div className="flex items-center justify-between p-4 gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                    <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 transition-transform active:scale-95")}>
                        <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xs">
                            {soul.firstName?.charAt(0) || 'S'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-left">
                        <p className="font-bold truncate text-sm sm:text-base leading-tight capitalize tracking-tight">
                          {soul.firstName || 'Unknown'} {soul.lastName || ''}
                        </p>
                        <div className="flex flex-wrap gap-1.5 items-center mt-1.5">
                            <Badge className={cn("h-5 px-1.5 text-[9px] uppercase font-black tracking-widest", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                            {soul.fellowshipName && <Badge variant="secondary" className="h-5 px-1.5 text-[8px] uppercase font-black tracking-tighter bg-primary/5 text-primary border-primary/20">Fellowship</Badge>}
                        </div>
                    </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-20" />
            </div>
        </Card>
    );
});
SoulCard.displayName = "SoulCard";

const SoulTableRow = React.memo(({ soul, isSelected, onSelect, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit, onDelete, onAssess }: { 
  soul: Soul; 
  isSelected: boolean;
  onSelect: () => void;
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

    const latestFollowUpDate = latestFollowUp ? safeToDate(latestFollowUp.date) : null;

    return (
        <TableRow 
            className={cn("hover:bg-muted/30 transition-colors cursor-pointer", isSelected && "bg-primary/[0.03]")}
            onClick={() => onSelect()}
        >
            <TableCell className="font-medium p-4">
                <div className="flex items-center gap-4 text-left">
                    <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0")}>
                        <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xs">
                            {soul.firstName?.charAt(0) || 'S'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-left">
                        <div className="font-black text-sm sm:text-base truncate capitalize tracking-tight text-left">
                          {soul.firstName} {soul.lastName}
                        </div>
                        {soul.church && <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 font-medium truncate opacity-70"><Church className="h-3 w-3 shrink-0" />{soul.church}</div>}
                    </div>
                </div>
            </TableCell>
            <TableCell className="hidden md:table-cell p-4">{soul.phone && <div className="text-xs font-bold text-muted-foreground">{soul.phone}</div>}</TableCell>
            <TableCell className="p-4"><Badge className={cn("w-[110px] justify-center text-[10px] uppercase font-black tracking-widest leading-none h-6", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge></TableCell>
            <TableCell className="hidden lg:table-cell p-4">
                <div className="space-y-1.5 text-left">
                    {soul.fellowshipName ? (
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary leading-none text-left">
                            <HeartHandshake className="h-3 w-3 shrink-0" />
                            {soul.fellowshipName}
                        </div>
                    ) : null}
                    {soul.associationName ? (
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-blue-500 leading-none text-left">
                            <Group className="h-3 w-3 shrink-0" />
                            {soul.associationName}
                        </div>
                    ) : null}
                </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell p-4">
                {latestFollowUpDate ? (
                    <div className="text-[10px] space-y-1 text-left">
                        <div className="text-muted-foreground font-black uppercase tracking-widest">{format(latestFollowUpDate, "MMM d, yyyy")}</div>
                    </div>
                ) : <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-20">—</span>}
            </TableCell>
            <TableCell className="p-4 text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}><Button size="icon" variant="ghost" className="h-8 w-8 rounded-full"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl text-left">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-black px-4 py-2">Soul Control</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => onEdit(soul)} className="rounded-lg">
                            <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onAssess(soul)} className="rounded-lg">
                            <ClipboardList className="mr-2 h-4 w-4 text-primary" /> Assess Needs
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onFollowUp(soul)} className="rounded-lg">
                            <HeartHandshake className="mr-2 h-4 w-4 text-primary" /> Log Follow-up
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onViewHistory(soul)} className="rounded-lg">
                            <History className="mr-2 h-4 w-4" /> Interaction History
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onOpenAssignDialog(soul)} className="rounded-lg">
                            <Users className="mr-2 h-4 w-4" /> Assign Community
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="rounded-lg"><Download className="mr-2 h-4 w-4" /> Export Report</DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent className="rounded-xl">
                                    <DropdownMenuItem onSelect={() => onExportSingle(soul, 'csv')} className="rounded-lg">CSV (Excel)</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => onExportSingle(soul, 'pdf')} className="rounded-lg">PDF Document</DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg" onSelect={() => onDelete(soul)}>
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
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => { 
    setMounted(true); 
    if (souls.length > 0 && !selectedId && !isMobile) {
        setSelectedId(souls[0].id);
    }
  }, [souls, isMobile, selectedId]);

  const selectedSoul = React.useMemo(() => 
    souls.find(s => s.id === selectedId) || null
  , [souls, selectedId]);

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
        <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm border-2 border-dashed">
            <CardContent>
                <div className="text-center py-24 flex flex-col items-center">
                    <div className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-primary/20">
                        <HeartHandshake className="h-10 w-10 text-primary opacity-40" />
                    </div>
                    <h3 className="text-xl font-black font-headline uppercase tracking-tight">Your Harvest Field</h3>
                    <p className="text-sm text-muted-foreground italic font-medium max-w-[280px] leading-relaxed opacity-60 text-balance text-center">The souls you lead to Christ will appear here for collaborative discipleship and strategic follow-up.</p>
                </div>
            </CardContent>
        </Card>
    );
  }

  if (isMobile) {
      return (
        <div className="space-y-px text-left">
            {souls.map((soul) => (
                <SoulCard key={soul.id} soul={soul} onClick={() => setSelectedId(soul.id)} />
            ))}
            <Sheet open={isMobile && !!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
                <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                        <SheetHeader className="text-left flex-shrink-0 text-left">
                            <div className="flex items-center gap-2 mb-2 text-left">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Identity Hub</span>
                            </div>
                            <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Kingdom Identity Profile</SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1 text-left text-left">Full spiritual snapshot for the harvest workforce.</SheetDescription>
                        </SheetHeader>
                    </div>
                    <ScrollArea className="flex-grow min-h-0 text-left">
                        <div className="p-6 pb-24 text-left">
                            {selectedSoul && <SoulProfileContent soul={selectedSoul} onFollowUp={onFollowUp} onEdit={onEdit} onAssess={onAssess} onOpenAssignDialog={onOpenAssignDialog} />}
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
                    <Heart className="h-6 w-6 text-primary fill-current" />
                    Harvest Dashboard
                </CardTitle>
                <CardDescription className="text-base font-medium text-left">Keep track of spiritual development and community integration.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 text-left">
                <div className="overflow-x-auto text-left">
                    <Table>
                    <TableHeader className="bg-muted/10">
                        <TableRow className="hover:bg-transparent">
                        <TableHead className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Soul Identity</TableHead>
                        <TableHead className="hidden md:table-cell p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Contact</TableHead>
                        <TableHead className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Status</TableHead>
                        <TableHead className="hidden lg:table-cell p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Placements</TableHead>
                        <TableHead className="hidden sm:table-cell p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Latest Log</TableHead>
                        <TableHead className="p-4 text-right"><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {souls.map((soul) => (
                        <SoulTableRow 
                            key={soul.id} 
                            soul={soul} 
                            isSelected={selectedId === soul.id}
                            onSelect={() => setSelectedId(soul.id)}
                            onFollowUp={onFollowUp} 
                            onViewHistory={onViewHistory} 
                            onExportSingle={onExportSingle} 
                            onOpenAssignDialog={onOpenAssignDialog} 
                            onEdit={onEdit} 
                            onDelete={onDelete} 
                            onAssess={onAssess} 
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
                        <SoulProfileContent soul={selectedSoul} onFollowUp={onFollowUp} onEdit={onEdit} onAssess={onAssess} onOpenAssignDialog={onOpenAssignDialog} />
                        <p className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.3em] text-center">Kingdom Identity Profile</p>
                    </motion.div>
                ) : (
                    <div className="text-center py-20 px-8 border-2 border-dashed rounded-[2rem] bg-muted/5 text-left">
                        <Users className="h-10 w-10 text-muted-foreground opacity-10 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center text-balance">Select a record to preview identity</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    </div>
  );
}
