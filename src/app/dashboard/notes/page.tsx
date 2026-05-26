'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Trash2, FileText, Download, ArrowLeft, CornerUpLeft } from 'lucide-react';
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
  getDoc,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import jsPDF from 'jspdf';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';

const noteCategories: NoteCategory[] = ['Personal', 'Church', 'Revelation', 'Other'];

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
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoteCategory>('Personal');
  const [isDirty, setIsDirty] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
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
  
  useEffect(() => {
    if (editorVisible) {
      if (selectedNote) {
        setTitle(selectedNote.title);
        setContent(selectedNote.content || '');
        setCategory(selectedNote.category || 'Personal');
      } else {
        setTitle('');
        setContent('');
        setCategory('Personal');
      }
      setIsDirty(false);
    }
  }, [selectedNote, isCreatingNew, editorVisible]);

  const handleBackToList = () => {
    setSelectedNote(null);
    setIsCreatingNew(false);
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
        const dateString = selectedNote.updatedAt?.toDate ? format(selectedNote.updatedAt.toDate(), 'PPP p') : 'Just now';
        doc.text(`Category: ${selectedNote.category}`, 15, 28);
        doc.text(`Last updated: ${dateString}`, 15, 33);
        
        doc.setDrawColor(200);
        doc.line(15, 38, 195, 38);
        
        doc.setFontSize(12);
        doc.setTextColor(0);

        const splitText = doc.splitTextToSize(selectedNote.content, 180);
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
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Authentication Error' });
      return;
    }

    if (!content.trim()) {
        toast({ variant: 'destructive', title: 'Content is required.' });
        return;
    }
    
    const newTitle = title.trim() || content.split('\n')[0].substring(0, 50) || 'Untitled Note';

    setIsSaving(true);
    try {
      if (selectedNote) {
        const noteRef = doc(firestore, 'users', user.uid, 'notes', selectedNote.id);
        const updatedData = {
          title: newTitle,
          content: content,
          category,
          updatedAt: serverTimestamp(),
        };
        await updateDoc(noteRef, updatedData);
        
        const updatedDocSnap = await getDoc(noteRef);
        if (updatedDocSnap.exists()) {
            setSelectedNote({ id: updatedDocSnap.id, ...updatedDocSnap.data() } as Note);
        }
        
        toast({ title: 'Note Updated' });
        setIsDirty(false);

      } else {
        const noteData = {
          userId: user.uid,
          title: newTitle,
          content: content,
          category,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(firestore, 'users', user.uid, 'notes'), noteData);

        const newDocSnap = await getDoc(docRef);
        if (newDocSnap.exists()) {
             const newNote: Note = { id: newDocSnap.id, ...newDocSnap.data() } as Note;
             setSelectedNote(newNote);
        }

        toast({ title: 'Note Saved' });
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
  
  const NoteList = (
    <div className="space-y-4 h-full flex flex-col min-w-0">
       <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Input
              placeholder="Search your journal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow h-11 rounded-2xl"
          />
          <Button onClick={handleNewNote} className="w-full sm:w-auto h-11 rounded-2xl font-bold">
              <Plus className="mr-2 h-4 w-4" /> Add Note
          </Button>
      </div>
      <ScrollArea className="flex-1 min-h-0 w-full">
        <div className="min-w-0 pr-2">
            {notesLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
            ) : filteredNotes && filteredNotes.length > 0 ? (
            <Accordion type="multiple" defaultValue={noteCategories} className="w-full space-y-3 min-w-0">
                {noteCategories.map(cat => {
                    const categoryNotes = groupedNotes[cat] || [];
                    if (categoryNotes.length === 0) return null;

                    return (
                        <AccordionItem value={cat} key={cat} className="border rounded-2xl overflow-hidden px-4 bg-muted/10 min-w-0">
                            <AccordionTrigger className="hover:no-underline text-xs font-black uppercase tracking-widest text-muted-foreground">{cat} ({categoryNotes.length})</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-3 pt-2 pb-2 min-w-0 max-h-80 overflow-y-auto px-1">
                                    {categoryNotes.map(note => {
                                        const cleanContent = (note.content || "No content")
                                          .replace(/<[^>]*>?/gm, '')
                                          .replace(/&nbsp;/g, ' ')
                                          .replace(/\s+/g, ' ')
                                          .trim();
                                        return (
                                            <button
                                                key={note.id}
                                                onClick={() => handleSelectNote(note)}
                                                className={cn(
                                                    "w-full text-left p-4 rounded-xl border transition-all duration-200 bg-background hover:shadow-md overflow-hidden min-w-0 flex flex-col max-w-full group",
                                                    selectedNote?.id === note.id ? "ring-2 ring-primary border-transparent" : "hover:bg-muted/50"
                                                )}
                                            >
                                                <p className="font-bold text-sm sm:text-base truncate break-words leading-tight w-full">{note.title}</p>
                                                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed break-words w-full">{cleanContent}</p>
                                                <div className="mt-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/60 w-full">
                                                    {note.updatedAt?.toDate ? format(note.updatedAt.toDate(), 'PPP') : 'Just now'}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
            ) : (
            <div className="text-center py-20 border-2 border-dashed rounded-[2rem] bg-muted/5 mx-1 flex flex-col items-center">
                <FileText className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
                <h3 className="font-bold text-lg">{searchTerm ? 'No matches' : 'Empty Journal'}</h3>
                <p className="text-sm text-muted-foreground mt-1 px-12 text-balance leading-relaxed">
                {searchTerm ? 'Try a different search term.' : 'Click "Add Note" to start your spiritual record.'}
                </p>
            </div>
            )}
        </div>
      </ScrollArea>
    </div>
  );
  
  const NoteEditor = (
    <div className="flex flex-col h-full overflow-hidden min-w-0" key={selectedNote?.id || (isCreatingNew ? 'new-note' : 'empty-editor')}>
      {isMobile && (
        <Button onClick={handleBackToList} variant="ghost" size="sm" className="mb-2 self-start pl-0 text-primary font-bold uppercase tracking-widest text-[10px]">
            <CornerUpLeft className="mr-2 h-3.5 w-3.5" /> Back to List
        </Button>
      )}
      <div className="space-y-4 flex-grow flex flex-col min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Note Title</Label>
                <Input
                    placeholder="Untitled Revelation"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        setIsDirty(true);
                    }}
                    className="text-lg font-bold h-12 rounded-2xl bg-muted/20"
                />
            </div>
            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Category</Label>
                <Select value={category} onValueChange={(value) => {
                    setCategory(value as NoteCategory);
                    setIsDirty(true);
                }}>
                    <SelectTrigger className="h-12 rounded-2xl font-medium">
                        <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                        {noteCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
        
        <div className="flex-grow flex flex-col min-h-0 space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Journal Content</Label>
            <Textarea
                placeholder="What has the Spirit placed on your heart?"
                value={content}
                onChange={(e) => {
                    setContent(e.target.value);
                    setIsDirty(true);
                }}
                className="flex-grow min-h-0 text-lg sm:text-xl leading-relaxed p-6 rounded-[2rem] bg-muted/10 resize-none border-dashed overflow-y-auto"
            />
        </div>
      </div>
      <div className="flex justify-between items-center py-6 shrink-0 border-t mt-auto">
        <div className="flex gap-2">
            {selectedNote && (
                <>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isDeleting} className="text-destructive hover:bg-destructive/10 h-11 w-11 rounded-full">
                            {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl p-8">
                        <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold font-headline">Delete Journal Entry?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                            This will permanently remove "{selectedNote.title}" from your spiritual record.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel className="rounded-2xl h-11">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-11 font-bold">Confirm Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline" size="icon" onClick={handleExportPdf} className="h-11 w-11 rounded-full" title="Export as PDF">
                    <Download className="h-4 w-4" />
                </Button>
                </>
            )}
        </div>
        <Button onClick={handleSaveNote} disabled={isSaving || !isDirty} className="px-10 h-12 rounded-2xl font-black shadow-lg shadow-primary/20">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {selectedNote ? 'SAVE CHANGES' : 'SAVE REVELATION'}
        </Button>
      </div>
    </div>
  );
  
  return (
    <div className="h-full flex flex-col p-4 md:p-10 overflow-hidden bg-background">
       <div className="flex-shrink-0 flex items-center gap-4 mb-4 sm:mb-8">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full shadow-sm">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <div className="space-y-0.5">
                <h1 className="text-2xl md:text-4xl font-black tracking-tight uppercase font-headline">Spiritual Journal</h1>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Milestones of your walk with God</p>
            </div>
       </div>
       <div className="flex-grow min-h-0">
            {(!mounted || !isMobile) ? (
                <div className="grid grid-cols-3 gap-10 h-full">
                    <div className="col-span-1 h-full overflow-hidden">
                        {NoteList}
                    </div>
                    <div className="col-span-2 h-full flex flex-col overflow-hidden">
                        {editorVisible ? NoteEditor : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground border-2 border-dashed rounded-[3rem] p-12 bg-muted/5">
                                <FileText className="h-20 w-20 mb-6 opacity-10" />
                                <h3 className="text-xl font-black font-headline mb-2 uppercase tracking-tight">Select an entry to view or edit</h3>
                                <p className="text-sm max-w-[280px] leading-relaxed">Your journal is a living record of God's work in your life.</p>
                                <Button onClick={handleNewNote} variant="outline" className="mt-8 h-11 rounded-full font-black px-10 border-primary/20 text-primary hover:bg-primary/10">
                                     <Plus className="mr-2 h-4 w-4" /> NEW JOURNAL ENTRY
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <Tabs value={activeTab} onValueChange={(newTab) => {
                  if (isDirty) {
                    setNavigationTarget(newTab as 'list' | 'editor');
                    setIsDiscardAlertOpen(true);
                  } else {
                      setActiveTab(newTab);
                  }
                }} className="h-full flex flex-col min-w-0">
                    <TabsList className="grid w-full grid-cols-2 shrink-0 h-12 p-1 bg-muted/30 rounded-2xl mb-4 sm:mb-6">
                        <TabsTrigger value="list" className="rounded-xl font-bold">Past Records</TabsTrigger>
                        <TabsTrigger value="editor" className="rounded-xl font-bold">{selectedNote ? 'Edit Entry' : 'New Entry'}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="list" className="flex-grow min-h-0 overflow-hidden h-full data-[state=inactive]:hidden">
                        {NoteList}
                    </TabsContent>
                    <TabsContent value="editor" className="flex-grow flex flex-col min-h-0 h-full overflow-hidden data-[state=inactive]:hidden">
                        {editorVisible ? NoteEditor : (
                            <div className="text-center text-muted-foreground py-20 flex flex-col items-center justify-center h-full border-2 border-dashed rounded-[2rem] bg-muted/5 mx-1">
                               <p className="font-black uppercase tracking-tight">No note selected</p>
                               <p className="text-xs mt-2 opacity-70">Choose from your list or start fresh.</p>
                               <Button onClick={handleNewNote} variant="outline" className="mt-6 h-10 rounded-full px-8 font-bold border-primary/20 text-primary">
                                   <Plus className="mr-2 h-4 w-4" /> Start Writing
                               </Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            )}
       </div>
        <AlertDialog open={isDiscardAlertOpen} onOpenChange={setIsDiscardAlertOpen}>
          <AlertDialogContent className="rounded-3xl p-8">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold">Unsaved Revelations</AlertDialogTitle>
              <AlertDialogDescription className="text-sm">
                You have unsaved changes in your editor. If you leave now, these thoughts will not be saved to your journal.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 gap-3">
              <AlertDialogCancel onClick={handleCancelDiscard} className="rounded-2xl h-11">Keep Writing</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDiscard} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-11 font-bold">
                Discard Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  )
}
