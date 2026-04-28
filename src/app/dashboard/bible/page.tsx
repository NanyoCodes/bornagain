
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
  addDoc,
  serverTimestamp,
  deleteDoc,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import type { UserProfile, ReadingHistoryItem, BibleHighlight } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, isToday } from 'date-fns';
import {
  Loader2,
  XCircle,
  BookOpen,
  Trash2,
  ChevronRight,
  Minus,
  Plus,
  Highlighter,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getBibleChapter, type BibleChapterOutput } from '@/ai/flows/get-bible-chapter-flow';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

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
    <Card className={cn("bg-card border shadow-lg", getNoteCardClass(highlight.color))}>
      <CardHeader className="p-3">
        <CardTitle className="text-base">Editing Note</CardTitle>
        <CardDescription>{getVerseReference(highlight)}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <Textarea 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add your personal note to this highlight..."
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
                    <AlertDialogTitle>Delete this highlight?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently remove the highlight and its associated note.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Confirm</AlertDialogAction>
                </AlertDialogFooter>
             </AlertDialogContent>
          </AlertDialog>
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving || note.trim() === (highlight.note || '')}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save
            </Button>
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

  const [isScrolledToEnd, setIsScrolledToEnd] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [filterDate, setFilterDate] = useState<Date | undefined>();

  // Highlighting state
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [isProcessingHighlight, setIsProcessingHighlight] = useState(false);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
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
  const { data: userProfile, loading: loadingProfile } = useDoc<UserProfile>(userDocRef);
  
  const selectedBook = useMemo(() => bibleData.find(b => b.name === selectedBookName), [selectedBookName]);

  useEffect(() => {
    if (userProfile) {
      if (userProfile.readingHistory && userProfile.readingHistory.length > 0) {
        // Sort history to find the most recent entry
        const lastRead = [...userProfile.readingHistory].sort((a, b) => {
          const timeA = a.readAt?.toDate?.().getTime() ?? 0;
          const timeB = b.readAt?.toDate?.().getTime() ?? 0;
          return timeB - timeA;
        })[0];
        
        if (lastRead) {
          setSelectedBookName(lastRead.book);
          setSelectedChapterNumber(lastRead.chapter);
        }
      } else {
        // If no history, default to Genesis 1 when dialog is opened
        setSelectedBookName(bibleData[0].name);
        setSelectedChapterNumber(1);
      }
    }
  }, [userProfile]);

  const highlightsQuery = useMemo(() => {
    if (!user || !chapterContent) return null;
    return query(
      collection(firestore, 'users', user.uid, 'bibleHighlights'),
      where('book', '==', chapterContent.book),
      where('chapter', '==', chapterContent.chapter)
    );
  }, [user, firestore, chapterContent]);

  const { data: highlights } = useCollection<BibleHighlight>(highlightsQuery);
  
  const unfinishedHighlight = useMemo(() => {
    if (!highlights) return null;
    return highlights.find(h => !h.note || h.note.trim() === '');
  }, [highlights]);

  const activeHighlight = useMemo(() => {
    if (!activeHighlightId || !highlights) return null;
    return highlights.find(h => h.id === activeHighlightId) || null;
  }, [activeHighlightId, highlights]);
  
  useEffect(() => {
    if (activeHighlightId && activeNoteRef.current) {
        activeNoteRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeHighlightId]);

  useEffect(() => {
    setSelectedChapterNumber(1);
    setActiveHighlightId(null);
  }, [selectedBookName]);

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
    if (!selectedBookName || !selectedChapterNumber) return;

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
  }, [selectedBookName, selectedChapterNumber, selectedVersion]);

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
    if (!user || !firestore || !chapterContent || !userProfile) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not mark as read. User, profile, or chapter content missing.' });
      return;
    }
    setIsSubmitting(true);
    
    try {
        const userRef = doc(firestore, 'users', user.uid);
        
        // --- Update Reading History ---
        const historyUpdatePayload = {
          readingHistory: arrayUnion({
            book: chapterContent.book,
            chapter: chapterContent.chapter,
            readAt: new Date(),
          })
        };
        await updateDoc(userRef, historyUpdatePayload);
        
        // --- Update Daily Discipline ---
        const lastUpdatedDate = userProfile.dailyDiscipline?.lastUpdated?.toDate();
        const alreadyCompletedToday = lastUpdatedDate && isToday(lastUpdatedDate) && userProfile.dailyDiscipline?.completed?.includes('read_bible');

        if (!alreadyCompletedToday) {
            const completedToday = (lastUpdatedDate && isToday(lastUpdatedDate)) ? userProfile.dailyDiscipline?.completed || [] : [];
            const newCompleted = [...completedToday, 'read_bible'];
            const today = new Date();
            const dateString = format(today, 'yyyy-MM-dd');
    
            const batch = writeBatch(firestore);
            const disciplineUpdateData = {
              dailyDiscipline: {
                completed: newCompleted,
                lastUpdated: serverTimestamp(),
              },
            };
            batch.update(userRef, disciplineUpdateData);
    
            const historyRef = doc(firestore, 'users', user.uid, 'disciplineHistory', dateString);
            batch.set(historyRef, {
                completed: newCompleted,
                date: serverTimestamp()
            }, { merge: true });
            
            await batch.commit();
        }

        toast({ title: 'Chapter Marked as Read', description: `${chapterContent.book} ${chapterContent.chapter} has been added to your history.`});
        
        // --- Navigate to next chapter ---
        const currentBookIndex = bibleData.findIndex(b => b.name === selectedBookName);
        const currentBook = bibleData[currentBookIndex];
        if (!currentBook) return;
        const isLastChapter = selectedChapterNumber >= currentBook.chapters.length;

        if (isLastChapter) {
            const isLastBook = currentBookIndex >= bibleData.length - 1;
            if (!isLastBook) {
                const nextBook = bibleData[currentBookIndex + 1];
                setSelectedBookName(nextBook.name);
            } else {
                toast({ title: 'Congratulations!', description: 'You have finished reading the entire Bible!' });
                router.back();
            }
        } else {
            setSelectedChapterNumber(prev => prev + 1);
        }
    } catch (error) {
        const permissionError = new FirestorePermissionError({
            path: `users/${user.uid}`,
            operation: 'update',
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsSubmitting(false);
    }
  };

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
  
    const handleDeleteHighlight = async (highlightId: string) => {
        if (!user || !firestore) return;
        const highlightRef = doc(firestore, 'users', user.uid, 'bibleHighlights', highlightId);
        deleteDoc(highlightRef)
            .then(() => {
                 toast({ title: 'Highlight Removed' });
                if (activeHighlightId === highlightId) {
                    setActiveHighlightId(null);
                }
            })
            .catch(() => {
                const permissionError = new FirestorePermissionError({
                    path: highlightRef.path,
                    operation: 'delete'
                }, user);
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    const handleVerseClick = (verseNumber: number) => {
        const verseElement = document.getElementById(`verse-${verseNumber}`);
        verseElement?.classList.add('verse-selected');
        setTimeout(() => {
            verseElement?.classList.remove('verse-selected');
        }, 1500);

        const existingHighlight = highlightsMap.get(verseNumber);

        if (existingHighlight) {
            setActiveHighlightId(existingHighlight.id);
            if (isMobile) {
                setMobileTab('notes');
            }
            return;
        }

        if (unfinishedHighlight) {
            toast({
                variant: "default",
                title: "Finish Your Note",
                description: "Please add a note to your previous highlight before creating another.",
            });
            setActiveHighlightId(unfinishedHighlight.id);
            if (isMobile) {
                setMobileTab('notes');
            }
            return;
        }

        setSelectedVerses(prev =>
            prev.includes(verseNumber)
                ? prev.filter(v => v !== verseNumber)
                : [...prev, verseNumber].sort((a, b) => a - b)
        );
    };

    const handleSaveHighlight = async () => {
        if (!user || !firestore || selectedVerses.length === 0 || !chapterContent || unfinishedHighlight) return;

        setIsProcessingHighlight(true);
        const newHighlightRef = doc(collection(firestore, 'users', user.uid, 'bibleHighlights'));
        const newHighlightData = {
            userId: user.uid,
            book: chapterContent.book,
            chapter: chapterContent.chapter,
            verses: selectedVerses,
            color: 'blue',
            createdAt: serverTimestamp(),
            note: '',
        };

        setDoc(newHighlightRef, newHighlightData)
            .then(() => {
                setSelectedVerses([]);
                setActiveHighlightId(newHighlightRef.id);
                if (isMobile) {
                    setMobileTab('notes');
                }
            })
            .catch(() => {
                const permissionError = new FirestorePermissionError({
                    path: newHighlightRef.path,
                    operation: 'create',
                    requestResourceData: newHighlightData
                }, user);
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsProcessingHighlight(false);
            });
    };
    
    const handleUpdateNote = async (highlightId: string, noteText: string) => {
        if (!user || !firestore) return;

        const highlightRef = doc(firestore, 'users', user.uid, 'bibleHighlights', highlightId);
        const payload = { note: noteText, updatedAt: serverTimestamp() };

        return updateDoc(highlightRef, payload)
            .then(() => {
                toast({ title: 'Note Saved' });
            })
            .catch(() => {
                const permissionError = new FirestorePermissionError({
                    path: highlightRef.path,
                    operation: 'update',
                    requestResourceData: payload
                }, user);
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    const handleGoToVerse = () => {
      const verseNum = parseInt(goToVerse, 10);
      if (!isNaN(verseNum) && chapterContent && verseNum > 0 && verseNum <= chapterContent.verses.length) {
          const verseElement = document.getElementById(`verse-${verseNum}`);
          verseElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          verseElement?.classList.add('verse-selected');
          setTimeout(() => {
              verseElement?.classList.remove('verse-selected');
          }, 1500);

          setGoToVerse('');
      } else {
          toast({ variant: 'destructive', title: 'Invalid Verse', description: 'Please enter a valid verse number for this chapter.' });
      }
    };


    useEffect(() => {
        setMounted(true);
    }, []);

    const filteredBibleData = useMemo(() => {
        if (!bookSearchTerm) return bibleData;
        return bibleData.filter(book => book.name.toLowerCase().includes(bookSearchTerm.toLowerCase()));
    }, [bookSearchTerm]);

    const handleSelectBook = (bookName: string) => {
        setSelectedBookName(bookName);
        setIsBookSheetOpen(false);
    }
    const handleSelectChapter = (chapter: number) => {
        setSelectedChapterNumber(chapter);
        setActiveHighlightId(null);
        setIsChapterSheetOpen(false);
        setIsChapterPopoverOpen(false);
    }
    const handleSelectVersion = (version: string) => {
        setSelectedVersion(version);
        setIsVersionSheetOpen(false);
    }
    
    const increaseFontSize = () => {
        const currentIndex = fontSizes.indexOf(fontSize);
        if (currentIndex < fontSizes.length - 1) {
            setFontSize(fontSizes[currentIndex + 1]);
        }
    };
    
    const decreaseFontSize = () => {
        const currentIndex = fontSizes.indexOf(fontSize);
        if (currentIndex > 0) {
            setFontSize(fontSizes[currentIndex - 1]);
        }
    };

    const NotesList = (
        <div className="space-y-2 p-1">
            {highlights && highlights
                .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0))
                .map(h => {
                    const updatedAt = h.updatedAt?.toDate();
                    if (h.id === activeHighlightId) {
                        return (
                            <div key={h.id} ref={activeNoteRef}>
                                <NoteEditor 
                                    highlight={h} 
                                    onSave={handleUpdateNote} 
                                    onDelete={handleDeleteHighlight}
                                    onCancel={() => setActiveHighlightId(null)} 
                                />
                            </div>
                        )
                    }
                    return (
                        <Card 
                            key={h.id} 
                            onClick={() => !activeHighlightId && setActiveHighlightId(h.id)} 
                            className={cn(
                                "cursor-pointer hover:shadow-lg transition-all", 
                                getNoteCardClass(h.color),
                                activeHighlightId && h.id !== activeHighlightId && "opacity-50 cursor-not-allowed"
                            )}
                        >
                             <CardHeader className="p-2 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-medium truncate pr-2">{getVerseReference(h)}</CardTitle>
                                {updatedAt && (
                                    <p className="text-xs text-muted-foreground shrink-0">
                                        {isToday(updatedAt) ? format(updatedAt, 'p') : format(updatedAt, 'P')}
                                    </p>
                                )}
                            </CardHeader>
                        </Card>
                    )
                })
            }

            {(!highlights || highlights.length === 0) && (
                <div className="text-center text-muted-foreground py-10">
                    <p>No notes for this chapter.</p>
                    <p className="text-xs mt-1">Highlight some text to get started.</p>
                </div>
            )}
        </div>
    );
    
    const ReaderContent = (
      <div className="flex flex-col gap-2 sm:gap-4 flex-grow min-h-0">
          <div className="relative flex-grow min-h-0">
               <div className="absolute top-2 right-2 z-10 flex items-center justify-end gap-2 px-2 sm:px-0">
                 <span className="text-xs text-muted-foreground">Font Size</span>
                 <Button variant="outline" size="icon" className="h-7 w-7" onClick={decreaseFontSize} disabled={fontSize === 'sm'}><Minus className="h-4 w-4" /></Button>
                 <Button variant="outline" size="icon" className="h-7 w-7" onClick={increaseFontSize} disabled={fontSize === 'xl'}><Plus className="h-4 w-4" /></Button>
               </div>
              <ScrollArea ref={scrollAreaRef} onScroll={handleScroll} className="h-full border rounded-md p-2 sm:p-4 pt-12">
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
                  <div className={cn("space-y-1 font-serif", fontSizeClasses[fontSize])}>
                      {chapterContent.verses.map(v => {
                              const verseNum = v.verse;
                              const isSelected = selectedVerses.includes(verseNum);
                              const highlightInfo = highlightsMap.get(verseNum);
                              const isActiveHighlight = activeHighlight?.verses.includes(verseNum) ?? false;
                              return (
                                  <p
                                      key={verseNum}
                                      id={`verse-${verseNum}`}
                                      className={cn(
                                          'rounded-sm transition-colors -mx-1 px-1 py-0.5',
                                          'sm:leading-relaxed md:leading-loose',
                                          highlightInfo && getHighlightClass(highlightInfo.color),
                                          isSelected && 'bg-destructive/30',
                                          isActiveHighlight && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                                          'cursor-pointer'
                                      )}
                                      onClick={() => handleVerseClick(verseNum)}
                                  >
                                      <sup className={cn("font-sans text-muted-foreground mr-1 sm:mr-1.5 select-none", subFontSizeClasses[fontSize])}>{v.verse}</sup>
                                      {v.text}
                                  </p>
                              )
                      })}
                  </div>
                  )}
              </ScrollArea>
          </div>
           <div className="flex-shrink-0 pt-4 flex flex-col sm:flex-row gap-4 items-center sm:justify-between">
            <div className="flex items-center justify-center min-h-[40px]">
                {selectedVerses.length > 0 && !unfinishedHighlight && (
                    <Button onClick={handleSaveHighlight} disabled={isProcessingHighlight}>
                        <Highlighter className="mr-2 h-4 w-4" />
                        {isProcessingHighlight ? 'Saving...' : 'Highlight & Note'}
                    </Button>
                )}
                {unfinishedHighlight && (
                    <Card className="border-amber-500/50 bg-amber-500/10 p-3 w-full max-w-md">
                        <div className="flex items-center justify-between gap-4">
                            <div className="text-amber-700 dark:text-amber-400">
                                <p className="font-semibold text-sm">Meditation Required</p>
                                <p className="text-xs">Please add a note to your last highlight before creating another.</p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    if (unfinishedHighlight) {
                                      setActiveHighlightId(unfinishedHighlight.id);
                                      if (isMobile) {
                                          setMobileTab('notes');
                                      }
                                    }
                                }}
                            >
                                Go to Note
                            </Button>
                        </div>
                    </Card>
                )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        placeholder="Verse"
                        value={goToVerse}
                        onChange={(e) => setGoToVerse(e.target.value)}
                        className="w-20 h-9"
                        onKeyDown={(e) => e.key === 'Enter' && handleGoToVerse()}
                    />
                    <Button onClick={handleGoToVerse} size="sm" variant="secondary">Go</Button>
                </div>
                <Button onClick={handleMarkAsRead} disabled={isSubmitting || isLoadingChapter || !!chapterError}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mark as Read & Next Chapter
                </Button>
            </div>
          </div>
      </div>
    );
    
    const PageBody = (
       <Tabs defaultValue="read" className="w-full flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="read">Read</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="read" className="flex-grow flex flex-col min-h-0 mt-2 sm:mt-4 gap-2 sm:gap-4">
              <div className="shrink-0">
                {!mounted || !isMobile ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Select value={selectedBookName} onValueChange={setSelectedBookName}>
                            <SelectTrigger><SelectValue placeholder="Select a book" /></SelectTrigger>
                            <SelectContent>
                                {bibleData.map(book => (
                                    <SelectItem key={book.name} value={book.name}>{book.name}</SelectItem>
                                ))}
                            </SelectContent>
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
                                        {selectedBook?.chapters.map(chapter => (
                                            <Button
                                                key={chapter.chapter}
                                                variant={chapter.chapter === selectedChapterNumber ? "default" : "outline"}
                                                size="sm"
                                                className="h-8"
                                                onClick={() => handleSelectChapter(chapter.chapter)}
                                            >
                                                {chapter.chapter}
                                            </Button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>
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
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        <Sheet open={isBookSheetOpen} onOpenChange={setIsBookSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="truncate justify-between">
                                    <span className="truncate">{selectedBookName}</span>
                                    <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="h-[90vh] flex flex-col">
                                <SheetHeader>
                                    <SheetTitle>Select a Book</SheetTitle>
                                </SheetHeader>
                                <Input placeholder="Search books..." value={bookSearchTerm} onChange={(e) => setBookSearchTerm(e.target.value)} />
                                <ScrollArea className="flex-grow">
                                    {filteredBibleData.map(book => (
                                    <Button key={book.name} variant="ghost" size="lg" className="w-full justify-start" onClick={() => handleSelectBook(book.name)}>{book.name}</Button>
                                    ))}
                                </ScrollArea>
                            </SheetContent>
                        </Sheet>

                        <Sheet open={isChapterSheetOpen} onOpenChange={setIsChapterSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="truncate justify-between">
                                    <span className="truncate">Chapter {selectedChapterNumber}</span>
                                    <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="h-[90vh] flex flex-col">
                                <SheetHeader>
                                    <SheetTitle>{selectedBookName}</SheetTitle>
                                    <SheetDescription>Select a chapter</SheetDescription>
                                </SheetHeader>
                                <ScrollArea className="flex-grow">
                                    <div className="grid grid-cols-5 gap-2 p-4">
                                    {selectedBook?.chapters.map(chapter => (
                                    <Button key={chapter.chapter} variant={chapter.chapter === selectedChapterNumber ? 'default' : 'outline'} size="icon" onClick={() => handleSelectChapter(chapter.chapter)}>{chapter.chapter}</Button>
                                    ))}
                                    </div>
                                </ScrollArea>
                            </SheetContent>
                        </Sheet>
                        
                        <Sheet open={isVersionSheetOpen} onOpenChange={setIsVersionSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="truncate justify-between">
                                    <span className="truncate">{selectedVersion.toUpperCase()}</span>
                                    <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="h-auto">
                                <SheetHeader>
                                    <SheetTitle>Select a Version</SheetTitle>
                                </SheetHeader>
                                <div className="grid gap-2 py-4">
                                {bibleVersions.map(version => (
                                    <Button key={version.id} variant={version.id === selectedVersion ? 'default' : 'ghost'} size="lg" className="w-full justify-start" onClick={() => handleSelectVersion(version.id)}>{version.name}</Button>
                                ))}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                )}
              </div>
            
             {/* Mobile / Desktop Layout switch */}
            {!mounted || !isMobile ? (
                <div className="flex flex-col md:flex-row gap-6 flex-grow min-h-0">
                    {/* Reader Column */}
                    <div className="flex flex-col md:w-2/3 min-h-0">
                        {ReaderContent}
                    </div>
                    {/* Notes Column */}
                    <div className="hidden md:flex md:w-1/3 flex-col">
                        <Accordion type="single" collapsible defaultValue='item-1' className="w-full flex-grow flex flex-col">
                            <AccordionItem value="item-1" className="border rounded-md bg-muted/30 flex-grow flex flex-col">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline flex-shrink-0">
                                <h3 className="font-semibold tracking-tight text-base">Notes for {chapterContent?.book} {chapterContent?.chapter}</h3>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pb-2 flex-grow min-h-0">
                                    <ScrollArea className="h-full">
                                        {NotesList}
                                    </ScrollArea>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
            ) : (
                <Tabs value={mobileTab} onValueChange={setMobileTab} className="flex-grow flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="reader">Read</TabsTrigger>
                        <TabsTrigger value="notes">Notes ({highlights?.length || 0})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="reader" className="flex-grow flex flex-col min-h-0 mt-2">
                        {ReaderContent}
                    </TabsContent>
                    <TabsContent value="notes" className="flex-grow min-h-0 mt-2">
                         <ScrollArea className="h-full border rounded-md p-2 bg-muted/30">
                            {NotesList}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            )}

          </TabsContent>
          
          <TabsContent value="history" className="flex-grow flex flex-col min-h-0 mt-4 gap-4">
            <div className="flex items-center gap-2 shrink-0">
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
            <div className="relative flex-grow min-h-0">
                <ScrollArea className="absolute inset-0">
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
            </div>
          </TabsContent>
        </Tabs>
    );

    return (
        <div className="h-dvh flex flex-col p-4 md:p-6 md:pb-6">
            <div className="flex-shrink-0 flex items-center gap-4 mb-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                 <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center">
                    Bible
                    {chapterContent?.translation && <span className="text-muted-foreground text-sm font-normal ml-2">({chapterContent.translation})</span>}
                </h1>
            </div>
            <div className="flex-grow min-h-0">
                {PageBody}
            </div>
        </div>
    );
}

    