
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
  Smartphone,
  Lock
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
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

function ShareWordDialog({ 
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

  const handleSelectBook = (bookName: string) => {
    setSelectedBook(bookName);
    setView('chapters');
  };

  const handleSelectChapter = async (num: number) => {
    if (!selectedBook) return;
    setSelectedChapter(num);
    setLoadingVerses(true);
    try {
      const content = await getBibleChapter({ book: selectedBook, chapter: num });
      setChapterContent(content);
      setView('verses');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVerses(false);
    }
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

  const header = (
    <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
      <div className="flex items-center justify-between gap-4">
        <div className="text-left">
            <div className="flex items-center gap-3 mb-2">
                {view !== 'hub' && <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full -ml-2" onClick={() => setView(view === 'verses' ? 'chapters' : view === 'chapters' ? 'books' : 'hub')}><ArrowLeft className="h-4 w-4" /></Button>}
                <BookMarked className="h-5 w-5 text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Kingdom Study</span>
            </div>
            <DialogHeader className="text-left">
                <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight">
                    {view === 'hub' ? "Share the Word" : view === 'books' ? "Select Book" : view === 'chapters' ? `${selectedBook}: Select Chapter` : `${selectedBook} ${selectedChapter}`}
                </DialogTitle>
            </DialogHeader>
        </div>
      </div>
    </div>
  );

  const body = (
    <ScrollArea className="flex-grow min-h-[300px]">
        <div className="p-8">
            {view === 'hub' && (
                <div className="space-y-8">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50" />
                        <Input placeholder="Search Bible (e.g. John 3:16)..." value={bibleSearch} onChange={e => setBibleSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="h-12 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" />
                        <Button onClick={handleSearch} disabled={isSearching || !bibleSearch.trim()} variant="ghost" size="sm" className="absolute right-3 top-1/2 -translate-y-1/2 h-8 px-4 rounded-xl font-black text-[10px] uppercase text-primary">
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'SEARCH'}
                        </Button>
                    </div>
                    {searchResults.length > 0 && searchResults.map((res, idx) => (
                        <Button 
                            key={idx} 
                            variant="outline" 
                            className="w-full h-auto p-6 rounded-[2rem] border-primary/20 bg-primary/5 flex flex-col items-start gap-3 text-left hover:bg-primary/10 transition-all border-2 border-dashed" 
                            onClick={() => onSelectVerse(constructInvitationMessage(res.text, res.reference, `${window.location.origin}/dashboard/bible`))}
                        >
                            <div className="flex items-center justify-between w-full">
                                <span className="font-black text-xs uppercase tracking-widest text-primary">{res.reference}</span>
                                <Send className="h-4 w-4 text-primary opacity-40" />
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed italic line-clamp-4">"{res.text.trim()}"</p>
                        </Button>
                    ))}
                    <div className="grid grid-cols-2 gap-4">
                        <Button onClick={() => setView('books')} variant="outline" className="h-28 rounded-[2rem] gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group transition-all flex flex-col items-center justify-center">
                            <BookOpen className="h-8 w-8 mb-1 group-hover:scale-110 transition-transform" />
                            <span className="font-black text-[10px] uppercase tracking-widest">Browse Bible</span>
                        </Button>
                        <Button variant="outline" asChild className="h-28 rounded-[2rem] gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group transition-all flex flex-col items-center justify-center">
                            <Link href="/dashboard/bible">
                                <BookMarked className="h-8 w-8 mb-1 group-hover:scale-110 transition-transform" />
                                <span className="font-black text-[10px] uppercase tracking-widest">Open Reader</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            )}
            {view === 'books' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {bibleData.map(book => (
                        <Button key={book.name} variant="outline" className="h-12 rounded-xl font-bold uppercase text-[10px]" onClick={() => handleSelectBook(book.name)}>{book.name}</Button>
                    ))}
                </div>
            )}
            {view === 'chapters' && (
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                   {selectedBook && bibleData.find(b => b.name === selectedBook)?.chapters.map(ch => (
                     <Button key={ch.chapter} variant="outline" className="h-10 w-10 p-0 rounded-lg font-black text-sm" onClick={() => handleSelectChapter(ch.chapter)}>{ch.chapter}</Button>
                   ))}
                </div>
            )}
            {view === 'verses' && (
                <div className="space-y-4">
                   <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6">
                      <p className="text-[10px] font-black uppercase text-primary mb-1">SELECTED VERSES</p>
                      <p className="text-xs font-bold text-muted-foreground">{selectedVerses.length > 0 ? `${selectedBook} ${selectedChapter}:${selectedVerses.join(', ')}` : 'Select verses below...'}</p>
                   </div>
                   <div className="space-y-1 font-serif">
                     {loadingVerses ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div> : chapterContent?.verses.map(v => (
                       <div key={v.verse} className={cn("p-3 rounded-xl transition-all cursor-pointer border-2", selectedVerses.includes(v.verse) ? "bg-primary/10 border-primary/40" : "bg-transparent border-transparent hover:bg-muted/50")} onClick={() => toggleVerse(v.verse)}>
                          <sup className="text-[10px] font-black mr-2 opacity-40">{v.verse}</sup>
                          <span className="text-sm leading-relaxed">{v.text}</span>
                       </div>
                     ))}
                   </div>
                </div>
            )}
        </div>
    </ScrollArea>
  );

  const footer = (
    <div className="p-6 border-t bg-muted/5 flex justify-end gap-3 shrink-0">
        {view === 'verses' && <Button onClick={handleShareSelected} disabled={selectedVerses.length === 0} className="rounded-xl h-12 flex-1 font-black uppercase tracking-widest shadow-lg shadow-primary/20">PREPARE SHARE ({selectedVerses.length})</Button>}
        <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-xs">Close Hub</Button>
    </div>
  );

  if (isMobile) {
      return (
          <Drawer open={isOpen} onOpenChange={onOpenChange}>
              <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                  {header}
                  {body}
                  {footer}
              </DrawerContent>
          </Drawer>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col">
        {header}
        {body}
        {footer}
      </DialogContent>
    </Dialog>
  );
}

function MatchmakingDialog({ isOpen, onOpenChange, sourceSoul, allSouls, onMatchConfirmed }: { isOpen: boolean; onOpenChange: (open: boolean) => void; sourceSoul: Soul | null; allSouls: Soul[]; onMatchConfirmed: (candidate: Soul) => void; }) {
    const isMobile = useIsMobile();
    const [searchTerm, setSearchTerm] = useState('');
    const candidates = useMemo(() => {
        if (!sourceSoul) return [];
        return allSouls.filter(s => 
            s.id !== sourceSoul.id && s.gender && sourceSoul.gender && s.gender !== sourceSoul.gender && (s.age || 0) >= 18 && s.maritalStatus === 'Single'
        ).filter(s => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return `${s.firstName} ${s.lastName}`.toLowerCase().includes(term);
        }).sort((a,b) => a.firstName.localeCompare(b.firstName));
    }, [sourceSoul, allSouls, searchTerm]);

    if (!sourceSoul) return null;

    const header = (
        <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
            <div className="flex items-center gap-2 mb-2"><HeartHandshake className="h-5 w-5 text-primary" /><span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Kingdom Matching</span></div>
            <DialogHeader className="text-left">
                <DialogTitle className="text-2xl font-black font-headline uppercase">Find Match for {sourceSoul.firstName}</DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1">Listing eligible singles (18+) of the opposite gender.</DialogDescription>
            </DialogHeader>
            <div className="relative mt-6"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" /><Input placeholder="Search candidates..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-11 pl-10 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" /></div>
        </div>
    );

    const body = (
        <ScrollArea className="max-h-[50vh]">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {candidates.length > 0 ? candidates.map(c => (
                    <Button key={c.id} variant="ghost" className="w-full justify-start h-auto min-h-[4rem] rounded-2xl gap-4 hover:bg-primary/5 group p-4 flex flex-row items-center border bg-card/50" onClick={() => onMatchConfirmed(c)}>
                        <Avatar className="h-10 w-10 border shadow-sm shrink-0">
                            <AvatarImage src={c.photoURL || undefined} className="object-cover" />
                            <AvatarFallback className="font-black bg-primary/10 text-primary text-xs flex items-center justify-center h-full w-full">{c.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 text-left">
                            <p className="font-black text-sm uppercase tracking-tight truncate leading-tight">{c.firstName} {c.lastName} ({c.age})</p>
                            <div className="flex items-center gap-2 mt-0.5 opacity-60 flex-wrap">
                                <Badge variant="outline" className="h-4 px-1 text-[7px] uppercase font-bold tracking-widest bg-background/50">Single</Badge>
                                <p className="text-[9px] font-bold uppercase truncate">{c.church || 'Global Network'}</p>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 opacity-20 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Button>
                )) : (
                    <div className="col-span-full py-20 text-center flex flex-col items-center">
                        <Users className="h-12 w-12 text-muted-foreground/10 mb-4" />
                        <p className="text-sm text-muted-foreground italic text-center">No eligible singles found in your harvest.</p>
                    </div>
                )}
            </div>
        </ScrollArea>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onOpenChange}>
                <DrawerContent className="h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    {header}
                    <div className="flex-grow overflow-hidden">{body}</div>
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left">
                {header}
                {body}
            </DialogContent>
        </Dialog>
    );
}

function SoulProfileContent({ 
  soul, 
  allSouls,
  onFollowUp,
  onViewHistory,
  onEdit,
  onAssess,
  onOpenAssignDialog,
  onExportSingle,
  onDelete
}: { 
  soul: Soul; 
  allSouls: Soul[];
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
  const isMobile = useIsMobile();
  const router = useRouter();

  const [isCommChannelDialogOpen, setIsCommChannelDialogOpen] = React.useState(false);
  const [isHelpNeedDialogOpen, setIsHelpNeedDialogOpen] = React.useState(false);
  const [isShareTargetDialogOpen, setIsShareTargetDialogOpen] = React.useState(false);
  const [isPartnerSelectionDialogOpen, setIsPartnerSelectionDialogOpen] = React.useState(false);
  const [isPrayerCustomizationOpen, setIsPrayerCustomizationOpen] = React.useState(false);
  const [isStudyWordOpen, setIsStudyWordOpen] = React.useState(false);
  const [isMatchmakingOpen, setIsMatchmakingOpen] = React.useState(false);
  const [customMessageText, setCustomMessageText] = React.useState('');
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

  const finalizeLog = async (soul: Soul, actionId: string, noteAddendum: string = '') => {
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
    if (['phone_call', 'text_message', 'prayed_together', 'matchmaking'].includes(actionId) && !soul.phone) { toast({ variant: 'destructive', title: 'Phone Missing' }); return; }

    switch (actionId) {
        case 'prayed_together':
            setCustomMessageText(resolveTemplate(prayerTemplates[0].text, soul));
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
        case 'visited_home':
            if (address) {
                await finalizeLog(soul, actionId, `Navigated to venue: ${address}`);
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
            } else {
                toast({ variant: 'destructive', title: 'Location Undefined' });
            }
            return;
        case 'helped_with_need':
            setIsHelpNeedDialogOpen(true);
            return;
        case 'invited_to_event':
            await finalizeLog(soul, actionId, 'Redirected to Events Hub');
            router.push('/dashboard/events');
            return;
        case 'shared_meal':
        case 'gave_gift':
            const mPath = actionId === 'shared_meal' ? '/marketplace' : '/marketplace/gifts';
            router.push(`${mPath}?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}&actionId=${actionId}`);
            return;
        case 'matchmaking':
            setIsMatchmakingOpen(true);
            return;
        default:
            await finalizeLog(soul, actionId);
    }
  };

  const handleCommChoice = (channel: 'whatsapp' | 'sms') => {
      if (!soul?.phone || !clickedActionId) return;
      const cleanPhone = soul.phone.replace(/\+/g, '').replace(/\D/g, '');
      const message = customMessageText || `Hi ${soul.firstName}, God bless you!`;
      if (channel === 'whatsapp') window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
      else window.location.href = `sms:${soul.phone}?body=${encodeURIComponent(message)}`;
      finalizeLog(soul, clickedActionId, `Sent via ${channel.toUpperCase()}`);
      setIsCommChannelDialogOpen(false);
      setCustomMessageText('');
  };

  const handleMatchConfirmed = (candidate: Soul) => {
      if (!soul) return;
      setIsMatchmakingOpen(false);
      const template = `Hi ${soul.firstName}, I've found a potential Kingdom match for you! Meet ${candidate.firstName}, a believer from my harvest field. Let's set up a meet to explore this divine connection. ${window.location.origin}`;
      setCustomMessageText(template);
      setClickedActionId('matchmaking');
      requestAnimationFrame(() => {
          setIsCommChannelDialogOpen(true);
      });
  };

  const handleHelpNeedConfirm = (note: string) => {
      finalizeLog(soul, 'helped_with_need', `Service: ${note}`);
      setIsHelpNeedDialogOpen(false);
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
        <CardHeader className="p-8 pb-4 text-center text-left">
            <div className="relative inline-block mx-auto mb-4">
                <Avatar className="h-48 w-48 border-4 border-background shadow-xl ring-2 ring-primary/10">
                    <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                    <AvatarFallback className="text-3xl font-black bg-primary/10 text-primary text-center flex items-center justify-center w-full h-full">{soul.firstName?.charAt(0)}</AvatarFallback>
                </Avatar>
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
                <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Spiritual Identity</p><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onEdit(soul)}><Edit className="h-4 w-4" /></Button></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Full Name</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.firstName} {soul.lastName}</p></div>
                    <div className="space-y-1"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Gender/Age</p><p className="text-[11px] sm:text-xs font-bold">{soul.gender || 'N/A'} • {soul.age ? `${soul.age} yrs` : 'Age N/A'}</p></div>
                    <div className="space-y-1"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Relationship</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.relationship || 'N/A'}</p></div>
                    <div className="space-y-1"><p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Work Status</p><p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.workStatus || 'N/A'}</p></div>
                </div>
            </div>
            
            <Separator className="opacity-20" />

            <div className="space-y-3">
                <div className="flex items-center justify-between">
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
            
            <div className="space-y-4">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Harvest Context</p>
                <div className="space-y-1">
                    <p className="text-[11px] sm:text-xs font-bold flex items-center gap-1.5 truncate">
                        <Target className="h-3 w-3 text-primary" />
                        Source: {soul.source}
                    </p>
                </div>
            </div>

            <Separator className="opacity-20" />

            <div className="space-y-4">
                <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Kingdom Placement</p><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onOpenAssignDialog(soul)}><Edit className="h-4 w-4" /></Button></div>
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

            <div className="space-y-4">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Spiritual Milestones</p>
                <div className="grid grid-cols-2 gap-2">
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

            <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2"><History className="h-3.5 w-3.5" /> Interaction History</p><Button variant="ghost" className="h-6 text-[8px] font-black uppercase text-primary hover:bg-primary/5" onClick={() => onViewHistory(soul)}>View All</Button></div>
                <div className="space-y-4 pl-1">
                    {sortedHistory.length > 0 ? sortedHistory.slice(0, 3).map((log, index) => {
                            const logDate = safeToDate(log.date);
                            return (
                                <div key={index} className="relative">
                                    <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                                        <p className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                                        {logDate ? format(logDate, "MMM d, yyyy") : 'Recently'}{log.memberName && <span className="ml-2 text-primary/40">• By {log.memberName.split(' ')[0]}</span>}</p>
                                    </div>
                                    <div className="pl-6 border-l-4 border-primary/20 space-y-4">
                                    {log.actions && log.actions.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {log.actions.map(actionId => {
                                                    const action = actionItems.find(a => a.id === actionId);
                                                    return action ? (
                                                        <Badge key={actionId} variant="secondary" className="font-bold text-[9px] px-2 h-4 uppercase tracking-tight bg-background border">{action.label}</Badge>
                                                    ) : null;
                                                })}
                                            </div>
                                        )}
                                    {log.note ? (
                                            <div className="bg-background rounded-2xl p-4 border shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-3 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                                                    <Sparkles className="h-8 w-8 text-primary rotate-12" />
                                                </div>
                                                <p className="text-sm sm:text-base text-muted-foreground italic font-medium leading-relaxed break-words [overflow-wrap:anywhere]">
                                                    &ldquo;{log.note}&rdquo;
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic pl-1 opacity-60">No additional details recorded for this entry.</p>
                                        )}
                                    </div>
                                    {index < sortedHistory.length - 1 && <Separator className="mt-8 opacity-30" />}
                                </div>
                            )}) : <div className="py-4 text-center border border-dashed rounded-xl bg-muted/5"><p className="text-sm text-muted-foreground/40 italic">No interactions recorded.</p></div>
                    }
                </div>
            </div>

            <div className="space-y-3 p-5 bg-muted/20 rounded-[2rem] border-2 border-dashed border-primary/10 shadow-inner">
                <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-1">
                        <ClipboardList className="h-3.5 w-3.5" /> Assessed Needs
                    </p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onAssess(soul)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </div>
                {soul.needsAssessment ? (
                    <div className="space-y-4">
                        {soul.needsAssessment.generalImpression && <p className="text-xs text-muted-foreground italic font-medium leading-relaxed text-balance">&ldquo;{soul.needsAssessment.generalImpression}&rdquo;</p>}
                        
                        <div className="grid grid-cols-2 gap-3">
                            {soul.needsAssessment.emotionalNeeds && (
                                <div className="space-y-1">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-red-500/10 text-red-600 border-none px-1.5 uppercase font-black text-left">Emotional</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left">{soul.needsAssessment.emotionalNeeds}</p>
                                </div>
                            )}
                            {soul.needsAssessment.physicalNeeds && (
                                <div className="space-y-1">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-amber-500/10 text-amber-600 border-none px-1.5 uppercase font-black text-left">Physical</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left">{soul.needsAssessment.physicalNeeds}</p>
                                </div>
                            )}
                            {soul.needsAssessment.financialNeeds && (
                                <div className="space-y-1">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-green-500/10 text-green-600 border-none px-1.5 uppercase font-black text-left">Financial</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left">{soul.needsAssessment.financialNeeds}</p>
                                </div>
                            )}
                            {soul.needsAssessment.socialNeeds && (
                                <div className="space-y-1">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-indigo-500/10 text-indigo-600 border-none px-1.5 uppercase font-black text-left">Social</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 font-medium text-left">{soul.needsAssessment.socialNeeds}</p>
                                </div>
                            )}
                        </div>

                        {soul.needsAssessment.followUpPlan && (
                            <div className="pt-2 border-t border-primary/10">
                                <p className="text-[8px] font-black uppercase text-primary/60 mb-1 flex items-center gap-1.5">
                                    <Target className="h-2.5 w-2.5" /> Strategy
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed italic">{soul.needsAssessment.followUpPlan}</p>
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

            <div className="pt-2 space-y-3">
                <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20" onClick={() => onFollowUp(soul)}>LOG FOLLOW-UP</Button>
                <Button variant="ghost" className="w-full h-11 text-destructive font-bold uppercase tracking-widest text-[10px]" onClick={() => onDelete(soul)}><Trash2 className="mr-2 h-4 w-4" /> DELETE RECORD</Button>
            </div>
        </CardContent>
      </Card>

      <Dialog open={isMatchmakingOpen} onOpenChange={setIsMatchmakingOpen}>
          <MatchmakingDialog isOpen={isMatchmakingOpen} onOpenChange={setIsMatchmakingOpen} sourceSoul={soul} allSouls={allSouls} onMatchConfirmed={handleMatchConfirmed} />
      </Dialog>

      <Dialog open={isPrayerCustomizationOpen} onOpenChange={setIsPrayerCustomizationOpen}>
          <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
              <div className="p-8 border-b bg-muted/10">
                  <DialogHeader className="text-left">
                      <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Kingdom Intercession</DialogTitle>
                      <DialogDescription className="text-sm font-medium">Draft a powerful prayer for {soul.firstName}.</DialogDescription>
                  </DialogHeader>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Focus</label>
                    <div className="flex flex-wrap gap-2">
                        {prayerTemplates.map(t => (
                            <Button key={t.id} variant="outline" size="sm" className="rounded-full h-8 px-4 text-[9px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 hover:text-primary" onClick={() => setCustomMessageText(resolveTemplate(t.text, soul))}>{t.label}</Button>
                        ))}
                    </div>
                </div>
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Customize Message</Label>
                      <Textarea value={customMessageText} onChange={e => setCustomMessageText(e.target.value)} className="min-h-[200px] rounded-2xl bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6" />
                  </div>
                  <Button onClick={() => { setIsPrayerCustomizationOpen(false); requestAnimationFrame(() => setIsCommChannelDialogOpen(true)); }} disabled={!customMessageText.trim()} className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest">CONTINUE TO CHANNEL</Button>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isCommChannelDialogOpen} onOpenChange={setIsCommChannelDialogOpen}>
        <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center">
          <DialogHeader className="text-center space-y-2">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <MessageSquare className="h-7 w-7 text-primary" />
              </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center">Message Hub</DialogTitle>
            <DialogDescription className="text-sm font-medium text-center">How would you like to encourage {soul.firstName}?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-6">
            <Button onClick={() => handleCommChoice('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20"><WhatsAppIcon className="h-5 w-5" /> WhatsApp</Button>
            <Button onClick={() => handleCommChoice('sms')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5"><MessageSquare className="h-5 w-5" /> Standard SMS</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isHelpNeedDialogOpen} onOpenChange={setIsHelpNeedDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
          <div className="p-8 border-b bg-muted/10">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Support Provided</DialogTitle>
              <DialogDescription className="text-sm font-medium">Describe how you supported {soul.firstName}.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Support Details</Label>
                <Textarea placeholder="e.g. Provided food items, helped with bill..." onChange={e => setCustomMessageText(e.target.value)} className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner" />
            </div>
            <Button onClick={() => handleHelpNeedConfirm(customMessageText)} className="w-full h-12 rounded-xl font-bold">Confirm Service</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareTargetDialogOpen} onOpenChange={setIsShareTargetDialogOpen}>
        <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center">
          <DialogHeader className="text-center space-y-2">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Share className="h-7 w-7 text-primary" />
              </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center">Share Details</DialogTitle>
            <DialogDescription className="text-sm font-medium text-center">Where would you like to share {soul.firstName}'s info?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-6">
            <Button onClick={handleShareToWhatsApp} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20"><WhatsAppIcon className="h-5 w-5" /> WhatsApp External</Button>
            <Button onClick={() => { setIsShareTargetDialogOpen(false); setTimeout(() => setIsPartnerSelectionDialogOpen(true), 100); }} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5"><HeartHandshake className="h-5 w-5" /> Partner on App</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPartnerSelectionDialogOpen} onOpenChange={setIsPartnerSelectionDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
              <div className="p-8 border-b bg-muted/10">
                  <DialogHeader className="text-left">
                      <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Select Partner</DialogTitle>
                      <DialogDescription className="text-sm font-medium">Which partner should receive these details?</DialogDescription>
                  </DialogHeader>
              </div>
              <div className="p-6">
              <ScrollArea className="h-64">
                  <div className="space-y-2">
                      {uniquePartners.map(p => (
                          <Button key={p.userId} variant="ghost" className="w-full justify-start h-14 rounded-xl gap-4 hover:bg-primary/5 group" onClick={() => handleShareToPartner(p)}>
                              <Avatar className="h-8 w-8 border shrink-0"><AvatarImage src={p.photoURL} /><AvatarFallback className="font-bold text-[10px]">{p.firstName?.charAt(0)}</AvatarFallback></Avatar>
                              <span className="font-bold text-sm group-hover:text-primary transition-colors">{p.firstName} {p.lastName}</span>
                          </Button>
                      ))}
                      {uniquePartners.length === 0 && <p className="text-center text-xs text-muted-foreground py-12">No partners found.</p>}
                  </div>
              </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <ShareWordDialog isOpen={isStudyWordOpen} onOpenChange={setIsStudyWordOpen} soul={soul} onSelectVerse={(v) => { setCustomMessageText(v); setIsStudyWordOpen(false); setIsCommChannelDialogOpen(true); }} />
    </div>
  );
}

const SoulTableRow = React.memo(({ soul, isSelected, onSelect }: { soul: Soul; isSelected: boolean; onSelect: () => void; }) => {
    return (
        <TableRow className={cn("border-b hover:bg-muted/30 transition-colors cursor-pointer text-left", isSelected && "bg-primary/[0.03]")} onClick={() => onSelect()}>
            <TableCell className="font-medium p-4 text-left">
                <div className="flex items-center gap-4 text-left">
                    <Avatar className="h-10 w-10 border shadow-inner shrink-0">
                        <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xs">{soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-left">
                        <div className="font-black text-xs sm:text-sm md:text-base truncate capitalize tracking-tight">{soul.firstName} {soul.lastName}</div>
                        {soul.church && <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 font-medium truncate opacity-70"><Church className="h-3 w-3 shrink-0" />{soul.church}</div>}
                    </div>
                </div>
            </TableCell>
        </TableRow>
    );
});
SoulTableRow.displayName = "SoulTableRow";

const SoulCard = React.memo(({ soul, onClick }: { soul: Soul; onClick: () => void; }) => {
    return (
        <Card onClick={onClick} className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-b-2 sm:border-b shadow-none bg-card/50 backdrop-blur-sm transition-all duration-300 cursor-pointer hover:bg-primary/[0.02] text-left">
            <div className="flex items-center justify-between p-4 gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                    <Avatar className="h-10 w-10 border shadow-inner shrink-0">
                        <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xs">{soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-left">
                        <p className="font-bold truncate text-[13px] sm:text-base leading-tight capitalize tracking-tight">{soul.firstName || 'Unknown'} {soul.lastName || ''}</p>
                        <div className="flex flex-wrap gap-1.5 items-center mt-1.5 text-left">
                            <Badge className={cn("h-5 px-1.5 text-[9px] uppercase font-black tracking-widest", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                            {soul.fellowshipName && <Badge variant="secondary" className="h-5 px-1.5 text-[8px] uppercase font-black tracking-tighter bg-primary/5 text-primary border-primary/20 shrink-0">Fellowship</Badge>}
                        </div>
                    </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-20" />
            </div>
        </Card>
    );
});
SoulCard.displayName = "SoulCard";

export function SoulsWonTable({ souls, allSouls, loading, selectedId, onSelect, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit, onDelete, onAssess, onAddChild }: {
  souls: Soul[];
  allSouls: Soul[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onFollowUp: (s: Soul) => void;
  onViewHistory: (s: Soul) => void;
  onExportSingle: (s: Soul, formatType: 'csv' | 'pdf') => void;
  onOpenAssignDialog: (s: Soul) => void;
  onEdit: (s: Soul) => void;
  onDelete: (s: Soul) => void;
  onAssess: (s: Soul) => void;
  onAddChild: (p1: Soul, p2?: Soul | null) => void;
}) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  const selectedSoul = React.useMemo(() => souls.find(s => s.id === selectedId) || null, [souls, selectedId]);

  if (loading || !mounted) {
    return (
        <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border-b last:border-0 bg-card/50 backdrop-blur-sm rounded-xl"><Skeleton className="h-12 w-12 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div><Skeleton className="h-9 w-24 rounded-xl" /></div>
            ))}
        </div>
    )
  }
  
  if (souls.length === 0) {
    return (
        <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm border-2 border-dashed text-left">
            <CardContent className="text-left py-24 flex flex-col items-center">
                <div className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-primary/20"><HeartHandshake className="h-10 w-10 text-primary opacity-40" /></div>
                <h3 className="text-xl font-black font-headline uppercase tracking-tight">Your Harvest Field</h3>
                <p className="text-sm text-muted-foreground italic font-medium max-w-[280px] leading-relaxed opacity-60 text-center text-balance">The souls you lead to Christ will appear here for collaborative discipleship.</p>
            </CardContent>
        </Card>
    );
  }

  const profileView = selectedSoul && (
    <SoulProfileContent 
        soul={selectedSoul} 
        allSouls={allSouls}
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
                <div className="space-y-px">{souls.map((soul) => (<SoulCard key={soul.id} soul={soul} onClick={() => onSelect(soul.id)} />))}</div>
            ) : (
                <Card className="rounded-none sm:rounded-[2rem] border-x-0 sm:border-x shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden text-left">
                    <CardHeader className="p-8 border-b bg-muted/5 text-left"><CardTitle className="text-2xl font-black font-headline tracking-tight flex items-center gap-3 uppercase"><Heart className="h-6 w-6 text-primary fill-current" />Harvest Dashboard</CardTitle><CardDescription className="text-base font-medium">Keep track of spiritual development and community integration.</CardDescription></CardHeader>
                    <CardContent className="p-0 text-left"><div className="overflow-x-auto text-left"><Table className="text-left"><TableHeader className="bg-muted/10 text-left"><TableRow className="hover:bg-transparent text-left"><TableHead className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Soul Identity</TableHead></TableRow></TableHeader><TableBody className="text-left">{souls.map((soul) => (<SoulTableRow key={soul.id} soul={soul} isSelected={selectedId === soul.id} onSelect={() => onSelect(soul.id)} />))}</TableBody></Table></div></CardContent>
                </Card>
            )}
        </div>

        <Sheet open={!!selectedId && !!selectedSoul && (isMobile || window.innerWidth < 1024)} onOpenChange={(open) => !open && onSelect(null)}>
            <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                    <SheetHeader className="text-left">
                        <div className="flex items-center gap-2 mb-2 text-left"><ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce" /><span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Identity Hub</span></div>
                        <SheetTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left">{selectedSoul?.firstName} {selectedSoul?.lastName}</SheetTitle>
                        <SheetDescription className="text-sm font-medium mt-1 text-left">Full spiritual snapshot for the harvest workforce.</SheetDescription>
                    </SheetHeader>
                </div>
                <ScrollArea className="flex-grow min-h-0 text-left"><div className="p-6 pb-24 text-left">{profileView}</div></ScrollArea>
            </SheetContent>
        </Sheet>

        <div className="hidden lg:block w-[320px] shrink-0 sticky top-24 text-left">
            <AnimatePresence>
                {selectedSoul ? (
                    <motion.div key={selectedId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6 text-left">
                        {profileView}
                        <p className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.3em] text-center">{selectedSoul.firstName} {selectedSoul.lastName}</p>
                    </motion.div>
                ) : (
                    <div className="text-center py-20 px-8 border-2 border-dashed rounded-[2rem] bg-muted/5"><Users className="h-10 w-10 text-muted-foreground opacity-10 mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center">Select a record to preview identity</p></div>
                )}
            </AnimatePresence>
        </div>
    </div>
  );
}
