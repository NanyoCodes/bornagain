'use client';

import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { bibleData } from '@/lib/bible-data';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, updateDoc, arrayUnion, collection, query, where, addDoc, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore';
import type { UserProfile, ReadingHistoryItem, BibleHighlight } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, isToday } from 'date-fns';
import { Loader2, XCircle, BookOpen, Trash2, ChevronRight, Minus, Plus, Highlighter, ChevronDown } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { getBibleChapter, type BibleChapterOutput } from '@/ai/flows/get-bible-chapter-flow';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { cn, safeToDate } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const bibleVersions = [
    { id: 'kjv', name: 'King James Version' },
    { id: 'web', name: 'World English Bible' },
    { id: 'bbe', name: 'Bible in Basic English' },
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
    <Card className={cn("bg-card border shadow-lg text-left", getNoteCardClass(highlight.color))}>
      <CardHeader className="p-3 text-left">
        <CardTitle className="text-base">Editing Note</CardTitle>
        <CardDescription>{getVerseReference(highlight)}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0 text-left">
        <Textarea 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add your meditation note..."
            rows={4}
            className="text-sm"
        />
      </CardContent>
      <CardFooter className="p-3 pt-0 flex flex-wrap items-center justify-between gap-y-2">
          <AlertDialog>
             <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="mr-1 h-4 w-4 animate-spin"/> : <Trash2 className="mr-1 h-4 w-4"/>}
                    Delete
                </Button>
             </AlertDialogTrigger>
             <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete highlight?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive">Confirm</AlertDialogAction>
                </AlertDialogFooter>
             </AlertDialogContent>
          </AlertDialog>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>Save</Button>
          </div>
      </CardFooter>
    </Card>
  )
}


export function BibleDialog({ isOpen, onOpenChange, onDisciplineCompleted }: { isOpen: boolean; onOpenChange: (open: boolean) => void; onDisciplineCompleted: () => void; }) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [selectedBookName, setSelectedBookName] = useState(bibleData[0].name);
  const [selectedChapterNumber, setSelectedChapterNumber] = useState(1);
  const [selectedVersion, setSelectedVersion] = useState(bibleVersions[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [chapterContent, setChapterContent] = useState<BibleChapterOutput | null>(null);
  const [isLoadingChapter, setIsLoadingChapter] = useState(true);
  const [chapterError, setChapterError] = useState<string | null>(null);

  const [isScrolledToEnd, setIsScrolledToEnd] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [filterDate, setFilterDate] = useState<Date | undefined>();

  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [isProcessingHighlight, setIsProcessingHighlight] = useState(false);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const activeNoteRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [isBookSheetOpen, setIsBookSheetOpen] = useState(false);
  const [isChapterSheetOpen, setIsChapterSheetOpen] = useState(false);
  const [isChapterPopoverOpen, setIsChapterPopoverOpen] = useState(false);
  const [isVersionSheetOpen, setIsVersionSheetOpen] = useState(false);
  const [bookSearchTerm, setBookSearchTerm] = useState('');
  const [mobileTab, setMobileTab] = useState('reader');
  
  const [goToVerse, setGoToVerse] = useState('');

  type FontSize = 'sm' | 'base' | 'lg' | 'xl';
  const fontSizes: FontSize[] = ['sm', 'base', 'lg', 'xl'];
  const [fontSize, setFontSize] = useState<FontSize>('sm');
  const fontSizeClasses: Record<FontSize, string> = { sm: 'text-xs sm:text-sm', base: 'text-sm sm:text-base', lg: 'text-base sm:text-lg', xl: 'text-lg sm:text-xl' };
  const subFontSizeClasses: Record<FontSize, string> = { sm: 'text-xs', base: 'text-xs', lg: 'text-sm', xl: 'text-sm' };

  const userDocRef = useMemo(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);
  
  const selectedBook = useMemo(() => bibleData.find(b => b.name === selectedBookName), [selectedBookName]);

  const [isInitialized, setIsInitialized] = useState(false);
  const lastBookRef = useRef(bibleData[0].name);

  // Cross-device/Session Initialization
  useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false);
      return;
    }

    if (isOpen && !loadingProfile && !isInitialized) {
      const savedBook = typeof window !== 'undefined' ? localStorage.getItem('last_bible_book') : null;
      const savedChapter = typeof window !== 'undefined' ? localStorage.getItem('last_bible_chapter') : null;
      const savedVersion = typeof window !== 'undefined' ? localStorage.getItem('last_bible_version') : null;

      if (savedVersion) setSelectedVersion(savedVersion);

      if (savedBook && savedChapter) {
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
  }, [isOpen, userProfile, loadingProfile, isInitialized]);

  // Viewing Persistence
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
        localStorage.setItem('last_bible_book', selectedBookName);
        localStorage.setItem('last_bible_chapter', selectedChapterNumber.toString());
        localStorage.setItem('last_bible_version', selectedVersion);
    }
  }, [selectedBookName, selectedChapterNumber, selectedVersion, isInitialized]);

  useEffect(() => {
    if (isInitialized && selectedBookName !== lastBookRef.current) {
      setSelectedChapterNumber(1);
      setActiveHighlightId(null);
      lastBookRef.current = selectedBookName;
    }
  }, [selectedBookName, isInitialized]);

  const highlightsQuery = useMemo(() => {
    if (!user || !chapterContent) return null;
    return query(
      collection(firestore, 'users', user.uid, 'bibleHighlights'),
      where('book', '==', chapterContent.book),
      where('chapter', '==', chapterContent.chapter)
    );
  }, [user, firestore, chapterContent]);

  const { data: highlights } = useCollection<BibleHighlight>(highlightsQuery);
  
  const unfinishedHighlight = useMemo(() => highlights?.find(h => !h.note || h.note.trim() === ''), [highlights]);
  const activeHighlight = useMemo(() => highlights?.find(h => h.id === activeHighlightId) || null, [activeHighlightId, highlights]);
  
  useEffect(() => {
    if (activeHighlightId && activeNoteRef.current) {
        activeNoteRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeHighlightId]);

  const highlightsMap = useMemo(() => {
    const map = new Map<number, BibleHighlight>();
    highlights?.forEach(h => h.verses.forEach(v => map.set(v, h)));
    return map;
  }, [highlights]);
  
  useEffect(() => {
    if (!isOpen || !isInitialized) return;
    const fetchChapter = async () => {
      setIsLoadingChapter(true);
      setChapterError(null);
      setChapterContent(null);
      setIsScrolledToEnd(false);
      setSelectedVerses([]);
      setActiveHighlightId(null);
      setToolbarPos(null);
      try {
        const content = await getBibleChapter({ book: selectedBookName, chapter: selectedChapterNumber, version: selectedVersion });
        setChapterContent(content);
      } catch (error: any) { setChapterError(error.message || "Failed to load chapter."); }
      finally { setIsLoadingChapter(false); }
    };
    fetchChapter();
  }, [isOpen, isInitialized, selectedBookName, selectedChapterNumber, selectedVersion]);

  useLayoutEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (!viewport) return;
    viewport.scrollTop = 0;
    const checkScrollable = () => {
        if (!isLoadingChapter && chapterContent) {
            if (viewport.scrollHeight <= viewport.clientHeight) setIsScrolledToEnd(true);
        }
    };
    const timeoutId = setTimeout(checkScrollable, 100);
    return () => clearTimeout(timeoutId);
  }, [isLoadingChapter, chapterContent]);

  const handleMarkAsRead = async () => {
    if (!user || !firestore || !chapterContent) return;
    setIsSubmitting(true);
    const userRef = doc(firestore, 'users', user.uid);
    try {
        await updateDoc(userRef, { readingHistory: arrayUnion({ book: chapterContent.book, chapter: chapterContent.chapter, readAt: new Date() }) });
        toast({ title: 'Chapter Marked as Read' });
        const currentBookIndex = bibleData.findIndex(b => b.name === chapterContent.book);
        const currentBook = bibleData[currentBookIndex];
        if (chapterContent.chapter >= (currentBook?.chapters.length || 0)) {
            if (currentBookIndex < bibleData.length - 1) { setSelectedBookName(bibleData[currentBookIndex + 1].name); setSelectedChapterNumber(1); }
            else { toast({ title: 'Finished entire Bible!' }); onOpenChange(false); }
        } else { setSelectedChapterNumber(chapterContent.chapter + 1); }
    } catch (e) { console.error(e); }
    finally { setIsSubmitting(false); }
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (isScrolledToEnd) return;
    const target = event.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 5) setIsScrolledToEnd(true);
  };
  
    const handleDeleteHighlight = async (highlightId: string) => {
        if (!user || !firestore) return;
        deleteDoc(doc(firestore, 'users', user.uid, 'bibleHighlights', highlightId)).then(() => {
            if (activeHighlightId === highlightId) setActiveHighlightId(null);
        });
    };

    const handleVerseClick = (verseNumber: number) => {
        const existingHighlight = highlightsMap.get(verseNumber);
        if (existingHighlight) { setActiveHighlightId(existingHighlight.id); if (isMobile) setMobileTab('notes'); return; }
        if (unfinishedHighlight) { setActiveHighlightId(unfinishedHighlight.id); if (isMobile) setMobileTab('notes'); return; }

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
        } else if (newSelection.length === 0) setToolbarPos(null);
    };

    const handleSaveHighlight = async () => {
        if (!user || selectedVerses.length === 0 || !chapterContent || unfinishedHighlight) return;
        setIsProcessingHighlight(true);
        const newHighlightRef = doc(collection(firestore, 'users', user.uid, 'bibleHighlights'));
        await setDoc(newHighlightRef, { userId: user.uid, book: chapterContent.book, chapter: chapterContent.chapter, verses: selectedVerses, color: 'blue', createdAt: serverTimestamp(), note: '' });
        setSelectedVerses([]);
        setToolbarPos(null);
        setActiveHighlightId(newHighlightRef.id);
        if (isMobile) setMobileTab('notes');
        setIsProcessingHighlight(false);
    };
    
    const handleUpdateNote = async (highlightId: string, noteText: string) => {
        if (!user) return;
        await updateDoc(doc(firestore, 'users', user.uid, 'bibleHighlights', highlightId), { note: noteText, updatedAt: serverTimestamp() });
    };

    const handleGoToVerse = () => {
      const verseNum = parseInt(goToVerse, 10);
      if (!isNaN(verseNum) && chapterContent && verseNum > 0 && verseNum <= chapterContent.verses.length) {
          const verseElement = document.getElementById(`verse-${verseNum}`);
          verseElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setGoToVerse('');
      }
    };

    const filteredBibleData = useMemo(() => {
        if (!bookSearchTerm) return bibleData;
        return bibleData.filter(book => book.name.toLowerCase().includes(bookSearchTerm.toLowerCase()));
    }, [bookSearchTerm]);

    const handleSelectBook = (bookName: string) => { setSelectedBookName(bookName); setIsBookSheetOpen(false); }
    const handleSelectChapter = (chapter: number) => { setSelectedChapterNumber(chapter); setActiveHighlightId(null); setIsChapterSheetOpen(false); setIsChapterPopoverOpen(false); }
    const handleSelectVersion = (version: string) => { setSelectedVersion(version); setIsVersionSheetOpen(false); }
    
    const NotesList = (
        <div className="space-y-2 p-1 text-left">
            {highlights?.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)).map(h => h.id === activeHighlightId ? (
                <div key={h.id} ref={activeNoteRef}>
                    <NoteEditor highlight={h} onSave={handleUpdateNote} onDelete={handleDeleteHighlight} onCancel={() => setActiveHighlightId(null)} />
                </div>
            ) : (
                <Card key={h.id} onClick={() => setActiveHighlightId(h.id)} className={cn("cursor-pointer hover:shadow-lg transition-all text-left", getNoteCardClass(h.color))}>
                     <CardHeader className="p-2 flex flex-row items-center justify-between text-left">
                        <CardTitle className="text-sm font-medium truncate pr-2 text-left">{getVerseReference(h)}</CardTitle>
                    </CardHeader>
                </Card>
            ))}
        </div>
    );
    
    const ReaderContent = (
      <div className="flex flex-col gap-2 sm:gap-4 flex-grow min-h-0 text-left">
          <div className="relative flex-grow min-h-0 text-left">
               <div className="absolute top-2 right-2 z-10 flex items-center justify-end gap-2 px-2 sm:px-0">
                 <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setFontSize(f => f === 'sm' ? 'sm' : fontSizes[fontSizes.indexOf(f)-1] as any)}><Minus className="h-4 w-4" /></Button>
                 <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setFontSize(f => f === 'xl' ? 'xl' : fontSizes[fontSizes.indexOf(f)+1] as any)}><Plus className="h-4 w-4" /></Button>
               </div>
              <ScrollArea ref={scrollAreaRef} onScroll={handleScroll} className="h-full border rounded-md p-2 sm:p-4 pt-12 relative text-left">
                  {(isLoadingChapter || !isInitialized) && <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                  {!isLoadingChapter && isInitialized && !chapterError && chapterContent && (
                  <>
                    <div className={cn("space-y-1 font-serif text-left", fontSizeClasses[fontSize])}>
                        {chapterContent.verses.map(v => (
                                <p key={v.verse} id={`verse-${v.verse}`} className={cn('rounded-sm transition-colors -mx-1 px-1 py-0.5 sm:leading-relaxed cursor-pointer text-left', highlightsMap.get(v.verse) && getHighlightClass(highlightsMap.get(v.verse)!.color), selectedVerses.includes(v.verse) && 'bg-primary/20', activeHighlight?.verses.includes(v.verse) && 'ring-2 ring-primary')} onClick={() => handleVerseClick(v.verse)}>
                                    <sup className={cn("font-sans text-muted-foreground mr-1 text-left", subFontSizeClasses[fontSize])}>{v.verse}</sup>{v.text}
                                </p>
                        ))}
                    </div>
                    {selectedVerses.length > 0 && !unfinishedHighlight && toolbarPos && (
                        <div className="absolute z-30 transition-all pointer-events-none" style={{ top: `${toolbarPos.top}px`, left: `${toolbarPos.left}px`, transform: 'translate(-50%, -120%)' }}>
                            <Button size="default" className="shadow-xl pointer-events-auto" onClick={handleSaveHighlight} disabled={isProcessingHighlight}>
                                {isProcessingHighlight ? <Loader2 className="h-4 w-4 animate-spin" /> : <Highlighter className="mr-2 h-4 w-4" />}Highlight & Note
                            </Button>
                        </div>
                    )}
                  </>
                  )}
              </ScrollArea>
          </div>
           <div className="flex-shrink-0 pt-4 flex flex-col sm:flex-row gap-2 items-center justify-between text-left">
            {unfinishedHighlight && (
                <Card className="border-amber-500/50 bg-amber-500/5 p-3 w-full max-w-md"><div className="flex items-center justify-between gap-4"><p className="font-semibold text-sm">Note Required</p><Button size="sm" variant="outline" onClick={() => { setActiveHighlightId(unfinishedHighlight.id); if (isMobile) setMobileTab('notes'); }}>Go to Note</Button></div></Card>
            )}
            <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2">
                    <Input type="number" placeholder="Verse" value={goToVerse} onChange={(e) => setGoToVerse(e.target.value)} className="w-20 h-9" onKeyDown={(e) => e.key === 'Enter' && handleGoToVerse()} />
                    <Button onClick={handleGoToVerse} size="sm" variant="secondary">Go</Button>
                </div>
                <Button onClick={handleMarkAsRead} disabled={isSubmitting || isLoadingChapter || !isScrolledToEnd}>Mark as Read & Next</Button>
            </div>
          </div>
      </div>
    );
    
    const DialogBody = (
       <Tabs defaultValue="read" className="row-start-2 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="read">Read</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>
          <TabsContent value="read" className="flex-grow flex flex-col min-h-0 mt-4 gap-4">
              <div className="shrink-0">
                {!mounted || !isMobile ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Select value={selectedBookName} onValueChange={setSelectedBookName}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{bibleData.map(book => (<SelectItem key={book.name} value={book.name}>{book.name}</SelectItem>))}</SelectContent></Select>
                        <Popover open={isChapterPopoverOpen} onOpenChange={setIsChapterPopoverOpen}><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between">Chapter {selectedChapterNumber} <ChevronDown className="h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[300px] p-0 text-left"><ScrollArea className="h-72"><div className="grid grid-cols-8 gap-1 p-2">{selectedBook?.chapters.map(chapter => (<Button key={chapter.chapter} variant={chapter.chapter === selectedChapterNumber ? "default" : "outline"} size="sm" onClick={() => handleSelectChapter(chapter.chapter)}>{chapter.chapter}</Button>))}</div></ScrollArea></PopoverContent></Popover>
                        <Select value={selectedVersion} onValueChange={setSelectedVersion}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{bibleVersions.map(v => (<SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>))}</SelectContent></Select>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        <Sheet open={isBookSheetOpen} onOpenChange={setIsBookSheetOpen}><SheetTrigger asChild><Button variant="outline" className="truncate justify-between"><span className="truncate">{selectedBookName}</span><ChevronRight className="h-4 w-4 shrink-0 opacity-50" /></Button></SheetTrigger><SheetContent side="bottom" className="h-[90vh] flex flex-col text-left"><SheetHeader className="text-left"><SheetTitle>Select Book</SheetTitle></SheetHeader><Input placeholder="Search..." value={bookSearchTerm} onChange={(e) => setBookSearchTerm(e.target.value)} /><ScrollArea className="flex-grow">{filteredBibleData.map(book => (<Button key={book.name} variant="ghost" size="lg" className="w-full justify-start" onClick={() => handleSelectBook(book.name)}>{book.name}</Button>))}</ScrollArea></SheetContent></Sheet>
                        <Sheet open={isChapterSheetOpen} onOpenChange={setIsChapterSheetOpen}><SheetTrigger asChild><Button variant="outline" className="truncate justify-between"><span className="truncate">Chapter {selectedChapterNumber}</span><ChevronRight className="h-4 w-4 shrink-0 opacity-50" /></Button></SheetTrigger><SheetContent side="bottom" className="h-[90vh] flex flex-col text-left"><SheetHeader className="text-left"><SheetTitle>Select Chapter</SheetTitle></SheetHeader><ScrollArea className="flex-grow"><div className="grid grid-cols-5 gap-2 p-4">{selectedBook?.chapters.map(chapter => (<Button key={chapter.chapter} variant={chapter.chapter === selectedChapterNumber ? 'default' : 'outline'} size="icon" onClick={() => handleSelectChapter(chapter.chapter)}>{chapter.chapter}</Button>))}</div></ScrollArea></SheetContent></Sheet>
                        <Sheet open={isVersionSheetOpen} onOpenChange={setIsVersionSheetOpen}><SheetTrigger asChild><Button variant="outline" className="truncate justify-between"><span className="truncate">{selectedVersion.toUpperCase()}</span><ChevronRight className="h-4 w-4 shrink-0 opacity-50" /></Button></SheetTrigger><SheetContent side="bottom" className="h-auto text-left"><SheetHeader className="text-left"><SheetTitle>Version</SheetTitle></SheetHeader><div className="grid gap-2 py-4">{bibleVersions.map(v => (<Button key={v.id} variant={v.id === selectedVersion ? 'default' : 'ghost'} size="lg" className="w-full justify-start" onClick={() => handleSelectVersion(v.id)}>{v.name}</Button>))}</div></SheetContent></Sheet>
                    </div>
                )}
              </div>
            {!mounted || !isMobile ? (
                <div className="flex flex-col md:flex-row gap-6 flex-grow min-h-0 text-left">
                    <div className="flex flex-col md:w-2/3 min-h-0">{ReaderContent}</div>
                    <div className="hidden md:flex md:w-1/3 flex-col border rounded-md bg-muted/30 p-4"><h3 className="font-semibold mb-2">Notes</h3><ScrollArea className="flex-grow">{NotesList}</ScrollArea></div>
                </div>
            ) : (
                <Tabs value={mobileTab} onValueChange={setMobileTab} className="flex-grow flex flex-col min-h-0 mt-2 text-left">
                    <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="reader">Read</TabsTrigger><TabsTrigger value="notes">Notes</TabsTrigger></TabsList>
                    <TabsContent value="reader" className="flex-grow flex flex-col min-h-0 mt-2">{ReaderContent}</TabsContent>
                    <TabsContent value="notes" className="flex-grow min-h-0 mt-2"><ScrollArea className="h-full border rounded-md p-2 bg-muted/30">{NotesList}</ScrollArea></TabsContent>
                </Tabs>
            )}
          </TabsContent>
          <TabsContent value="history" className="flex-grow flex flex-col min-h-0 mt-4"><ScrollArea className="h-full"><div className="p-4 space-y-6 text-sm">{(userProfile?.readingHistory || []).map((item, idx) => (<div key={idx} className="flex items-center justify-between"><p>Read <span className="font-medium">{item.book} {item.chapter}</span></p><span className="text-muted-foreground">{item.readAt ? format(safeToDate(item.readAt)!, 'p') : 'N/A'}</span></div>))}</div></ScrollArea></TabsContent>
       </Tabs>
    );

    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl md:max-w-5xl lg:max-w-7xl max-h-[90dvh] grid grid-rows-[auto_1fr] gap-4 p-4 sm:p-6 text-left">
          <DialogHeader>
            <DialogTitle>Bible Reader</DialogTitle>
            <DialogDescription>Read and meditate on the Word.</DialogDescription>
          </DialogHeader>
          {DialogBody}
        </DialogContent>
      </Dialog>
    );
}

