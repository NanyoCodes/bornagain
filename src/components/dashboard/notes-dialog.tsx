
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
import { Loader2, Plus, Trash2, Edit2, FileText, Bold, Italic, CornerUpLeft } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

const noteCategories: NoteCategory[] = ['Personal', 'Church', 'Revelation', 'Other'];

interface NotesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDisciplineCompleted: () => void;
  userProfile: UserProfile | null;
}

export function NotesDialog({ isOpen, onOpenChange, onDisciplineCompleted }: NotesDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [disciplineCompletedInSession, setDisciplineCompletedInSession] = useState(false);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoteCategory>('Personal');
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const notesQuery = useMemo(() => {
    if (!user) return null;
    // The subcollection path already scopes notes to the user, so a `where` clause is not needed
    // and can cause indexing issues if not configured in Firestore.
    return query(
      collection(firestore, 'users', user.uid, 'notes'),
      orderBy('updatedAt', 'desc')
    );
  }, [user, firestore]);
  const { data: notes, loading: notesLoading } = useCollection<Note>(notesQuery);
  
  const groupedNotes = useMemo(() => {
    if (!notes) return {};
    return notes.reduce((acc, note) => {
      const cat = note.category || 'Other';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(note);
      return acc;
    }, {} as Record<NoteCategory, Note[]>);
  }, [notes]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
      setSelectedNote(null);
      setIsCreatingNew(false);
      setDisciplineCompletedInSession(false);
      setTitle('');
      setContent('');
      setCategory('Personal');
    }
  }, [isOpen]);

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category || 'Personal');
    setIsCreatingNew(false);
  };

  const handleNewNote = () => {
    setSelectedNote(null);
    setIsCreatingNew(true);
    setTitle('');
    setContent('');
    setCategory('Personal');
  };
  
  const handleBackToList = () => {
    setSelectedNote(null);
    setIsCreatingNew(false);
    setTitle('');
    setContent('');
    setCategory('Personal');
  }
  
  const handleFormatting = (formatType: 'bold' | 'italic') => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const wrapper = formatType === 'bold' ? '**' : '*';
    const newText = `${textarea.value.substring(0, start)}${wrapper}${selectedText}${wrapper}${textarea.value.substring(end)}`;
    setContent(newText);

    // After updating, focus and set cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + wrapper.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos + selectedText.length);
    }, 0);
  };

  const handleSaveNote = async () => {
    if (!user || !firestore || !title.trim()) {
      toast({ variant: 'destructive', title: 'Title is required.' });
      return;
    }

    setIsSaving(true);
    try {
      if (selectedNote) {
        // Update existing note
        const noteRef = doc(firestore, 'users', user.uid, 'notes', selectedNote.id);
        await updateDoc(noteRef, {
          title,
          content,
          category,
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Note Updated' });
      } else {
        // Create new note
        const noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
          userId: user.uid,
          title,
          content,
          category,
        };
        const docRef = await addDoc(collection(firestore, 'users', user.uid, 'notes'), {
          ...noteData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Note Saved' });
        handleSelectNote({ id: docRef.id, ...noteData, createdAt: new (serverTimestamp as any)(), updatedAt: new (serverTimestamp as any)()});
      }
      if (!disciplineCompletedInSession) {
        onDisciplineCompleted();
        setDisciplineCompletedInSession(true);
      }
    } catch (e) {
      const permissionError = new FirestorePermissionError({ path: `users/${user.uid}/notes`, operation: 'write' });
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
        const permissionError = new FirestorePermissionError({ path: noteRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsDeleting(false);
    }
  };
  
  const editorVisible = selectedNote || isCreatingNew;

  const NoteList = (
    <div className="space-y-2">
      <div className="flex justify-end mb-4">
        <Button onClick={handleNewNote}>
          <Plus className="mr-2 h-4 w-4" /> New Note
        </Button>
      </div>
      {notesLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : notes && notes.length > 0 ? (
        <Accordion type="multiple" defaultValue={noteCategories} className="w-full">
            {noteCategories.map(cat => {
                const categoryNotes = groupedNotes[cat] || [];
                if (categoryNotes.length === 0) return null;

                return (
                    <AccordionItem value={cat} key={cat}>
                        <AccordionTrigger>{cat} ({categoryNotes.length})</AccordionTrigger>
                        <AccordionContent>
                           <div className="space-y-2">
                                {categoryNotes.map(note => (
                                    <button
                                        key={note.id}
                                        onClick={() => handleSelectNote(note)}
                                        className={cn(
                                        "w-full text-left p-3 rounded-lg border transition-colors",
                                        selectedNote?.id === note.id ? "bg-muted ring-2 ring-primary" : "hover:bg-muted/50"
                                        )}
                                    >
                                        <p className="font-semibold truncate">{note.title}</p>
                                        <p className="text-sm text-muted-foreground truncate">{note.content || 'No content'}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{format(note.updatedAt.toDate(), 'PPP')}</p>
                                    </button>
                                ))}
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
        </Accordion>
      ) : (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No Notes Yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Click "New Note" to start journaling.</p>
        </div>
      )}
    </div>
  );
  
  const NoteEditor = (
    <div className="flex flex-col h-full">
      {isMobile && (
        <Button onClick={handleBackToList} variant="ghost" className="mb-4 self-start">
            <CornerUpLeft className="mr-2 h-4 w-4" /> Back to List
        </Button>
      )}
      <div className="space-y-4 flex-grow flex flex-col">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
                placeholder="Note Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold"
            />
            <Select value={category} onValueChange={(value) => setCategory(value as NoteCategory)}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                    {noteCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div className="border rounded-md p-2 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => handleFormatting('bold')} title="Bold">
                <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleFormatting('italic')} title="Italic">
                <Italic className="h-4 w-4" />
            </Button>
        </div>
        <Textarea
          ref={contentRef}
          placeholder="Start writing your thoughts..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-grow min-h-[200px] text-base"
        />
      </div>
      <div className="flex justify-between items-center mt-4 flex-shrink-0">
        <div>
        {selectedNote && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the note titled "{selectedNote.title}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive hover:bg-destructive/90">Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        )}
        </div>
        <Button onClick={handleSaveNote} disabled={isSaving || !title.trim()}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {selectedNote ? 'Save Changes' : 'Save Note'}
        </Button>
      </div>
    </div>
  );

  const dialogContent = (
    <>
      <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-6 h-full", {
          'md:grid-cols-1': !isMobile && !editorVisible,
          'hidden md:grid': isMobile && editorVisible,
      })}>
          {(!isMobile || !editorVisible) && (
              <div className="md:col-span-1 h-full">
                  <ScrollArea className="h-full pr-4 -mr-4">
                      {NoteList}
                  </ScrollArea>
              </div>
          )}
          {editorVisible && (
              <div className="md:col-span-2 h-full flex flex-col">
                  {NoteEditor}
              </div>
          )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="p-0 flex flex-col h-[95vh]">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>My Notes</DialogTitle>
            <DialogDescription>A place for your thoughts, reflections, and revelations.</DialogDescription>
          </DialogHeader>
          <div className="p-4 flex-grow min-h-0">
            {dialogContent}
          </div>
          <DialogFooter className="p-4 border-t">
              <Button onClick={() => onOpenChange(false)} className="w-full">
                Close
              </Button>
          </DialogFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>My Notes</DialogTitle>
          <DialogDescription>A place for your thoughts, reflections, and revelations.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
            {dialogContent}
        </div>
        <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
