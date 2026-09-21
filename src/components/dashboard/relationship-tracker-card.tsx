'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { doc, serverTimestamp, writeBatch, arrayUnion, query, collection, orderBy, getDocs, where, getDoc, addDoc, updateDoc } from 'firebase/firestore';
import type { Soul, UserProfile, BibleChapterOutput, SoulRelationship } from '@/lib/types';
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
  HeartHandshake,
  ArrowRight,
  Smartphone,
  X,
  Send,
  BookMarked,
  ChevronDown,
  ChevronRight
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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getBibleChapter } from '@/ai/flows/get-bible-chapter-flow';
import { bibleData } from '@/lib/bible-data';
import { useIsMobile } from '@/hooks/use-mobile';

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

  const constructInvitationMessage = useCallback((verseText: string, reference: string) => {
    return `"${verseText.trim()}" — ${reference}\n\nJoin the harvest at Testify! Share your miracles and win souls for Christ. Visit: ${window.location.origin}/bible`;
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
    onSelectVerse(constructInvitationMessage(selectedTexts, reference));
  };

  const header = (
    <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2 text-left">
                {view !== 'hub' && <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full -ml-2 text-left" onClick={() => setView(view === 'verses' ? 'chapters' : view === 'chapters' ? 'books' : 'hub')}><ArrowLeft className="h-4 w-4" /></Button>}
                <BookMarked className="h-5 w-5 text-primary text-left" />
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left">Kingdom Study</span>
            </div>
            <DialogHeader className="text-left">
                <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left">
                    {view === 'hub' ? "Share the Word" : view === 'books' ? "Select Book" : view === 'chapters' ? `${selectedBook}: Select Chapter` : `${selectedBook} ${selectedChapter}`}
                </DialogTitle>
                {isMobile && <div className="flex items-center gap-2 mt-4 text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce text-left" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-left">Swipe down to close</span></div>}
            </DialogHeader>
        </div>
      </div>
    </div>
  );

  const body = (
    <ScrollArea className="flex-grow min-h-[300px] text-left">
        <div className="p-8 text-left">
            {view === 'hub' && (
                <div className="space-y-8 text-left">
                    <div className="relative text-left">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50 text-left" />
                        <Input placeholder="Search Bible (e.g. John 3:16)..." value={bibleSearch} onChange={e => setBibleSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="h-12 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left" />
                        <Button onClick={handleSearch} disabled={isSearching || !bibleSearch.trim()} variant="ghost" size="sm" className="absolute right-3 top-1/2 -translate-y-1/2 h-8 px-4 rounded-xl font-black text-[10px] uppercase text-primary">
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin text-left" /> : 'SEARCH'}
                        </Button>
                    </div>
                    {searchResults.length > 0 && searchResults.map((res, idx) => (
                        <Button key={idx} variant="outline" className="w-full h-auto p-6 rounded-[2rem] border-primary/20 bg-primary/5 flex flex-col items-start gap-3 text-left hover:bg-primary/10 transition-all border-2 border-dashed" onClick={() => onSelectVerse(constructInvitationMessage(res.text, res.reference))}>
                            <div className="flex items-center justify-between w-full text-left">
                                <span className="font-black text-xs uppercase tracking-widest text-primary text-left">{res.reference}</span>
                                <Send className="h-4 w-4 text-primary opacity-40 text-left" />
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed italic line-clamp-4 text-left">"{res.text.trim()}"</p>
                        </Button>
                    ))}
                    <div className="grid grid-cols-2 gap-4 text-left">
                        <Button onClick={() => setView('books')} variant="outline" className="h-28 rounded-[2rem] gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group transition-all flex flex-col items-center justify-center">
                            <BookOpen className="h-8 w-8 mb-1 group-hover:scale-110 transition-transform text-left" />
                            <span className="font-black text-[10px] uppercase tracking-widest text-left">Browse Bible</span>
                        </Button>
                        <Button variant="outline" asChild className="h-28 rounded-[2rem] gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group transition-all flex flex-col items-center justify-center">
                            <Link href="/dashboard/bible" className="text-left">
                                <BookMarked className="h-8 w-8 mb-1 group-hover:scale-110 transition-transform text-left" />
                                <span className="font-black text-[10px] uppercase tracking-widest text-left">Open Reader</span>
                            </Link>
                        </Button>
                    </div>
                    <div className="space-y-4 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-1 text-left">Essential Scriptures</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                            {kingdomVerses.slice(0, 4).map((v, idx) => (
                                <Button key={idx} variant="ghost" className="w-full justify-start h-auto py-4 px-5 rounded-2xl hover:bg-primary/5 group border border-transparent hover:border-primary/10 transition-all text-left block relative bg-muted/5 shadow-sm" onClick={() => onSelectVerse(constructInvitationMessage(v.text, v.reference))}>
                                    <p className="font-black text-[9px] uppercase tracking-widest text-primary mb-1 text-left">{v.reference}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed italic line-clamp-2 text-left">"{v.text}"</p>
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {view === 'books' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">
                    {bibleData.map(book => (
                        <Button key={book.name} variant="outline" className="h-12 rounded-xl font-bold uppercase text-[10px] text-left" onClick={() => handleSelectBook(book.name)}>{book.name}</Button>
                    ))}
                </div>
            )}
            {view === 'chapters' && (
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 text-left">
                   {selectedBook && bibleData.find(b => b.name === selectedBook)?.chapters.map(ch => (
                     <Button key={ch.chapter} variant="outline" className="h-10 w-10 p-0 rounded-lg font-black text-sm text-left" onClick={() => handleSelectChapter(ch.chapter)}>{ch.chapter}</Button>
                   ))}
                </div>
            )}
            {view === 'verses' && (
                <div className="space-y-4 text-left">
                   <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6 text-left">
                      <p className="text-[10px] font-black uppercase text-primary mb-1 text-left">SELECTED VERSES</p>
                      <p className="text-xs font-bold text-muted-foreground text-left">{selectedVerses.length > 0 ? `${selectedBook} ${selectedChapter}:${selectedVerses.join(', ')}` : 'Select verses below...'}</p>
                   </div>
                   <div className="space-y-1 font-serif text-left">
                     {loadingVerses ? <div className="flex justify-center py-20 text-left"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20 text-left" /></div> : chapterContent?.verses.map(v => (
                       <div key={v.verse} className={cn("p-3 rounded-xl transition-all cursor-pointer border-2 text-left", selectedVerses.includes(v.verse) ? "bg-primary/10 border-primary/40" : "bg-transparent border-transparent hover:bg-muted/50")} onClick={() => toggleVerse(v.verse)}>
                          <sup className="text-[10px] font-black mr-2 opacity-40 text-left">{v.verse}</sup>
                          <span className="text-sm leading-relaxed text-left">{v.text}</span>
                       </div>
                     ))}
                   </div>
                </div>
            )}
        </div>
    </ScrollArea>
  );

  const footer = (
    <div className="p-6 border-t bg-muted/5 flex justify-end gap-3 shrink-0 text-left">
        {view === 'verses' && <Button onClick={handleShareSelected} disabled={selectedVerses.length === 0} className="rounded-xl h-12 flex-1 font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-left">PREPARE SHARE ({selectedVerses.length})</Button>}
        <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-xs text-left">Close Hub</Button>
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
      <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left flex flex-col">
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
            s.id !== sourceSoul.id && s.gender && sourceSoul.gender && s.gender !== sourceSoul.gender && (s.age || 0) >= 18 && ['Single', 'Married', 'Divorced', 'Widowed'].includes(s.maritalStatus || '')
        ).filter(s => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return `${s.firstName} ${s.lastName}`.toLowerCase().includes(term);
        }).sort((a,b) => a.firstName.localeCompare(b.firstName));
    }, [sourceSoul, allSouls, searchTerm]);

    if (!sourceSoul) return null;

    const header = (
        <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
            <div className="flex items-center gap-2 mb-2 text-left"><HeartHandshake className="h-5 w-5 text-primary text-left" /><span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left">Kingdom Matching</span></div>
            <DialogHeader className="text-left">
                <DialogTitle className="text-2xl font-black font-headline uppercase text-left">Find Match for {sourceSoul.firstName}</DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-left">Listing eligible singles (18+) of the opposite gender.</DialogDescription>
                {isMobile && <div className="flex items-center gap-2 mt-4 text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce text-left text-left" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-left text-left">Swipe down to close</span></div>}
            </DialogHeader>
            <div className="relative mt-6 text-left"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 text-left" /><Input placeholder="Search candidates..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-11 pl-10 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left" /></div>
        </div>
    );

    const body = (
        <ScrollArea className="max-h-[50vh] text-left">
            <div className="p-4 space-y-2 text-left text-left">
                {candidates.length > 0 ? candidates.map(c => (
                    <Button key={c.id} variant="ghost" className="w-full justify-start h-auto min-h-[4rem] rounded-2xl gap-4 hover:bg-primary/5 group p-4 flex flex-row items-center text-left text-left" onClick={() => onMatchConfirmed(c)}>
                        <Avatar className="h-10 w-10 border shadow-sm shrink-0 text-left">
                            <AvatarFallback className="font-black bg-primary/10 text-primary text-xs flex items-center justify-center h-full w-full text-left">{c.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 text-left">
                            <p className="font-black text-sm uppercase tracking-tight truncate leading-tight text-left">{c.firstName} {c.lastName} ({c.age})</p>
                            <div className="flex items-center gap-2 mt-0.5 opacity-60 flex-wrap text-left">
                                <Badge variant="outline" className="h-4 px-1 text-[7px] uppercase font-bold tracking-widest text-left">{c.maritalStatus}</Badge>
                                <p className="text-[9px] font-bold uppercase truncate text-left">{c.church || 'Global Network'}</p>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 opacity-20 group-hover:opacity-100 transition-opacity shrink-0 text-left" />
                    </Button>
                )) : (
                    <div className="py-20 text-center flex flex-col items-center text-left">
                        <Users className="h-12 w-12 text-muted-foreground/10 mb-4 text-left" />
                        <p className="text-sm text-muted-foreground italic text-center text-left">No eligible candidates found.</p>
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
                    {body}
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left">
                {header}
                {body}
            </DialogContent>
        </Dialog>
    );
}

function SoulSelectionDialog({ isOpen, onOpenChange, souls, onSelect, actionLabel, isLoading }: { isOpen: boolean; onOpenChange: (open: boolean) => void; souls: Soul[] | null; onSelect: (soul: Soul) => void; actionLabel: string; isLoading: boolean; }) {
    const isMobile = useIsMobile();
    const [search, setSearch] = useState('');
    const filteredSouls = useMemo(() => {
        if (!souls) return [];
        if (!search) return souls;
        const term = search.toLowerCase();
        return souls.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(term));
    }, [souls, search]);

    const header = (
        <div className="p-8 border-b bg-muted/10 text-left text-left">
            <DialogHeader className="text-left text-left text-left text-left">
                <DialogTitle className="text-2xl font-black font-headline uppercase text-left text-left">Who did you {actionLabel.toLowerCase()}?</DialogTitle>
                <DialogDescription className="text-sm font-medium text-left text-left">Select a convert to link this action to their record.</DialogDescription>
                {isMobile && <div className="flex items-center gap-2 mt-4 text-left text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce text-left text-left" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-left text-left">Swipe down to close</span></div>}
            </DialogHeader>
        </div>
    );

    const body = (
        <div className="p-6 space-y-6 text-left text-left text-left">
            <div className="relative text-left text-left"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50 text-left text-left" /><Input placeholder="Search by name..." value={search} onChange={e => setSearchTerm(e.target.value)} className="rounded-2xl h-12 pl-10 bg-muted/20 border-none shadow-inner text-base text-left text-left" /></div>
            <ScrollArea className="h-[40vh] border rounded-3xl bg-muted/5 text-left text-left"><div className="p-2 space-y-1.5 text-left text-left">{filteredSouls.length > 0 ? (filteredSouls.map(soul => (<Button key={soul.id} variant="ghost" className="w-full justify-start h-16 px-4 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all gap-4 group flex flex-row items-center text-left text-left" onClick={() => onSelect(soul)} disabled={isLoading}><Avatar className="h-10 w-10 border-2 group-hover:border-primary/20 transition-colors shadow-sm text-left text-left"><AvatarFallback className="font-black bg-primary/10 text-center flex items-center justify-center h-full w-full text-left text-left">{soul.firstName?.charAt(0)}</AvatarFallback></Avatar><div className="text-left min-w-0 flex-1 text-left text-left"><p className="font-black text-sm uppercase tracking-tight text-left text-left">{soul.firstName} {soul.lastName}</p><p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60 text-left text-left">{soul.status}</p></div><div className="h-8 w-8 rounded-full bg-muted/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-left text-left"><PlusCircle className="h-4 w-4 text-left text-left" /></div></Button>))) : (<div className="text-center py-16 px-8 space-y-3 text-left text-left"><div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto text-left text-left text-left"><Users className="h-6 w-6 text-muted-foreground opacity-20 text-left text-left text-left" /></div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60 text-center text-left text-left"> {search ? "No matches found" : "Log your first soul to begin tracking"}</p></div>)}</div></ScrollArea>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onOpenChange}>
                <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
                    {header}
                    {body}
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left">
                {header}
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
  const isMobile = useIsMobile();
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [selectedSoulForAction, setSelectedSoulForAction] = useState<Soul | null>(null);
  const [isSoulDialogOpen, setIsSoulDialogOpen] = useState(false);
  const [isMatchmakingOpen, setIsMatchmakingOpen] = useState(false);
  const [isCommChannelDialogOpen, setIsCommChannelDialogOpen] = useState(false);
  const [isPrayerCustomizationOpen, setIsPrayerCustomizationOpen] = useState(false);
  const [isStudyWordOpen, setIsStudyWordOpen] = useState(false);
  const [isHelpNeedDialogOpen, setIsHelpNeedDialogOpen] = useState(false);
  const [customMessageText, setCustomMessageText] = useState('');
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  const { userProfile, loading: profileLoading } = useUserProfile();

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`), orderBy("wonAt", "desc"));
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

  const resolveTemplate = useCallback((template: string, targetSoul: Soul) => {
      const gender = targetSoul.gender?.toLowerCase() || 'other';
      const pronouns = { subject: gender === 'female' ? 'she' : 'he', object: gender === 'female' ? 'her' : 'him', possessive: gender === 'female' ? 'her' : 'his' };
      return template.replace(/{name}/g, targetSoul.firstName).replace(/{subject}/g, pronouns.subject).replace(/{object}/g, pronouns.object).replace(/{possessive}/g, pronouns.possessive);
  }, []);

  const handleActionClick = (id: string) => {
      setSelectedActionId(id);
      setIsSoulDialogOpen(true);
  };

  const finalizeLog = async (soul: Soul, actionId: string, noteAddendum: string = '') => {
    if (!user || !firestore) return;
    const action = actionItems.find(a => a.id === actionId);
    if (!action) return;

    const today = new Date();
    const dateString = format(today, 'yyyy-MM-dd');
    const batch = writeBatch(firestore);

    const newCompleted = [...completedToday];
    if (!newCompleted.includes(actionId)) newCompleted.push(actionId);

    batch.update(doc(firestore, 'users', user.uid), { 'dailyDiscipline.completed': newCompleted, 'dailyDiscipline.lastUpdated': serverTimestamp() });
    batch.set(doc(firestore, 'users', user.uid, 'disciplineHistory', dateString), { completed: newCompleted, date: serverTimestamp() }, { merge: true });

    const memberName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || user.displayName || 'Member';
    const logEntry = { date: new Date(), note: `Logged via Kingdom Connections: ${action.label}${noteAddendum ? ` - ${noteAddendum}` : ''}`, actions: [actionId], memberId: user.uid, memberName };

    batch.update(doc(firestore, `users/${user.uid}/souls`, soul.id), { followUpLog: arrayUnion(logEntry), lastUpdatedAt: serverTimestamp() });
    batch.update(doc(firestore, 'souls', soul.id), { followUpLog: arrayUnion(logEntry), lastUpdatedAt: serverTimestamp() });

    try {
        await batch.commit();
        setCompletedToday(newCompleted);
        toast({ title: 'Kingdom Impact Saved!', description: `Logged '${action.label}' for ${soul.firstName}.` });
    } catch (err: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `souls/${soul.id}`, operation: 'write' }, user));
    }
  };

  const handleSoulSelected = async (soul: Soul) => {
    if (!user || !firestore || !selectedActionId) return;
    
    if (selectedActionId === 'matchmaking') {
        setSelectedSoulForAction(soul);
        setIsSoulDialogOpen(false);
        setIsMatchmakingOpen(true);
        return;
    }

    if (['text_message', 'prayed_together', 'studied_bible'].includes(selectedActionId)) {
        if (!soul.phone && selectedActionId !== 'studied_bible') {
            toast({ variant: 'destructive', title: 'Phone Missing', description: `Please save a number for ${soul.firstName} first.` });
            return;
        }
        setSelectedSoulForAction(soul);
        setIsSoulDialogOpen(false);
        if (selectedActionId === 'prayed_together') {
            setCustomMessageText(resolveTemplate(prayerTemplates[0].text, soul));
            setIsPrayerCustomizationOpen(true);
        } else if (selectedActionId === 'text_message') {
            setIsCommChannelDialogOpen(true);
        } else if (selectedActionId === 'studied_bible') {
            setIsStudyWordOpen(true);
        }
        return;
    }

    if (selectedActionId === 'phone_call' && !soul.phone) {
        toast({ variant: 'destructive', title: 'Phone Missing' });
        return;
    }

    setIsSoulDialogOpen(false);
    setTogglingId(selectedActionId);
    
    if (selectedActionId === 'phone_call') {
        window.location.href = `tel:${soul.phone}`;
        await finalizeLog(soul, selectedActionId, 'Dialer initiated');
    } else if (['shared_meal', 'gave_gift'].includes(selectedActionId)) {
        const mPath = selectedActionId === 'shared_meal' ? '/dashboard/marketplace' : '/dashboard/marketplace/gifts';
        router.push(`${mPath}?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}&actionId=${selectedActionId}`);
    } else if (selectedActionId === 'visited_home') {
        const address = [soul.locationWon?.street, soul.locationWon?.city].filter(Boolean).join(', ');
        if (address) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
        await finalizeLog(soul, selectedActionId, address ? `Navigated to: ${address}` : '');
    } else if (selectedActionId === 'invited_to_event') {
        router.push('/dashboard/events');
        await finalizeLog(soul, selectedActionId, 'Redirected to Events Hub');
    } else if (selectedActionId === 'introduced_friend') {
        setSelectedSoulForAction(soul);
        setIsSoulDialogOpen(false);
        router.push('/dashboard/accountability');
    } else if (selectedActionId === 'helped_with_need') {
        setSelectedSoulForAction(soul);
        setIsSoulDialogOpen(false);
        setIsHelpNeedDialogOpen(true);
    } else {
        await finalizeLog(soul, selectedActionId);
    }
    setTogglingId(null);
  };

  const handleCommChoice = (channel: 'whatsapp' | 'sms') => {
      if (!selectedSoulForAction?.phone || !selectedActionId) return;
      const cleanPhone = selectedSoulForAction.phone.replace(/\+/g, '').replace(/\D/g, '');
      const message = customMessageText || `Hi ${selectedSoulForAction.firstName}, God bless you!`;
      if (channel === 'whatsapp') window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
      else window.location.href = `sms:${selectedSoulForAction.phone}?body=${encodeURIComponent(message)}`;
      finalizeLog(selectedSoulForAction, selectedActionId, `Sent via ${channel.toUpperCase()}`);
      setIsCommChannelDialogOpen(false);
      setCustomMessageText('');
      setSelectedSoulForAction(null);
  };

  const handleMatchConfirmed = (candidate: Soul) => {
      if (!selectedSoulForAction) return;
      setIsMatchmakingOpen(false);
      const template = `Hi ${selectedSoulForAction.firstName}, I've found a potential Kingdom match for you! Meet ${candidate.firstName}, a believer from my harvest field. Let's explore if this is God's will for both of you. ${window.location.origin}/chats`;
      router.push(`/chats?soulId=${selectedSoulForAction.id}&template=${encodeURIComponent(template)}`);
      finalizeLog(selectedSoulForAction, 'matchmaking', `Proposed match with ${candidate.firstName}`);
  };

  const handleHelpNeedConfirm = (note: string) => {
      if(!selectedSoulForAction || !selectedActionId) return;
      finalizeLog(selectedSoulForAction, selectedActionId, `Help: ${note}`);
      setIsHelpNeedDialogOpen(false);
      setSelectedSoulForAction(null);
  }

  const activeActionLabel = useMemo(() => actionItems.find(a => a.id === selectedActionId)?.label || "Connect with", [selectedActionId]);

  if (userLoading || profileLoading || soulsLoading) return <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b text-left text-left text-left text-left"><CardHeader className="p-4 sm:p-6 text-left text-left text-left text-left text-left"><Skeleton className="h-5 w-32 mb-2 text-left text-left text-left text-left text-left" /><Skeleton className="h-3 w-48 text-left text-left text-left text-left text-left" /></CardHeader><CardContent className="grid grid-cols-2 gap-3 px-4 sm:px-6 pb-6 text-left text-left text-left text-left text-left">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl text-left text-left text-left text-left text-left" />)}</CardContent></Card>;

  return (
    <>
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b overflow-hidden relative group/card text-left text-left text-left text-left">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover/card:opacity-[0.05] transition-opacity text-left text-left text-left text-left"><Users className="h-32 w-32 text-primary rotate-12 text-left text-left text-left text-left text-left" /></div>
        <CardHeader className="p-4 sm:p-6 pb-4 relative z-10 text-left text-left text-left text-left text-left"><div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between text-left text-left text-left text-left text-left"><div className="space-y-1 text-left text-left text-left text-left text-left"><CardTitle className="text-base sm:text-lg font-black font-headline uppercase tracking-tight flex items-center gap-2 text-left text-left text-left text-left text-left text-left"><Sparkles className="h-5 w-5 text-primary text-left text-left text-left text-left text-left text-left text-left" />Kingdom Connections</CardTitle><CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60 text-left text-left text-left text-left text-left text-left">Daily Relational Efforts</CardDescription></div><div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-left text-left text-left text-left text-left">{currentDate && (<div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 text-left text-left text-left text-left"> {format(currentDate, 'PPPP')}</div>)}</div></div></CardHeader>
        <CardContent className="px-4 sm:px-6 pb-2 relative z-10 text-left text-left text-left text-left text-left"><div className="grid grid-cols-2 gap-2 sm:gap-3 text-left text-left text-left text-left text-left text-left">{actionItems.map(action => { const isCompleted = completedToday.includes(action.id); const Icon = iconMap[action.id] || Heart; return (<TooltipProvider key={action.id}><Tooltip><TooltipTrigger asChild><motion.div whileTap={{ scale: 0.95 }} whileHover={{ y: -2 }} className="text-left text-left text-left text-left text-left text-left"><Button variant="outline" className={cn("relative flex flex-col items-center justify-center gap-2 p-3 h-24 w-full text-center transition-all duration-300 rounded-3xl border-2 overflow-hidden text-left text-left text-left text-left", isCompleted ? "bg-primary/5 border-primary/40 shadow-inner ring-1 ring-primary/10" : "bg-background/40 hover:bg-muted/50 hover:border-primary/20 text-left text-left text-left text-left")} onClick={() => handleActionClick(action.id)} disabled={togglingId === action.id}><AnimatePresence>{isCompleted && togglingId !== action.id && (<motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute top-2 right-2 bg-primary rounded-full p-0.5 shadow-lg z-20 text-left text-left text-left text-left text-left" ><CheckCircle2 className="h-3 w-3 text-primary-foreground fill-current text-left text-left text-left text-left text-left text-left" /></motion.div>)}</AnimatePresence>{togglingId === action.id ? (<Loader2 className="h-6 w-6 animate-spin text-primary text-left text-left text-left text-left text-left" />) : (<><div className={cn("h-8 w-8 rounded-2xl flex items-center justify-center transition-all duration-500 text-left text-left text-left text-left text-left", isCompleted ? "bg-primary/20 scale-110 shadow-lg" : "bg-muted/30 text-left text-left text-left text-left")}><Icon className={cn("h-4 w-4 transition-all text-left text-left text-left text-left text-left", isCompleted ? "text-primary fill-current" : "text-primary/60 text-left text-left text-left text-left")} /></div><div className="space-y-0.5 min-w-0 w-full text-left text-left text-left text-left text-left"><span className={cn("text-[9px] font-black uppercase tracking-tight block truncate text-left text-left text-left text-left", isCompleted ? "text-primary" : "text-foreground")}>{action.label}</span></div></>)}</Button></motion.div></TooltipTrigger><TooltipContent className="rounded-xl border-primary/20 shadow-xl text-left text-left text-left text-left" side="bottom"><p className="text-[10px] font-bold uppercase text-primary text-left text-left text-left text-left text-left text-left text-left">Kingdom Action</p><p className="text-xs font-medium max-w-[150px] leading-relaxed italic text-left text-left text-left text-left text-left text-left">{action.label}</p></TooltipContent></Tooltip></TooltipProvider>); })}</div></CardContent>
        <CardFooter className="px-4 sm:px-6 pb-6 pt-4 flex flex-col gap-4 border-t mt-4 bg-muted/5 text-left text-left text-left text-left text-left"><Button asChild variant="default" className="w-full font-black h-12 rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase text-xs sm:text-sm text-left text-left text-left text-left text-left"><Link href="/souls-won" className="text-left text-left text-left text-left text-left">MANAGE SOULS WON</Link></Button></CardFooter>
      </Card>

      <SoulSelectionDialog isOpen={isSoulDialogOpen} onOpenChange={setIsSoulDialogOpen} souls={souls} onSelect={handleSoulSelected} actionLabel={activeActionLabel} isLoading={togglingId !== null} />
      <MatchmakingDialog isOpen={isMatchmakingOpen} onOpenChange={setIsMatchmakingOpen} sourceSoul={selectedSoulForAction} allSouls={souls || []} onMatchConfirmed={handleMatchConfirmed} />
      <ShareWordDialog isOpen={isStudyWordOpen} onOpenChange={setIsStudyWordOpen} soul={selectedSoulForAction} onSelectVerse={(v) => { setCustomMessageText(v); setIsStudyWordOpen(false); setIsCommChannelDialogOpen(true); }} />
      
      <Dialog open={isCommChannelDialogOpen} onOpenChange={setIsCommChannelDialogOpen}>
          {isMobile ? (
              <Drawer open={isCommChannelDialogOpen} onOpenChange={setIsCommChannelDialogOpen}>
                  <DrawerContent className="p-0 rounded-t-[2.5rem] h-auto pb-12 text-left text-left">
                    <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left">
                        <DrawerHeader className="text-center space-y-2 text-left text-left text-left">
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-center text-left text-left text-left">
                                <MessageSquare className="h-7 w-7 text-primary text-center text-left text-left text-left text-left text-left" />
                            </div>
                            <DrawerTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center text-left text-left text-left">Message Hub</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium text-center text-left text-left text-left">How would you like to encourage {selectedSoulForAction?.firstName}?</DrawerDescription>
                            <div className="flex items-center justify-center gap-2 mt-4 text-left text-left text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce text-left text-left text-left text-left text-left" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center text-left text-left text-left text-left">Swipe down to close</span></div>
                        </DrawerHeader>
                    </div>
                    <div className="p-8 text-left text-left text-left text-left text-left">
                        <div className="flex flex-col gap-3 pt-6 text-left text-left text-left text-left text-left">
                            <Button onClick={() => handleCommChoice('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20 text-left text-left text-left text-left text-left text-left">
                                <WhatsAppIcon className="h-5 w-5 text-left text-left text-left text-left text-left" /> WhatsApp
                            </Button>
                            <Button onClick={() => handleCommChoice('sms')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5 text-left text-left text-left text-left text-left">
                                <MessageSquare className="h-5 w-5 text-left text-left text-left text-left text-left text-left" /> Standard SMS
                            </Button>
                        </div>
                    </div>
                  </DrawerContent>
              </Drawer>
          ) : (
            <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center text-left text-left text-left">
                <DialogHeader className="text-center space-y-2 text-left text-left text-left text-left text-left">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-center text-left text-left text-left text-left text-left text-left">
                        <MessageSquare className="h-7 w-7 text-primary text-center text-left text-left text-left text-left text-left text-left text-left" />
                    </div>
                    <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center text-left text-left text-left text-left text-left">Message Hub</DialogTitle>
                    <DialogDescription className="text-sm font-medium text-center text-left text-left text-left text-left text-left">How would you like to encourage {selectedSoulForAction?.firstName}?</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 pt-6 text-left text-left text-left text-left text-left">
                    <Button onClick={() => handleCommChoice('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20 text-left text-left text-left text-left text-left text-left">
                        <WhatsAppIcon className="h-5 w-5 text-left text-left text-left text-left text-left" /> WhatsApp
                    </Button>
                    <Button onClick={() => handleCommChoice('sms')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5 text-left text-left text-left text-left text-left text-left">
                        <MessageSquare className="h-5 w-5 text-left text-left text-left text-left text-left text-left" /> Standard SMS
                    </Button>
                </div>
            </DialogContent>
          )}
      </Dialog>

      <Dialog open={isPrayerCustomizationOpen} onOpenChange={setIsPrayerCustomizationOpen}>
          {isMobile ? (
              <Drawer open={isPrayerCustomizationOpen} onOpenChange={setIsPrayerCustomizationOpen}>
                  <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left">
                    <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left text-left text-left">
                        <DrawerHeader className="text-left flex-shrink-0 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                            <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left text-left text-left text-left text-left text-left">Kingdom Intercession</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium mt-1 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Draft a powerful prayer for {selectedSoulForAction?.firstName}.</DrawerDescription>
                            <div className="flex items-center gap-2 mt-4 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Swipe down to close</span></div>
                        </DrawerHeader>
                    </div>
                    <ScrollArea className="flex-grow p-8 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                        <div className="space-y-6 text-left text-left text-left text-left text-left text-left">
                            <div className="space-y-3 text-left text-left text-left text-left text-left">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left text-left">Select Prayer Focus</label>
                                <div className="flex flex-wrap gap-2 text-left text-left text-left text-left text-left text-left">
                                    {prayerTemplates.map(t => (
                                        <Button key={t.id} variant="outline" size="sm" className="rounded-full h-8 px-4 text-[9px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 hover:text-primary text-left text-left text-left" onClick={() => selectedSoulForAction && setCustomMessageText(resolveTemplate(t.text, selectedSoulForAction))}>{t.label}</Button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2 text-left text-left text-left text-left text-left text-left text-left"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left text-left text-left">Customize Your Prayer</Label><Textarea value={customMessageText} onChange={e => setCustomMessageText(e.target.value)} className="min-h-[200px] rounded-2xl bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6 text-left text-left text-left text-left" /></div>
                            <Button onClick={() => { setIsPrayerCustomizationOpen(false); setTimeout(() => setIsCommChannelDialogOpen(true), 100); }} disabled={!customMessageText.trim()} className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-left text-left text-left">CONTINUE TO CHANNEL</Button>
                        </div>
                    </ScrollArea>
                  </DrawerContent>
              </Drawer>
          ) : (
            <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left">
                <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left text-left text-left text-left text-left text-left"><DialogHeader className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Kingdom Intercession</DialogTitle><DialogDescription className="text-sm font-medium text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Draft a powerful prayer for {selectedSoulForAction?.firstName}.</DialogDescription></DialogHeader></div>
                <div className="p-8 space-y-6 text-left text-left text-left text-left text-left">
                    <div className="space-y-3 text-left text-left text-left text-left text-left text-left"><label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left text-left text-left">Select Prayer Focus</label><div className="flex flex-wrap gap-2 text-left text-left text-left text-left text-left">{prayerTemplates.map(t => (<Button key={t.id} variant="outline" size="sm" className="rounded-full h-8 px-4 text-[9px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 hover:text-primary text-left" onClick={() => selectedSoulForAction && setCustomMessageText(resolveTemplate(t.text, selectedSoulForAction))}>{t.label}</Button>))}</div></div>
                    <div className="space-y-2 text-left text-left text-left text-left text-left text-left text-left text-left"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left text-left text-left">Customize Your Prayer</Label><Textarea value={customMessageText} onChange={e => setCustomMessageText(e.target.value)} className="min-h-[200px] rounded-2xl bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6 text-left" /></div>
                    <Button onClick={() => { setIsPrayerCustomizationOpen(false); setTimeout(() => setIsCommChannelDialogOpen(true), 100); }} disabled={!customMessageText.trim()} className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-left">CONTINUE TO CHANNEL</Button>
                </div>
            </DialogContent>
          )}
      </Dialog>

      <Dialog open={isHelpNeedDialogOpen} onOpenChange={setIsHelpNeedDialogOpen}>
        {isMobile ? (
            <Drawer open={isHelpNeedDialogOpen} onOpenChange={setIsHelpNeedDialogOpen}>
                <DrawerContent className="h-auto max-h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left text-left">
                    <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left text-left">
                        <DrawerHeader className="text-left flex-shrink-0 text-left text-left text-left text-left">
                            <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left">Support Provided</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium mt-1 text-left text-left text-left text-left">Describe how you supported {selectedSoulForAction?.firstName}.</DrawerDescription>
                            <div className="flex items-center gap-2 mt-4 text-left text-left text-left text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce text-left text-left text-left text-left text-left" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-left text-left text-left text-left">Swipe down to close</span></div>
                        </DrawerHeader>
                    </div>
                    <div className="p-8 text-left text-left text-left text-left text-left text-left">
                        <div className="space-y-6 text-left text-left text-left text-left text-left text-left">
                            <div className="space-y-2 text-left text-left text-left text-left text-left text-left text-left"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left">Support Details</Label><Textarea placeholder="e.g. Provided food items, helped with bills..." onChange={e => setCustomMessageText(e.target.value)} className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner text-left" /></div>
                            <Button onClick={() => { if(selectedSoulForAction && selectedActionId) handleHelpNeedConfirm(customMessageText); }} className="w-full h-14 rounded-2xl font-black shadow-lg uppercase tracking-widest text-left">Confirm Service</Button>
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>
        ) : (
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left text-left text-left">
                <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left text-left text-left text-left text-left"><DialogHeader className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left">Support Details</DialogTitle><DialogDescription className="text-sm font-medium text-left text-left text-left">Describe how you supported {selectedSoulForAction?.firstName}.</DialogDescription></DialogHeader></div>
                <div className="p-8 space-y-6 text-left text-left text-left text-left text-left text-left text-left text-left">
                    <div className="space-y-2 text-left text-left text-left text-left text-left text-left text-left text-left text-left"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left text-left">Support Provided</Label><Textarea placeholder="e.g. Provided food items, helped with bills..." onChange={e => setCustomMessageText(e.target.value)} className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner text-left" /></div>
                    <Button onClick={() => { if(selectedSoulForAction && selectedActionId) handleHelpNeedConfirm(customMessageText); }} className="w-full h-12 rounded-xl font-bold text-left text-left">Confirm Service</Button>
                </div>
            </DialogContent>
        )}
      </Dialog>
    </>
  );
}

