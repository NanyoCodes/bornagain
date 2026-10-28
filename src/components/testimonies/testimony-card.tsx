
"use client";

import * as React from "react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Testimony, UserProfile, FollowUpStatus } from "@/lib/types";
import { format } from "date-fns";
import { 
  Share2, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Loader2, 
  Globe, 
  Sparkles, 
  HandHeart, 
  MessageSquare,
  UserPlus,
  Hourglass,
  PartyPopper,
  Users,
  Camera,
  X,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Target,
  Music,
  Mic
} from "lucide-react";
import { useUser, useDoc, useCollection, useFirestore, useUserProfile } from "@/firebase";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, serverTimestamp, addDoc, setDoc, getDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn, safeToDate } from "@/lib/utils";
import Image from 'next/image';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { CommentSection } from "./comment-section";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { MutualConnectBadge } from "./mutual-connect-badge";

/**
 * Utility to convert YouTube URL to embed format.
 */
function getYouTubeEmbedUrl(url: string | undefined | null) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
}

/**
 * High fidelity media preview for the feed.
 */
const MediaPreview = ({ url, type, isFull = false }: { url: string, type: 'image' | 'video' | 'audio', isFull?: boolean }) => {
  return (
      <Dialog>
          <DialogTrigger asChild>
              <div className={cn(
                  "relative rounded-2xl sm:rounded-3xl overflow-hidden border shadow-inner bg-muted aspect-square group/media cursor-pointer",
                  isFull && "h-full w-full"
              )}>
                  {type === 'image' ? (
                      <Image src={url} alt="Proof" fill className="object-cover transition-transform group-hover/media:scale-105" unoptimized />
                  ) : type === 'video' ? (
                      <video src={url} className="w-full h-full object-cover bg-zinc-950" muted playsInline loop />
                  ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-primary/5 p-4 text-center">
                          <div className="relative">
                              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-[0_0_20px_rgba(249,116,22,0.1)]">
                                  <Mic className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                              </div>
                              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-primary animate-pulse" />
                          </div>
                          <p className="mt-3 text-[8px] sm:text-[10px] font-black uppercase text-primary/80 tracking-widest">Voice of Thanksgiving</p>
                      </div>
                  )}
                  <div className="absolute inset-0 bg-black/5 group-hover/media:bg-transparent transition-colors duration-500" />
                  <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 opacity-0 group-hover/media:opacity-100 transition-opacity shadow-2xl">
                      <Sparkles className="h-3 w-3 sm:h-4 w-4 text-primary animate-pulse" />
                  </div>
              </div>
          </DialogTrigger>
          <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
              <DialogHeader className="sr-only text-center"><DialogTitle>Full View</DialogTitle></DialogHeader>
              <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
                  <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
                      {type === 'image' ? (
                          <Image src={url} alt="Proof Full" fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized />
                      ) : type === 'video' ? (
                          <video src={url} className="w-full h-full object-contain" playsInline controls />
                      ) : (
                          <div className="w-full max-w-sm flex flex-col items-center gap-8 bg-zinc-900 p-12 rounded-[3rem] border border-white/10 shadow-2xl">
                              <div className="relative text-center">
                                  <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 shadow-[0_0_50px_rgba(249,116,22,0.15)] mx-auto">
                                      <Mic className="h-16 w-16 text-primary" />
                                  </div>
                                  <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-primary animate-pulse" />
                              </div>
                              <div className="space-y-2 text-center">
                                  <h4 className="text-xl font-black font-headline uppercase tracking-tight text-white">Voice Proclamation</h4>
                                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest italic">A testimony of God's goodness</p>
                              </div>
                              <audio src={url} className="w-full" controls />
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 text-center">
                                  <HandHeart className="h-3 w-3" />
                                  Glory to God
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </DialogContent>
      </Dialog>
  );
};

/**
 * Live avatar that reflects current profile photo.
 */
function LiveAuthorAvatar({ userId, fallbackInitials, className }: { userId: string, fallbackInitials: string, className?: string }) {
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

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 0 0 0-3.48-8.413Z"/>
    </svg>
  );
}

export function IntercessionHubDialog({ isOpen, onOpenChange, soul, onComplete }: { isOpen: boolean; onOpenChange: (open: boolean) => void; soul: Soul | null; onComplete: (msg: string) => void; }) {
  const [text, setText] = useState('');
  const isMobile = useIsMobile();
  useEffect(() => { if(isOpen && soul) { setText(prayerTemplates[0].text.replace(/{name}/g, soul.firstName)); } }, [isOpen, soul]);
  
  const header = (
    <div className="p-8 border-b bg-muted/10 shrink-0 text-left flex items-center justify-between gap-4">
        <div className="min-w-0">
            <DialogHeader className="p-0 text-left">
                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Kingdom Intercession</DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-left">Draft a powerful prayer for {soul?.firstName}.</DialogDescription>
            </DialogHeader>
        </div>
        <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60 hover:text-foreground text-left" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5 text-left" />
        </Button>
    </div>
  );

  const contentBody = (
    <div className="p-8 space-y-6 text-left">
        <div className="space-y-3 text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Select Focus</label>
            <div className="flex flex-wrap gap-2 text-left">
                {prayerTemplates.map(t => (
                    <Button key={t.id} variant="outline" size="sm" className="rounded-full h-8 px-4 text-[9px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 text-primary text-left" onClick={() => soul && setText(t.text.replace(/{name}/g, soul.firstName))}>{t.label}</Button>
                ))}
            </div>
        </div>
        <div className="space-y-2 text-left">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left">Customize Message</Label>
            <Textarea value={text} onChange={e => setText(e.target.value)} className="min-h-[200px] rounded-2xl bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6 text-left" />
        </div>
        <Button onClick={() => onComplete(text)} disabled={!text.trim()} className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-center text-left">SEND</Button>
    </div>
  );

  if (isMobile) return <Sheet open={isOpen} onOpenChange={onOpenChange}><SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">{header}<ScrollArea className="flex-grow text-left">{contentBody}</ScrollArea></SheetContent></Sheet>;
  return <Dialog open={isOpen} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left">{header}<ScrollArea className="flex-1 min-h-0 text-left">{contentBody}</ScrollArea></DialogContent></Dialog>;
}

export function MessageHubDialog({ isOpen, onOpenChange, soul, onChannelSelect }: { isOpen: boolean; onOpenChange: (open: boolean) => void; soul: Soul | null; onChannelSelect: (channel: 'whatsapp' | 'sms') => void; }) {
  const isMobile = useIsMobile();
  const header = (
    <div className="p-8 border-b bg-muted/10 shrink-0 text-left flex items-center justify-between gap-4">
        <div className="min-w-0 text-left">
            <div className="flex items-center gap-2 mb-1 text-left">
                <MessageSquare className="h-4 w-4 text-primary text-left" />
                <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Channel Select</span>
            </div>
            <h2 className="text-2xl font-black font-headline uppercase tracking-tight text-left">Message Hub</h2>
            <p className="text-sm font-medium text-left">Encourage {soul?.firstName} via mobile.</p>
        </div>
        <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60 hover:text-foreground text-left" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5 text-left" />
        </Button>
    </div>
  );
  const contentBody = (
    <div className="flex flex-col gap-3 p-8 text-left">
        <Button onClick={() => onChannelSelect('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg text-center text-left"><WhatsAppIcon className="h-5 w-5 text-left" /> WhatsApp External</Button>
        <Button onClick={() => onChannelSelect('sms')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary text-center text-left"><MessageSquare className="h-5 w-5 text-left" /> Standard SMS</Button>
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
  const { toast } = useToast();

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
    <div className="p-8 border-b bg-muted/10 shrink-0 text-left flex items-center justify-between gap-4">
      <div className="min-w-0 text-left">
        <div className="flex items-center gap-3 mb-2 text-left">
          {view !== 'hub' && <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full -ml-2 text-left" onClick={() => setView(view === 'verses' ? 'chapters' : view === 'chapters' ? 'books' : 'hub')}><ArrowLeft className="h-4 w-4 text-left" /></Button>}
          <Target className="h-5 w-5 text-primary text-left" /><span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left">Kingdom Study</span>
        </div>
        <DialogHeader className="text-left p-0">
            <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left">
                {view === 'hub' ? "Share the Word" : view === 'books' ? "Select Book" : view === 'chapters' ? `${selectedBook}: Chapter` : `${selectedBook} ${selectedChapter}`}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm font-medium text-left text-left">
                {view === 'hub' ? `Equip ${soul?.firstName} with the living Word.` : `Browsing ${selectedBook || 'Bible'}...`}
            </DialogDescription>
        </DialogHeader>
      </div>
      {view !== 'hub' && <Button variant="outline" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/40 text-left" onClick={() => onOpenChange(false)}><X className="h-5 w-5 sm:h-6 sm:w-6 text-left" /></Button>}
    </div>
  );

  const contentBody = (
    <div className="p-4 sm:p-10 text-left text-left">
        {view === 'hub' && (
            <div className="space-y-8 text-left">
                <div className="relative text-left"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 text-left" /><Input placeholder="Search Bible (e.g. John 3:16)..." value={bibleSearch} onChange={e => setBibleSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="h-12 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left" /></div>
                {searchResults.map((res, idx) => (<Button key={idx} variant="outline" className="w-full h-auto p-4 rounded-2xl border-primary/20 bg-primary/5 flex flex-col items-start gap-3 text-left border-2 border-dashed" onClick={() => onSelectVerse(`"${res.text.trim()}" — ${res.reference}`)}><span className="font-black text-[9px] uppercase tracking-widest text-primary text-left">{res.reference}</span><p className="text-xs text-muted-foreground italic line-clamp-4 text-left">"{res.text.trim()}"</p></Button>))}
                <div className="grid grid-cols-2 gap-4 text-left"><Button onClick={() => setView('books')} variant="outline" className="h-24 rounded-2xl border-2 border-primary/20 text-primary flex flex-col items-center justify-center p-4 text-center text-left"><BookOpen className="h-6 w-6 mb-1 text-left" /><span className="text-[10px] font-black uppercase text-center text-left">Browse Bible</span></Button><Button variant="outline" asChild className="h-24 rounded-2xl border-2 border-primary/20 text-primary flex flex-col items-center justify-center p-4 text-center text-left"><Link href="/dashboard/bible"><BookMarked className="h-6 w-6 mb-1 text-left" /><span className="text-[10px] font-black uppercase text-center text-left">Open Reader</span></Link></Button></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">{kingdomVerses.map((v, idx) => (<Button key={idx} variant="ghost" className="w-full justify-start h-auto py-4 px-4 rounded-2xl bg-muted/5 border border-transparent hover:bg-primary/10 transition-all text-left block text-left" onClick={() => onSelectVerse(`"${v.text.trim()}" — ${v.reference}`)}><span className="font-black text-[9px] uppercase tracking-widest text-primary text-left">{v.reference}</span><p className="text-xs text-muted-foreground italic line-clamp-2 text-left">"{v.text}"</p></Button>))}</div>
            </div>
        )}
        {view === 'books' && <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">{bibleData.map(book => (<Button key={book.name} variant="outline" className="h-12 rounded-xl font-bold uppercase text-[9px] text-left" onClick={() => { setSelectedBook(book.name); setView('chapters'); }}>{book.name}</Button>))}</div>}
        {view === 'chapters' && <div className="p-2 grid grid-cols-5 sm:grid-cols-8 gap-2 text-left">{selectedBook && bibleData.find(b => b.name === selectedBook)?.chapters.map(ch => (<Button key={ch.chapter} variant="outline" className="h-9 w-9 p-0 rounded-lg font-black text-xs text-left" onClick={() => handleSelectChapter(ch.chapter)}>{ch.chapter}</Button>))}</div>}
        {view === 'verses' && <div className="space-y-4 pb-12 text-left"><div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6 text-left"><p className="text-[10px] font-black uppercase text-primary mb-1 text-left">SELECTED</p><p className="text-xs font-bold text-muted-foreground text-left">{selectedVerses.length > 0 ? `${selectedBook} ${selectedChapter}:${selectedVerses.join(', ')}` : 'Select verses below...'}</p></div><div className="space-y-1 font-serif text-left">{loadingVerses ? <div className="flex justify-center py-20 text-left"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20 text-left" /></div> : chapterContent?.verses.map(v => (<div key={v.verse} className={cn("p-3 rounded-xl transition-all cursor-pointer border-2 text-left", selectedVerses.includes(v.verse) ? "bg-primary/10 border-primary/40" : "bg-transparent border-transparent hover:bg-muted/50")} onClick={() => setSelectedVerses(prev => prev.includes(v.verse) ? prev.filter(vs => vs !== v.verse) : [...prev, v.verse].sort((a,b)=>a-b))}><sup className="text-[10px] font-black mr-2 opacity-40 text-left">{v.verse}</sup><span className="text-sm leading-relaxed text-left">{v.text}</span></div>))}</div></div>}
    </div>
  );

  const footer = view === 'verses' && <div className="p-6 border-t bg-muted/5 flex flex-col sm:flex-row gap-3 shrink-0 text-left"><Button variant="outline" onClick={() => setSelectedVerses([])} className="rounded-xl h-12 flex-1 font-bold text-left">Clear</Button><Button onClick={handleShareSelected} disabled={selectedVerses.length === 0} className="rounded-xl h-12 flex-[2] font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-center text-left">SHARE SELECTED ({selectedVerses.length})</Button></div>;

  if (isMobile) return <Sheet open={isOpen} onOpenChange={onOpenChange}><SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">{header}<ScrollArea className="flex-grow text-left">{contentBody}</ScrollArea>{footer}</SheetContent></Sheet>;
  return <Dialog open={isOpen} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-3xl max-h-[90dvh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left flex flex-col">{header}<ScrollArea className="flex-1 min-h-0 text-left">{contentBody}</ScrollArea>{footer}</DialogContent></Dialog>;
}

export const TestimonyCard = React.memo(function TestimonyCard({ 
  testimony, 
  onDelete, 
  onEdit,
  isPartner,
  hasPendingRequest,
  currentUserProfile
}: { 
  testimony: Testimony, 
  onDelete: () => void, 
  onEdit: () => void,
  isPartner?: boolean,
  hasPendingRequest?: boolean,
  currentUserProfile?: UserProfile | null
}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [isProcessingReaction, setIsProcessingReaction] = useState<string | null>(null);
  const [isRequestingPartner, setIsRequestingPartner] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const prayerRef = React.useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);
  const [isPrayerTruncated, setIsPrayerTruncated] = React.useState(false);
  const [showFullText, setShowFullText] = React.useState(false);
  const [showFullPrayer, setShowFullPrayer] = React.useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isBoostOpen, setIsBoostOpen] = useState(false);

  const isAuthor = user?.uid === testimony.authorId;
  
  const authorProfileRef = React.useMemo(() => (!testimony.isAnonymous && testimony.authorId) ? doc(firestore, 'users', testimony.authorId) : null, [firestore, testimony.authorId, testimony.isAnonymous]);
  const { data: authorProfile } = useDoc<UserProfile>(authorProfileRef);

  const authorFirstName = authorProfile?.firstName || testimony.authorFirstName;
  const authorLastName = authorProfile?.lastName || testimony.authorLastName;
  const authorName = testimony.isAnonymous ? 'Confidential Request' : ([authorFirstName, authorLastName].filter(Boolean).join(' ') || 'Kingdom Believer');
  const initials = (authorFirstName?.charAt(0) || '') + (authorLastName?.charAt(0) || '');

  const profileLink = isAuthor ? "/profile" : `/profile/${testimony.authorId}`;

  const supporters = testimony.supporters || [];
  const inspiredBy = testimony.inspiredBy || [];
  const connectedBy = testimony.connectedBy || [];
  
  const totalReactions = supporters.length + inspiredBy.length + connectedBy.length;

  const hasAmened = useMemo(() => user ? supporters.includes(user.uid) : false, [user, supporters]);
  const hasInspired = useMemo(() => user ? inspiredBy.includes(user.uid) : false, [user, inspiredBy]);
  const hasConnected = useMemo(() => user ? connectedBy.includes(user.uid) : false, [user, connectedBy]);
  
  const displayDate = useMemo(() => {
    const createdAtDate = safeToDate(testimony.createdAt);
    return createdAtDate ? "Shared " + format(createdAtDate, "PPP 'at' p") : 'Shared recently';
  }, [testimony.createdAt]);
  
  const locationString = useMemo(() => {
    const testimonyLoc = testimony.authorLocation;
    const city = testimonyLoc?.city;
    const country = testimonyLoc?.country;
    return [city, country].filter(Boolean).join(', ') || 'Global Community';
  }, [testimony.authorLocation]);

  const commentsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'testimonies', testimony.id, 'comments'));
  }, [firestore, testimony.id]);
  const { data: comments } = useCollection<{id: string}>(commentsQuery);
  const commentCount = comments?.length || 0;

  useEffect(() => {
    setMounted(true);
    const checkTruncation = () => {
      if (contentRef.current) {
        setIsTruncated(contentRef.current.scrollHeight > contentRef.current.clientHeight);
      }
      if (prayerRef.current) {
        setIsPrayerTruncated(prayerRef.current.scrollHeight > prayerRef.current.clientHeight);
      }
    };
    const timeoutId = setTimeout(checkTruncation, 150);
    window.addEventListener('resize', checkTruncation);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkTruncation);
    };
  }, [testimony.content, testimony.answeredPrayerContent]);

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const shareUrl = `${window.location.origin}/testimonies#${testimony.id}`;
    const textContent = `"${testimony.content.substring(0, 200)}${testimony.content.length > 200 ? '...' : ''}"\n\nRead full miracle on Testify:`;
    
    const shareData: any = { title: 'Kingdom Testimony | Testify', text: textContent, url: shareUrl };

    try {
      if (navigator && navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Share API not supported');
      }
    } catch (err: any) {
        if (err.name === 'AbortError') return;
        try {
          await navigator.clipboard.writeText(`${textContent} ${shareUrl}`);
          toast({ title: "Details Copied!" });
        } catch (clipErr) {
            await navigator.clipboard.writeText(shareUrl);
            toast({ title: "Link Copied!" });
        }
    }
  };

  const handleReaction = (type: 'amen' | 'inspired' | 'connect') => {
    if (!user || !firestore) return;
    const hasReacted = (type === 'amen' && hasAmened) || (type === 'inspired' && hasInspired) || (type === 'connect' && hasConnected);
    setIsProcessingReaction(type);
    const testimonyRef = doc(firestore, 'testimonies', testimony.id);
    const field = type === 'amen' ? 'supporters' : type === 'inspired' ? 'inspiredBy' : 'connectedBy';
    const updatePayload = { [field]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid) };
    updateDoc(testimonyRef, updatePayload)
        .catch(() => {
            const permissionError = new FirestorePermissionError({ path: testimonyRef.path, operation: 'update', requestResourceData: updatePayload }, user);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => setIsProcessingReaction(null));
  }

  const handleSendPartnerRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !firestore || !currentUserProfile || isAuthor || isPartner || hasPendingRequest) return;
    setIsRequestingPartner(true);
    const participantIds = [String(user.uid), String(testimony.authorId)].sort();
    const requestId = participantIds.join('_');
    const requestRef = doc(firestore, 'accountabilityRequests', requestId);
    const newRequestData = { fromUserId: user.uid, fromUserFirstName: currentUserProfile.firstName || '', fromUserLastName: currentUserProfile.lastName || '', fromUserPhotoURL: currentUserProfile.photoURL || '', toUserId: testimony.authorId, toUserFirstName: authorFirstName || '', toUserLastName: authorLastName || '', toUserPhotoURL: authorProfile?.photoURL || '', status: 'pending' as const, createdAt: serverTimestamp(), participantIds };
    const notificationData = { userId: testimony.authorId, type: 'accountability_request' as const, title: 'New Accountability Request', message: `${currentUserProfile.firstName} wants to be your partner!`, link: '/accountability', isRead: false, createdAt: serverTimestamp() };

    try {
        await setDoc(requestRef, newRequestData);
        await addDoc(collection(firestore, 'users', testimony.authorId, 'notifications'), notificationData);
        toast({ title: 'Request Sent!' });
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: requestRef.path, operation: 'create', requestResourceData: newRequestData }, user));
    } finally { setIsRequestingPartner(false); }
  };

  const triggerAction = (action: () => void) => {
    requestAnimationFrame(() => {
        action();
    });
  };

  const fullTextContent = (
    <ScrollArea className={cn("pr-4", isMobile ? "h-full" : "max-h-[60vh]")}>
      <div className="space-y-8 pb-8 px-2 text-left">
        <div className={cn("grid gap-4", (testimony.mediaUrl && testimony.mediaUrl2) ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
            {testimony.mediaUrl && (
              <MediaPreview url={testimony.mediaUrl} type={testimony.mediaType as any} isFull />
            )}
            {testimony.mediaUrl2 && (
              <MediaPreview url={testimony.mediaUrl2} type={testimony.mediaType2 as any} isFull />
            )}
        </div>
        <div className="text-base sm:text-lg text-muted-foreground whitespace-pre-wrap leading-relaxed font-medium text-left">
            {testimony.content}
        </div>
      </div>
    </ScrollArea>
  );

  const musicEmbedUrl = useMemo(() => getYouTubeEmbedUrl(testimony.musicUrl), [testimony.musicUrl]);

  return (
    <>
      <div id={testimony.id} className={cn(
        "flex flex-col h-full w-full overflow-hidden transition-all duration-300 scroll-mt-48 text-left",
        "rounded-none sm:rounded-[2rem] border-y border-border sm:border-x border-t-4 border-t-amber-500/20 shadow-none sm:shadow-lg",
        "bg-card/50 backdrop-blur-sm",
        isPartner && "sm:ring-1 ring-primary/20",
        testimony.answeredPrayerId && "sm:border-l-4 sm:border-l-amber-500"
      )}>
        <div className="p-4 sm:p-6 pb-2 text-left">
          <div className="flex flex-row items-start justify-between gap-3 text-left">
            <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                {testimony.isAnonymous ? (
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold"><Users className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                ) : (
                    <LiveAuthorAvatar userId={String(testimony.authorId)} fallbackInitials={initials} className="h-11 w-11 sm:h-14 sm:w-14" />
                )}
                <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap text-left">
                        <Link href={profileLink} onClick={(e) => e.stopPropagation()} className="hover:underline decoration-primary/30 underline-offset-2 shrink-0">
                             <h3 className="text-base sm:text-lg font-bold capitalize leading-none text-left">{authorName}</h3>
                        </Link>
                        {isPartner && <Badge variant="secondary" className="h-4 px-1.5 text-[9px] uppercase font-bold tracking-tighter bg-primary/10 text-primary border-primary/20 shrink-0">Partner</Badge>}
                        {!isAuthor && !isPartner && currentUserProfile && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button className={cn("h-6 w-6 rounded-full transition-colors flex items-center justify-center", hasPendingRequest ? "text-muted-foreground" : "text-primary hover:bg-primary/10")} onClick={handleSendPartnerRequest} disabled={isRequestingPartner || hasPendingRequest}>
                                            {isRequestingPartner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : hasPendingRequest ? <Hourglass className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-xl border-primary/20 shadow-xl"><p className={cn("text-[10px] font-black uppercase tracking-widest")}>{hasPendingRequest ? "Request Pending" : "Add Accountability Partner"}</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    <div className="text-muted-foreground text-sm mt-1 flex flex-col gap-0.5 text-left">
                        <div className="truncate text-[10px] sm:text-xs opacity-70 text-left">{displayDate}</div>
                        <div className="flex items-center gap-1 mt-0.5 opacity-80 text-[10px] sm:text-xs font-medium text-left"><Globe className="h-3 w-3 text-primary shrink-0" /> {locationString}</div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1.5 text-left">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-background" onClick={handleShare}>
                    <Share2 className="h-3.5 w-3.5" /><span className="sr-only">Share</span>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); }}><MoreVertical className="h-4 w-4" /><span className="sr-only">Options</span></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-black">Manage Story</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {isAuthor ? (
                            <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerAction(onEdit); }} className="rounded-lg">
                                    <Edit className="mr-2 h-4 w-4 text-primary" />
                                    Edit Story
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsBoostOpen(true); }} className="rounded-lg">
                                    <TrendingUp className="mr-2 h-4 w-4 text-indigo-600" />
                                    Boost Miracle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerAction(onDelete); }} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-lg">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Permanently
                                </DropdownMenuItem>
                            </>
                        ) : (
                            <DropdownMenuItem onClick={handleShare} className="rounded-lg">
                                <Share2 className="mr-2 h-4 w-4 text-primary" />
                                Spread the Word
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
        </div>
        
        <div className="flex-grow pt-2 px-4 sm:px-6 space-y-4 text-left">
          <div className="text-sm sm:text-base text-muted-foreground leading-relaxed text-left">
            <div className={cn("leading-relaxed max-w-full text-left", (testimony.mediaUrl || testimony.mediaUrl2) ? "line-clamp-3" : "line-clamp-6")}>
                <div ref={contentRef} className="text-left">{testimony.content}</div>
            </div>
            {isTruncated && <Button variant="link" className="p-0 h-auto text-sm text-primary font-bold mt-1" onClick={(e) => { e.stopPropagation(); setShowFullText(true); }}>Read Full Story</Button>}
          </div>

          {(testimony.mediaUrl || testimony.mediaUrl2) && (
              <div className={cn("grid gap-3 text-left", (testimony.mediaUrl && testimony.mediaUrl2) ? "grid-cols-2" : "grid-cols-1")}>
                 {testimony.mediaUrl && (
                    <MediaPreview url={testimony.mediaUrl} type={testimony.mediaType as any} />
                 )}
                 {testimony.mediaUrl2 && (
                    <MediaPreview url={testimony.mediaUrl2} type={testimony.mediaType2 as any} />
                 )}
              </div>
          )}

          {musicEmbedUrl && (
              <div className="rounded-[1.5rem] overflow-hidden border-2 border-primary/20 bg-black/40 shadow-inner group/music relative text-left">
                 <div className="absolute top-0 right-0 p-3 opacity-5 group-hover/music:opacity-10 transition-opacity">
                    <Music className="h-10 w-10 text-primary rotate-12" />
                 </div>
                 <div className="p-4 flex items-center gap-3 border-b border-primary/10 bg-primary/5 text-left">
                    <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
                        <Music className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest leading-none">Sound of Praise</p>
                        <p className="text-[11px] font-black uppercase tracking-tight text-white/90 truncate mt-1">{testimony.musicTitle || 'Atmospheric Worship'}</p>
                    </div>
                 </div>
                 <div className="aspect-video relative w-full h-[60px] sm:h-[80px] text-left">
                    <iframe 
                        src={`${musicEmbedUrl}?autoplay=0&controls=1&showinfo=0&rel=0&modestbranding=1`}
                        title="Kingdom Worship"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        className="absolute inset-0 w-full h-full border-0"
                    />
                 </div>
              </div>
          )}

          {testimony.answeredPrayerId && testimony.answeredPrayerContent && (
            <div className="rounded-2xl border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 shadow-inner overflow-hidden text-left">
                <div className="p-4 text-left">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 font-black mb-1 text-left">Answer to Prayer Request:</div>
                    <div className="border-l-2 border-amber-500/30 pl-4 italic text-sm text-muted-foreground text-left">
                        <div className="line-clamp-2 text-left">
                           <div ref={prayerRef} className="text-left">{testimony.answeredPrayerContent}</div>
                        </div>
                    </div>
                    {isPrayerTruncated && (
                        <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 h-auto self-start text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 mt-2 hover:no-underline"
                            onClick={(e) => { e.stopPropagation(); setShowFullPrayer(true); }}
                        >
                            Read Full Request
                        </Button>
                    )}
                </div>
            </div>
           )}

           {totalReactions > 0 && (
             <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 text-left">
                    <div className="flex items-center -space-x-1.5 text-left">
                        {supporters.length > 0 && <div className="bg-primary rounded-full p-1 border-2 border-background z-30 shadow-sm"><HandHeart className="h-2.5 w-2.5 text-primary-foreground fill-current" /></div>}
                        {inspiredBy.length > 0 && <div className="bg-chart-3 rounded-full p-1 border-2 border-background z-20 shadow-sm"><Sparkles className="h-2.5 w-2.5 text-white fill-current" /></div>}
                        {connectedBy.length > 0 && <div className="bg-blue-500 rounded-full p-1 border-2 border-background z-10 shadow-sm"><PartyPopper className="h-2.5 w-2.5 text-white" /></div>}
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{(supporters.length + inspiredBy.length + connectedBy.length)}</span>
                </div>
                {testimony.campaignTitle && <span className="text-[9px] font-black uppercase text-muted-foreground/60 truncate italic bg-muted/50 px-2 py-0.5 rounded-full border max-w-[150px]">RE: {testimony.campaignTitle}</span>}
             </div>
           )}
        </div>

        <Separator className="mx-4 sm:mx-6 w-auto opacity-50" />
        <div className="py-2 sm:py-3 px-2 sm:px-6 grid grid-cols-4 gap-1 sm:gap-2">
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('amen'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasAmened && "text-primary hover:text-primary bg-primary/5")}>
                {isProcessingReaction === 'amen' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HandHeart className={cn("h-4 w-4", hasAmened && "fill-current")} />}
                Amen {supporters.length > 0 && `(${supporters.length})`}
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('inspired'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasInspired && "text-chart-3 hover:text-chart-3 bg-chart-3/5")}>
                {isProcessingReaction === 'inspired' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className={cn("h-3.5 w-3.5", hasInspired && "fill-current")} />}
                Hallelujah {inspiredBy.length > 0 && `(${inspiredBy.length})`}
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); handleReaction('connect'); }} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", hasConnected && "text-blue-500 hover:text-blue-500 bg-blue-500/5")}>
                {isProcessingReaction === 'connect' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PartyPopper className={cn("h-3.5 w-3.5", hasConnected && "fill-current")} />}
                Celebrate {connectedBy.length > 0 && `(${connectedBy.length})`}
            </Button>
            <Button variant="ghost" size="sm" className={cn("flex flex-col items-center justify-center h-auto sm:h-10 py-2 sm:py-0 gap-0.5 sm:gap-2 text-[9px] sm:text-sm font-bold uppercase sm:capitalize tracking-tight text-muted-foreground hover:bg-muted/50 rounded-xl transition-all", isCommentsOpen && "text-primary hover:text-primary bg-primary/5")} onClick={(e) => { e.stopPropagation(); setIsCommentsOpen(true); }}>
                <div className="relative flex flex-col items-center justify-center h-full"><MessageSquare className={cn("h-3.5 w-3.5 sm:h-4 w-4", isCommentsOpen && "fill-current")} />{commentCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3 sm:h-4 w-4 items-center justify-center rounded-full bg-primary text-[7px] sm:text-[8px] font-black text-primary-foreground border-background border-2 shadow-sm">{commentCount}</span>}</div>Comment
            </Button>
        </div>
      </div>

      {mounted && (
        <>
            <Drawer open={isBoostOpen} onOpenChange={setIsBoostOpen}>
                <DrawerContent className="p-0 rounded-t-[2.5rem] h-auto pb-12 text-left">
                    <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                        <DrawerHeader className="text-left p-0">
                            <div className="flex items-center gap-2 mb-2 text-left">
                                <TrendingUp className="h-5 w-5 text-indigo-600 text-left" />
                                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.3em] text-left">Kingdom Promotion</span>
                            </div>
                            <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Boost Your Testimony</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium mt-1 text-left">Share your miracle with a wider global audience.</DrawerDescription>
                        </DrawerHeader>
                    </div>
                    <div className="p-8 space-y-6 text-left">
                        <div className="bg-primary/5 rounded-2xl p-6 border-2 border-dashed border-primary/20 text-left">
                            <h4 className="font-bold text-sm mb-2 text-left">Promotion Benefits</h4>
                            <ul className="space-y-2 text-xs text-muted-foreground font-medium text-left">
                                <li className="flex items-center gap-2 text-left"><Sparkles className="h-3.5 w-3.5 text-primary text-left" /> Featured in the Kingdom Spotlight carousel.</li>
                                <li className="flex items-center gap-2 text-left"><Sparkles className="h-3.5 w-3.5 text-primary text-left" /> Prioritized in search results and regional feeds.</li>
                                <li className="flex items-center gap-2 text-left"><Sparkles className="h-3.5 w-3.5 text-primary text-left" /> Reach believers outside your immediate circle.</li>
                            </ul>
                        </div>
                        
                        <div className="p-6 rounded-2xl border bg-muted/20 space-y-4 text-left">
                            <div className="space-y-1 text-left">
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-left">Estimated Reach</p>
                                <p className="text-2xl font-black text-primary text-left">5,000+ Believers</p>
                            </div>
                            <p className="text-xs text-muted-foreground italic text-left">Select 'Proceed' to view payment coordinates and finalize your boost request.</p>
                        </div>

                        <div className="flex gap-3 text-left">
                            <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold text-left" onClick={() => setIsBoostOpen(false)}>Cancel</Button>
                            <Button asChild className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-center text-left">
                                <Link href={`/contact?subject=Testimony Boost Request&id=${testimony.id}`} className="text-center text-left">PROCEED TO HUB</Link>
                            </Button>
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>

            {isMobile ? (
                <>
                    <Drawer open={showFullText} onOpenChange={setShowFullText}>
                        <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/20 text-left"><DrawerHeader className="text-left p-0 text-left"><DrawerTitle className="text-2xl font-black font-headline text-left">Kingdom Testimony</DrawerTitle><DrawerDescription className="text-sm font-bold uppercase tracking-widest text-left">BY {authorName} • {displayDate}</DrawerDescription></DrawerHeader></div>
                            <div className="flex-grow min-h-0 pt-8 px-6 text-left">{fullTextContent}</div>
                        </DrawerContent>
                    </Drawer>
                    <Drawer open={showFullPrayer} onOpenChange={setShowFullPrayer}>
                        <DrawerContent className="h-auto max-h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b shrink-0 bg-amber-500/10 text-left"><DrawerHeader className="text-left p-0 text-left"><DrawerTitle className="text-2xl font-black font-headline uppercase text-amber-600 text-left">Answered Prayer</DrawerTitle><DrawerDescription className="text-sm font-medium mt-1 text-left">The specific request that God has fulfilled.</DrawerDescription></DrawerHeader></div>
                            <ScrollArea className="flex-grow px-8 py-10 text-left">
                                <div className="text-base text-muted-foreground whitespace-pre-wrap leading-relaxed italic text-left">
                                    {testimony.answeredPrayerContent}
                                </div>
                            </ScrollArea>
                        </DrawerContent>
                    </Drawer>
                    <Drawer open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                        <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left"><div className="p-8 border-b shrink-0 bg-muted/10 text-left"><DrawerHeader className="text-left p-0 text-left"><DrawerTitle className="text-2xl font-black font-headline uppercase text-left">Responses</DrawerTitle><DrawerDescription className="text-sm font-bold uppercase tracking-widest text-left">GATHERED JOY FOR {authorName}</DrawerDescription><div className="flex items-center gap-2 mt-4 text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-left">Swipe down to close</span></div></DrawerHeader></div><div className="flex-grow min-h-0 text-left"><CommentSection testimonyId={testimony.id} /></div></DrawerContent>
                    </Drawer>
                </>
            ) : (
                <>
                    <Dialog open={showFullText} onOpenChange={open => { setShowFullText(open); if(!open) setIsCommentsOpen(false); }}>
                        <DialogContent className="sm:max-w-4xl rounded-3xl overflow-hidden p-0 text-left"><div className="p-8 border-b bg-muted/10 text-left"><DrawerHeader className="text-left p-0 text-left"><DrawerTitle className="text-3xl font-black font-headline uppercase text-left">Kingdom Testimony</DrawerTitle><DrawerDescription className="text-sm font-bold uppercase tracking-widest text-left">BY {authorName} • {displayDate}</DrawerDescription></DrawerHeader></div><div className="p-8 text-left">{fullTextContent}</div></DialogContent>
                    </Dialog>
                    <Dialog open={showFullPrayer} onOpenChange={setShowFullPrayer}>
                        <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
                             <div className="p-8 border-b bg-amber-500/10 text-left">
                                <DialogHeader className="text-left p-0 text-left">
                                    <DialogTitle className="text-2xl font-black font-headline uppercase text-amber-600 text-left">Answered Prayer Request</DialogTitle>
                                    <DialogDescription className="text-sm font-medium text-left">The original request shared with the body.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className="p-8 text-left">
                                <div className="text-base text-muted-foreground whitespace-pre-wrap leading-relaxed italic text-left">
                                    {testimony.answeredPrayerContent}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                        <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh] p-0 overflow-hidden rounded-3xl text-left"><div className="p-8 border-b shrink-0 bg-muted/10 text-left"><DrawerHeader className="text-left p-0 text-left"><DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Gathered Responses</DrawerTitle><DrawerDescription className="text-sm font-bold uppercase tracking-widest text-left">COMMUNITY RESPONSES TO THIS MIRACLE</DrawerDescription></DrawerHeader></div><div className="flex-1 min-h-0 text-left"><CommentSection testimonyId={testimony.id} /></div></DialogContent>
                    </Dialog>
                </>
            )}
        </>
      )}
    </>
  );
});
TestimonyCard.displayName = "TestimonyCard";
