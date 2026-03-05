
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../ui/card';
import { bibleData } from '@/lib/bible-data';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, updateDoc, arrayUnion, collection, query, where, addDoc, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore';
import type { UserProfile, ReadingHistoryItem, BibleHighlight } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, formatDistanceToNow } from 'date-fns';
import { Loader2, XCircle, BookOpen, Trash2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { getBibleChapter, type BibleChapterOutput } from '@/ai/flows/get-bible-chapter-flow';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { cn } from '@/lib/utils';


const bibleVersions = [
    { id: 'kjv', name: 'King James (KJV)' },
    { id: 'web', name: 'World English Bible (WEB)' },
    { id: 'bbe', name: 'Bible in Basic English' },
];

const highlightColors = ['yellow', 'green', 'blue', 'pink'];


// Helper function to format verse references
const getVerseReference = (h: { book: string; chapter: number; verses: number[] }) => {
    if (!h || !h.verses) return '';
    const verses = [...h.verses].sort((a, b) => a - b);
    if (verses.length === 0) return '';
    if (verses.length === 1) return `${h.book} ${h.chapter}:${verses[0]}`;
    // Find consecutive ranges
    const ranges: string[] = [];
    let start = verses[0];
    for (let i = 1; i < verses.length; i++) {
        if (verses[i] !== verses[i-1] + 1) {
            if (start === verses[i-1]) {
                ranges.push(`${start}`);
            } else {
                ranges.push(`${start}-${verses[i-1]}`);
            }
            start = verses[i];
        }
    }
    if (start === verses[verses.length-1]) {
        ranges.push(`${start}`);
    } else {
        ranges.push(`${start}-${verses[verses.length-1]}`);
    }
    return `${h.book} ${h.chapter}:${ranges.join(', ')}`;
};

// Internal component for the note editor
function NoteEditor({ highlight, onSave, onDelete, onCancel }: { highlight: BibleHighlight; onSave: (id: string, note: string) => Promise<void>; onDelete: (id: string) => Promise<void>; onCancel: () => void; }) {
  const [note, setNote] = useState(highlight.note || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleSave = async () => {
    setIsSaving(true);
    await onSave(highlight.id, note);
    setIsSaving(false);
    onCancel(); // Close editor on save
  }
  
  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(highlight.id);
    // This component will unmount, so no need to set loading to false
  }

  return (
    <Card className="bg-primary/5 border-primary/20 shadow-lg">
      <CardHeader className="p-4">
        <CardTitle className="text-base">Editing Note</CardTitle>
        <CardDescription>{getVerseReference(highlight)}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Textarea 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add your personal note..."
            rows={5}
            className="text-sm"
        />
      </CardContent>
      <CardFooter className="p-4 pt-0 justify-between">
          <AlertDialog>
             <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="mr-1 h-4 w-4 animate-spin"/> : <Trash2 className="mr-1 h-4 w-4"/>}
                    Delete
                </Button>
             </AlertDialogTrigger>
             <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this highlight?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently remove the highlight and its associated note.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Confirm</AlertDialogAction>
                </AlertDialogFooter>
             </AlertDialogContent>
          </AlertDialog>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving || note === (highlight.note || '')}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save
            </Button>
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

  // Highlighting state
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [isProcessingHighlight, setIsProcessingHighlight] = useState(false);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);

  const userDocRef = useMemo(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, loading: loadingProfile } = useDoc<UserProfile>(userDocRef);
  
  const selectedBook = useMemo(() => bibleData.find(b => b.name === selectedBookName), [selectedBookName]);
  
  const activeHighlight = useMemo(() => {
    if (!activeHighlightId || !highlights) return null;
    return highlights.find(h => h.id === activeHighlightId) || null;
  }, [activeHighlightId, highlights]);
  
  useEffect(() => {
    setSelectedChapterNumber(1);
    setActiveHighlightId(null);
  }, [selectedBookName]);

  const highlightsQuery = useMemo(() => {
    if (!user || !chapterContent) return null;
    return query(
      collection(firestore, 'users', user.uid, 'bibleHighlights'),
      where('book', '==', chapterContent.book),
      where('chapter', '==', chapterContent.chapter)
    );
  }, [user, firestore, chapterContent]);

  const { data: highlights } = useCollection<BibleHighlight>(highlightsQuery);

  const highlightsMap = useMemo(() => {
    const map = new Map<number, BibleHighlight>();
    if (!highlights) return map;

    highlights.forEach(highlight => {
      highlight.verses.forEach(verseNum => {
        map.set(verseNum, highlight);
      });
    });
    return map;
  }, [highlights]);

  useEffect(() => {
    if (!isOpen || !selectedBookName || !selectedChapterNumber) return;

    const fetchChapter = async () => {
      setIsLoadingChapter(true);
      setChapterError(null);
      setChapterContent(null);
      setIsScrolledToEnd(false);
      setSelectedVerses([]);
      setActiveHighlightId(null);

      try {
        const content = await getBibleChapter({
          book: selectedBookName,
          chapter: selectedChapterNumber,
          version: selectedVersion,
        });
        setChapterContent(content);
      } catch (error: any) {
        console.error(error);
        setChapterError(error.message || "Failed to load chapter. Please check your connection or API settings.");
      } finally {
        setIsLoadingChapter(false);
      }
    };

    fetchChapter();
  }, [isOpen, selectedBookName, selectedChapterNumber, selectedVersion]);

  useLayoutEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (!viewport) return;

    viewport.scrollTop = 0;
    
    const checkScrollable = () => {
        if (!isLoadingChapter && chapterContent) {
            if (viewport.scrollHeight <= viewport.clientHeight) {
                setIsScrolledToEnd(true);
            }
        }
    };
    
    const timeoutId = setTimeout(checkScrollable, 100);

    return () => clearTimeout(timeoutId);

  }, [isLoadingChapter, chapterContent]);

  const handleMarkAsRead = async () => {
    if (!user || !firestore || !chapterContent) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not mark as read. User or chapter content missing.' });
      return;
    }
    setIsSubmitting(true);
    
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        readingHistory: arrayUnion({
          book: chapterContent.book,
          chapter: chapterContent.chapter,
          readAt: new Date(),
        })
      });
      
      if (!completedToday.includes('read_bible')) {
        onDisciplineCompleted();
      }
      toast({ title: 'Chapter Marked as Read', description: `${''}${chapterContent.book} ${chapterContent.chapter} has been added to your history.`});
      
      const currentBookIndex = bibleData.findIndex(b => b.name === selectedBookName);
      const currentBook = bibleData[currentBookIndex];
      if (!currentBook) {
        setIsSubmitting(false);
        return;
      }

      const isLastChapter = selectedChapterNumber >= currentBook.chapters.length;

      if (isLastChapter) {
          const isLastBook = currentBookIndex >= bibleData.length - 1;
          if (!isLastBook) {
              const nextBook = bibleData[currentBookIndex + 1];
              setSelectedBookName(nextBook.name);
          } else {
              toast({ title: 'Congratulations!', description: 'You have finished reading the entire Bible!' });
              onOpenChange(false);
          }
      } else {
          setSelectedChapterNumber(prev => prev + 1);
      }

    } catch (error) {
      console.error("Failed to mark as read:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update your reading history.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedToday = useMemo(() => {
    if (!userProfile?.dailyDiscipline) return [];
    const lastUpdatedDate = userProfile.dailyDiscipline.lastUpdated?.toDate();
    if (lastUpdatedDate && new Date().toDateString() === lastUpdatedDate.toDateString()) {
      return userProfile.dailyDiscipline.completed || [];
    }
    return [];
  }, [userProfile]);
  
  const readingHistory = userProfile?.readingHistory || [];

  const historyGroups = useMemo(() => {
    if (readingHistory.length === 0) return [];
    
    const groups: { date: Date; items: ReadingHistoryItem[] }[] = [];
    
    readingHistory.forEach(item => {
      if (!item.readAt) return;
      const itemDate = item.readAt.toDate();
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && isSameDay(lastGroup.date, itemDate)) {
        lastGroup.items.push(item);
      } else {
        groups.push({ date: itemDate, items: [item] });
      }
    });
    return groups.reverse();
  }, [readingHistory]);

  const filteredHistoryGroups = useMemo(() => {
    if (!historyGroups) return [];
    if (!filterDate) return historyGroups;
    return historyGroups.filter(group => isSameDay(group.date, filterDate));
  }, [historyGroups, filterDate]);


  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (isScrolledToEnd) return;
    const target = event.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 5) {
      setIsScrolledToEnd(true);
    }
  };
  
    const getHighlightClass = (color?: string) => {
        if (!color) return '';
        return `highlight-${color}`;
    };

    const handleVerseClick = (verseNumber: number) => {
        if (activeHighlightId) return;

        const existingHighlight = highlightsMap.get(verseNumber);

        if (existingHighlight) {
            setActiveHighlightId(existingHighlight.id);
            setSelectedVerses([]);
            return;
        }

        setSelectedVerses(prev =>
            prev.includes(verseNumber)
                ? prev.filter(v => v !== verseNumber)
                : [...prev, verseNumber].sort((a, b) => a - b)
        );
    };

    const handleSaveHighlight = async (color: string) => {
        if (!user || !firestore || selectedVerses.length === 0 || !chapterContent) return;

        setIsProcessingHighlight(true);
        try {
            const newHighlightRef = doc(collection(firestore, 'users', user.uid, 'bibleHighlights'));
            
            await setDoc(newHighlightRef, {
                userId: user.uid,
                book: chapterContent.book,
                chapter: chapterContent.chapter,
                verses: selectedVerses,
                color: color,
                createdAt: serverTimestamp(),
                note: '',
            });
            
            setActiveHighlightId(newHighlightRef.id);
            setSelectedVerses([]);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save highlight.' });
        } finally {
            setIsProcessingHighlight(false);
        }
    };
    
    const handleUpdateNote = async (highlightId: string, noteText: string) => {
        if (!user || !firestore) return;
        try {
            const highlightRef = doc(firestore, 'users', user.uid, 'bibleHighlights', highlightId);
            await updateDoc(highlightRef, { note: noteText, updatedAt: serverTimestamp() });
            toast({ title: 'Note Saved' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save note.' });
        }
    };

    const handleDeleteHighlight = async (highlightId: string) => {
        if (!user || !firestore) return;
        try {
            await deleteDoc(doc(firestore, 'users', user.uid, 'bibleHighlights', highlightId));
            toast({ title: 'Highlight Removed' });
            if (activeHighlightId === highlightId) {
                setActiveHighlightId(null);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not remove highlight.' });
        }
    };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Read the Bible
             {chapterContent?.translation && <span className="text-muted-foreground text-sm font-normal ml-2">({chapterContent.translation})</span>}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="read" className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="read">Read</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="read" className="flex-grow flex flex-col min-h-0 mt-4 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select value={selectedBookName} onValueChange={setSelectedBookName}>
                    <SelectTrigger><SelectValue placeholder="Select a book" /></SelectTrigger>
                    <SelectContent>
                        {bibleData.map(book => (
                            <SelectItem key={book.name} value={book.name}>{book.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={String(selectedChapterNumber)} onValueChange={(val) => { setSelectedChapterNumber(Number(val)); setActiveHighlightId(null); }}>
                    <SelectTrigger><SelectValue placeholder="Select a chapter" /></SelectTrigger>
                    <SelectContent>
                        {selectedBook?.chapters.map(chapter => (
                            <SelectItem key={chapter.chapter} value={String(chapter.chapter)}>Chapter {chapter.chapter}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                  <SelectTrigger><SelectValue placeholder="Select a version" /></SelectTrigger>
                  <SelectContent>
                      {bibleVersions.map(version => (
                          <SelectItem key={version.id} value={version.id}>
                            {version.name}
                          </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow min-h-0">
                <div className="md:col-span-2 flex flex-col gap-4 min-h-0">
                    <div className="relative flex-grow min-h-0">
                        <ScrollArea ref={scrollAreaRef} onScroll={handleScroll} className="h-full border rounded-md p-4">
                            {isLoadingChapter && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                            )}
                            {chapterError && !isLoadingChapter && (
                            <div className="absolute inset-0 flex items-center justify-center p-4">
                                <div className="text-center text-destructive bg-destructive/10 border border-destructive/50 p-4 rounded-md">
                                <p className="font-semibold">Error Loading Chapter</p>
                                <p className="text-sm">{chapterError}</p>
                                </div>
                            </div>
                            )}
                            {!isLoadingChapter && !chapterError && chapterContent && (
                            <div className="space-y-4 text-lg leading-relaxed font-serif">
                                {chapterContent.verses.map(v => {
                                        const verseNum = v.verse;
                                        const isSelected = selectedVerses.includes(verseNum);
                                        const highlightInfo = highlightsMap.get(verseNum);
                                        const isActiveHighlight = activeHighlight?.verses.includes(verseNum) ?? false;
                                        return (
                                            <p
                                                key={verseNum}
                                                className={cn(
                                                    'rounded-md transition-colors -mx-2 px-2 py-1',
                                                    highlightInfo && getHighlightClass(highlightInfo.color),
                                                    isSelected && 'verse-selected',
                                                    isActiveHighlight && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                                                    'cursor-pointer'
                                                )}
                                                onClick={() => handleVerseClick(verseNum)}
                                            >
                                                <sup className="text-sm font-sans text-muted-foreground mr-2 select-none">{v.verse}</sup>
                                                {v.text}
                                            </p>
                                        )
                                })}
                            </div>
                            )}
                        </ScrollArea>
                        {selectedVerses.length > 0 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-auto z-10">
                                <div className="flex items-center gap-2 p-2 rounded-full border bg-background shadow-lg">
                                    {highlightColors.map(color => (
                                        <Button key={color} variant="outline" size="icon" className="rounded-full" onClick={() => handleSaveHighlight(color)} disabled={isProcessingHighlight}>
                                            <div className={cn("h-5 w-5 rounded-full", getHighlightClass(color))} />
                                        </Button>
                                    ))}
                                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedVerses([])}>
                                        <XCircle className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={handleMarkAsRead} disabled={isSubmitting || isLoadingChapter || !!chapterError || !isScrolledToEnd}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Mark as Read & Next Chapter
                        </Button>
                    </DialogFooter>
                </div>
                
                <div className="md:col-span-1 flex flex-col gap-4 h-full">
                    <h3 className="text-lg font-semibold tracking-tight">Notes for {chapterContent?.book} {chapterContent?.chapter}</h3>
                    <ScrollArea className="flex-grow h-full border rounded-md p-2">
                        <div className="space-y-4 p-2">
                            {activeHighlight && (
                                <NoteEditor 
                                    highlight={activeHighlight} 
                                    onSave={handleUpdateNote} 
                                    onDelete={handleDeleteHighlight}
                                    onCancel={() => setActiveHighlightId(null)} 
                                />
                            )}

                            {highlights && highlights
                                .filter(h => h.id !== activeHighlightId)
                                .sort((a, b) => a.createdAt.seconds - b.createdAt.seconds)
                                .map(h => (
                                    <Card key={h.id} onClick={() => setActiveHighlightId(h.id)} className={cn("cursor-pointer hover:bg-muted/50", getHighlightClass(h.color), 'bg-opacity-20 dark:bg-opacity-10')}>
                                    <CardHeader className="p-3">
                                        <CardTitle className="text-sm">{getVerseReference(h)}</CardTitle>
                                        {h.updatedAt && <CardDescription className="text-xs">Updated {formatDistanceToNow(h.updatedAt.toDate(), {addSuffix: true})}</CardDescription>}
                                    </CardHeader>
                                    {h.note && (
                                        <CardContent className="p-3 pt-0">
                                        <p className="text-sm text-muted-foreground line-clamp-3">{h.note}</p>
                                        </CardContent>
                                    )}
                                    </Card>
                                ))}

                            {highlights?.length === 0 && (
                                <div className="text-center text-muted-foreground py-10">
                                    <p>No notes for this chapter.</p>
                                    <p className="text-xs mt-1">Highlight some text to get started.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="flex-grow flex flex-col min-h-0 mt-4 space-y-4">
            <div className="flex items-center gap-2">
                <Input
                    type="date"
                    value={filterDate ? format(filterDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                        if (e.target.value) {
                            const [year, month, day] = e.target.value.split('-').map(Number);
                            setFilterDate(new Date(year, month - 1, day));
                        } else {
                            setFilterDate(undefined);
                        }
                    }}
                    className="flex-grow"
                />
                {filterDate && (
                    <Button variant="ghost" size="icon" onClick={() => setFilterDate(undefined)}>
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                        <span className="sr-only">Clear date filter</span>
                    </Button>
                )}
            </div>
             <ScrollArea className="flex-grow border rounded-md">
                {loadingProfile && (
                  <div className="space-y-6 p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </div>
                )}
                {!loadingProfile && filteredHistoryGroups.length === 0 && (
                  <div className="text-muted-foreground p-8 text-center">
                    {readingHistory.length === 0 ? 'Your reading history is empty.' : 'No entries found for the selected date.'}
                  </div>
                )}
                {!loadingProfile && filteredHistoryGroups.length > 0 && (
                  <div className="p-4">
                    {filteredHistoryGroups.map(group => (
                        <div key={group.date.toISOString()}>
                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-background px-3 text-sm font-semibold text-muted-foreground">{format(group.date, 'PPP')}</span>
                                </div>
                            </div>
                            <div className="mt-6 flow-root">
                                <ul className="-mb-8">
                                    {group.items.map((item, itemIdx) => (
                                        <li key={itemIdx}>
                                            <div className="relative pb-8">
                                                {itemIdx !== group.items.length - 1 ? (
                                                    <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-border" aria-hidden="true" />
                                                ) : null}
                                                <div className="relative flex items-start space-x-3">
                                                    <div>
                                                        <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center ring-8 ring-background">
                                                            <BookOpen className="h-5 w-5 text-primary" />
                                                        </span>
                                                    </div>
                                                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">
                                                                Read <span className="font-medium text-foreground">{item.book} {item.chapter}</span>
                                                            </p>
                                                        </div>
                                                        <div className="whitespace-nowrap text-right text-sm text-muted-foreground">
                                                            <time dateTime={item.readAt.toDate().toISOString()}>
                                                                {item.readAt ? format(item.readAt.toDate(), 'p') : ''}
                                                            </time>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                  </div>
                )}
             </ScrollArea>
          </TabsContent>
        </Tabs>

      </DialogContent>
    </Dialog>
  );
}
