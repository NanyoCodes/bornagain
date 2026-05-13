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
  writeBatch,
  getDocs,
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
  Users,
} from 'lucide-react';
import { getBibleChapter, type BibleChapterOutput } from '@/ai/flows/get-bible-chapter-flow';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn, safeToDate } from '@/lib/utils';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const bibleVersions = [
    { id: 'kjv', name: 'King James Version' },
    { id: 'web', name: 'World English Bible' },
    { id: 'bbe', name: 'Bible in Basic English' },
];

const getHighlightClass = (color?: string) => {
    if (!color) return 'bg-blue-200/60 dark:bg-blue-800/50';
    return `highlight-${color}`;
};

const getPartnerHighlightClass = () => {
    return 'border-l-4 border-primary bg-primary/5';
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
  const { data: userProfile, loading: loadingProfile } = useDoc<UserProfile>(userDocRef);
  
  const selectedBook = useMemo(() => bibleData.find(b => b.name === selectedBookName), [selectedBookName]);

  const hasInitializedSelection = useRef(false);
  const lastBookRef = useRef(bibleData[0].name);

  const [partnerHighlights, setPartnerHighlights] = useState<(BibleHighlight & { partnerName: string; partnerPhoto?: string })[]>([]);
  const [isLoadingPartnerHighlights, setIsLoadingPartnerHighlights] = useState(false);

  useEffect(() => {
    if (userProfile && !hasInitializedSelection.current) {
      if (userProfile.readingHistory && userProfile.readingHistory.length > 0) {
        const sortedHistory = [...userProfile.readingHistory].sort((a, b) => {
          const timeA = safeToDate(a.readAt)?.getTime() ?? 0;
          const timeB = safeToDate(b.readAt)?.getTime() ?? 0;
          return timeB - timeA;
        });
        
        const lastRead = sortedHistory[0];
        
        if (lastRead) {
          lastBookRef.current = lastRead.book;
          setSelectedBookName(lastRead.book);
          setSelectedChapterNumber(lastRead.chapter);
        }
      }
      hasInitializedSelection.current = true;
    }
  }, [userProfile]);

  useEffect(() => {
    if (hasInitializedSelection.current && selectedBookName !== lastBookRef.current) {
      setSelectedChapterNumber(1);
      setActiveHighlightId(null);
      lastBookRef.current = selectedBookName;
    }
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

  useEffect(() => {
      const fetchPartnerHighlights = async () => {
          if (!userProfile?.accountabilityPartners || !chapterContent || !firestore) return;
          setIsLoadingPartnerHighlights(true);
          try {
              const partnerNotes: (BibleHighlight & { partnerName: string; partnerPhoto?: string })[] = [];
              
              for (const partner of userProfile.accountabilityPartners) {
                  const q = query(
                      collection(firestore, 'users', partner.userId, 'bibleHighlights'),
                      where('book', '==', chapterContent.book),
                      where('chapter', '==', chapterContent.chapter)
                  );
                  const snap = await getDocs(q);
                  snap.forEach(doc => {
                      const data = doc.data() as BibleHighlight;
                      if (data.note && data.note.trim() !== '') {
                        partnerNotes.push({ 
                            id: doc.id, 
                            ...data, 
                            partnerName: partner.firstName,
                            partnerPhoto: partner.photoURL
                        });
                      }
                  });
              }
              setPartnerHighlights(partnerNotes);
          } catch (e) {
              console.error("Failed to fetch partner highlights", e);
          } finally {
              setIsLoadingPartnerHighlights(false);
          }
      };

      fetchPartnerHighlights();
  }, [userProfile?.accountabilityPartners, chapterContent, firestore]);
  
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

  const partnerHighlightsMap = useMemo(() => {
    const map = new Map<number, string[]>();
    partnerHighlights.forEach(h => {
        h.verses.forEach(v => {
            const existing = map.get(v) || [];
            map.set(v, [...existing, h.partnerName]);
        });
    });
    return map;
  }, [partnerHighlights]);
  
  useEffect(() => {
    if (!selectedBookName || !selectedChapterNumber) return;

    const fetchChapter = async () => {
      setIsLoadingChapter(true);
      setChapterError(null);
      setChapterContent(null);
      setIsScrolledToEnd(false);
      setSelectedVerses([]);
      setActiveHighlightId(null);
      setToolbarPos(null);

      try {
        const content = await getBibleChapter({
          book: selectedBookName,
          chapter: selectedChapterNumber,
          version: selectedVersion,
        });
        setChapterContent(content);
      } catch (error: any) {
        console.error(error);
        setChapterError(error.message || "Failed to load chapter.");
      } finally {
        setIsLoadingChapter(false);
      }
    };

    fetchChapter();
  }, [selectedBookName, selectedChapterNumber, selectedVersion]);

  const completedToday = useMemo(() => {
    if (!userProfile?.dailyDiscipline) return [];
    const lastUpdatedDate = userProfile.dailyDiscipline.lastUpdated?.toDate();
    if (lastUpdatedDate && new Date().toDateString() === lastUpdatedDate.toDateString()) {
      return userProfile.dailyDiscipline.completed || [];
    }
    return [];
  }, [userProfile]);

  const handleMarkAsRead = async () => {
    if (!user || !firestore || !chapterContent || !userProfile) return;
    setIsSubmitting(true);
    
    try {
        const userRef = doc(firestore, 'users', user.uid);
        const historyUpdatePayload = {
          readingHistory: arrayUnion({
            book: chapterContent.book,
            chapter: chapterContent.chapter,
            readAt: new Date(),
          })
        };
        await updateDoc(userRef, historyUpdatePayload);
        
        if (!completedToday.includes('read_bible')) {
            const newCompleted = [...completedToday, 'read_bible'];
            const today = new Date();
            const dateString = format(today, 'yyyy-MM-dd');
            const batch = writeBatch(firestore);
            batch.update(userRef, {
              dailyDiscipline: {
                completed: newCompleted,
                lastUpdated: serverTimestamp(),
              },
            });
            batch.set(doc(firestore, 'users', user.uid, 'disciplineHistory', dateString), {
                completed: newCompleted,
                date: serverTimestamp()
            }, { merge: true });
            await batch.commit();
        }

        toast({ title: 'Chapter Marked as Read' });
        const currentBookIndex = bibleData.findIndex(b => b.name === chapterContent.book);
        const currentBook = bibleData[currentBookIndex];
        if (!currentBook) return;
        const isLastChapter = chapterContent.chapter >= currentBook.chapters.length;

        if (isLastChapter) {
            const isLastBook = currentBookIndex >= bibleData.length - 1;
            if (!isLastBook) {
                const nextBook = bibleData[currentBookIndex + 1];
                setSelectedBookName(nextBook.name);
                setSelectedChapterNumber(1);
            } else {
                toast({ title: 'Congratulations!', description: 'Finished entire Bible!' });
                router.back();
            }
        } else {
            setSelectedChapterNumber(chapterContent.chapter + 1);
        }
    } catch (error) {
        const permissionError = new FirestorePermissionError({ path: `users/${user.uid}`, operation: 'update' }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsSubmitting(false);
    }
  };

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
        deleteDoc(highlightRef).then(() => {
            toast({ title: 'Highlight Removed' });
            if (activeHighlightId === highlightId) setActiveHighlightId(null);
        }).catch(() => {
            const permissionError = new FirestorePermissionError({ path: highlightRef.path, operation: 'delete' }, user);
            errorEmitter.emit('permission-error', permissionError);
        });
    };

    const handleVerseClick = (verseNumber: number) => {
        const verseElement = document.getElementById(`verse-${verseNumber}`);
        verseElement?.classList.add('verse-selected');
        setTimeout(() => verseElement?.classList.remove('verse-selected'), 1500);

        const existingHighlight = highlightsMap.get(verseNumber);
        if (existingHighlight) {
            setActiveHighlightId(existingHighlight.id);
            if (isMobile) setMobileTab('notes');
            return;
        }

        if (unfinishedHighlight) {
            toast({ title: "Finish Your Note" });
            setActiveHighlightId(unfinishedHighlight.id);
            if (isMobile) setMobileTab('notes');
            return;
        }

        const newSelection = selectedVerses.includes(verseNumber)
            ? selectedVerses.filter(v => v !== verseNumber)
            : [...selectedVerses, verseNumber].sort((a, b) => { return a - b; });

        setSelectedVerses(newSelection);

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
        } else if (newSelection.length === 0) {
            setToolbarPos(null);
        }
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
        setDoc(newHighlightRef, newHighlightData).then(() => {
            setSelectedVerses([]);
            setToolbarPos(null);
            setActiveHighlightId(newHighlightRef.id);
            if (isMobile) setMobileTab('notes');
        }).catch(() => {
            const permissionError = new FirestorePermissionError({ path: newHighlightRef.path, operation: 'create', requestResourceData: newHighlightData }, user);
            errorEmitter.emit('permission-error', permissionError);
        }).finally(() => setIsProcessingHighlight(false));
    };
    
    const handleUpdateNote = async (highlightId: string, noteText: string) => {
        if (!user || !firestore) return;
        const highlightRef = doc(firestore, 'users', user.uid, 'bibleHighlights', highlightId);
        const payload = { note: noteText, updatedAt: serverTimestamp() };
        return updateDoc(highlightRef, payload).then(() => {
            toast({ title: 'Note Saved' });
        }).catch(() => {
            const permissionError = new FirestorePermissionError({ path: highlightRef.path, operation: 'update', requestResourceData: payload }, user);
            errorEmitter.emit('permission-error', permissionError);
        });
    };

    const handleGoToVerse = () => {
      const verseNum = parseInt(goToVerse, 10);
      if (!isNaN(verseNum) && chapterContent && verseNum > 0 && verseNum <= chapterContent.verses.length) {
          const verseElement = document.getElementById(`verse-${verseNum}`);
          verseElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          verseElement?.classList.add('verse-selected');
          setTimeout(() => verseElement?.classList.remove('verse-selected'), 1500);
          setGoToVerse('');
      }
    };

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

    useEffect(() => { setMounted(true); }, []);

    const filteredBibleData = useMemo(() => {
        if (!bookSearchTerm) return bibleData;
        return bibleData.filter(book => book.name.toLowerCase().includes(bookSearchTerm.toLowerCase()));
    }, [bookSearchTerm]);

    const handleSelectBook = (bookName: string) => { setSelectedBookName(bookName); setIsBookSheetOpen(false); }
    const handleSelectChapter = (chapter: number) => { setSelectedChapterNumber(chapter); setActiveHighlightId(null); setIsChapterSheetOpen(false); setIsChapterPopoverOpen(false); }
    const handleSelectVersion = (version: string) => { setSelectedVersion(version); setIsVersionSheetOpen(false); }
    
    const increaseFontSize = () => {
        const currentIndex = fontSizes.indexOf(fontSize);
        if (currentIndex < fontSizes.length - 1) setFontSize(fontSizes[currentIndex + 1]);
    };
    const decreaseFontSize = () => {
        const currentIndex = fontSizes.indexOf(fontSize);
        if (currentIndex > 0) setFontSize(fontSizes[currentIndex - 1]);
    };

    const readingHistoryList = userProfile?.readingHistory || [];

    const historyGroups = useMemo(() => {
        if (readingHistoryList.length === 0) return [];
        const groups: { date: Date; items: ReadingHistoryItem[] }[] = [];
        readingHistoryList.forEach(item => {
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
    }, [readingHistoryList]);

    const filteredHistoryGroups = useMemo(() => {
        if (!historyGroups) return [];
        if (!filterDate) return historyGroups;
        return historyGroups.filter(group => isSameDay(group.date, filterDate));
    }, [historyGroups, filterDate]);

    const NotesList = (
        <div className="space-y-6">
            <div className="space-y-2 p-1">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">My Notes</h3>
                {highlights && highlights
                    .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0))
                    .map(h => h.id === activeHighlightId ? (
                        <div key={h.id} ref={activeNoteRef}>
                            <NoteEditor highlight={h} onSave={handleUpdateNote} onDelete={handleDeleteHighlight} onCancel={() => setActiveHighlightId(null)} />
                        </div>
                    ) : (
                        <Card key={h.id} onClick={() => !activeHighlightId && setActiveHighlightId(h.id)} className={cn("cursor-pointer hover:shadow-lg transition-all", getNoteCardClass(h.color), activeHighlightId && h.id !== activeHighlightId && "opacity-50 cursor-not-allowed")}>
                            <CardHeader className="p-2 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-medium truncate pr-2">{getVerseReference(h)}</CardTitle>
                            </CardHeader>
                        </Card>
                    ))}
            </div>

            {partnerHighlights.length > 0 && (
                <div className="space-y-3 p-1 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" /> Partner Reflections
                    </h3>
                    {partnerHighlights.map(h => (
                        <Card key={h.id} className="bg-primary/5 border-primary/20">
                            <CardHeader className="p-3 pb-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <Avatar className="h-5 w-5">
                                        <AvatarImage src={h.partnerPhoto} />
                                        <AvatarFallback className="text-[8px]">{h.partnerName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-bold text-primary">{h.partnerName}</span>
                                </div>
                                <CardTitle className="text-xs font-semibold">{getVerseReference(h)}</CardTitle>
                            </CardHeader>
                            {h.note && (
                                <CardContent className="p-3 pt-0">
                                    <p className="text-xs text-muted-foreground italic leading-relaxed">&ldquo;{h.note}&rdquo;</p>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
    
    const ReaderContent = (
      <div className="flex flex-col gap-2 sm:gap-4 flex-grow min-h-0">
          <div className="relative flex-grow min-h-0">
               <div className="absolute top-2 right-2 z-10 flex items-center justify-end gap-2 px-2 sm:px-0">
                 <Button variant="outline" size="icon" className="h-7 w-7" onClick={decreaseFontSize} disabled={fontSize === 'sm'}><Minus className="h-4 w-4" /></Button>
                 <Button variant="outline" size="icon" className="h-7 w-7" onClick={increaseFontSize} disabled={fontSize === 'xl'}><Plus className="h-4 w-4" /></Button>
               </div>
              <ScrollArea ref={scrollAreaRef} onScroll={handleScroll} className="h-full border rounded-md p-2 sm:p-4 pt-12 relative">
                  {isLoadingChapter && <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                  {!isLoadingChapter && !chapterError && chapterContent && (
                    <>
                        <div className={cn("space-y-1 font-serif", fontSizeClasses[fontSize])}>
                            {chapterContent.verses.map(v => (
                                <div key={v.verse} className="relative group">
                                    <p id={`verse-${v.verse}`} className={cn('rounded-sm transition-colors -mx-1 px-1 py-0.5 relative', highlightsMap.get(v.verse) && getHighlightClass(highlightsMap.get(v.verse)!.color), partnerHighlightsMap.has(v.verse) && getPartnerHighlightClass(), selectedVerses.includes(v.verse) && 'bg-destructive/30', activeHighlight?.verses.includes(v.verse) && 'ring-2 ring-primary ring-offset-2 ring-offset-background', 'cursor-pointer')} onClick={() => handleVerseClick(v.verse)}>
                                        <sup className={cn("font-sans text-muted-foreground mr-1 sm:mr-1.5 select-none", subFontSizeClasses[fontSize])}>{v.verse}</sup>
                                        {v.text}
                                        {partnerHighlightsMap.has(v.verse) && (
                                            <span className="absolute -left-1 top-0 bottom-0 w-1 bg-primary rounded-l-sm" />
                                        )}
                                    </p>
                                    {partnerHighlightsMap.has(v.verse) && (
                                        <div className="absolute left-full ml-2 top-0 bg-popover border rounded px-2 py-1 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                            Thoughts from {partnerHighlightsMap.get(v.verse)?.join(', ')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {selectedVerses.length > 0 && !unfinishedHighlight && toolbarPos && (
                            <div className="absolute z-30 transition-all pointer-events-none" style={{ top: `${toolbarPos.top}px`, left: `${toolbarPos.left}px`, transform: 'translate(-50%, -120%)' }}>
                                <Button size="default" className="shadow-xl pointer-events-auto animate-in zoom-in slide-in-from-bottom-2 duration-200" onClick={handleSaveHighlight} disabled={isProcessingHighlight}>
                                    {isProcessingHighlight ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Highlighter className="mr-2 h-4 w-4" />}
                                    Highlight & Note
                                </Button>
                            </div>
                        )}
                        <div className="pt-8 pb-10 flex flex-col sm:flex-row gap-6 items-center justify-between">
                          <div className="flex items-center justify-center min-h-[40px] flex-shrink-0 w-full sm:w-auto">
                              {unfinishedHighlight && (
                                  <Card className="border-amber-500/50 bg-amber-500/10 p-3 w-full max-w-md">
                                      <div className="flex items-center justify-between gap-4">
                                          <div className="text-amber-700 dark:text-amber-400">
                                              <p className="font-semibold text-sm">Meditation Required</p>
                                          </div>
                                          <Button size="sm" variant="outline" onClick={() => { setActiveHighlightId(unfinishedHighlight.id); if (isMobile) setMobileTab('notes'); }}>Go to Note</Button>
                                      </div>
                                  </Card>
                              )}
                          </div>
                          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 w-full sm:w-auto">
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                  <Input type="number" placeholder="Verse" value={goToVerse} onChange={(e) => setGoToVerse(e.target.value)} className="flex-grow sm:w-20 h-9" onKeyDown={(e) => e.key === 'Enter' && handleGoToVerse()} />
                                  <Button onClick={handleGoToVerse} size="sm" variant="secondary">Go</Button>
                              </div>
                              <Button size="default" className="w-full sm:w-auto" onClick={handleMarkAsRead} disabled={isSubmitting || isLoadingChapter || !!chapterError}>
                                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Mark as Read & Next Chapter
                              </Button>
                          </div>
                        </div>
                    </>
                  )}
              </ScrollArea>
          </div>
      </div>
    );
    
    return (
        <div className="h-dvh flex flex-col p-2 sm:p-4">
            <div className="flex-shrink-0 flex items-center gap-4 mb-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
                 <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center">
                    Bible {chapterContent?.translation && <span className="text-muted-foreground text-sm font-normal ml-2">({chapterContent.translation})</span>}
                </h1>
            </div>
            <Tabs defaultValue="read" className="w-full flex-grow flex flex-col min-h-0">
                <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="read">Read</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>
                <TabsContent value="read" className="flex-grow flex flex-col min-h-0 mt-2 sm:mt-4 gap-2 sm:gap-4">
                    <div className="shrink-0">
                        {!mounted || !isMobile ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Select value={selectedBookName} onValueChange={setSelectedBookName}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{bibleData.map(book => (<SelectItem key={book.name} value={book.name}>{book.name}</SelectItem>))}</SelectContent></Select>
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
                                <Select value={selectedVersion} onValueChange={handleSelectVersion}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{bibleVersions.map(v => (<SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>))}</SelectContent></Select>
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
                                        <SheetHeader><SheetTitle>Select Book</SheetTitle></SheetHeader>
                                        <Input placeholder="Search..." value={bookSearchTerm} onChange={(e) => setBookSearchTerm(e.target.value)} />
                                        <ScrollArea className="flex-grow">{filteredBibleData.map(book => (<Button key={book.name} variant="ghost" size="lg" className="w-full justify-start" onClick={() => handleSelectBook(book.name)}>{book.name}</Button>))}</ScrollArea>
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
                                        <SheetHeader><SheetTitle>{selectedBookName}</SheetTitle></SheetHeader>
                                        <ScrollArea className="flex-grow">
                                            <div className="grid grid-cols-5 gap-2 p-4">{selectedBook?.chapters.map(chapter => (<Button key={chapter.chapter} variant={chapter.chapter === selectedChapterNumber ? 'default' : 'outline'} size="icon" onClick={() => handleSelectChapter(chapter.chapter)}>{chapter.chapter}</Button>))}</div>
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
                                    <SheetContent side="bottom">
                                        <SheetHeader><SheetTitle>Select Version</SheetTitle></SheetHeader>
                                        <div className="grid gap-2 py-4">{bibleVersions.map(v => (<Button key={v.id} variant={v.id === selectedVersion ? 'default' : 'ghost'} size="lg" className="w-full justify-start" onClick={() => handleSelectVersion(v.id)}>{v.name}</Button>))}</div>
                                    </SheetContent>
                                </Sheet>
                            </div>
                        )}
                    </div>
                    {!mounted || !isMobile ? (
                        <div className="flex flex-col md:flex-row gap-6 flex-grow min-h-0"><div className="flex flex-col md:w-2/3 min-h-0">{ReaderContent}</div><div className="hidden md:flex md:w-1/3 flex-col"><Accordion type="single" collapsible defaultValue='item-1' className="w-full flex-grow flex flex-col"><AccordionItem value="item-1" className="border rounded-md bg-muted/30 flex-grow flex flex-col"><AccordionTrigger className="px-4 py-3 hover:no-underline flex-shrink-0"><h3 className="font-semibold tracking-tight text-base">Journal & Shared</h3></AccordionTrigger><AccordionContent className="px-2 pb-2 flex-grow min-h-0"><ScrollArea className="h-full">{NotesList}</ScrollArea></AccordionContent></AccordionItem></Accordion></div></div>
                    ) : (
                        <Tabs value={mobileTab} onValueChange={setMobileTab} className="flex-grow flex flex-col min-h-0"><TabsList className="grid w-full grid-cols-2 shrink-0"><TabsTrigger value="reader">Read</TabsTrigger><TabsTrigger value="notes">Journal ({highlights?.length || 0})</TabsTrigger></TabsList><TabsContent value="reader" className="flex-grow flex flex-col min-h-0 mt-2">{ReaderContent}</TabsContent><TabsContent value="notes" className="flex-grow min-h-0 mt-2"><ScrollArea className="h-full border rounded-md p-2 bg-muted/30">{NotesList}</ScrollArea></TabsContent></Tabs>
                    )}
                </TabsContent>
                <TabsContent value="history" className="flex-grow flex flex-col min-h-0 mt-4 gap-4">
                    <div className="flex items-center gap-2 shrink-0"><Input type="date" value={filterDate ? format(filterDate, "yyyy-MM-dd") : ""} onChange={(e) => { if (e.target.value) { const [year, month, day] = e.target.value.split('-').map(Number); setFilterDate(new Date(year, month - 1, day)); } else { setFilterDate(undefined); } }} className="flex-grow" />{filterDate && (<Button variant="ghost" size="icon" onClick={() => setFilterDate(undefined)}><XCircle className="h-5 w-5 text-muted-foreground" /></Button>)}</div>
                    <ScrollArea className="flex-grow"><div className="p-4">{filteredHistoryGroups.map(group => (<div key={group.date.toISOString()}><div className="relative my-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div><div className="relative flex justify-center"><span className="bg-background px-3 text-sm font-semibold text-muted-foreground">{format(group.date, 'PPP')}</span></div></div><ul className="mt-6 space-y-4">{group.items.map((item, idx) => (<li key={idx} className="flex items-center gap-3"><BookOpen className="h-5 w-5 text-primary" /><p className="text-sm">Read <span className="font-medium">{item.book} {item.chapter}</span> at {format(item.readAt.toDate(), 'p')}</p></li>))}</ul></div>))}</div></ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );
}