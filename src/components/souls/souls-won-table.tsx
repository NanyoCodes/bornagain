'use client';

import * as React from "react";
import { useState, useMemo, useCallback, useEffect } from "react";
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
import type { Soul, FollowUpStatus, UserProfile, Chat, BibleChapterOutput } from "@/lib/types";
import { useUser, useFirestore, useDoc, useUserProfile, useCollection } from "@/firebase";
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

function ShareWordDialog({ isOpen, onOpenChange, soul, onSelectVerse }: { isOpen: boolean; onOpenChange: (open: boolean) => void; soul: Soul | null; onSelectVerse: (verse: string) => void; }) {
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

  useEffect(() => { if (!isOpen) { setView('hub'); setBibleSearch(''); setSearchResults([]); setSelectedBook(null); setSelectedChapter(null); setChapterContent(null); setSelectedVerses([]); } }, [isOpen]);

  const constructInvitationMessage = (verseText: string, reference: string, link: string) => `"${verseText.trim()}" — ${reference}\n\nJoin the harvest at Testify! Share your miracles, win souls for Christ, and glorify God. Visit: ${window.location.origin}/bible`;

  const handleSearch = async () => {
      if (!bibleSearch.trim()) return;
      setIsSearching(true);
      try {
          const res = await fetch(`https://bible-api.com/${encodeURIComponent(bibleSearch)}`);
          if (res.ok) {
              const data = await res.json();
              if (data.verses) setSearchResults([{ reference: data.reference, text: data.text }]);
          }
      } catch (e) { console.warn("Bible search failed", e); }
      finally { setIsSearching(false); }
  };

  const handleSelectChapter = async (num: number) => {
    if (!selectedBook) return;
    setSelectedChapter(num);
    setLoadingVerses(true);
    try {
      const content = await getBibleChapter({ book: selectedBook, chapter: num });
      setChapterContent(content);
      setView('verses');
    } catch (e) { console.error(e); }
    finally { setLoadingVerses(false); }
  };

  const handleShareSelected = () => {
    if (!chapterContent || selectedVerses.length === 0) return;
    const selectedTexts = chapterContent.verses.filter(v => selectedVerses.includes(v.verse)).map(v => v.text).join(' ');
    const reference = `${chapterContent.book} ${chapterContent.chapter}:${selectedVerses.join(', ')}`;
    const link = `${window.location.origin}/dashboard/bible?book=${encodeURIComponent(chapterContent.book)}&chapter=${chapterContent.chapter}`;
    onSelectVerse(constructInvitationMessage(selectedTexts, reference, link));
  };

  const renderHub = (
    <div className="space-y-8 sm:space-y-10 text-left">
      <div className="space-y-4">
        <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50" />
            <Input placeholder="Search Bible (e.g. John 3:16)..." value={bibleSearch} onChange={e => setBibleSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="h-14 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-lg" />
            <Button onClick={handleSearch} disabled={isSearching || !bibleSearch.trim()} variant="ghost" size="sm" className="absolute right-3 top-1/2 -translate-y-1/2 h-10 px-6 rounded-xl font-black text-xs uppercase text-primary">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'SEARCH'}
            </Button>
        </div>
        {searchResults.map((res, idx) => (
            <Button key={idx} variant="outline" className="w-full h-auto p-6 rounded-[2rem] border-primary/20 bg-primary/5 flex flex-col items-start gap-3 text-left hover:bg-primary/10 transition-all border-2 border-dashed" onClick={() => onSelectVerse(constructInvitationMessage(res.text, res.reference, `${window.location.origin}/dashboard/bible`))}>
                <div className="flex items-center justify-between w-full">
                    <span className="font-black text-xs uppercase tracking-widest text-primary">{res.reference}</span>
                    <Send className="h-4 w-4 text-primary opacity-40" />
                </div>
                <p className="text-base text-muted-foreground leading-relaxed italic line-clamp-4">"{res.text.trim()}"</p>
            </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 text-left">
        <Button onClick={() => setView('books')} variant="outline" className="h-32 rounded-[2rem] gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group flex flex-col items-center justify-center p-4">
            <BookOpen className="h-8 w-8 mb-1 group-hover:scale-110 transition-transform" />
            <span className="font-black text-xs uppercase tracking-widest">Browse Bible</span>
        </Button>
        <Button variant="outline" asChild className="h-32 rounded-[2rem] gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group flex flex-col items-center justify-center p-4">
            <Link href="/dashboard/bible">
                <BookMarked className="h-8 w-8 mb-1 group-hover:scale-110 transition-transform" />
                <span className="font-black text-xs uppercase tracking-widest">Open Reader</span>
            </Link>
        </Button>
      </div>
      <div className="space-y-6 text-left">
        <div className="flex items-center justify-between px-1">
            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Kingdom Essential Scriptures</Label>
            <Badge variant="outline" className="h-5 px-2 text-[8px] font-bold text-primary border-primary/20 bg-primary/5 uppercase">Top Weapons</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {kingdomVerses.map((v, idx) => (
            <Button key={idx} variant="ghost" className="w-full justify-start h-auto py-6 px-6 rounded-[2rem] hover:bg-primary/5 group border border-transparent hover:border-primary/10 transition-all text-left block relative overflow-hidden bg-muted/5 shadow-sm" onClick={() => onSelectVerse(constructInvitationMessage(v.text, v.reference, `${window.location.origin}/dashboard/bible`))}>
              <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="font-black text-[10px] uppercase tracking-widest text-primary">{v.reference}</span>
                  <PlusCircle className="h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed italic line-clamp-2">&ldquo;{v.text}&rdquo;</p>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  const title = view === 'hub' ? "Share the Word" : view === 'books' ? "Select Book" : view === 'chapters' ? `${selectedBook}: Select Chapter` : `${selectedBook} ${selectedChapter}`;
  const desc = view === 'hub' ? `Equip ${soul?.firstName} with the living Word.` : `Browsing ${selectedBook || 'Bible'} for the harvest.`;

  const header = (
    <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 text-left">
          <div className="flex items-center gap-3 mb-2 text-left">
            {view !== 'hub' && <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full -ml-2" onClick={() => setView(view === 'verses' ? 'chapters' : view === 'chapters' ? 'books' : 'hub')}><ArrowLeft className="h-4 w-4" /></Button>}
            <Target className="h-5 w-5 text-primary" /><span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Kingdom Study</span>
          </div>
          <DialogHeader className="text-left text-left">
              <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">{title}</DialogTitle>
              <DialogDescription className="text-sm font-medium">{desc}</DialogDescription>
          </DialogHeader>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground/40" onClick={() => onOpenChange(false)}><X className="h-6 w-6" /></Button>
      </div>
    </div>
  );

  const body = (
    <div className="flex-grow overflow-hidden relative text-left">
        <ScrollArea className="h-full">
            <div className="p-10">
                {view === 'hub' && renderHub}
                {view === 'books' && <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-2">{bibleData.map(book => (<Button key={book.name} variant="outline" className="h-14 rounded-xl font-bold uppercase text-[9px] sm:text-xs" onClick={() => { setSelectedBook(book.name); setView('chapters'); }}>{book.name}</Button>))}</div>}
                {view === 'chapters' && <div className="p-2 grid grid-cols-5 sm:grid-cols-8 gap-2">{selectedBook && bibleData.find(b => b.name === selectedBook)?.chapters.map(ch => (<Button key={ch.chapter} variant="outline" className="h-10 w-10 p-0 rounded-lg font-black text-sm" onClick={() => handleSelectChapter(ch.chapter)}>{ch.chapter}</Button>))}</div>}
                {view === 'verses' && (
                    <div className="space-y-4 pb-12 text-left text-left">
                       <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6 text-left"><p className="text-[10px] font-black uppercase text-primary mb-1">SELECTED FOR SHARING</p><p className="text-xs font-bold text-muted-foreground">{selectedBook} {selectedChapter}:{selectedVerses.join(', ')}</p></div>
                       <div className="space-y-1 font-serif text-left">
                         {loadingVerses ? <div className="flex justify-center py-20 text-left"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div> : chapterContent?.verses.map(v => (<div key={v.verse} className={cn("p-3 rounded-xl transition-all cursor-pointer border-2 text-left", selectedVerses.includes(v.verse) ? "bg-primary/10 border-primary/40" : "bg-transparent border-transparent hover:bg-muted")} onClick={() => { const next = selectedVerses.includes(v.verse) ? selectedVerses.filter(id => id !== v.verse) : [...selectedVerses, v.verse].sort((a,b)=>a-b); setSelectedVerses(next); }}><sup className="text-[10px] font-black mr-2 opacity-40">{v.verse}</sup><span className="text-sm leading-relaxed">{v.text}</span></div>))}
                       </div>
                    </div>
                )}
            </div>
        </ScrollArea>
    </div>
  );

  const footer = view === 'verses' && (
    <div className="p-6 border-t bg-muted/5 flex flex-col sm:flex-row gap-3 text-left">
        <Button variant="outline" onClick={() => setSelectedVerses([])} className="rounded-xl h-12 flex-1 font-bold">Clear Selection</Button>
        <Button onClick={handleShareSelected} disabled={selectedVerses.length === 0} className="rounded-xl h-12 flex-1 font-black uppercase tracking-widest shadow-lg shadow-primary/20">PREPARE SHARE ({selectedVerses.length})</Button>
    </div>
  );

  if (isMobile) {
      return (
          <Drawer open={isOpen} onOpenChange={onOpenChange}>
              <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                  {header}
                  {body}
                  {footer}
              </DrawerContent>
          </Drawer>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col text-left">
        {header}
        {body}
        {footer || <div className="p-6 border-t bg-muted/5 flex justify-end shrink-0"><Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-xs">Close Hub</Button></div>}
      </DialogContent>
    </Dialog>
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
  const isMobile = useIsMobile();

  const [isCommChannelDialogOpen, setIsCommChannelDialogOpen] = React.useState(false);
  const [isHelpNeedDialogOpen, setIsHelpNeedDialogOpen] = React.useState(false);
  const [isShareTargetDialogOpen, setIsShareTargetDialogOpen] = React.useState(false);
  const [isPartnerSelectionDialogOpen, setIsPartnerSelectionDialogOpen] = React.useState(false);
  const [isPrayerCustomizationOpen, setIsPrayerCustomizationOpen] = React.useState(false);
  const [isStudyWordOpen, setIsStudyWordOpen] = React.useState(false);
  const [customMessageText, setCustomMessageText] = React.useState('');
  const [clickedActionId, setClickedActionId] = React.useState<string | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = React.useState(false);

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

  const resolveTemplate = React.useCallback((template: string, targetSoul: Soul) => {
      const gender = targetSoul.gender?.toLowerCase() || 'other';
      const pronouns = {
          subject: gender === 'female' ? 'she' : 'he',
          object: gender === 'female' ? 'her' : 'him',
          possessive: gender === 'female' ? 'her' : 'his'
      };
      
      return template
          .replace(/{name}/g, targetSoul.firstName)
          .replace(/{subject}/g, pronouns.subject)
          .replace(/{object}/g, pronouns.object)
          .replace(/{possessive}/g, pronouns.possessive);
  }, []);

  const finalizeLog = async (actionId: string, noteAddendum: string = '') => {
    if (!user || !firestore || !soul) return;
    setIsActionSubmitting(true);
    const action = actionItems.find(a => a.id === actionId);
    const batch = writeBatch(firestore);
    const soulRef = doc(firestore, `users/${soul.userId}/souls`, soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);
    const memberName = `${currentUserProfile?.firstName || ''} ${currentUserProfile?.lastName || ''}`.trim() || user.displayName || 'Member';
    const logEntry = { date: new Date(), note: `Logged via Identity Hub: ${action?.label}${noteAddendum ? ` - ${noteAddendum}` : ''}`, actions: [actionId], memberId: user.uid, memberName };
    batch.update(soulRef, { followUpLog: arrayUnion(logEntry), lastUpdatedAt: serverTimestamp() });
    batch.update(globalSoulRef, { followUpLog: arrayUnion(logEntry), lastUpdatedAt: serverTimestamp() });
    try { await batch.commit(); toast({ title: 'Kingdom Impact Logged' }); }
    catch (err) { errorEmitter.emit('permission-error', new FirestorePermissionError({ path: soulRef.path, operation: 'update' }, user)); }
    finally { setIsActionSubmitting(false); setClickedActionId(null); }
  };

  const handleActionClick = async (actionId: string) => {
    if (!soul) return;
    setClickedActionId(actionId);
    if (['phone_call', 'text_message', 'prayed_together'].includes(actionId) && !soul.phone) { toast({ variant: 'destructive', title: 'Phone Missing', description: `Please save a number for ${soul.firstName} first.` }); return; }
    switch (actionId) {
        case 'prayed_together': setCustomMessageText(resolveTemplate(prayerTemplates[0].text, soul)); setIsPrayerCustomizationOpen(true); return;
        case 'studied_bible': setIsStudyWordOpen(true); return;
        case 'text_message': setIsCommChannelDialogOpen(true); return;
        case 'introduced_friend': setIsShareTargetDialogOpen(true); return;
        case 'phone_call': window.location.href = `tel:${soul.phone}`; await finalizeLog(actionId, 'Dialer initiated'); return;
        case 'visited_home': if (address) { await finalizeLog(actionId, `Navigated to venue: ${address}`); window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank'); } else toast({ variant: 'destructive', title: 'Location Undefined' }); return;
        case 'helped_with_need': setIsHelpNeedDialogOpen(true); return;
        case 'invited_to_event': await finalizeLog(actionId, 'Redirected to Events Hub'); router.push('/dashboard/events'); return;
        case 'shared_meal':
        case 'gave_gift':
            const mPath = actionId === 'shared_meal' ? '/marketplace' : '/marketplace/gifts';
            router.push(`${mPath}?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}&actionId=${actionId}`);
            return;
        default: await finalizeLog(actionId);
    }
  };

  const handleCommChoice = (channel: 'whatsapp' | 'sms') => {
      if (!soul?.phone || !clickedActionId) return;
      const cleanPhone = soul.phone.replace(/\+/g, '').replace(/\D/g, '');
      const message = customMessageText || `Hi ${soul.firstName}, I'm thinking of you today and praying for you. God bless you!`;
      const messageText = encodeURIComponent(message);
      if (channel === 'whatsapp') window.open(`https://wa.me/${cleanPhone}?text=${messageText}`, '_blank');
      else window.location.href = `sms:${soul.phone}?body=${messageText}`;
      finalizeLog(clickedActionId, `Sent via ${channel.toUpperCase()}: ${message.substring(0, 30)}...`);
      setIsCommChannelDialogOpen(false); setCustomMessageText('');
  };

  const handleShareToPartner = async (partner: UserProfile['accountabilityPartners'][0]) => {
      if (!user || !firestore || !soul || !currentUserProfile) return;
      const wonAt = safeToDate(soul.wonAt);
      const text = `SHARING SOUL DATA:\nName: ${soul.firstName} ${soul.lastName}\nStatus: ${soul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\nLet's coordinate follow-up on Testify.`;
      try {
          const participantIds = [user.uid, partner.userId].sort();
          const chatsRef = collection(firestore, 'chats');
          const q = query(chatsRef, where('participantIds', '==', participantIds), where('isGroupChat', '==', false));
          const snap = await getDocs(q);
          let chatId: string;
          if (!snap.empty) chatId = snap.docs[0].id;
          else {
              const otherDoc = await getDoc(doc(firestore, 'users', partner.userId));
              const otherProfile = otherDoc.data() as UserProfile;
              const newChat = { participantIds, participantInfo: { [user.uid]: { firstName: currentUserProfile.firstName, lastName: currentUserProfile.lastName, photoURL: currentUserProfile.photoURL || '' }, [partner.userId]: { firstName: partner.firstName, lastName: partner.lastName, photoURL: partner.photoURL || '' } }, lastUpdatedAt: serverTimestamp(), isGroupChat: false, hasMessages: true };
              const ref = await addDoc(chatsRef, newChat); chatId = ref.id;
          }
          await addDoc(collection(firestore, 'chats', chatId, 'messages'), { senderId: user.uid, text, createdAt: serverTimestamp() });
          await updateDoc(doc(firestore, 'chats', chatId), { lastUpdatedAt: serverTimestamp(), hasMessages: true });
          toast({ title: 'Shared with Partner!' });
          finalizeLog('introduced_friend', `Shared with partner: ${partner.firstName}`);
          setIsPartnerSelectionDialogOpen(false); setIsShareTargetDialogOpen(false); router.push(`/dashboard/chats/${chatId}`);
      } catch (e) { toast({ variant: 'destructive', title: 'Share Failed' }); }
  };

  const PrayerBody = (
    <div className="p-8 space-y-8 text-left text-left">
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1 text-left">
                <HandHeart className="h-4 w-4 text-primary text-left" />
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Select Prayer Focus</Label>
            </div>
            <div className="grid grid-cols-2 gap-2 text-left">
                {prayerTemplates.map(t => (
                    <Button key={t.id} variant="outline" size="sm" className="rounded-xl h-10 px-3 text-[10px] font-black uppercase tracking-tight border-primary/20 hover:bg-primary/5 hover:text-primary transition-all text-center leading-tight whitespace-normal break-words" onClick={() => setCustomMessageText(resolveTemplate(t.text, soul))}>{t.label}</Button>
                ))}
            </div>
        </div>
        <div className="space-y-3 text-left">
            <div className="flex items-center gap-2 mb-1">
                <Edit className="h-4 w-4 text-primary" />
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Customize Message</Label>
            </div>
            <Textarea value={customMessageText} onChange={e => setCustomMessageText(e.target.value)} placeholder="The Spirit of God leads your words..." className="min-h-[220px] rounded-[2rem] bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6" />
        </div>
    </div>
  );

  return (
    <div className="space-y-6 text-left">
      <Card className="rounded-none sm:rounded-[2rem] overflow-hidden border-none shadow-2xl bg-card/50 backdrop-blur-sm border-t-8 border-t-primary/20 text-left">
        <CardHeader className="p-8 pb-4 text-center text-left">
            <div className="relative inline-block mx-auto mb-4 text-left">
                <Dialog>
                    <DialogTrigger asChild disabled={!soul.photoURL}>
                        <div className={cn("h-48 w-48 border-4 border-background shadow-xl ring-2 ring-primary/10 transition-all active:scale-95", soul.photoURL && "cursor-pointer hover:scale-105")}>
                            <Avatar className="h-full w-full">
                                <AvatarImage src={soul.photoURL || undefined} className="object-contain" />
                                <AvatarFallback className="text-3xl font-black bg-primary/10 text-primary text-center flex items-center justify-center w-full h-full text-left">{soul.firstName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                    </DialogTrigger>
                    {soul.photoURL && (
                        <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
                            <DialogHeader className="sr-only text-left text-left"><DialogTitle className="text-left">Soul Photo</DialogTitle></DialogHeader>
                            <div className="relative h-full w-full flex items-center justify-center p-4 text-center text-left">
                                <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center text-left text-left text-left">
                                    <Image src={soul.photoURL} alt={soul.firstName} fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized />
                                </div>
                            </div>
                        </DialogContent>
                    )}
                </Dialog>
                {address && <Button size="icon" className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full shadow-lg border-2 border-background" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')} title="View Map"><MapPin className="h-5 w-5" /></Button>}
            </div>
            <div className="flex flex-col items-center gap-2">
                <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-center truncate w-full"> {soul.firstName} {soul.lastName}</CardTitle>
                <div className="flex gap-2 justify-center items-center">
                    <Badge className={cn("h-5 px-2 text-[9px] uppercase font-black tracking-widest justify-center", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                    <MutualConnectBadge soul={soul} />
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-8 pt-0 space-y-6 text-left">
            <Separator className="opacity-50" />
            <div className="space-y-4">
                <div className="flex items-center justify-between text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Spiritual Identity</p>
                    <div className="flex items-center gap-1">
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left"><Download className="h-4 w-4 text-left" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl text-left"><DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-left">Select Format</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => onExportSingle(soul, 'csv')}>CSV Export</DropdownMenuItem><DropdownMenuItem onSelect={() => onExportSingle(soul, 'pdf')}>PDF Report</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left" onClick={() => onEdit(soul)}><Edit className="h-4 w-4 text-left" /></Button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Full Name</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.firstName} {soul.lastName}</p></div>
                    <div className="space-y-1"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Gender/Age</p><p className="text-[11px] sm:text-xs font-bold">{soul.gender || 'N/A'} • {soul.age ? `${soul.age} yrs` : 'Age N/A'}</p></div>
                    <div className="space-y-1"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Relationship</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.relationship || 'N/A'}</p></div>
                    <div className="space-y-1"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Work Status</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.workStatus || 'N/A'}</p></div>
                </div>
            </div>
            <Separator className="opacity-20" />
            <div className="space-y-3">
                <div className="flex items-center justify-between text-left text-left"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Contact Identity</p><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left" onClick={() => onEdit(soul)}><Edit className="h-4 w-4" /></Button></div>
                <div className="space-y-2">{soul.phone ? <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-foreground"><Phone className="h-3.5 w-3.5 text-primary shrink-0" />{soul.phone}</div> : <p className="text-[9px] text-muted-foreground/40 italic">No phone recorded</p>}{soul.email && <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-foreground"><Mail className="h-3.5 w-3.5 text-primary shrink-0" />{soul.email}</div>}</div>
            </div>
            <Separator className="opacity-20" />
            
            {/* Relational Actions - Vertical List for Mobile */}
            <div className="space-y-4">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Relational Actions</p>
                <div className="flex flex-col gap-2">
                    {actionItems.map(action => {
                        const Icon = iconMap[action.id] || Heart;
                        const isThisProcessing = clickedActionId === action.id && isActionSubmitting;
                        return (
                            <Button key={action.id} variant="outline" className="flex items-center justify-start gap-3 h-12 px-4 rounded-xl border-2 border-transparent bg-muted/20 hover:bg-primary/5 hover:border-primary/10 transition-all group w-full text-left" onClick={() => handleActionClick(action.id)} disabled={isActionSubmitting}>
                                {isThisProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Icon className="h-4 w-4 text-primary" />}
                                <span className="text-xs font-bold uppercase tracking-tight truncate flex-1">{action.label}</span>
                                <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-100 transition-opacity" />
                            </Button>
                        )
                    })}
                </div>
            </div>

            <Separator className="opacity-20" />
            <div className="space-y-4 pt-2 text-left">
                <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2"><History className="h-3.5 w-3.5" /> Interaction History</p><Button variant="ghost" className="h-6 text-[8px] font-black uppercase text-primary hover:bg-primary/5" onClick={() => onViewHistory(soul)}>View All</Button></div>
                <div className="space-y-4 pl-1">
                    {sortedHistory.length > 0 ? sortedHistory.slice(0, 3).map((log, index) => {
                            const logDate = safeToDate(log.date);
                            return (
                                <div key={index} className="relative pl-4 border-l-2 border-primary/20 text-left">
                                    <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest mb-1">{logDate ? format(logDate, "MMM d, yyyy") : 'Recently'}{log.memberName && <span className="ml-2 text-primary/40">• By {log.memberName.split(' ')[0]}</span>}</p>
                                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 italic">&ldquo;{log.note || 'Interaction logged.'}&rdquo;</p>
                                </div>
                            );
                        }) : <div className="py-4 text-center border border-dashed rounded-xl bg-muted/5"><p className="text-sm text-muted-foreground/40 italic">No interactions recorded.</p></div>
                    }
                </div>
            </div>
            <div className="pt-2 space-y-3">
                <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20" onClick={() => onFollowUp(soul)}>LOG FOLLOW-UP</Button>
                <Button variant="ghost" className="w-full h-11 text-destructive font-bold uppercase tracking-widest text-[10px]" onClick={() => onDelete(soul)}><Trash2 className="mr-2 h-4 w-4" /> DELETE RECORD</Button>
            </div>
        </CardContent>
      </Card>
      
      <AnimatePresence>
          {isPrayerCustomizationOpen && isMobile ? (
              <Drawer open={isPrayerCustomizationOpen} onOpenChange={setIsPrayerCustomizationOpen}>
                  <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
                      <div className="p-8 border-b shrink-0 bg-muted/10 text-left"><DrawerHeader className="text-left flex-shrink-0 text-left"><div className="flex items-center gap-2 mb-2"><HeartHandshake className="h-5 w-5 text-primary text-left" /><span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left">Kingdom Intercession</span></div><DrawerTitle className="text-2xl font-black font-headline uppercase">Kingdom Intercession</DrawerTitle><DrawerDescription className="text-sm font-medium mt-1">Draft a powerful prayer for {soul.firstName}.</DrawerDescription></DrawerHeader></div>
                      <ScrollArea className="flex-grow min-h-0 text-left">{PrayerBody}</ScrollArea>
                      <div className="p-8 border-t flex flex-col gap-3 shrink-0 bg-background/80 backdrop-blur-sm"><Button onClick={() => handlePrayerCustomizationConfirm(customMessageText)} disabled={!customMessageText.trim()} className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest">CONTINUE TO CHANNEL</Button><Button variant="outline" onClick={() => setIsPrayerCustomizationOpen(false)} className="rounded-xl h-12 font-bold">Cancel</Button></div>
                  </DrawerContent>
              </Drawer>
          ) : (
              <Dialog open={isPrayerCustomizationOpen} onOpenChange={setIsPrayerCustomizationOpen}>
                  <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl text-left"><div className="p-8 border-b bg-muted/10 text-left"><DialogHeader className="text-left"><DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Kingdom Intercession</DialogTitle><DialogDescription className="text-sm font-medium">Draft a powerful prayer for {soul.firstName}.</DialogDescription></DialogHeader></div><div className="p-8 space-y-6 text-left">{PrayerBody}<Button onClick={() => handlePrayerCustomizationConfirm(customMessageText)} disabled={!customMessageText.trim()} className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest">CONTINUE TO CHANNEL</Button></div></DialogContent>
              </Dialog>
          )}
      </AnimatePresence>
    </div>
  );
}

function ProfileActionDialog({ 
  soul, 
  isOpen, 
  onOpenChange,
  onFollowUp,
  onViewHistory,
  onEdit,
  onAssess,
  onOpenAssignDialog,
  onExportSingle,
  onDelete
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
                <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                        <div className="flex items-center gap-2 mb-2 text-left">
                            <Sparkles className="h-4 w-4 text-primary text-left" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Identity Hub</span>
                        </div>
                        <DrawerHeader className="text-left flex-shrink-0 text-left">
                            <DrawerTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left">{title}</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium mt-1 text-left text-left">Full spiritual snapshot for the harvest workforce.</DrawerDescription>
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
            <DialogContent className="sm:max-w-2xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left">
                <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                    <div className="flex items-center gap-2 mb-2 text-left text-left">
                        <Sparkles className="h-4 w-4 text-primary text-left" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Identity Hub</span>
                    </div>
                    <DialogHeader className="text-left text-left">
                        <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left">{title}</DialogTitle>
                        <DialogDescription className="text-sm font-medium mt-1 text-left">Full spiritual snapshot for the harvest workforce.</DialogDescription>
                    </DialogHeader>
                </div>
                <div className="flex-1 min-h-0 text-left">
                    <ScrollArea className="h-full text-left text-left">
                        {content}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const SoulCard = React.memo(({ soul, onClick }: { soul: Soul; onClick: () => void; }) => (
    <Card onClick={onClick} className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-b-2 sm:border-b shadow-none bg-card/50 backdrop-blur-sm transition-all duration-300 cursor-pointer hover:bg-primary/[0.02] text-left">
        <div className="flex items-center justify-between p-4 gap-4 text-left">
            <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 text-left")}>
                    <AvatarImage src={soul.photoURL || undefined} className="object-cover text-left" />
                    <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-left"> {soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 text-left">
                    <p className="font-bold truncate text-[13px] sm:text-base leading-tight capitalize tracking-tight text-left">{soul.firstName || 'Unknown'} {soul.lastName || ''}</p>
                    <div className="flex flex-wrap gap-1.5 items-center mt-1.5 text-left">
                        <Badge className={cn("h-5 px-1.5 text-[9px] uppercase font-black tracking-widest text-left", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                        {soul.fellowshipName && <Badge variant="secondary" className="h-5 px-1.5 text-[8px] uppercase font-black tracking-tighter bg-primary/5 text-primary border-primary/20 shrink-0 text-left">Fellowship</Badge>}
                    </div>
                </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-20 text-left" />
        </div>
    </Card>
));
SoulCard.displayName = "SoulCard";

const SoulTableRow = React.memo(({ soul, isSelected, onSelect }: { soul: Soul; isSelected: boolean; onSelect: () => void; }) => (
    <TableRow className={cn("border-b hover:bg-muted/30 transition-colors cursor-pointer text-left", isSelected && "bg-primary/[0.03]")} onClick={() => onSelect()}>
        <TableCell className="font-medium p-4 text-left">
            <div className="flex items-center gap-4 text-left">
                <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 text-left")}>
                    <AvatarImage src={soul.photoURL || undefined} className="object-cover text-left" />
                    <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-left"> {soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 text-left">
                    <div className="font-black text-xs sm:text-sm md:text-base truncate capitalize tracking-tight text-left">{soul.firstName} {soul.lastName}</div>
                    {soul.church && <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 font-medium truncate opacity-70 text-left"><Church className="h-3 w-3 shrink-0 text-left" />{soul.church}</div>}
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

  if (loading) return <div className="space-y-4 text-left">{[...Array(5)].map((_, i) => (<div key={i} className="flex items-center space-x-4 p-4 border-b last:border-0 bg-card/50 backdrop-blur-sm rounded-xl text-left"><Skeleton className="h-12 w-12 rounded-full text-left" /><div className="space-y-2 flex-1 text-left"><Skeleton className="h-5 w-3/4 text-left" /><Skeleton className="h-4 w-1/2 text-left" /></div><Skeleton className="h-9 w-24 rounded-xl text-left" /></div>))}</div>;
  
  if (souls.length === 0) return <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm border-2 border-dashed text-left"><CardContent className="text-left"><div className="text-center py-24 flex flex-col items-center text-left"><div className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-primary/20 text-left text-left"><HeartHandshake className="h-10 w-10 text-primary opacity-40 text-left" /></div><h3 className="text-xl font-black font-headline uppercase tracking-tight text-left">Your Harvest Field</h3><p className="text-sm text-muted-foreground italic font-medium max-w-[280px] leading-relaxed opacity-60 text-balance text-center text-left">The souls you lead to Christ will appear here for collaborative discipleship and strategic follow-up.</p></div></CardContent></Card>;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start text-left">
        <div className="flex-1 w-full text-left">
            {isMobile ? (
                <div className="space-y-px text-left text-left">{souls.map((soul) => (<SoulCard key={soul.id} soul={soul} onClick={() => onSelect(soul.id)} />))}</div>
            ) : (
                <Card className="rounded-none sm:rounded-[2rem] border-x-0 sm:border-x shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden text-left text-left">
                    <CardHeader className="p-8 border-b bg-muted/5 text-left text-left"><CardTitle className="text-2xl font-black font-headline tracking-tight flex items-center gap-3 uppercase text-left text-left"><Heart className="h-6 w-6 text-primary fill-current text-left text-left" />Harvest Dashboard</CardTitle><CardDescription className="text-base font-medium text-left">Keep track of spiritual development and community integration.</CardDescription></CardHeader>
                    <CardContent className="p-0 text-left text-left">
                        <div className="overflow-x-auto text-left">
                            <Table className="text-left">
                                <TableHeader className="bg-muted/10 text-left text-left"><TableRow className="hover:bg-transparent text-left"><TableHead className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Soul Identity</TableHead></TableRow></TableHeader>
                                <TableBody className="text-left text-left">{souls.map((soul) => (<SoulTableRow key={soul.id} soul={soul} isSelected={selectedId === soul.id} onSelect={() => onSelect(soul.id)} />))}</TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
        <ProfileActionDialog soul={selectedSoul} isOpen={!!selectedId && !!selectedSoul} onOpenChange={(open) => !open && onSelect(null)} onFollowUp={onFollowUp} onViewHistory={onViewHistory} onEdit={onEdit} onAssess={onAssess} onOpenAssignDialog={onOpenAssignDialog} onExportSingle={onExportSingle} onDelete={onDelete} />
    </div>
  );
}
