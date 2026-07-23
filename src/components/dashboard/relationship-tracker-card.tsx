'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { doc, serverTimestamp, writeBatch, arrayUnion, query, collection, orderBy, getDocs, where, addDoc, getDoc, updateDoc } from 'firebase/firestore';
import type { UserProfile, Soul, BibleChapterOutput, Chat, SoulRelationship } from '@/lib/types';
import { isToday, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Heart, 
  MessageSquare, 
  Flame, 
  Users, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  Info, 
  BookOpen,
  Home,
  Phone,
  Calendar,
  Utensils,
  Gift,
  UserPlus,
  Search,
  PlusCircle,
  X,
  Send,
  BookMarked,
  ChevronRight,
  HandHeart,
  Share2,
  Target,
  HeartHandshake
} from 'lucide-react';
import { cn, safeToDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { actionItems, prayerTemplates, kingdomVerses } from '@/lib/follow-up-data';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { getBibleChapter } from "@/ai/flows/get-bible-chapter-flow";
import { bibleData } from "@/lib/bible-data";
import { useRouter } from 'next/navigation';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
    
    const selectedTexts = chapterContent.verses
      .filter(v => selectedVerses.includes(v.verse))
      .map(v => v.text)
      .join(' ');
      
    const reference = `${chapterContent.book} ${chapterContent.chapter}:${selectedVerses.join(', ')}`;
    const link = `${window.location.origin}/dashboard/bible?book=${encodeURIComponent(chapterContent.book)}&chapter=${chapterContent.chapter}`;
    
    onSelectVerse(constructInvitationMessage(selectedTexts, reference, link));
  };

  const renderHub = (
    <div className="space-y-8 sm:space-y-10 text-left">
      <div className="space-y-4">
        <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-muted-foreground opacity-50" />
            <Input 
                placeholder="Search Bible (e.g. John 3:16)..." 
                value={bibleSearch}
                onChange={e => setBibleSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="h-10 sm:h-14 pl-10 sm:pl-14 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-xs sm:text-lg"
            />
            <Button 
                onClick={handleSearch} 
                disabled={isSearching || !bibleSearch.trim()}
                variant="ghost"
                size="sm"
                className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 h-7 sm:h-10 px-3 sm:px-6 rounded-xl font-black text-[9px] sm:text-xs uppercase text-primary"
            >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'SEARCH'}
            </Button>
        </div>

        {searchResults.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-2">
                {searchResults.map((res, idx) => (
                    <Button 
                        key={idx}
                        variant="outline"
                        className="w-full h-auto p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border-primary/20 bg-primary/5 flex flex-col items-start gap-3 text-left hover:bg-primary/10 transition-all border-2 border-dashed"
                        onClick={() => onSelectVerse(constructInvitationMessage(res.text, res.reference, `${window.location.origin}/dashboard/bible`))}
                    >
                        <div className="flex items-center justify-between w-full">
                            <span className="font-black text-[9px] sm:text-xs uppercase tracking-widest text-primary">{res.reference}</span>
                            <Send className="h-3.5 w-3.5 sm:h-4 w-4 text-primary opacity-40" />
                        </div>
                        <p className="text-xs sm:text-base text-muted-foreground leading-relaxed italic line-clamp-4">"{res.text.trim()}"</p>
                    </Button>
                ))}
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <Button onClick={() => setView('books')} variant="outline" className="h-24 sm:h-32 rounded-2xl sm:rounded-[2rem] gap-2 sm:gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group transition-all flex flex-col items-center justify-center p-4">
            <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 mb-1 group-hover:scale-110 transition-transform" />
            <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest">Browse Bible</span>
        </Button>
        <Button variant="outline" asChild className="h-24 sm:h-32 rounded-2xl sm:rounded-[2rem] gap-2 sm:gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group transition-all flex flex-col items-center justify-center p-4">
            <Link href="/dashboard/bible">
                <BookMarked className="h-6 w-6 sm:h-8 sm:w-8 mb-1 group-hover:scale-110 transition-transform" />
                <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest">Open Reader</span>
            </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Kingdom Essential Scriptures</Label>
            <Badge variant="outline" className="h-5 px-2 text-[8px] font-bold text-primary border-primary/20 bg-primary/5 uppercase">Top Weapons</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {kingdomVerses.map((v, idx) => (
            <Button 
              key={idx} 
              variant="ghost" 
              className="w-full justify-start h-auto py-4 sm:py-6 px-4 sm:px-6 rounded-2xl sm:rounded-[2rem] hover:bg-primary/5 group border border-transparent hover:border-primary/10 transition-all text-left block relative overflow-hidden bg-muted/5 shadow-sm"
              onClick={() => onSelectVerse(constructInvitationMessage(v.text, v.reference, `${window.location.origin}/dashboard/bible`))}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-primary">{v.reference}</span>
                  <PlusCircle className="h-3.5 w-3.5 sm:h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity" />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic line-clamp-2">&ldquo;{v.text}&rdquo;</p>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderBooks = (
    <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
      {bibleData.map(book => (
        <Button key={book.name} variant="outline" className="h-12 sm:h-14 rounded-xl font-bold uppercase text-[9px] sm:text-xs" onClick={() => handleSelectBook(book.name)}>
          {book.name}
        </Button>
      ))}
    </div>
  );

  const renderChapters = (
    <div className="p-2 grid grid-cols-5 sm:grid-cols-8 gap-2">
       {selectedBook && bibleData.find(b => b.name === selectedBook)?.chapters.map(ch => (
         <Button key={ch.chapter} variant="outline" className="h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-lg font-black text-xs sm:text-sm" onClick={() => handleSelectChapter(ch.chapter)}>
           {ch.chapter}
         </Button>
       ))}
    </div>
  );

  const renderVerses = (
    <div className="space-y-4 pb-12 text-left">
       <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6">
          <p className="text-[10px] font-black uppercase text-primary mb-1">SELECTED FOR SHARING</p>
          <p className="text-xs font-bold text-muted-foreground">
            {selectedVerses.length > 0 
              ? `${selectedBook} ${selectedChapter}:${selectedVerses.join(', ')}`
              : 'Select verses below to share...'}
          </p>
       </div>
       <div className="space-y-1 font-serif">
         {loadingVerses ? (
           <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
         ) : chapterContent?.verses.map(v => (
           <div 
             key={v.verse} 
             className={cn(
               "p-3 rounded-xl transition-all cursor-pointer border-2 text-left",
               selectedVerses.includes(v.verse) ? "bg-primary/10 border-primary/40" : "bg-transparent border-transparent hover:bg-muted/50"
             )}
             onClick={() => toggleVerse(v.verse)}
            >
              <sup className="text-[10px] font-black mr-2 opacity-40">{v.verse}</sup>
              <span className="text-sm leading-relaxed">{v.text}</span>
           </div>
         ))}
       </div>
    </div>
  );

  const title = view === 'hub' ? "Share the Word" : view === 'books' ? "Select Book" : view === 'chapters' ? `${selectedBook}: Select Chapter` : `${selectedBook} ${selectedChapter}`;
  const desc = view === 'hub' ? `Equip ${soul?.firstName} with the living Word.` : `Browsing ${selectedBook || 'Bible'} for the harvest.`;

  const header = (
    <div className="p-6 sm:p-8 border-b bg-muted/10 shrink-0 text-left">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-2">
            {view !== 'hub' && (
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full -ml-2" onClick={() => setView(view === 'verses' ? 'chapters' : view === 'chapters' ? 'books' : 'hub')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            )}
            <Target className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Kingdom Study</span>
          </div>
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight">{title}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm font-medium">{desc}</DialogDescription>
          </DialogHeader>
        </div>
        {view !== 'hub' && (
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/40" onClick={() => onOpenChange(false)}>
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
        )}
      </div>
    </div>
  );

  const body = (
    <ScrollArea className="flex-grow min-h-[300px]">
        <div className="p-4 sm:p-10">
            {view === 'hub' && renderHub}
            {view === 'books' && renderBooks}
            {view === 'chapters' && renderChapters}
            {view === 'verses' && renderVerses}
        </div>
    </ScrollArea>
  );

  const footer = view === 'verses' && (
    <div className="p-6 border-t bg-muted/5 flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={() => setSelectedVerses([])} className="rounded-xl h-12 flex-1 font-bold">Clear Selection</Button>
        <Button 
          onClick={handleShareSelected} 
          disabled={selectedVerses.length === 0}
          className="rounded-xl h-12 flex-1 font-black uppercase tracking-widest shadow-lg shadow-primary/20"
        >
          PREPARE SHARE ({selectedVerses.length})
        </Button>
    </div>
  );

  if (isMobile) {
      return (
          <Sheet open={isOpen} onOpenChange={onOpenChange}>
              <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                  {header}
                  {body}
                  {footer}
              </SheetContent>
          </Sheet>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col">
        {header}
        {body}
        {footer || (
            <div className="p-6 border-t bg-muted/5 flex justify-end shrink-0">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-xs">Close Hub</Button>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SoulSelectionDialog({ 
  isOpen, 
  onOpenChange, 
  souls, 
  onSelect,
  actionLabel,
  isLoading
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  souls: Soul[] | null; 
  onSelect: (soul: Soul) => void;
  actionLabel: string;
  isLoading: boolean;
}) {
    const [search, setSearch] = useState('');
    const isMobile = useIsMobile();
    const filteredSouls = useMemo(() => {
        if (!souls) return [];
        if (!search) return souls;
        const term = search.toLowerCase();
        return souls.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(term));
    }, [souls, search]);

    const body = (
        <div className="p-6 space-y-6 text-left">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                <Input 
                    placeholder="Search by name..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)}
                    className="rounded-2xl h-12 pl-10 bg-muted/20 border-none shadow-inner text-base"
                />
            </div>
            <ScrollArea className={cn("border rounded-3xl bg-muted/5", isMobile ? "h-[50vh]" : "h-[40vh]")}>
                <div className="p-2 space-y-1.5">
                    {filteredSouls.length > 0 ? (
                        filteredSouls.map(soul => {
                            const lastLog = (soul.followUpLog || []).sort((a,b) => (safeToDate(b.date)?.getTime() || 0) - (safeToDate(a.date)?.getTime() || 0))[0];
                            const reachedToday = lastLog && isToday(safeToDate(lastLog.date)!);

                            return (
                                <Button 
                                    key={soul.id} 
                                    variant="ghost" 
                                    className="w-full justify-start h-16 px-4 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all gap-4 group"
                                    onClick={() => onSelect(soul)}
                                    disabled={isLoading}
                                >
                                    <Avatar className="h-10 w-10 border-2 group-hover:border-primary/20 transition-colors shadow-sm">
                                        <AvatarFallback className="font-black bg-primary/5">{soul.firstName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="text-left min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-sm uppercase tracking-tight">{soul.firstName} {soul.lastName}</p>
                                            {reachedToday && (
                                                <Badge variant="secondary" className="h-4 px-1.5 text-[7px] font-black bg-green-500/10 text-green-600 border-none">
                                                    Reached Today
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">{soul.status}</p>
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-muted/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <PlusCircle className="h-4 w-4" />
                                    </div>
                                </Button>
                            );
                        })
                    ) : (
                        <div className="text-center py-16 px-8 space-y-3">
                            <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto">
                                <Users className="h-6 w-6 text-muted-foreground opacity-20" />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                                {search ? "No matches found" : "Log your first soul to begin tracking"}
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={onOpenChange}>
                <SheetContent side="bottom" className="h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    <div className="p-8 border-b bg-muted/10 shrink-0 flex-shrink-0">
                        <SheetHeader className="text-left flex-shrink-0">
                            <SheetTitle className="text-2xl font-black font-headline tracking-tight uppercase">Who did you {actionLabel.toLowerCase()}?</SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1">Select a convert to link this action.</SheetDescription>
                        </SheetHeader>
                    </div>
                    {body}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
                <div className="p-8 border-b bg-muted/10">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase">Who did you {actionLabel.toLowerCase()}?</DialogTitle>
                        <DialogDescription className="text-sm font-medium">Select a convert to link this action to their record.</DialogDescription>
                    </DialogHeader>
                </div>
                {body}
            </DialogContent>
        </Dialog>
    );
}

export function RelationshipTrackerCard() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [isSoulDialogOpen, setIsSoulDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  const [activeSoul, setActiveSoul] = useState<Soul | null>(null);
  const [isStudyWordOpen, setIsStudyWordOpen] = useState(false);
  const [isCommChannelDialogOpen, setIsCommChannelDialogOpen] = React.useState(false);
  const [isHelpNeedDialogOpen, setIsHelpNeedDialogOpen] = React.useState(false);
  const [isShareTargetDialogOpen, setIsShareTargetDialogOpen] = React.useState(false);
  const [isPartnerSelectionDialogOpen, setIsPartnerSelectionDialogOpen] = React.useState(false);
  const [isPrayerCustomizationOpen, setIsPrayerCustomizationOpen] = React.useState(false);
  const [customPrayerText, setCustomPrayerText] = useState('');
  const [clickedActionId, setClickedActionId] = useState<string | null>(null);

  const { userProfile, loading: profileLoading } = useUserProfile();

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'souls'), orderBy("wonAt", "desc"));
  }, [user?.uid, firestore]);
  const { data: souls, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  useEffect(() => {
    if (userProfile?.dailyDiscipline) {
      const lastUpdatedDate = safeToDate(userProfile.dailyDiscipline.lastUpdated);
      if (lastUpdatedDate && isToday(lastUpdatedDate)) {
        setCompletedToday(userProfile.dailyDiscipline.completed || []);
      } else {
        setCompletedToday([]);
      }
    }
  }, [userProfile]);

  const handleActionClick = (id: string) => {
      setSelectedActionId(id);
      setIsSoulDialogOpen(true);
  };

  const resolveTemplate = useCallback((template: string, targetSoul: Soul) => {
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

  const finalizeRelationalLog = async (soul: Soul, noteAddendum: string = '') => {
    if (!user || !firestore || !selectedActionId) return;
    
    setTogglingId(selectedActionId);

    const action = actionItems.find(a => a.id === selectedActionId);
    if (!action) return;

    const today = new Date();
    const dateString = format(today, 'yyyy-MM-dd');
    const batch = writeBatch(firestore);

    const actionToDisciplineMap: Record<string, string> = {
        'prayed_together': 'pray',
        'studied_bible': 'read_bible',
        'visited_home': 'attend_church',
    };

    const broadDiscipline = actionToDisciplineMap[selectedActionId];

    const wasCompleted = completedToday.includes(selectedActionId);
    const newCompleted = [...completedToday];
    if (!wasCompleted) newCompleted.push(selectedActionId);
    if (broadDiscipline && !newCompleted.includes(broadDiscipline)) newCompleted.push(broadDiscipline);

    const userRef = doc(firestore, 'users', user.uid);
    batch.update(userRef, {
      'dailyDiscipline.completed': newCompleted,
      'dailyDiscipline.lastUpdated': serverTimestamp(),
    });

    const historyRef = doc(firestore, 'users', user.uid, 'disciplineHistory', dateString);
    batch.set(historyRef, {
        completed: newCompleted,
        date: serverTimestamp()
    }, { merge: true });

    const memberName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || user.displayName || 'Member';
    const logEntry = {
        date: new Date(), 
        note: `Logged via Kingdom Connections: ${action.label}${noteAddendum ? ` - ${noteAddendum}` : ''}`,
        actions: [selectedActionId],
        memberId: user.uid,
        memberName: memberName,
    };

    const soulUserRef = doc(firestore, 'users', user.uid, 'souls', soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);
    
    batch.update(soulUserRef, {
        followUpLog: arrayUnion(logEntry),
        lastUpdatedAt: serverTimestamp(),
    });
    batch.update(globalSoulRef, {
        followUpLog: arrayUnion(logEntry),
        lastUpdatedAt: serverTimestamp(),
    });

    try {
        await batch.commit();
        setCompletedToday(newCompleted);
        toast({ 
            title: 'Kingdom Impact Saved!', 
            description: `Logged '${action.label}' for ${soul.firstName}.` 
        });
    } catch (err: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `BATCH_WRITE:RELATION_TRACKER:${soul.id}`,
            operation: 'write',
        }, user));
    } finally {
        setTogglingId(null);
        setSelectedActionId(null);
    }
  };

  const handleSoulSelected = (soul: Soul) => {
    if (!user || !selectedActionId) return;

    setActiveSoul(soul);
    setClickedActionId(selectedActionId);

    if (selectedActionId === 'studied_bible') {
        setIsSoulDialogOpen(false);
        setIsStudyWordOpen(true);
        return;
    }

    if (selectedActionId === 'prayed_together') {
        setIsSoulDialogOpen(false);
        setCustomPrayerText(resolveTemplate(prayerTemplates[0].text, soul));
        setIsPrayerCustomizationOpen(true);
        return;
    }

    if (selectedActionId === 'text_message') {
        setIsSoulDialogOpen(false);
        setIsCommChannelDialogOpen(true);
        return;
    }

    if (selectedActionId === 'helped_with_need') {
        setIsSoulDialogOpen(false);
        setIsHelpNeedDialogOpen(true);
        return;
    }

    if (selectedActionId === 'introduced_friend') {
        setIsSoulDialogOpen(false);
        setIsShareTargetDialogOpen(true);
        return;
    }

    if (selectedActionId === 'shared_meal' || selectedActionId === 'gave_gift') {
        setIsSoulDialogOpen(false);
        const provisionKey = `testify_pending_provisions_${user.uid}`;
        const stored = localStorage.getItem(provisionKey);
        let current = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(current)) current = [];
        if (!current.some((p: any) => p.soulId === soul.id && p.actionId === selectedActionId)) {
            current.push({ soulId: soul.id, soulName: `${soul.firstName} ${soul.lastName}`, actionId: selectedActionId, timestamp: Date.now() });
            localStorage.setItem(provisionKey, JSON.stringify(current));
            window.dispatchEvent(new Event('testify_pending_action_update'));
        }
        finalizeRelationalLog(soul, 'Initiated provision offering');
        const mPath = selectedActionId === 'shared_meal' ? '/dashboard/marketplace' : '/dashboard/marketplace/gifts';
        router.push(`${mPath}?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}&actionId=${selectedActionId}`);
        return;
    }

    if (selectedActionId === 'phone_call' && soul.phone) {
        setIsSoulDialogOpen(false);
        finalizeRelationalLog(soul, 'Dialer initiated');
        window.location.href = `tel:${soul.phone}`;
        return;
    }

    if (selectedActionId === 'visited_home') {
        setIsSoulDialogOpen(false);
        const loc = soul.locationWon;
        const address = loc ? [loc.street, loc.city, loc.state, loc.country].filter(Boolean).join(', ') : null;
        if (address) {
            finalizeRelationalLog(soul, `Navigated to venue: ${address}`);
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
        } else {
            toast({ variant: 'destructive', title: 'Location Undefined', description: 'Please set an address for this soul.' });
        }
        return;
    }

    if (selectedActionId === 'invited_to_event') {
        setIsSoulDialogOpen(false);
        finalizeRelationalLog(soul, 'Redirected to Events Hub');
        router.push('/dashboard/events');
        return;
    }

    setIsSoulDialogOpen(false);
    finalizeRelationalLog(soul);
  };

  const handleVerseSelected = (verseMessage: string) => {
    setCustomPrayerText(verseMessage);
    setIsStudyWordOpen(false);
    setIsCommChannelDialogOpen(true);
  };

  const handleCommChoice = (channel: 'whatsapp' | 'sms') => {
      if (!activeSoul?.phone || !clickedActionId) return;
      const cleanPhone = activeSoul.phone.replace(/\+/g, '').replace(/\D/g, '');
      const messageText = encodeURIComponent(customPrayerText || `Hi ${activeSoul.firstName}, I'm thinking of you today and praying for you. God bless you!`);
      
      if (channel === 'whatsapp') {
          window.open(`https://wa.me/${cleanPhone}?text=${messageText}`, '_blank');
      } else {
          window.location.href = `sms:${activeSoul.phone}?body=${messageText}`;
      }
      
      finalizeRelationalLog(activeSoul, customPrayerText);
      setIsCommChannelDialogOpen(false);
      setCustomPrayerText('');
  };

  const handleHelpNeedConfirm = (note: string) => {
      if (!activeSoul) return;
      finalizeRelationalLog(activeSoul, `Assistance details: ${note}`);
      setIsHelpNeedDialogOpen(false);
  };

  const handleShareToWhatsApp = () => {
    if (!activeSoul) return;
    const wonAt = safeToDate(activeSoul.wonAt);
    const details = `Here is a soul I'm following up with on Testify:\nName: ${activeSoul.firstName} ${activeSoul.lastName}\nStatus: ${activeSoul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\nLet's keep them in our prayers.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(details)}`, '_blank');
    finalizeRelationalLog(activeSoul, 'Shared via WhatsApp External');
    setIsShareTargetDialogOpen(false);
  };

  const handleShareToPartner = async (partner: UserProfile['accountabilityPartners'][0]) => {
      if (!user || !firestore || !activeSoul || !userProfile) return;
      const wonAt = safeToDate(activeSoul.wonAt);
      const text = `SHARING SOUL DATA:\nName: ${activeSoul.firstName} ${activeSoul.lastName}\nStatus: ${activeSoul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\nRelationship: ${activeSoul.relationship || 'Outreach'}\nLet's keep them in our prayers and coordinate follow-up.`;

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
                      [user.uid]: { firstName: userProfile.firstName, lastName: userProfile.lastName, photoURL: userProfile.photoURL || '' },
                      [partner.userId]: { firstName: partner.firstName, lastName: partner.lastName, photoURL: partner.photoURL || '' }
                  },
                  lastUpdatedAt: serverTimestamp(),
                  isGroupChat: false,
                  hasMessages: true
              };
              const ref = await addDoc(chatsRef, newChat);
              chatId = ref.id;
          }

          await addDoc(collection(firestore, 'chats', chatId, 'messages'), {
              senderId: user.uid,
              text,
              createdAt: serverTimestamp()
          });

          await updateDoc(doc(firestore, 'chats', chatId), { lastUpdatedAt: serverTimestamp(), hasMessages: true });
          
          toast({ title: 'Shared with Partner!', description: `Details sent to ${partner.firstName}.` });
          
          finalizeRelationalLog(activeSoul, `Shared with partner: ${partner.firstName}`);
          setIsPartnerSelectionDialogOpen(false);
          setIsShareTargetDialogOpen(false);
          router.push(`/dashboard/chats/${chatId}`);
      } catch (e) {
          toast({ variant: 'destructive', title: 'Share Failed' });
      }
  };

  const uniquePartners = useMemo(() => {
    const partners = userProfile?.accountabilityPartners || [];
    const uniqueMap = new Map();
    partners.forEach(p => {
        if (p.userId && !uniqueMap.has(p.userId)) uniqueMap.set(p.userId, p);
    });
    return Array.from(uniqueMap.values());
  }, [userProfile?.accountabilityPartners]);

  const activeActionLabel = useMemo(() => 
    actionItems.find(a => a.id === selectedActionId)?.label || "Connect with", 
  [selectedActionId]);

  if (userLoading || profileLoading || soulsLoading) {
    return (
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b text-left">
        <CardHeader className="p-4 sm:p-6 text-left">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 px-4 sm:px-6 pb-6 text-left">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b overflow-hidden relative group/card text-left">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover/card:opacity-[0.05] transition-opacity">
          <Users className="h-32 w-32 text-primary rotate-12" />
        </div>

        <CardHeader className="p-4 sm:p-6 pb-4 relative z-10">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
              <div className="space-y-1">
                  <CardTitle className="text-base sm:text-lg font-black font-headline uppercase tracking-tight flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Kingdom Connections
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60">Daily Relational Efforts</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                {currentDate && (
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    {format(currentDate, 'PPPP')}
                  </div>
                )}
              </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-2 relative z-10">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {actionItems.map(item => {
                  const isCompleted = completedToday.includes(item.id);
                  const Icon = iconMap[item.id] || Heart;
                  return (
                      <TooltipProvider key={item.id}>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <motion.div whileTap={{ scale: 0.95 }} whileHover={{ y: -2 }}>
                                      <Button
                                          variant="outline"
                                          className={cn(
                                              "relative flex flex-col items-center justify-center gap-2 p-3 h-24 w-full text-center transition-all duration-300 rounded-3xl border-2 overflow-hidden",
                                              isCompleted 
                                                  ? "bg-primary/5 border-primary/40 shadow-inner ring-1 ring-primary/10" 
                                                  : "bg-background/40 hover:bg-muted/50 hover:border-primary/20"
                                          )}
                                          onClick={() => handleActionClick(item.id)}
                                          disabled={togglingId === item.id}
                                      >
                                          <AnimatePresence>
                                              {isCompleted && togglingId !== item.id && (
                                                  <motion.div 
                                                      initial={{ scale: 0, opacity: 0 }}
                                                      animate={{ scale: 1, opacity: 1 }}
                                                      exit={{ scale: 0, opacity: 0 }}
                                                      className="absolute top-2 right-2 bg-primary rounded-full p-0.5 shadow-lg z-20"
                                                  >
                                                      <CheckCircle2 className="h-3 w-3 text-primary-foreground fill-current" />
                                                  </motion.div>
                                              )}
                                          </AnimatePresence>

                                          {togglingId === item.id ? (
                                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                          ) : (
                                              <>
                                                  <div className={cn(
                                                      "h-8 w-8 rounded-2xl flex items-center justify-center transition-all duration-500",
                                                      isCompleted ? "bg-primary/20 scale-110 shadow-lg" : "bg-muted/30"
                                                  )}>
                                                      <Icon className={cn("h-4 w-4 transition-all", isCompleted ? "text-primary fill-current" : "text-primary/60")} />
                                                  </div>
                                                  <div className="space-y-0.5 min-w-0 w-full text-center">
                                                      <span className={cn(
                                                          "text-[9px] font-black uppercase tracking-tight block truncate text-center",
                                                          isCompleted ? "text-primary" : "text-foreground"
                                                      )}>
                                                          {item.label}
                                                      </span>
                                                  </div>
                                              </>
                                          )}
                                      </Button>
                                  </motion.div>
                              </TooltipTrigger>
                              <TooltipContent className="rounded-xl border-primary/20 shadow-xl" side="bottom">
                                  <p className="text-[10px] font-bold uppercase text-primary">Kingdom Action</p>
                                  <p className="text-xs font-medium max-w-[150px] leading-relaxed italic text-center">{item.label}</p>
                              </TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                  );
              })}
          </div>
        </CardContent>
        <CardFooter className="px-4 sm:px-6 pb-6 pt-4 flex flex-col gap-4 border-t mt-4 bg-muted/5">
              <Button asChild variant="default" className="w-full font-black h-12 rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase text-xs sm:text-sm">
                  <Link href="/dashboard/souls-won">
                      <UserPlus className="mr-2 h-4 w-4" />
                      MANAGE SOULS WON
                  </Link>
              </Button>
              <p className="text-[8px] text-center text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-40">
                  Unity • Growth • Love
              </p>
        </CardFooter>
      </Card>

      <SoulSelectionDialog 
          isOpen={isSoulDialogOpen} 
          onOpenChange={setIsSoulDialogOpen} 
          souls={souls} 
          onSelect={handleSoulSelected} 
          actionLabel={activeActionLabel}
          isLoading={togglingId !== null}
      />

      <ShareWordDialog 
          isOpen={isStudyWordOpen}
          onOpenChange={setIsStudyWordOpen}
          soul={activeSoul}
          onSelectVerse={handleVerseSelected}
      />

      <Dialog open={isCommChannelDialogOpen} onOpenChange={setIsCommChannelDialogOpen}>
        <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-left">
          <DialogHeader className="text-center space-y-2">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <MessageSquare className="h-7 w-7 text-primary" />
              </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center">Message Hub</DialogTitle>
            <DialogDescription className="text-sm font-medium text-center">How would you like to encourage {activeSoul?.firstName}?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-6">
            <Button onClick={() => handleCommChoice('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20">
              <WhatsAppIcon className="h-5 w-5" /> WhatsApp
            </Button>
            <Button onClick={() => handleCommChoice('sms')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5">
              <MessageSquare className="h-5 w-5" /> Standard SMS
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isHelpNeedDialogOpen} onOpenChange={setIsHelpNeedDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
          <div className="p-8 border-b bg-muted/10">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Support Provided</DialogTitle>
              <DialogDescription className="text-sm font-medium">Describe how you supported {activeSoul?.firstName}.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6 text-left">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Support Details</Label>
                <Textarea 
                    placeholder="e.g. Provided food items, helped with bill..." 
                    onChange={e => setCustomPrayerText(e.target.value)} 
                    className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner"
                />
            </div>
            <Button onClick={() => handleHelpNeedConfirm(customPrayerText)} className="w-full h-12 rounded-xl font-bold">Confirm Service</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareTargetDialogOpen} onOpenChange={setIsShareTargetDialogOpen}>
        <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-left">
          <DialogHeader className="text-center space-y-2">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Share2 className="h-7 w-7 text-primary" />
              </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center">Share Details</DialogTitle>
            <DialogDescription className="text-sm font-medium text-center">Where would you like to share {activeSoul?.firstName}'s info?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-6">
            <Button onClick={handleShareToWhatsApp} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20">
              <WhatsAppIcon className="h-5 w-5" /> WhatsApp External
            </Button>
            <Button onClick={() => { setIsShareTargetDialogOpen(false); setTimeout(() => setIsPartnerSelectionDialogOpen(true), 100); }} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5">
              <HeartHandshake className="h-5 w-5" /> Partner on App
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPartnerSelectionDialogOpen} onOpenChange={setIsPartnerSelectionDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
              <div className="p-8 border-b bg-muted/10">
                  <DialogHeader>
                      <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Select Partner</DialogTitle>
                      <DialogDescription className="text-sm font-medium text-left">Which partner should receive these details?</DialogDescription>
                  </DialogHeader>
              </div>
              <div className="p-6">
              <ScrollArea className="h-64">
                  <div className="space-y-2">
                      {uniquePartners.map(p => (
                          <Button 
                              key={p.userId} 
                              variant="ghost" 
                              className="w-full justify-start h-14 rounded-xl gap-4 hover:bg-primary/5 group flex items-center"
                              onClick={() => handleShareToPartner(p)}
                          >
                              <Avatar className="h-8 w-8 border shrink-0">
                                  <AvatarImage src={p.photoURL} />
                                  <AvatarFallback className="font-black text-[10px]">{p.firstName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="font-bold text-sm group-hover:text-primary transition-colors text-left">{p.firstName} {p.lastName}</span>
                          </Button>
                      ))}
                      {uniquePartners.length === 0 && (
                          <p className="text-center text-xs text-muted-foreground py-12">No partners found. Connect with some in Settings!</p>
                      )}
                  </div>
              </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isPrayerCustomizationOpen} onOpenChange={setIsPrayerCustomizationOpen}>
          <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl text-left">
              <div className="p-8 border-b bg-muted/10">
                  <DialogHeader>
                      <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Kingdom Intercession</DialogTitle>
                      <DialogDescription className="text-sm font-medium text-left text-left">Draft a powerful prayer for {activeSoul?.firstName}.</DialogDescription>
                  </DialogHeader>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Select Prayer Focus</label>
                    <div className="flex flex-wrap gap-2 text-left">
                        {prayerTemplates.map(t => (
                            <Button 
                                key={t.id} 
                                variant="outline" 
                                size="sm" 
                                className="rounded-full h-8 px-4 text-[9px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 hover:text-primary text-left"
                                onClick={() => activeSoul && setCustomPrayerText(resolveTemplate(t.text, activeSoul))}
                            >
                                {t.label}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Customize Your Prayer</Label>
                    <Textarea 
                        value={customPrayerText}
                        onChange={e => setCustomPrayerText(e.target.value)}
                        className="min-h-[200px] rounded-2xl bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6 text-left"
                    />
                </div>

                <Button 
                    onClick={() => handlePrayerCustomizationConfirm(customPrayerText)} 
                    disabled={!customPrayerText.trim()} 
                    className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-left"
                >
                    CONTINUE TO CHANNEL
                </Button>
            </div>
        </DialogContent>
    </Dialog>
    </>
  );
}
