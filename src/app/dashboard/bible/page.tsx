'use client';

import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from 'lucide-react';
import { getBibleChapter, type BibleChapterOutput } from '@/ai/flows/get-bible-chapter-flow';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn, safeToDate } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

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
    <Card className={cn("bg-card border shadow-lg", getNoteCardClass(highlight.color))}>
      <CardHeader className="p-3">
        <CardTitle className="text-base">Editing Note</CardTitle>
        <CardDescription>{getVerseReference(highlight)}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0">
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
                <AlertDialogHeader><AlertDialogTitle>Delete highlight?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive">Confirm</AlertDialogAction></AlertDialogFooter>
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
  const [isChapterPopoverOpen, setIsChapterPopoverOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('reader');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('sm');
  const [historyFilterDate, setHistoryFilterDate] = useState<Date | undefined>();

  const fontSizeClasses = { sm: 'text-xs sm:text-sm', base: 'text-sm sm:text-base', lg: 'text-base sm:text-lg', xl: 'text-lg sm:text-xl' };
  const subFontSizeClasses = { sm: 'text-xs', base: 'text-xs', lg: 'text-sm', xl: 'text-sm' };

  const userDocRef = useMemo(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);
  
  const selectedBook = useMemo(() => bibleData.find(b => b.name === selectedBookName), [selectedBookName]);

  useEffect(() => {
    if (userProfile && !mounted) {
      if (userProfile.readingHistory?.length) {
        const lastRead = [...userProfile.readingHistory].sort((a, b) => (safeToDate(b.readAt)?.getTime() ?? 0) - (safeToDate(a.readAt)?.getTime() ?? 0))[0];
        if (lastRead) {
          setSelectedBookName(lastRead.book);
          setSelectedChapterNumber(lastRead.chapter);
        }
      }
      setMounted(true);
    }
  }, [userProfile, mounted]);

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
    if (!selectedBookName || !selectedChapterNumber) return;
    const fetchChapter = async () => {
      setIsLoadingChapter(true);
      setChapterError(null);
      setChapterContent(null);
      setSelectedVerses([]);
      setActiveHighlightId(null);
      setToolbarPos(null);
      try {
        const content = await getBibleChapter({ book: selectedBookName, chapter: selectedChapterNumber, version: selectedVersion });
        setChapterContent(content);
      } catch (error: any) { setChapterError(error.message || "Failed to load."); }
      finally { setIsLoadingChapter(false); }
    };
    fetchChapter();
  }, [selectedBookName, selectedChapterNumber, selectedVersion]);

  const handleMarkAsRead = async () => {
    if (!user || !chapterContent) return;
    setIsSubmitting(true);
    const userRef = doc(firestore, 'users', user.uid);
    try {
        await updateDoc(userRef, { readingHistory: arrayUnion({ book: chapterContent.book, chapter: chapterContent.chapter, readAt: new Date() }) });
        const currentBookIndex = bibleData.findIndex(b => b.name === chapterContent.book);
        const currentBook = bibleData[currentBookIndex];
        if (chapterContent.chapter >= (currentBook?.chapters.length || 0)) {
            if (currentBookIndex < bibleData.length - 1) { setSelectedBookName(bibleData[currentBookIndex + 1].name); setSelectedChapterNumber(1); }
            else { toast({ title: 'Finished entire Bible!' }); router.back(); }
        } else { setSelectedChapterNumber(chapterContent.chapter + 1); }
    } catch (e) { console.error(e); }
    finally { setIsSubmitting(false); }
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
                setToolbarPos({ 
                    top: rect.top - vRect.top + viewport.scrollTop, 
                    left: rect.left - vRect.left + rect.width / 2 
                });
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

    const readingHistoryList = userProfile?.readingHistory || [];
    const historyGroups = useMemo(() => {
        const groups: { date: Date; items: ReadingHistoryItem[] }[] = [];
        readingHistoryList.forEach(item => {
            const itemDate = safeToDate(item.readAt);
            if (!itemDate) return;
            
            // Apply history filter if set
            if (historyFilterDate && !isSameDay(itemDate, historyFilterDate)) {
                return;
            }

            const lastGroup = groups[groups.length - 1];
            if (lastGroup && isSameDay(lastGroup.date, itemDate)) lastGroup.items.push(item);
            else groups.push({ date: itemDate, items: [item] });
        });
        return groups.reverse();
    }, [readingHistoryList, historyFilterDate]);

    const NotesList = (
        <div className="space-y-4 p-1">
            {highlights?.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)).map(h => h.id === activeHighlightId ? (
                <NoteEditor key={h.id} highlight={h} onSave={handleUpdateNote} onDelete={(id) => deleteDoc(doc(firestore, 'users', user!.uid, 'bibleHighlights', id)).then(() => setActiveHighlightId(null))} onCancel={() => setActiveHighlightId(null)} />
            ) : (
                <Card key={h.id} onClick={() => setActiveHighlightId(h.id)} className={cn("cursor-pointer hover:bg-muted/50", getNoteCardClass(h.color))}>
                    <CardHeader className="p-3"><CardTitle className="text-sm">{getVerseReference(h)}</CardTitle></CardHeader>
                    {h.note && <CardContent className="p-3 pt-0"><p className="text-xs italic line-clamp-2">{h.note}</p></CardContent>}
                </Card>
            ))}
        </div>
    );
    
    const ReaderContent = (
      <div className="flex flex-col gap-4 h-full min-h-0">
          <div className="flex items-center justify-end gap-2 shrink-0">
                 <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setFontSize(f => f === 'xl' ? 'xl' : fontSizes[fontSizes.indexOf(f)+1] as any)}><Plus className="h-4 w-4" /></Button>
                 <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setFontSize(f => f === 'sm' ? 'sm' : fontSizes[fontSizes.indexOf(f)-1] as any)}><Minus className="h-4 w-4" /></Button>
          </div>
          <ScrollArea ref={scrollAreaRef} className="flex-grow border rounded-md p-4 relative">
                  {isLoadingChapter && <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20"><Loader2 className="h-8 w-8 animate-spin" /></div>}
                  {!isLoadingChapter && chapterContent && (
                    <>
                        <div className={cn("space-y-2 font-serif leading-relaxed", fontSizeClasses[fontSize])}>
                            {chapterContent.verses.map(v => (
                                <p key={v.verse} id={`verse-${v.verse}`} className={cn('rounded px-1 py-1 cursor-pointer transition-colors', highlightsMap.get(v.verse) && getHighlightClass(highlightsMap.get(v.verse)!.color), selectedVerses.includes(v.verse) && 'bg-primary/20', activeHighlight?.verses.includes(v.verse) && 'ring-2 ring-primary')} onClick={() => handleVerseClick(v.verse)}>
                                    <sup className={cn("mr-1 text-muted-foreground", subFontSizeClasses[fontSize])}>{v.verse}</sup>{v.text}
                                </p>
                            ))}
                        </div>
                        {selectedVerses.length > 0 && toolbarPos && (
                            <div className="absolute z-30 transition-all pointer-events-none" style={{ top: `${toolbarPos.top}px`, left: `${toolbarPos.left}px`, transform: 'translate(-50%, -120%)' }}>
                                <Button size="sm" className="pointer-events-auto shadow-xl" onClick={handleSaveHighlight} disabled={isProcessingHighlight}>{isProcessingHighlight ? <Loader2 className="h-4 w-4 animate-spin" /> : <Highlighter className="mr-2 h-4 w-4" />}Highlight & Note</Button>
                            </div>
                        )}
                        <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-between pb-10">
                              {unfinishedHighlight && <Card className="border-amber-500/50 bg-amber-500/10 p-3 w-full sm:w-auto"><div className="flex items-center gap-3"><p className="text-sm font-semibold">Note Required</p><Button size="sm" onClick={() => setActiveHighlightId(unfinishedHighlight.id)}>Go to Note</Button></div></Card>}
                              <Button onClick={handleMarkAsRead} disabled={isSubmitting} className="w-full sm:w-auto">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Mark as Read & Next</Button>
                        </div>
                    </>
                  )}
          </ScrollArea>
      </div>
    );
    
    const fontSizes = ['sm', 'base', 'lg', 'xl'];

    function handleSelectChapter(chapter: number) {
        setSelectedChapterNumber(chapter);
        setIsChapterPopoverOpen(false);
    }

    return (
        <div className="h-dvh flex flex-col p-4">
            <div className="shrink-0 flex items-center gap-4 mb-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
                 <h1 className="text-xl font-bold">Bible Reader {chapterContent?.translation && <span className="text-muted-foreground text-sm font-normal">({chapterContent.translation})</span>}</h1>
            </div>
            <Tabs defaultValue="read" className="flex-grow flex flex-col min-h-0">
                <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="read">Read</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>
                <TabsContent value="read" className="flex-grow flex flex-col min-h-0 mt-4 overflow-hidden">
                    <div className="grid grid-cols-3 gap-2 shrink-0 mb-4">
                        <Select value={selectedBookName} onValueChange={setSelectedBookName}>
                            <SelectTrigger className="truncate"><SelectValue /></SelectTrigger>
                            <SelectContent>{bibleData.map(b => <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Popover open={isChapterPopoverOpen} onOpenChange={setIsChapterPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-between">
                                Chapter {selectedChapterNumber}
                                <ChevronDown className="h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                              <ScrollArea className="h-72">
                                <div className="grid grid-cols-8 gap-1 p-2">
                                  {selectedBook?.chapters.map(c => (
                                    <Button key={c.chapter} variant={c.chapter === selectedChapterNumber ? "default" : "outline"} size="sm" onClick={() => handleSelectChapter(c.chapter)}>{c.chapter}</Button>
                                  ))}
                                </div>
                              </ScrollArea>
                            </PopoverContent>
                        </Popover>
                        <Select value={selectedVersion} onValueChange={setSelectedVersion}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{bibleVersions.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="flex-grow flex-col md:flex-row flex gap-6 min-h-0 overflow-hidden">
                        <div className="flex-grow min-h-0">{ReaderContent}</div>
                        <div className="hidden md:flex md:w-1/3 flex-col border rounded-md bg-muted/30 p-4 min-h-0"><h3 className="font-semibold mb-2">My Journal</h3><ScrollArea className="flex-grow">{NotesList}</ScrollArea></div>
                    </div>
                    {isMobile && <div className={cn("md:hidden mt-4 shrink-0", mobileTab === 'notes' ? "flex-grow" : "h-12")}><Tabs value={mobileTab} onValueChange={setMobileTab} className="h-full flex flex-col"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="reader">Read</TabsTrigger><TabsTrigger value="notes">Notes ({highlights?.length || 0})</TabsTrigger></TabsList><TabsContent value="notes" className="flex-grow min-h-0 mt-2"><ScrollArea className="h-full border rounded p-2 bg-muted/30">{NotesList}</ScrollArea></TabsContent></Tabs></div>}
                </TabsContent>
                <TabsContent value="history" className="flex-grow flex flex-col min-h-0 mt-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex-grow flex items-center gap-2">
                          <Input
                              type="date"
                              value={historyFilterDate ? format(historyFilterDate, "yyyy-MM-dd") : ""}
                              onChange={(e) => {
                                  const val = e.target.value;
                                  if (val) {
                                      const [year, month, day] = val.split('-').map(Number);
                                      setHistoryFilterDate(new Date(year, month - 1, day));
                                  } else {
                                      setHistoryFilterDate(undefined);
                                  }
                              }}
                              className="flex-grow"
                          />
                          {historyFilterDate && (
                              <Button variant="ghost" size="icon" onClick={() => setHistoryFilterDate(undefined)}>
                                  <XCircle className="h-5 w-5 text-muted-foreground" />
                              </Button>
                          )}
                        </div>
                    </div>
                    <ScrollArea className="h-full">
                        <div className="p-4 pt-0 space-y-8">
                            {historyGroups.length > 0 ? historyGroups.map(g => (
                                <div key={g.date.toISOString()} className="space-y-4">
                                    <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div><div className="relative flex justify-center"><span className="bg-background px-3 text-sm font-semibold text-muted-foreground">{format(g.date, 'PPP')}</span></div></div>
                                    <ul className="space-y-4">{g.items.map((i, idx) => <li key={idx} className="flex items-center gap-3"><BookOpen className="h-4 w-4 text-primary" /><p className="text-sm">Read <span className="font-medium">{i.book} {i.chapter}</span> at {format(safeToDate(i.readAt)!, 'p')}</p></li>)}</ul>
                                </div>
                            )) : (
                                <div className="text-center py-12 text-muted-foreground italic">
                                    {historyFilterDate ? "No history found for this date." : "Your reading history will appear here."}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );
}