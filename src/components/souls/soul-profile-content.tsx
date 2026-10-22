'use client';

import * as React from "react";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { format, differenceInMinutes } from "date-fns";
import { 
  BookOpen, 
  Heart, 
  Sparkles,
  ArrowLeft,
  Zap, 
  Mail, 
  Phone, 
  MessageSquare, 
  Loader2, 
  Check,
  ChevronDown,
  Award,
  HandHeart,
  PartyPopper,
  X,
  Target,
  Share,
  HeartHandshake,
  Search,
  BookMarked,
  Clock,
  Edit,
  Gift,
  History,
  Home,
  Lock,
  MoreVertical,
  PlusCircle,
  Quote,
  Send,
  Users,
  Utensils,
  Download,
  ClipboardList,
  Camera,
  Smartphone,
  ChevronRight,
  Church,
  ShieldCheck,
  Trash2,
  MapPin,
  Info,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import type { Soul, FollowUpStatus, UserProfile, BibleChapterOutput } from "@/lib/types";
import { useUser, useDoc, useCollection, useFirestore, useUserProfile } from "@/firebase";
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  collection, 
  query, 
  serverTimestamp, 
  addDoc, 
  getDocs, 
  where,
  writeBatch,
  setDoc,
  getDoc,
  deleteDoc
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { getBibleChapter } from "@/ai/flows/get-bible-chapter-flow";
import { bibleData } from "@/lib/bible-data";
import { actionItems, prayerTemplates, kingdomVerses } from "@/lib/follow-up-data";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { MutualConnectBadge } from "./mutual-connect-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, safeToDate } from "@/lib/utils";

// --- Icons & Mappings ---

export const iconMap: Record<string, any> = {
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

export function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

export const getStatusClasses = (status: FollowUpStatus | undefined): string => {
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

/**
 * Ensures the profile photo displayed in the chat is always the most recent version.
 */
function LiveChatAvatar({ userId, fallbackUrl, fallbackInitials, className }: { userId: string, fallbackUrl?: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userRef = React.useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const currentPhotoUrl = profile?.photoURL || fallbackUrl;
    
    return (
        <Avatar className={className}>
            <AvatarImage src={currentPhotoUrl} className="object-cover" />
            <AvatarFallback className="font-bold bg-primary/10 text-primary">{fallbackInitials}</AvatarFallback>
        </Avatar>
    );
}

// --- Main Soul Profile Content ---

export function SoulProfileContent({ 
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
  const [isHelpNeedDialogOpen, setIsHelpNeedDialogOpen] = React.useState(false);
  const [isShareTargetDialogOpen, setIsShareTargetDialogOpen] = React.useState(false);
  const [isPartnerSelectionDialogOpen, setIsPartnerSelectionDialogOpen] = React.useState(false);
  const [isPrayerCustomizationOpen, setIsPrayerCustomizationOpen] = React.useState(false);
  const [isStudyWordOpen, setIsStudyWordOpen] = React.useState(false);
  const [customMessageText, setCustomMessageText] = React.useState('');
  const [clickedActionId, setClickedActionId] = React.useState<string | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = React.useState(false);

  const address = useMemo(() => {
    const loc = soul.locationWon;
    if (!loc) return '';
    return [loc.street, loc.city, loc.state, loc.country].filter(Boolean).join(', ');
  }, [soul.locationWon]);

  const needs = soul.needsAssessment;

  const sortedHistory = React.useMemo(() => {
    if (!soul.followUpLog || soul.followUpLog.length === 0) return [];
    return [...soul.followUpLog].sort((a, b) => {
      const dateB = safeToDate(b.date)?.getTime() ?? 0;
      const dateA = safeToDate(a.date)?.getTime() ?? 0;
      return dateB - dateA;
    });
  }, [soul.followUpLog]);

  const finalizeLog = async (soul: Soul, actionId: string, noteAddendum: string = '') => {
    if (!user || !firestore || !soul) return;
    setIsActionSubmitting(true);

    const action = actionItems.find(a => a.id === actionId);
    const batch = writeBatch(firestore);
    const soulRef = doc(firestore, `users/${soul.userId}/souls`, soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);

    const memberName = `${currentUserProfile?.firstName || ''} ${currentUserProfile?.lastName || ''}`.trim() || user.displayName || 'Member';
    const logEntry = {
        date: new Date(), 
        note: `Logged via Identity Hub: ${action?.label}${noteAddendum ? ` - ${noteAddendum}` : ''}`,
        actions: [actionId],
        memberId: user.uid,
        memberName: memberName,
    };

    batch.update(soulRef, {
        followUpLog: arrayUnion(logEntry),
        lastUpdatedAt: serverTimestamp(),
    });
    batch.update(globalSoulRef, {
        followUpLog: arrayUnion(logEntry),
        lastUpdatedAt: serverTimestamp(),
    });

    try {
        await batch.commit();
        toast({ title: 'Kingdom Impact Logged' });
    } catch (err) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: soulRef.path, operation: 'update' }, user));
    } finally {
        setIsActionSubmitting(false);
        setClickedActionId(null);
    }
  };

  const handleActionClick = async (actionId: string) => {
    if (!soul) return;
    setClickedActionId(actionId);

    if (actionId === 'phone_call' || actionId === 'text_message' || actionId === 'prayed_together') {
        if (!soul.phone) {
            toast({ variant: 'destructive', title: 'Phone Missing', description: `Please save a number for ${soul.firstName} first.` });
            return;
        }
    }

    switch (actionId) {
        case 'prayed_together':
            setCustomMessageText(prayerTemplates[0].text.replace(/{name}/g, soul.firstName));
            setIsPrayerCustomizationOpen(true);
            return;
        case 'studied_bible':
            setIsStudyWordOpen(true);
            return;
        case 'text_message':
            setIsCommChannelDialogOpen(true);
            return;
        case 'introduced_friend':
            setIsShareTargetDialogOpen(true);
            return;
        case 'phone_call':
            await finalizeLog(soul, actionId, 'Dialer initiated');
            window.location.href = `tel:${soul.phone}`;
            return;
        case 'shared_meal':
        case 'gave_gift':
            const mPath = actionId === 'shared_meal' ? '/marketplace' : '/marketplace/gifts';
            router.push(`${mPath}?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}&actionId=${actionId}`);
            return;
        case 'matchmaking':
            router.push(`/matchmaking?soulId=${soul.id}`);
            return;
        case 'invited_to_event':
            await finalizeLog(soul, actionId, 'Redirected to Events Hub');
            router.push('/events');
            return;
        case 'helped_with_need':
            setIsHelpNeedDialogOpen(true);
            return;
        default:
            await finalizeLog(soul, actionId);
    }
  };

  const handleCommChoice = (channel: 'whatsapp' | 'sms') => {
      if (!soul?.phone || !clickedActionId) return;
      const cleanPhone = soul.phone.replace(/\+/g, '').replace(/\D/g, '');
      const message = customMessageText || `Hi ${soul.firstName}, I'm thinking of you today and praying for you. God bless you!`;
      const messageText = encodeURIComponent(message);
      
      if (channel === 'whatsapp') {
          window.open(`https://wa.me/${cleanPhone}?text=${messageText}`, '_blank');
      } else {
          window.location.href = `sms:${soul.phone}?body=${messageText}`;
      }
      
      finalizeLog(soul, clickedActionId, `Sent via ${channel.toUpperCase()}: ${message.substring(0, 30)}...`);
      setIsCommChannelDialogOpen(false);
      setCustomMessageText('');
  };

  const handleShareToWhatsApp = () => {
    if (!soul) return;
    const wonAt = safeToDate(soul.wonAt);
    const details = `Introduction to ${soul.firstName}, a new soul won for the Kingdom! 🎊\n\nStatus: ${soul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\n\nSupport their growth on Testify: ${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(details)}`, '_blank');
    finalizeLog(soul, 'introduced_friend', 'Shared via WhatsApp External');
    setIsShareTargetDialogOpen(false);
  };

  const handleShareToPartner = async (partner: UserProfile['accountabilityPartners'][0]) => {
      if (!user || !firestore || !soul || !currentUserProfile) return;
      const wonAt = safeToDate(soul.wonAt);
      const text = `SHARING SOUL DATA: ${soul.firstName} ${soul.lastName}\nStatus: ${soul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\n\nLet's coordinate follow-up on Testify.`;
      try {
          const participantIds = [user.uid, partner.userId].sort();
          const chatsRef = collection(firestore, 'chats');
          const q = query(chatsRef, where('participantIds', '==', participantIds), where('isGroupChat', '==', false));
          const snap = await getDocs(q);
          let chatId: string;
          if (!snap.empty) {
              chatId = snap.docs[0].id;
          } else {
              const otherDoc = await getDoc(doc(firestore, 'users', partner.userId));
              const otherProfile = otherDoc.data() as UserProfile;
              const newChat = {
                  participantIds,
                  participantInfo: {
                      [user.uid]: { firstName: currentUserProfile.firstName, lastName: currentUserProfile.lastName, photoURL: currentUserProfile.photoURL || '' },
                      [partner.userId]: { firstName: partner.firstName, lastName: partner.lastName, photoURL: partner.photoURL || '' }
                  },
                  lastUpdatedAt: serverTimestamp(),
                  isGroupChat: false,
                  hasMessages: true
              };
              const ref = await addDoc(chatsRef, newChat);
              chatId = ref.id;
          }
          await addDoc(collection(firestore, 'chats', chatId, 'messages'), { senderId: user.uid, text, createdAt: serverTimestamp() });
          await updateDoc(doc(firestore, 'chats', chatId), { lastUpdatedAt: serverTimestamp(), hasMessages: true });
          toast({ title: 'Shared with Partner!' });
          finalizeLog(soul, 'introduced_friend', `Shared with partner: ${partner.firstName}`);
          setIsPartnerSelectionDialogOpen(false);
          setIsShareTargetDialogOpen(false);
          router.push(`/dashboard/chats/${chatId}`);
      } catch (e) {
          toast({ variant: 'destructive', title: 'Share Failed' });
      }
  };

  const handleHelpNeedConfirm = (note: string) => {
    if (!soul) return;
    finalizeLog(soul, 'helped_with_need', `Service: ${note}`);
    setIsHelpNeedDialogOpen(false);
    setCustomMessageText('');
  }

  const uniquePartners = React.useMemo(() => {
    const partners = currentUserProfile?.accountabilityPartners || [];
    const uniqueMap = new Map();
    partners.forEach(p => {
        if (p.userId && !uniqueMap.has(p.userId)) uniqueMap.set(p.userId, p);
    });
    return Array.from(uniqueMap.values());
  }, [currentUserProfile?.accountabilityPartners]);

  return (
    <div className="space-y-6 text-left">
      <Card className="rounded-none sm:rounded-[2rem] overflow-hidden border-none shadow-2xl bg-card/50 backdrop-blur-sm border-t-8 border-t-primary/20 text-left">
        <CardHeader className="p-8 pb-4 text-center">
            <div className="relative inline-block mx-auto mb-4">
                <Dialog>
                    <DialogTrigger asChild disabled={!soul.photoURL}>
                        <div className={cn("h-48 w-48 border-4 border-background shadow-xl ring-2 ring-primary/10 transition-all active:scale-95", soul.photoURL && "cursor-pointer hover:scale-105")}>
                            <Avatar className="h-full w-full border shadow-sm">
                                <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                                <AvatarFallback className="font-black bg-primary/10 text-primary text-center flex items-center justify-center h-full w-full text-3xl"> {soul.firstName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                    </DialogTrigger>
                    {soul.photoURL && (
                        <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
                            <DialogHeader className="sr-only text-center"><DialogTitle>Profile Photo</DialogTitle></DialogHeader>
                            <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
                                <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
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
                <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-center truncate w-full">
                  {soul.firstName} {soul.lastName}
                </CardTitle>
                <div className="flex gap-2 justify-center items-center">
                    <Badge className={cn("h-5 px-2 text-[9px] uppercase font-black tracking-widest justify-center", getStatusClasses(soul.status))} variant="outline">
                        {soul.status}
                    </Badge>
                    <MutualConnectBadge soul={soul} />
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-8 pt-0 space-y-6 text-left">
            <Separator className="opacity-50" />
            
            <div className="space-y-4">
                <div className="flex items-center justify-between text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Spiritual Identity</p>
                    <div className="flex items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10">
                                    <Download className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl text-left">
                                <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground font-black">Select Format</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => onExportSingle(soul, 'csv')}>CSV Export</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => onExportSingle(soul, 'pdf')}>PDF Report</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onEdit(soul)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-1">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Full Name</p>
                        <p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.firstName} {soul.lastName}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Gender/Age</p>
                        <p className="text-[11px] sm:text-xs font-bold">{soul.gender || 'N/A'} • {soul.age ? `${soul.age} yrs` : 'Age N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Relationship</p>
                        <p className="text-[11px] sm:text-xs font-bold text-left truncate capitalize">{soul.relationship || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Work Status</p>
                        <p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.workStatus || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Rel. Status</p>
                        <p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.maritalStatus || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Nickname</p>
                        <p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.nickname || 'N/A'}</p>
                    </div>
                </div>
            </div>

            <Separator className="opacity-20" />

            <div className="space-y-3 text-left">
                <div className="flex items-center justify-between text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Contact Identity</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onEdit(soul)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </div>
                <div className="space-y-2">
                    {soul.phone ? (
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-foreground">
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                            {soul.phone}
                        </div>
                    ) : (
                        <p className="text-[9px] text-muted-foreground/40 italic">No phone recorded</p>
                    )}
                    {soul.email && (
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-foreground">
                            <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                            {soul.email}
                        </div>
                    )}
                </div>
            </div>

            <Separator className="opacity-20" />

            <div className="space-y-4 text-left">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Relational Actions</p>
                <div className="flex flex-col gap-2">
                    {actionItems.map(action => {
                        const Icon = iconMap[action.id] || Heart;
                        const isThisProcessing = clickedActionId === action.id && isActionSubmitting;
                        
                        if (action.id === 'matchmaking' && soul.maritalStatus === 'Married') return null;
                        
                        return (
                            <Button
                                key={action.id}
                                variant="outline"
                                className="flex items-center justify-start gap-3 h-12 px-4 rounded-xl border-2 border-transparent bg-muted/20 hover:bg-primary/5 hover:border-primary/10 transition-all text-left group"
                                onClick={() => handleActionClick(action.id)}
                                disabled={isActionSubmitting}
                            >
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                                    {isThisProcessing ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Icon className="h-4 w-4" />}
                                </div>
                                <span className="text-xs font-bold uppercase tracking-tight truncate flex-1">{action.label}</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-20 group-hover:opacity-100 transition-opacity" />
                            </Button>
                        )
                    })}
                </div>
            </div>

            <Separator className="opacity-20" />

            <div className="space-y-4 text-left">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Harvest Context</p>
                <div className="space-y-1">
                    <p className="text-[11px] sm:text-xs font-bold flex items-center gap-1.5 truncate">
                        <Target className="h-3 w-3 text-primary" />
                        Source: {soul.source}
                    </p>
                </div>
            </div>

            <Separator className="opacity-20" />

            <div className="space-y-4 text-left">
                <div className="flex items-center justify-between text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Kingdom Placement</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onOpenAssignDialog(soul)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-primary/5 border border-primary/10">
                        <HeartHandshake className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest">Fellowship</p>
                            <p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.fellowshipName || 'No Fellowship'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-blue-500/5 border border-blue-500/10">
                        <Users className="h-4 w-4 text-blue-500 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest">Association</p>
                            <p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.associationName || 'No Association'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <Separator className="opacity-20" />

            <div className="space-y-4 text-left">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Spiritual Milestones</p>
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
                            <milestone.icon className="h-3 w-3" />
                            <span className="text-[10px] font-black uppercase tracking-tight">{milestone.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <Separator className="opacity-20" />
            <div className="space-y-4 text-left">
                <div className="flex items-center justify-between text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2">
                        <History className="h-3.5 w-3.5" /> Interaction History
                    </p>
                    <Button variant="ghost" className="h-6 text-[8px] font-black uppercase text-primary hover:bg-primary/5" onClick={() => onViewHistory(soul)}>
                        View All
                    </Button>
                </div>
                <div className="space-y-4 pl-1">
                    {sortedHistory.length > 0 ? (
                        sortedHistory.slice(0, 3).map((log, index) => {
                            const date = safeToDate(log.date);
                            return (
                                <React.Fragment key={index}>
                                    <div className="relative">
                                        <div className="pl-4 border-l-4 border-primary/20">
                                            <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest mb-1">
                                                {date ? format(date, "MMM d, yyyy") : 'Recently'}
                                                {log.memberName && <span className="ml-2 text-primary/40">• By {log.memberName}</span>}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 italic">
                                                &ldquo;{log.note || 'Interaction logged.'}&rdquo;
                                            </p>
                                        </div>
                                    </div>
                                    {index < 2 && sortedHistory.length > index + 1 && <Separator className="mt-4 opacity-10" />}
                                </React.Fragment>
                            );
                        })
                    ) : (
                        <div className="py-4 text-center border border-dashed rounded-xl bg-muted/5">
                            <p className="text-sm text-muted-foreground/40 italic">No interactions recorded.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3 p-5 bg-muted/20 rounded-[2rem] border-2 border-dashed border-primary/10 shadow-inner text-left text-left">
                <div className="flex items-center justify-between text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-1 text-left">
                        <ClipboardList className="h-4 w-4" /> Assessed Needs
                    </p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onAssess(soul)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </div>
                {needs ? (
                    <div className="space-y-4 text-left">
                        {needs.generalImpression && <p className="text-xs text-muted-foreground italic leading-relaxed text-balance">&ldquo;{needs.generalImpression}&rdquo;</p>}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                            {needs.emotionalNeeds && (
                                <div className="space-y-1 text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-red-500/10 text-red-600 border-none px-1.5 uppercase font-black">Emotional</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2">{needs.emotionalNeeds}</p>
                                </div>
                            )}
                            {needs.physicalNeeds && (
                                <div className="space-y-1 text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-amber-500/10 text-amber-600 border-none px-1.5 uppercase font-black">Physical</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2">{needs.physicalNeeds}</p>
                                </div>
                            )}
                            {needs.financialNeeds && (
                                <div className="space-y-1 text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-green-500/10 text-green-600 border-none px-1.5 uppercase font-black">Financial</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2">{needs.financialNeeds}</p>
                                </div>
                            )}
                            {needs.socialNeeds && (
                                <div className="space-y-1 text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-indigo-500/10 text-indigo-600 border-none px-1.5 uppercase font-black">Social</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2">{needs.socialNeeds}</p>
                                </div>
                            )}
                        </div>

                        {needs.followUpPlan && (
                            <div className="pt-2 border-t border-primary/10">
                                <p className="text-[8px] font-black uppercase text-primary/60 mb-1 flex items-center gap-1.5">
                                    <Target className="h-2.5 w-2.5" /> Strategy
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed italic">{needs.followUpPlan}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-4 text-center">
                        <Button variant="outline" size="sm" className="h-8 rounded-xl text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5" onClick={() => onAssess(soul)}>
                            BEGIN ASSESSMENT
                        </Button>
                    </div>
                )}
            </div>

            <div className="pt-2 space-y-3 text-left text-left">
                <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20" onClick={() => onFollowUp(soul)}>
                    LOG FOLLOW-UP
                </Button>
                <Button variant="ghost" className="w-full h-11 text-destructive font-bold uppercase tracking-widest text-[10px]" onClick={() => onDelete(soul)}>
                    <Trash2 className="mr-2 h-4 w-4" /> DELETE RECORD
                </Button>
            </div>
        </CardContent>
      </Card>

      <IntercessionHubDialog 
          isOpen={isPrayerCustomizationOpen}
          onOpenChange={setIsPrayerCustomizationOpen}
          soul={soul}
          onComplete={(msg) => { setCustomMessageText(msg); setIsPrayerCustomizationOpen(false); setIsCommChannelDialogOpen(true); }}
      />

      <MessageHubDialog 
          isOpen={isCommChannelDialogOpen}
          onOpenChange={setIsCommChannelDialogOpen}
          soul={soul}
          onChannelSelect={handleCommChoice}
      />

      <ShareWordDialog 
          isOpen={isStudyWordOpen}
          onOpenChange={setIsStudyWordOpen}
          soul={soul}
          onSelectVerse={(v) => { setCustomMessageText(v); setIsStudyWordOpen(false); setIsCommChannelDialogOpen(true); }}
      />

      <Drawer open={isHelpNeedDialogOpen} onOpenChange={setIsHelpNeedDialogOpen}>
        <DrawerContent className="h-auto max-h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
          <div className="p-8 border-b shrink-0 bg-muted/10 text-left flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0 text-left">
                  <DrawerHeader className="text-left flex-shrink-0 p-0">
                      <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Support details</DrawerTitle>
                      <DrawerDescription className="text-sm font-medium mt-1 text-left">Record the physical or spiritual support provided.</DrawerDescription>
                  </DrawerHeader>
              </div>
              <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60 text-left" onClick={() => setIsHelpNeedDialogOpen(false)}>
                <X className="h-5 w-5 text-left" />
              </Button>
          </div>
          <div className="p-8 space-y-6 text-left">
              <div className="space-y-2 text-left">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Notes</Label>
                  <Textarea 
                      placeholder="e.g. Provided food items, helped with bill..." 
                      value={customMessageText}
                      onChange={(e) => setCustomMessageText(e.target.value)}
                      className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner text-base"
                  />
              </div>
              <Button onClick={() => handleHelpNeedConfirm(customMessageText)} className="w-full h-14 rounded-2xl font-black shadow-lg uppercase tracking-widest text-center" disabled={!customMessageText.trim()}>CONFIRM SERVICE</Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export function IntercessionHubDialog({ 
  isOpen, 
  onOpenChange, 
  soul, 
  onComplete 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  soul: Soul | null; 
  onComplete: (msg: string) => void;
}) {
  const [text, setText] = useState('');
  const isMobile = useIsMobile();
  useEffect(() => { if(isOpen && soul) setText(prayerTemplates[0].text.replace(/{name}/g, soul.firstName)); }, [isOpen, soul]);

  const header = (
    <div className="p-8 border-b bg-muted/10 shrink-0 text-left flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0 text-left">
            <div className="text-left p-0">
                <h2 className="text-2xl font-black font-headline uppercase tracking-tight text-left">Kingdom Intercession</h2>
                <p className="text-sm font-medium mt-1 text-left">Draft a powerful prayer for {soul?.firstName}.</p>
            </div>
        </div>
        <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60 hover:text-foreground text-left" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5 text-left" />
        </Button>
    </div>
  );

  const content = (
    <div className="p-8 space-y-6 text-left">
        <div className="space-y-3 text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Select Focus</label>
            <div className="flex flex-wrap gap-2 text-left">
                {prayerTemplates.map(t => (
                    <Button key={t.id} variant="outline" size="sm" className="rounded-full h-8 px-4 text-[9px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 text-primary text-left" onClick={() => soul && setText(t.text.replace(/{name}/g, soul.firstName))}>{t.label}</Button>
                ))}
            </div>
        </div>
        <div className="space-y-2 text-left">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Customize Message</Label>
            <Textarea value={text} onChange={e => setText(e.target.value)} className="min-h-[200px] rounded-2xl bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6 text-left" />
        </div>
        <Button onClick={() => onComplete(text)} disabled={!text.trim()} className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-center text-left">SEND</Button>
    </div>
  );

  if (isMobile) {
      return (
          <Sheet open={isOpen} onOpenChange={onOpenChange}>
              <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                  {header}<ScrollArea className="flex-grow text-left">{content}</ScrollArea>
              </SheetContent>
          </Sheet>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl text-left">
            {header}{content}
        </DialogContent>
    </Dialog>
  );
}

export function MessageHubDialog({ 
  isOpen, 
  onOpenChange, 
  soul, 
  onChannelSelect 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  soul: Soul | null; 
  onChannelSelect: (channel: 'whatsapp' | 'sms') => void;
}) {
  const isMobile = useIsMobile();
  const header = (
    <div className="p-8 border-b bg-muted/10 text-left flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2 mb-1 text-left">
                <MessageSquare className="h-4 w-4 text-primary text-left" />
                <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Channel Select</span>
            </div>
            <div className="text-left p-0">
                <h2 className="text-2xl font-black font-headline uppercase tracking-tight text-left">Message Hub</h2>
                <p className="text-sm font-medium text-left">Encourage {soul?.firstName} via mobile.</p>
            </div>
        </div>
        <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60 hover:text-foreground text-left" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5 text-left" />
        </Button>
    </div>
  );
  const content = (
    <div className="flex flex-col gap-3 p-8 text-left">
        <Button onClick={() => onChannelSelect('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg text-center text-left">
            <WhatsAppIcon className="h-5 w-5 text-left" /> WhatsApp External
        </Button>
        <Button onClick={() => onChannelSelect('sms')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary text-center text-left">
            <MessageSquare className="h-5 w-5 text-left" /> Standard SMS
        </Button>
    </div>
  );

  if (isMobile) {
      return (
          <Drawer open={isOpen} onOpenChange={onOpenChange}>
              <DrawerContent className="p-0 rounded-t-[2.5rem] h-auto pb-12 text-left">
                  {header}{content}
              </DrawerContent>
          </Drawer>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl text-left">
          {header}{content}
      </DialogContent>
    </Dialog>
  );
}

export function ShareWordDialog({ 
  isOpen, 
  onOpenChange, 
  soul, 
  onSelectVerse 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  soul: Soul | null; 
  onSelectVerse: (verse: string) => void;
}) {
  const isMobile = useIsMobile();
  const [view, setView] = useState<'hub' | 'books' | 'chapters' | 'verses'>('hub');
  const [bibleSearch, setBibleSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{reference: string, text: string}[]>([]);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterContent, setChapterContent] = useState<BibleChapterOutput | null>(null);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setView('hub');
      setBibleSearch('');
      setSearchResults([]);
      setSelectedBook(null);
      setSelectedChapter(null);
      setChapterContent(null);
      setSelectedVerses([]);
    }
  }, [isOpen]);

  const handleSearch = async () => {
      if (!bibleSearch.trim()) return;
      setIsSearching(true);
      try {
          const res = await fetch(`https://bible-api.com/${encodeURIComponent(bibleSearch)}`);
          if (res.ok) {
              const data = await res.json();
              if (data.verses) setSearchResults([{ reference: data.reference, text: data.text }]);
          }
      } catch (e) {
          console.warn("Bible search failed", e);
      } finally { setIsSearching(false); }
  };

  const handleSelectBook = (bookName: string) => { setSelectedBook(bookName); setView('chapters'); };
  const handleSelectChapter = async (num: number) => {
    if (!selectedBook) return;
    setSelectedChapter(num);
    setLoadingVerses(true);
    try {
      const content = await getBibleChapter({ book: selectedBook, chapter: num });
      setChapterContent(content);
      setView('verses');
    } catch (e) { console.error(e); } finally { setLoadingVerses(false); }
  };

  const toggleVerse = (num: number) => {
    setSelectedVerses(prev => prev.includes(num) ? prev.filter(v => v !== num) : [...prev, num].sort((a, b) => a - b));
  };

  const handleShareSelected = () => {
    if (!chapterContent || selectedVerses.length === 0 || !soul) return;
    const selectedTexts = chapterContent.verses.filter(v => selectedVerses.includes(v.verse)).map(v => v.text).join(' ');
    const reference = `${chapterContent.book} ${chapterContent.chapter}:${selectedVerses.join(', ')}`;
    const msg = `"${selectedTexts.trim()}" — ${reference}\n\nStudy this with me on Testify! Visit: ${window.location.origin}/bible`;
    onSelectVerse(msg);
  };

  const header = (
    <div className="p-8 border-b bg-muted/10 shrink-0 text-left flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-3 mb-2 text-left">
            {view !== 'hub' && (
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full -ml-2" onClick={() => setView(view === 'verses' ? 'chapters' : view === 'chapters' ? 'books' : 'hub')}>
                    <ArrowLeft className="h-4 w-4 text-left" />
                </Button>
            )}
            <Target className="h-5 w-5 text-primary text-left" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left">Kingdom Study</span>
          </div>
          <div className="text-left">
            <h2 className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left">
                {view === 'hub' ? "Share the Word" : view === 'books' ? "Select Book" : view === 'chapters' ? `${selectedBook}: Chapter` : `${selectedBook} ${selectedChapter}`}
            </h2>
            <p className="text-sm font-medium text-left">Access the word of God to share with converts.</p>
          </div>
        </div>
        <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60 hover:text-foreground text-left" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5 text-left" />
        </Button>
    </div>
  );

  const body = (
    <div className="flex-grow min-h-[300px]">
        <div className="p-4 sm:p-10 text-left">
            {view === 'hub' && (
                <div className="space-y-8 text-left">
                    <div className="relative text-left">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50 text-left" />
                        <Input placeholder="Search Bible (e.g. John 3:16)..." value={bibleSearch} onChange={e => setBibleSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="h-14 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-lg text-left" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-left">
                        <Button onClick={() => setView('books')} variant="outline" className="h-32 rounded-[2rem] gap-3 border-2 border-primary/20 text-primary flex flex-col text-center">
                            <BookOpen className="h-8 w-8 mb-1 text-center" />
                            <span className="font-black text-[10px] uppercase tracking-widest text-center">Browse Bible</span>
                        </Button>
                        <Button variant="outline" asChild className="h-32 rounded-[2rem] gap-3 border-2 border-primary/20 text-primary flex flex-col text-center"><Link href="/dashboard/bible"><BookMarked className="h-8 w-8 mb-1 text-center" /><span className="font-black text-[10px] uppercase tracking-widest text-center">Open Reader</span></Link></Button>
                    </div>
                </div>
            )}
            {view === 'books' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">
                    {bibleData.map(book => (<Button key={book.name} variant="outline" className="h-12 rounded-xl font-bold uppercase text-[10px] text-left" onClick={() => handleSelectBook(book.name)}>{book.name}</Button>))}
                </div>
            )}
            {view === 'chapters' && (
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 text-left">
                    {selectedBook && bibleData.find(b => b.name === selectedBook)?.chapters.map(ch => (<Button key={ch.chapter} variant="outline" className="h-10 w-10 p-0 rounded-lg font-black text-sm text-left" onClick={() => handleSelectChapter(ch.chapter)}>{ch.chapter}</Button>))}
                </div>
            )}
            {view === 'verses' && (
                <div className="space-y-1 font-serif text-left">
                    {loadingVerses ? (<div className="flex justify-center py-20 text-left"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20 text-left" /></div>) : chapterContent?.verses.map(v => (
                        <div key={v.verse} className={cn("p-3 rounded-xl transition-all cursor-pointer border-2 text-left", selectedVerses.includes(v.verse) ? "bg-primary/10 border-primary/40" : "bg-transparent border-transparent hover:bg-muted/50")} onClick={() => toggleVerse(v.verse)}><sup className="text-[10px] font-black mr-2 opacity-40 text-left"> {v.verse}</sup><span className="text-sm leading-relaxed text-left">{v.text}</span></div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );

  const footer = view === 'verses' && (
    <div className="p-6 border-t bg-muted/5 flex flex-col sm:flex-row gap-3 text-left">
        <Button variant="outline" onClick={() => setSelectedVerses([])} className="rounded-xl h-12 flex-1 font-bold text-left">Clear Selection</Button>
        <Button onClick={handleShareSelected} disabled={selectedVerses.length === 0} className="rounded-xl h-12 flex-1 font-black uppercase tracking-widest text-center text-left">PREPARE SHARE ({selectedVerses.length})</Button>
    </div>
  );

  if (isMobile) {
      return (
          <Sheet open={isOpen} onOpenChange={onOpenChange}>
              <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                  {header}<ScrollArea className="flex-grow">{body}</ScrollArea>{footer}
              </SheetContent>
          </Sheet>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left flex flex-col">
        {header}<ScrollArea className="flex-grow">{body}</ScrollArea>{footer || (<div className="p-6 border-t bg-muted/5 flex justify-end shrink-0 text-left"><Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-xs text-left">Close Hub</Button></div>)}
      </DialogContent>
    </Dialog>
  );
}
