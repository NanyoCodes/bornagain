'use client';

import * as React from "react";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { format, differenceInMinutes, isSameDay } from "date-fns";
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
  BookOpen, 
  X, 
  Utensils, 
  Home, 
  Gift, 
  Calendar, 
  Send, 
  Share, 
  MessageSquare, 
  Loader2, 
  PlusCircle, 
  BookMarked,
  Check,
  ChevronDown,
  Search,
  XCircle,
  Award,
  Newspaper,
  ImageIcon,
  PlayCircle,
  HandHeart,
  PartyPopper,
  ChevronRight,
  User,
  Smartphone
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import type { Soul, FollowUpStatus, UserProfile, Chat, BibleChapterOutput, MealGiftStatus } from "@/lib/types";
import { useUser, useDoc, useUserProfile, useCollection, useFirestore } from "@/firebase";
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  collection, 
  query, 
  setDoc, 
  serverTimestamp, 
  addDoc, 
  getDoc, 
  getDocs, 
  where,
  writeBatch,
  orderBy,
  deleteDoc
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
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
import { actionItems, prayerTemplates, kingdomVerses } from "@/lib/follow-up-data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { MutualConnectBadge } from "./mutual-connect-badge";
import { useToast } from "@/hooks/use-toast";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { getBibleChapter } from "@/ai/flows/get-bible-chapter-flow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { bibleData } from "@/lib/bible-data";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const iconMap: Record<string, any> = {
    'prayed_together': Sparkles,
    'studied_bible': BookOpen,
    'shared_meal': Utensils,
    'visited_home': Home,
    'introduced_friend': Users,
    'gave_gift': Gift,
    'phone_call': Phone,
    'text_message': MessageSquare,
    'helped_with_need': Heart,
    'invited_to_event': Calendar,
    'matchmaking': HeartHandshake,
};

const getStatusClasses = (status: FollowUpStatus | undefined): string => {
    if (!status) return 'bg-secondary text-secondary-foreground border-border';
    switch (status) {
        case 'New': return 'bg-amber-500/10 text-amber-600 border-amber-200';
        case 'Contacted': return 'bg-blue-500/10 text-blue-600 border-blue-200';
        case 'Established': return 'bg-green-500/10 text-green-600 border-green-200';
        default: return 'bg-secondary text-secondary-foreground border-border';
    }
}

const getSoulAddress = (soul: Soul) => {
  const loc = soul.locationWon;
  if (!loc) return '';
  return [loc.street, loc.city, loc.state, loc.country].filter(Boolean).join(', ');
};

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

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
  const { user } = useUser();
  const firestore = useFirestore();
  const { userProfile: currentUserProfile } = useUserProfile();
  const { toast } = useToast();
  const router = useRouter();

  const [isCommChannelDialogOpen, setIsCommChannelDialogOpen] = React.useState(false);
  const [clickedActionId, setClickedActionId] = React.useState<string | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = React.useState(false);

  const address = getSoulAddress(soul);

  const sortedHistory = React.useMemo(() => {
    if (!soul.followUpLog || soul.followUpLog.length === 0) return [];
    return [...soul.followUpLog].sort((a, b) => {
      const dateB = safeToDate(b.date)?.getTime() ?? 0;
      const dateA = safeToDate(a.date)?.getTime() ?? 0;
      return dateB - dateA;
    });
  }, [soul.followUpLog]);

  const finalizeLog = async (actionId: string, noteAddendum: string = '') => {
    if (!user || !firestore || !soul) return;
    setIsActionSubmitting(true);
    const action = actionItems.find(a => a.id === actionId);
    const batch = writeBatch(firestore);
    const soulRef = doc(firestore, `users/${soul.userId}/souls`, soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);
    const memberName = `${currentUserProfile?.firstName || ''} ${currentUserProfile?.lastName || ''}`.trim() || user.displayName || 'Member';
    const logEntry = { date: new Date(), note: `Logged via Hub: ${action?.label}${noteAddendum ? ` - ${noteAddendum}` : ''}`, actions: [actionId], memberId: user.uid, memberName };
    batch.update(soulRef, { followUpLog: arrayUnion(logEntry), lastUpdatedAt: serverTimestamp() });
    batch.update(globalSoulRef, { followUpLog: arrayUnion(logEntry), lastUpdatedAt: serverTimestamp() });
    try { await batch.commit(); toast({ title: 'Impact Logged' }); }
    catch (err) { errorEmitter.emit('permission-error', new FirestorePermissionError({ path: soulRef.path, operation: 'update' }, user)); }
    finally { setIsActionSubmitting(false); setClickedActionId(null); }
  };

  const handleActionClick = async (actionId: string) => {
    if (!soul) return;
    setClickedActionId(actionId);
    if (['phone_call', 'text_message', 'prayed_together'].includes(actionId) && !soul.phone) { toast({ variant: 'destructive', title: 'Phone Missing' }); return; }
    if (actionId === 'phone_call') { window.location.href = `tel:${soul.phone}`; await finalizeLog(actionId, 'Dialer initiated'); }
    else if (actionId === 'text_message') setIsCommChannelDialogOpen(true);
    else await finalizeLog(actionId);
  };

  const handleCommChoice = (channel: 'whatsapp' | 'sms') => {
      if (!soul?.phone || !clickedActionId) return;
      const cleanPhone = soul.phone.replace(/\+/g, '').replace(/\D/g, '');
      const message = `Hi ${soul.firstName}, God bless you!`;
      if (channel === 'whatsapp') window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
      else window.location.href = `sms:${soul.phone}?body=${encodeURIComponent(message)}`;
      finalizeLog(clickedActionId, `Sent via ${channel.toUpperCase()}`);
      setIsCommChannelDialogOpen(false);
  };

  return (
    <div className="space-y-6 text-left">
      <Card className="rounded-none sm:rounded-[2rem] overflow-hidden border-none shadow-2xl bg-card/50 backdrop-blur-sm border-t-8 border-t-primary/20 text-left">
        <CardHeader className="p-8 pb-4 text-center text-left">
            <div className="relative inline-block mx-auto mb-4 text-left">
                <Avatar className="h-48 w-48 border-4 border-background shadow-xl ring-2 ring-primary/10 text-left">
                    <AvatarImage src={soul.photoURL || undefined} className="object-cover text-left" />
                    <AvatarFallback className="text-3xl font-black bg-primary/10 text-primary text-center flex items-center justify-center w-full h-full text-left">{soul.firstName?.charAt(0)}</AvatarFallback>
                </Avatar>
                {address && <Button size="icon" className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full shadow-lg border-2 border-background text-left" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')} title="View Map"><MapPin className="h-5 w-5 text-left" /></Button>}
            </div>
            <div className="flex flex-col items-center gap-2 text-left">
                <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-center truncate w-full text-left"> {soul.firstName} {soul.lastName}</CardTitle>
                <div className="flex gap-2 justify-center items-center text-left">
                    <Badge className={cn("h-5 px-2 text-[9px] uppercase font-black tracking-widest justify-center text-left", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                    <MutualConnectBadge soul={soul} />
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-8 pt-0 space-y-6 text-left">
            <Separator className="opacity-50 text-left" />
            <div className="space-y-4 text-left">
                <div className="flex items-center justify-between text-left"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Spiritual Identity</p><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left" onClick={() => onEdit(soul)}><Edit className="h-4 w-4 text-left" /></Button></div>
                <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-1 text-left"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Full Name</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize text-left">{soul.firstName} {soul.lastName}</p></div>
                    <div className="space-y-1 text-left"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Gender/Age</p><p className="text-[11px] sm:text-xs font-bold text-left">{soul.gender || 'N/A'} • {soul.age ? `${soul.age} yrs` : 'Age N/A'}</p></div>
                    <div className="space-y-1 text-left"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Relationship</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize text-left">{soul.relationship || 'N/A'}</p></div>
                    <div className="space-y-1 text-left"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Work Status</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize text-left">{soul.workStatus || 'N/A'}</p></div>
                </div>
            </div>
            <Separator className="opacity-20 text-left" />
            
            <div className="space-y-4 text-left">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Relational Actions</p>
                <div className="flex flex-col gap-2 text-left">
                    {actionItems.map(action => {
                        const Icon = iconMap[action.id] || Heart;
                        const isThisProcessing = clickedActionId === action.id && isActionSubmitting;
                        return (
                            <Button key={action.id} variant="outline" className="flex items-center justify-start gap-3 h-12 px-4 rounded-xl border-2 border-transparent bg-muted/20 hover:bg-primary/5 hover:border-primary/10 transition-all group w-full text-left" onClick={() => handleActionClick(action.id)} disabled={isActionSubmitting}>
                                {isThisProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary text-left" /> : <Icon className="h-4 w-4 text-primary text-left" />}
                                <span className="text-xs font-bold uppercase tracking-tight truncate flex-1 text-left">{action.label}</span>
                                <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-100 transition-opacity text-left" />
                            </Button>
                        )
                    })}
                </div>
            </div>

            <Separator className="opacity-20 text-left" />
            <div className="space-y-4 pt-2 text-left">
                <div className="flex items-center justify-between text-left"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2 text-left"><History className="h-3.5 w-3.5 text-left" /> Interaction History</p><Button variant="ghost" className="h-6 text-[8px] font-black uppercase text-primary hover:bg-primary/5 text-left" onClick={() => onViewHistory(soul)}>View All</Button></div>
                <div className="space-y-4 pl-1 text-left">
                    {sortedHistory.length > 0 ? sortedHistory.slice(0, 3).map((log, index) => {
                            const logDate = safeToDate(log.date);
                            return (
                                <div key={index} className="relative pl-4 border-l-2 border-primary/20 text-left">
                                    <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest mb-1 text-left">{logDate ? format(logDate, "MMM d, yyyy") : 'Recently'}{log.memberName && <span className="ml-2 text-primary/40 text-left">• By {log.memberName.split(' ')[0]}</span>}</p>
                                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 italic text-left">&ldquo;{log.note || 'Interaction logged.'}&rdquo;</p>
                                </div>
                            );
                        }) : <div className="py-4 text-center border border-dashed rounded-xl bg-muted/5 text-left"><p className="text-sm text-muted-foreground/40 italic text-left">No interactions recorded.</p></div>
                    }
                </div>
            </div>
            <div className="pt-2 space-y-3 text-left">
                <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 text-left" onClick={() => onFollowUp(soul)}>LOG FOLLOW-UP</Button>
                <Button variant="ghost" className="w-full h-11 text-destructive font-bold uppercase tracking-widest text-[10px] text-left" onClick={() => onDelete(soul)}><Trash2 className="mr-2 h-4 w-4 text-left" /> DELETE RECORD</Button>
            </div>
        </CardContent>
      </Card>

      <Dialog open={isCommChannelDialogOpen} onOpenChange={setIsCommChannelDialogOpen}>
        <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center text-left">
          <DialogHeader className="text-center space-y-2 text-left">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-left">
                  <MessageSquare className="h-7 w-7 text-primary text-left" />
              </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center text-left">Message Hub</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-6 text-left">
            <Button onClick={() => handleCommChoice('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20 text-left"><WhatsAppIcon className="h-5 w-5 text-left" /> WhatsApp</Button>
            <Button onClick={() => handleCommChoice('sms')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5 text-left"><MessageSquare className="h-5 w-5 text-left" /> Standard SMS</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ProfileActionDialog({ 
  soul, 
  isOpen, 
  onOpenChange,
  onFollowUp,
  onViewHistory,
  onEdit,
  onAssess,
  onOpenAssignDialog,
  onExportSingle,
  onDelete,
  onAddChild
}: { 
  soul: Soul | null; 
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onFollowUp: (s: Soul) => void;
  onViewHistory: (s: Soul) => void;
  onEdit: (s: Soul) => void;
  onAssess: (s: Soul) => void;
  onOpenAssignDialog: (s: Soul) => void;
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
  onDelete: (s: Soul) => void;
  onAddChild: (p1: Soul, p2?: Soul | null) => void;
}) {
    const isMobile = useIsMobile();
    if (!soul) return null;
    const title = `${soul.firstName} ${soul.lastName}`;

    const content = (
        <div className="p-6 pb-24 text-left">
            <SoulProfileContent soul={soul} onFollowUp={(s) => { onOpenChange(false); onFollowUp(s); }} onViewHistory={(s) => { onOpenChange(false); onViewHistory(s); }} onEdit={(s) => { onOpenChange(false); onEdit(s); }} onAssess={(s) => { onOpenChange(false); onAssess(s); }} onOpenAssignDialog={(s) => { onOpenChange(false); onOpenAssignDialog(s); }} onExportSingle={onExportSingle} onDelete={(s) => { onOpenChange(false); onDelete(s); }} />
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onOpenChange}>
                <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
                    <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left">
                        <div className="flex items-center gap-2 mb-2 text-left text-left">
                            <Sparkles className="h-4 w-4 text-primary text-left text-left" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left">Identity Hub</span>
                        </div>
                        <DrawerHeader className="text-left flex-shrink-0 text-left text-left flex flex-col gap-2">
                            <DrawerTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left text-left">{title}</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium mt-1 text-left text-left">Full spiritual snapshot for the harvest workforce.</DrawerDescription>
                            <div className="flex items-center gap-2 mt-4 text-left text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce text-left text-left" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-left text-left">Swipe down to close</span></div>
                        </DrawerHeader>
                    </div>
                    <ScrollArea className="flex-grow overflow-hidden relative text-left">
                        {content}
                    </ScrollArea>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left text-left">
                <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left">
                    <div className="flex items-center gap-2 mb-2 text-left text-left">
                        <Sparkles className="h-4 w-4 text-primary text-left text-left" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left">Identity Hub</span>
                    </div>
                    <DialogHeader className="text-left text-left">
                        <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left text-left">{title}</DialogTitle>
                        <DialogDescription className="text-sm font-medium mt-1 text-left text-left">Full spiritual snapshot for the harvest workforce.</DialogDescription>
                    </DialogHeader>
                </div>
                <div className="flex-1 min-h-0 text-left text-left">
                    <ScrollArea className="h-full text-left text-left">
                        {content}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const SoulCard = React.memo(({ soul, onClick }: { soul: Soul; onClick: () => void; }) => (
    <Card onClick={onClick} className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-b-2 sm:border-b shadow-none bg-card/50 backdrop-blur-sm transition-all duration-300 cursor-pointer hover:bg-primary/[0.02] text-left text-left">
        <div className="flex items-center justify-between p-4 gap-4 text-left text-left">
            <div className="flex items-center gap-3 min-w-0 flex-1 text-left text-left">
                <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 text-left text-left")}>
                    <AvatarImage src={soul.photoURL || undefined} className="object-cover text-left text-left" />
                    <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-left text-left"> {soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 text-left text-left text-left">
                    <p className="font-bold truncate text-[13px] sm:text-base leading-tight capitalize tracking-tight text-left text-left">{soul.firstName || 'Unknown'} {soul.lastName || ''}</p>
                    <div className="flex flex-wrap gap-1.5 items-center mt-1.5 text-left text-left">
                        <Badge className={cn("h-5 px-1.5 text-[9px] uppercase font-black tracking-widest text-left text-left", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                        {soul.fellowshipName && <Badge variant="secondary" className="h-5 px-1.5 text-[8px] uppercase font-black tracking-tighter bg-primary/5 text-primary border-primary/20 shrink-0 text-left text-left">Fellowship</Badge>}
                    </div>
                </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-20 text-left text-left" />
        </div>
    </Card>
));
SoulCard.displayName = "SoulCard";

const SoulTableRow = React.memo(({ soul, isSelected, onSelect }: { soul: Soul; isSelected: boolean; onSelect: () => void; }) => (
    <TableRow className={cn("border-b hover:bg-muted/30 transition-colors cursor-pointer text-left text-left", isSelected && "bg-primary/[0.03]")} onClick={() => onSelect()}>
        <TableCell className="font-medium p-4 text-left text-left">
            <div className="flex items-center gap-4 text-left text-left">
                <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 text-left text-left")}>
                    <AvatarImage src={soul.photoURL || undefined} className="object-cover text-left text-left" />
                    <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-left text-left"> {soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 text-left text-left text-left text-left">
                    <div className="font-black text-xs sm:text-sm md:text-base truncate capitalize tracking-tight text-left text-left">{soul.firstName} {soul.lastName}</div>
                    {soul.church && <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 font-medium truncate opacity-70 text-left text-left"><Church className="h-3 w-3 shrink-0 text-left text-left" />{soul.church}</div>}
                </div>
            </div>
        </TableCell>
    </TableRow>
));
SoulTableRow.displayName = "SoulTableRow";

export function SoulsWonTable({ souls, allSouls, loading, selectedId, onSelect, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit, onDelete, onAssess, onAddChild }: {
  souls: Soul[]; allSouls: Soul[]; loading: boolean; selectedId: string | null; onSelect: (id: string | null) => void; onFollowUp: (soul: Soul) => void; onViewHistory: (soul: Soul) => void; onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void; onOpenAssignDialog: (soul: Soul) => void; onEdit: (soul: Soul) => void; onDelete: (soul: Soul) => void; onAssess: (soul: Soul) => void; onAddChild: (p1: Soul, p2?: Soul | null) => void;
}) {
  const isMobile = useIsMobile();
  const selectedSoul = React.useMemo(() => allSouls.find(s => s.id === selectedId) || null, [allSouls, selectedId]);

  if (loading) return <div className="space-y-4 text-left text-left">{[...Array(5)].map((_, i) => (<div key={i} className="flex items-center space-x-4 p-4 border-b last:border-0 bg-card/50 backdrop-blur-sm rounded-xl text-left text-left"><Skeleton className="h-12 w-12 rounded-full text-left text-left" /><div className="space-y-2 flex-1 text-left text-left"><Skeleton className="h-5 w-3/4 text-left text-left" /><Skeleton className="h-4 w-1/2 text-left text-left" /></div><Skeleton className="h-9 w-24 rounded-xl text-left text-left" /></div>))}</div>;
  
  if (souls.length === 0) return <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm border-2 border-dashed text-left text-left"><CardContent className="text-left text-left text-left"><div className="text-center py-24 flex flex-col items-center text-left text-left text-left"><div className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-primary/20 text-left text-left text-left"><HeartHandshake className="h-10 w-10 text-primary opacity-40 text-left text-left text-left" /></div><h3 className="text-xl font-black font-headline uppercase tracking-tight text-left text-left text-left">Your Harvest Field</h3><p className="text-sm text-muted-foreground italic font-medium max-w-[280px] leading-relaxed opacity-60 text-balance text-center text-left text-left text-left">The souls you lead to Christ will appear here for collaborative discipleship and strategic follow-up.</p></div></CardContent></Card>;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start text-left text-left">
        <div className="flex-1 w-full text-left text-left">
            {isMobile ? (
                <div className="space-y-px text-left text-left">{souls.map((soul) => (<SoulCard key={soul.id} soul={soul} onClick={() => onSelect(soul.id)} />))}</div>
            ) : (
                <Card className="rounded-none sm:rounded-[2rem] border-x-0 sm:border-x shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden text-left text-left text-left">
                    <CardHeader className="p-8 border-b bg-muted/5 text-left text-left text-left"><CardTitle className="text-2xl font-black font-headline tracking-tight flex items-center gap-3 uppercase text-left text-left text-left text-left"><Heart className="h-6 w-6 text-primary fill-current text-left text-left text-left" />Harvest Dashboard</CardTitle><CardDescription className="text-base font-medium text-left text-left text-left">Keep track of spiritual development and community integration.</CardDescription></CardHeader>
                    <CardContent className="p-0 text-left text-left text-left text-left">
                        <div className="overflow-x-auto text-left text-left text-left text-left text-left text-left">
                            <Table className="text-left text-left text-left text-left text-left">
                                <TableHeader className="bg-muted/10 text-left text-left text-left"><TableRow className="hover:bg-transparent text-left text-left text-left text-left"><TableHead className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left text-left text-left">Soul Identity</TableHead></TableRow></TableHeader>
                                <TableBody className="text-left text-left text-left text-left">{souls.map((soul) => (<SoulTableRow key={soul.id} soul={soul} isSelected={selectedId === soul.id} onSelect={() => onSelect(soul.id)} />))}</TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
        <ProfileActionDialog soul={selectedSoul} isOpen={!!selectedId && !!selectedSoul} onOpenChange={(open) => !open && onSelect(null)} onFollowUp={onFollowUp} onViewHistory={onViewHistory} onEdit={onEdit} onAssess={onAssess} onOpenAssignDialog={onOpenAssignDialog} onExportSingle={onExportSingle} onDelete={onDelete} onAddChild={onAddChild} />
    </div>
  );
}

