'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Trash2, FileText, Bold, Italic, CornerUpLeft, Underline, Palette } from 'lucide-react';
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
  writeBatch,
} from 'firebase/firestore';
import type { Note, NoteCategory } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


const noteCategories: NoteCategory[] = ['Personal', 'Church', 'Revelation', 'Other'];
const colorSwatches = ['#000000', '#ef4444', '#f97316', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];


export default function NotesPage() {
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
  const contentRef = useRef<HTMLTextAreaElement>(null);

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

  const handleFormatting = (formatType: 'bold' | 'italic' | 'underline') => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let tag: string;
    switch(formatType) {
        case 'bold': tag = 'b'; break;
        case 'italic': tag = 'i'; break;
        case 'underline': tag = 'u'; break;
    }
    const newText = `${textarea.value.substring(0, start)}<${tag}>${selectedText}</${tag}>${textarea.value.substring(end)}`;
    setContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + `<${tag}>`.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos + selectedText.length);
    }, 0);
  };
  
   const handleColor = (color: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const newText = `${textarea.value.substring(0, start)}<span style="color: ${color};">${selectedText}</span>${textarea.value.substring(end)}`;
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + `<span style="color: ${color};">`.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos + selectedText.length);
    }, 0);
  };


  const updateDisciplineState = async () => {
    if (!user || !firestore) {
        throw new Error("User not authenticated or Firestore not available.");
    }

    const today = new Date();
    const dateString = format(today, 'yyyy-MM-dd');
    const userRef = doc(firestore, 'users', user.uid);

    const batch = writeBatch(firestore);

    batch.update(userRef, {
      'dailyDiscipline.completed': ['pray', 'read_bible', 'attend_church', 'take_notes'],
      'dailyDiscipline.lastUpdated': serverTimestamp(),
    });

    const historyRef = doc(firestore, 'users', user.uid, 'disciplineHistory', dateString);
    batch.set(historyRef, {
        completed: ['pray', 'read_bible', 'attend_church', 'take_notes'],
        date: serverTimestamp()
    }, { merge: true });

    return batch.commit().catch((serverError) => {
      const permissionError = new FirestorePermissionError({
          path: `BATCH_WRITE:DISCIPLINE`,
          operation: 'update',
      }, user);
      errorEmitter.emit('permission-error', permissionError);
      throw serverError;
    });
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
        await updateDisciplineState();
        setDisciplineCompletedInSession(true);
      }
    } catch (e) {
      if ((e as any)?.name !== 'FirestorePermissionError') {
        const permissionError = new FirestorePermissionError({ path: `users/${user.uid}/notes`, operation: 'write' });
        errorEmitter.emit('permission-error', permissionError);
      }
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
  
  const NoteList = (
    <div className="space-y-2">
       <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Input
              placeholder="Search by title or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow"
          />
          <Button onClick={handleNewNote} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> New Note
          </Button>
      </div>
      {notesLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : filteredNotes && filteredNotes.length > 0 ? (
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
          <h3 className="mt-4 text-lg font-semibold">{searchTerm ? 'No Results Found' : 'No Notes Yet'}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm ? 'Try a different search term.' : 'Click "New Note" to start journaling.'}
          </p>
        </div>
      )}
    </div>
  );
  
  const NoteEditor = (
    <div className="flex flex-col h-full">
      {isMobile && editorVisible && (
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
        <div className="border rounded-md p-1 flex items-center gap-1 flex-wrap">
            <Button variant="ghost" size="icon" onClick={() => handleFormatting('bold')} title="Bold">
                <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleFormatting('italic')} title="Italic">
                <Italic className="h-4 w-4" />
            </Button>
             <Button variant="ghost" size="icon" onClick={() => handleFormatting('underline')} title="Underline">
                <Underline className="h-4 w-4" />
            </Button>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" title="Text Color">
                        <Palette className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                    <div className="flex gap-1">
                        {colorSwatches.map(color => (
                            <Button key={color} size="icon" className="h-6 w-6 rounded-full border" style={{backgroundColor: color}} onClick={() => handleColor(color)} />
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
        <Textarea
          ref={contentRef}
          placeholder="Start writing your thoughts..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-grow min-h-[300px] text-base"
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

  const pageContent = !mounted ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div> : isMobile ? (
    <Tabs value={mobileTab} onValueChange={setMobileTab} className="flex-grow flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Notes ({filteredNotes?.length || 0})</TabsTrigger>
            <TabsTrigger value="editor" disabled={!editorVisible}>Editor</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="flex-grow min-h-0 mt-2">
            <ScrollArea className="h-full -mr-4 pr-4">
                {NoteList}
            </ScrollArea>
        </TabsContent>
        <TabsContent value="editor" className="flex-grow flex flex-col min-h-0 mt-2">
            {editorVisible ? NoteEditor : (
                <div className="text-center text-muted-foreground py-10 flex flex-col items-center justify-center h-full">
                    <p>Select a note to edit, or create a new one.</p>
                </div>
            )}
        </TabsContent>
    </Tabs>
) : (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full">
        <div className="md:col-span-1 h-full">
            <ScrollArea className="h-full pr-4 -mr-4">
                {NoteList}
            </ScrollArea>
        </div>
        <div className="md:col-span-3 h-full flex flex-col">
            {editorVisible ? NoteEditor : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                    <FileText className="h-12 w-12 mb-4" />
                    <h3 className="font-semibold">Select a note to view or edit</h3>
                    <p className="text-sm">Or, create a new one to get started.</p>
                </div>
            )}
        </div>
    </div>
  );
  
  return (
    <div className="space-y-4 h-full flex flex-col">
       <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold tracking-tight">My Notes</h1>
            <p className="text-muted-foreground">A place for your thoughts, reflections, and revelations.</p>
       </div>
       <div className="flex-grow min-h-0">
         {pageContent}
       </div>
    </div>
  )
}
