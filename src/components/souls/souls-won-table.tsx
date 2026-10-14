'use client';

import * as React from "react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { format, differenceInMinutes } from "date-fns";
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
  Plus,
  UserPlus,
  Smartphone
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import type { Soul, FollowUpStatus, UserProfile, Chat, BibleChapterOutput, ChatMessage } from "@/lib/types";
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
  DropdownMenuTrigger,
  DropdownMenuLabel,
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
import { actionItems, statusOptions, prayerTemplates, kingdomVerses } from "@/lib/follow-up-data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NextImage from 'next/image';
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

export function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

export const iconMap: Record<string, any> = {
    'prayed_together': HandHeart,
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

  const constructInvitationMessage = useCallback((verseText: string, reference: string, link: string) => {
    return `"${verseText.trim()}" — ${reference}\n\nJoin the harvest at Testify! Visit: ${window.location.origin}/bible`;
  }, []);

  const handleSearch = async () => {
      if (!bibleSearch.trim()) return;
      setIsSearching(true);
      try {
          const res = await fetch(`https://bible-api.com/${encodeURIComponent(bibleSearch)}`);
          if (res.ok) {
              const data = await res.json();
              if (data.verses) {
                  setSearchResults([{ reference: data.reference, text: data.text }]);
              }
          }
      } catch (e) {
          console.warn("Bible search failed", e);
      } finally {
          setIsSearching(false);
      }
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
    } catch (e) { console.error(e); }
    finally { setLoadingVerses(false); }
  };

  const toggleVerse = (num: number) => {
    setSelectedVerses(prev => prev.includes(num) ? prev.filter(v => v !== num) : [...prev, num].sort((a,b) => a-b));
  };

  const handleShareSelected = () => {
    if (!chapterContent || selectedVerses.length === 0) return;
    const selectedTexts = chapterContent.verses.filter(v => selectedVerses.includes(v.verse)).map(v => v.text).join(' ');
    const reference = `${chapterContent.book} ${chapterContent.chapter}:${selectedVerses.join(', ')}`;
    const link = `${window.location.origin}/dashboard/bible?book=${encodeURIComponent(chapterContent.book)}&chapter=${chapterContent.chapter}`;
    onSelectVerse(constructInvitationMessage(selectedTexts, reference, link));
  };

  const renderHub = (
    <div className="space-y-8 text-left">
      <div className="space-y-4">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
            <Input placeholder="Search Bible..." value={bibleSearch} onChange={e => setBibleSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="h-12 pl-10 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" />
            <Button onClick={handleSearch} disabled={isSearching || !bibleSearch.trim()} variant="ghost" size="sm" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3 rounded-xl font-black text-[9px] uppercase text-primary">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'SEARCH'}
            </Button>
        </div>
        {searchResults.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-2">
                {searchResults.map((res, idx) => (
                    <Button key={idx} variant="outline" className="w-full h-auto p-4 rounded-2xl border-primary/20 bg-primary/5 flex flex-col items-start gap-3 text-left hover:bg-primary/10 transition-all border-2 border-dashed" onClick={() => onSelectVerse(constructInvitationMessage(res.text, res.reference, `${window.location.origin}/dashboard/bible`))}>
                        <div className="flex items-center justify-between w-full">
                            <span className="font-black text-[9px] uppercase tracking-widest text-primary">{res.reference}</span>
                            <Send className="h-3.5 w-3.5 text-primary opacity-40" />
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed italic line-clamp-3">"{res.text.trim()}"</p>
                    </Button>
                ))}
            </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Button onClick={() => setView('books')} variant="outline" className="h-24 rounded-[2rem] gap-2 border-2 border-primary/20 text-primary hover:bg-primary/5 group flex flex-col items-center justify-center">
            <BookOpen className="h-7 w-7 mb-1 group-hover:scale-110 transition-transform" />
            <span className="font-black text-[10px] uppercase tracking-widest">Browse</span>
        </Button>
        <Button variant="outline" asChild className="h-24 rounded-[2rem] gap-2 border-2 border-primary/20 text-primary hover:bg-primary/5 group flex flex-col items-center justify-center">
            <Link href="/dashboard/bible">
                <BookMarked className="h-7 w-7 mb-1 group-hover:scale-110 transition-transform" />
                <span className="font-black text-[10px] uppercase tracking-widest">Reader</span>
            </Link>
        </Button>
      </div>
    </div>
  );

  const renderBooks = (
    <div className="grid grid-cols-2 gap-2 text-left">
      {bibleData.map(book => (
        <Button key={book.name} variant="outline" className="h-11 rounded-xl font-bold uppercase text-[9px]" onClick={() => handleSelectBook(book.name)}>
          {book.name}
        </Button>
      ))}
    </div>
  );

  const renderChapters = (
    <div className="grid grid-cols-5 gap-2 text-left">
       {selectedBook && bibleData.find(b => b.name === selectedBook)?.chapters.map(ch => (
         <Button key={ch.chapter} variant="outline" className="h-9 w-9 p-0 rounded-lg font-black text-xs" onClick={() => handleSelectChapter(ch.chapter)}>
           {ch.chapter}
         </Button>
       ))}
    </div>
  );

  const renderVerses = (
    <div className="space-y-4 pb-12 text-left">
       <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6">
          <p className="text-[10px] font-black uppercase text-primary mb-1">SELECTED</p>
          <p className="text-xs font-bold text-muted-foreground">
            {selectedVerses.length > 0 ? `${selectedBook} ${selectedChapter}:${selectedVerses.join(', ')}` : 'Select verses...'}
          </p>
       </div>
       <div className="space-y-1 font-serif">
         {loadingVerses ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary opacity-20" /></div> : chapterContent?.verses.map(v => (
           <div key={v.verse} className={cn("p-2.5 rounded-xl transition-all cursor-pointer border-2 text-left", selectedVerses.includes(v.verse) ? "bg-primary/10 border-primary/40" : "bg-transparent border-transparent hover:bg-muted/50")} onClick={() => handleVerseClick(v.verse)}>
              <sup className="text-[9px] font-black mr-2 opacity-40">{v.verse}</sup>
              <span className="text-sm leading-relaxed">{v.text}</span>
           </div>
         ))}
       </div>
    </div>
  );

  const header = (
    <div className="p-6 border-b bg-muted/10 shrink-0 text-left">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-2">
            {view !== 'hub' && <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full -ml-2" onClick={() => setView(view === 'verses' ? 'chapters' : view === 'chapters' ? 'books' : 'hub')}><ArrowLeft className="h-4 w-4" /></Button>}
            <Target className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Kingdom Study</span>
          </div>
          <DialogHeader className="text-left p-0">
            <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase text-left">{view === 'hub' ? "Share the Word" : view === 'books' ? "Select Book" : view === 'chapters' ? `${selectedBook}` : `${selectedBook} ${selectedChapter}`}</DialogTitle>
          </DialogHeader>
        </div>
        {view !== 'hub' && <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-muted-foreground/40" onClick={() => onOpenChange(false)}><X className="h-5 w-5" /></Button>}
      </div>
    </div>
  );

  if (isMobile) {
      return (
          <Sheet open={isOpen} onOpenChange={onOpenChange}>
              <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                  {header}
                  <ScrollArea className="flex-grow p-6">{view === 'hub' ? renderHub : view === 'books' ? renderBooks : view === 'chapters' ? renderChapters : renderVerses}</ScrollArea>
                  {view === 'verses' && (
                    <div className="p-6 border-t bg-background/80 backdrop-blur-sm flex flex-col gap-3">
                        <Button onClick={handleShareSelected} disabled={selectedVerses.length === 0} className="rounded-2xl h-14 font-black shadow-xl uppercase tracking-widest">PREPARE SHARE ({selectedVerses.length})</Button>
                    </div>
                  )}
              </SheetContent>
          </Sheet>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col text-left">
        {header}
        <ScrollArea className="flex-grow p-8">{view === 'hub' ? renderHub : view === 'books' ? renderBooks : view === 'chapters' ? renderChapters : renderVerses}</ScrollArea>
        {view === 'verses' && (
            <div className="p-6 border-t bg-muted/5 flex justify-end gap-3 shrink-0">
                <Button onClick={handleShareSelected} disabled={selectedVerses.length === 0} className="rounded-xl h-11 font-black shadow-lg uppercase tracking-widest">PREPARE SHARE ({selectedVerses.length})</Button>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function IntercessionHubDialog({ isOpen, onOpenChange, soul, onComplete }: { isOpen: boolean, onOpenChange: (open: boolean) => void, soul: Soul | null, onComplete: (msg: string) => void }) {
    const [customText, setCustomText] = useState('');
    const isMobile = useIsMobile();
    
    useEffect(() => {
        if (isOpen && soul) {
            const template = prayerTemplates[0].text;
            const gender = soul.gender?.toLowerCase() || 'other';
            const pronouns = {
                subject: gender === 'female' ? 'she' : 'he',
                object: gender === 'female' ? 'her' : 'him',
                possessive: gender === 'female' ? 'her' : 'his'
            };
            setCustomText(template.replace(/{name}/g, soul.firstName).replace(/{subject}/g, pronouns.subject).replace(/{object}/g, pronouns.object).replace(/{possessive}/g, pronouns.possessive));
        }
    }, [isOpen, soul]);

    const content = (
        <div className="p-6 space-y-6 text-left">
            <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Focus Points</Label>
                <div className="flex flex-wrap gap-2">
                    {prayerTemplates.map(t => (
                        <Button key={t.id} variant="outline" size="sm" className="rounded-full h-8 px-4 text-[9px] font-black uppercase border-primary/20 hover:bg-primary/5" onClick={() => {
                            const gender = soul?.gender?.toLowerCase() || 'other';
                            const pronouns = { subject: gender === 'female' ? 'she' : 'he', object: gender === 'female' ? 'her' : 'him', possessive: gender === 'female' ? 'her' : 'his' };
                            setCustomText(t.text.replace(/{name}/g, soul?.firstName || 'friend').replace(/{subject}/g, pronouns.subject).replace(/{object}/g, pronouns.object).replace(/{possessive}/g, pronouns.possessive));
                        }}>{t.label}</Button>
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Personalize Revelation</Label>
                <Textarea value={customText} onChange={e => setCustomText(e.target.value)} className="min-h-[200px] rounded-2xl bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6" />
            </div>
            <Button onClick={() => onComplete(customText)} disabled={!customText.trim()} className="w-full h-14 rounded-2xl font-black shadow-lg uppercase tracking-widest">PROCEED TO HUB</Button>
        </div>
    );

    const header = (
        <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
            <DialogHeader className="text-left p-0">
                <div className="flex items-center gap-3 mb-2">
                    <HandHeart className="h-5 w-5 text-primary" />
                    <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Kingdom Intercession</span>
                </div>
                <DialogTitle className="text-2xl font-black font-headline uppercase text-left">Prayer for {soul?.firstName}</DialogTitle>
                <DialogDescription className="text-sm font-medium">Draft a powerful word of blessing.</DialogDescription>
            </DialogHeader>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onOpenChange}>
                <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    {header}
                    <ScrollArea className="flex-grow">{content}</ScrollArea>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left">
                {header}
                {content}
            </DialogContent>
        </Dialog>
    );
}

export function MessageHubDialog({ isOpen, onOpenChange, soul, onChannelSelect }: { isOpen: boolean, onOpenChange: (open: boolean) => void, soul: Soul | null, onChannelSelect: (channel: 'whatsapp' | 'sms') => void }) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center text-left">
                <DialogHeader className="text-center space-y-2 p-0">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2"><MessageSquare className="h-7 w-7 text-primary" /></div>
                    <DialogTitle className="text-2xl font-black font-headline uppercase text-left">Message Hub</DialogTitle>
                    <DialogDescription className="text-sm font-medium text-left">How would you like to encourage {soul?.firstName}?</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 pt-6">
                    <Button onClick={() => onChannelSelect('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-widest shadow-lg shadow-primary/20"><WhatsAppIcon className="h-5 w-5" /> WhatsApp</Button>
                    <Button onClick={() => onChannelSelect('sms')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-widest border-2 border-primary/20 text-primary hover:bg-primary/5"><MessageSquare className="h-5 w-5" /> Standard SMS</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

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
  const router = useRouter();

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

  const handleActionClick = async (actionId: string) => {
    if (!soul) return;
    switch (actionId) {
        case 'matchmaking': router.push(`/matchmaking?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}`); return;
        case 'phone_call': window.location.href = `tel:${soul.phone}`; return;
        case 'visited_home': if (address) { window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank'); } return;
        case 'invited_to_event': router.push('/dashboard/events'); return;
        case 'shared_meal':
        case 'gave_gift': router.push(`${actionId === 'shared_meal' ? '/marketplace' : '/marketplace/gifts'}?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}&actionId=${actionId}`); return;
        default: onFollowUp(soul);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <Card className="rounded-none sm:rounded-[2rem] overflow-hidden border-none shadow-2xl bg-card/50 backdrop-blur-sm border-t-8 border-t-primary/20 text-left">
        <CardHeader className="p-8 pb-4 text-center">
            <div className="relative inline-block mx-auto mb-4">
                <Dialog>
                    <DialogTrigger asChild disabled={!soul.photoURL}>
                        <Avatar className={cn("h-48 w-48 border-4 border-background shadow-xl ring-2 ring-primary/10 transition-all active:scale-95", soul.photoURL && "cursor-pointer hover:scale-105")}>
                            <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                            <AvatarFallback className="text-3xl font-black bg-primary/10 text-primary">{soul.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </DialogTrigger>
                    {soul.photoURL && (
                        <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
                            <DialogHeader className="sr-only text-left"><DialogTitle>Soul Photo</DialogTitle></DialogHeader>
                            <div className="relative h-full w-full flex items-center justify-center p-4">
                                <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center">
                                    <NextImage src={soul.photoURL} alt={soul.firstName} fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized />
                                </div>
                            </div>
                        </DialogContent>
                    )}
                </Dialog>
                {address && (
                    <Button size="icon" className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full shadow-lg border-2 border-background" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')} title="View Map"><MapPin className="h-5 w-5" /></Button>
                )}
            </div>
            <div className="flex flex-col items-center gap-2">
                <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-center truncate w-full">{soul.firstName} {soul.lastName}</CardTitle>
                <div className="flex gap-2 justify-center items-center"><Badge className={cn("h-5 px-2 text-[9px] uppercase font-black tracking-widest", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge><MutualConnectBadge soul={soul} /></div>
            </div>
        </CardHeader>
        <CardContent className="p-8 pt-0 space-y-6 text-left">
            <Separator className="opacity-50" />
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Spiritual Identity</p>
                    <div className="flex items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"><Download className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl"><DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Select Format</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => onExportSingle(soul, 'csv')}>CSV Export</DropdownMenuItem><DropdownMenuItem onSelect={() => onExportSingle(soul, 'pdf')}>PDF Report</DropdownMenuItem></DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onEdit(soul)}><Edit className="h-4 w-4" /></Button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Full Name</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.firstName} {soul.lastName}</p></div>
                    <div className="space-y-1"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Gender/Age</p><p className="text-[11px] sm:text-xs font-bold">{soul.gender || 'N/A'} • {soul.age ? `${soul.age} yrs` : 'Age N/A'}</p></div>
                    <div className="space-y-1"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Relationship</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.relationship || 'N/A'}</p></div>
                    <div className="space-y-1"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Work Status</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.workStatus || 'N/A'}</p></div>
                    <div className="space-y-1"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Rel. Status</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.maritalStatus || 'N/A'}</p></div>
                    <div className="space-y-1"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Nickname</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.nickname || 'N/A'}</p></div>
                </div>
            </div>
            <Separator className="opacity-20" /><div className="space-y-3 text-left"><div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Contact Identity</p><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onEdit(soul)}><Edit className="h-4 w-4" /></Button></div><div className="space-y-2">{soul.phone ? (<div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-foreground"><Phone className="h-3.5 w-3.5 text-primary shrink-0" />{soul.phone}</div>) : (<p className="text-[9px] text-muted-foreground/40 italic">No phone recorded</p>)}{soul.email && (<div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-foreground"><Mail className="h-3.5 w-3.5 text-primary shrink-0" />{soul.email}</div>)}</div></div>
            <Separator className="opacity-20" /><div className="space-y-4 text-left"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Relational Actions</p><div className="flex flex-col gap-1.5">{actionItems.filter(a => a.id !== 'matchmaking' || soul.maritalStatus !== 'Married').map(action => { const Icon = iconMap[action.id] || Heart; return (<Button key={action.id} variant="ghost" className="flex items-center justify-start gap-3 h-11 px-4 rounded-xl border border-transparent hover:bg-primary/5 hover:border-primary/10 transition-all text-left group w-full" onClick={() => handleActionClick(action.id)}><div className="h-8 w-8 rounded-lg bg-muted/20 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">{isActionSubmitting && clickedActionId === action.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Icon className="h-4 w-4 text-primary" />}</div><span className="text-xs font-bold uppercase tracking-tight truncate flex-1">{action.label}</span><ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-20 group-hover:opacity-100 transition-opacity" /></Button>) })}</div></div>
            <Separator className="opacity-20" /><div className="space-y-4 text-left"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Harvest Context</p><div className="space-y-1"><p className="text-[11px] sm:text-xs font-bold flex items-center gap-1.5 truncate"><Target className="h-3.5 w-3.5 text-primary" />Source: {soul.source}</p></div></div>
            <Separator className="opacity-20" /><div className="space-y-4 text-left"><div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Kingdom Placement</p><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onOpenAssignDialog(soul)}><PlusCircle className="h-4 w-4" /></Button></div><div className="space-y-3"><div className="flex items-center gap-3 p-2 rounded-xl bg-primary/5 border border-primary/10"><HeartHandshake className="h-4 w-4 text-primary shrink-0" /><div className="min-w-0 flex-1"><p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest">Fellowship</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.fellowshipName || 'No Fellowship'}</p></div></div><div className="flex items-center gap-3 p-2 rounded-xl bg-blue-500/5 border border-blue-500/10"><Users className="h-4 w-4 text-blue-500 shrink-0" /><div className="min-w-0 flex-1"><p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest">Association</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.associationName || 'No Association'}</p></div></div></div></div>
            <Separator className="opacity-20" /><div className="space-y-4 text-left"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Spiritual Milestones</p><div className="grid grid-cols-2 gap-2">{[{ label: 'Church', val: soul.attendingChurch, icon: Church }, { label: 'Word Study', val: soul.inBibleStudy, icon: BookOpen }, { label: 'Prayer', val: soul.attendingPrayer, icon: Zap }, { label: 'Service', val: soul.inServiceDepartment, icon: ShieldCheck }].map(milestone => (<div key={milestone.label} className={cn("flex items-center gap-2 p-2 rounded-xl border transition-all", milestone.val ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/10 border-transparent text-muted-foreground/40")}><milestone.icon className="h-3 w-3" /><span className="text-[10px] font-black uppercase tracking-tight">{milestone.label}</span></div>))}</div></div>
            <Separator className="opacity-20" /><div className="space-y-4 text-left"><div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2"><History className="h-3.5 w-3.5" /> Interaction History</p><Button variant="ghost" className="h-6 text-[8px] font-black uppercase text-primary hover:bg-primary/5" onClick={() => onViewHistory(soul)}>View All</Button></div><div className="space-y-4 pl-1">{sortedHistory.length > 0 ? sortedHistory.slice(0, 3).map((log, index) => { const date = safeToDate(log.date); return (<div key={index} className="relative"><p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest mb-1">{date ? format(date, "MMM d, yyyy") : 'Recently'}{log.memberName && <span className="ml-2 text-primary/40">• By {log.memberName.split(' ')[0]}</span>}</p><p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 italic">&ldquo;{log.note || 'Interaction logged.'}&rdquo;</p></div>); }) : (<div className="py-4 text-center border border-dashed rounded-xl bg-muted/5"><p className="text-sm text-muted-foreground/40 italic">No interactions recorded.</p></div>)}</div></div>
            <div className="space-y-3 p-5 bg-muted/20 rounded-[2rem] border-2 border-dashed border-primary/10 shadow-inner"><div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" /> Assessed Needs</p><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onAssess(soul)}><Edit className="h-4 w-4" /></Button></div>{needs ? (<div className="space-y-4">{needs.generalImpression && <p className="text-xs text-muted-foreground italic leading-relaxed text-balance">&ldquo;{needs.generalImpression}&rdquo;</p>}<div className="grid grid-cols-2 gap-3">{needs.emotionalNeeds && (<div className="space-y-1"><Badge variant="secondary" className="text-[7px] h-4 bg-red-500/10 text-red-600 border-none px-1.5 uppercase font-black text-left">Emotional</Badge><p className="text-[10px] text-muted-foreground line-clamp-2">{needs.emotionalNeeds}</p></div>)}{needs.physicalNeeds && (<div className="space-y-1"><Badge variant="secondary" className="text-[7px] h-4 bg-amber-500/10 text-amber-600 border-none px-1.5 uppercase font-black text-left">Physical</Badge><p className="text-[10px] text-muted-foreground line-clamp-2">{needs.physicalNeeds}</p></div>)}{needs.financialNeeds && (<div className="space-y-1"><Badge variant="secondary" className="text-[7px] h-4 bg-green-500/10 text-green-600 border-none px-1.5 uppercase font-black text-left">Financial</Badge><p className="text-[10px] text-muted-foreground line-clamp-2">{needs.financialNeeds}</p></div>)}{needs.socialNeeds && (<div className="space-y-1"><Badge variant="secondary" className="text-[7px] h-4 bg-indigo-500/10 text-indigo-600 border-none px-1.5 uppercase font-black text-left">Social</Badge><p className="text-[10px] text-muted-foreground line-clamp-2">{needs.socialNeeds}</p></div>)}</div>{needs.followUpPlan && (<div className="pt-2 border-t border-primary/10"><p className="text-[8px] font-black uppercase text-primary/60 mb-1 flex items-center gap-1.5"><Target className="h-2.5 w-2.5" /> Strategy</p><p className="text-[10px] text-muted-foreground leading-relaxed italic">{needs.followUpPlan}</p></div>)}</div>) : (<div className="py-4 text-center"><Button variant="outline" size="sm" className="h-8 rounded-xl text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5" onClick={() => onAssess(soul)}>BEGIN ASSESSMENT</Button></div>)}</div>
            <div className="pt-2 text-left space-y-3"><Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20" onClick={() => onFollowUp(soul)}>LOG FOLLOW-UP</Button><Button variant="ghost" className="w-full h-11 text-destructive font-bold uppercase tracking-widest text-[10px]" onClick={() => onDelete(soul)}><Trash2 className="mr-2 h-4 w-4" /> DELETE RECORD</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}

export const SoulsWonTable = React.memo(function SoulsWonTable({ souls, allSouls, loading, selectedId, onSelect, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit, onDelete, onAssess, onAddChild }: {
  souls: Soul[];
  allSouls: Soul[];
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
  onAddChild: (p1: Soul, p2?: Soul | null) => void;
}) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { 
    setMounted(true); 
  }, []);

  const selectedSoul = React.useMemo(() => 
    allSouls.find(s => s.id === selectedId) || null
  , [allSouls, selectedId]);

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

  const profileView = selectedSoul && (
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
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start text-left">
        <div className="flex-1 w-full text-left">
            {isMobile ? (
                <div className="space-y-px text-left">
                    {souls.map((soul) => (
                        <div key={soul.id} onClick={() => onSelect(soul.id)} className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-b-2 sm:border-b shadow-none bg-card/50 backdrop-blur-sm transition-all duration-300 cursor-pointer hover:bg-primary/[0.02] text-left">
                            <div className="flex items-center justify-between p-4 gap-4 text-left">
                                <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                                    <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 text-left")}>
                                        <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-left">{soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 text-left">
                                        <p className="font-bold truncate text-[13px] sm:text-base leading-tight capitalize tracking-tight text-left">{soul.firstName || 'Unknown'} {soul.lastName || ''}</p>
                                        <div className="flex flex-wrap gap-1.5 items-center mt-1.5 text-left">
                                            <Badge className={cn("h-5 px-1.5 text-[9px] uppercase font-black tracking-widest text-left", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                                        </div>
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-20 text-left" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <Card className="rounded-none sm:rounded-[2rem] border-x-0 sm:border-x shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden text-left">
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
                                    <TableRow key={soul.id} className={cn("border-b hover:bg-muted/30 transition-colors cursor-pointer text-left", selectedId === soul.id && "bg-primary/[0.03]")} onClick={() => onSelect(soul.id)}>
                                        <TableCell className="font-medium p-4 text-left">
                                            <div className="flex items-center gap-4 text-left">
                                                <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 text-left")}>
                                                    <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                                                    <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-left">{soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 text-left">
                                                    <div className="font-black text-xs sm:text-sm md:text-base truncate capitalize tracking-tight text-left">{soul.firstName} {soul.lastName}</div>
                                                    {soul.church && <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 font-medium truncate opacity-70 text-left"><Church className="h-3 w-3 shrink-0 text-left" />{soul.church}</div>}
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>

        <Drawer open={!!selectedId && !!selectedSoul && (isMobile || (typeof window !== 'undefined' && window.innerWidth < 1024))} onOpenChange={(open) => !open && onSelect(null)}>
            <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                    <DrawerHeader className="text-left flex-shrink-0 p-0">
                        <div className="flex items-center gap-2 mb-2 text-left">
                            <Sparkles className="h-4 w-4 text-primary text-left" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Identity Hub</span>
                        </div>
                        <DrawerTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left">
                            {selectedSoul?.firstName} {selectedSoul?.lastName}
                        </DrawerTitle>
                        <DrawerDescription className="text-sm font-medium mt-1 text-left">Full spiritual snapshot for the harvest workforce.</DrawerDescription>
                    </DrawerHeader>
                </div>
                <ScrollArea className="flex-grow min-h-0 text-left">
                    <div className="p-6 pb-24 text-left">
                        {profileView}
                    </div>
                </ScrollArea>
            </DrawerContent>
        </Drawer>

        <div className="hidden lg:block w-[320px] shrink-0 sticky top-24 text-left">
            <AnimatePresence>
                {selectedSoul ? (
                    <motion.div
                        key={selectedId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6 text-left"
                    >
                        {profileView}
                        <p className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.3em] text-center text-left">
                            {selectedSoul.firstName} {selectedSoul.lastName}
                        </p>
                    </motion.div>
                ) : (
                    <div className="text-center py-20 px-8 border-2 border-dashed rounded-[2rem] bg-muted/5 text-left">
                        <div className="relative mx-auto mb-4 w-12 h-12 flex items-center justify-center">
                            <Users className="h-10 w-10 text-muted-foreground opacity-10 text-left" />
                            <UserPlus className="absolute inset-0 m-auto h-5 w-5 text-primary text-left" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center text-balance text-left">Select a record to preview identity</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    </div>
  );
});
