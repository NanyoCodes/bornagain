
'use client';

import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
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
import { Loader2, Plus, Trash2, FileText, Bold, Italic, CornerUpLeft, Underline, Palette, Minus, Download, XCircle } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import jsPDF from 'jspdf';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter } from 'next/navigation';


const noteCategories: NoteCategory[] = ['Personal', 'Church', 'Revelation', 'Other'];
const colorSwatches = ['#000000', '#FFFFFF', '#ef4444', '#f97316', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
const fontFamilies = [
  { name: 'Default', value: 'Inter, sans-serif' },
  { name: 'Serif', value: 'Playfair Display, serif' },
  { name: 'Monospace', value: 'Source Code Pro, monospace' },
  { name: 'Comic', value: 'Comic Sans MS, cursive' },
  { name: 'Handwriting', value: 'Brush Script MT, cursive' },
];


export default function NotesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<NoteCategory>('Personal');
  const [isDirty, setIsDirty] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(16);

  const [activeTab, setActiveTab] = useState('editor');
  
  const [isDiscardAlertOpen, setIsDiscardAlertOpen] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<'list' | 'editor' | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

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
        (note.content && note.content.toLowerCase().includes(lowercasedTerm)) ||
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

  const editorVisible = selectedNote || isCreatingNew;

  const updateFontSizeFromSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && contentRef.current) {
      const range = selection.getRangeAt(0);
      let element: Node | null = range.startContainer;
      
      while (element && element !== contentRef.current) {
        if (element.nodeType === Node.ELEMENT_NODE) {
          const fontSizeStyle = (element as HTMLElement).style.fontSize;
          if (fontSizeStyle) {
            const size = parseInt(fontSizeStyle, 10);
            if (!isNaN(size)) {
              setFontSize(size);
              return;
            }
          }
        }
        element = element.parentNode;
      }
    }
    setFontSize(16); // Default size if nothing is found
  };
  
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setCategory(selectedNote.category || 'Personal');
    } else {
      setTitle('');
      setCategory('Personal');
    }
    setIsDirty(false);
  }, [selectedNote]);
  
  useLayoutEffect(() => {
    if (contentRef.current) {
        if (selectedNote) {
            contentRef.current.innerHTML = selectedNote.content || '';
        } else {
            contentRef.current.innerHTML = '';
        }
    }
  }, [selectedNote]);

  const handleBackToList = () => {
    setSelectedNote(null);
    setIsCreatingNew(false);
    setTitle('');
    setCategory('Personal');
    if (contentRef.current) {
      contentRef.current.innerHTML = '';
    }
    if (isMobile) {
      setActiveTab('list');
    }
  }
  
  const handleSelectNote = (note: Note) => {
    if (isDirty) {
      setNavigationTarget('list');
      setIsDiscardAlertOpen(true);
      return;
    }
    setSelectedNote(note);
    setIsCreatingNew(false);
    if (isMobile) {
      setActiveTab('editor');
    }
  };

  const handleNewNote = () => {
     if (isDirty) {
      setNavigationTarget('editor');
      setIsDiscardAlertOpen(true);
      return;
    }
    setSelectedNote(null);
    setIsCreatingNew(true);
    if (isMobile) {
      setActiveTab('editor');
    }
  };
  
  const handleConfirmDiscard = () => {
    setIsDirty(false);
    if (navigationTarget === 'list') {
      handleBackToList();
    } else if (navigationTarget === 'editor') {
        setSelectedNote(null);
        setIsCreatingNew(true);
        setActiveTab('editor');
    }
    setNavigationTarget(null);
    setIsDiscardAlertOpen(false);
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
    document.execCommand('fontSize', false, "1"); // A trick to apply span
    const fontElements = contentRef.current.getElementsByTagName('font');
    for (let i = 0; i < fontElements.length; i++) {
        if (fontElements[i].size === "1") {
            const currentSize = parseFloat(window.getComputedStyle(fontElements[i]).fontSize);
            let newSize;
            if (direction === 'increase') {
                newSize = Math.min(currentSize + 2, 48); // Max size 48px
            } else {
                newSize = Math.max(currentSize - 2, 10); // Min size 10px
            }
            fontElements[i].removeAttribute('size');
            fontElements[i].style.fontSize = newSize + 'px';
            setFontSize(newSize);
        }
    }
    setIsDirty(true);
  };

  const handleExportPdf = () => {
    if (!selectedNote || !contentRef.current) return;

    try {
        const doc = new jsPDF();
        
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(selectedNote.title, 15, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        const dateString = selectedNote.updatedAt?.toDate ? format(selectedNote.updatedAt.toDate(), 'PPP p') : 'Just now';
        doc.text(`Category: ${selectedNote.category}`, 15, 28);
        doc.text(`Last updated: ${dateString}`, 15, 33);
        
        doc.setDrawColor(200);
        doc.line(15, 38, 195, 38);
        
        doc.setFontSize(12);
        doc.setTextColor(0);

        let yPos = 48;
        const lineSpacing = 7;
        const paragraphSpacing = 4;

        const contentNodes = Array.from(contentRef.current.childNodes);

        contentNodes.forEach(node => {
            const text = node.textContent || '';
            const splitText = doc.splitTextToSize(text, 180);
            
            const textHeight = splitText.length * lineSpacing + paragraphSpacing;
            if (yPos + textHeight > 280) { 
                doc.addPage();
                yPos = 20; 
            }

            doc.text(splitText, 15, yPos);
            yPos += (splitText.length * lineSpacing) + paragraphSpacing;
        });


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
        
        setSelectedNote(prev => prev ? { ...prev, ...updatedData, updatedAt: new Date() as any, content: currentContent } : null);
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
        const newNote: Note = { id: docRef.id, ...noteData, createdAt: new (serverTimestamp as any)(), updatedAt: new (serverTimestamp as any)()};
        setSelectedNote(newNote);
        setIsCreatingNew(false);
        setIsDirty(false);
      }
    } catch (e) {
      if ((e as any)?.name !== 'FirestorePermissionError') {
        const permissionError = new FirestorePermissionError({ path: `users/${user.uid}/notes`, operation: 'write' }, user);
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
        const permissionError = new FirestorePermissionError({ path: noteRef.path, operation: 'delete' }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsDeleting(false);
    }
  };
  
  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    setIsDirty(true);
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
              <Plus className="mr-2 h-4 w-4" /> Add Note
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
                                {categoryNotes.map(note => {
                                    const contentPreview = (note.content || "No content").replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
                                    const truncatedContent = contentPreview.length > 150 
                                        ? `${contentPreview.substring(0, 150)}...` 
                                        : contentPreview;

                                    return (
                                        <Card
                                            key={note.id}
                                            onClick={() => handleSelectNote(note)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectNote(note); }}
                                            role="button"
                                            tabIndex={0}
                                            className={cn(
                                                "cursor-pointer",
                                                selectedNote?.id === note.id && "ring-2 ring-primary"
                                            )}
                                        >
                                            <CardHeader className="p-4 pb-2">
                                                <CardTitle className="text-base truncate">{note.title}</CardTitle>
                                                <CardDescription className="text-xs">
                                                    {note.updatedAt?.toDate ? format(note.updatedAt.toDate(), 'PPP') : 'Just now'}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="p-4 pt-0">
                                                <p className="text-sm text-muted-foreground">{truncatedContent}</p>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
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
            {searchTerm ? 'Try a different search term.' : 'Click "Add Note" to start journaling.'}
          </p>
        </div>
      )}
    </div>
  );
  
  const NoteEditor = (
    <div className="flex flex-col h-full" key={selectedNote?.id || (isCreatingNew ? 'new-note' : 'empty-editor')}>
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
             <Select onValueChange={(value) => handleFormatting('fontName', value)}>
                <SelectTrigger className="w-[150px] h-9">
                    <SelectValue placeholder="Font" />
                </SelectTrigger>
                <SelectContent>
                    {fontFamilies.map(font => (
                        <SelectItem key={font.name} value={font.value} style={{fontFamily: font.value}}>
                            {font.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="h-6 w-px bg-border mx-1" />
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
             <div className="px-2 text-sm text-muted-foreground w-10 text-center">{fontSize}px</div>
            <Button variant="ghost" size="icon" onClick={() => changeFontSize('increase')} title="Increase font size">
                <Plus className="h-4 w-4" />
            </Button>
        </div>
        <div
          ref={contentRef}
          onInput={() => !isDirty && setIsDirty(true)}
          onPaste={handlePaste}
          onMouseUp={updateFontSizeFromSelection}
          onKeyUp={updateFontSizeFromSelection}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            "flex-grow border rounded-md p-3 focus:ring-2 focus:ring-ring focus:outline-none text-base"
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
  
  return (
    <div className="space-y-4 h-full flex flex-col p-4 md:p-6 md:pb-6">
       <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold tracking-tight">My Notes</h1>
       </div>
       <div className="flex-grow min-h-0">
            {(!mounted || !isMobile) ? (
                <div className="grid grid-cols-3 gap-6 h-full pt-4">
                    <div className="col-span-1 h-full">
                        <ScrollArea className="h-full">
                           <div className="pr-1">
                            {NoteList}
                           </div>
                        </ScrollArea>
                    </div>
                    <div className="col-span-2 h-full flex flex-col">
                        {editorVisible ? NoteEditor : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                                <FileText className="h-12 w-12 mb-4" />
                                <h3 className="font-semibold">Select a note to view or edit</h3>
                                <p className="text-sm">Or, create a new one to get started.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <Tabs value={activeTab} onValueChange={(newTab) => {
                  if (isDirty) {
                    setNavigationTarget(newTab as 'list' | 'editor');
                    setIsDiscardAlertOpen(true);
                  } else if (newTab === 'list') {
                      handleBackToList();
                  } else {
                      setActiveTab(newTab);
                  }
                }}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="editor">{editorVisible && !isCreatingNew ? 'Edit Note' : 'New Note'}</TabsTrigger>
                        <TabsTrigger value="list">All Notes ({notes?.length || 0})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="editor" className="flex-grow flex flex-col min-h-0 mt-2">
                        {editorVisible ? NoteEditor : (
                            <div className="text-center text-muted-foreground py-10 flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg">
                               <p className="font-semibold">No note selected</p>
                               <p className="text-sm">Select a note to edit, or create a new one.</p>
                               <div className="flex items-center gap-4 mt-4">
                                    <Button onClick={handleNewNote} variant="outline">
                                        <Plus className="mr-2 h-4 w-4" /> New Note
                                    </Button>
                                    <Button onClick={() => router.back()} variant="secondary">
                                      Close
                                    </Button>
                               </div>
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="list" className="flex-grow min-h-0 mt-2">
                        <ScrollArea className="h-full">
                            <div className="pr-1">
                                {NoteList}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            )}
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
