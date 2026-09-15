
'use client';

import * as React from "react";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { format, differenceInMinutes, isSameDay } from "date-fns";
import { 
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
  MessageSquare, 
  MessagesSquare,
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
  Lock,
  MoreHorizontal,
  Share2,
  User,
  Smartphone,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import type { Soul, FollowUpStatus, UserProfile, Chat, BibleChapterOutput, MealGiftStatus } from "@/lib/types";
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
  orderBy
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
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
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
import { actionItems, prayerTemplates, kingdomVerses } from "@/lib/follow-up-data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
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
  
  const [selectedBookName, setSelectedBookName] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterContent, setChapterContent] = useState<BibleChapterOutput | null>(null);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setView('hub');
      setBibleSearch('');
      setSearchResults([]);
      setSelectedBookName(null);
      setSelectedChapter(null);
      setChapterContent(null);
      setSelectedVerses([]);
    }
  }, [isOpen]);

  const constructInvitationMessage = useCallback((verseText: string, reference: string, link: string) => {
    return `"${verseText.trim()}" — ${reference}\n\nJoin the harvest at Testify! Share your miracles, win souls for Christ, and glorify God. Visit: ${window.location.origin}/bible`;
  }, []);

  const handleSearch = async () => {
      if (!bibleSearch.trim()) return;
      setIsSearching(true);
      try {
          const res = await fetch(`https://bible-api.com/${encodeURIComponent(bibleSearch)}`);
          if (res.ok) {
              const data = await res.json();
              if (data.verses) {
                  setSearchResults([{ 
                      reference: data.reference, 
                      text: data.text 
                  }]);
              }
          }
      } catch (e) {
          console.warn("Bible search failed", e);
      } finally {
          setIsSearching(false);
      }
  };

  const handleSelectBook = (bookName: string) => {
    setSelectedBookName(bookName);
    setView('chapters');
  };

  const handleSelectChapter = async (num: number) => {
    if (!selectedBookName) return;
    setSelectedChapter(num);
    setLoadingVerses(true);
    try {
      const content = await getBibleChapter({ book: selectedBookName, chapter: num });
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
    
    const selectedTexts = chapterContent.verses
      .filter(v => selectedVerses.includes(v.verse))
      .map(v => v.text)
      .join(' ');
      
    const reference = `${chapterContent.book} ${chapterContent.chapter}:${selectedVerses.join(', ')}`;
    const link = `${window.location.origin}/dashboard/bible?book=${encodeURIComponent(chapterContent.book)}&chapter=${chapterContent.chapter}`;
    
    onSelectVerse(constructInvitationMessage(selectedTexts, reference, link));
  };

  const renderHub = (
    <div className="space-y-8 sm:space-y-10 text-left text-left">
      <div className="space-y-4 text-left">
        <div className="relative text-left">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-muted-foreground opacity-50 text-left text-left" />
            <Input 
                placeholder="Search Bible (e.g. John 3:16)..." 
                value={bibleSearch}
                onChange={e => setBibleSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="h-10 sm:h-14 pl-10 sm:pl-14 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-xs sm:text-lg text-left"
            />
            <Button 
                onClick={handleSearch} 
                disabled={isSearching || !bibleSearch.trim()}
                variant="ghost"
                size="sm"
                className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 h-7 sm:h-10 px-3 sm:px-6 rounded-xl font-black text-[9px] sm:text-xs uppercase text-primary text-left"
            >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin text-left" /> : 'SEARCH'}
            </Button>
        </div>

        {searchResults.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-2 text-left">
                {searchResults.map((res, idx) => (
                    <Button 
                        key={idx}
                        variant="outline"
                        className="w-full h-auto p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border-primary/20 bg-primary/5 flex flex-col items-start gap-3 text-left hover:bg-primary/10 transition-all border-2 border-dashed"
                        onClick={() => onSelectVerse(constructInvitationMessage(res.text, res.reference, `${window.location.origin}/dashboard/bible`))}
                    >
                        <div className="flex items-center justify-between w-full text-left">
                            <span className="font-black text-[9px] sm:text-xs uppercase tracking-widest text-primary text-left">{res.reference}</span>
                            <Send className="h-3.5 w-3.5 sm:h-4 w-4 text-primary opacity-40 text-left" />
                        </div>
                        <p className="text-xs sm:text-base text-muted-foreground leading-relaxed italic line-clamp-4 text-left">"{res.text.trim()}"</p>
                    </Button>
                ))}
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-left">
        <Button onClick={() => setView('books')} variant="outline" className="h-24 sm:h-32 rounded-2xl sm:rounded-[2rem] gap-2 sm:gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group transition-all flex flex-col items-center justify-center p-4 text-left">
            <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 mb-1 group-hover:scale-110 transition-transform text-left" />
            <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-center text-left">Browse Bible</span>
        </Button>
        <Button variant="outline" asChild className="h-24 sm:h-32 rounded-2xl sm:rounded-[2rem] gap-2 sm:gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group transition-all flex flex-col items-center justify-center p-4 text-left text-left">
            <Link href="/dashboard/bible" className="flex flex-col items-center justify-center text-left">
                <BookMarked className="h-6 w-6 sm:h-8 sm:w-8 mb-1 group-hover:scale-110 transition-transform text-left" />
                <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-center text-left">Open Reader</span>
            </Link>
        </Button>
      </div>

      <div className="space-y-6 text-left">
        <div className="flex items-center justify-between px-1 text-left">
            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground text-left">Kingdom Essential Scriptures</Label>
            <Badge variant="outline" className="h-5 px-2 text-[8px] font-bold text-primary border-primary/20 bg-primary/5 uppercase text-left">Top Weapons</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-left">
          {kingdomVerses.map((v, idx) => (
            <Button 
              key={idx} 
              variant="ghost" 
              className="w-full justify-start h-auto py-4 sm:py-6 px-4 sm:px-6 rounded-2xl sm:rounded-[2rem] hover:bg-primary/5 group border border-transparent hover:border-primary/10 transition-all text-left block relative overflow-hidden bg-muted/5 shadow-sm text-left"
              onClick={() => onSelectVerse(constructInvitationMessage(v.text, v.reference, `${window.location.origin}/dashboard/bible`))}
            >
              <div className="flex items-center justify-between w-full mb-1.5 text-left">
                  <span className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-primary text-left">{v.reference}</span>
                  <PlusCircle className="h-3.5 w-3.5 sm:h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity text-left" />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic line-clamp-2 text-left">{v.text}</p>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderBooks = (
    <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">
      {bibleData.map(book => (
        <Button key={book.name} variant="outline" className="h-12 sm:h-14 rounded-xl font-bold uppercase text-[9px] sm:text-xs text-left" onClick={() => handleSelectBook(book.name)}>
          {book.name}
        </Button>
      ))}
    </div>
  );

  const renderChapters = (
    <div className="p-2 grid grid-cols-5 sm:grid-cols-8 gap-2 text-left text-left">
       {selectedBookName && bibleData.find(b => b.name === selectedBookName)?.chapters.map(ch => (
         <Button key={ch.chapter} variant="outline" className="h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-lg font-black text-xs sm:text-sm text-left" onClick={() => handleSelectChapter(ch.chapter)}>
           {ch.chapter}
         </Button>
       ))}
    </div>
  );

  const renderVerses = (
    <div className="space-y-4 pb-12 text-left text-left text-left">
       <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6 text-left text-left">
          <p className="text-[10px] font-black uppercase text-primary mb-1 text-left">SELECTED FOR SHARING</p>
          <p className="text-xs font-bold text-muted-foreground text-left">
            {selectedBookName} {selectedChapter}:{selectedVerses.join(', ')}
          </p>
       </div>
       <div className="space-y-1 font-serif text-left text-left text-left">
         {loadingVerses ? (
           <div className="flex justify-center py-20 text-left"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20 text-left" /></div>
         ) : chapterContent?.verses.map(v => (
           <div 
             key={v.verse} 
             className={cn(
               "p-3 rounded-xl transition-all cursor-pointer border-2 text-left",
               selectedVerses.includes(v.verse) ? "bg-primary/10 border-primary/40" : "bg-transparent border-transparent hover:bg-muted/50"
             )}
             onClick={() => toggleVerse(v.verse)}
            >
              <sup className="text-[10px] font-black mr-2 opacity-40 text-left text-left">{v.verse}</sup>
              <span className="text-sm leading-relaxed text-left text-left">{v.text}</span>
           </div>
         ))}
       </div>
    </div>
  );

  const titleText = view === 'hub' ? "Share the Word" : view === 'books' ? "Select Book" : view === 'chapters' ? `${selectedBookName}: Select Chapter` : `${selectedBookName} ${selectedChapter}`;
  const descText = view === 'hub' ? `Equip ${soul?.firstName} with the living Word.` : `Browsing ${selectedBookName || 'Bible'} for the harvest.`;

  const header = (
    <div className="p-6 sm:p-8 border-b bg-muted/10 shrink-0 text-left text-left">
      <div className="flex items-center justify-between gap-4 text-left">
        <div className="min-w-0 text-left text-left">
          <div className="flex items-center gap-3 mb-2 text-left text-left text-left">
            {view !== 'hub' && (
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full -ml-2 text-left" onClick={() => setView(view === 'verses' ? 'chapters' : view === 'chapters' ? 'books' : 'hub')}>
                    <ArrowLeft className="h-4 w-4 text-left" />
                </Button>
            )}
            <Target className="h-5 w-5 text-primary text-left text-left text-left" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left text-left">Kingdom Study</span>
          </div>
          <DialogHeader className="text-left text-left text-left">
            <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left">{titleText}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm font-medium text-left text-left text-left">{descText}</DialogDescription>
          </DialogHeader>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/40 text-left" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5 sm:h-6 sm:w-6 text-left" />
        </Button>
      </div>
    </div>
  );

  const body = (
    <ScrollArea className="flex-grow min-h-[300px] text-left">
        <div className="p-4 sm:p-10 text-left text-left text-left">
            {view === 'hub' && renderHub}
            {view === 'books' && renderBooks}
            {view === 'chapters' && renderChapters}
            {view === 'verses' && renderVerses}
        </div>
    </ScrollArea>
  );

  const footer = view === 'verses' && (
    <div className="p-6 border-t bg-muted/5 flex flex-col sm:flex-row gap-3 text-left text-left text-left">
        <Button variant="outline" onClick={() => setSelectedVerses([])} className="rounded-xl h-12 flex-1 font-bold text-left text-left text-left">Clear Selection</Button>
        <Button 
          onClick={handleShareSelected} 
          disabled={selectedVerses.length === 0}
          className="rounded-xl h-12 flex-1 font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-left text-left text-left"
        >
          PREPARE SHARE ({selectedVerses.length})
        </Button>
    </div>
  );

  if (isMobile) {
      return (
          <Sheet open={isOpen} onOpenChange={onOpenChange}>
              <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
                  {header}
                  {body}
                  {footer}
              </SheetContent>
          </Sheet>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col text-left text-left text-left">
        {header}
        {body}
        {footer || (
            <div className="p-6 border-t bg-muted/5 flex justify-end shrink-0 text-left text-left text-left">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-xs text-left text-left">Close Hub</Button>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MatchmakingDialog({ 
    isOpen, 
    onOpenChange, 
    sourceSoul, 
    allSouls, 
    onMatchConfirmed 
}: { 
    isOpen: boolean; 
    onOpenChange: (open: boolean) => void; 
    sourceSoul: Soul; 
    allSouls: Soul[];
    onMatchConfirmed: (candidate: Soul) => void;
}) {
    const isMobile = useIsMobile();
    const [searchTerm, setSearchTerm] = useState('');

    const candidates = useMemo(() => {
        if (!sourceSoul) return [];
        return allSouls.filter(s => 
            s.id !== sourceSoul.id && 
            s.gender && sourceSoul.gender && s.gender !== sourceSoul.gender &&
            (s.age || 0) >= 18 &&
            ['Single', 'Divorced', 'Widowed'].includes(s.maritalStatus || '')
        ).filter(s => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return `${s.firstName} ${s.lastName}`.toLowerCase().includes(term);
        }).sort((a,b) => a.firstName.localeCompare(b.firstName));
    }, [sourceSoul, allSouls, searchTerm]);

    const header = (
        <div className="p-8 border-b bg-muted/10 shrink-0 text-left text-left text-left text-left">
            <div className="flex items-center gap-2 mb-2 text-left text-left text-left text-left">
                <HeartHandshake className="h-5 w-5 text-primary text-left text-left text-left text-left text-left" />
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left text-left text-left text-left">Kingdom Matching</span>
            </div>
            <DialogHeader className="text-left text-left text-left text-left text-left text-left">
                <DialogTitle className="text-2xl font-black font-headline uppercase text-left text-left text-left text-left text-left">Find Match for {sourceSoul.firstName}</DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-left text-left text-left text-left text-left">Listing eligible singles (18+) of the opposite gender.</DialogDescription>
            </DialogHeader>
            <div className="relative mt-6 text-left text-left text-left text-left text-left">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 text-left text-left text-left text-left" />
                <Input 
                    placeholder="Search candidates..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="h-11 pl-10 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left text-left text-left text-left text-left"
                />
            </div>
        </div>
    );

    const body = (
        <ScrollArea className="flex-grow min-h-0 text-left text-left text-left text-left">
            <div className="p-4 space-y-2 text-left text-left text-left">
                {candidates.length > 0 ? candidates.map(c => (
                    <Button 
                        key={c.id} 
                        variant="ghost" 
                        className="w-full justify-start h-auto min-h-[4rem] rounded-2xl gap-4 hover:bg-primary/5 group p-4 flex flex-row items-center text-left text-left text-left"
                        onClick={() => onMatchConfirmed(c)}
                    >
                        <Avatar className="h-10 w-10 border shadow-sm shrink-0 text-left text-left text-left text-left">
                            <AvatarImage src={c.photoURL || undefined} className="object-cover text-left text-left" />
                            <AvatarFallback className="font-black bg-primary/10 text-primary text-xs flex items-center justify-center h-full w-full text-left text-left text-left text-left">{c.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 text-left text-left text-left">
                            <p className="font-black text-sm uppercase tracking-tight truncate leading-tight text-left text-left text-left text-left">{c.firstName} {c.lastName} ({c.age})</p>
                            <div className="flex items-center gap-2 mt-0.5 opacity-60 flex-wrap text-left text-left text-left text-left">
                                <Badge variant="outline" className="h-4 px-1 text-[7px] uppercase font-bold tracking-widest text-left text-left text-left">{c.maritalStatus}</Badge>
                                <p className="text-[9px] font-bold uppercase truncate text-left text-left text-left">{c.church || 'Global Network'}</p>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 opacity-20 group-hover:opacity-100 transition-opacity shrink-0 text-left text-left text-left" />
                    </Button>
                )) : (
                    <div className="py-20 text-center flex flex-col items-center">
                        <Users className="h-12 w-12 text-muted-foreground/10 mb-4" />
                        <p className="text-sm text-muted-foreground italic">No eligible candidates found in your harvest.</p>
                    </div>
                )}
            </div>
        </ScrollArea>
    );

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={onOpenChange}>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left">
                    {header}
                    {body}
                    <div className="p-8 border-t shrink-0 text-left text-left text-left">
                        <Button variant="outline" className="w-full rounded-xl h-12 font-bold text-left text-left text-left" onClick={() => onOpenChange(false)}>Cancel</Button>
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[85dvh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col text-left text-left text-left">
                {header}
                {body}
            </DialogContent>
        </Dialog>
    );
}

function SoulProfileContent({ 
  soul, 
  allSouls = [],
  onFollowUp,
  onViewHistory,
  onEdit,
  onAssess,
  onOpenAssignDialog,
  onExportSingle,
  onDelete
}: { 
  soul: Soul; 
  allSouls?: Soul[];
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
  const [isMatchmakingOpen, setIsMatchmakingOpen] = React.useState(false);
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

  const finalizeRelationalLog = async (s: Soul, noteAddendum: string = '') => {
    if (!user || !firestore || !clickedActionId) return;
    setIsActionSubmitting(true);

    const action = actionItems.find(a => a.id === clickedActionId);
    const batch = writeBatch(firestore);
    const soulRef = doc(firestore, `users/${s.userId}/souls`, s.id);
    const globalSoulRef = doc(firestore, 'souls', s.id);

    const memberName = `${currentUserProfile?.firstName || ''} ${currentUserProfile?.lastName || ''}`.trim() || user.displayName || 'Member';
    const logEntry = {
        date: new Date(), 
        note: `Logged via Identity Hub: ${action?.label}${noteAddendum ? ` - ${noteAddendum}` : ''}`,
        actions: [clickedActionId],
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
        case 'matchmaking':
            setIsMatchmakingOpen(true);
            return;
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
            await finalizeRelationalLog(soul, 'Dialer initiated');
            window.location.href = `tel:${soul.phone}`;
            return;
        case 'visited_home':
            if (address) {
                await finalizeRelationalLog(soul, `Navigated to venue: ${address}`);
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
            } else {
                toast({ variant: 'destructive', title: 'Location Undefined' });
            }
            return;
        case 'helped_with_need':
            setIsHelpNeedDialogOpen(true);
            return;
        case 'invited_to_event':
            await finalizeRelationalLog(soul, 'Redirected to Events Hub');
            router.push('/dashboard/events');
            return;
        case 'shared_meal':
        case 'gave_gift':
            const provisionKey = `testify_pending_provisions_${user?.uid}`;
            const stored = localStorage.getItem(provisionKey);
            let current = stored ? JSON.parse(stored) : [];
            if (!Array.isArray(current)) current = [];
            if (!current.some((p: any) => p.soulId === soul.id && p.actionId === actionId)) {
                current.push({ soulId: soul.id, soulName: `${soul.firstName} ${soul.lastName}`, actionId: actionId, timestamp: Date.now() });
                localStorage.setItem(provisionKey, JSON.stringify(current));
                window.dispatchEvent(new Event('testify_pending_action_update'));
            }
            const mPath = actionId === 'shared_meal' ? '/dashboard/marketplace' : '/dashboard/marketplace/gifts';
            router.push(`${mPath}?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}&actionId=${actionId}`);
            return;
        default:
            await finalizeRelationalLog(soul);
    }
  };

  const handleMatchConfirmed = async (candidate: Soul) => {
      if (!user || !firestore || !soul || !currentUserProfile) return;
      setIsMatchmakingOpen(false);
      
      const template = `Hi ${soul.firstName}, I've found a potential Kingdom match for you! Meet ${candidate.firstName}, a believer from my harvest field. Let's explore if this is God's will for both of you. ${window.location.origin}/chats`;
      setCustomMessageText(template);
      setClickedActionId('matchmaking');
      setIsCommChannelDialogOpen(true);
  };

  const handleCommChoice = async (channel: 'whatsapp' | 'sms' | 'chat') => {
      if (!soul || !clickedActionId) return;
      
      if (channel === 'chat') {
          await handleInitiateChat(soul, customMessageText);
          setIsCommChannelDialogOpen(false);
          setCustomMessageText('');
          return;
      }

      if (!soul.phone) {
          toast({ variant: 'destructive', title: 'Phone Missing' });
          return;
      }

      const cleanPhone = soul.phone.replace(/\+/g, '').replace(/\D/g, '');
      const messageText = encodeURIComponent(customMessageText || `Hi ${soul.firstName}, I'm thinking of you today and praying for you. God bless you!`);
      
      if (channel === 'whatsapp') {
          window.open(`https://wa.me/${cleanPhone}?text=${messageText}`, '_blank');
      } else {
          window.location.href = `sms:${soul.phone}?body=${messageText}`;
      }
      
      finalizeRelationalLog(soul, `Sent via ${channel.toUpperCase()}: ${customMessageText.substring(0, 30)}...`);
      setIsCommChannelDialogOpen(false);
      setCustomMessageText('');
  };

  const handleInitiateChat = async (targetSoul: Soul, text?: string) => {
    if (!user || !firestore || !currentUserProfile) return;
    setIsActionSubmitting(true);
    try {
        const participantIds = [user.uid, targetSoul.userId].sort();
        const chatsRef = collection(firestore, 'chats');
        const q = query(chatsRef, where('participantIds', '==', participantIds), where('isGroupChat', '==', false));
        const snap = await getDocs(q);
        
        let chatId: string;
        if (!snap.empty) {
            chatId = snap.docs[0].id;
        } else {
            const newChat = {
                participantIds,
                participantInfo: {
                    [user.uid]: { firstName: currentUserProfile.firstName, lastName: currentUserProfile.lastName, photoURL: currentUserProfile.photoURL || '' },
                    [targetSoul.userId]: { firstName: targetSoul.firstName, lastName: targetSoul.lastName, photoURL: targetSoul.photoURL || '' }
                },
                lastUpdatedAt: serverTimestamp(),
                isGroupChat: false,
                hasMessages: true
            };
            const ref = await addDoc(chatsRef, newChat);
            chatId = ref.id;
        }

        if (text) {
            await addDoc(collection(firestore, 'chats', chatId, 'messages'), {
                senderId: user.uid,
                text,
                createdAt: serverTimestamp()
            });
            await updateDoc(doc(firestore, 'chats', chatId), { lastUpdatedAt: serverTimestamp(), hasMessages: true });
        }

        finalizeRelationalLog(targetSoul, `Initiated in-app Chat: ${text?.substring(0, 30)}...`);
        router.push(`/dashboard/chats/${chatId}`);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Chat Failed' });
    } finally {
        setIsActionSubmitting(false);
    }
  };

  const handleHelpNeedConfirm = (note: string) => {
      if (!soul) return;
      finalizeRelationalLog(soul, `Assistance details: ${note}`);
      setIsHelpNeedDialogOpen(false);
  };

  const handleShareToWhatsApp = () => {
    if (!soul) return;
    const wonAt = safeToDate(soul.wonAt);
    const details = `Introduction to ${soul.firstName}, a new soul won for the Kingdom! 🎊\n\nStatus: ${soul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\n\nSupport their growth on Testify: ${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(details)}`, '_blank');
    finalizeRelationalLog(soul, 'Shared via WhatsApp External');
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
          finalizeRelationalLog(soul, `Shared with partner: ${partner.firstName}`);
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
    <div className="space-y-6 text-left text-left text-left">
      <Card className="rounded-none sm:rounded-[2rem] overflow-hidden border-none shadow-2xl bg-card/50 backdrop-blur-sm border-t-8 border-t-primary/20 text-left text-left">
        <CardHeader className="p-8 pb-4 text-center text-left text-left">
            <div className="relative inline-block mx-auto mb-4 text-left text-left">
                <Dialog>
                    <DialogTrigger asChild disabled={!soul.photoURL}>
                        <Avatar className={cn("h-48 w-48 border-4 border-background shadow-xl ring-2 ring-primary/10 transition-all active:scale-95 text-left text-left", soul.photoURL && "cursor-pointer hover:scale-105")}>
                            <AvatarImage src={soul.photoURL || undefined} className="object-cover text-left text-left" />
                            <AvatarFallback className="text-3xl font-black bg-primary/10 text-primary text-left text-left text-left">{soul.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </DialogTrigger>
                    {soul.photoURL && (
                        <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center text-left">
                            <DialogHeader className="sr-only text-center text-left text-left"><DialogTitle className="text-left text-left">Soul Photo</DialogTitle></DialogHeader>
                            <div className="relative h-full w-full flex items-center justify-center p-4 text-left text-left">
                                <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center text-left text-left text-left text-left">
                                    <Image src={soul.photoURL} alt={soul.firstName} fill className="object-contain shadow-2xl ring-4 ring-white/10 text-left text-left" unoptimized />
                                </div>
                            </div>
                        </DialogContent>
                    )}
                </Dialog>
                {address && (
                    <Button 
                        size="icon" 
                        className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full shadow-lg border-2 border-background text-left text-left"
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')}
                        title="View Map"
                    >
                        <MapPin className="h-5 w-5 text-left text-left" />
                    </Button>
                )}
            </div>
            <div className="flex flex-col items-center gap-2 text-left text-left">
                <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-center sm:text-left truncate w-full text-left text-left text-left">
                  {soul.firstName} {soul.lastName}
                </CardTitle>
                <div className="flex gap-2 justify-center items-center text-left">
                    <Badge className={cn("h-5 px-2 text-[9px] uppercase font-black tracking-widest justify-center text-left text-left", getStatusClasses(soul.status))} variant="outline">
                        {soul.status}
                    </Badge>
                    <MutualConnectBadge soul={soul} />
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-8 pt-0 space-y-6 text-left text-left">
            <Separator className="opacity-50 text-left text-left" />
            
            <div className="space-y-4 text-left text-left">
                <div className="flex items-center justify-between text-left text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left text-left">Spiritual Identity</p>
                    <div className="flex items-center gap-1 text-left">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left text-left">
                                    <Download className="h-4 w-4 text-left text-left" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl text-left text-left">
                                <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-left text-left text-left">Select Format</DropdownMenuLabel>
                                <DropdownMenuSeparator className="text-left text-left" />
                                <DropdownMenuItem onSelect={() => onExportSingle(soul, 'csv')} className="text-left">CSV Export</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => onExportSingle(soul, 'pdf')} className="text-left">PDF Report</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left text-left" onClick={() => onEdit(soul)}>
                            <Edit className="h-4 w-4 text-left text-left" />
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-left text-left">
                    <div className="space-y-1 text-left text-left">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left text-left">Full Name</p>
                        <p className="text-[11px] sm:text-xs font-bold truncate capitalize text-left text-left">{soul.firstName} {soul.lastName}</p>
                    </div>
                    <div className="space-y-1 text-left text-left">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left text-left">Gender/Age</p>
                        <p className="text-[11px] sm:text-xs font-bold text-left text-left">{soul.gender || 'N/A'} • {soul.age ? `${soul.age} yrs` : 'Age N/A'}</p>
                    </div>
                    <div className="space-y-1 text-left text-left">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left text-left">Relationship</p>
                        <p className="text-[11px] sm:text-xs font-bold text-left text-left truncate capitalize">{soul.relationship || 'N/A'}</p>
                    </div>
                    <div className="space-y-1 text-left text-left">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left text-left">Work Status</p>
                        <p className="text-[11px] sm:text-xs font-bold text-left text-left truncate capitalize">{soul.workStatus || 'N/A'}</p>
                    </div>
                    <div className="space-y-1 text-left text-left">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left text-left">Rel. Status</p>
                        <p className="text-[11px] sm:text-xs font-bold text-left text-left truncate capitalize">{soul.maritalStatus || 'N/A'}</p>
                    </div>
                    <div className="space-y-1 text-left text-left">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left text-left">Nickname</p>
                        <p className="text-[11px] sm:text-xs font-bold text-left text-left truncate capitalize">{soul.nickname || 'N/A'}</p>
                    </div>
                </div>
            </div>

            <Separator className="opacity-20 text-left text-left" />

            <div className="space-y-3 text-left text-left">
                <div className="flex items-center justify-between text-left text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left text-left">Contact Identity</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left text-left" onClick={() => onEdit(soul)}>
                        <Edit className="h-4 w-4 text-left text-left" />
                    </Button>
                </div>
                <div className="space-y-2 text-left text-left">
                    {soul.phone ? (
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-foreground text-left text-left">
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0 text-left text-left" />
                            {soul.phone}
                        </div>
                    ) : (
                        <p className="text-[9px] text-muted-foreground/40 italic text-left text-left">No phone recorded</p>
                    )}
                    {soul.email && (
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-foreground text-left text-left">
                            <Mail className="h-3.5 w-3.5 text-primary shrink-0 text-left text-left" />
                            {soul.email}
                        </div>
                    )}
                </div>
            </div>

            <Separator className="opacity-20 text-left text-left" />

            <div className="space-y-4 text-left text-left">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left text-left">Relational Actions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left text-left">
                    {actionItems.map(action => {
                        const Icon = iconMap[action.id] || Heart;
                        const isThisProcessing = clickedActionId === action.id && isActionSubmitting;
                        return (
                            <Button
                                key={action.id}
                                variant="outline"
                                className="flex items-center justify-start gap-2 h-10 px-3 rounded-xl border-2 border-transparent bg-muted/20 hover:bg-primary/5 hover:border-primary/10 transition-all text-left text-left group"
                                onClick={() => handleActionClick(action.id)}
                                disabled={isActionSubmitting}
                            >
                                {isThisProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary text-left" /> : <Icon className="h-3.5 w-3.5 text-primary text-left" />}
                                <span className="text-[10px] font-bold uppercase tracking-tight truncate text-left">{action.label}</span>
                            </Button>
                        )
                    })}
                </div>
            </div>

            <Separator className="opacity-20 text-left text-left" />

            <div className="space-y-4 text-left text-left">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left text-left">Harvest Context</p>
                <div className="space-y-1 text-left text-left">
                    <p className="text-[11px] sm:text-xs font-bold flex items-center gap-1.5 truncate text-left text-left text-left">
                        <Target className="h-3 w-3 text-primary text-left text-left" />
                        Source: {soul.source}
                    </p>
                </div>
            </div>

            <Separator className="opacity-20 text-left text-left" />

            <div className="space-y-4 text-left text-left">
                <div className="flex items-center justify-between text-left text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left text-left">Kingdom Placement</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left text-left" onClick={() => onOpenAssignDialog(soul)}>
                        <Edit className="h-4 w-4 text-left text-left" />
                    </Button>
                </div>
                <div className="space-y-3 text-left text-left">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-primary/5 border border-primary/10 text-left text-left">
                        <HeartHandshake className="h-4 w-4 text-primary shrink-0 text-left text-left" />
                        <div className="min-w-0 text-left text-left">
                            <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest text-left text-left">Fellowship</p>
                            <p className="text-[11px] sm:text-xs font-bold truncate capitalize text-left text-left">{soul.fellowshipName || 'No Fellowship'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-blue-500/5 border border-blue-500/10 text-left text-left">
                        <Users className="h-4 w-4 text-blue-500 shrink-0 text-left text-left" />
                        <div className="min-w-0 text-left text-left">
                            <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest text-left text-left">Association</p>
                            <p className="text-[11px] sm:text-xs font-bold truncate capitalize text-left text-left">{soul.associationName || 'No Association'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <Separator className="opacity-20 text-left text-left" />

            <div className="space-y-4 text-left text-left">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left text-left">Spiritual Milestones</p>
                <div className="grid grid-cols-2 gap-2 text-left text-left">
                    {[
                        { label: 'Church', val: soul.attendingChurch, icon: Church },
                        { label: 'Word Study', val: soul.inBibleStudy, icon: BookOpen },
                        { label: 'Prayer', val: soul.attendingPrayer, icon: Zap },
                        { label: 'Service', val: soul.inServiceDepartment, icon: ShieldCheck },
                    ].map(milestone => (
                        <div key={milestone.label} className={cn(
                            "flex items-center gap-2 p-2 rounded-xl border transition-all text-left text-left",
                            milestone.val ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/10 border-transparent text-muted-foreground/40"
                        )}>
                            <milestone.icon className="h-3 w-3 text-left text-left" />
                            <span className="text-[10px] font-black uppercase tracking-tight text-left text-left">{milestone.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <Separator className="opacity-20 text-left text-left" />
            <div className="space-y-4 text-left text-left">
                <div className="flex items-center justify-between text-left text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2 text-left text-left">
                        <History className="h-3.5 w-3.5 text-left text-left" /> Interaction History
                    </p>
                    <Button variant="ghost" className="h-6 text-[8px] font-black uppercase text-primary hover:bg-primary/5 text-left" onClick={() => onViewHistory(soul)}>
                        View All
                    </Button>
                </div>
                <div className="space-y-4 pl-1 text-left text-left">
                    {sortedHistory.length > 0 ? (
                        sortedHistory.slice(0, 3).map((log, index) => {
                            const date = safeToDate(log.date);
                            return (
                                <div key={index} className="relative text-left">
                                    <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest mb-1 text-left text-left">
                                        {date ? format(date, "MMM d, yyyy") : 'Recently'}
                                        {log.memberName && <span className="ml-2 text-primary/40 text-left text-left">• By {log.memberName.split(' ')[0]}</span>}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 italic text-left text-left">
                                        &ldquo;{log.note || 'Interaction logged.'}&rdquo;
                                    </p>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-4 text-center border border-dashed rounded-xl bg-muted/5 text-left text-left">
                            <p className="text-sm text-muted-foreground/40 italic text-left">No interactions recorded.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3 p-5 bg-muted/20 rounded-[2rem] border-2 border-dashed border-primary/10 shadow-inner text-left text-left">
                <div className="flex items-center justify-between text-left text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-1 text-left text-left">
                        <ClipboardList className="h-3.5 w-3.5 text-left text-left" /> Assessed Needs
                    </p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left text-left" onClick={() => onAssess(soul)}>
                        <Edit className="h-4 w-4 text-left text-left" />
                    </Button>
                </div>
                {needs ? (
                    <div className="space-y-4 text-left text-left">
                        {needs.generalImpression && <p className="text-xs text-muted-foreground italic leading-relaxed text-balance text-left text-left text-left">&ldquo;{needs.generalImpression}&rdquo;</p>}
                        
                        <div className="grid grid-cols-2 gap-3 text-left text-left">
                            {needs.emotionalNeeds && (
                                <div className="space-y-1 text-left text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-red-500/10 text-red-600 border-none px-1.5 uppercase font-black text-left text-left">Emotional</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left text-left">{needs.emotionalNeeds}</p>
                                </div>
                            )}
                            {needs.physicalNeeds && (
                                <div className="space-y-1 text-left text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-amber-500/10 text-amber-600 border-none px-1.5 uppercase font-black text-left text-left">Physical</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left text-left">{needs.physicalNeeds}</p>
                                </div>
                            )}
                            {needs.financialNeeds && (
                                <div className="space-y-1 text-left text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-green-500/10 text-green-600 border-none px-1.5 uppercase font-black text-left text-left">Financial</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left text-left">{needs.financialNeeds}</p>
                                </div>
                            )}
                            {needs.socialNeeds && (
                                <div className="space-y-1 text-left text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-indigo-500/10 text-indigo-600 border-none px-1.5 uppercase font-black text-left text-left">Social</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left text-left">{needs.socialNeeds}</p>
                                </div>
                            )}
                        </div>

                        {needs.followUpPlan && (
                            <div className="pt-2 border-t border-primary/10 text-left text-left">
                                <p className="text-[8px] font-black uppercase text-primary/60 mb-1 flex items-center gap-1.5 text-left text-left">
                                    <Target className="h-2.5 w-2.5 text-left text-left" /> Strategy
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed italic text-left text-left">{needs.followUpPlan}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-4 text-center text-left text-left">
                        <Button variant="outline" size="sm" className="h-8 rounded-xl text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 text-left text-left" onClick={() => onAssess(soul)}>
                            BEGIN ASSESSMENT
                        </Button>
                    </div>
                )}
            </div>

            <div className="pt-2 text-left space-y-3 text-left">
                <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 text-left text-left" onClick={() => onFollowUp(soul)}>
                    LOG FOLLOW-UP
                </Button>
                <Button variant="ghost" className="w-full h-11 text-destructive font-bold uppercase tracking-widest text-[10px] text-left text-left" onClick={() => onDelete(soul)}>
                    <Trash2 className="mr-2 h-4 w-4 text-left" /> DELETE RECORD
                </Button>
            </div>
        </CardContent>
      </Card>

      <Dialog open={isPrayerCustomizationOpen} onOpenChange={setIsPrayerCustomizationOpen}>
          <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left">
              <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left">
                  <DialogHeader>
                      <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Kingdom Intercession</DialogTitle>
                      <DialogDescription className="text-sm font-medium text-left text-left">Draft a powerful prayer for {soul.firstName}.</DialogDescription>
                  </DialogHeader>
              </div>
              <div className="p-8 space-y-6 text-left text-left">
                <div className="space-y-3 text-left text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left">Select Focus</label>
                    <div className="flex flex-wrap gap-2 text-left text-left">
                        {prayerTemplates.map(t => (
                            <Button 
                                key={t.id} 
                                variant="outline" 
                                size="sm" 
                                className="rounded-full h-8 px-4 text-[9px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 hover:text-primary text-left text-left"
                                onClick={() => setCustomMessageText(resolveTemplate(t.text, soul))}
                            >
                                {t.label}
                            </Button>
                        ))}
                    </div>
                </div>
                  <div className="space-y-2 text-left text-left">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left">Customize Message</Label>
                      <Textarea 
                          value={customMessageText}
                          onChange={e => setCustomMessageText(e.target.value)}
                          className="min-h-[200px] rounded-2xl bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6 text-left text-left"
                      />
                  </div>
                  <Button 
                      onClick={() => handlePrayerCustomizationConfirm(customMessageText)} 
                      disabled={!customMessageText.trim()} 
                      className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-left text-left"
                  >
                      CONTINUE TO CHANNEL
                  </Button>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isCommChannelDialogOpen} onOpenChange={setIsCommChannelDialogOpen}>
        <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center text-left text-left text-left">
          <DialogHeader className="text-center space-y-2 text-left text-left text-left text-left">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-left text-left text-left text-left">
                  <MessageSquare className="h-7 w-7 text-primary text-left text-left text-left text-left" />
              </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center text-left text-left">Message Hub</DialogTitle>
            <DialogDescription className="text-sm font-medium text-center text-left text-left">How would you like to encourage {soul.firstName}?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-6 text-left text-left">
            <Button onClick={() => handleCommChoice('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20 text-left text-left">
              <WhatsAppIcon className="h-5 w-5 text-left text-left text-left text-left" /> WhatsApp
            </Button>
            <Button onClick={() => handleCommChoice('sms')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5 text-left text-left">
              <Smartphone className="h-5 w-5 text-left text-left text-left text-left" /> Standard SMS
            </Button>
            {soul.userId && (
                <Button onClick={() => handleCommChoice('chat')} variant="secondary" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-md text-left text-left">
                    <MessagesSquare className="h-5 w-5 text-left text-left text-left text-left" /> In-App Chat
                </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isHelpNeedDialogOpen} onOpenChange={setIsHelpNeedDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left">
          <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left">
            <DialogHeader className="text-left text-left text-left">
              <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left text-left">Support Provided</DialogTitle>
              <DialogDescription className="text-sm font-medium text-left text-left text-left text-left text-left">Describe how you supported {soul.firstName}.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6 text-left text-left">
            <div className="space-y-2 text-left text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left text-left">Support Details</Label>
                <Textarea 
                    placeholder="e.g. Provided food items, helped with bill..." 
                    onChange={e => setCustomMessageText(e.target.value)} 
                    className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner text-left text-left"
                />
            </div>
            <Button onClick={() => handleHelpNeedConfirm(customMessageText)} className="w-full h-12 rounded-xl font-bold text-center text-left text-left text-left">Confirm Service</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareTargetDialogOpen} onOpenChange={setIsShareTargetDialogOpen}>
        <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center text-left text-left text-left text-left">
          <DialogHeader className="text-center space-y-2 text-left text-left text-left text-left text-left">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-left text-left text-left text-left text-left">
                  <Share2 className="h-7 w-7 text-primary text-left text-left text-left text-left text-left" />
              </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center text-left text-left text-left">Share Details</DialogTitle>
            <DialogDescription className="text-sm font-medium text-center text-left text-left text-left">Where would you like to share {soul.firstName}'s info?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-6 text-left text-left text-left">
            <Button onClick={handleShareToWhatsApp} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20 text-left text-left text-left">
              <WhatsAppIcon className="h-5 w-5 text-left text-left text-left text-left text-left" /> WhatsApp External
            </Button>
            <Button onClick={() => { setIsShareTargetDialogOpen(false); setTimeout(() => setIsPartnerSelectionDialogOpen(true), 100); }} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5 text-left text-left text-left">
              <HeartHandshake className="h-5 w-5 text-left text-left text-left" /> Partner on App
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPartnerSelectionDialogOpen} onOpenChange={setIsPartnerSelectionDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left text-left">
              <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left text-left">
                  <DialogHeader className="text-left text-left text-left text-left text-left">
                      <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left text-left">Select Partner</DialogTitle>
                      <DialogDescription className="text-sm font-medium text-left text-left text-left text-left text-left text-left">Which partner should receive these details?</DialogDescription>
                  </DialogHeader>
              </div>
              <div className="p-6 text-left text-left">
              <ScrollArea className="h-64 text-left text-left">
                  <div className="space-y-2 text-left text-left text-left">
                      {uniquePartners.map(p => (
                          <Button 
                              key={p.userId} 
                              variant="ghost" 
                              className="w-full justify-start h-14 rounded-xl gap-4 hover:bg-primary/5 group text-left text-left flex flex-row items-center"
                              onClick={() => handleShareToPartner(p)}
                          >
                              <Avatar className="h-8 w-8 border shrink-0 text-left text-left">
                                  <AvatarImage src={p.photoURL} className="text-left text-left" />
                                  <AvatarFallback className="font-black text-[10px] text-center flex items-center justify-center w-full h-full text-left text-left">{p.firstName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="font-bold text-sm group-hover:text-primary transition-colors text-left text-left">{p.firstName} {p.lastName}</span>
                          </Button>
                      ))}
                      {uniquePartners.length === 0 && (
                          <p className="text-center text-xs text-muted-foreground py-12 text-left text-left">No partners found. Connect with some in Settings!</p>
                      )}
                  </div>
              </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <ShareWordDialog 
          isOpen={isStudyWordOpen}
          onOpenChange={setIsStudyWordOpen}
          soul={soul}
          onSelectVerse={(v) => { setCustomMessageText(v); setIsStudyWordOpen(false); setIsCommChannelDialogOpen(true); }}
      />

      <MatchmakingDialog 
          isOpen={isMatchmakingOpen}
          onOpenChange={setIsMatchmakingOpen}
          sourceSoul={soul}
          allSouls={allSouls}
          onMatchConfirmed={handleMatchConfirmed}
      />
    </div>
  );
}

const SoulCard = React.memo(({ soul, onClick }: { 
  soul: Soul; 
  onClick: () => void;
}) => {
    return (
        <Card onClick={onClick} className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-b-2 sm:border-b shadow-none bg-card/50 backdrop-blur-sm transition-all duration-300 cursor-pointer hover:bg-primary/[0.02] text-left text-left text-left">
            <div className="flex items-center justify-between p-4 gap-4 text-left text-left">
                <div className="flex items-center gap-3 min-w-0 flex-1 text-left text-left">
                    <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 text-left text-left text-left")}>
                        <AvatarImage src={soul.photoURL || undefined} className="object-cover text-left text-left" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-left text-left text-left">
                            {soul.firstName?.charAt(0) || 'S'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-left text-left">
                        <div className="flex items-center gap-2 text-left flex-wrap text-left text-left">
                            <p className="font-bold truncate text-[13px] sm:text-base leading-tight capitalize tracking-tight text-left text-left text-left">
                              {soul.firstName || 'Unknown'} {soul.lastName || ''}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center mt-1.5 text-left text-left">
                            <Badge className={cn("h-5 px-1.5 text-[9px] uppercase font-black tracking-widest text-left text-left text-left", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                            {soul.fellowshipName && <Badge variant="secondary" className="h-5 px-1.5 text-[8px] uppercase font-black tracking-tighter bg-primary/5 text-primary border-primary/20 shrink-0 text-left text-left text-left">Fellowship</Badge>}
                        </div>
                    </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-20 text-left text-left text-left" />
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
            className={cn("border-b hover:bg-muted/30 transition-colors cursor-pointer text-left text-left", isSelected && "bg-primary/[0.03]")}
            onClick={() => onSelect()}
        >
            <TableCell className="font-medium p-4 text-left text-left text-left text-left">
                <div className="flex items-center gap-4 text-left text-left text-left text-left">
                    <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 text-left text-left text-left text-left")}>
                        <AvatarImage src={soul.photoURL || undefined} className="object-cover text-left text-left" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-left text-left text-left text-left">
                            {soul.firstName?.charAt(0) || 'S'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-left text-left text-left text-left">
                        <div className="font-black text-xs sm:text-sm md:text-base truncate capitalize tracking-tight text-left text-left text-left text-left">
                            {soul.firstName} {soul.lastName}
                        </div>
                        {soul.church && <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 font-medium truncate opacity-70 text-left text-left text-left text-left"><Church className="h-3 w-3 shrink-0 text-left text-left text-left" />{soul.church}</div>}
                    </div>
                </div>
            </TableCell>
        </TableRow>
    );
});
SoulTableRow.displayName = "SoulTableRow";

function SoulsWonPageContent() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();

  const [mounted, setMounted] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [followUpSoulId, setFollowUpSoulId] = useState<string | null>(null);
  const [historySoulId, setHistorySoulId] = useState<string | null>(null);
  const [assignSoulId, setAssignSoulId] = useState<string | null>(null);
  const [editSoulId, setEditSoulId] = useState<string | null>(null);
  const [deleteSoulId, setDeleteSoulId] = useState<string | null>(null);
  const [assessmentSoulId, setAssessmentSoulId] = useState<string | null>(null);

  const [selectedFilterGroup, setSelectedFilterGroup] = useState<{ type: 'age' | 'gender' | 'marital', value: string } | null>(null);
  const [logSoulDefaults, setLogSoulDefaults] = useState<any>({});

  const [isDeleting, setIsDeleting] = useState(false);
  const [isGalleryPaused, setIsGalleryPaused] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsSearchVisible(true);
    setSearchPlaceholder("Search souls...");
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setIsSearchVisible, setSearchTerm, setSearchPlaceholder]);

  useEffect(() => {
    const soulIdFromUrl = searchParams?.get('soulId');
    if (soulIdFromUrl) {
      setSelectedId(soulIdFromUrl);
    }
  }, [searchParams]);

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`), orderBy("wonAt", "desc"));
  }, [user?.uid, firestore]);
  const { data: souls, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

  const soulsWithPhotos = useMemo(() => {
      return souls?.filter(s => s.photoURL) || [];
  }, [souls]);

  const duplicatedSouls = useMemo(() => {
      if (soulsWithPhotos.length === 0) return [];
      return [...soulsWithPhotos, ...soulsWithPhotos, ...soulsWithPhotos];
  }, [soulsWithPhotos]);

  const ageGroups = useMemo(() => {
    const stats = {
      children: { count: 0, list: [] as Soul[] },
      teens: { count: 0, list: [] as Soul[] },
      youngAdults: { count: 0, list: [] as Soul[] },
      adults: { count: 0, list: [] as Soul[] },
      seniors: { count: 0, list: [] as Soul[] },
      unknown: { count: 0, list: [] as Soul[] }
    };

    if (!souls) return stats;

    souls.forEach(soul => {
      const age = soul.age;
      if (age === null || age === undefined) {
        stats.unknown.count++;
        stats.unknown.list.push(soul);
      } else if (age <= 12) {
        stats.children.count++;
        stats.children.list.push(soul);
      } else if (age <= 19) {
        stats.teens.count++;
        stats.teens.list.push(soul);
      } else if (age <= 33) {
        stats.youngAdults.count++;
        stats.youngAdults.list.push(soul);
      } else if (age <= 55) {
        stats.adults.count++;
        stats.adults.list.push(soul);
      } else {
        stats.seniors.count++;
        stats.seniors.list.push(soul);
      }
    });

    return stats;
  }, [souls]);

  const genderStats = useMemo(() => {
    const stats = {
      male: { count: 0, list: [] as Soul[] },
      female: { count: 0, list: [] as Soul[] },
      unassigned: { count: 0, list: [] as Soul[] },
      total: 0
    };
    if (!souls) return stats;
    souls.forEach(s => {
      if (s.gender === 'Male') {
          stats.male.count++;
          stats.male.list.push(s);
      } else if (s.gender === 'Female') {
          stats.female.count++;
          stats.female.list.push(s);
      } else {
          stats.unassigned.count++;
          stats.unassigned.list.push(s);
      }
      stats.total++;
    });
    return stats;
  }, [souls]);

  const maritalStats = useMemo(() => {
    const stats = {
      married: { count: 0, list: [] as any[] },
      single: { count: 0, list: [] as Soul[] },
      divorced: { count: 0, list: [] as Soul[] },
      widowed: { count: 0, list: [] as Soul[] },
      total: 0
    };
    if (!souls) return stats;

    const processedIds = new Set<string>();

    souls.forEach(soul => {
      const status = soul.maritalStatus;
      if (status === 'Married') {
          if (!processedIds.has(soul.id)) {
              const spouse = souls.find(other => {
                if (other.id === soul.id || other.maritalStatus !== 'Married') return false;
                const otherFullName = `${other.firstName} ${other.lastName}`.toLowerCase();
                const soulFullName = `${soul.firstName} ${soul.lastName}`.toLowerCase();
                const soulSpouse = (soul.spouseName || "").toLowerCase();
                const otherSpouse = (other.spouseName || "").toLowerCase();
                return (soulSpouse === otherFullName || soulSpouse === other.firstName.toLowerCase()) &&
                       (otherSpouse === soulFullName || otherSpouse === soul.firstName.toLowerCase());
              });

              if (spouse) {
                processedIds.add(spouse.id);
                stats.married.list.push({ ...soul, spouseRecord: spouse });
              } else {
                stats.married.list.push(soul);
              }
              
              processedIds.add(soul.id);
              stats.married.count++;
          }
      } else if (status === 'Single') {
          stats.single.count++;
          stats.single.list.push(soul);
      } else if (status === 'Divorced') {
          stats.divorced.count++;
          stats.divorced.list.push(soul);
      } else if (status === 'Widowed') {
          stats.widowed.count++;
          stats.widowed.list.push(soul);
      }
      stats.total++;
    });
    return stats;
  }, [souls]);

  const activeFilteredSouls = useMemo(() => {
    if (!selectedFilterGroup) return [];
    const { type, value } = selectedFilterGroup;
    const groupKey = value.toLowerCase();

    if (type === 'age') {
        if (groupKey.includes('children')) return ageGroups.children.list;
        if (groupKey.includes('teens')) return ageGroups.teens.list;
        if (groupKey.includes('young adults')) return ageGroups.youngAdults.list;
        if (groupKey.includes('adults')) return ageGroups.adults.list;
        if (groupKey.includes('seniors')) return ageGroups.seniors.list;
        if (groupKey.includes('age not set')) return ageGroups.unknown.list;
    } else if (type === 'gender') {
        if (groupKey === 'male') return genderStats.male.list;
        if (groupKey === 'female') return genderStats.female.list;
        if (groupKey === 'not assigned') return genderStats.unassigned.list;
    } else if (type === 'marital') {
        if (groupKey === 'families') return maritalStats.married.list;
        if (groupKey === 'singles') return maritalStats.single.list;
        if (groupKey === 'divorced') return maritalStats.divorced.list;
        if (groupKey === 'widowers') return maritalStats.widowed.list;
    }
    return [];
  }, [selectedFilterGroup, ageGroups, genderStats, maritalStats]);

  const totalSoulsCount = useMemo(() => souls?.length || 0, [souls]);

  const soulForFollowUp = useMemo(() => souls?.find(s => s.id === followUpSoulId) || null, [souls, followUpSoulId]);
  const soulForHistory = useMemo(() => souls?.find(s => s.id === historySoulId) || null, [souls, historySoulId]);
  const soulToAssign = useMemo(() => souls?.find(s => s.id === assignSoulId) || null, [souls, assignSoulId]);
  const soulToEdit = useMemo(() => souls?.find(s => s.id === editSoulId) || null, [souls, editSoulId]);
  const soulToDelete = useMemo(() => souls?.find(s => s.id === deleteSoulId) || null, [souls, deleteSoulId]);
  const soulToAssess = useMemo(() => souls?.find(s => s.id === assessmentSoulId) || null, [souls, assessmentSoulId]);

  const campaignsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'campaigns'), where('organizerId', '==', user.uid), where('status', '==', 'active'));
  }, [user?.uid, firestore]);
  const { data: campaigns } = useCollection<Campaign>(campaignsQuery);
  
  const activeFellowshipsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'fellowships'), where('status', '==', 'active'));
  }, [firestore]);
  const { data: fellowships } = useCollection<Fellowship>(activeFellowshipsQuery);

  const userDocRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const loading = soulsLoading || profileLoading;

  const handleOpenFollowUp = useCallback((s: Soul) => setFollowUpSoulId(s.id), []);
  const handleOpenHistory = useCallback((s: Soul) => setHistorySoulId(s.id), []);
  const handleOpenAssign = useCallback((s: Soul) => setAssignSoulId(s.id), []);
  const handleOpenEdit = useCallback((s: Soul) => setEditSoulId(s.id), []);
  const handleOpenDelete = useCallback((s: Soul) => setDeleteSoulId(s.id), []);
  const handleOpenAssessment = useCallback((s: Soul) => setAssessmentSoulId(s.id), []);

  const handleAddChild = useCallback((p1: Soul, p2?: Soul | null) => {
    const parentNames = [p1.firstName];
    const parentIds = [p1.id];
    if (p2) {
      parentNames.push(p2.firstName);
      parentIds.push(p2.id);
    }
    setLogSoulDefaults({
      defaultLastName: p1.lastName,
      defaultLocation: p1.locationWon,
      defaultParentIds: parentIds,
      defaultParentNames: parentNames,
      defaultRelationship: 'Family' as any
    });
    setIsLogDialogOpen(true);
  }, []);

  const getBase64Logo = useCallback(async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new (window as any).Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject('Logo load failed');
    });
  }, []);

  const handleExportHarvest = async (formatType: 'csv' | 'pdf') => {
    if (!souls || souls.length === 0) {
        toast({ variant: 'destructive', title: 'Empty Harvest', description: 'No souls found to export.' });
        return;
    }
    
    toast({ title: "Exporting...", description: "Your professional Kingdom report is being generated." });

    const headers = ["First Name", "Last Name", "Gender", "Status", "Won At", "Source", "Phone", "Email", "City", "Country"];
    const body = souls.map(s => [
        s.firstName,
        s.lastName || '',
        s.gender || 'N/A',
        s.status,
        s.wonAt ? format(s.wonAt.toDate(), 'yyyy-MM-dd') : 'N/A',
        s.source,
        s.phone || 'N/A',
        s.email || 'N/A',
        s.locationWon?.city || 'N/A',
        s.locationWon?.country || 'N/A'
    ]);

    if (formatType === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const docObj = new jsPDF({ orientation: 'landscape' });
        
        const logo = PlaceHolderImages.find(img => img.id === 'logo');
        if (logo) {
            try {
                const base64 = await getBase64Logo(logo.imageUrl);
                docObj.addImage(base64, 'PNG', 14, 10, 15, 15);
            } catch (e) {}
        }

        docObj.setFontSize(22);
        docObj.setFont('helvetica', 'bold');
        docObj.text("Testify Global: Soul Winning Harvest", 32, 21);

        docObj.setFontSize(10);
        docObj.setFont('helvetica', 'normal');
        docObj.setTextColor(100);
        docObj.text(`Mobilizer: ${userProfile?.firstName} ${userProfile?.lastName || ''}`, 32, 27);
        docObj.text(`Total Impact: ${souls.length} Lives`, 14, 40);
        docObj.text(`Export Date: ${format(new Date(), 'PPPP')}`, 283, 40, { align: 'right' });

        autoTable(docObj, {
            head: [headers],
            body: body,
            startY: 45,
            styles: { fontSize: 8, font: 'helvetica' },
            headStyles: { 
                fillColor: [249, 116, 22],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [250, 245, 240]
            },
            margin: { top: 45 }
        });

        docObj.save(`testify-harvest-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } else {
        const csv = Papa.unparse({ fields: headers, data: body });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `testify-harvest-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.click();
        URL.revokeObjectURL(url);
    }
    toast({ title: "Report Ready", description: "Download started." });
  };

  const handleExportSingleSoul = useCallback(async (s: Soul, formatType: 'csv' | 'pdf') => {
      const wonAt = safeToDate(s.wonAt);
      const data = [
          ["First Name", s.firstName],
          ["Last Name", s.lastName || ''],
          ["Gender", s.gender || 'N/A'],
          ["Status", s.status],
          ["Date Won", wonAt ? format(wonAt, 'PPP') : 'N/A'],
          ["Source", s.source],
          ["Phone", s.phone || 'N/A'],
          ["Email", s.email || 'N/A'],
          ["Home Church", s.church || 'N/A'],
          ["Location", [s.locationWon?.city, s.locationWon?.country].filter(Boolean).join(', ') || 'N/A']
      ];

      if (formatType === 'pdf') {
          const { jsPDF } = await import('jspdf');
          const { default: autoTable } = await import('jspdf-autotable');
          const docObj = new jsPDF();
          
          const logo = PlaceHolderImages.find(img => img.id === 'logo');
          if (logo) {
            try {
                const base64 = await getBase64Logo(logo.imageUrl);
                docObj.addImage(base64, 'PNG', 14, 10, 12, 12);
            } catch (e) {}
          }

          docObj.setFontSize(18);
          docObj.setFont('helvetica', 'bold');
          docObj.text(`Kingdom Identity Profile`, 28, 19);

          docObj.setFontSize(10);
          docObj.setFont('helvetica', 'normal');
          docObj.setTextColor(100);
          docObj.text(`Full Record: ${s.firstName} ${s.lastName || ''}`, 14, 32);
          docObj.text(`Log Date: ${format(new Date(), 'PPP')}`, 196, 32, { align: 'right' });

          autoTable(docObj, {
              head: [["Attribute", "Information"]],
              body: data,
              startY: 38,
              theme: 'striped',
              headStyles: { fillColor: [249, 116, 22] },
              styles: { cellPadding: 5 }
          });
          
          docObj.save(`record-${s.firstName.toLowerCase()}.pdf`);
      } else {
          const csv = Papa.unparse({ fields: ["Field", "Detail"], data });
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `record-${s.firstName.toLowerCase()}.csv`);
          link.click();
          URL.revokeObjectURL(url);
      }
      toast({ title: "Record Exported" });
  }, [toast, getBase64Logo]);

  const handleDeleteSoul = () => {
    if (!soulToDelete || !user || !firestore) return;
    setIsDeleting(true);

    const soulRef = doc(firestore, `users/${user.uid}/souls`, soulToDelete.id);
    const globalSoulRef = doc(firestore, 'souls', soulToDelete.id);

    const batch = writeBatch(firestore);
    batch.delete(soulRef);
    batch.delete(globalSoulRef);
    
    batch.commit().then(() => {
        toast({ title: "Record Removed" });
        setIsDeleting(false);
        setDeleteSoulId(null);
    }).catch(() => {
        toast({ variant: 'destructive', title: "Delete Failed" });
        setIsDeleting(false);
    });
  };

  const handleAssignGroup = (s: Soul, fellowshipId: string, groupType: 'Fellowship' | 'Association') => {
    if (!user || !firestore) return;

    const soulRef = doc(firestore, `users/${user.uid}/souls`, s.id);
    const globalSoulRef = doc(firestore, 'souls', s.id);
    const selectedGroup = fellowships?.find(f => f.id === fellowshipId);
    
    const updateData: { [key: string]: any } = {
        updatedAt: serverTimestamp(),
    };

    if (fellowshipId === 'none') {
        if (groupType === 'Association') {
            updateData.associationId = deleteField();
            updateData.associationName = deleteField();
        } else {
            updateData.fellowshipId = deleteField();
            updateData.fellowshipName = deleteField();
        }
    } else if (selectedGroup) {
        if (groupType === 'Association') {
            updateData.associationId = selectedGroup.id;
            updateData.associationName = selectedGroup.name;
        } else {
            updateData.fellowshipId = selectedGroup.id;
            updateData.fellowshipName = selectedGroup.name;
        }
    }

    updateDoc(soulRef, updateData).then(() => {
        updateDoc(globalSoulRef, updateData);
        toast({ title: "Community Assignment Updated" });
        setAssignSoulId(null);
    });
  };

  const filteredSouls = useMemo(() => {
    if (!souls) return [];
    if (!searchTerm) return souls;
    
    const term = searchTerm.toLowerCase();
    return souls.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(term) ||
      (s.nickname && s.nickname.toLowerCase().includes(term)) ||
      (s.phone && s.phone.toLowerCase().includes(term))
    );
  }, [souls, searchTerm]);

  return (
    <div className="w-full max-w-7xl mx-auto text-left text-left text-left text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 text-left text-left">
            <div className="lg:col-span-8 space-y-8 pb-32 text-left text-left">
                <header className="px-4 sm:px-0 space-y-6 pt-4 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-left">
                        <div className="space-y-1 text-left">
                            <h1 className="text-2xl sm:text-4xl font-black font-headline tracking-tight uppercase text-left">MY HARVEST</h1>
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60 flex items-center gap-2 text-left">
                                <ClipboardList className="h-4 w-4 text-primary text-left" /> Logged Records
                            </p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap text-left w-full sm:w-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-12 px-4 sm:px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5 shadow-md bg-background flex-1 sm:flex-none text-left">
                                        <Download className="mr-2 h-4 w-4 text-left" /> EXPORT
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl w-48 shadow-xl text-left">
                                    <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-left text-left">Select Format</DropdownMenuLabel>
                                    <DropdownMenuSeparator className="text-left" />
                                    <DropdownMenuItem onSelect={() => handleExportHarvest('csv')} className="rounded-lg py-2.5 text-left text-left">
                                        <Download className="mr-2 h-4 w-4 opacity-40 text-left" /> CSV (Excel)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleExportHarvest('pdf')} className="rounded-lg py-2.5 text-left text-left">
                                        <Download className="mr-2 h-4 w-4 text-primary text-left" /> PDF Report
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button onClick={() => { setLogSoulDefaults({}); setIsLogDialogOpen(true); }} className="rounded-2xl font-black uppercase tracking-widest h-12 shadow-xl shadow-primary/20 flex-1 sm:flex-none text-left">
                                <PlusCircle className="mr-2 h-4 w-4 text-left" /> ADD SOUL
                            </Button>
                        </div>
                    </div>
                </header>

                {soulsWithPhotos.length > 0 && (
                    <div className="px-4 sm:px-0 animate-in fade-in slide-in-from-top-4 duration-700 text-left">
                        <div className="flex items-center justify-between mb-4 px-1 text-left text-left">
                            <div className="flex items-center gap-2 text-left text-left">
                                <ImageIcon className="h-4 w-4 text-primary text-left text-left" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground text-left text-left text-left">GALLERY OF MY SOULS</h3>
                            </div>
                        </div>
                        <div 
                            className="overflow-hidden relative w-full text-left text-left"
                            onMouseEnter={() => setIsGalleryPaused(true)}
                            onMouseLeave={() => setIsGalleryPaused(false)}
                        >
                            <motion.div 
                                className="flex gap-4 w-max text-left text-left"
                                animate={{ x: isGalleryPaused ? undefined : ["0%", "-33.3333333%"] }}
                                transition={{
                                    x: {
                                        duration: 30, 
                                        repeat: Infinity,
                                        ease: "linear",
                                        repeatType: "loop"
                                    }
                                }}
                            >
                                {duplicatedSouls.map((s, idx) => (
                                    <div key={`${s.id}-${idx}`} className="basis-[140px] sm:basis-[180px] shrink-0 text-left text-left text-left text-left">
                                        <Dialog>
                                            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden border-4 border-background shadow-xl cursor-pointer group active:scale-[0.98] transition-all text-left text-left text-left">
                                                    <Image 
                                                        src={s.photoURL!} 
                                                        alt={s.firstName} 
                                                        fill 
                                                        className="object-cover transition-transform group-hover:scale-110 duration-500 text-left text-left text-left" 
                                                        unoptimized 
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent text-left text-left" />
                                                    <div className="absolute bottom-3 left-3 right-3 text-white text-left text-left">
                                                        <p className="font-black text-[10px] sm:text-xs uppercase truncate tracking-tight text-left text-left">
                                                            {s.nickname || s.firstName} {s.age && <span className="opacity-60 ml-1 text-left text-left text-left text-left">({s.age})</span>}
                                                        </p>
                                                        <Badge className={cn(
                                                            "text-white h-3.5 px-1 text-[7px] font-black uppercase border-none mt-1 shadow-sm text-left text-left text-left",
                                                            s.status === 'New' ? "bg-amber-500" : 
                                                            s.status === 'Contacted' ? "bg-blue-500" : 
                                                            "bg-green-500"
                                                        )}>{s.status}</Badge>
                                                    </div>
                                                </div>
                                            </DialogTrigger>
                                            <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-left text-left text-left">
                                                <DialogHeader className="sr-only text-left text-left text-left text-left"><DialogTitle className="text-left text-left text-left text-left">Soul Photo</DialogTitle></DialogHeader>
                                                <div className="relative h-full w-full flex items-center justify-center p-4 text-left text-left">
                                                    <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-left text-left text-left text-left">
                                                        <Image 
                                                            src={s.photoURL!} 
                                                            alt={s.firstName} 
                                                            fill 
                                                            className="object-contain shadow-2xl ring-4 ring-white/10 text-left text-left text-left" 
                                                            unoptimized 
                                                        />
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                )}

                <div className="px-4 sm:px-0 space-y-12 text-left text-left text-left">
                    {/* Age Demographics */}
                    <div className="space-y-4 text-left text-left text-left text-left">
                        <div className="flex items-center gap-3 text-left text-left text-left">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20 text-left text-left text-left">
                                <BarChart3 className="h-5 w-5 text-primary text-left text-left text-left" />
                            </div>
                            <div className="min-w-0 text-left text-left text-left text-left text-left">
                                <h2 className="text-xl font-black font-headline uppercase tracking-tight leading-tight text-left text-left text-left text-left">DEMOGRAPHICS</h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 text-left text-left text-left text-left text-left">Age Analysis</p>
                            </div>
                        </div>
                        <Card className="rounded-[2rem] bg-muted/20 border-none shadow-inner overflow-hidden text-left text-left text-left text-left text-left text-left text-left">
                            <CardContent className="p-6 sm:p-8 space-y-6 text-left text-left text-left">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left text-left text-left text-left">
                                    {[
                                        { label: 'Children (0-12)', count: ageGroups.children.count, color: 'bg-blue-500', icon: Sparkles },
                                        { label: 'Teens (13-19)', count: ageGroups.teens.count, color: 'bg-green-500', icon: Zap },
                                        { label: 'Young Adults (20-33)', count: ageGroups.youngAdults.count, color: 'bg-primary', icon: Flame },
                                        { label: 'Adults (34-55)', count: ageGroups.adults.count, color: 'bg-indigo-500', icon: Target },
                                        { label: 'Seniors (56+)', count: ageGroups.seniors.count, color: 'bg-purple-500', icon: Award },
                                        { label: 'Age Not Set', count: ageGroups.unknown.count, color: 'bg-slate-400', icon: HelpCircle },
                                    ].map(group => {
                                        const percent = totalSoulsCount > 0 ? (group.count / totalSoulsCount) * 100 : 0;
                                        const Icon = group.icon;

                                        return (
                                            <div 
                                                key={group.label} 
                                                className={cn(
                                                    "space-y-3 p-4 rounded-2xl bg-background shadow-sm border group transition-all cursor-pointer relative overflow-hidden text-left text-left text-left",
                                                    "hover:border-primary/20"
                                                )}
                                                onClick={() => setSelectedFilterGroup({ type: 'age', value: group.label })}
                                            >
                                                <div className="flex items-center justify-between text-left text-left text-left">
                                                    <div className="h-8 w-8 rounded-xl bg-muted/5 flex items-center justify-center transition-colors group-hover:bg-primary/10 text-left text-left text-left text-left text-left text-left">
                                                        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary text-left text-left text-left text-left text-left text-left text-left" />
                                                    </div>
                                                    <span className="font-black text-lg text-primary tracking-tighter text-left text-left text-left">{group.count}</span>
                                                </div>
                                                <div className="space-y-1 text-left text-left text-left text-left">
                                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground text-left text-left text-left text-left text-left">
                                                        <span className="text-left text-left text-left text-left">{group.label}</span>
                                                        <span className="text-left text-left text-left text-left">{Math.round(percent)}%</span>
                                                    </div>
                                                    <Progress value={percent} className="h-1.5 bg-muted text-left text-left text-left text-left" indicatorClassName={group.color} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Gender Demographics */}
                    <div className="space-y-4 text-left text-left text-left text-left">
                        <div className="flex items-center gap-3 text-left text-left text-left text-left">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20 text-left text-left text-left text-left">
                                <Users className="h-5 w-5 text-primary text-left text-left text-left text-left" />
                            </div>
                            <div className="min-w-0 text-left text-left text-left text-left text-left text-left">
                                <h2 className="text-xl font-black font-headline uppercase tracking-tight leading-tight text-left text-left text-left text-left text-left">GENDER BALANCE</h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 text-left text-left text-left text-left text-left text-left">Kingdom Workforce Diversity</p>
                            </div>
                        </div>
                        <Card className="rounded-[2rem] bg-muted/20 border-none shadow-inner overflow-hidden text-left text-left text-left text-left text-left text-left">
                            <CardContent className="p-6 sm:p-8 text-left text-left text-left text-left text-left text-left text-left">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left text-left text-left text-left text-left">
                                    {[
                                        { label: 'Male', count: genderStats.male.count, color: 'bg-blue-600' },
                                        { label: 'Female', count: genderStats.female.count, color: 'bg-rose-500' },
                                        { label: 'Not Assigned', count: genderStats.unassigned.count, color: 'bg-slate-400' },
                                    ].map(stat => {
                                        const percent = genderStats.total > 0 ? (stat.count / genderStats.total) * 100 : 0;
                                        return (
                                            <div 
                                              key={stat.label} 
                                              className="space-y-3 p-6 rounded-2xl bg-background shadow-sm border text-left cursor-pointer hover:border-primary/20 transition-all active:scale-[0.98] text-left text-left text-left text-left text-left text-left"
                                              onClick={() => setSelectedFilterGroup({ type: 'gender', value: stat.label })}
                                            >
                                                <div className="flex justify-between items-baseline text-left text-left text-left text-left text-left text-left">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left text-left text-left text-left text-left text-left">{stat.label}</p>
                                                    <span className="text-2xl font-black text-primary tracking-tighter text-left text-left text-left text-left text-left">{stat.count}</span>
                                                </div>
                                                <div className="space-y-1.5 text-left text-left text-left text-left text-left text-left">
                                                    <Progress value={percent} className="h-2 bg-muted text-left text-left text-left text-left text-left text-left" indicatorClassName={stat.color} />
                                                    <p className="text-right text-[9px] font-black text-muted-foreground/60 uppercase text-left text-left text-left text-left text-left">{Math.round(percent)}% OF HARVEST</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Marital Demographics */}
                    <div className="space-y-4 text-left text-left text-left text-left">
                        <div className="flex items-center gap-3 text-left text-left text-left text-left">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20 text-left text-left text-left text-left">
                                <Heart className="h-5 w-5 text-primary text-left text-left text-left text-left" />
                            </div>
                            <div className="min-w-0 text-left text-left text-left text-left text-left text-left">
                                <h2 className="text-xl font-black font-headline uppercase tracking-tight leading-tight text-left text-left text-left text-left text-left">MARITAL DEMOGRAPHICS</h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 text-left text-left text-left text-left text-left text-left">Family & Status Insights</p>
                            </div>
                        </div>
                        <Card className="rounded-[2rem] bg-muted/20 border-none shadow-inner overflow-hidden text-left text-left text-left text-left text-left text-left">
                            <CardContent className="p-6 sm:p-8 text-left text-left text-left text-left text-left text-left text-left">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left text-left text-left text-left text-left">
                                    {[
                                        { label: 'Families', count: maritalStats.married.count, color: 'bg-emerald-500', icon: Target },
                                        { label: 'Singles', count: maritalStats.single.count, color: 'bg-primary', icon: Sparkles },
                                        { label: 'Divorced', count: maritalStats.divorced.count, color: 'bg-slate-500', icon: HelpCircle },
                                        { label: 'Widowers', count: maritalStats.widowed.count, color: 'bg-indigo-600', icon: Award },
                                    ].map(stat => {
                                        const percent = totalSoulsCount > 0 ? (stat.count / totalSoulsCount) * 100 : 0;
                                        return (
                                            <div 
                                              key={stat.label} 
                                              className="space-y-3 p-5 rounded-2xl bg-background shadow-sm border text-left cursor-pointer hover:border-primary/20 transition-all active:scale-[0.98] text-left text-left text-left text-left text-left text-left"
                                              onClick={() => setSelectedFilterGroup({ type: 'marital', value: stat.label })}
                                            >
                                                <div className="flex justify-between items-center text-left text-left text-left text-left text-left text-left">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-left text-left text-left text-left text-left text-left">{stat.label}</p>
                                                    <span className="text-xl font-black text-primary tracking-tighter text-left text-left text-left text-left text-left">{stat.count}</span>
                                                </div>
                                                <div className="space-y-1.5 text-left text-left text-left text-left text-left text-left">
                                                    <Progress value={percent} className="h-1.5 bg-muted text-left text-left text-left text-left text-left text-left" indicatorClassName={stat.color} />
                                                    <p className="text-[8px] font-black text-muted-foreground/40 uppercase text-left text-left text-left text-left text-left">{Math.round(percent)}%</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="px-4 sm:px-0 text-left text-left text-left">
                    <RelationshipCircleTracker 
                        souls={souls || []}
                        campaigns={campaigns || []}
                        fellowships={fellowships || []}
                        className="rounded-3xl text-left text-left"
                    />
                </div>

                <div className="px-4 sm:px-0 text-left text-left">
                    <SoulsImportTemplateCard />
                </div>

                <div className="-mx-4 sm:mx-0 text-left text-left">
                    <SoulsWonTable 
                        souls={filteredSouls || []} 
                        loading={loading}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onFollowUp={handleOpenFollowUp}
                        onViewHistory={handleOpenHistory}
                        onExportSingle={handleExportSingleSoul}
                        onOpenAssignDialog={handleOpenAssign}
                        onEdit={handleOpenEdit}
                        onDelete={handleOpenDelete}
                        onAssess={handleOpenAssessment}
                        onAddChild={handleAddChild}
                    />
                </div>
            </div>

            <div className="lg:col-span-4 text-left text-left text-left text-left text-left text-left text-left text-left">
                <FeedSidebar mode="harvest" />
            </div>
        </div>

        {mounted && (
            isMobile ? (
                <Drawer open={!!selectedFilterGroup} onOpenChange={(open) => !open && setSelectedFilterGroup(null)}>
                    <DrawerContent className="h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left">
                        <div className="p-4 sm:p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left text-left text-left text-left text-left">
                            <div className="flex items-center gap-2 mb-2 text-left text-left text-left text-left text-left text-left text-left text-left">
                                <BarChart3 className="h-4 w-4 text-primary text-left text-left text-left text-left text-left text-left" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left text-left text-left text-left text-left text-left text-left">Harvest Demographic</span>
                            </div>
                            <DrawerHeader className="text-left flex-shrink-0 text-left text-left text-left text-left text-left text-left text-left">
                                <DrawerTitle className="text-2xl font-black font-headline uppercase leading-tight text-left text-left text-left text-left text-left">{selectedFilterGroup?.value} Directory</DrawerTitle>
                                <DrawerDescription className="text-sm font-medium mt-1 text-left text-left text-left text-left text-left text-left text-left text-left text-left">Converts within the {selectedFilterGroup?.value?.toLowerCase()} demographic.</DrawerDescription>
                            </DrawerHeader>
                        </div>
                        <ScrollArea className="flex-grow text-left text-left text-left text-left text-left text-left">
                            <div className="p-4 sm:p-8 text-left text-left text-left text-left text-left text-left text-left text-left">
                                <FilteredSoulList 
                                  souls={activeFilteredSouls} 
                                  allSouls={souls || []}
                                  onSelectSoul={(s) => {
                                    setSelectedFilterGroup(null);
                                    setSelectedId(s.id);
                                  }} 
                                  onAddChild={handleAddChild}
                                />
                            </div>
                        </ScrollArea>
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={!!selectedFilterGroup} onOpenChange={(open) => !open && setSelectedFilterGroup(null)}>
                    <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left text-left text-left text-left text-left text-left text-left">
                        <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                            <div className="flex items-center gap-2 mb-2 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                <BarChart3 className="h-4 w-4 text-primary text-left text-left text-left text-left text-left text-left text-left text-left" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left text-left text-left text-left text-left text-left text-left text-left">Demographic View</span>
                            </div>
                            <DialogHeader className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{selectedFilterGroup?.value} Directory</DialogTitle>
                                <DialogDescription className="text-sm font-medium text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Viewing all souls within this demographic group.</DialogDescription>
                            </DialogHeader>
                        </div>
                        <ScrollArea className="max-h-[60vh] text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                            <div className="p-4 sm:p-8 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                <FilteredSoulList 
                                  souls={activeFilteredSouls} 
                                  allSouls={souls || []}
                                  onSelectSoul={(s) => {
                                    setSelectedFilterGroup(null);
                                    setSelectedId(s.id);
                                  }} 
                                  onAddChild={handleAddChild}
                                />
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )
        )}

        <LogFollowUpDialog 
            soul={soulForFollowUp} 
            isOpen={!!followUpSoulId} 
            onOpenChange={(isOpen) => !isOpen && setFollowUpSoulId(null)} 
            onFollowUpLogged={() => setFollowUpSoulId(null)} 
            userProfile={userProfile}
        />
        <ViewHistoryDialog soul={soulForHistory} isOpen={!!historySoulId} onOpenChange={(isOpen) => !isOpen && setHistorySoulId(null)} />
        <AssignFellowshipDialog soul={soulToAssign} fellowships={fellowships || []} isOpen={!!assignSoulId} onOpenChange={(isOpen) => !isOpen && setAssignSoulId(null)} onAssignGroup={handleAssignGroup} />
        <SoulAssessmentDialog soul={soulToAssess} isOpen={!!assessmentSoulId} onOpenChange={(isOpen) => !isOpen && setAssessmentSoulId(null)} />

        <AlertDialog open={!!deleteSoulId} onOpenChange={(open) => !open && setDeleteSoulId(null)}>
            <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl text-left text-left text-left text-left text-left text-left text-left">
                <AlertDialogHeader className="text-left text-left text-left text-left text-left text-left text-left">
                    <AlertDialogTitle className="text-2xl font-black font-headline leading-tight text-left text-left text-left text-left text-left text-left text-left text-left text-left">Delete Record?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium leading-relaxed text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                        This will permanently remove the record from your Kingdom journal. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-6 text-left text-left text-left text-left text-left text-left text-left">
                    <AlertDialogCancel disabled={isDeleting} className="rounded-2xl h-12 font-bold text-left text-left text-left text-left text-left text-left">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSoul} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold text-left text-left text-left text-left text-left text-left">
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left text-left text-left text-left text-left" />}
                        Confirm Removal
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {mounted && (
            isMobile ? (
                <>
                    <Drawer open={isLogDialogOpen} onOpenChange={(open) => { setIsLogDialogOpen(open); if(!open) setLogSoulDefaults({}); }}>
                        <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                <DrawerHeader className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><DrawerTitle className="text-2xl font-black font-headline text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Add New Soul</DrawerTitle><DrawerDescription className="text-sm text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Record a new life won for Christ.</DrawerDescription></DrawerHeader>
                            </div>
                            <ScrollArea className="flex-grow p-8 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                <LogSoulForm 
                                    onSoulLogged={() => { setIsLogDialogOpen(false); setLogSoulDefaults({}); }} 
                                    fellowships={fellowships || []} 
                                    campaigns={campaigns || []} 
                                    {...logSoulDefaults}
                                />
                            </ScrollArea>
                        </DrawerContent>
                    </Drawer>
                    <Drawer open={!!editSoulId} onOpenChange={(open) => !open && setEditSoulId(null)}>
                        <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                <DrawerHeader className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><DrawerTitle className="text-2xl font-black font-headline text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Edit Record</DrawerTitle><DrawerDescription className="text-sm text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Update soul identity and mission details.</DrawerDescription></DrawerHeader>
                            </div>
                            <ScrollArea className="flex-grow p-8 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                {soulToEdit && <EditSoulForm soul={soulToEdit} onSoulUpdated={() => setEditSoulId(null)} fellowships={fellowships || []} campaigns={campaigns || []} />}
                            </ScrollArea>
                        </DrawerContent>
                    </Drawer>
                </>
            ) : (
                <>
                    <Dialog open={isLogDialogOpen} onOpenChange={(open) => { setIsLogDialogOpen(open); if(!open) setLogSoulDefaults({}); }}>
                        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                <DialogHeader className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                    <DialogTitle className="text-2xl font-bold font-headline text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Add New Soul</DialogTitle>
                                    <DialogDescription className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Record a new life won for Christ.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="max-h-[75vh] p-8 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                <LogSoulForm 
                                    onSoulLogged={() => { setIsLogDialogOpen(false); setLogSoulDefaults({}); }} 
                                    fellowships={fellowships || []} 
                                    campaigns={campaigns || []} 
                                    {...logSoulDefaults}
                                />
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={!!editSoulId} onOpenChange={(open) => !open && setEditSoulId(null)}>
                        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                <DialogHeader className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                    <DialogTitle className="text-2xl font-black font-headline text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Edit Record</DialogTitle>
                                    <DialogDescription className="text-sm text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Update soul identity and mission details.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="max-h-[75vh] p-8 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                {soulToEdit && <EditSoulForm soul={soulToEdit} onSoulUpdated={() => setEditSoulId(null)} fellowships={fellowships || []} campaigns={campaigns || []} />}
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                </>
            )
        )}
    </div>
  );
}

export default SoulsWonPageContent;
