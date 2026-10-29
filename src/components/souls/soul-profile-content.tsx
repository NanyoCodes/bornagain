'use client';

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { 
  BookOpen, 
  Heart, 
  Sparkles,
  ArrowLeft,
  Zap, 
  Mail, 
  Phone, 
  MessageSquare, 
  Loader2, 
  Check,
  Award,
  HandHeart,
  PartyPopper,
  X,
  Target,
  Share,
  HeartHandshake,
  Search,
  BookMarked,
  Clock,
  Edit,
  Gift,
  History,
  Home,
  Lock,
  PlusCircle,
  Quote,
  Send,
  Users,
  Utensils,
  Download,
  ClipboardList,
  Camera,
  Smartphone,
  ChevronRight,
  Church,
  ShieldCheck,
  Trash2,
  MapPin,
  Info,
  Calendar,
  ChevronDown,
  TrendingUp,
  Music,
  ExternalLink,
  Mic,
  Gamepad2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn, safeToDate } from "@/lib/utils";
import { useUser, useDoc, useCollection, useFirestore, useUserProfile } from "@/firebase";
import {
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  collection, 
  query, 
  serverTimestamp, 
  addDoc, 
  getDocs, 
  where,
  writeBatch,
  getDoc,
  setDoc
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { getBibleChapter, type BibleChapterOutput } from "@/ai/flows/get-bible-chapter-flow";
import { bibleData } from "@/lib/bible-data";
import { actionItems, prayerTemplates, kingdomVerses } from "@/lib/follow-up-data";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { MutualConnectBadge } from "./mutual-connect-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import Image from 'next/image';
import { useRouter } from "next/navigation";
import Link from 'next/link';
import type { Soul, FollowUpStatus, UserProfile, DailyDevotional, TestimonyComment } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { CreateTestimonyForm } from "@/components/testimonies/create-testimony-form";

export const iconMap: Record<string, any> = {
    'prayed_together': Sparkles,
    'studied_bible': BookOpen,
    'shared_meal': Utensils,
    'visited_home': Home,
    'introduced_friend': Users,
    'gave_gift': Gift,
    'phone_call': Phone,
    'text_message': MessageSquare,
    'helped_with_need': Heart,
    'invited_to_event': Calendar,
    'matchmaking': HeartHandshake,
};

export function getStatusClasses(status: FollowUpStatus | undefined): string {
    if (!status) return 'bg-secondary text-secondary-foreground border-border';
    switch (status) {
        case 'New':
            return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-500';
        case 'Contacted':
            return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-500';
        case 'Established':
            return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-500';
        default:
            return 'bg-secondary text-secondary-foreground border-border';
    }
}

export const MediaPreview = ({ url, type, isFull = false }: { url: string, type: 'image' | 'video' | 'audio', isFull?: boolean }) => {
  const isAudio = type === 'audio';
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const mediaContent = (
      <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
          <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
              {type === 'image' ? (
                  <Image src={url} alt="Proof Full" fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized />
              ) : type === 'video' ? (
                  <video 
                    key={url}
                    src={url} 
                    className="w-full h-full object-contain" 
                    playsInline 
                    controls 
                    autoPlay 
                    preload="metadata" 
                  />
              ) : (
                  <div className="w-full max-w-sm flex flex-col items-center gap-8 bg-zinc-900 p-12 rounded-[3rem] border border-white/10 shadow-2xl">
                      <div className="relative text-center">
                          <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 shadow-[0_0_50px_rgba(249,116,22,0.15)] mx-auto">
                              <Mic className="h-16 w-16 text-primary" />
                          </div>
                          <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-primary animate-pulse" />
                      </div>
                      <div className="space-y-2 text-center">
                          <h4 className="text-xl font-black font-headline uppercase tracking-tight text-white text-center">Voice Proclamation</h4>
                          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest italic text-center">A testimony of God's goodness</p>
                      </div>
                      <audio 
                        key={url} 
                        src={url} 
                        className="w-full" 
                        controls 
                        preload="metadata" 
                        autoPlay
                      />
                  </div>
              )}
          </div>
      </div>
  );

  const trigger = (
      <div 
        className={cn(
            "relative rounded-2xl sm:rounded-3xl overflow-hidden border shadow-inner bg-muted group/media cursor-pointer",
            isAudio ? "h-auto min-h-[100px]" : "aspect-square",
            isFull && !isAudio && "h-full w-full"
        )}
        onClick={() => setIsOpen(true)}
      >
          {type === 'image' ? (
              <Image src={url} alt="Proof" fill className="object-cover transition-transform group-hover/media:scale-105" unoptimized />
          ) : type === 'video' ? (
              <video key={url} src={url} className="w-full h-full object-cover bg-zinc-950" muted playsInline loop preload="metadata" />
          ) : (
              <div className="w-full h-full flex flex-row items-center gap-4 bg-primary/5 p-4 text-left">
                  <div className="relative shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-inner">
                          <Mic className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <motion.div 
                        className="absolute -top-1 -right-1"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                      </motion.div>
                  </div>
                  <div className="min-w-0 flex-1 text-left text-left text-left">
                    <p className="text-[10px] sm:text-[11px] font-black uppercase text-primary tracking-widest leading-none text-left">Voice Proclamation</p>
                    <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase tracking-tighter opacity-60 text-left">Tap to Hear Miracle</p>
                  </div>
              </div>
          )}
      </div>
  );

  if (isMobile) {
      return (
          <>
            {trigger}
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
                <DrawerContent className="p-0 bg-black/95 border-0 h-dvh rounded-none flex items-center justify-center text-center">
                    <div className="sr-only">
                        <DrawerHeader>
                            <DrawerTitle>Media View</DrawerTitle>
                            <DrawerDescription>Full screen media preview.</DrawerDescription>
                        </DrawerHeader>
                    </div>
                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-50 rounded-full bg-white/10 text-white hover:bg-white/20" onClick={() => setIsOpen(false)}>
                        <X className="h-6 w-6" />
                    </Button>
                    {mediaContent}
                    <div className="absolute bottom-10 left-0 right-0 flex justify-center p-4">
                        <Button variant="link" asChild className="text-white/40 text-[10px] uppercase font-bold tracking-widest">
                          <a href={url} target="_blank" rel="noopener noreferrer">Open in new tab</a>
                        </Button>
                    </div>
                </DrawerContent>
            </Drawer>
          </>
      );
  }

  return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
          {trigger}
          <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center text-left">
              <div className="sr-only text-left text-left text-left">
                  <DialogHeader className="text-left text-left text-left">
                    <DialogTitle className="text-left text-left text-left">Full View</DialogTitle>
                    <DialogDescription className="text-left text-left text-left">Full miracle proof preview.</DialogDescription>
                  </DialogHeader>
              </div>
              {mediaContent}
          </DialogContent>
      </Dialog>
  );
};

export function LiveAuthorAvatar({ userId, fallbackInitials, className }: { userId: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userRef = React.useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const photoURL = profile?.photoURL;
    
    return (
        <Dialog>
            <DialogTrigger asChild disabled={!photoURL}>
                <div className={cn(className, photoURL && "cursor-pointer active:scale-95 transition-transform hover:scale-105")}>
                    <Avatar className="h-full w-full border shadow-sm">
                        <AvatarImage src={photoURL} className="object-cover" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary font-bold text-center flex items-center justify-center h-full w-full">{fallbackInitials || 'U'}</AvatarFallback>
                    </Avatar>
                </div>
            </DialogTrigger>
            {photoURL && (
                <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
                    <DialogHeader className="sr-only text-center"><DialogTitle>Profile Photo</DialogTitle></DialogHeader>
                    <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
                        <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
                            <Image src={photoURL} alt="Author" fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized />
                        </div>
                    </div>
                </DialogContent>
            )}
        </Dialog>
    );
}

function LiveAuthorName({ userId, fallbackName }: { userId: string, fallbackName: string }) {
    const firestore = useFirestore();
    const userRef = React.useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const name = profile ? `${profile.firstName} ${profile.lastName}` : fallbackName;
    return <span className="capitalize">{name}</span>;
}

export function IntercessionHubDialog({ isOpen, onOpenChange, soul, onComplete }: { isOpen: boolean; onOpenChange: (open: boolean) => void; soul: Soul | null; onComplete: (msg: string) => void; }) {
  const [text, setText] = useState('');
  const isMobile = useIsMobile();
  useEffect(() => { if(isOpen && soul) { setText(prayerTemplates[0].text.replace(/{name}/g, soul.firstName)); } }, [isOpen, soul]);
  
  const header = (
    <div className="p-8 border-b bg-muted/10 shrink-0 flex items-center justify-between gap-4 text-left">
        <div className="min-w-0 text-left">
            <div className="text-left text-left">
                <h2 className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left">Kingdom Intercession</h2>
                <p className="text-sm font-medium mt-1 text-left text-left text-left">Draft a powerful prayer for {soul?.firstName}.</p>
            </div>
        </div>
        <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60 hover:text-foreground" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5 text-left" />
        </Button>
    </div>
  );

  const contentBody = (
    <div className="p-8 space-y-6 text-left">
        <div className="space-y-3 text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Prayer Focus</label>
            <div className="flex flex-wrap gap-2 text-left">
                {prayerTemplates.map(t => (
                    <Button key={t.id} variant="outline" size="sm" className="rounded-full h-8 px-4 text-[9px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 text-primary text-left" onClick={() => soul && setText(t.text.replace(/{name}/g, soul.firstName))}>{t.label}</Button>
                ))}
            </div>
        </div>
        <div className="space-y-2 text-left">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Customize Your Prayer</Label>
            <Textarea value={text} onChange={e => setText(e.target.value)} className="min-h-[200px] rounded-2xl bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6 text-left" />
        </div>
        <Button onClick={() => onComplete(text)} disabled={!text.trim()} className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-center text-left">SEND</Button>
    </div>
  );

  if (isMobile) return <Sheet open={isOpen} onOpenChange={onOpenChange}><SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">{header}<ScrollArea className="flex-grow text-left">{contentBody}</ScrollArea></SheetContent></Sheet>;
  return <Dialog open={isOpen} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col text-left">{header}<ScrollArea className="flex-1 min-h-0 text-left">{contentBody}</ScrollArea></DialogContent></Dialog>;
}

export function MessageHubDialog({ isOpen, onOpenChange, soul, onChannelSelect }: { isOpen: boolean; onOpenChange: (open: boolean) => void; soul: Soul | null; onChannelSelect: (channel: 'whatsapp' | 'sms') => void; }) {
  const isMobile = useIsMobile();
  const header = (
    <div className="p-8 border-b bg-muted/10 shrink-0 flex items-center justify-between gap-4 text-left">
        <div className="min-w-0 text-left">
            <div className="flex items-center gap-2 mb-1 text-left">
                <MessageSquare className="h-4 w-4 text-primary text-left" />
                <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Channel Select</span>
            </div>
            <h2 className="text-2xl font-black font-headline uppercase tracking-tight text-left">Message Hub</h2>
            <p className="text-sm font-medium text-left">Encourage {soul?.firstName} via mobile.</p>
        </div>
        <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60 hover:text-foreground" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5 text-left" />
        </Button>
    </div>
  );
  const contentBody = (
    <div className="flex flex-col gap-3 p-8 text-left">
        <Button onClick={() => onChannelSelect('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg text-left">WhatsApp External</Button>
        <Button onClick={() => onChannelSelect('sms')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5 text-left">Standard SMS</Button>
    </div>
  );
  if (isMobile) return <Sheet open={isOpen} onOpenChange={onOpenChange}><SheetContent side="bottom" className="p-0 rounded-t-[2.5rem] h-auto pb-12 text-left">{header}{contentBody}</SheetContent></Sheet>;
  return <Dialog open={isOpen} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center text-left">{header}{contentBody}</DialogContent></Dialog>;
}

export function ShareWordDialog({ isOpen, onOpenChange, soul, onSelectVerse }: { isOpen: boolean; onOpenChange: (open: boolean) => void; soul: Soul | null; onSelectVerse: (verse: string) => void; }) {
  const isMobile = useIsMobile();
  const [view, setView] = useState<'hub' | 'books' | 'chapters' | 'verses'>('hub');
  const [bibleSearch, setBibleSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{reference: string, text: string}[]>([]);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterContent, setChapterContent] = useState<BibleChapterOutput | null>(null);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);

  useEffect(() => { if (!isOpen) { setView('hub'); setBibleSearch(''); setSearchResults([]); setSelectedBook(null); setSelectedChapter(null); setChapterContent(null); setSelectedVerses([]); } }, [isOpen]);

  const handleSearch = async () => {
      if (!bibleSearch.trim()) return;
      setIsSearching(true);
      try {
          const res = await fetch(`https://bible-api.com/${encodeURIComponent(bibleSearch)}`);
          if (res.ok) {
              const data = await res.json();
              if (data.verses) setSearchResults([{ reference: data.reference, text: data.text }]);
          }
      } catch (e) { console.warn("Search failed", e); }
      finally { setIsSearching(false); }
  };

  const handleSelectChapter = async (num: number) => {
    if (!selectedBook) return;
    setSelectedChapter(num);
    setLoadingVerses(true);
    try {
      const result = await getBibleChapter({ book: selectedBook, chapter: num });
      setChapterContent(result);
      setView('verses');
    } catch (e) { console.error(e); }
    finally { setLoadingVerses(false); }
  };

  const handleShareSelected = () => {
    if (!chapterContent || selectedVerses.length === 0) return;
    const selectedTexts = chapterContent.verses.filter(v => selectedVerses.includes(v.verse)).map(v => v.text).join(' ');
    const reference = `${chapterContent.book} ${chapterContent.chapter}:${selectedVerses.join(', ')}`;
    onSelectVerse(`"${selectedTexts.trim()}" — ${reference}\n\nJoin the harvest at Testify! Visit: ${window.location.origin}/bible`);
  };

  const header = (
    <div className="p-8 border-b bg-muted/10 shrink-0 flex items-center justify-between gap-4 text-left text-left">
      <div className="min-w-0 text-left">
        <div className="flex items-center gap-3 mb-2 text-left">
          {view !== 'hub' && <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full -ml-2" onClick={() => setView(view === 'verses' ? 'chapters' : view === 'chapters' ? 'books' : 'hub')}><ArrowLeft className="h-4 w-4" /></Button>}
          <Target className="h-5 w-5 text-primary text-left" /><span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left">Kingdom Study</span>
        </div>
        <div className="text-left">
            <h2 className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left text-left">
                {view === 'hub' ? "Share the Word" : view === 'books' ? "Select Book" : view === 'chapters' ? `${selectedBook}: Chapter` : `${selectedBook} ${selectedChapter}`}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-left">
                {view === 'hub' ? `Equip ${soul?.firstName} with the living Word.` : `Browsing ${selectedBook || 'Bible'}...`}
            </p>
        </div>
      </div>
      {view !== 'hub' && <Button variant="outline" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/40 text-left" onClick={() => onOpenChange(false)}><X className="h-5 w-5 sm:h-6 sm:w-6 text-left" /></Button>}
    </div>
  );

  const contentBody = (
    <div className="p-4 sm:p-10 text-left">
        {view === 'hub' && (
            <div className="space-y-8 text-left text-left">
                <div className="relative text-left text-left"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 text-left" /><Input placeholder="Search Bible (e.g. John 3:16)..." value={bibleSearch} onChange={e => setBibleSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="h-12 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left" /></div>
                {searchResults.map((res, idx) => (<Button key={idx} variant="outline" className="w-full h-auto p-4 rounded-2xl border-primary/20 bg-primary/5 flex flex-col items-start gap-3 text-left border-2 border-dashed text-left" onClick={() => onSelectVerse(`"${res.text.trim()}" — ${res.reference}`)}><span className="font-black text-[9px] uppercase tracking-widest text-primary text-left">{res.reference}</span><p className="text-xs text-muted-foreground italic line-clamp-4 text-left">"{res.text.trim()}"</p></Button>))}
                <div className="grid grid-cols-2 gap-4 text-left text-left">
                    <Button onClick={() => setView('books')} variant="outline" className="h-24 rounded-2xl border-2 border-primary/20 text-primary flex flex-col items-center justify-center p-4 text-center text-left">
                        <BookOpen className="h-6 w-6 mb-1 text-left" />
                        <span className="text-[10px] font-black uppercase text-center text-left">Browse Bible</span>
                    </Button>
                    <Button variant="outline" asChild className="h-24 rounded-2xl border-2 border-primary/20 text-primary flex flex-col items-center justify-center p-4 text-center text-left">
                        <Link href="/dashboard/bible" className="text-left">
                            <BookMarked className="h-6 w-6 mb-1 text-left" />
                            <span className="text-[10px] font-black uppercase text-center text-left">Open Reader</span>
                        </Link>
                    </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-left">{kingdomVerses.map((v, idx) => (<Button key={idx} variant="ghost" className="w-full justify-start h-auto py-4 px-4 rounded-2xl bg-muted/5 border border-transparent hover:bg-primary/10 transition-all text-left block text-left" onClick={() => onSelectVerse(`"${v.text.trim()}" — ${v.reference}`)}><span className="font-black text-[9px] uppercase tracking-widest text-primary text-left">{v.reference}</span><p className="text-xs text-muted-foreground italic line-clamp-2 text-left">"{v.text}"</p></Button>))}</div>
            </div>
        )}
        {view === 'books' && <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">{bibleData.map(book => (<Button key={book.name} variant="outline" className="h-12 rounded-xl font-bold uppercase text-[9px] text-left" onClick={() => { setSelectedBook(book.name); setView('chapters'); }}>{book.name}</Button>))}</div>}
        {view === 'chapters' && <div className="p-2 grid grid-cols-5 sm:grid-cols-8 gap-2 text-left">{selectedBook && bibleData.find(b => b.name === selectedBook)?.chapters.map(ch => (<Button key={ch.chapter} variant="outline" className="h-9 w-9 p-0 rounded-lg font-black text-xs text-left" onClick={() => handleSelectChapter(ch.chapter)}>{ch.chapter}</Button>))}</div>}
        {view === 'verses' && <div className="space-y-4 pb-12 text-left"><div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6 text-left text-left"><p className="text-[10px] font-black uppercase text-primary mb-1 text-left">SELECTED</p><p className="text-xs font-bold text-muted-foreground text-left">{selectedVerses.length > 0 ? `${selectedBook} ${selectedChapter}:${selectedVerses.join(', ')}` : 'Select verses below...'}</p></div><div className="space-y-1 font-serif text-left">{loadingVerses ? <div className="flex justify-center py-20 text-left"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20 text-left" /></div> : chapterContent?.verses.map(v => (<div key={v.verse} className={cn("p-3 rounded-xl transition-all cursor-pointer border-2 text-left", selectedVerses.includes(v.verse) ? "bg-primary/10 border-primary/40" : "bg-transparent border-transparent hover:bg-muted/50")} onClick={() => setSelectedVerses(prev => prev.includes(v.verse) ? prev.filter(vs => vs !== v.verse) : [...prev, v.verse].sort((a,b)=>a-b))}><sup className="text-[10px] font-black mr-2 opacity-40 text-left">{v.verse}</sup><span className="text-sm leading-relaxed text-left">{v.text}</span></div>))}</div></div>}
    </div>
  );

  const footer = view === 'verses' && <div className="p-6 border-t bg-muted/5 flex flex-col sm:flex-row gap-3 shrink-0 text-left text-left"><Button variant="outline" onClick={() => setSelectedVerses([])} className="rounded-xl h-12 flex-1 font-bold text-left text-left">Clear</Button><Button onClick={handleShareSelected} disabled={selectedVerses.length === 0} className="rounded-xl h-12 flex-[2] font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-center text-left">SHARE SELECTED ({selectedVerses.length})</Button></div>;

  if (isMobile) return <Sheet open={isOpen} onOpenChange={onOpenChange}><SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">{header}<ScrollArea className="flex-grow text-left">{contentBody}</ScrollArea>{footer}</SheetContent></Sheet>;
  return <Dialog open={isOpen} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-3xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col text-left">{header}<ScrollArea className="flex-1 min-h-0 text-left">{contentBody}</ScrollArea>{footer}</DialogContent></Dialog>;
}

export function SoulProfileContent({ soul, onFollowUp, onViewHistory, onEdit, onAssess, onOpenAssignDialog, onExportSingle, onDelete }: { soul: Soul; onFollowUp: (s: Soul) => void; onViewHistory: (s: Soul) => void; onEdit: (s: Soul) => void; onAssess: (s: Soul) => void; onOpenAssignDialog: (s: Soul) => void; onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void; onDelete: (s: Soul) => void; }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { userProfile: currentUserProfile } = useUserProfile();
  const { toast } = useToast();
  const router = useRouter();

  const [isCommChannelDialogOpen, setIsCommChannelDialogOpen] = useState(false);
  const [isHelpNeedDialogOpen, setIsHelpNeedDialogOpen] = useState(false);
  const [isShareTargetDialogOpen, setIsShareTargetDialogOpen] = useState(false);
  const [isPartnerSelectionDialogOpen, setIsPartnerSelectionDialogOpen] = useState(false);
  const [isPrayerCustomizationOpen, setIsPrayerCustomizationOpen] = useState(false);
  const [isStudyWordOpen, setIsStudyWordOpen] = useState(false);
  const [customMessageText, setCustomMessageText] = useState('');
  const [clickedActionId, setClickedActionId] = useState<string | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const address = useMemo(() => { if (!soul.locationWon) return ''; return [soul.locationWon.street, soul.locationWon.city, soul.locationWon.state, soul.locationWon.country].filter(Boolean).join(', '); }, [soul.locationWon]);
  const needs = soul.needsAssessment;
  const sortedHistory = useMemo(() => { if (!soul.followUpLog || soul.followUpLog.length === 0) return []; return [...soul.followUpLog].sort((a, b) => (safeToDate(b.date)?.getTime() ?? 0) - (safeToDate(a.date)?.getTime() ?? 0)); }, [soul.followUpLog]);

  const finalizeLog = async (s: Soul, aId: string, noteAddendum: string = '') => {
    if (!user || !firestore || !s) return;
    setIsActionSubmitting(true);
    const action = actionItems.find(a => a.id === aId);
    const batch = writeBatch(firestore);
    const soulRef = doc(firestore, `users/${s.userId}/souls`, s.id);
    const globalSoulRef = doc(firestore, 'souls', s.id);
    const memberName = `${currentUserProfile?.firstName || ''} ${currentUserProfile?.lastName || ''}`.trim() || user.displayName || 'Member';
    const logEntry = { date: new Date(), note: `Logged via Identity Hub: ${action?.label}${noteAddendum ? ` - ${noteAddendum}` : ''}`, actions: [aId], memberId: user.uid, memberName: memberName };
    batch.update(soulRef, { followUpLog: arrayUnion(logEntry), lastUpdatedAt: serverTimestamp() });
    batch.update(globalSoulRef, { followUpLog: arrayUnion(logEntry), lastUpdatedAt: serverTimestamp() });
    try { await batch.commit(); toast({ title: 'Kingdom Impact Logged' }); } catch (err) { errorEmitter.emit('permission-error', new FirestorePermissionError({ path: soulRef.path, operation: 'update' }, user)); }
    finally { setIsActionSubmitting(false); setClickedActionId(null); }
  };

  const handleActionClick = async (actionId: string) => {
    if (!soul) return;
    setClickedActionId(actionId);
    if (['phone_call', 'text_message', 'prayed_together'].includes(actionId) && !soul.phone) { toast({ variant: 'destructive', title: 'Phone Missing', description: `Please save a number for ${soul.firstName} first.` }); return; }
    if (actionId === 'prayed_together') { setCustomMessageText(prayerTemplates[0].text.replace(/{name}/g, soul.firstName)); setIsPrayerCustomizationOpen(true); }
    else if (actionId === 'studied_bible') { setIsStudyWordOpen(true); }
    else if (actionId === 'text_message') { setIsCommChannelDialogOpen(true); }
    else if (actionId === 'introduced_friend') { setIsShareTargetDialogOpen(true); }
    else if (actionId === 'phone_call') { finalizeLog(soul, actionId, 'Dialer initiated'); window.location.href = `tel:${soul.phone}`; }
    else if (actionId === 'shared_meal' || actionId === 'gave_gift') { const mPath = actionId === 'shared_meal' ? '/marketplace' : '/marketplace/gifts'; router.push(`${mPath}?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}&actionId=${actionId}`); }
    else if (actionId === 'matchmaking') { router.push(`/matchmaking?soulId=${soul.id}`); }
    else if (actionId === 'invited_to_event') { finalizeLog(soul, actionId, 'Redirected to Events Hub'); router.push('/events'); }
    else if (actionId === 'helped_with_need') { setIsHelpNeedDialogOpen(true); }
    else { await finalizeLog(soul, actionId); }
  };

  const handleCommChoice = (channel: 'whatsapp' | 'sms') => {
      if (!soul?.phone || !clickedActionId) return;
      const cleanPhone = soul.phone.replace(/\+/g, '').replace(/\D/g, '');
      const message = customMessageText || `Hi ${soul.firstName}, thinking of you!`;
      if (channel === 'whatsapp') window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
      else window.location.href = `sms:${soul.phone}?body=${encodeURIComponent(message)}`;
      finalizeLog(soul, clickedActionId, `Sent via ${channel.toUpperCase()}`);
      setIsCommChannelDialogOpen(false);
      setCustomMessageText('');
  };

  const handleShareToPartner = async (partner: UserProfile['accountabilityPartners'][0]) => {
      if (!user || !firestore || !soul || !currentUserProfile) return;
      const wonAt = safeToDate(soul.wonAt);
      const text = `SHARING SOUL DATA:\nName: ${soul.firstName} ${soul.lastName}\nStatus: ${soul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\n\nLet's coordinate follow-up on Testify.`;
      try {
          const participantIds = [user.uid, partner.userId].sort();
          const chatsRef = collection(firestore, 'chats');
          const q = query(chatsRef, where('participantIds', '==', participantIds), where('isGroupChat', '==', false));
          const snap = await getDocs(q);
          let chatId: string;
          if (!snap.empty) chatId = snap.docs[0].id;
          else {
              const otherDoc = await getDoc(doc(firestore, 'users', partner.userId));
              const otherProfile = otherDoc.data() as UserProfile;
              const newChat = { participantIds, participantInfo: { [user.uid]: { firstName: currentUserProfile.firstName, lastName: currentUserProfile.lastName, photoURL: currentUserProfile.photoURL || '' }, [partner.userId]: { firstName: partner.firstName, lastName: partner.lastName, photoURL: partner.photoURL || '' } }, lastUpdatedAt: serverTimestamp(), isGroupChat: false, hasMessages: true };
              const ref = await addDoc(chatsRef, newChat);
              chatId = ref.id;
          }
          await addDoc(collection(firestore, 'chats', chatId, 'messages'), { senderId: user.uid, text, createdAt: serverTimestamp() });
          await updateDoc(doc(firestore, 'chats', chatId), { lastUpdatedAt: serverTimestamp(), hasMessages: true });
          toast({ title: 'Shared with Partner!' });
          finalizeLog(soul, 'introduced_friend', `Shared with partner: ${partner.firstName}`);
          setIsPartnerSelectionDialogOpen(false);
          setIsShareTargetDialogOpen(false);
          router.push(`/dashboard/chats/${chatId}`);
      } catch (e) { toast({ variant: 'destructive', title: 'Share Failed' }); }
  };

  const handleHelpNeedConfirm = (note: string) => { if (!soul) return; finalizeLog(soul, 'helped_with_need', `Service: ${note}`); setIsHelpNeedDialogOpen(false); setCustomMessageText(''); }

  const uniquePartners = useMemo(() => { const partners = currentUserProfile?.accountabilityPartners || []; const uniqueMap = new Map(); partners.forEach(p => { if (p.userId && !uniqueMap.has(p.userId)) uniqueMap.set(p.userId, p); }); return Array.from(uniqueMap.values()); }, [currentUserProfile?.accountabilityPartners]);

  const isRestrictedForMatchmaking = soul.age && soul.age < 20;

  return (
    <React.Fragment>
        <Card className="rounded-none sm:rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-card/50 backdrop-blur-sm border-t-8 border-t-primary/20 text-left text-left">
            <CardHeader className="p-8 pb-4 text-center text-left text-left">
                <div className="relative inline-block mx-auto mb-4 text-left">
                    <Dialog><DialogTrigger asChild disabled={!soul.photoURL}><div className={cn("h-48 w-48 border-4 border-background shadow-xl ring-2 ring-primary/10 transition-all active:scale-105 text-left text-left", soul.photoURL && "cursor-pointer hover:scale-105")}><Avatar className="h-full w-full border shadow-sm"><AvatarImage src={soul.photoURL || undefined} className="object-cover text-left" /><AvatarFallback className="font-black bg-primary/10 text-primary text-center flex items-center justify-center h-full w-full text-3xl"> {soul.firstName?.charAt(0)}</AvatarFallback></Avatar></div></DialogTrigger>{soul.photoURL && (<DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center text-left"><DialogHeader className="sr-only text-center text-left"><DialogTitle>Profile Photo</DialogTitle></DialogHeader><div className="relative h-full w-full flex items-center justify-center p-4 text-center text-left"><div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center text-left"><Image src={soul.photoURL} alt={soul.firstName} fill className="object-contain shadow-2xl ring-4 ring-white/10 text-left" unoptimized /></div></div></DialogContent>)}</Dialog>
                    {address && (<Button size="icon" className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full shadow-lg border-2 border-background text-left" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')} title="View Map"><MapPin className="h-5 w-5 text-left" /></Button>)}
                </div>
                <div className="flex flex-col items-center gap-2 text-left"><CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-center w-full text-left text-left">{soul.firstName} {soul.lastName}</CardTitle><div className="flex gap-2 justify-center items-center text-left text-left"><Badge className={cn("h-5 px-2 text-[9px] uppercase font-black tracking-widest justify-center text-left", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge><MutualConnectBadge soul={soul} /></div></div>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6 text-left">
                <Separator className="opacity-50 text-left" />
                <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between text-left">
                        <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left text-left">Spiritual Identity</p>
                        <div className="flex items-center gap-1 text-left">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left"><Download className="h-4 w-4 text-left" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl text-left">
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-black text-left">Select Format</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => onExportSingle(soul, 'csv')} className="text-left text-left">CSV Export</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => onExportSingle(soul, 'pdf')} className="text-left text-left">PDF Report</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left" onClick={() => onEdit(soul)}><Edit className="h-4 w-4 text-left" /></Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-left">
                        <div className="space-y-1 text-left">
                            <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Full Name</p>
                            <p className="text-[11px] sm:text-xs font-bold text-left">{soul.firstName} {soul.lastName}</p>
                        </div>
                        <div className="space-y-1 text-left">
                            <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Gender/Age</p>
                            <p className="text-[11px] sm:text-xs font-bold text-left">{soul.gender || 'N/A'} • {soul.age ? `${soul.age} yrs` : 'Age N/A'}</p>
                        </div>
                        <div className="space-y-1 text-left">
                            <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Relationship</p>
                            <p className="text-[11px] sm:text-xs font-bold capitalize text-left">{soul.relationship || 'N/A'}</p>
                        </div>
                        <div className="space-y-1 text-left">
                            <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Work Status</p>
                            <p className="text-[11px] sm:text-xs font-bold capitalize text-left">{soul.workStatus || 'N/A'}</p>
                        </div>
                        <div className="space-y-1 text-left text-left">
                            <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Rel. Status</p>
                            <p className="text-[11px] sm:text-xs font-bold capitalize text-left">{soul.maritalStatus || 'N/A'}</p>
                        </div>
                        <div className="space-y-1 text-left text-left">
                            <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Nickname</p>
                            <p className="text-[11px] sm:text-xs font-bold capitalize text-left">{soul.nickname || 'N/A'}</p>
                        </div>
                    </div>
                </div>
                <Separator className="opacity-20 text-left" />
                <div className="space-y-3 text-left">
                    <div className="flex items-center justify-between text-left">
                        <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left text-left">Contact Identity</p>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left" onClick={() => onEdit(soul)}><Edit className="h-4 w-4 text-left" /></Button>
                    </div>
                    <div className="space-y-2 text-left">
                        {soul.phone ? (<div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-foreground text-left"><Phone className="h-3.5 w-3.5 text-primary shrink-0 text-left" />{soul.phone}</div>) : (<p className="text-[9px] text-muted-foreground/40 italic text-left">No phone recorded</p>)}
                        {soul.email && (<div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-foreground text-left"><Mail className="h-3.5 w-3.5 text-primary shrink-0 text-left" />{soul.email}</div>)}
                    </div>
                </div>
                <Separator className="opacity-20 text-left" />
                <div className="space-y-4 text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left text-left">Relational Actions</p>
                    <div className="flex flex-col gap-2 text-left">
                        {actionItems.map(action => { 
                            const Icon = iconMap[action.id] || Heart; 
                            const isThisProcessing = clickedActionId === action.id && isActionSubmitting; 
                            if (action.id === 'matchmaking' && (soul.maritalStatus === 'Married' || isRestrictedForMatchmaking)) return null; 
                            return (<Button key={action.id} variant="outline" className="flex items-center justify-start gap-3 h-12 px-4 rounded-xl border-2 border-transparent bg-muted/20 hover:bg-primary/5 hover:border-primary/10 transition-all text-left group text-left" onClick={() => handleActionClick(action.id)} disabled={isActionSubmitting}><div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors text-left">{isThisProcessing ? <Loader2 className="h-4 w-4 animate-spin text-primary text-left" /> : <Icon className="h-4 w-4 text-left" />}</div><span className="text-xs font-bold uppercase tracking-tight truncate flex-1 text-left">{action.label}</span><ChevronRight className="h-4 w-4 text-muted-foreground opacity-20 group-hover:opacity-100 transition-opacity text-left" /></Button>) 
                        })}
                    </div>
                </div>
                <Separator className="opacity-20 text-left" />
                <div className="space-y-4 text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left text-left">Harvest Context</p>
                    <div className="space-y-1 text-left">
                        <p className="text-[11px] sm:text-xs font-bold flex items-center gap-1.5 text-left"><Target className="h-3 w-3 text-primary text-left" />Source: {soul.source}</p>
                    </div>
                </div>
                <Separator className="opacity-20 text-left" />
                <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between text-left">
                        <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Kingdom Placement</p>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left" onClick={() => onOpenAssignDialog(soul)}><Edit className="h-4 w-4 text-left" /></Button>
                    </div>
                    <div className="space-y-3 text-left">
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-primary/5 border border-primary/10 text-left">
                            <HeartHandshake className="h-4 w-4 text-primary shrink-0 text-left" />
                            <div className="min-w-0 text-left">
                                <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Fellowship</p>
                                <p className="text-[11px] sm:text-xs font-bold truncate capitalize text-left">{soul.fellowshipName || 'No Fellowship'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-blue-500/5 border border-blue-500/10 text-left">
                            <Users className="h-4 w-4 text-blue-500 shrink-0 text-left" />
                            <div className="min-w-0 text-left">
                                <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Association</p>
                                <p className="text-[11px] sm:text-xs font-bold truncate capitalize text-left">{soul.associationName || 'No Association'}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <Separator className="opacity-20 text-left" />
                <div className="space-y-4 text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left text-left">Spiritual Milestones</p>
                    <div className="grid grid-cols-2 gap-2 text-left">
                        {[{ label: 'Church', val: soul.attendingChurch, icon: Church }, { label: 'Word Study', val: soul.inBibleStudy, icon: BookOpen }, { label: 'Prayer', val: soul.attendingPrayer, icon: Zap }, { label: 'Service', val: soul.inServiceDepartment, icon: ShieldCheck }].map(milestone => (
                        <div key={milestone.label} className={cn("flex items-center gap-2 p-2 rounded-xl border transition-all text-left", milestone.val ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/10 border-transparent text-muted-foreground/40")}>
                            <milestone.icon className="h-3 w-3 text-left" />
                            <span className="text-[10px] font-black uppercase tracking-tight text-left">{milestone.label}</span>
                        </div>))}
                    </div>
                </div>
                <Separator className="opacity-20 text-left" />
                <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between text-left">
                        <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2 text-left">
                            <History className="h-3.5 w-3.5 text-left" /> Interaction History
                        </p>
                        <Button variant="ghost" className="h-6 text-[8px] font-black uppercase text-primary hover:bg-primary/5 text-left" onClick={() => onViewHistory(soul)}>View All</Button>
                    </div>
                    <div className="space-y-4 pl-1 text-left">
                        {sortedHistory.length > 0 ? sortedHistory.slice(0, 3).map((log, index) => { 
                            const logDate = safeToDate(log.date); 
                            return (
                                <div key={index} className="relative text-left">
                                    <div className="pl-4 border-l-4 border-primary/20 text-left">
                                        <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest mb-1 text-left">{logDate ? format(logDate, "MMM d, yyyy") : 'Date not available'}{log.memberName && <span className="ml-2 text-primary/40">• By {log.memberName}</span>}</p>
                                        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 italic text-left">&ldquo;{log.note || 'Interaction logged.'}&rdquo;</p>
                                    </div>
                                </div>
                            ); 
                        }) : (
                            <div className="py-4 text-center border border-dashed rounded-xl bg-muted/5 text-left"><p className="text-sm text-muted-foreground/40 italic text-center">No interactions recorded.</p></div>
                        )}
                    </div>
                </div>
                
                <div className="space-y-3 p-5 bg-muted/20 rounded-[2rem] border-2 border-dashed border-primary/10 shadow-inner text-left">
                    <div className="flex items-center justify-between text-left">
                        <div className="flex items-center gap-1 text-left">
                          <ClipboardList className="h-4 w-4 text-primary text-left" />
                          <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Assessed Needs</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full text-primary hover:bg-primary/10 text-left" onClick={() => onAssess(soul)}>
                            <Edit className="h-4 w-4 text-left" />
                        </Button>
                    </div>
                    {needs ? (
                        <React.Fragment>
                            <div className="space-y-4 text-left">
                                {needs.generalImpression && <p className="text-xs text-muted-foreground italic leading-relaxed text-balance text-left">&ldquo;{needs.generalImpression}&rdquo;</p>}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                                    {needs.emotionalNeeds && (
                                        <div className="space-y-1 text-left">
                                            <Badge variant="secondary" className="text-[7px] h-4 bg-red-500/10 text-red-600 border-none px-1.5 uppercase font-black text-left">Emotional</Badge>
                                            <p className="text-[10px] text-muted-foreground line-clamp-2 text-left">{needs.emotionalNeeds}</p>
                                        </div>
                                    )}
                                    {needs.physicalNeeds && (
                                        <div className="space-y-1 text-left">
                                            <Badge variant="secondary" className="text-[7px] h-4 bg-amber-500/10 text-amber-600 border-none px-1.5 uppercase font-black text-left">Physical</Badge>
                                            <p className="text-[10px] text-muted-foreground line-clamp-2 text-left">{needs.physicalNeeds}</p>
                                        </div>
                                    )}
                                    {needs.financialNeeds && (
                                        <div className="space-y-1 text-left">
                                            <Badge variant="secondary" className="text-[7px] h-4 bg-green-500/10 text-green-600 border-none px-1.5 uppercase font-black text-left">Financial</Badge>
                                            <p className="text-[10px] text-muted-foreground line-clamp-2 text-left">{needs.financialNeeds}</p>
                                        </div>
                                    )}
                                    {needs.socialNeeds && (
                                        <div className="space-y-1 text-left">
                                            <Badge variant="secondary" className="text-[7px] h-4 bg-indigo-500/10 text-indigo-600 border-none px-1.5 uppercase font-black text-left">Social</Badge>
                                            <p className="text-[10px] text-muted-foreground line-clamp-2 text-left">{needs.socialNeeds}</p>
                                        </div>
                                    )}
                                </div>
                                {needs.followUpPlan && (
                                    <div className="pt-2 border-t border-primary/10 text-left">
                                        <p className="text-[8px] font-black uppercase text-primary/60 mb-1 flex items-center gap-1.5 text-left">
                                            <Target className="h-2.5 w-2.5 text-left" /> Strategy
                                        </p>
                                        <p className="text-[10px] text-muted-foreground leading-relaxed italic text-left">{needs.followUpPlan}</p>
                                    </div>
                                )}
                            </div>
                        </React.Fragment>
                    ) : (
                        <div className="py-4 text-center text-left">
                            <Button variant="outline" size="sm" className="h-8 rounded-xl font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 text-center text-left" onClick={() => onAssess(soul)}>BEGIN ASSESSMENT</Button>
                        </div>
                    )}
                </div>
                <div className="pt-2 space-y-3 text-left"><Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 text-center text-left" onClick={() => onFollowUp(soul)}>LOG FOLLOW-UP</Button><Button variant="ghost" className="w-full h-11 text-destructive font-bold uppercase tracking-widest text-[10px] text-center text-left" onClick={() => onDelete(soul)}><Trash2 className="mr-2 h-4 w-4 text-left" /> DELETE RECORD</Button></div>
            </CardContent>
        </Card>
        
        <IntercessionHubDialog isOpen={isPrayerCustomizationOpen} onOpenChange={setIsPrayerCustomizationOpen} soul={soul} onComplete={(msg) => { setCustomMessageText(msg); setIsPrayerCustomizationOpen(false); setTimeout(() => setIsCommChannelDialogOpen(true), 100); }} />
        <MessageHubDialog isOpen={isCommChannelDialogOpen} onOpenChange={setIsCommChannelDialogOpen} soul={soul} onChannelSelect={(c) => handleCommChoice(c)} />
        <ShareWordDialog isOpen={isStudyWordOpen} onOpenChange={setIsStudyWordOpen} soul={soul} onSelectVerse={(v) => { setCustomMessageText(v); setIsStudyWordOpen(false); setTimeout(() => setIsCommChannelDialogOpen(true), 100); }} />
    </React.Fragment>
  );
}
