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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Trash2, FileText, CornerUpLeft, Edit, Sparkles } from 'lucide-react';
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
import { cn, safeToDate } from '@/lib/utils';
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
import { Label } from '../ui/label';

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
  const [isDirty, setIsDirty] = useState(false);

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
      setIsDirty(false);
    }
  }, [isOpen]);

  const editorVisible = selectedNote || isCreatingNew;

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category || 'Personal');
    setIsCreatingNew(false);
    setIsDirty(false);
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
    setIsDirty(false);
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
    setIsDirty(false);
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
      setIsDirty(false);
      if (!disciplineCompletedInSession) {
        onDisciplineCompleted();
        setDisciplineCompletedInSession(true);
      }
      handleBackToList();
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
    const noteId = selectedNote.id;
    const noteRef = doc(firestore, 'users', user.uid, 'notes', noteId);

    try {
        // Atomic UI reset before background deletion
        const noteTitle = selectedNote.title;
        handleBackToList();
        
        await deleteDoc(noteRef);
        toast({ title: 'Note Deleted', description: `"${noteTitle}" has been removed.` });
    } catch(e: any) {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({ path: noteRef.path, operation: 'delete' }, user);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete note.' });
        }
    } finally {
        setIsDeleting(false);
    }
  };
  
  const NoteList = (
    <div className="space-y-4 h-full flex flex-col min-w-0">
       <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Input
              placeholder="Search your revelations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow h-11 rounded-2xl"
          />
          <Button onClick={handleNewNote} className="w-full sm:w-auto h-11 rounded-2xl font-bold" variant="secondary">
              <Plus className="mr-2 h-4 w-4" /> New Entry
          </Button>
      </div>
      <ScrollArea className="flex-1 min-h-0 w-full">
        <div className="min-w-0 pr-2">
            {notesLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" /></div>
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
                                                "w-full text-left p-4 rounded-xl border transition-all duration-200 bg-background hover:shadow-md overflow-hidden min-w-0 flex flex-col group",
                                                selectedNote?.id === note.id ? "ring-2 ring-primary border-transparent" : "hover:bg-muted/50"
                                                )}
                                            >
                                                <p className="font-bold text-sm sm:text-base truncate break-words leading-tight w-full">{note.title}</p>
                                                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed break-words w-full">{cleanContent}</p>
                                                <div className="flex justify-between items-center mt-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/60 w-full">
                                                <span>{note.updatedAt?.toDate ? format(note.updatedAt.toDate(), 'PPP') : 'Just now'}</span>
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
                <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground opacity-20" />
                </div>
                <h3 className="font-bold text-lg">{searchTerm ? 'No matches' : 'Empty Spiritual Journal'}</h3>
                <p className="text-sm text-muted-foreground mt-1 px-12 leading-relaxed text-balance">Start journaling your revelations and prayers today to track God's faithfulness.</p>
                <Button onClick={handleNewNote} variant="outline" className="mt-6 h-10 rounded-full font-bold px-8">
                    <Plus className="mr-2 h-4 w-4" /> Start Journaling
                </Button>
            </div>
            )}
        </div>
      </ScrollArea>
    </div>
  );
  
  const NoteEditor = (
    <div className={cn("flex flex-col min-w-0", !isMobile && "h-full overflow-hidden")} key={selectedNote?.id || (isCreatingNew ? 'new-note' : 'empty-editor')}>
      {isMobile && (
        <Button onClick={handleBackToList} variant="ghost" size="sm" className="mb-4 self-start pl-0 text-primary font-bold uppercase tracking-widest text-[10px]">
            <CornerUpLeft className="mr-2 h-3.5 w-3.5" /> Back to Journal
        </Button>
      )}
      <div className={cn("space-y-4", !isMobile && "flex-grow flex flex-col min-h-0")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Title</Label>
                <input
                    placeholder="E.g., Morning Revelation"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
                    className="flex h-12 w-full rounded-2xl border-none bg-muted/20 px-4 text-lg font-bold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>
            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Category</Label>
                <Select value={category} onValueChange={(value) => { setCategory(value as NoteCategory); setIsDirty(true); }}>
                    <SelectTrigger className="h-12 rounded-2xl font-medium">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        {noteCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
        <div className={cn("space-y-1.5", !isMobile && "flex-grow flex flex-col min-h-0")}>
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Content</Label>
            <Textarea
                placeholder="What is the Spirit saying to you today?"
                value={content}
                onChange={(e) => { setContent(e.target.value); setIsDirty(true); }}
                className={cn(
                    "text-xl sm:text-2xl leading-relaxed p-8 rounded-[2rem] bg-muted/10 resize-none border-dashed",
                    !isMobile ? "min-h-[250px]" : "flex-grow min-h-0 overflow-y-auto"
                )}
            />
        </div>
      </div>
      {!isMobile && (
        <div className="flex justify-between items-center py-6 shrink-0 border-t mt-auto">
            <div>
            {selectedNote && (
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
                        This will permanently remove "{selectedNote?.title || 'this note'}" from your Kingdom record.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                    <AlertDialogCancel className="rounded-2xl h-11">Keep it</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-11 font-bold">Delete permanently</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            )}
            </div>
            <Button onClick={handleSaveNote} disabled={isSaving || !content.trim() || !isDirty} className="px-10 h-12 rounded-2xl font-black shadow-lg shadow-primary/20">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {selectedNote ? 'SAVE CHANGES' : 'SAVE REVELATION'}
            </Button>
        </div>
      )}
    </div>
  );

  const innerContent = !mounted ? null : isMobile ? (
    <Tabs value={mobileTab} onValueChange={setMobileTab} className="flex flex-col min-w-0">
        <TabsList className="grid w-full grid-cols-2 shrink-0 h-11 p-1 bg-muted/30 rounded-2xl mb-4">
            <TabsTrigger value="list" className="rounded-xl font-bold">Past Notes</TabsTrigger>
            <TabsTrigger value="editor" disabled={!editorVisible} className="rounded-xl font-bold">
                {selectedNote ? 'Edit Entry' : 'New Entry'}
            </TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="data-[state=inactive]:hidden">
            {NoteList}
        </TabsContent>
        <TabsContent value="editor" className="data-[state=inactive]:hidden">
            {editorVisible ? NoteEditor : (
                <div className="text-center text-muted-foreground py-20 flex flex-col items-center justify-center h-full">
                    <p>Select a note to edit.</p>
                </div>
            )}
        </TabsContent>
    </Tabs>
) : (
    <div className="grid grid-cols-3 gap-8 h-full overflow-hidden">
        <div className="col-span-1 h-full overflow-hidden">
            {NoteList}
        </div>
        <div className="col-span-2 h-full flex flex-col overflow-hidden">
            {editorVisible ? NoteEditor : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground border-2 border-dashed rounded-[3rem] p-12 bg-muted/5">
                    <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6">
                        <Edit className="h-10 w-10 text-muted-foreground opacity-10" />
                    </div>
                    <h3 className="text-xl font-black font-headline mb-2 uppercase tracking-tight">Select a note to view or edit</h3>
                    <p className="text-sm max-w-[280px] leading-relaxed">Your journal is a record of your personal journey with God.</p>
                    <Button onClick={handleNewNote} variant="outline" className="mt-8 h-11 rounded-full font-black px-10 border-primary/20 text-primary hover:bg-primary/10">
                        <Plus className="mr-2 h-4 w-4" /> NEW JOURNAL ENTRY
                    </Button>
                </div>
            )}
        </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="p-0 flex flex-col h-[95dvh] rounded-t-[2.5rem]">
            <div className="p-6 border-b flex-shrink-0 bg-muted/10">
              <SheetHeader className="text-left">
                  <SheetTitle className="text-2xl font-black font-headline">Journal</SheetTitle>
                  <SheetDescription className="text-sm font-medium mt-1">Capture your reflections and revelations.</SheetDescription>
              </SheetHeader>
            </div>
            <ScrollArea className="flex-grow">
              <div className="p-6">
                {innerContent}
              </div>
            </ScrollArea>
            <div className="p-6 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm flex flex-col gap-3">
                {mobileTab === 'editor' && editorVisible && (
                  <Button 
                    onClick={handleSaveNote} 
                    disabled={isSaving || !content.trim() || !isDirty} 
                    className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase"
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedNote ? 'SAVE CHANGES' : 'SAVE REVELATION'}
                  </Button>
                )}
                <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full h-12 rounded-2xl font-bold">
                  Close Journal
                </Button>
            </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl h-[85vh] flex flex-col p-8 rounded-3xl overflow-hidden">
        <DialogHeader className="shrink-0 mb-2">
          <DialogTitle className="text-3xl font-black font-headline">Journal</DialogTitle>
          <DialogDescription className="text-base font-medium">A place for your thoughts, reflections, and revelations.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0 overflow-hidden">
            {innerContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
