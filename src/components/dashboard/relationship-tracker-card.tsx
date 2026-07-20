'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { doc, serverTimestamp, writeBatch, arrayUnion, query, collection, orderBy, addDoc, getDoc, updateDoc, where, getDocs, setDoc } from 'firebase/firestore';
import type { UserProfile, Soul, BibleHighlight } from '@/lib/types';
import { isToday, format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { 
  Heart, 
  MessageSquare, 
  Flame, 
  Users, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  Info, 
  BookOpen,
  Home,
  Phone,
  Calendar,
  Utensils,
  Gift,
  UserPlus,
  Search,
  PlusCircle,
  Hourglass,
  ArrowRight,
  ArrowLeft,
  Send,
  X,
  HeartHandshake,
  HandHeart,
  Globe,
  BookMarked,
  Share,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Clipboard,
  Target
} from 'lucide-react';
import { cn, safeToDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { actionItems, prayerTemplates, kingdomVerses } from '@/lib/follow-up-data';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { bibleData } from '@/lib/bible-data';
import { getBibleChapter, type BibleChapterOutput } from '@/ai/flows/get-bible-chapter-flow';

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

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

function SoulSelectionList({ 
    souls, 
    onSelect, 
    isLoading 
}: { 
    souls: Soul[] | null; 
    onSelect: (soul: Soul) => void;
    isLoading: boolean;
}) {
    const [search, setSearch] = useState('');
    const filteredSouls = useMemo(() => {
        if (!souls) return [];
        if (!search) return souls;
        const term = search.toLowerCase();
        return souls.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(term));
    }, [souls, search]);

    return (
        <div className="space-y-6 text-left">
            <div className="relative text-left">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                <Input 
                    placeholder="Search by name..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)}
                    className="rounded-2xl h-12 pl-10 bg-muted/20 border-none shadow-inner text-base text-left"
                />
            </div>
            <ScrollArea className="h-[40vh] border rounded-3xl bg-muted/5 text-left">
                <div className="p-2 space-y-1.5 text-left">
                    {filteredSouls.length > 0 ? (
                        filteredSouls.map(soul => (
                            <Button 
                                key={soul.id} 
                                variant="ghost" 
                                className="w-full justify-start h-16 px-4 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all gap-4 group text-left"
                                onClick={() => onSelect(soul)}
                                disabled={isLoading}
                            >
                                <Avatar className="h-10 w-10 border-2 group-hover:border-primary/20 transition-colors shadow-sm">
                                    <AvatarFallback className="font-bold bg-primary/5">{soul.firstName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="text-left min-w-0 flex-1">
                                    <p className="font-black text-sm uppercase tracking-tight text-left">{soul.firstName} {soul.lastName}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60 text-left">{soul.status}</p>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-muted/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <PlusCircle className="h-4 w-4" />
                                </div>
                            </Button>
                        ))
                    ) : (
                        <div className="text-center py-16 px-8 space-y-3">
                            <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto">
                                <Users className="h-6 w-6 text-muted-foreground opacity-20" />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60 text-balance text-center">
                                {search ? "No matches found" : "Log your first soul to begin tracking"}
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

function ScriptureSelectionDialog({
    isOpen,
    onOpenChange,
    highlights,
    onSelect,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    highlights: BibleHighlight[] | null;
    onSelect: (scripture: { reference: string; text: string }) => void;
}) {
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('quick');
    const [selectedBook, setSelectedBook] = useState<string | null>(null);
    const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
    const [chapterContent, setChapterContent] = useState<BibleChapterOutput | null>(null);
    const [isLoadingChapter, setIsLoadingChapter] = useState(false);
    const [selectedVerseNumbers, setSelectedVerseNumbers] = useState<number[]>([]);
    const [bookSearch, setBookSearch] = useState('');
    
    const isMobile = useIsMobile();

    useEffect(() => {
        if (!isOpen) {
            setSearch('');
            setActiveTab('quick');
            setSelectedBook(null);
            setSelectedChapter(null);
            setChapterContent(null);
            setSelectedVerseNumbers([]);
            setBookSearch('');
        }
    }, [isOpen]);
    
    const filteredHighlights = useMemo(() => {
        if (!highlights) return [];
        return highlights.filter(h => {
            const ref = `${h.book} ${h.chapter}`;
            return ref.toLowerCase().includes(search.toLowerCase()) || (h.note && h.note.toLowerCase().includes(search.toLowerCase()));
        });
    }, [highlights, search]);

    const filteredEssentials = useMemo(() => {
        if (!search) return kingdomVerses;
        return kingdomVerses.filter(v => 
            v.reference.toLowerCase().includes(search.toLowerCase()) || 
            v.text.toLowerCase().includes(search.toLowerCase())
        );
    }, [search]);

    const filteredBooks = useMemo(() => {
        if (!bookSearch) return bibleData;
        return bibleData.filter(b => b.name.toLowerCase().includes(bookSearch.toLowerCase()));
    }, [bookSearch]);

    const handleChapterSelect = async (book: string, chapterNum: number) => {
        setSelectedChapter(chapterNum);
        setIsLoadingChapter(true);
        try {
            const content = await getBibleChapter({ book, chapter: chapterNum });
            setChapterContent(content);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingChapter(false);
        }
    };

    const handleToggleVerse = (v: number) => {
        setSelectedVerseNumbers(prev => 
            prev.includes(v) ? prev.filter(n => n !== v) : [...prev, v]
        );
    };

    const handleSharePassage = () => {
        if (!chapterContent || selectedVerseNumbers.length === 0) return;
        const selected = chapterContent.verses
            .filter(v => selectedVerseNumbers.includes(v.verse))
            .sort((a, b) => a.verse - b.verse);
        
        const text = selected.map(v => v.text).join(' ');
        const sorted = [...selectedVerseNumbers].sort((a, b) => a - b);
        let ref = `${selectedBook} ${selectedChapter}:`;
        if (sorted.length === 1) ref += sorted[0];
        else {
            const isContiguous = sorted.every((n, i) => i === 0 || n === sorted[i-1] + 1);
            if (isContiguous) ref += `${sorted[0]}-${sorted[sorted.length-1]}`;
            else ref += sorted.join(', ');
        }
        onSelect({ reference: ref, text });
    };

    const title = "Select Word";
    const desc = "Choose a scripture to share. Full quotes are automatically included.";

    const quickWordsContent = (
        <div className="p-4 sm:p-6 space-y-6 text-left">
            <div className="relative text-left">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                <Input 
                    placeholder="Search book or journal..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)}
                    className="rounded-2xl h-12 pl-10 bg-muted/20 border-none shadow-inner text-base text-left"
                />
            </div>
            <ScrollArea className={cn("border rounded-3xl bg-muted/5 text-left", isMobile ? "h-[50vh]" : "h-[45vh]")}>
                <div className="p-4 space-y-8 text-left">
                    {filteredHighlights.length > 0 && (
                        <div className="space-y-3 text-left">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-2 text-left">Your Journal Highlights</Label>
                            <div className="space-y-1.5 text-left">
                                {filteredHighlights.map(h => {
                                    const ref = `${h.book} ${h.chapter}`;
                                    return (
                                        <Button 
                                            key={h.id} 
                                            variant="ghost" 
                                            className="w-full justify-start h-auto py-3.5 px-4 rounded-2xl hover:bg-primary/5 text-left border border-transparent hover:border-primary/20 transition-all group"
                                            onClick={() => h.note && onSelect({ reference: ref, text: h.note })}
                                            disabled={!h.note}
                                        >
                                            <div className="min-w-0 text-left">
                                                <div className="flex items-center gap-2 mb-0.5 text-left">
                                                    <BookMarked className="h-3 w-3 text-primary/40 group-hover:text-primary transition-colors" />
                                                    <p className="font-black text-sm uppercase tracking-tight text-left">{ref}</p>
                                                </div>
                                                {h.note && <p className="text-xs text-muted-foreground line-clamp-1 italic font-medium opacity-60 text-left">{h.note}</p>}
                                            </div>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-2 text-left">Kingdom Essentials</Label>
                        <div className="space-y-1.5 text-left">
                            {filteredEssentials.map((v, idx) => (
                                <Button 
                                    key={idx} 
                                    variant="ghost" 
                                    className="w-full justify-start h-auto py-3.5 px-4 rounded-2xl hover:bg-primary/5 text-left border border-transparent hover:border-primary/20 transition-all group"
                                    onClick={() => onSelect({ reference: v.reference, text: v.text })}
                                >
                                    <div className="min-w-0 text-left">
                                        <div className="flex items-center gap-2 mb-0.5 text-left">
                                            <Sparkles className="h-3 w-3 text-primary/40 group-hover:text-primary transition-colors" />
                                            <p className="font-black text-sm uppercase tracking-tight text-left">{v.reference}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-1 italic font-medium opacity-60 text-left">{v.text}</p>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );

    const browseBibleContent = (
        <div className="p-4 sm:p-6 space-y-4 text-left">
            {!selectedBook ? (
                <div className="space-y-4 text-left">
                    <div className="relative text-left">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                        <Input 
                            placeholder="Search Bible books..." 
                            value={bookSearch} 
                            onChange={e => setBookSearch(e.target.value)}
                            className="rounded-2xl h-11 pl-10 bg-muted/20 border-none shadow-inner text-sm text-left"
                        />
                    </div>
                    <ScrollArea className={cn("border rounded-3xl bg-muted/5 text-left", isMobile ? "h-[50vh]" : "h-[45vh]")}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 text-left">
                            {filteredBooks.map(b => (
                                <Button 
                                    key={b.name} 
                                    variant="ghost" 
                                    className="h-10 text-xs font-bold uppercase tracking-tight rounded-xl bg-background shadow-sm hover:bg-primary/5 hover:text-primary transition-all text-center"
                                    onClick={() => setSelectedBook(b.name)}
                                >
                                    {b.name}
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            ) : !selectedChapter ? (
                <div className="space-y-4 text-left">
                    <div className="flex items-center gap-3 text-left">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedBook(null)} className="rounded-full h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <p className="font-black text-sm uppercase tracking-widest text-primary text-left">{selectedBook}</p>
                    </div>
                    <ScrollArea className={cn("border rounded-3xl bg-muted/5 text-left", isMobile ? "h-[50vh]" : "h-[45vh]")}>
                        <div className="grid grid-cols-5 gap-2 p-4 text-center">
                            {bibleData.find(b => b.name === selectedBook)?.chapters.map(c => (
                                <Button 
                                    key={c.chapter} 
                                    variant="ghost" 
                                    className="h-10 w-10 text-xs font-black rounded-lg bg-background shadow-sm hover:bg-primary/5 hover:text-primary transition-all p-0 text-center"
                                    onClick={() => handleChapterSelect(selectedBook, c.chapter)}
                                >
                                    {c.chapter}
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            ) : (
                <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between text-left">
                        <div className="flex items-center gap-3 text-left">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedChapter(null); setChapterContent(null); setSelectedVerseNumbers([]); }} className="rounded-full h-8 w-8">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <p className="font-black text-sm uppercase tracking-widest text-primary text-left">{selectedBook} {selectedChapter}</p>
                        </div>
                        {selectedVerseNumbers.length > 0 && (
                            <Button size="sm" onClick={handleSharePassage} className="rounded-full h-8 px-4 font-black uppercase text-[10px] tracking-widest shadow-lg">
                                SHARE ({selectedVerseNumbers.length})
                            </Button>
                        )}
                    </div>
                    <ScrollArea className={cn("border rounded-3xl bg-muted/5 text-left", isMobile ? "h-[50vh]" : "h-[45vh]")}>
                        <div className="p-4 space-y-4 text-left">
                            {isLoadingChapter ? (
                                <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary opacity-20" /></div>
                            ) : chapterContent?.verses.map(v => (
                                <div 
                                    key={v.verse} 
                                    className={cn(
                                        "flex gap-3 p-3 rounded-2xl transition-all cursor-pointer group text-left",
                                        selectedVerseNumbers.includes(v.verse) ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/30"
                                    )}
                                    onClick={() => handleToggleVerse(v.verse)}
                                >
                                    <div className={cn(
                                        "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                                        selectedVerseNumbers.includes(v.verse) ? "bg-primary border-primary" : "border-muted-foreground/30"
                                    )}>
                                        {selectedVerseNumbers.includes(v.verse) && <CheckCircle2 className="h-3 w-3 text-white" />}
                                    </div>
                                    <div className="space-y-1 text-left">
                                        <span className="text-[10px] font-black text-primary/40 uppercase tracking-tighter text-left">Verse {v.verse}</span>
                                        <p className="text-sm leading-relaxed text-muted-foreground font-medium text-left">{v.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    );

    const dialogInner = (
        <div className="flex flex-col h-full text-left">
            <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                <SheetHeader className="text-left flex-shrink-0 text-left text-left">
                    <div className="flex items-center gap-3 mb-2 text-left">
                        <BookOpen className="h-5 w-5 text-primary text-left" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left">Kingdom Word</span>
                    </div>
                    <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">{title}</SheetTitle>
                    <SheetDescription className="text-sm font-medium mt-1 text-left">{desc}</SheetDescription>
                </SheetHeader>
            </div>
            
            <div className="flex-grow min-h-0 flex flex-col text-left">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col min-h-0 text-left">
                    <div className="px-6 sm:p-8 pb-0 text-left">
                        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/30 p-1 rounded-2xl mb-2 text-left">
                            <TabsTrigger value="quick" className="font-black text-[10px] uppercase tracking-widest rounded-xl">Quick Words</TabsTrigger>
                            <TabsTrigger value="browse" className="font-black text-[10px] uppercase tracking-widest rounded-xl">Browse Bible</TabsTrigger>
                        </TabsList>
                    </div>
                    <div className="flex-grow min-h-0 overflow-hidden text-left">
                        <TabsContent value="quick" className="h-full mt-0 outline-none text-left">
                            {quickWordsContent}
                        </TabsContent>
                        <TabsContent value="browse" className="h-full mt-0 outline-none text-left">
                            {browseBibleContent}
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            <div className="p-6 border-t bg-muted/5 flex justify-end gap-3 shrink-0 text-left">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full px-8 font-bold text-left">Close Hub</Button>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={onOpenChange}>
                <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    {dialogInner}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl h-[85vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left">
                {dialogInner}
            </DialogContent>
        </Dialog>
    );
}

export function RelationshipTrackerCard() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const { userProfile, loading: profileLoading } = useUserProfile();

  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [pendingActions, setPendingActions] = useState<string[]>([]);
  const [togglingId, setTogglingId] = setTogglingId(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [activeSoul, setActiveSoul] = useState<Soul | null>(null);
  const [isSoulDialogOpen, setIsSoulDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  const [isCommChannelDialogOpen, setIsCommChannelDialogOpen] = useState(false);
  const [isHelpNeedDialogOpen, setIsHelpNeedDialogOpen] = useState(false);
  const [isShareTargetDialogOpen, setIsShareTargetDialogOpen] = useState(false);
  const [isPartnerSelectionDialogOpen, setIsPartnerSelectionDialogOpen] = useState(false);
  const [isPrayerCustomizationOpen, setIsPrayerCustomizationOpen] = useState(false);
  const [isScriptureSelectionOpen, setIsScriptureSelectionOpen] = useState(false);
  const [customPrayerText, setCustomPrayerText] = React.useState('');
  const [clickedActionId, setClickedActionId] = React.useState<string | null>(null);
  
  const highlightsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'bibleHighlights'), orderBy('createdAt', 'desc'));
  }, [user?.uid, firestore]);
  const { data: highlights } = useCollection<BibleHighlight>(highlightsQuery);

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`), orderBy("wonAt", "desc"));
  }, [user?.uid, firestore]);
  const { data: souls, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

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

  const checkPending = useCallback(() => {
    if (typeof window === 'undefined' || !user?.uid) {
        setPendingActions([]);
        return;
    }
    const key = `testify_pending_provisions_${user.uid}`;
    const stored = localStorage.getItem(key);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                setPendingActions(parsed.map((p: any) => p.actionId));
            }
        } catch (e) {
            setPendingActions([]);
        }
    } else {
        setPendingActions([]);
    }
  }, [user?.uid]);

  useEffect(() => {
    setCurrentDate(new Date());
    checkPending();
    window.addEventListener('testify_pending_action_update', checkPending);
    window.addEventListener('storage', checkPending);
    return () => {
        window.removeEventListener('testify_pending_action_update', checkPending);
        window.removeEventListener('storage', checkPending);
    };
  }, [checkPending]);

  useEffect(() => {
    if (userProfile?.dailyDiscipline) {
      const lastUpdatedDate = safeToDate(userProfile.dailyDiscipline.lastUpdated);
      if (lastUpdatedDate && isToday(lastUpdatedDate)) {
        setCompletedToday(userProfile.dailyDiscipline.completed || []);
      } else {
        setCompletedToday([]);
      }
    }
  }, [userProfile]);

  const handleActionClick = (id: string) => {
      setSelectedActionId(id);
      setIsSoulDialogOpen(true);
  };

  const performFinalLog = async (soul: Soul, actionId: string, notePrefix = '') => {
    if (!user || !firestore) return;
    
    setTogglingId(actionId);
    const action = actionItems.find(a => a.id === actionId);
    if (!action) return;

    const today = new Date();
    const dateString = format(today, 'yyyy-MM-dd');
    const batch = writeBatch(firestore);

    const isProvisionAction = actionId === 'shared_meal' || actionId === 'gave_gift';

    if (!isProvisionAction) {
        const wasCompleted = completedToday.includes(actionId);
        const newCompleted = wasCompleted ? completedToday : [...completedToday, actionId];

        const userRef = doc(firestore, 'users', user.uid);
        batch.update(userRef, {
            'dailyDiscipline.completed': newCompleted,
            'dailyDiscipline.lastUpdated': serverTimestamp(),
        });

        const historyRef = doc(firestore, 'users', user.uid, 'disciplineHistory', dateString);
        batch.set(historyRef, {
            completed: newCompleted,
            date: serverTimestamp()
        }, { merge: true });
        
        setCompletedToday(newCompleted);
    }

    const memberName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || user.displayName || 'Member';
    const logNote = notePrefix ? `${notePrefix} (${action.label})` : `Logged via Kingdom Connections: ${action.label}`;
    const logEntry = {
        date: new Date(), 
        note: isProvisionAction 
            ? `Initiated ${action.label} via Kingdom Connections` 
            : logNote,
        actions: [actionId],
        memberId: user.uid,
        memberName: memberName,
    };

    const soulUserRef = doc(firestore, `users/${user.uid}/souls`, soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);
    
    const updateData: any = {
        followUpLog: arrayUnion(logEntry),
        status: soul.status === 'New' ? 'Contacted' : soul.status,
        lastUpdatedAt: serverTimestamp(),
    };

    batch.update(soulUserRef, updateData);
    batch.update(globalSoulRef, updateData);

    try {
        await batch.commit();

        if (isProvisionAction) {
            if (typeof window !== 'undefined') {
                const key = `testify_pending_provisions_${user.uid}`;
                const stored = localStorage.getItem(key);
                let provisions = [];
                try {
                    provisions = stored ? JSON.parse(stored) : [];
                } catch (e) { provisions = []; }

                if (!provisions.some((p: any) => p.soulId === soul.id && p.actionId === actionId)) {
                    provisions.push({
                        soulId: soul.id,
                        soulName: soul.firstName,
                        actionId: actionId,
                        timestamp: Date.now()
                    });
                }
                localStorage.setItem(key, JSON.stringify(provisions));
                window.dispatchEvent(new Event('testify_pending_action_update'));
            }
            const path = actionId === 'shared_meal' ? '/dashboard/marketplace' : '/dashboard/marketplace/gifts';
            router.push(`${path}?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}&actionId=${actionId}`);
        } else if (actionId !== 'introduced_friend') {
            toast({ title: 'Kingdom Impact Saved!', description: `Logged '${action.label}' for ${soul.firstName}.` });
        }
    } catch (err: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `BATCH_WRITE:RELATION_TRACKER:${soul.id}`,
            operation: 'write',
        }, user));
    } finally {
        setTogglingId(null);
    }
  };

  const handleSoulSelected = (soul: Soul) => {
    if (!selectedActionId) return;
    
    setActiveSoul(soul);
    setIsSoulDialogOpen(false);

    if (selectedActionId === 'prayed_together') {
        if (!soul.phone) {
            toast({ variant: 'destructive', title: 'Phone Missing', description: `Please save a number for ${soul.firstName} first.` });
            return;
        }
        setCustomPrayerText(resolveTemplate(prayerTemplates[0].text, soul));
        setIsPrayerCustomizationOpen(true);
    } else if (selectedActionId === 'studied_bible') {
        setIsScriptureSelectionOpen(true);
    } else if (selectedActionId === 'text_message') {
        if (!soul.phone) {
            toast({ variant: 'destructive', title: 'Phone Missing', description: `Please save a number for ${soul.firstName} first.` });
            return;
        }
        setClickedActionId(selectedActionId);
        setIsCommChannelDialogOpen(true);
    } else if (selectedActionId === 'introduced_friend') {
        setIsShareTargetDialogOpen(true);
    } else {
        performFinalLog(soul, selectedActionId);
    }
  };

  const handleScriptureSelected = (scripture: { reference: string; text: string }) => {
      if (!activeSoul?.phone) {
          toast({ variant: 'destructive', title: 'Phone Missing', description: 'Cannot share scripture without a phone number.' });
          return;
      }
      setIsScriptureSelectionOpen(false);
      setClickedActionId('studied_bible');
      
      const text = `Hi ${activeSoul.firstName}, I was thinking of this word for you:\n\n"${scripture.text}" — ${scripture.reference}\n\nRead more miracles on Testify: https://testifyglobal.com`;
      setCustomPrayerText(text);
      requestAnimationFrame(() => {
          setIsCommChannelDialogOpen(true);
      });
  };

  const handlePrayerConfirm = (text: string) => {
    const finalText = `${text}\n\nRead more miracles on Testify: https://testifyglobal.com`;
    setCustomPrayerText(finalText);
    setIsPrayerCustomizationOpen(false);
    setClickedActionId('prayed_together');
    requestAnimationFrame(() => {
        setIsCommChannelDialogOpen(true);
    });
  };

  const handleCommChoice = (channel: 'whatsapp' | 'sms') => {
    if (!activeSoul?.phone || !selectedActionId) return;
    const cleanPhone = activeSoul.phone.replace(/\+/g, '').replace(/\D/g, '');
    
    let message = customPrayerText || `Hi ${activeSoul.firstName}, I'm thinking of you today and praying for you. God bless you!\n\nJoin the movement: https://testifyglobal.com`;
    const messageText = encodeURIComponent(message);
    
    if (channel === 'whatsapp') {
        window.open(`https://wa.me/${cleanPhone}?text=${messageText}`, '_blank');
    } else {
        window.location.href = `sms:${activeSoul.phone}?body=${messageText}`;
    }
    
    const notePrefix = selectedActionId === 'prayed_together' ? `Prayed: ${message}` : selectedActionId === 'studied_bible' ? `Shared Word: ${message}` : `Messaged: ${message}`;
    performFinalLog(activeSoul, selectedActionId, notePrefix);
    setIsCommChannelDialogOpen(false);
    setCustomPrayerText('');
  };

  const handleShareToWhatsApp = () => {
    if (!activeSoul) return;
    const wonAt = safeToDate(activeSoul.wonAt);
    const details = `Here is a soul I'm following up with on Testify:\nName: ${activeSoul.firstName} ${activeSoul.lastName}\nStatus: ${activeSoul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\n\nJoin the Great Commission: https://testifyglobal.com`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(details)}`, '_blank');

    performFinalLog(activeSoul, 'introduced_friend', `Shared details via WhatsApp`);
    setIsShareTargetDialogOpen(false);
  };

  const handleShareToPartner = async (partner: UserProfile['accountabilityPartners'][0]) => {
      if (!user || !firestore || !activeSoul || !userProfile) return;

      const wonAt = safeToDate(activeSoul.wonAt);
      const text = `SHARING SOUL DATA:\nName: ${activeSoul.firstName} ${activeSoul.lastName}\nStatus: ${activeSoul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\nRelationship: ${activeSoul.relationship || 'Outreach'}\n\nLet's coordinate follow-up on Testify: https://testifyglobal.com`;

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
                      [user.uid]: { firstName: userProfile.firstName, lastName: userProfile.lastName, photoURL: userProfile.photoURL || '' },
                      [partner.userId]: { firstName: partner.firstName, lastName: partner.lastName, photoURL: partner.photoURL || '' }
                  },
                  lastUpdatedAt: serverTimestamp(),
                  isGroupChat: false,
                  hasMessages: true
              };
              const ref = await addDoc(chatsRef, newChat);
              chatId = ref.id;
          }

          await addDoc(collection(firestore, 'chats', chatId, 'messages'), {
              senderId: user.uid,
              text,
              createdAt: serverTimestamp()
          });

          await updateDoc(doc(firestore, 'chats', chatId), { lastUpdatedAt: serverTimestamp(), hasMessages: true });
          
          toast({ title: 'Shared with Partner!', description: `Details sent to ${partner.firstName}.` });
          
          await performFinalLog(activeSoul, 'introduced_friend', `Introduced to partner: ${partner.firstName}`);
          
          setIsPartnerSelectionDialogOpen(false);
          setIsShareTargetDialogOpen(false);
          router.push(`/dashboard/chats/${chatId}`);
      } catch (e) {
          console.error("Share failed:", e);
          toast({ variant: 'destructive', title: 'Share Failed' });
      }
  };

  const activeActionLabel = useMemo(() => 
    actionItems.find(a => a.id === selectedActionId)?.label || "Connect with", 
  [selectedActionId]);

  if (userLoading || profileLoading || soulsLoading) {
    return (
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b text-left">
        <CardHeader className="p-4 sm:p-6 text-left">
          <Skeleton className="h-5 w-32 mb-2 text-left" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 px-4 sm:px-6 pb-6 text-left">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl text-left" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const uniquePartners = Array.from(new Map((userProfile?.accountabilityPartners || []).map(p => [p.userId, p])).values());

  return (
    <>
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b overflow-hidden relative group/card text-left">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover/card:opacity-[0.05] transition-opacity">
          <Users className="h-32 w-32 text-primary rotate-12" />
        </div>

        <CardHeader className="p-4 sm:p-6 pb-4 relative z-10 text-left">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between text-left">
              <div className="space-y-1 text-left">
                  <CardTitle className="text-base sm:text-lg font-black font-headline uppercase tracking-tight flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Kingdom Connections
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60">Daily Relational Efforts</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0 text-left">
                {currentDate && (
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 text-left">
                    {format(currentDate, 'PPPP')}
                  </div>
                )}
              </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-2 relative z-10 text-left">
          <LayoutGroup>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 text-left">
                {actionItems.map(action => {
                    const isPending = pendingActions.includes(action.id);
                    const isCompleted = completedToday.includes(action.id);
                    const Icon = iconMap[action.id] || Heart;
                    const isToggling = togglingId === action.id;
                    
                    const buttonEl = (
                        <motion.div layout whileTap={{ scale: 0.95 }} whileHover={isMobile ? {} : { y: -2 }} className="w-full h-24 text-left">
                            <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                    "relative flex flex-col items-center justify-center gap-2 p-3 h-24 w-full text-center transition-all duration-300 rounded-3xl border-2 overflow-hidden",
                                    isCompleted 
                                        ? "bg-primary/5 border-primary/40 shadow-inner ring-1 ring-primary/10" 
                                        : isPending 
                                          ? "bg-amber-500/[0.05] border-amber-500/40 border-dashed"
                                          : "bg-background/40 hover:bg-muted/50 hover:border-primary/20"
                                )}
                                onClick={() => handleActionClick(action.id)}
                                disabled={isToggling}
                            >
                                <AnimatePresence mode="wait">
                                    {isCompleted && !isToggling && (
                                        <motion.div 
                                            key="completed-icon"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            className="absolute top-2 right-2 bg-primary rounded-full p-0.5 shadow-lg z-20 text-left"
                                        >
                                            <CheckCircle2 className="h-3 w-3 text-primary-foreground fill-current" />
                                        </motion.div>
                                    )}
                                    {isPending && !isCompleted && !isToggling && (
                                        <motion.div 
                                            key="pending-icon"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="absolute top-2 right-2 bg-amber-500 rounded-full p-0.5 shadow-lg z-20 text-left"
                                        >
                                            <Hourglass className="h-3 w-3 text-white" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className={cn(
                                    "h-8 w-8 rounded-2xl flex items-center justify-center transition-all duration-500 relative shrink-0",
                                    isCompleted ? "bg-primary/20 scale-110 shadow-lg" : isPending ? "bg-amber-500/20" : "bg-muted/30"
                                )}>
                                    {isToggling ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    ) : (
                                        <Icon className={cn("h-4 w-4 transition-all text-left", isCompleted ? "text-primary fill-current" : "text-primary/60")} />
                                    )}
                                </div>
                                
                                <div className="space-y-0.5 min-w-0 w-full text-center px-1 text-left">
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-tight block truncate",
                                        isCompleted ? "text-primary" : "text-foreground"
                                    )}>
                                        {action.label}
                                    </span>
                                    <div className="h-2.5 flex items-center justify-center text-left">
                                        {isPending && !isCompleted && !isToggling && (
                                            <span className="text-[8px] font-black uppercase text-amber-600/60 leading-none text-left">Pending Hub</span>
                                        )}
                                    </div>
                                </div>
                            </Button>
                        </motion.div>
                    );

                    if (isMobile) return <div key={action.id} className="text-left">{buttonEl}</div>;

                    return (
                        <TooltipProvider key={action.id}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    {buttonEl}
                                </TooltipTrigger>
                                <TooltipContent className="rounded-xl border-primary/20 shadow-xl text-left" side="bottom">
                                    <p className="text-[10px] font-bold uppercase text-primary text-left">Kingdom Action</p>
                                    <p className="text-xs font-medium max-w-[150px] leading-relaxed italic text-left">{action.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                })}
            </div>
          </LayoutGroup>
        </CardContent>
        <CardFooter className="px-4 sm:px-6 pb-6 pt-4 flex flex-col gap-4 border-t mt-4 bg-muted/5 text-left">
              <Button asChild variant="default" className="w-full font-black h-12 rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase text-xs sm:text-sm text-left">
                  <Link href="/dashboard/souls-won">
                      <UserPlus className="mr-2 h-4 w-4" />
                      MANAGE SOULS WON
                  </Link>
              </Button>
              <p className="text-[8px] text-center text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-40 text-left">
                  Unity • Growth • Love • Support
              </p>
        </CardFooter>
      </Card>

      {isMobile ? (
        <Sheet open={isSoulDialogOpen} onOpenChange={setIsSoulDialogOpen}>
            <SheetContent side="bottom" className="h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                    <SheetHeader className="text-left text-left">
                        <SheetTitle className="text-2xl font-black font-headline tracking-tight uppercase text-left">Who did you {activeActionLabel.toLowerCase()}?</SheetTitle>
                        <SheetDescription className="text-sm font-medium text-left">Select a convert to link this action to their record.</SheetDescription>
                    </SheetHeader>
                </div>
                <div className="flex-grow min-h-0 p-8 text-left">
                    <SoulSelectionList 
                        souls={souls} 
                        onSelect={handleSoulSelected} 
                        isLoading={togglingId !== null} 
                    />
                </div>
            </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isSoulDialogOpen} onOpenChange={setIsSoulDialogOpen}>
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
                <div className="p-8 border-b bg-muted/10 text-left">
                    <div className="p-0 text-left text-left">
                        <DialogHeader className="text-left text-left text-left text-left">
                            <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-left text-left">Who did you {activeActionLabel.toLowerCase()}?</DialogTitle>
                            <DialogDescription className="text-sm font-medium text-left text-left">Select a convert to link this action to their record.</DialogDescription>
                        </DialogHeader>
                    </div>
                </div>
                <div className="p-6 text-left text-left text-left">
                    <SoulSelectionList 
                        souls={souls} 
                        onSelect={handleSoulSelected} 
                        isLoading={togglingId !== null} 
                    />
                </div>
            </DialogContent>
        </Dialog>
      )}

      {/* Scripture Selection Dialog */}
      <ScriptureSelectionDialog 
          isOpen={isScriptureSelectionOpen}
          onOpenChange={setIsScriptureSelectionOpen}
          highlights={highlights}
          onSelect={handleScriptureSelected}
      />

      {/* Shared Prayer Customization Dialog */}
      <Dialog open={isPrayerCustomizationOpen} onOpenChange={setIsPrayerCustomizationOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl text-left">
            <div className="p-8 border-b bg-muted/10 text-left">
                <DialogHeader className="text-left text-left text-left">
                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Kingdom Intercession</DialogTitle>
                    <DialogDescription className="text-sm font-medium text-left text-left">Draft a powerful prayer for {activeSoul?.firstName}.</DialogDescription>
                </DialogHeader>
            </div>
            <div className="p-8 space-y-6 text-left">
                <div className="space-y-3 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Select Prayer Focus</label>
                    <div className="flex flex-wrap gap-2 text-left">
                        {prayerTemplates.map(t => (
                            <Button 
                                key={t.id} 
                                variant="outline" 
                                size="sm" 
                                className="rounded-full h-8 px-4 text-[9px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 hover:text-primary text-left"
                                onClick={() => activeSoul && setCustomPrayerText(resolveTemplate(t.text, activeSoul))}
                            >
                                {t.label}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2 text-left text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left">Customize Your Prayer</Label>
                    <Textarea 
                        value={customPrayerText}
                        onChange={e => setCustomPrayerText(e.target.value)}
                        className="min-h-[200px] rounded-2xl bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6 text-left"
                    />
                </div>

                <Button 
                    onClick={() => handlePrayerConfirm(customPrayerText)} 
                    disabled={!customPrayerText.trim()} 
                    className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-left"
                >
                    CONTINUE TO CHANNEL
                </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Shared Communication Channel Dialog */}
      <Dialog open={isCommChannelDialogOpen} onOpenChange={setIsCommChannelDialogOpen}>
        <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center">
            <DialogHeader className="text-center space-y-2">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-center">
                    <MessageSquare className="h-7 w-7 text-primary text-center" />
                </div>
              <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center">Message Hub</DialogTitle>
              <DialogDescription className="text-sm font-medium text-center">How would you like to encourage {activeSoul?.firstName}?</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-6 text-center">
              <Button onClick={() => handleCommChoice('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20">
                <WhatsAppIcon className="h-5 w-5" /> WhatsApp
              </Button>
              <Button onClick={() => handleCommChoice('sms')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5">
                <MessageSquare className="h-5 w-5" /> Standard SMS
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareTargetDialogOpen} onOpenChange={setIsShareTargetDialogOpen}>
        <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center">
          <DialogHeader className="text-center space-y-2">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-center">
                  <Share className="h-7 w-7 text-primary text-center" />
              </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center">Share Details</DialogTitle>
            <DialogDescription className="text-sm font-medium text-center">Where would you like to share {activeSoul?.firstName}'s info?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-6 text-center">
            <Button onClick={handleShareToWhatsApp} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20">
              <WhatsAppIcon className="h-5 w-5" /> WhatsApp External
            </Button>
            <Button onClick={() => { setIsShareTargetDialogOpen(false); setTimeout(() => setIsPartnerSelectionDialogOpen(true), 100); }} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5">
              <HeartHandshake className="h-5 w-5" /> Partner on App
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPartnerSelectionDialogOpen} onOpenChange={setIsPartnerSelectionDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left">
            <div className="p-8 border-b bg-muted/10 text-left text-left text-left">
                <DialogHeader className="text-left text-left text-left text-left">
                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Select Partner</DialogTitle>
                    <DialogDescription className="text-sm font-medium text-left text-left">Which partner should receive these details?</DialogDescription>
                </DialogHeader>
            </div>
            <div className="p-6 text-left text-left text-left">
            <ScrollArea className="h-64 text-left text-left">
                <div className="space-y-2 text-left text-left">
                    {uniquePartners.map(p => (
                        <Button 
                            key={p.userId} 
                            variant="ghost" 
                            className="w-full justify-start h-14 rounded-xl gap-4 hover:bg-primary/5 group text-left text-left"
                            onClick={() => handleShareToPartner(p)}
                        >
                            <Avatar className="h-8 w-8 border shrink-0 text-left">
                                <AvatarImage src={p.photoURL} />
                                <AvatarFallback className="font-bold text-[10px] text-left">{p.firstName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-sm group-hover:text-primary transition-colors text-left">{p.firstName} {p.lastName}</span>
                        </Button>
                    ))}
                    {uniquePartners.length === 0 && (
                        <p className="text-center text-xs text-muted-foreground py-12 text-center text-left">No partners found. Connect with some in Settings!</p>
                    )}
                </div>
            </ScrollArea>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isHelpNeedDialogOpen} onOpenChange={setIsHelpNeedDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left">
          <div className="p-8 border-b bg-muted/10 text-left text-left text-left">
            <DialogHeader className="text-left text-left text-left text-left">
              <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Support Provided</DialogTitle>
              <DialogDescription className="text-sm font-medium text-left text-left">Describe how you supported {activeSoul?.firstName}.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6 text-left text-left">
            <div className="space-y-2 text-left text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left">Support Details</Label>
                <Textarea 
                    placeholder="e.g. Provided food items, helped with bill..." 
                    onChange={e => setCustomPrayerText(e.target.value)} // Reusing customPrayerText temporarily for simple local state
                    className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner text-left text-left"
                />
            </div>
            <Button onClick={() => handleHelpNeedConfirm(customPrayerText)} className="w-full h-12 rounded-xl font-bold text-left text-left">Confirm Service</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
