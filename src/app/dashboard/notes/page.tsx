
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Trash2, FileText, Bold, Italic, CornerUpLeft, Underline, Palette, Minus, Download } from 'lucide-react';
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
import jsPDF from 'jspdf';


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
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<NoteCategory>('Personal');
  const [isDirty, setIsDirty] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const [mobileTab, setMobileTab] = useState('list');
  
  const [isDiscardAlertOpen, setIsDiscardAlertOpen] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<Note | 'new' | 'list' | null>(null);

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
  
  useEffect(() => {
    if (editorVisible) {
        if (selectedNote) {
            setTitle(selectedNote.title);
            setCategory(selectedNote.category || 'Personal');
            if (contentRef.current) {
                contentRef.current.innerHTML = selectedNote.content;
            }
        } else { // Creating new
            setTitle('');
            setCategory('Personal');
            if (contentRef.current) {
                contentRef.current.innerHTML = '';
            }
        }
        setIsDirty(false); // Reset dirty state on note change
    }
  }, [selectedNote, isCreatingNew, editorVisible]);

  const proceedWithNavigation = (target: Note | 'new' | 'list' | null) => {
    if (target === 'new') {
        setSelectedNote(null);
        setIsCreatingNew(true);
        if (isMobile) setMobileTab('editor');
    } else if (target === 'list') {
        setSelectedNote(null);
        setIsCreatingNew(false);
        if (isMobile) setMobileTab('list');
    } else if (target) { // Note object
        setSelectedNote(target as Note);
        setIsCreatingNew(false);
         if (isMobile) setMobileTab('editor');
    }
    // Closing the dialog and resetting target is handled separately for cancel
    setIsDiscardAlertOpen(false);
  }

  const attemptNavigation = (target: Note | 'new' | 'list') => {
      if (isDirty) {
          setNavigationTarget(target);
          setIsDiscardAlertOpen(true);
      } else {
          proceedWithNavigation(target);
      }
  }

  const handleSelectNote = (note: Note) => attemptNavigation(note);
  const handleNewNote = () => attemptNavigation('new');
  const handleBackToList = () => attemptNavigation('list');
  
  const handleConfirmDiscard = () => {
    proceedWithNavigation(navigationTarget);
    setNavigationTarget(null);
  };
  
  const handleCancelDiscard = () => {
      setNavigationTarget(null);
      setIsDiscardAlertOpen(false);
  };


  const handleFormatting = (command: string, value: string | null = null) => {
    if (contentRef.current) {
        contentRef.current.focus();
        document.execCommand(command, false, value);
        setIsDirty(true);
    }
  };
  
  const changeFontSize = (direction: 'increase' | 'decrease') => {
    if (!contentRef.current) return;
    contentRef.current.focus();

    document.execCommand('styleWithCSS', false, 'false');
    
    let currentSizeStr = document.queryCommandValue('fontSize');
    let currentSize = parseInt(currentSizeStr, 10);
    
    if (isNaN(currentSize)) {
        currentSize = 3; 
    }

    let newSize;
    if (direction === 'increase') {
        newSize = Math.min(currentSize + 1, 7);
    } else {
        newSize = Math.max(currentSize - 1, 1);
    }

    if (newSize !== currentSize) {
        document.execCommand('fontSize', false, newSize.toString());
        setIsDirty(true);
    }
  };

  const handleExportPdf = () => {
    if (!selectedNote) return;

    try {
        const doc = new jsPDF();
        
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(selectedNote.title, 15, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`Category: ${selectedNote.category}`, 15, 28);
        const dateString = selectedNote.updatedAt?.toDate ? format(selectedNote.updatedAt.toDate(), 'PPP p') : 'Just now';
        doc.text(`Last updated: ${dateString}`, 15, 33);
        
        doc.setDrawColor(200);
        doc.line(15, 38, 195, 38);

        // Convert HTML content to plain text for PDF
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = selectedNote.content;
        const textContent = tempDiv.textContent || tempDiv.innerText || "";
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        const splitText = doc.splitTextToSize(textContent, 180);
        doc.text(splitText, 15, 48);

        doc.save(`${selectedNote.title.replace(/ /g, '_')}.pdf`);

    } catch (e) {
        console.error("Failed to generate PDF", e);
        toast({
            variant: "destructive",
            title: "PDF Export Failed",
            description: "There was an error generating the PDF for this note."
        });
    }
  };


  const handleSaveNote = async () => {
    if (!user || !firestore || !title.trim()) {
      toast({ variant: 'destructive', title: 'Title is required.' });
      return;
    }

    const currentContent = contentRef.current?.innerHTML || '';
    setIsSaving(true);
    try {
      if (selectedNote) {
        // Update existing note
        const noteRef = doc(firestore, 'users', user.uid, 'notes', selectedNote.id);
        const updatedData = {
          title,
          content: currentContent,
          category,
          updatedAt: serverTimestamp(),
        };
        await updateDoc(noteRef, updatedData);
        toast({ title: 'Note Updated' });
        // Manually update the selectedNote state to reflect changes immediately
        setSelectedNote(prev => prev ? { ...prev, ...updatedData, updatedAt: new Date() as any } : null);
        setIsDirty(false);

      } else {
        // Create new note
        const noteData = {
          userId: user.uid,
          title,
          content: currentContent,
          category,
        };
        const docRef = await addDoc(collection(firestore, 'users', user.uid, 'notes'), {
          ...noteData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Note Saved' });
        // This is a simplified representation. `serverTimestamp` won't resolve here.
        // `useCollection` will eventually pick up the new note.
        handleSelectNote({ id: docRef.id, ...noteData, createdAt: new (serverTimestamp as any)(), updatedAt: new (serverTimestamp as any)()});
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
                                        <p className="font-semibold truncate text-base">{note.title}</p>
                                        <div className="text-sm text-muted-foreground truncate" dangerouslySetInnerHTML={{ __html: note.content || 'No content' }} />
                                        <p className="text-xs text-muted-foreground mt-1">
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
    <div className="flex flex-col h-full" key={selectedNote?.id || (isCreatingNew ? 'new-note' : 'empty-editor')}>
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
                onChange={(e) => {
                    setTitle(e.target.value);
                    setIsDirty(true);
                }}
                className="text-lg font-semibold"
            />
            <Select value={category} onValueChange={(value) => {
                setCategory(value as NoteCategory);
                setIsDirty(true);
            }}>
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
            <Button variant="ghost" size="icon" onMouseDown={(e) => { e.preventDefault(); handleFormatting('bold'); }} title="Bold">
                <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onMouseDown={(e) => { e.preventDefault(); handleFormatting('italic'); }} title="Italic">
                <Italic className="h-4 w-4" />
            </Button>
             <Button variant="ghost" size="icon" onMouseDown={(e) => { e.preventDefault(); handleFormatting('underline'); }} title="Underline">
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
                            <Button key={color} size="icon" className="h-6 w-6 rounded-full border" style={{backgroundColor: color}} onMouseDown={(e) => { e.preventDefault(); handleFormatting('foreColor', color); }} />
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
            <div className="h-6 w-px bg-border mx-1" />
            <Button variant="ghost" size="icon" onClick={() => changeFontSize('decrease')} title="Decrease font size">
                <Minus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => changeFontSize('increase')} title="Increase font size">
                <Plus className="h-4 w-4" />
            </Button>
        </div>
        <div
          ref={contentRef}
          onInput={() => setIsDirty(true)}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            "flex-grow min-h-[300px] border rounded-md p-3 focus:ring-2 focus:ring-ring focus:outline-none text-base"
          )}
        />
      </div>
      <div className="flex justify-between items-center mt-4 flex-shrink-0">
        <div>
        {selectedNote && (
          <div className="flex gap-2">
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
             <Button variant="outline" size="sm" onClick={handleExportPdf}>
                <Download className="mr-2 h-4 w-4" /> Export as PDF
            </Button>
          </div>
        )}
        </div>
        <Button onClick={handleSaveNote} disabled={isSaving || !title.trim() || !isDirty}>
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
        <AlertDialog open={isDiscardAlertOpen} onOpenChange={setIsDiscardAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave? Your changes will be discarded.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelDiscard}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDiscard} className="bg-destructive hover:bg-destructive/90">
                Discard Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  )
}
