'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

export function BibleDialog({ isOpen, onOpenChange, onDisciplineCompleted }: { isOpen: boolean; onOpenChange: (open: boolean) => void; onDisciplineCompleted: () => void; }) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [selectedBookName, setSelectedBookName] = useState(bibleData[0].name);
  const [selectedChapterNumber, setSelectedChapterNumber] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userDocRef = useMemo(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, loading: loadingProfile } = useDoc<UserProfile>(userDocRef);
  
  const selectedBook = useMemo(() => bibleData.find(b => b.name === selectedBookName), [selectedBookName]);
  const selectedChapter = useMemo(() => selectedBook?.chapters.find(c => c.chapter === selectedChapterNumber), [selectedBook, selectedChapterNumber]);

  useEffect(() => {
    // Reset to chapter 1 when book changes
    setSelectedChapterNumber(1);
  }, [selectedBookName]);

  const handleMarkAsRead = async () => {
    if (!user || !firestore || !selectedBook || !selectedChapter) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not mark as read. User or selection missing.' });
      return;
    }
    setIsSubmitting(true);
    
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        readingHistory: arrayUnion({
          book: selectedBook.name,
          chapter: selectedChapter.chapter,
          readAt: serverTimestamp(),
        })
      });
      
      onDisciplineCompleted();
      toast({ title: 'Chapter Marked as Read', description: `${selectedBook.name} ${selectedChapter.chapter} has been added to your history.`});
      onOpenChange(false);

    } catch (error) {
      console.error("Failed to mark as read:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update your reading history.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const readingHistory = useMemo(() => {
    if (!userProfile?.readingHistory) return [];
    return [...userProfile.readingHistory].reverse();
  }, [userProfile?.readingHistory]);

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

              <ScrollArea className="flex-grow border rounded-md p-4">
                  <div className="space-y-4 text-lg leading-relaxed font-serif">
                      {selectedChapter?.verses.map(v => (
                          <p key={v.verse}>
                              <sup className="text-sm font-sans text-muted-foreground mr-2">{v.verse}</sup>
                              {v.text}
                          </p>
                      ))}
                  </div>
              </ScrollArea>
              
               <DialogFooter>
                <Button onClick={handleMarkAsRead} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mark Chapter as Read
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
