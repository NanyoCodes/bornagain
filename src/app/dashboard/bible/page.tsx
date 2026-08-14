'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { bibleData } from '@/lib/bible-data';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import {
  doc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  serverTimestamp,
  deleteDoc,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import type { UserProfile, ReadingHistoryItem, BibleHighlight } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay } from 'date-fns';
import {
  Loader2,
  BookOpen,
  Trash2,
  Plus,
  Minus,
  Highlighter,
  ChevronDown,
  ArrowLeft,
  XCircle,
  History,
  Calendar,
  Edit,
  Sparkles,
} from 'lucide-react';
import { getBibleChapter, type BibleChapterOutput } from '@/ai/flows/get-bible-chapter-flow';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn, safeToDate } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const bibleVersions = [
    { id: 'kjv', name: 'KJV' },
    { id: 'web', name: 'WEB' },
    { id: 'bbe', name: 'BBE' },
];

const getHighlightClass = (color?: string) => {
    if (!color) return 'bg-blue-200/60 dark:bg-blue-800/50';
    return `highlight-${color}`;
};

const getNoteCardClass = (color?: string) => {
    if (!color) return 'note-card-blue';
    return `note-card-${color}`;
};

const getVerseReference = (h: { book: string; chapter: number; verses: number[] }) => {
    if (!h || !h.verses) return '';
    const verses = [...h.verses].sort((a, b) => a - b);
    if (verses.length === 0) return '';
    if (verses.length === 1) return `${h.book} ${h.chapter}:${verses[0]}`;
    const ranges: string[] = [];
    let start = verses[0];
    for (let i = 1; i < verses.length; i++) {
        if (verses[i] !== verses[i-1] + 1) {
            if (start === verses[i-1]) ranges.push(`${start}`);
            else ranges.push(`${start}-${verses[i-1]}`);
            start = verses[i];
        }
    }
    if (start === verses[verses.length-1]) ranges.push(`${start}`);
    else ranges.push(`${start}-${verses[verses.length-1]}`);
    return `${h.book} ${h.chapter}:${ranges.join(', ')}`;
};

function NoteEditor({ highlight, onSave, onDelete, onCancel }: { highlight: BibleHighlight; onSave: (id: string, note: string) => Promise<void>; onDelete: (id: string) => Promise<void>; onCancel: () => void; }) {
  const [note, setNote] = useState(highlight.note || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleSave = async () => {
    if (!note.trim()) return;
    setIsSaving(true);
    await onSave(highlight.id, note);
    setIsSaving(false);
    onCancel();
  }
  
  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(highlight.id);
  }

  return (
    <Card className={cn("bg-card border shadow-lg w-full rounded-2xl overflow-hidden transition-all duration-300", getNoteCardClass(highlight.color))}>
      <CardHeader className="p-4 sm:p-5 text-left">
        <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
                <CardTitle className="text-base font-black uppercase tracking-tight text-left">Reflect & Note</CardTitle>
                <CardDescription className="font-bold text-primary text-[10px] sm:text-xs uppercase tracking-[0.15em] mt-1 text-left">{getVerseReference(highlight)}</CardDescription>
            </div>
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Edit className="h-4 w-4 text-primary" />
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-0 text-left">
        <Textarea 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What has the Spirit revealed through this Word?"
            className="text-sm sm:text-base min-h-[140px] focus-visible:ring-primary/20 rounded-xl border-none bg-muted/20 shadow-inner text-left leading-relaxed"
            autoFocus
        />
      </CardContent>
      <CardFooter className="p-4 sm:p-5 pt-0 flex flex-col gap-4 text-left">
          <div className="flex items-center justify-between w-full gap-2 flex-wrap">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={isDeleting} className="text-destructive hover:bg-destructive/10 rounded-xl h-9 font-bold text-left px-3 text-[11px] uppercase tracking-wider">
                        {isDeleting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-left"/> : <Trash2 className="mr-1.5 h-3.5 w-3.5 text-left"/>}
                        Remove Note
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[90vw] max-w-md rounded-[2rem] p-8 border-none shadow-2xl text-left">
                    <AlertDialogHeader className="text-left">
                    <AlertDialogTitle className="text-2xl font-black font-headline text-left">Delete highlight?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium text-left">This action cannot be undone and will remove your revelation from the journal.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3 text-left">
                    <AlertDialogCancel className="rounded-xl h-11 text-left">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl h-11 font-bold text-left">Confirm Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="flex items-center gap-2 text-left ml-auto">
                <Button variant="ghost" size="sm" onClick={onCancel} className="h-9 rounded-xl font-bold px-3 text-left text-[11px] uppercase tracking-wider">Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving || !note.trim()} className="h-9 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 text-left px-4">
                    {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-left" />}
                    SAVE NOTE
                </Button>
            </div>
          </div>
      </CardFooter>
    </Card>
  )
}

type FontSize = 'sm' | 'base' | 'lg' | 'xl';
const FONT_SIZES: FontSize[] = ['sm', 'base', 'lg', 'xl'];

export default function BibleReaderPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [selectedBookName, setSelectedBookName] = useState(bibleData[0].name);
  const [selectedChapterNumber, setSelectedChapterNumber] = useState(1);
  const [selectedVersion, setSelectedVersion] = useState(bibleVersions[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [chapterContent, setChapterContent] = useState<BibleChapterOutput | null>(null);
  const [isLoadingChapter, setIsLoadingChapter] = useState(true);
  const [chapterError, setChapterError] = useState<string | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [isProcessingHighlight, setIsProcessingHighlight] = useState(false);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);

  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isChapterPopoverOpen, setIsChapterPopoverOpen] = useState(false);
  const [isJournalSheetOpen, setIsJournalSheetOpen] = useState(false);
  const [view, setView] = useState<'read' | 'history'>('read');
  const [fontSize, setFontSize] = useState<FontSize>('sm');
  const [historyFilterDate, setHistoryFilterDate] = useState<string>('');

  const fontSizeClasses = { sm: 'text-base sm:text-lg', base: 'text-lg sm:text-xl', lg: 'text-xl sm:text-2xl', xl: 'text-2xl sm:text-3xl' };
  const subFontSizeClasses = { sm: 'text-xs', base: 'text-xs', lg: 'text-sm', xl: 'text-sm' };

  const userDocRef = useMemo(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);
  
  const selectedBook = useMemo(() => bibleData.find(b => b.name === selectedBookName), [selectedBookName]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!profileLoading && !isInitialized) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlBook = urlParams.get('book');
      const urlChapter = urlParams.get('chapter');

      const savedBook = typeof window !== 'undefined' ? localStorage.getItem('last_bible_book') : null;
      const savedChapter = typeof window !== 'undefined' ? localStorage.getItem('last_bible_chapter') : null;
      const savedVersion = typeof window !== 'undefined' ? localStorage.getItem('last_bible_version') : null;

      if (savedVersion) setSelectedVersion(savedVersion);

      if (urlBook && urlChapter) {
        setSelectedBookName(urlBook);
        setSelectedChapterNumber(parseInt(urlChapter, 10));
      } else if (savedBook && savedChapter) {
        setSelectedBookName(savedBook);
        setSelectedChapterNumber(parseInt(savedChapter, 10));
      } else if (userProfile?.readingHistory?.length) {
        const sortedHistory = [...userProfile.readingHistory].sort((a, b) => {
           const timeA = safeToDate(a.readAt)?.getTime() ?? 0;
           const timeB = safeToDate(b.readAt)?.getTime() ?? 0;
           return timeB - timeA;
        });
        const lastRead = sortedHistory[0];
        if (lastRead) {
          setSelectedBookName(lastRead.book);
          setSelectedChapterNumber(lastRead.chapter);
        }
      }
      setIsInitialized(true);
    }
  }, [userProfile, profileLoading, isInitialized]);

  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
        localStorage.setItem('last_bible_book', selectedBookName);
        localStorage.setItem('last_bible_chapter', selectedChapterNumber.toString());
        localStorage.setItem('last_bible_version', selectedVersion);
    }
  }, [selectedBookName, selectedChapterNumber, selectedVersion, isInitialized]);

  const prevBookNameRef = useRef(selectedBookName);
  useEffect(() => {
    if (selectedBookName !== prevBookNameRef.current) {
      setSelectedChapterNumber(1);
      prevBookNameRef.current = selectedBookName;
    }
  }, [selectedBookName]);

  const highlightsQuery = useMemo(() => {
    if (!user || !chapterContent) return null;
    return query(collection(firestore, 'users', user.uid, 'bibleHighlights'), where('book', '==', chapterContent.book), where('chapter', '==', chapterContent.chapter));
  }, [user, firestore, chapterContent]);
  const { data: highlights } = useCollection<BibleHighlight>(highlightsQuery);

  const unfinishedHighlight = useMemo(() => highlights?.find(h => !h.note), [highlights]);
  const activeHighlight = useMemo(() => highlights?.find(h => h.id === activeHighlightId), [activeHighlightId, highlights]);
  const highlightsMap = useMemo(() => {
    const map = new Map<number, BibleHighlight>();
    highlights?.forEach(h => h.verses.forEach(v => map.set(v, h)));
    return map;
  }, [highlights]);
  
  useEffect(() => {
    if (!isInitialized) return;
    
    const fetchChapter = async () => {
      setIsLoadingChapter(true);
      setChapterError(null);
      setChapterContent(null);
      setSelectedVerses([]);
      setActiveHighlightId(null);
      setToolbarPos(null);
      try {
        const content = await getBibleChapter({ 
          book: selectedBookName, 
          chapter: selectedChapterNumber, 
          version: selectedVersion 
        });
        setChapterContent(content);
      } catch (error: any) { 
        setChapterError(error.message || "Failed to load."); 
      } finally { 
        setIsLoadingChapter(false); 
      }
    };
    fetchChapter();
  }, [isInitialized, selectedBookName, selectedChapterNumber, selectedVersion]);

  const handleMarkAsRead = async () => {
    if (!user || !chapterContent || !firestore) return;
    setIsSubmitting(true);
    
    try {
        const batch = writeBatch(firestore);
        const userRef = doc(firestore, 'users', user.uid);
        const historyItem = { book: chapterContent.book, chapter: chapterContent.chapter, readAt: new Date() };
        const now = new Date();
        const dateStr = format(now, 'yyyy-MM-dd');
        
        let currentCompleted: string[] = [];
        if (userProfile?.dailyDiscipline?.lastUpdated) {
            const lastUpdated = safeToDate(userProfile.dailyDiscipline.lastUpdated);
            if (lastUpdated && isSameDay(lastUpdated, now)) {
                currentCompleted = userProfile.dailyDiscipline.completed || [];
            }
        }
        
        const newCompleted = currentCompleted.includes('read_bible') ? currentCompleted : [...currentCompleted, 'read_bible'];

        const profileUpdateData = {
            readingHistory: arrayUnion(historyItem),
            dailyDiscipline: { completed: newCompleted, lastUpdated: serverTimestamp() }
        };
        
        batch.update(userRef, profileUpdateData);
        const historyRef = doc(firestore, 'users', user.uid, 'disciplineHistory', dateStr);
        batch.set(historyRef, { completed: newCompleted, date: serverTimestamp() }, { merge: true });

        await batch.commit();
        toast({ title: 'Study Logged!' });

        const currentBookIndex = bibleData.findIndex(b => b.name === chapterContent.book);
        const currentBook = bibleData[currentBookIndex];
        if (chapterContent.chapter >= (currentBook?.chapters.length || 0)) {
            if (currentBookIndex < bibleData.length - 1) { 
                setSelectedBookName(bibleData[currentBookIndex + 1].name); 
                setSelectedChapterNumber(1); 
            }
            else { toast({ title: 'Finished entire Bible!' }); router.back(); }
        } else { 
            setSelectedChapterNumber(chapterContent.chapter + 1); 
        }
    } catch (e) { 
        console.error(e); 
    } finally { 
        setIsSubmitting(false); 
    }
  };

  const handleVerseClick = (verseNumber: number) => {
        const existingHighlight = highlightsMap.get(verseNumber);
        if (existingHighlight) { 
            setActiveHighlightId(existingHighlight.id); 
            setSelectedVerses([]);
            setToolbarPos(null);
            return; 
        }
        setActiveHighlightId(null);
        const newSelection = selectedVerses.includes(verseNumber) ? selectedVerses.filter(v => v !== verseNumber) : [...selectedVerses, verseNumber].sort((a, b) => a - b);
        setSelectedVerses(newSelection);
        const targetVerseNum = newSelection[0] || verseNumber;
        const verseElement = document.getElementById(`verse-${targetVerseNum}`);
        if (verseElement && newSelection.length > 0) {
            const rect = verseElement.getBoundingClientRect();
            const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) {
                const vRect = viewport.getBoundingClientRect();
                setToolbarPos({ top: rect.top - vRect.top + viewport.scrollTop, left: rect.left - vRect.left + rect.width / 2 });
            }
        } else setToolbarPos(null);
    };

    const handleSaveHighlight = async () => {
        if (!user || selectedVerses.length === 0 || !chapterContent) return;
        setIsProcessingHighlight(true);
        const newHighlightRef = doc(collection(firestore, 'users', user.uid, 'bibleHighlights'));
        await setDoc(newHighlightRef, { userId: user.uid, book: chapterContent.book, chapter: chapterContent.chapter, verses: selectedVerses, color: 'blue', createdAt: serverTimestamp(), note: '' });
        setSelectedVerses([]);
        setToolbarPos(null);
        setActiveHighlightId(newHighlightRef.id);
        setIsProcessingHighlight(false);
    };
    
    const handleUpdateNote = async (highlightId: string, noteText: string) => {
        if (!user) return;
        await updateDoc(doc(firestore, 'users', user.uid, 'bibleHighlights', highlightId), { note: noteText, updatedAt: serverTimestamp() });
    };

    const handleDeleteHighlight = async (id: string) => {
        if (!user || !firestore) return;
        const highlightRef = doc(firestore, 'users', user.uid, 'bibleHighlights', id);
        try {
            await deleteDoc(highlightRef);
            setActiveHighlightId(null);
        } catch (e) {
            console.error(e);
        }
    };

    const readingHistoryList = userProfile?.readingHistory || [];
    const historyGroups = useMemo(() => {
        const groups: { date: Date; items: ReadingHistoryItem[] }[] = [];
        readingHistoryList.forEach(item => {
            const itemDate = safeToDate(item.readAt);
            if (!itemDate) return;
            if (historyFilterDate) {
              const filterD = new Date(historyFilterDate);
              if (!isSameDay(itemDate, filterD)) return;
            }
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && isSameDay(lastGroup.date, itemDate)) lastGroup.items.push(item);
            else groups.push({ date: itemDate, items: [item] });
        });
        return groups.reverse();
    }, [readingHistoryList, historyFilterDate]);

    const NotesList = (
        <div className="space-y-4 p-1 text-left">
            {highlights?.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)).map(h => h.id === activeHighlightId ? (
                <NoteEditor key={h.id} highlight={h} onSave={handleUpdateNote} onDelete={handleDeleteHighlight} onCancel={() => setActiveHighlightId(null)} />
            ) : (
                <Card key={h.id} onClick={() => setActiveHighlightId(h.id)} className={cn("cursor-pointer hover:bg-muted/50 border-l-4 rounded-xl shadow-sm border-l-primary text-left", getNoteCardClass(h.color))}>
                    <CardHeader className="p-4 text-left">
                        <CardTitle className="text-sm font-black uppercase tracking-tight truncate text-left">{getVerseReference(h)}</CardTitle>
                    </CardHeader>
                    {h.note && <CardContent className="p-4 pt-0 text-left"><p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed italic text-left">&ldquo;{h.note}&rdquo;</p></CardContent>}
                </Card>
            ))}
        </div>
    );
    
    const ReaderContent = (
      <div className="flex flex-col h-full min-h-0 text-left">
          <ScrollArea ref={scrollAreaRef} className="flex-grow border-none relative h-full text-left">
                  {isLoadingChapter && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 z-20 gap-2 text-left">
                        <Loader2 className="h-8 w-8 animate-spin text-primary text-left" />
                        <p className="text-[10px] font-black uppercase tracking-widest animate-pulse text-left">Checking records...</p>
                    </div>
                  )}
                  {!isLoadingChapter && chapterContent && (
                    <div className="max-w-4xl mx-auto px-6 sm:px-12 py-8 text-left">
                        <div className={cn("space-y-4 font-serif leading-relaxed text-foreground/90 text-left", fontSizeClasses[fontSize])}>
                            {chapterContent.verses.map(v => (
                                <div key={v.verse} id={`verse-${v.verse}`} className={cn('rounded px-2 py-1 cursor-pointer transition-colors relative text-left', highlightsMap.get(v.verse) && getHighlightClass(highlightsMap.get(v.verse)!.color), selectedVerses.includes(v.verse) && 'bg-primary/20', activeHighlight?.verses.includes(v.verse) && 'ring-2 ring-primary')} onClick={() => handleVerseClick(v.verse)}>
                                    <sup className={cn("mr-2 text-muted-foreground/60 font-sans font-bold select-none text-left", subFontSizeClasses[fontSize])}>{v.verse}</sup>
                                    {v.text}
                                </div>
                            ))}
                        </div>
                        {selectedVerses.length > 0 && toolbarPos && (
                            <div className="absolute z-30 transition-all pointer-events-none text-left" style={{ top: `${toolbarPos.top}px`, left: `${toolbarPos.left}px`, transform: 'translate(-50%, -120%)' }}>
                                <Button size="default" className="pointer-events-auto shadow-xl h-10 px-6 rounded-full font-black uppercase tracking-widest text-[10px] text-left" onClick={handleSaveHighlight} disabled={isProcessingHighlight}>{isProcessingHighlight ? <Loader2 className="h-4 w-4 animate-spin text-left" /> : <Highlighter className="mr-2 h-4 w-4 text-left" />}Highlight & Note</Button>
                            </div>
                        )}
                        <div className="mt-16 flex flex-col sm:flex-row gap-6 items-center justify-between pb-32 text-left">
                              {unfinishedHighlight && (
                                <Card className="border-amber-500/50 bg-amber-500/5 p-4 w-full sm:w-auto shadow-inner rounded-2xl text-left">
                                  <div className="flex items-center justify-between gap-8 text-left">
                                    <div className="space-y-0.5 text-left">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 text-left">Reflection Pending</p>
                                      <p className="text-xs text-muted-foreground text-left">Add a note to your highlight.</p>
                                    </div>
                                    <Button size="sm" onClick={() => setActiveHighlightId(unfinishedHighlight.id)} className="rounded-xl h-9 font-bold px-4 text-left">Go to Note</Button>
                                  </div>
                                </Card>
                              )}
                              <Button onClick={handleMarkAsRead} disabled={isSubmitting} size="lg" className="w-full sm:w-auto font-black uppercase tracking-[0.2em] h-14 px-12 shadow-xl shadow-primary/20 rounded-2xl text-xs text-left">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}
                                FINISH CHAPTER
                              </Button>
                        </div>
                    </div>
                  )}
          </ScrollArea>
      </div>
    );

    return (
        <div className="h-dvh flex flex-col bg-background overflow-hidden text-left">
            <div className="shrink-0 flex items-center justify-between p-4 md:px-8 border-b bg-background/80 backdrop-blur-md z-10 gap-4 text-left">
                <div className="flex items-center gap-3 text-left">
                  <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full h-9 w-9 sm:h-10 sm:w-10 border shadow-sm text-left"><ArrowLeft className="h-5 w-5 text-left" /></Button>
                  <div className="hidden sm:flex items-center gap-2 text-left">
                    <BookOpen className="h-5 w-5 text-primary text-left" />
                    <span className="font-headline font-black text-lg uppercase tracking-tight text-left">Bible</span>
                  </div>
                </div>
                
                {view === 'read' && (
                  <div className="flex items-center gap-2 text-left">
                      <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                          <SelectTrigger className="w-[80px] h-9 border-none bg-muted/50 hover:bg-muted font-bold text-[10px] uppercase tracking-widest rounded-lg text-left"><SelectValue className="text-left" /></SelectTrigger>
                          <SelectContent className="rounded-xl text-left">
                              {bibleVersions.map(v => <SelectItem key={v.id} value={v.id} className="text-xs text-left">{v.id.toUpperCase()}</SelectItem>)}
                          </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1 border rounded-full p-0.5 bg-muted/30 text-left">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-left" onClick={() => setFontSize(f => f === 'sm' ? 'sm' : FONT_SIZES[FONT_SIZES.indexOf(f)-1] as FontSize)}><Minus className="h-3.5 w-3.5 text-left" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-left" onClick={() => setFontSize(f => f === 'xl' ? 'xl' : FONT_SIZES[FONT_SIZES.indexOf(f)+1] as FontSize)}><Plus className="h-3.5 w-3.5 text-left" /></Button>
                      </div>
                  </div>
                )}

                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-full text-left">
                   <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant={view === 'read' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('read')} className={cn("h-8 w-10 sm:w-12 rounded-full p-0 text-left", view === 'read' && "shadow-sm")}>
                                <BookOpen className="h-4 w-4 text-left" />
                                <span className="sr-only text-left">Read</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-left"><p className="text-[10px] font-bold uppercase text-left">Read Bible</p></TooltipContent>
                    </Tooltip>
                   </TooltipProvider>

                   <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant={view === 'history' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('history')} className={cn("h-8 w-10 sm:w-12 rounded-full p-0 text-left", view === 'history' && "shadow-sm")}>
                                <History className="h-4 w-4 text-left" />
                                <span className="sr-only text-left">History</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-left"><p className="text-[10px] font-bold uppercase text-left">Study History</p></TooltipContent>
                    </Tooltip>
                   </TooltipProvider>
                </div>
            </div>

            {view === 'read' && (
                <div className="flex-grow flex flex-col min-h-0 text-left">
                    <div className="flex items-center justify-between gap-3 p-2 sm:px-6 bg-muted/20 border-b sticky top-0 z-20 backdrop-blur-sm text-left">
                        <div className="flex items-center gap-1.5 min-w-0 text-left">
                            <Select value={selectedBookName} onValueChange={setSelectedBookName}>
                                <SelectTrigger className="h-9 px-3 border-none bg-background shadow-sm font-black text-xs sm:text-sm rounded-full hover:bg-accent transition-colors text-left">
                                  <SelectValue className="text-left" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] rounded-2xl text-left">{bibleData.map(book => <SelectItem key={book.name} value={book.name} className="text-xs uppercase font-bold text-left">{book.name}</SelectItem>)}</SelectContent>
                            </Select>
                            
                            <Separator orientation="vertical" className="h-4 mx-1 text-left" />

                            <Popover open={isChapterPopoverOpen} onOpenChange={setIsChapterPopoverOpen}>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-9 px-3 font-bold text-xs sm:text-sm rounded-full hover:bg-background/80 shadow-sm border-none text-left">
                                    Chapter {selectedChapterNumber}
                                    <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-50 text-left" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[280px] p-0 shadow-2xl border-primary/10 rounded-[1.5rem] text-left" align="start">
                                    <div className="p-4 bg-muted/20 border-b flex items-center justify-between text-left">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-left">{selectedBookName}</span>
                                        <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 rounded text-left">{selectedBook?.chapters.length} CHS</span>
                                    </div>
                                  <ScrollArea className="h-72 text-left">
                                    <div className="grid grid-cols-5 gap-1 p-3 text-left">
                                      {selectedBook?.chapters.map(c => (
                                        <Button key={c.chapter} variant={c.chapter === selectedChapterNumber ? "default" : "ghost"} size="sm" className={cn("h-10 w-10 font-black text-xs rounded-xl text-left", c.chapter === selectedChapterNumber ? "shadow-md" : "")} onClick={() => { setSelectedChapterNumber(c.chapter); setIsChapterPopoverOpen(false); }}>
                                            {c.chapter}
                                        </Button>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex items-center gap-2 text-left">
                            <Button variant="outline" size="sm" className="hidden sm:flex gap-2 rounded-full bg-background border-primary/20 hover:bg-primary/5 h-9 text-left" onClick={() => setIsJournalSheetOpen(true)}>
                                <Highlighter className="h-4 w-4 text-primary text-left" />
                                <span className="font-black uppercase tracking-widest text-[9px] text-left">My Journal</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="sm:hidden rounded-full bg-background shadow-sm border h-9 w-9 text-primary text-left" onClick={() => setIsJournalSheetOpen(true)}>
                              <Highlighter className="h-4 w-4 text-left" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex-grow flex gap-0 min-h-0 text-left">
                        <div className="flex-1 min-h-0 text-left">{ReaderContent}</div>
                        <div className="hidden lg:flex lg:w-96 flex-col border-l bg-muted/10 p-6 min-h-0 text-left">
                            <h3 className="font-headline font-black uppercase tracking-tight text-xl mb-4 flex items-center gap-2.5 text-left">
                                <Highlighter className="h-5 w-5 text-primary text-left" />
                                My Journal
                            </h3>
                            <ScrollArea className="flex-grow pr-4 -mr-4 text-left">{NotesList}</ScrollArea>
                        </div>
                    </div>
                    
                    <Sheet open={isJournalSheetOpen} onOpenChange={setIsJournalSheetOpen}>
                      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 rounded-l-[2rem] text-left">
                        <SheetHeader className="p-8 border-b shrink-0 bg-muted/20 text-left">
                            <div className="flex items-center gap-2.5 mb-1 text-left">
                                <Highlighter className="h-5 w-5 text-primary text-left" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Kingdom Revelation</span>
                            </div>
                            <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">My Journal</SheetTitle>
                            <SheetDescription className="text-xs font-medium text-left">Capture the living Word as it's revealed to you.</SheetDescription>
                        </SheetHeader>
                        <div className="flex-grow overflow-y-auto p-4 sm:p-6 bg-muted/5 text-left">
                          {NotesList}
                        </div>
                      </SheetContent>
                    </Sheet>

                    {isMobile && activeHighlight && (
                      <Sheet open={!!activeHighlight} onOpenChange={(open) => !open && setActiveHighlightId(null)}>
                        <SheetContent side="bottom" className="h-[90dvh] p-0 flex flex-col rounded-t-[2.5rem] border-t-8 border-t-primary/20 text-left">
                          <SheetHeader className="p-8 border-b shrink-0 bg-muted/10 text-left">
                            <SheetTitle className="text-xl font-black uppercase tracking-tight text-left">Reflect & Journal</SheetTitle>
                            <SheetDescription className="text-xs font-bold text-primary uppercase tracking-widest text-left">{getVerseReference(activeHighlight)}</SheetDescription>
                          </SheetHeader>
                          <div className="flex-grow overflow-y-auto p-6 text-left">
                            <NoteEditor highlight={activeHighlight} onSave={handleUpdateNote} onDelete={handleDeleteHighlight} onCancel={() => setActiveHighlightId(null)} />
                          </div>
                        </SheetContent>
                      </Sheet>
                    )}
                </div>
            )}
            {view === 'history' && (
                <div className="flex-grow flex flex-col min-h-0 bg-muted/5 overflow-hidden text-left">
                    <div className="max-w-3xl mx-auto w-full flex-grow flex flex-col p-4 md:p-8 min-h-0 text-left">
                        <div className="flex items-center gap-3 mb-8 shrink-0 text-left">
                            <div className="relative flex-1 text-left">
                                <Input type="date" value={historyFilterDate} onChange={(e) => setHistoryFilterDate(e.target.value)} className="h-12 pl-10 rounded-2xl bg-background shadow-inner border-none font-bold text-left" />
                                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 text-left" />
                            </div>
                            {historyFilterDate && (
                                <Button variant="secondary" size="icon" onClick={() => setHistoryFilterDate('')} className="h-12 w-12 rounded-2xl shadow-md text-left">
                                    <XCircle className="h-5 w-5 text-left" />
                                </Button>
                            )}
                        </div>
                        <ScrollArea className="flex-grow pr-4 -mr-4 text-left">
                            <div className="space-y-12 pb-32 text-left">
                                {historyGroups.length > 0 ? historyGroups.map(g => (
                                    <div key={g.date.toISOString()} className="space-y-6 text-left">
                                        <div className="sticky top-0 z-10 py-2 bg-muted/5 text-left">
                                            <div className="flex items-center gap-4 text-left">
                                                <span className="font-black text-[10px] uppercase tracking-[0.2em] text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 text-left">{format(g.date, 'PPPP')}</span>
                                                <div className="h-px bg-muted flex-grow text-left" />
                                            </div>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2 text-left">
                                          {g.items.map((i, idx) => {
                                            const readAt = safeToDate(i.readAt);
                                            return (
                                              <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-all rounded-[1.5rem] bg-background/50 backdrop-blur-sm group text-left">
                                                <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0 text-left">
                                                    <div className="flex items-center gap-4 min-w-0 text-left">
                                                      <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 shrink-0 group-hover:scale-110 transition-transform text-left">
                                                        <BookOpen className="h-5 w-5 text-primary text-left" />
                                                      </div>
                                                      <div className="min-w-0 text-left">
                                                        <p className="font-black text-base uppercase tracking-tight truncate text-left">{i.book} {i.chapter}</p>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left">{readAt ? format(readAt, 'p') : 'N/A'}</p>
                                                      </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" onClick={() => { setSelectedBookName(i.book); setSelectedChapterNumber(i.chapter); setView('read'); }} className="rounded-full h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors text-left">
                                                        <ArrowLeft className="h-4 w-4 rotate-180 text-left" />
                                                    </Button>
                                                </CardHeader>
                                              </Card>
                                          )})}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-32 flex flex-col items-center text-left">
                                        <History className="h-16 w-16 text-muted-foreground/10 mb-4 text-left" />
                                        <h3 className="font-black uppercase tracking-tight text-xl opacity-30 text-left">No Records</h3>
                                        <p className="text-sm text-muted-foreground mt-2 italic px-12 text-balance leading-relaxed text-left">
                                            {historyFilterDate ? "No study logged for this date." : "Your spiritual milestones will appear here as you meditate on the Word."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            )}
        </div>
    );
}
