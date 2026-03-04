
'use client';

import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { bibleData } from '@/lib/bible-data';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import type { UserProfile, ReadingHistoryItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay } from 'date-fns';
import { Loader2, XCircle, BookOpen } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { getBibleChapter, type BibleChapterOutput } from '@/ai/flows/get-bible-chapter-flow';
import { Input } from '../ui/input';

const bibleVersions = [
    { id: 'kjv', name: 'King James (KJV)', premium: false },
    { id: 'web', name: 'World English Bible (WEB)', premium: false },
    { id: 'bbe', name: 'Bible in Basic English', premium: false },
    { id: 'nlt', name: 'New Living Translation (NLT)', premium: true },
];

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

  const userDocRef = useMemo(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, loading: loadingProfile } = useDoc<UserProfile>(userDocRef);
  
  const selectedBook = useMemo(() => bibleData.find(b => b.name === selectedBookName), [selectedBookName]);
  
  useEffect(() => {
    setSelectedChapterNumber(1);
  }, [selectedBookName]);

  useEffect(() => {
    if (!isOpen || !selectedBookName || !selectedChapterNumber) return;

    const fetchChapter = async () => {
      setIsLoadingChapter(true);
      setChapterError(null);
      setChapterContent(null);
      setIsScrolledToEnd(false);

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

    // Scroll to top when new chapter content is loaded
    viewport.scrollTop = 0;
    
    const checkScrollable = () => {
        // For non-scrollable content, enable the button immediately after render
        if (!isLoadingChapter && chapterContent) {
            if (viewport.scrollHeight <= viewport.clientHeight) {
                setIsScrolledToEnd(true);
            }
        }
    };
    
    // Check after a short delay to ensure content is fully rendered
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
    
    // Group items by day, preserving chronological order within the day
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

    // Reverse the groups to show the most recent days first
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
    // Check if user is close to the bottom
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 5) {
      setIsScrolledToEnd(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
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
          
          <TabsContent value="read" className="flex-grow flex flex-col min-h-0 mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select value={selectedBookName} onValueChange={setSelectedBookName}>
                    <SelectTrigger><SelectValue placeholder="Select a book" /></SelectTrigger>
                    <SelectContent>
                        {bibleData.map(book => (
                            <SelectItem key={book.name} value={book.name}>{book.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={String(selectedChapterNumber)} onValueChange={(val) => setSelectedChapterNumber(Number(val))}>
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
                            {version.premium && <span className="text-xs text-muted-foreground ml-1">(Premium)</span>}
                          </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea ref={scrollAreaRef} onScroll={handleScroll} className="flex-grow border rounded-md p-4 relative">
                  {isLoadingChapter && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
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
                        {chapterContent.verses.map(v => (
                            <p key={v.verse}>
                                <sup className="text-sm font-sans text-muted-foreground mr-2">{v.verse}</sup>
                                {v.text}
                            </p>
                        ))}
                    </div>
                  )}
              </ScrollArea>
              
               <DialogFooter>
                <Button onClick={handleMarkAsRead} disabled={isSubmitting || isLoadingChapter || !!chapterError || !isScrolledToEnd}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mark as Read & Next Chapter
                </Button>
              </DialogFooter>
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
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-52" />
                        <Skeleton className="h-4 w-28" />
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
