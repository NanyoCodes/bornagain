'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Trash2, FileText, CornerUpLeft } from 'lucide-react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import type { Note, UserProfile, NoteCategory } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const noteCategories: NoteCategory[] = ['Personal', 'Church', 'Revelation', 'Other'];

interface NotesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDisciplineCompleted: () => void;
  userProfile: UserProfile | null;
}

export function NotesDialog({ isOpen, onOpenChange, onDisciplineCompleted, userProfile }: NotesDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [disciplineCompletedInSession, setDisciplineCompletedInSession] = useState(false);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoteCategory>('Personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileTab, setMobileTab] = useState('list');

  const notesQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'notes'),
      orderBy('updatedAt', 'desc')
    );
  }, [user, firestore]);
  const { data: notes, loading: notesLoading } = useCollection<Note>(notesQuery);

  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    if (!searchTerm) return notes;
    const lowercasedTerm = searchTerm.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(lowercasedTerm) ||
        note.content.toLowerCase().includes(lowercasedTerm) ||
        note.category.toLowerCase().includes(lowercasedTerm)
    );
  }, [notes, searchTerm]);
  
  const groupedNotes = useMemo(() => {
    if (!filteredNotes) return {};
    return filteredNotes.reduce((acc, note) => {
      const cat = note.category || 'Other';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(note);
      return acc;
    }, {} as Record<NoteCategory, Note[]>);
  }, [filteredNotes]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSelectedNote(null);
      setIsCreatingNew(false);
      setDisciplineCompletedInSession(false);
      setTitle('');
      setContent('');
      setCategory('Personal');
      setSearchTerm('');
      setMobileTab('list');
    }
  }, [isOpen]);

  const editorVisible = selectedNote || isCreatingNew;

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category || 'Personal');
    setIsCreatingNew(false);
    if (isMobile) {
      setMobileTab('editor');
    }
  };

  const handleNewNote = () => {
    setSelectedNote(null);
    setIsCreatingNew(true);
    setTitle('');
    setContent('');
    setCategory('Personal');
    if (isMobile) {
      setMobileTab('editor');
    }
  };
  
  const handleBackToList = () => {
    setSelectedNote(null);
    setIsCreatingNew(false);
    setTitle('');
    setContent('');
    setCategory('Personal');
    if (isMobile) {
      setMobileTab('list');
    }
  }

  const handleSaveNote = async () => {
    if (!user || !firestore || !content.trim()) {
      toast({ variant: 'destructive', title: 'Content is required.' });
      return;
    }

    setIsSaving(true);
    const finalTitle = title.trim() || content.split('\n')[0].substring(0, 40) || 'Untitled Note';

    try {
      if (selectedNote) {
        const noteRef = doc(firestore, 'users', user.uid, 'notes', selectedNote.id);
        await updateDoc(noteRef, {
          title: finalTitle,
          content,
          category,
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Note Updated' });
      } else {
        const noteData = {
          userId: user.uid,
          title: finalTitle,
          content,
          category,
        };
        await addDoc(collection(firestore, 'users', user.uid, 'notes'), {
          ...noteData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Note Saved' });
        setIsCreatingNew(false);
      }
      if (!disciplineCompletedInSession) {
        onDisciplineCompleted();
        setDisciplineCompletedInSession(true);
      }
    } catch (e) {
      const permissionError = new FirestorePermissionError({ path: `users/${user.uid}/notes`, operation: 'write' }, user);
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteNote = async () => {
    if (!user || !firestore || !selectedNote) return;

    setIsDeleting(true);
    const noteRef = doc(firestore, 'users', user.uid, 'notes', selectedNote.id);

    try {
        await deleteDoc(noteRef);
        toast({ title: 'Note Deleted' });
        handleBackToList();
    } catch(e) {
        const permissionError = new FirestorePermissionError({ path: noteRef.path, operation: 'delete' }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsDeleting(false);
    }
  };
  
  const NoteList = (
    <div className="space-y-4 h-full flex flex-col">
       <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow"
          />
          <Button onClick={handleNewNote} className="w-full sm:w-auto" variant="secondary">
              <Plus className="mr-2 h-4 w-4" /> New Note
          </Button>
      </div>
      <ScrollArea className="flex-grow">
        {notesLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : filteredNotes && filteredNotes.length > 0 ? (
          <Accordion type="multiple" defaultValue={noteCategories} className="w-full">
              {noteCategories.map(cat => {
                  const categoryNotes = groupedNotes[cat] || [];
                  if (categoryNotes.length === 0) return null;

                  return (
                      <AccordionItem value={cat} key={cat}>
                          <AccordionTrigger className="hover:no-underline">{cat} ({categoryNotes.length})</AccordionTrigger>
                          <AccordionContent>
                             <div className="space-y-2">
                                {categoryNotes.map(note => (
                                    <button
                                        key={note.id}
                                        onClick={() => handleSelectNote(note)}
                                        className={cn(
                                        "w-full text-left p-3 rounded-lg border transition-colors",
                                        selectedNote?.id === note.id ? "bg-muted ring-1 ring-primary" : "hover:bg-muted/50"
                                        )}
                                    >
                                        <p className="font-semibold truncate">{note.title}</p>
                                        <p className="text-sm text-muted-foreground line-clamp-1">{note.content || 'No content'}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                          {note.updatedAt?.toDate ? format(note.updatedAt.toDate(), 'PPP') : 'Just now'}
                                        </p>
                                    </button>
                                ))}
                             </div>
                          </AccordionContent>
                      </AccordionItem>
                  )
              })}
          </Accordion>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
            <h3 className="mt-4 font-semibold">{searchTerm ? 'No Results' : 'Empty Journal'}</h3>
            <p className="text-sm text-muted-foreground mt-1">Start writing your revelations today.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
  
  const NoteEditor = (
    <div className="flex flex-col h-full overflow-hidden">
      {isMobile && (
        <Button onClick={handleBackToList} variant="ghost" size="sm" className="mb-4 self-start pl-0">
            <CornerUpLeft className="mr-2 h-4 w-4" /> Back to List
        </Button>
      )}
      <div className="space-y-4 flex-grow flex flex-col min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
            <Input
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-semibold"
            />
            <Select value={category} onValueChange={(value) => setCategory(value as NoteCategory)}>
                <SelectTrigger>
                    <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                    {noteCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <Textarea
          placeholder="Start writing..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-grow min-h-0 text-base leading-relaxed"
        />
      </div>
      <div className="flex justify-between items-center py-4 shrink-0 border-t mt-auto">
        <div>
        {selectedNote && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isDeleting} className="text-destructive">
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Note?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        )}
        </div>
        <Button onClick={handleSaveNote} disabled={isSaving || !content.trim()}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {selectedNote ? 'Save Changes' : 'Save Note'}
        </Button>
      </div>
    </div>
  );

  const innerContent = !mounted ? null : isMobile ? (
    <Tabs value={mobileTab} onValueChange={setMobileTab} className="flex-grow flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="list">All Notes</TabsTrigger>
            <TabsTrigger value="editor" disabled={!editorVisible}>Editor</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="flex-grow min-h-0 mt-4 overflow-hidden data-[state=inactive]:hidden">
            {NoteList}
        </TabsContent>
        <TabsContent value="editor" className="flex-grow flex flex-col min-h-0 mt-4 overflow-hidden data-[state=inactive]:hidden">
            {editorVisible ? NoteEditor : (
                <div className="text-center text-muted-foreground py-10 flex flex-col items-center justify-center h-full">
                    <p>Select a note to edit.</p>
                </div>
            )}
        </TabsContent>
    </Tabs>
) : (
    <div className="grid grid-cols-3 gap-6 h-full overflow-hidden">
        <div className="col-span-1 h-full overflow-hidden">
            {NoteList}
        </div>
        <div className="col-span-2 h-full flex flex-col overflow-hidden">
            {editorVisible ? NoteEditor : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                    <FileText className="h-12 w-12 mb-4 opacity-10" />
                    <h3 className="font-semibold">Select a note to view or edit</h3>
                    <p className="text-sm">Keep track of your spiritual journey here.</p>
                    <Button onClick={handleNewNote} variant="outline" className="mt-4">
                        <Plus className="mr-2 h-4 w-4" /> New Note
                    </Button>
                </div>
            )}
        </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="p-0 flex flex-col h-[95dvh]">
          <div className="p-6 border-b flex-shrink-0">
            <SheetHeader className="text-left">
                <SheetTitle>Daily Notes</SheetTitle>
                <SheetDescription>Reflections and revelations from today.</SheetDescription>
            </SheetHeader>
          </div>
          <div className="p-6 flex-grow min-h-0 overflow-hidden">
            {innerContent}
          </div>
          <div className="p-6 border-t flex-shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                Close
              </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>Daily Notes</DialogTitle>
          <DialogDescription>A place for your thoughts, reflections, and revelations.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0 overflow-hidden">
            {innerContent}
        </div>
        <DialogFooter className="shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
