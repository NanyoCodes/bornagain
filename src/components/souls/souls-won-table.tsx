'use client';

import * as React from "react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { format, differenceInMinutes, isSameDay } from "date-fns";
import { 
  MoreHorizontal, 
  Church, 
  MapPin, 
  Phone, 
  Download, 
  HeartHandshake, 
  Edit, 
  Trash2, 
  Users, 
  History, 
  Heart, 
  Sparkles,
  ArrowRight,
  ClipboardList,
  Zap, 
  ShieldCheck, 
  Target, 
  Mail, 
  ArrowLeft, 
  BookOpen, 
  X, 
  Utensils, 
  Home, 
  Gift, 
  Calendar, 
  Send, 
  Share2,
  MessageSquare, 
  Loader2, 
  PlusCircle, 
  BookMarked,
  Check,
  ChevronDown,
  Search,
  XCircle,
  Award,
  Newspaper,
  ImageIcon,
  PlayCircle
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import type { Soul, FollowUpStatus, UserProfile, Chat, BibleChapterOutput } from "@/lib/types";
import { useUser, useFirestore, useDoc, useUserProfile, useCollection } from "@/firebase";
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  collection, 
  query, 
  setDoc, 
  serverTimestamp, 
  addDoc, 
  getDoc, 
  getDocs, 
  where,
  writeBatch
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogTrigger,
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, safeToDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { actionItems, prayerTemplates, kingdomVerses } from "@/lib/follow-up-data";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from 'next/image';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MutualConnectBadge } from "./mutual-connect-badge";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { getBibleChapter } from "@/ai/flows/get-bible-chapter-flow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { bibleData } from "@/lib/bible-data";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const iconMap: Record<string, any> = {
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
};

const getStatusClasses = (status: FollowUpStatus | undefined): string => {
    if (!status) return 'bg-secondary text-secondary-foreground border-border';
    switch (status) {
        case 'New':
            return 'bg-[hsl(var(--status-new)/0.1)] text-[hsl(var(--status-new))] border-[hsl(var(--status-new)/0.2)]';
        case 'Contacted':
            return 'bg-[hsl(var(--status-contacted)/0.1)] text-[hsl(var(--status-contacted))] border-[hsl(var(--status-contacted)/0.2)]';
        case 'Established':
            return 'bg-[hsl(var(--status-established)/0.1)] text-[hsl(var(--status-established))] border-[hsl(var(--status-established)/0.2)]';
        default:
            return 'bg-secondary text-secondary-foreground border-border';
    }
}

const getSoulAddress = (soul: Soul) => {
  const loc = soul.locationWon;
  if (!loc) return '';
  return [loc.street, loc.city, loc.state, loc.country].filter(Boolean).join(', ');
};

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
  );
}

function ShareWordDialog({ 
  isOpen, 
  onOpenChange, 
  soul, 
  onSelectVerse 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  soul: Soul | null; 
  onSelectVerse: (verse: string) => void;
}) {
  const isMobile = useIsMobile();
  const [view, setView] = useState<'hub' | 'books' | 'chapters' | 'verses'>('hub');
  const [bibleSearch, setBibleSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{reference: string, text: string}[]>([]);
  
  const [selectedBookName, setSelectedBookName] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterContent, setChapterContent] = useState<BibleChapterOutput | null>(null);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setView('hub');
      setBibleSearch('');
      setSearchResults([]);
      setSelectedBookName(null);
      setSelectedChapter(null);
      setChapterContent(null);
      setSelectedVerses([]);
    }
  }, [isOpen]);

  const constructInvitationMessage = useCallback((verseText: string, reference: string, link: string) => {
    return `"${verseText.trim()}" — ${reference}\n\nJoin the harvest at Testify! Share your miracles, win souls for Christ, and glorify God. Visit: ${window.location.origin}/bible`;
  }, []);

  const handleSearch = async () => {
      if (!bibleSearch.trim()) return;
      setIsSearching(true);
      try {
          const res = await fetch(`https://bible-api.com/${encodeURIComponent(bibleSearch)}`);
          if (res.ok) {
              const data = await res.json();
              if (data.verses) {
                  setSearchResults([{ 
                      reference: data.reference, 
                      text: data.text 
                  }]);
              }
          }
      } catch (e) {
          console.warn("Bible search failed", e);
      } finally {
          setIsSearching(false);
      }
  };

  const handleSelectBook = (bookName: string) => {
    setSelectedBookName(bookName);
    setView('chapters');
  };

  const handleSelectChapter = async (num: number) => {
    if (!selectedBookName) return;
    setSelectedChapter(num);
    setLoadingVerses(true);
    try {
      const content = await getBibleChapter({ book: selectedBookName, chapter: num });
      setChapterContent(content);
      setView('verses');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVerses(false);
    }
  };

  const toggleVerse = (num: number) => {
    setSelectedVerses(prev => prev.includes(num) ? prev.filter(v => v !== num) : [...prev, num].sort((a,b) => a-b));
  };

  const handleShareSelected = () => {
    if (!chapterContent || selectedVerses.length === 0) return;
    
    const selectedTexts = chapterContent.verses
      .filter(v => selectedVerses.includes(v.verse))
      .map(v => v.text)
      .join(' ');
      
    const reference = `${chapterContent.book} ${chapterContent.chapter}:${selectedVerses.join(', ')}`;
    const link = `${window.location.origin}/dashboard/bible?book=${encodeURIComponent(chapterContent.book)}&chapter=${chapterContent.chapter}`;
    
    onSelectVerse(constructInvitationMessage(selectedTexts, reference, link));
  };

  const renderHub = (
    <div className="space-y-8 sm:space-y-10 text-left">
      <div className="space-y-4 text-left">
        <div className="relative text-left">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-muted-foreground opacity-50" />
            <Input 
                placeholder="Search Bible (e.g. John 3:16)..." 
                value={bibleSearch}
                onChange={e => setBibleSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="h-10 sm:h-14 pl-10 sm:pl-14 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-xs sm:text-lg text-left"
            />
            <Button 
                onClick={handleSearch} 
                disabled={isSearching || !bibleSearch.trim()}
                variant="ghost"
                size="sm"
                className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 h-7 sm:h-10 px-3 sm:px-6 rounded-xl font-black text-[9px] sm:text-xs uppercase text-primary"
            >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin text-left" /> : 'SEARCH'}
            </Button>
        </div>

        {searchResults.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-2 text-left">
                {searchResults.map((res, idx) => (
                    <Button 
                        key={idx}
                        variant="outline"
                        className="w-full h-auto p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border-primary/20 bg-primary/5 flex flex-col items-start gap-3 text-left hover:bg-primary/10 transition-all border-2 border-dashed"
                        onClick={() => onSelectVerse(constructInvitationMessage(res.text, res.reference, `${window.location.origin}/dashboard/bible`))}
                    >
                        <div className="flex items-center justify-between w-full text-left">
                            <span className="font-black text-[9px] sm:text-xs uppercase tracking-widest text-primary">{res.reference}</span>
                            <Send className="h-3.5 w-3.5 sm:h-4 w-4 text-primary opacity-40 text-left" />
                        </div>
                        <p className="text-xs sm:text-base text-muted-foreground leading-relaxed italic line-clamp-4 text-left">"{res.text.trim()}"</p>
                    </Button>
                ))}
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-left">
        <Button onClick={() => setView('books')} variant="outline" className="h-24 sm:h-32 rounded-2xl sm:rounded-[2rem] gap-2 sm:gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group transition-all flex flex-col items-center justify-center p-4 text-left">
            <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 mb-1 group-hover:scale-110 transition-transform text-left" />
            <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-center text-left">Browse Bible</span>
        </Button>
        <Button variant="outline" asChild className="h-24 sm:h-32 rounded-2xl sm:rounded-[2rem] gap-2 sm:gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group transition-all flex flex-col items-center justify-center p-4 text-left">
            <Link href="/bible" className="flex flex-col items-center justify-center text-left text-left">
                <BookMarked className="h-6 w-6 sm:h-8 sm:w-8 mb-1 group-hover:scale-110 transition-transform text-left" />
                <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-center text-left">Open Reader</span>
            </Link>
        </Button>
      </div>

      <div className="space-y-6 text-left">
        <div className="flex items-center justify-between px-1 text-left">
            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground text-left">Kingdom Essential Scriptures</Label>
            <Badge variant="outline" className="h-5 px-2 text-[8px] font-bold text-primary border-primary/20 bg-primary/5 uppercase text-left">Top Weapons</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-left">
          {kingdomVerses.map((v, idx) => (
            <Button 
              key={idx} 
              variant="ghost" 
              className="w-full justify-start h-auto py-4 sm:py-6 px-4 sm:px-6 rounded-2xl sm:rounded-[2rem] hover:bg-primary/5 group border border-transparent hover:border-primary/10 transition-all text-left block relative overflow-hidden bg-muted/5 shadow-sm text-left"
              onClick={() => onSelectVerse(constructInvitationMessage(v.text, v.reference, `${window.location.origin}/dashboard/bible`))}
            >
              <div className="flex items-center justify-between w-full mb-1.5 text-left">
                  <span className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-primary text-left">{v.reference}</span>
                  <PlusCircle className="h-3.5 w-3.5 sm:h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity text-left" />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic line-clamp-2 text-left">{v.text}</p>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderBooks = (
    <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">
      {bibleData.map(book => (
        <Button key={book.name} variant="outline" className="h-12 sm:h-14 rounded-xl font-bold uppercase text-[9px] sm:text-xs text-left" onClick={() => handleSelectBook(book.name)}>
          {book.name}
        </Button>
      ))}
    </div>
  );

  const renderChapters = (
    <div className="p-2 grid grid-cols-5 sm:grid-cols-8 gap-2 text-left">
       {selectedBookName && bibleData.find(b => b.name === selectedBookName)?.chapters.map(ch => (
         <Button key={ch.chapter} variant="outline" className="h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-lg font-black text-xs sm:text-sm text-left" onClick={() => handleSelectChapter(ch.chapter)}>
           {ch.chapter}
         </Button>
       ))}
    </div>
  );

  const renderVerses = (
    <div className="space-y-4 pb-12 text-left">
       <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6 text-left">
          <p className="text-[10px] font-black uppercase text-primary mb-1 text-left">SELECTED FOR SHARING</p>
          <p className="text-xs font-bold text-muted-foreground text-left">
            {selectedBookName} {selectedChapter}:{selectedVerses.join(', ')}
          </p>
       </div>
       <div className="space-y-1 font-serif text-left">
         {loadingVerses ? (
           <div className="flex justify-center py-20 text-left"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20 text-left" /></div>
         ) : chapterContent?.verses.map(v => (
           <div 
             key={v.verse} 
             className={cn(
               "p-3 rounded-xl transition-all cursor-pointer border-2 text-left",
               selectedVerses.includes(v.verse) ? "bg-primary/10 border-primary/40" : "bg-transparent border-transparent hover:bg-muted/50"
             )}
             onClick={() => toggleVerse(v.verse)}
            >
              <sup className="text-[10px] font-black mr-2 opacity-40 text-left">{v.verse}</sup>
              <span className="text-sm leading-relaxed text-left">{v.text}</span>
           </div>
         ))}
       </div>
    </div>
  );

  const title = view === 'hub' ? "Share the Word" : view === 'books' ? "Select Book" : view === 'chapters' ? `${selectedBookName}: Select Chapter` : `${selectedBookName} ${selectedChapter}`;
  const desc = view === 'hub' ? `Equip ${soul?.firstName} with the living Word.` : `Browsing ${selectedBookName || 'Bible'} for the harvest.`;

  const header = (
    <div className="p-6 sm:p-8 border-b bg-muted/10 shrink-0 text-left text-left text-left">
      <div className="flex items-center justify-between gap-4 text-left">
        <div className="min-w-0 text-left">
          <div className="flex items-center gap-3 mb-2 text-left">
            {view !== 'hub' && (
                <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full -ml-2 text-left" onClick={() => setView(view === 'verses' ? 'chapters' : view === 'chapters' ? 'books' : 'hub')}>
                    <ArrowLeft className="h-4 w-4 text-left" />
                </Button>
            )}
            <Target className="h-5 w-5 text-primary text-left" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left">Kingdom Study</span>
          </div>
          <DialogHeader className="text-left text-left">
            <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left text-left">{title}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm font-medium text-left text-left">{desc}</DialogDescription>
          </DialogHeader>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/40 text-left" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5 sm:h-6 sm:w-6 text-left" />
        </Button>
      </div>
    </div>
  );

  const body = (
    <ScrollArea className="flex-grow min-h-[300px] text-left">
        <div className="p-4 sm:p-10 text-left">
            {view === 'hub' && renderHub}
            {view === 'books' && renderBooks}
            {view === 'chapters' && renderChapters}
            {view === 'verses' && renderVerses}
        </div>
    </ScrollArea>
  );

  const footer = view === 'verses' && (
    <div className="p-6 border-t bg-muted/5 flex flex-col sm:flex-row gap-3 text-left">
        <Button variant="outline" onClick={() => setSelectedVerses([])} className="rounded-xl h-12 flex-1 font-bold text-left">Clear Selection</Button>
        <Button 
          onClick={handleShareSelected} 
          disabled={selectedVerses.length === 0}
          className="rounded-xl h-12 flex-1 font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-left"
        >
          PREPARE SHARE ({selectedVerses.length})
        </Button>
    </div>
  );

  if (isMobile) {
      return (
          <Sheet open={isOpen} onOpenChange={onOpenChange}>
              <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                  {header}
                  {body}
                  {footer}
              </SheetContent>
          </Sheet>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col text-left">
        {header}
        {body}
        {footer || (
            <div className="p-6 border-t bg-muted/5 flex justify-end shrink-0 text-left">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-xs text-left">Close Hub</Button>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SoulProfileContent({ 
  soul, 
  onFollowUp, 
  onViewHistory, 
  onEdit, 
  onAssess, 
  onOpenAssignDialog, 
  onExportSingle, 
  onDelete 
}: { 
  soul: Soul; 
  onFollowUp: (s: Soul) => void;
  onViewHistory: (s: Soul) => void;
  onEdit: (s: Soul) => void;
  onAssess: (s: Soul) => void;
  onOpenAssignDialog: (s: Soul) => void;
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
  onDelete: (s: Soul) => void;
}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { userProfile: currentUserProfile } = useUserProfile();
  const { toast } = useToast();
  const router = useRouter();

  const [isCommChannelDialogOpen, setIsCommChannelDialogOpen] = React.useState(false);
  const [isHelpNeedDialogOpen, setIsHelpNeedDialogOpen] = React.useState(false);
  const [isShareTargetDialogOpen, setIsShareTargetDialogOpen] = React.useState(false);
  const [isPartnerSelectionDialogOpen, setIsPartnerSelectionDialogOpen] = React.useState(false);
  const [isPrayerCustomizationOpen, setIsPrayerCustomizationOpen] = React.useState(false);
  const [isStudyWordOpen, setIsStudyWordOpen] = React.useState(false);
  const [customMessageText, setCustomMessageText] = React.useState('');
  const [clickedActionId, setClickedActionId] = React.useState<string | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = React.useState(false);

  const address = getSoulAddress(soul);
  const needs = soul.needsAssessment;

  const sortedHistory = React.useMemo(() => {
    if (!soul.followUpLog || soul.followUpLog.length === 0) return [];
    return [...soul.followUpLog].sort((a, b) => {
      const dateB = safeToDate(b.date)?.getTime() ?? 0;
      const dateA = safeToDate(a.date)?.getTime() ?? 0;
      return dateB - dateA;
    });
  }, [soul.followUpLog]);

  const resolveTemplate = React.useCallback((template: string, targetSoul: Soul) => {
      const gender = targetSoul.gender?.toLowerCase() || 'other';
      const pronouns = {
          subject: gender === 'female' ? 'she' : 'he',
          object: gender === 'female' ? 'her' : 'him',
          possessive: gender === 'female' ? 'her' : 'his'
      };
      
      return template
          .replace(/{name}/g, targetSoul.firstName)
          .replace(/{subject}/g, pronouns.subject)
          .replace(/{object}/g, pronouns.object)
          .replace(/{possessive}/g, pronouns.possessive);
  }, []);

  const finalizeLog = async (actionId: string, noteAddendum: string = '') => {
    if (!user || !firestore || !soul) return;
    setIsActionSubmitting(true);

    const action = actionItems.find(a => a.id === actionId);
    const batch = writeBatch(firestore);
    const soulRef = doc(firestore, `users/${soul.userId}/souls`, soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);

    const memberName = `${currentUserProfile?.firstName || ''} ${currentUserProfile?.lastName || ''}`.trim() || user.displayName || 'Member';
    const logEntry = {
        date: new Date(), 
        note: `Logged via Identity Hub: ${action?.label}${noteAddendum ? ` - ${noteAddendum}` : ''}`,
        actions: [actionId],
        memberId: user.uid,
        memberName: memberName,
    };

    batch.update(soulRef, {
        followUpLog: arrayUnion(logEntry),
        lastUpdatedAt: serverTimestamp(),
    });
    batch.update(globalSoulRef, {
        followUpLog: arrayUnion(logEntry),
        lastUpdatedAt: serverTimestamp(),
    });

    try {
        await batch.commit();
        toast({ title: 'Kingdom Impact Logged' });
    } catch (err) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: soulRef.path, operation: 'update' }, user));
    } finally {
        setIsActionSubmitting(false);
        setClickedActionId(null);
    }
  };

  const handleActionClick = async (actionId: string) => {
    if (!soul) return;
    setClickedActionId(actionId);

    if (actionId === 'phone_call' || actionId === 'text_message' || actionId === 'prayed_together') {
        if (!soul.phone) {
            toast({ variant: 'destructive', title: 'Phone Missing', description: `Please save a number for ${soul.firstName} first.` });
            return;
        }
    }

    switch (actionId) {
        case 'prayed_together':
            setCustomMessageText(resolveTemplate(prayerTemplates[0].text, soul));
            setIsPrayerCustomizationOpen(true);
            return;
        case 'studied_bible':
            setIsStudyWordOpen(true);
            return;
        case 'text_message':
            setIsCommChannelDialogOpen(true);
            return;
        case 'introduced_friend':
            setIsShareTargetDialogOpen(true);
            return;
        case 'phone_call':
            await finalizeLog(actionId, 'Dialer initiated');
            window.location.href = `tel:${soul.phone}`;
            return;
        case 'visited_home':
            if (address) {
                await finalizeLog(actionId, `Navigated to venue: ${address}`);
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
            } else {
                toast({ variant: 'destructive', title: 'Location Undefined' });
            }
            return;
        case 'helped_with_need':
            setIsHelpNeedDialogOpen(true);
            return;
        case 'invited_to_event':
            await finalizeLog(actionId, 'Redirected to Events Hub');
            router.push('/events');
            return;
        case 'shared_meal':
        case 'gave_gift':
            const provisionKey = `testify_pending_provisions_${user?.uid}`;
            const stored = localStorage.getItem(provisionKey);
            let current = stored ? JSON.parse(stored) : [];
            if (!Array.isArray(current)) current = [];
            if (!current.some((p: any) => p.soulId === soul.id && p.actionId === actionId)) {
                current.push({ soulId: soul.id, soulName: `${soul.firstName} ${soul.lastName}`, actionId: actionId, timestamp: Date.now() });
                localStorage.setItem(provisionKey, JSON.stringify(current));
                window.dispatchEvent(new Event('testify_pending_action_update'));
            }
            const mPath = actionId === 'shared_meal' ? '/marketplace' : '/marketplace/gifts';
            router.push(`${mPath}?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}&actionId=${actionId}`);
            return;
        default:
            await finalizeLog(actionId);
    }
  };

  const handleCommChoice = (channel: 'whatsapp' | 'sms') => {
      if (!soul?.phone || !clickedActionId) return;
      const cleanPhone = soul.phone.replace(/\+/g, '').replace(/\D/g, '');
      const message = customMessageText || `Hi ${soul.firstName}, I'm thinking of you today and praying for you. God bless you!`;
      const messageText = encodeURIComponent(message);
      
      if (channel === 'whatsapp') {
          window.open(`https://wa.me/${cleanPhone}?text=${messageText}`, '_blank');
      } else {
          window.location.href = `sms:${soul.phone}?body=${messageText}`;
      }
      
      finalizeLog(clickedActionId, `Sent via ${channel.toUpperCase()}: ${message.substring(0, 30)}...`);
      setIsCommChannelDialogOpen(false);
      setCustomMessageText('');
  };

  const handleHelpNeedConfirm = (note: string) => {
      if (!soul) return;
      finalizeLog('helped_with_need', `Assistance details: ${note}`);
      setIsHelpNeedDialogOpen(false);
  };

  const handleShareToWhatsApp = () => {
    if (!soul) return;
    const wonAt = safeToDate(soul.wonAt);
    const details = `Introduction to ${soul.firstName}, a new soul won for the Kingdom! 🎊\n\nStatus: ${soul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\n\nSupport their growth on Testify: ${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(details)}`, '_blank');
    finalizeLog('introduced_friend', 'Shared via WhatsApp External');
    setIsShareTargetDialogOpen(false);
  };

  const handleShareToPartner = async (partner: UserProfile['accountabilityPartners'][0]) => {
      if (!user || !firestore || !soul || !currentUserProfile) return;
      const wonAt = safeToDate(soul.wonAt);
      const text = `SHARING SOUL DATA: ${soul.firstName} ${soul.lastName}\nStatus: ${soul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\n\nLet's coordinate follow-up on Testify.`;
      try {
          const participantIds = [user.uid, partner.userId].sort();
          const chatsRef = collection(firestore, 'chats');
          const q = query(chatsRef, where('participantIds', '==', participantIds), where('isGroupChat', '==', false));
          const snap = await getDocs(q);
          let chatId: string;
          if (!snap.empty) {
              chatId = snap.docs[0].id;
          } else {
              const otherDoc = await getDoc(doc(firestore, 'users', partner.userId));
              const otherProfile = otherDoc.data() as UserProfile;
              const newChat = {
                  participantIds,
                  participantInfo: {
                      [user.uid]: { firstName: currentUserProfile.firstName, lastName: currentUserProfile.lastName, photoURL: currentUserProfile.photoURL || '' },
                      [partner.userId]: { firstName: partner.firstName, lastName: partner.lastName, photoURL: partner.photoURL || '' }
                  },
                  lastUpdatedAt: serverTimestamp(),
                  isGroupChat: false,
                  hasMessages: true
              };
              const ref = await addDoc(chatsRef, newChat);
              chatId = ref.id;
          }
          await addDoc(collection(firestore, 'chats', chatId, 'messages'), { senderId: user.uid, text, createdAt: serverTimestamp() });
          await updateDoc(doc(firestore, 'chats', chatId), { lastUpdatedAt: serverTimestamp(), hasMessages: true });
          toast({ title: 'Shared with Partner!' });
          finalizeLog('introduced_friend', `Shared with partner: ${partner.firstName}`);
          setIsPartnerSelectionDialogOpen(false);
          setIsShareTargetDialogOpen(false);
          router.push(`/chats/${chatId}`);
      } catch (e) {
          toast({ variant: 'destructive', title: 'Share Failed' });
      }
  };

  const handlePrayerCustomizationConfirm = (text: string) => {
      setCustomMessageText(text);
      setIsPrayerCustomizationOpen(false);
      requestAnimationFrame(() => {
          setIsCommChannelDialogOpen(true);
      });
  };

  const uniquePartners = React.useMemo(() => {
    const partners = currentUserProfile?.accountabilityPartners || [];
    const uniqueMap = new Map();
    partners.forEach(p => {
        if (p.userId && !uniqueMap.has(p.userId)) uniqueMap.set(p.userId, p);
    });
    return Array.from(uniqueMap.values());
  }, [currentUserProfile?.accountabilityPartners]);

  return (
    <div className="space-y-6 text-left">
      <Card className="rounded-none sm:rounded-[2rem] overflow-hidden border-none shadow-2xl bg-card/50 backdrop-blur-sm border-t-8 border-t-primary/20 text-left">
        <CardHeader className="p-8 pb-4 text-center text-left">
            <div className="relative inline-block mx-auto mb-4 text-left">
                <Dialog>
                    <DialogTrigger asChild disabled={!soul.photoURL}>
                        <Avatar className={cn("h-48 w-48 border-4 border-background shadow-xl ring-2 ring-primary/10 transition-all active:scale-95 text-left", soul.photoURL && "cursor-pointer hover:scale-105")}>
                            <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                            <AvatarFallback className="text-3xl font-black bg-primary/10 text-primary text-left">{soul.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </DialogTrigger>
                    {soul.photoURL && (
                        <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
                            <DialogHeader className="sr-only text-center"><DialogTitle className="text-left">Soul Photo</DialogTitle></DialogHeader>
                            <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
                                <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center text-left text-left">
                                    <Image src={soul.photoURL} alt={soul.firstName} fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized />
                                </div>
                            </div>
                        </DialogContent>
                    )}
                </Dialog>
                {address && (
                    <Button 
                        size="icon" 
                        className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full shadow-lg border-2 border-background text-left"
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')}
                        title="View Map"
                    >
                        <MapPin className="h-5 w-5 text-left" />
                    </Button>
                )}
            </div>
            <div className="flex flex-col items-center gap-2 text-left">
                <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-center sm:text-left truncate w-full text-left">
                  {soul.firstName} {soul.lastName}
                </CardTitle>
                <div className="flex gap-2 justify-center text-left items-center">
                    <Badge className={cn("h-5 px-2 text-[9px] uppercase font-black tracking-widest justify-center text-left", getStatusClasses(soul.status))} variant="outline">
                        {soul.status}
                    </Badge>
                    <MutualConnectBadge soul={soul} />
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-8 pt-0 space-y-6 text-left">
            <Separator className="opacity-50 text-left" />
            
            <div className="space-y-4 text-left">
                <div className="flex items-center justify-between text-left text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left text-left">Spiritual Identity</p>
                    <div className="flex items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10">
                                    <Download className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl">
                                <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Select Format</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => onExportSingle(soul, 'csv')}>CSV Export</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => onExportSingle(soul, 'pdf')}>PDF Report</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left" onClick={() => onEdit(soul)}>
                            <Edit className="h-4 w-4 text-left" />
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-1 text-left">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Full Name</p>
                        <p className="text-[11px] sm:text-xs font-bold truncate capitalize text-left">{soul.firstName} {soul.lastName}</p>
                    </div>
                    <div className="space-y-1 text-left">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Gender/Age</p>
                        <p className="text-[11px] sm:text-xs font-bold text-left">{soul.gender || 'N/A'} • {soul.age ? `${soul.age} yrs` : 'Age N/A'}</p>
                    </div>
                    <div className="space-y-1 text-left">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Relationship</p>
                        <p className="text-[11px] sm:text-xs font-bold text-left truncate capitalize">{soul.relationship || 'N/A'}</p>
                    </div>
                    <div className="space-y-1 text-left">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Work Status</p>
                        <p className="text-[11px] sm:text-xs font-bold text-left truncate capitalize">{soul.workStatus || 'N/A'}</p>
                    </div>
                    <div className="space-y-1 text-left">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Rel. Status</p>
                        <p className="text-[11px] sm:text-xs font-bold text-left truncate capitalize">{soul.maritalStatus || 'N/A'}</p>
                    </div>
                    <div className="space-y-1 text-left">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-left">Nickname</p>
                        <p className="text-[11px] sm:text-xs font-bold text-left truncate capitalize">{soul.nickname || 'N/A'}</p>
                    </div>
                </div>
            </div>

            <Separator className="opacity-20 text-left" />

            <div className="space-y-3 text-left">
                <div className="flex items-center justify-between text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Contact Identity</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left" onClick={() => onEdit(soul)}>
                        <Edit className="h-4 w-4 text-left" />
                    </Button>
                </div>
                <div className="space-y-2 text-left">
                    {soul.phone ? (
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-foreground text-left">
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0 text-left" />
                            {soul.phone}
                        </div>
                    ) : (
                        <p className="text-[9px] text-muted-foreground/40 italic text-left">No phone recorded</p>
                    )}
                    {soul.email && (
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-foreground text-left">
                            <Mail className="h-3.5 w-3.5 text-primary shrink-0 text-left" />
                            {soul.email}
                        </div>
                    )}
                </div>
            </div>

            <Separator className="opacity-20 text-left" />

            <div className="space-y-4 text-left">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Relational Actions</p>
                <div className="grid grid-cols-2 gap-2 text-left">
                    {actionItems.map(action => {
                        const Icon = iconMap[action.id] || Heart;
                        const isThisProcessing = clickedActionId === action.id && isActionSubmitting;
                        return (
                            <Button
                                key={action.id}
                                variant="outline"
                                className="flex items-center justify-start gap-2 h-10 px-3 rounded-xl border-2 border-transparent bg-muted/20 hover:bg-primary/5 hover:border-primary/10 transition-all text-left group"
                                onClick={() => handleActionClick(action.id)}
                                disabled={isActionSubmitting}
                            >
                                {isThisProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Icon className="h-3.5 w-3.5 text-primary" />}
                                <span className="text-[10px] font-bold uppercase tracking-tight truncate">{action.label}</span>
                            </Button>
                        )
                    })}
                </div>
            </div>

            <Separator className="opacity-20 text-left" />

            <div className="space-y-4 text-left">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Harvest Context</p>
                <div className="space-y-1 text-left">
                    <p className="text-[11px] sm:text-xs font-bold flex items-center gap-1.5 truncate text-left">
                        <Target className="h-3 w-3 text-primary text-left" />
                        Source: {soul.source}
                    </p>
                </div>
            </div>

            <Separator className="opacity-20 text-left" />

            <div className="space-y-4 text-left">
                <div className="flex items-center justify-between text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Kingdom Placement</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left" onClick={() => onOpenAssignDialog(soul)}>
                        <Edit className="h-4 w-4 text-left" />
                    </Button>
                </div>
                <div className="space-y-3 text-left">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-primary/5 border border-primary/10 text-left">
                        <HeartHandshake className="h-4 w-4 text-primary shrink-0 text-left" />
                        <div className="min-w-0 flex-1 text-left text-left">
                            <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest text-left text-left">Fellowship</p>
                            <p className="text-[11px] sm:text-xs font-bold truncate capitalize text-left text-left">{soul.fellowshipName || 'No Fellowship'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-blue-500/5 border border-blue-500/10 text-left text-left text-left">
                        <Users className="h-4 w-4 text-blue-500 shrink-0 text-left text-left text-left" />
                        <div className="min-w-0 flex-1 text-left text-left text-left">
                            <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest text-left text-left text-left">Association</p>
                            <p className="text-[11px] sm:text-xs font-bold truncate capitalize text-left text-left text-left">{soul.associationName || 'No Association'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <Separator className="opacity-20 text-left" />

            <div className="space-y-4 text-left">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Spiritual Milestones</p>
                <div className="grid grid-cols-2 gap-2 text-left">
                    {[
                        { label: 'Church', val: soul.attendingChurch, icon: Church },
                        { label: 'Word Study', val: soul.inBibleStudy, icon: BookOpen },
                        { label: 'Prayer', val: soul.attendingPrayer, icon: Zap },
                        { label: 'Service', val: soul.inServiceDepartment, icon: ShieldCheck },
                    ].map(milestone => (
                        <div key={milestone.label} className={cn(
                            "flex items-center gap-2 p-2 rounded-xl border transition-all text-left",
                            milestone.val ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/10 border-transparent text-muted-foreground/40"
                        )}>
                            <milestone.icon className="h-3 w-3 text-left" />
                            <span className="text-[10px] font-black uppercase tracking-tight text-left">{milestone.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <Separator className="opacity-20 text-left" />
            <div className="space-y-4 text-left">
                <div className="flex items-center justify-between text-left text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2 text-left">
                        <History className="h-3.5 w-3.5 text-left" /> Interaction History
                    </p>
                    <Button variant="ghost" className="h-6 text-[8px] font-black uppercase text-primary hover:bg-primary/5 text-left" onClick={() => onViewHistory(soul)}>
                        View All
                    </Button>
                </div>
                <div className="space-y-4 pl-1 text-left text-left text-left text-left">
                    {sortedHistory.length > 0 ? (
                        sortedHistory.slice(0, 3).map((log, index) => {
                            const date = safeToDate(log.date);
                            return (
                                <div key={index} className="relative pl-4 border-l-2 border-primary/20 text-left">
                                    <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest mb-1 text-left">
                                        {date ? format(date, "MMM d, yyyy") : 'Recently'}
                                        {log.memberName && <span className="ml-2 text-primary/40">• By {log.memberName.split(' ')[0]}</span>}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 italic text-left">
                                        &ldquo;{log.note || 'Interaction logged.'}&rdquo;
                                    </p>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-4 text-center border border-dashed rounded-xl bg-muted/5 text-left text-left text-left">
                            <p className="text-sm text-muted-foreground/40 italic text-left text-left text-left">No interactions recorded.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3 p-5 bg-muted/20 rounded-[2rem] border-2 border-dashed border-primary/10 shadow-inner text-left">
                <div className="flex items-center justify-between text-left text-left text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-1 text-left text-left text-left">
                        <ClipboardList className="h-3.5 w-3.5 text-left text-left text-left" /> Assessed Needs
                    </p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left text-left text-left" onClick={() => onAssess(soul)}>
                        <Edit className="h-4 w-4 text-left text-left text-left" />
                    </Button>
                </div>
                {needs ? (
                    <div className="space-y-4 text-left text-left text-left text-left text-left">
                        {needs.generalImpression && <p className="text-xs text-muted-foreground italic leading-relaxed text-balance text-left">&ldquo;{needs.generalImpression}&rdquo;</p>}
                        
                        <div className="grid grid-cols-2 gap-3 text-left text-left text-left text-left">
                            {needs.emotionalNeeds && (
                                <div className="space-y-1 text-left text-left text-left text-left text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-red-500/10 text-red-600 border-none px-1.5 uppercase font-black text-left text-left text-left text-left">Emotional</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left text-left text-left text-left">{needs.emotionalNeeds}</p>
                                </div>
                            )}
                            {needs.physicalNeeds && (
                                <div className="space-y-1 text-left text-left text-left text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-amber-500/10 text-amber-600 border-none px-1.5 uppercase font-black text-left text-left text-left text-left">Physical</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left text-left text-left text-left">{needs.physicalNeeds}</p>
                                </div>
                            )}
                            {needs.financialNeeds && (
                                <div className="space-y-1 text-left text-left text-left text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-green-500/10 text-green-600 border-none px-1.5 uppercase font-black text-left text-left text-left text-left">Financial</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left text-left text-left text-left">{needs.financialNeeds}</p>
                                </div>
                            )}
                            {needs.socialNeeds && (
                                <div className="space-y-1 text-left text-left text-left text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-indigo-500/10 text-indigo-600 border-none px-1.5 uppercase font-black text-left text-left text-left text-left">Social</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left text-left text-left text-left">{needs.socialNeeds}</p>
                                </div>
                            )}
                        </div>

                        {needs.followUpPlan && (
                            <div className="pt-2 border-t border-primary/10 text-left text-left text-left text-left">
                                <p className="text-[8px] font-black uppercase text-primary/60 mb-1 flex items-center gap-1.5 text-left text-left text-left text-left">
                                    <Target className="h-2.5 w-2.5 text-left text-left text-left text-left" /> Strategy
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed italic text-left text-left text-left text-left">{needs.followUpPlan}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-4 text-center text-left">
                        <Button variant="outline" size="sm" className="h-8 rounded-xl text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 text-left" onClick={() => onAssess(soul)}>
                            BEGIN ASSESSMENT
                        </Button>
                    </div>
                )}
            </div>

            <div className="pt-2 text-left space-y-3">
                <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 text-left" onClick={() => onFollowUp(soul)}>
                    LOG FOLLOW-UP
                </Button>
                <Button variant="ghost" className="w-full h-11 text-destructive font-bold uppercase tracking-widest text-[10px] text-left">
                    <Trash2 className="mr-2 h-4 w-4 text-left text-left" /> DELETE RECORD
                </Button>
            </div>
        </CardContent>
      </Card>

      <Dialog open={isPrayerCustomizationOpen} onOpenChange={setIsPrayerCustomizationOpen}>
          <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl text-left">
              <div className="p-8 border-b bg-muted/10 text-left">
                  <DialogHeader className="text-left text-left">
                      <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Kingdom Intercession</DialogTitle>
                      <DialogDescription className="text-sm font-medium text-left text-left">Draft a powerful prayer for {soul.firstName}.</DialogDescription>
                  </DialogHeader>
              </div>
              <div className="p-8 space-y-6 text-left text-left">
                <div className="space-y-3 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Select Focus</label>
                    <div className="flex flex-wrap gap-2 text-left">
                        {prayerTemplates.map(t => (
                            <Button 
                                key={t.id} 
                                variant="outline" 
                                size="sm" 
                                className="rounded-full h-8 px-4 text-[9px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 hover:text-primary text-left"
                                onClick={() => setCustomMessageText(resolveTemplate(t.text, soul))}
                            >
                                {t.label}
                            </Button>
                        ))}
                    </div>
                </div>
                  <div className="space-y-2 text-left text-left">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left text-left">Customize Message</Label>
                      <Textarea 
                          value={customMessageText}
                          onChange={e => setCustomMessageText(e.target.value)}
                          className="min-h-[200px] rounded-2xl bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6 text-left text-left text-left"
                      />
                  </div>
                  <Button 
                      onClick={() => handlePrayerCustomizationConfirm(customMessageText)} 
                      disabled={!customMessageText.trim()} 
                      className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-left"
                  >
                      CONTINUE TO CHANNEL
                  </Button>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isCommChannelDialogOpen} onOpenChange={setIsCommChannelDialogOpen}>
        <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center text-left">
          <DialogHeader className="text-center space-y-2 text-left text-left text-left">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-center text-left text-left text-left">
                  <MessageSquare className="h-7 w-7 text-primary text-center text-left text-left text-left" />
              </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center text-left text-left text-left text-left text-left">Message Hub</DialogTitle>
            <DialogDescription className="text-sm font-medium text-center text-left text-left text-left text-left text-left">How would you like to encourage {soul.firstName}?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-6 text-left text-left text-left">
            <Button onClick={() => handleCommChoice('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20 text-left text-left">
              <WhatsAppIcon className="h-5 w-5 text-left" /> WhatsApp
            </Button>
            <Button onClick={() => handleCommChoice('sms')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5 text-left text-left">
              <MessageSquare className="h-5 w-5 text-left" /> Standard SMS
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isHelpNeedDialogOpen} onOpenChange={setIsHelpNeedDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left">
          <div className="p-8 border-b bg-muted/10 text-left text-left">
            <DialogHeader className="text-left text-left">
              <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left">Support Provided</DialogTitle>
              <DialogDescription className="text-sm font-medium text-left text-left text-left">Describe how you supported {soul.firstName}.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6 text-left text-left">
            <div className="space-y-2 text-left text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left">Support Details</Label>
                <Textarea 
                    placeholder="e.g. Provided food items, helped with bill..." 
                    onChange={e => setCustomMessageText(e.target.value)} 
                    className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner text-left text-left text-left"
                />
            </div>
            <Button onClick={() => handleHelpNeedConfirm(customMessageText)} className="w-full h-12 rounded-xl font-bold text-left text-left text-left">Confirm Service</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareTargetDialogOpen} onOpenChange={setIsShareTargetDialogOpen}>
        <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center text-left text-left">
          <DialogHeader className="text-center space-y-2 text-left text-left text-left">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-center text-left text-left text-left">
                  <Share2 className="h-7 w-7 text-primary text-center text-left text-left text-left" />
              </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center text-left text-left text-left text-left">Share Details</DialogTitle>
            <DialogDescription className="text-sm font-medium text-center text-left text-left text-left text-left">Where would you like to share {soul.firstName}'s info?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-6 text-left text-left text-left">
            <Button onClick={handleShareToWhatsApp} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20 text-left text-left">
              <WhatsAppIcon className="h-5 w-5 text-left" /> WhatsApp External
            </Button>
            <Button onClick={() => { setIsShareTargetDialogOpen(false); setTimeout(() => setIsPartnerSelectionDialogOpen(true), 100); }} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5 text-left text-left text-left">
              <HeartHandshake className="h-5 w-5 text-left" /> Partner on App
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPartnerSelectionDialogOpen} onOpenChange={setIsPartnerSelectionDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left">
              <div className="p-8 border-b bg-muted/10 text-left text-left">
                  <DialogHeader className="text-left text-left text-left">
                      <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left">Select Partner</DialogTitle>
                      <DialogDescription className="text-sm font-medium text-left text-left text-left">Which partner should receive these details?</DialogDescription>
                  </DialogHeader>
              </div>
              <div className="p-6 text-left text-left">
              <ScrollArea className="h-64 text-left text-left">
                  <div className="space-y-2 text-left text-left">
                      {uniquePartners.map(p => (
                          <Button 
                              key={p.userId} 
                              variant="ghost" 
                              className="w-full justify-start h-14 rounded-xl gap-4 hover:bg-primary/5 group flex items-center text-left text-left text-left"
                              onClick={() => handleShareToPartner(p)}
                          >
                              <Avatar className="h-8 w-8 border shrink-0 text-left text-left text-left text-left">
                                  <AvatarImage src={p.photoURL} className="text-left text-left text-left text-left" />
                                  <AvatarFallback className="font-bold text-[10px] text-center text-left text-left text-left text-left"> {p.firstName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="font-bold text-sm group-hover:text-primary transition-colors text-left text-left text-left">{p.firstName} {p.lastName}</span>
                          </Button>
                      ))}
                      {uniquePartners.length === 0 && (
                          <p className="text-center text-xs text-muted-foreground py-12 text-left text-left text-left text-left">No partners found. Connect with some in Settings!</p>
                      )}
                  </div>
              </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <ShareWordDialog 
          isOpen={isStudyWordOpen}
          onOpenChange={setIsStudyWordOpen}
          soul={soul}
          onSelectVerse={(v) => { setCustomMessageText(v); setIsStudyWordOpen(false); setIsCommChannelDialogOpen(true); }}
      />
    </div>
  );
}

const SoulCard = React.memo(({ soul, onClick }: { 
  soul: Soul; 
  onClick: () => void;
}) => {
    return (
        <Card onClick={onClick} className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-b-2 sm:border-b shadow-none bg-card/50 backdrop-blur-sm transition-all duration-300 cursor-pointer hover:bg-primary/[0.02] text-left text-left">
            <div className="flex items-center justify-between p-4 gap-4 text-left text-left">
                <div className="flex items-center gap-3 min-w-0 flex-1 text-left text-left">
                    <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 text-left text-left")}>
                        <AvatarImage src={soul.photoURL || undefined} className="object-cover text-left text-left text-left" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-left text-left text-left">
                            {soul.firstName?.charAt(0) || 'S'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-left text-left">
                        <div className="flex items-center gap-2 flex-wrap text-left text-left text-left text-left">
                            <p className="font-bold truncate text-[13px] sm:text-base leading-tight capitalize tracking-tight text-left text-left text-left">
                              {soul.firstName || 'Unknown'} {soul.lastName || ''}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center mt-1.5 text-left text-left text-left text-left">
                            <Badge className={cn("h-5 px-1.5 text-[9px] uppercase font-black tracking-widest text-left text-left text-left", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                            {soul.fellowshipName && <Badge variant="secondary" className="h-5 px-1.5 text-[8px] uppercase font-black tracking-tighter bg-primary/5 text-primary border-primary/20 shrink-0 text-left text-left text-left text-left">Fellowship</Badge>}
                        </div>
                    </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-20 text-left text-left" />
            </div>
        </Card>
    );
});
SoulCard.displayName = "SoulCard";

const SoulTableRow = React.memo(({ soul, isSelected, onSelect }: { 
  soul: Soul; 
  isSelected: boolean;
  onSelect: () => void;
}) => {
    return (
        <TableRow 
            className={cn("border-b hover:bg-muted/30 transition-colors cursor-pointer text-left text-left", isSelected && "bg-primary/[0.03]")}
            onClick={() => onSelect()}
        >
            <TableCell className="font-medium p-4 text-left text-left text-left">
                <div className="flex items-center gap-4 text-left text-left text-left">
                    <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 text-left text-left")}>
                        <AvatarImage src={soul.photoURL || undefined} className="object-cover text-left text-left text-left" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-left text-left text-left">
                            {soul.firstName?.charAt(0) || 'S'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-left text-left text-left">
                        <div className="font-black text-xs sm:text-sm md:text-base truncate capitalize tracking-tight text-left text-left text-left">
                            {soul.firstName} {soul.lastName}
                        </div>
                        {soul.church && <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 font-medium truncate opacity-70 text-left text-left text-left text-left"><Church className="h-3 w-3 shrink-0 text-left text-left text-left text-left" />{soul.church}</div>}
                    </div>
                </div>
            </TableCell>
        </TableRow>
    );
});
SoulTableRow.displayName = "SoulTableRow";

export function SoulsWonTable({ souls, loading, selectedId, onSelect, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit, onDelete, onAssess }: {
  souls: Soul[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onFollowUp: (soul: Soul) => void;
  onViewHistory: (soul: Soul) => void;
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
  onOpenAssignDialog: (soul: Soul) => void;
  onEdit: (soul: Soul) => void;
  onDelete: (soul: Soul) => void;
  onAssess: (soul: Soul) => void;
}) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { 
    setMounted(true); 
  }, []);

  const selectedSoul = React.useMemo(() => 
    souls.find(s => s.id === selectedId) || null
  , [souls, selectedId]);

  if (loading || !mounted) {
    return (
        <div className="space-y-4 text-left text-left text-left">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border-b last:border-0 bg-card/50 backdrop-blur-sm rounded-xl text-left text-left text-left text-left">
                    <Skeleton className="h-12 w-12 rounded-full text-left text-left text-left" />
                    <div className="space-y-2 flex-1 text-left text-left text-left text-left"><Skeleton className="h-5 w-3/4 text-left text-left text-left" /><Skeleton className="h-4 w-1/2 text-left text-left text-left" /></div>
                    <Skeleton className="h-9 w-24 rounded-xl text-left text-left text-left" />
                </div>
            ))}
        </div>
    )
  }
  
  if (souls.length === 0) {
    return (
        <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm border-2 border-dashed text-left text-left">
            <CardContent className="text-left text-left text-left">
                <div className="text-center py-24 flex flex-col items-center text-left text-left text-left text-left">
                    <div className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-primary/20 text-left text-left text-left">
                        <HeartHandshake className="h-10 w-10 text-primary opacity-40 text-left text-left text-left" />
                    </div>
                    <h3 className="text-xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left">Your Harvest Field</h3>
                    <p className="text-sm text-muted-foreground italic font-medium max-w-[280px] leading-relaxed opacity-60 text-balance text-center text-left text-left text-left text-left">The souls you lead to Christ will appear here for collaborative discipleship and strategic follow-up.</p>
                </div>
            </CardContent>
        </Card>
    );
  }

  const profileView = selectedSoul && (
    <SoulProfileContent 
        soul={selectedSoul} 
        onFollowUp={onFollowUp} 
        onViewHistory={onViewHistory}
        onEdit={onEdit} 
        onAssess={onAssess} 
        onOpenAssignDialog={onOpenAssignDialog} 
        onExportSingle={onExportSingle} 
        onDelete={onDelete}
    />
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start text-left text-left text-left">
        <div className="flex-1 w-full text-left text-left text-left text-left text-left">
            {isMobile ? (
                <div className="space-y-px text-left text-left text-left text-left">
                    {souls.map((soul) => (
                        <SoulCard key={soul.id} soul={soul} onClick={() => onSelect(soul.id)} />
                    ))}
                </div>
            ) : (
                <Card className="rounded-none sm:rounded-[2rem] border-x-0 sm:border-x shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden text-left text-left text-left text-left">
                    <CardHeader className="p-8 border-b bg-muted/5 text-left text-left text-left text-left">
                        <CardTitle className="text-2xl font-black font-headline tracking-tight flex items-center gap-3 uppercase text-left text-left text-left text-left text-left">
                            <Heart className="h-6 w-6 text-primary fill-current text-left text-left text-left text-left" />
                            Harvest Dashboard
                        </CardTitle>
                        <CardDescription className="text-base font-medium text-left text-left text-left text-left text-left">Keep track of spiritual development and community integration.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 text-left text-left text-left text-left text-left text-left">
                        <div className="overflow-x-auto text-left text-left text-left text-left text-left text-left">
                            <Table className="text-left text-left text-left text-left text-left text-left">
                                <TableHeader className="bg-muted/10 text-left text-left text-left text-left text-left text-left">
                                    <TableRow className="hover:bg-transparent text-left text-left text-left text-left text-left text-left">
                                        <TableHead className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left text-left text-left text-left text-left text-left">Soul Identity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="text-left text-left text-left text-left text-left text-left">
                                    {souls.map((soul) => (
                                    <SoulTableRow 
                                        key={soul.id} 
                                        soul={soul} 
                                        isSelected={selectedId === soul.id}
                                        onSelect={() => onSelect(soul.id)}
                                    />
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>

        {/* Tablet/Mobile Pop-up */}
        <Sheet open={!!selectedId && !!selectedSoul && (isMobile || (typeof window !== 'undefined' && window.innerWidth < 1024))} onOpenChange={(open) => !open && onSelect(null)}>
            <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left text-left text-left text-left">
                    <SheetHeader className="text-left flex-shrink-0 text-left text-left text-left text-left text-left text-left text-left text-left">
                        <div className="flex items-center gap-2 mb-2 text-left text-left text-left text-left text-left text-left text-left">
                            <Sparkles className="h-4 w-4 text-primary text-left text-left text-left text-left text-left text-left text-left" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left text-left text-left text-left text-left text-left">Identity Hub</span>
                        </div>
                        <SheetTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left text-left text-left text-left text-left">
                            {selectedSoul?.firstName} {selectedSoul?.lastName}
                        </SheetTitle>
                        <SheetDescription className="text-sm font-medium mt-1 text-left text-left text-left text-left text-left text-left text-left text-left">Full spiritual snapshot for the harvest workforce.</SheetDescription>
                    </SheetHeader>
                </div>
                <ScrollArea className="flex-grow min-h-0 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                    <div className="p-6 pb-24 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                        {profileView}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>

        {/* Desktop Detailed Preview Panel (Large screens only) */}
        <div className="hidden lg:block w-[320px] shrink-0 sticky top-24 text-left text-left text-left text-left text-left text-left">
            <AnimatePresence mode="wait">
                {selectedSoul ? (
                    <motion.div
                        key={selectedId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6 text-left text-left text-left text-left text-left text-left"
                    >
                        {profileView}
                    </motion.div>
                ) : (
                    <div className="text-center py-20 px-8 border-2 border-dashed rounded-[2rem] bg-muted/5 text-left text-left text-left text-left text-left text-left">
                        <Users className="h-10 w-10 text-muted-foreground opacity-10 mx-auto mb-4 text-left text-left text-left text-left text-left text-left" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center text-balance text-left text-left text-left text-left text-left text-left">Select a record to preview identity</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    </div>
  );
}
