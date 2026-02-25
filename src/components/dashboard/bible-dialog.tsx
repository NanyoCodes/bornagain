
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { getBibleChapter, type BibleChapterOutput } from '@/ai/flows/get-bible-chapter-flow';

export function BibleDialog({ isOpen, onOpenChange, onDisciplineCompleted }: { isOpen: boolean; onOpenChange: (open: boolean) => void; onDisciplineCompleted: () => void; }) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [selectedBookName, setSelectedBookName] = useState(bibleData[0].name);
  const [selectedChapterNumber, setSelectedChapterNumber] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [chapterContent, setChapterContent] = useState<BibleChapterOutput | null>(null);
  const [isLoadingChapter, setIsLoadingChapter] = useState(true);
  const [chapterError, setChapterError] = useState<string | null>(null);

  const [isScrolledToEnd, setIsScrolledToEnd] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const userDocRef = useMemo(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, loading: loadingProfile } = useDoc<UserProfile>(userDocRef);
  
  const selectedBook = useMemo(() => bibleData.find(b => b.name === selectedBookName), [selectedBookName]);
  
  useEffect(() => {
    setSelectedChapterNumber(1);
  }, [selectedBookName]);

  useEffect(() => {
    if (!selectedBookName || !selectedChapterNumber) return;

    const fetchChapter = async () => {
      setIsLoadingChapter(true);
      setChapterError(null);
      setChapterContent(null);
      setIsScrolledToEnd(false);

      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = 0;
        }
      }

      try {
        const content = await getBibleChapter({
          book: selectedBookName,
          chapter: selectedChapterNumber,
        });
        setChapterContent(content);
      } catch (error) {
        console.error(error);
        setChapterError("Failed to load chapter. Please check your connection or API settings.");
      } finally {
        setIsLoadingChapter(false);
      }
    };

    fetchChapter();
  }, [selectedBookName, selectedChapterNumber]);

  useEffect(() => {
    if (!isLoadingChapter && chapterContent && scrollAreaRef.current) {
      const checkScrollable = () => {
        const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport && viewport.scrollHeight <= viewport.clientHeight) {
          setIsScrolledToEnd(true);
        }
      };
      setTimeout(checkScrollable, 100);
    }
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
      toast({ title: 'Chapter Marked as Read', description: `${chapterContent.book} ${chapterContent.chapter} has been added to your history.`});
      
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

  const readingHistory = useMemo(() => {
    if (!userProfile?.readingHistory) return [];
    return [...userProfile.readingHistory].reverse();
  }, [userProfile?.readingHistory]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (isScrolledToEnd) return;
    const target = event.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 5) {
      setIsScrolledToEnd(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Read the Bible</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="read" className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="read">Read</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="read" className="flex-grow flex flex-col min-h-0 mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <ScrollArea ref={scrollAreaRef} onScroll={handleScroll} className="flex-grow border rounded-md p-4 relative">
                  {isLoadingChapter && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                  {chapterError && !isLoadingChapter && (
                     <div className="absolute inset-0 flex items-center justify-center text-destructive p-4 text-center">
                        {chapterError}
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
          
          <TabsContent value="history" className="flex-grow min-h-0">
             <ScrollArea className="h-full">
                {loadingProfile && (
                  <div className="space-y-3 p-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                )}
                {!loadingProfile && readingHistory.length === 0 && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Your reading history is empty.
                  </div>
                )}
                {!loadingProfile && readingHistory.length > 0 && (
                  <div className="space-y-2">
                    {readingHistory.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <p className="font-medium">{item.book} {item.chapter}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.readAt ? formatDistanceToNow(item.readAt.toDate(), { addSuffix: true }) : 'Just now'}
                        </p>
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
