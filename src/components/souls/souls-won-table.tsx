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
  Smartphone,
  Lock,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import type { Soul, FollowUpStatus, UserProfile, Chat, BibleChapterOutput } from "@/lib/types";
import { useUser, useAuth, useDoc, useUserProfile, useCollection, useFirestore } from "@/firebase";
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

const getSoulAddress = (soul: Soul) => {
  const loc = soul.locationWon;
  if (!loc) return '';
  return [loc.street, loc.city, loc.state, loc.country].filter(Boolean).join(', ');
};

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
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
      <div className="flex items-center justify-between gap-4 text-left text-left">
        <div className="text-left text-left text-left">
            <div className="flex items-center gap-3 mb-2 text-left text-left">
                {view !== 'hub' && <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full -ml-2 text-left text-left" onClick={() => setView(view === 'verses' ? 'chapters' : view === 'chapters' ? 'books' : 'hub')}><ArrowLeft className="h-4 w-4 text-left" /></Button>}
                <BookMarked className="h-5 w-5 text-primary text-left text-left" />
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left">Kingdom Study</span>
            </div>
            <DialogHeader className="p-0 text-left text-left">
                <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left">
                    {view === 'hub' ? "Share the Word" : view === 'books' ? "Select Book" : view === 'chapters' ? `${selectedBook}: Select Chapter` : `${selectedBook} ${selectedChapter}`}
                </DialogTitle>
            </DialogHeader>
        </div>
      </div>
    </div>
  );

  const body = (
    <div className="flex-grow min-h-[300px] text-left">
        <div className="p-8 text-left text-left">
            {view === 'hub' && (
                <div className="space-y-8 text-left">
                    <div className="relative text-left text-left">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50 text-left text-left" />
                        <Input placeholder="Search Bible (e.g. John 3:16)..." value={bibleSearch} onChange={e => setBibleSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left text-left" />
                        <Button onClick={handleSearch} disabled={isSearching || !bibleSearch.trim()} variant="ghost" size="sm" className="absolute right-3 top-1/2 -translate-y-1/2 h-8 px-4 rounded-xl font-black text-[10px] uppercase text-primary text-left text-left">
                            {isSearching ? <Loader2 className="h-3 w-3 animate-spin text-left" /> : 'SEARCH'}
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-left text-left">
                        <Button onClick={() => setView('books')} variant="outline" className="h-28 rounded-[2rem] gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group transition-all flex flex-col items-center justify-center text-left text-left">
                            <BookOpen className="h-8 w-8 mb-1 group-hover:scale-110 transition-transform text-left text-left" />
                            <span className="font-black text-[10px] uppercase tracking-widest text-center text-left text-left">Browse Bible</span>
                        </Button>
                        <Button variant="outline" asChild className="h-28 rounded-[2rem] gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group transition-all flex flex-col items-center justify-center text-left text-left">
                            <Link href="/dashboard/bible" className="text-left">
                                <BookMarked className="h-8 w-8 mb-1 group-hover:scale-110 transition-transform text-left text-left" />
                                <span className="font-black text-[10px] uppercase tracking-widest text-center text-left text-left">Open Reader</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            )}
            {view === 'books' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">
                    {bibleData.map(book => (
                        <Button key={book.name} variant="outline" className="h-12 rounded-xl font-bold uppercase text-[10px] text-left text-left" onClick={() => handleSelectBook(book.name)}>{book.name}</Button>
                    ))}
                </div>
            )}
            {view === 'chapters' && (
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 text-left">
                   {selectedBook && bibleData.find(b => b.name === selectedBook)?.chapters.map(ch => (
                     <Button key={ch.chapter} variant="outline" className="h-10 w-10 p-0 rounded-lg font-black text-sm text-left text-left" onClick={() => handleSelectChapter(ch.chapter)}>{ch.chapter}</Button>
                   ))}
                </div>
            )}
            {view === 'verses' && (
                <div className="space-y-4 pb-12 text-left text-left">
                   <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6 text-left">
                      <p className="text-[10px] font-black uppercase text-primary mb-1 text-left text-left">SELECTED VERSES</p>
                      <p className="text-xs font-bold text-muted-foreground text-left text-left">{selectedVerses.length > 0 ? `${selectedBook} ${selectedChapter}:${selectedVerses.join(', ')}` : 'Select verses below...'}</p>
                   </div>
                   <div className="space-y-1 font-serif text-left">
                     {loadingVerses ? <div className="flex justify-center py-20 text-left"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20 text-left" /></div> : chapterContent?.verses.map(v => (
                       <div key={v.verse} className={cn("p-3 rounded-xl transition-all cursor-pointer border-2 text-left", selectedVerses.includes(v.verse) ? "bg-primary/10 border-primary/40" : "bg-transparent border-transparent hover:bg-muted/50")} onClick={() => toggleVerse(v.verse)}>
                          <sup className="text-[10px] font-black mr-2 opacity-40 text-left text-left">{v.verse}</sup>
                          <span className="text-sm leading-relaxed text-left text-left">{v.text}</span>
                       </div>
                     ))}
                   </div>
                </div>
            )}
        </div>
    </div>
  );

  const footer = (
    <div className="p-6 border-t bg-muted/5 flex justify-end gap-3 shrink-0 text-left text-left text-left">
        {view === 'verses' && <Button onClick={handleShareSelected} disabled={selectedVerses.length === 0} className="rounded-xl h-12 flex-1 font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-left">PREPARE SHARE ({selectedVerses.length})</Button>}
        <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-xs text-left">Close Hub</Button>
    </div>
  );

  if (isMobile) {
      return (
          <Drawer open={isOpen} onOpenChange={onOpenChange}>
              <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                  {header}
                  <ScrollArea className="flex-grow">{body}</ScrollArea>
                  {footer}
              </DrawerContent>
          </Drawer>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col text-left">
        {header}
        <ScrollArea className="flex-grow">{body}</ScrollArea>
        {footer}
      </DialogContent>
    </Dialog>
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
                    <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 text-left")}>
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
                        <div className="font-black text-xs sm:text-sm md:text-base truncate capitalize tracking-tight text-left">
                            {soul.firstName} {soul.lastName}
                        </div>
                        {soul.church && <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 font-medium truncate opacity-70 text-left"><Church className="h-3 w-3 shrink-0 text-left" />{soul.church}</div>}
                    </div>
                </div>
            </TableCell>
        </TableRow>
    );
});
SoulTableRow.displayName = "SoulTableRow";

export function SoulsWonTable({ souls, allSouls, loading, selectedId, onSelect, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit, onDelete, onAssess, onAddChild }: {
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
                <div className="space-y-px text-left text-left">
                    {souls.map((soul) => (
                        <SoulCard key={soul.id} soul={soul} onClick={() => onSelect(soul.id)} />
                    ))}
                </div>
            ) : (
                <Card className="rounded-none sm:rounded-[2rem] border-x-0 sm:border-x shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden text-left">
                    <CardHeader className="p-8 border-b bg-muted/5 text-left">
                        <CardTitle className="text-2xl font-black font-headline tracking-tight flex items-center gap-3 uppercase text-left">
                            <Heart className="h-6 w-6 text-primary fill-current text-left text-left" />
                            Harvest Dashboard
                        </CardTitle>
                        <CardDescription className="text-base font-medium text-left text-left">Keep track of spiritual development and community integration.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 text-left text-left">
                        <div className="overflow-x-auto text-left text-left text-left">
                            <Table className="text-left text-left text-left text-left">
                                <TableHeader className="bg-muted/10 text-left">
                                    <TableRow className="hover:bg-transparent text-left">
                                        <TableHead className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Soul Identity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="text-left text-left">
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
            )}
        </div>

        {/* Tablet/Mobile Pop-up */}
        <Drawer open={!!selectedId && !!selectedSoul && (isMobile || (typeof window !== 'undefined' && window.innerWidth < 1024))} onOpenChange={(open) => !open && onSelect(null)}>
            <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left">
                    <DrawerHeader className="text-left flex-shrink-0 p-0 text-left">
                        <div className="flex items-center gap-2 mb-2 text-left text-left">
                            <Sparkles className="h-4 w-4 text-primary text-left text-left" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left text-left">Identity Hub</span>
                        </div>
                        <DrawerTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left">
                            {selectedSoul?.firstName} {selectedSoul?.lastName}
                        </DrawerTitle>
                        <DrawerDescription className="text-sm font-medium mt-1 text-left text-left text-left">Full spiritual snapshot for the harvest workforce.</DrawerDescription>
                    </DrawerHeader>
                </div>
                <ScrollArea className="flex-grow min-h-0 text-left text-left">
                    <div className="p-6 pb-24 text-left text-left">
                        {profileView}
                    </div>
                </ScrollArea>
            </DrawerContent>
        </Drawer>

        {/* Desktop Detailed Preview Panel (Large screens only) */}
        <div className="hidden lg:block w-[320px] shrink-0 sticky top-24 text-left text-left text-left">
            <AnimatePresence>
                {selectedSoul ? (
                    <motion.div
                        key={selectedId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6 text-left text-left"
                    >
                        {profileView}
                        <p className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.3em] text-center text-left text-left">
                            {selectedSoul.firstName} {selectedSoul.lastName}
                        </p>
                    </motion.div>
                ) : (
                    <div className="text-center py-20 px-8 border-2 border-dashed rounded-[2rem] bg-muted/5 text-left text-left text-left">
                        <Users className="h-10 w-10 text-muted-foreground opacity-10 mx-auto mb-4 text-left text-left text-left">
                           <UserPlus className="h-full w-full" />
                        </Users>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center text-balance text-left text-left text-left">Select a record to preview identity</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    </div>
  );
}
