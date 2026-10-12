
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
  Share, 
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
  PlayCircle,
  HandHeart,
  PartyPopper,
  ChevronRight,
  User,
  Smartphone,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import type { Soul, FollowUpStatus, UserProfile, Chat, BibleChapterOutput } from "@/lib/types";
import { useUser, useDoc, useUserProfile, useCollection, useFirestore } from "@/firebase";
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
  writeBatch,
  orderBy,
  deleteDoc
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
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Skeleton } from "../ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, safeToDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { actionItems, statusOptions, prayerTemplates, kingdomVerses } from "@/lib/follow-up-data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { MutualConnectBadge } from "./mutual-connect-badge";
import { useToast } from "@/hooks/use-toast";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Input } from "@/components/ui/input";
import { getBibleChapter, type BibleChapterOutput } from "@/ai/flows/get-bible-chapter-flow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { bibleData } from "@/lib/bible-data";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { PlaceHolderImages } from "@/lib/placeholder-images";

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
    'matchmaking': HeartHandshake,
};

const getStatusClasses = (status: FollowUpStatus | undefined): string => {
    if (!status) return 'bg-secondary text-secondary-foreground border-border';
    switch (status) {
        case 'New': return 'bg-amber-500/10 text-amber-600 border-amber-200';
        case 'Contacted': return 'bg-blue-500/10 text-blue-600 border-blue-200';
        case 'Established': return 'bg-green-500/10 text-green-600 border-green-200';
        default: return 'bg-secondary text-secondary-foreground border-border';
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
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
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
  
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterContent, setChapterContent] = useState<BibleChapterOutput | null>(null);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setView('hub');
      setBibleSearch('');
      setSearchResults([]);
      setSelectedBook(null);
      setSelectedChapter(null);
      setChapterContent(null);
      setSelectedVerses([]);
    }
  }, [isOpen]);

  const constructInvitationMessage = useCallback((verseText: string, reference: string, link: string) => {
    return `"${verseText.trim()}" — ${reference}\n\nJoin the harvest at Testify! Visit: ${window.location.origin}/bible`;
  }, []);

  const handleSearch = async () => {
      if (!bibleSearch.trim()) return;
      setIsSearching(true);
      try {
          const res = await fetch(`https://bible-api.com/${encodeURIComponent(bibleSearch)}`);
          if (res.ok) {
              const data = await res.json();
              if (data.verses) {
                  setSearchResults([{ reference: data.reference, text: data.text }]);
              }
          }
      } catch (e) {
          console.warn("Bible search failed", e);
      } finally {
          setIsSearching(false);
      }
  };

  const handleSelectBook = (bookName: string) => {
    setSelectedBook(bookName);
    setView('chapters');
  };

  const handleSelectChapter = async (num: number) => {
    if (!selectedBook) return;
    setSelectedChapter(num);
    setLoadingVerses(true);
    try {
      const content = await getBibleChapter({ book: selectedBook, chapter: num });
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
    const selectedTexts = chapterContent.verses.filter(v => selectedVerses.includes(v.verse)).map(v => v.text).join(' ');
    const reference = `${chapterContent.book} ${chapterContent.chapter}:${selectedVerses.join(', ')}`;
    const link = `${window.location.origin}/dashboard/bible?book=${encodeURIComponent(chapterContent.book)}&chapter=${chapterContent.chapter}`;
    onSelectVerse(constructInvitationMessage(selectedTexts, reference, link));
  };

  const header = (
    <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
      <div className="flex items-center justify-between gap-4">
        <div className="text-left">
            <div className="flex items-center gap-3 mb-2">
                {view !== 'hub' && <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full -ml-2" onClick={() => setView(view === 'verses' ? 'chapters' : view === 'chapters' ? 'books' : 'hub')}><ArrowLeft className="h-4 w-4" /></Button>}
                <BookMarked className="h-5 w-5 text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Kingdom Study</span>
            </div>
            <DialogHeader className="text-left">
                <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight">
                    {view === 'hub' ? "Share the Word" : view === 'books' ? "Select Book" : view === 'chapters' ? `${selectedBook}: Select Chapter` : `${selectedBook} ${selectedChapter}`}
                </DialogTitle>
            </DialogHeader>
        </div>
      </div>
    </div>
  );

  const body = (
    <ScrollArea className="flex-grow min-h-[300px]">
        <div className="p-8 text-left">
            {view === 'hub' && (
                <div className="space-y-8">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50" />
                        <Input placeholder="Search Bible (e.g. John 3:16)..." value={bibleSearch} onChange={e => setBibleSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" />
                        <Button onClick={handleSearch} disabled={isSearching || !bibleSearch.trim()} variant="ghost" size="sm" className="absolute right-3 top-1/2 -translate-y-1/2 h-8 px-4 rounded-xl font-black text-[10px] uppercase text-primary">
                            {isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : 'SEARCH'}
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Button onClick={() => setView('books')} variant="outline" className="h-28 rounded-[2rem] gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group transition-all flex flex-col items-center justify-center">
                            <BookOpen className="h-8 w-8 mb-1 group-hover:scale-110 transition-transform" />
                            <span className="font-black text-[10px] uppercase tracking-widest text-center">Browse Bible</span>
                        </Button>
                        <Button variant="outline" asChild className="h-28 rounded-[2rem] gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group transition-all flex flex-col items-center justify-center">
                            <Link href="/dashboard/bible">
                                <BookMarked className="h-8 w-8 mb-1 group-hover:scale-110 transition-transform" />
                                <span className="font-black text-[10px] uppercase tracking-widest text-center">Open Reader</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            )}
            {view === 'books' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {bibleData.map(book => (
                        <Button key={book.name} variant="outline" className="h-12 rounded-xl font-bold uppercase text-[10px]" onClick={() => handleSelectBook(book.name)}>{book.name}</Button>
                    ))}
                </div>
            )}
            {view === 'chapters' && (
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                   {selectedBook && bibleData.find(b => b.name === selectedBook)?.chapters.map(ch => (
                     <Button key={ch.chapter} variant="outline" className="h-10 w-10 p-0 rounded-lg font-black text-sm" onClick={() => handleSelectChapter(ch.chapter)}>{ch.chapter}</Button>
                   ))}
                </div>
            )}
            {view === 'verses' && (
                <div className="space-y-4 pb-12">
                   <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6">
                      <p className="text-[10px] font-black uppercase text-primary mb-1">SELECTED VERSES</p>
                      <p className="text-xs font-bold text-muted-foreground">{selectedVerses.length > 0 ? `${selectedBook} ${selectedChapter}:${selectedVerses.join(', ')}` : 'Select verses below...'}</p>
                   </div>
                   <div className="space-y-1 font-serif">
                     {loadingVerses ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div> : chapterContent?.verses.map(v => (
                       <div key={v.verse} className={cn("p-3 rounded-xl transition-all cursor-pointer border-2", selectedVerses.includes(v.verse) ? "bg-primary/10 border-primary/40" : "bg-transparent border-transparent hover:bg-muted/50")} onClick={() => toggleVerse(v.verse)}>
                          <sup className="text-[10px] font-black mr-2 opacity-40">{v.verse}</sup>
                          <span className="text-sm leading-relaxed">{v.text}</span>
                       </div>
                     ))}
                   </div>
                </div>
            )}
        </div>
    </ScrollArea>
  );

  const footer = (
    <div className="p-6 border-t bg-muted/5 flex justify-end gap-3 shrink-0">
        {view === 'verses' && <Button onClick={handleShareSelected} disabled={selectedVerses.length === 0} className="rounded-xl h-12 flex-1 font-black uppercase tracking-widest shadow-lg shadow-primary/20">PREPARE SHARE ({selectedVerses.length})</Button>}
        <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-xs">Close Hub</Button>
    </div>
  );

  if (isMobile) {
      return (
          <Drawer open={isOpen} onOpenChange={onOpenChange}>
              <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                  {header}
                  {body}
                  {footer}
              </DrawerContent>
          </Drawer>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col text-left">
        {header}
        {body}
        {footer}
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
    const logEntry = { date: new Date(), note: `Logged via Hub: ${action?.label}${noteAddendum ? ` - ${noteAddendum}` : ''}`, actions: [actionId], memberId: user.uid, memberName };
    batch.update(soulRef, { followUpLog: arrayUnion(logEntry), lastUpdatedAt: serverTimestamp() });
    batch.update(globalSoulRef, { followUpLog: arrayUnion(logEntry), lastUpdatedAt: serverTimestamp() });
    try { await batch.commit(); toast({ title: 'Impact Logged' }); }
    catch (err) { errorEmitter.emit('permission-error', new FirestorePermissionError({ path: soulRef.path, operation: 'update' }, user)); }
    finally { setIsActionSubmitting(false); setClickedActionId(null); }
  };

  const handleActionClick = async (actionId: string) => {
    if (!soul) return;
    setClickedActionId(actionId);
    if (['phone_call', 'text_message', 'prayed_together'].includes(actionId) && !soul.phone) { toast({ variant: 'destructive', title: 'Phone Missing' }); return; }

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
            router.push('/dashboard/events');
            return;
        case 'shared_meal':
        case 'gave_gift':
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
      const message = customMessageText || `Hi ${soul.firstName}, God bless you!`;
      if (channel === 'whatsapp') window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
      else window.location.href = `sms:${soul.phone}?body=${encodeURIComponent(message)}`;
      finalizeLog(clickedActionId, `Sent via ${channel.toUpperCase()}: ${message.substring(0, 30)}...`);
      setIsCommChannelDialogOpen(false);
      setCustomMessageText('');
  };

  const handleHelpNeedConfirm = (note: string) => {
      finalizeLog('helped_with_need', `Service: ${note}`);
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
          router.push(`/dashboard/chats/${chatId}`);
      } catch (e) {
          toast({ variant: 'destructive', title: 'Share Failed' });
      }
  };

  const uniquePartners = React.useMemo(() => {
    const partners = currentUserProfile?.accountabilityPartners || [];
    const uniqueMap = new Map();
    partners.forEach(p => {
        if (p.userId && !uniqueMap.has(p.userId)) uniqueMap.set(p.userId, p);
    });
    return Array.from(uniqueMap.values());
  }, [currentUserProfile?.accountabilityPartners]);

  const commBody = (
    <div className="flex flex-col gap-3 pt-6 text-left">
      <Button onClick={() => handleCommChoice('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20">
        <WhatsAppIcon className="h-5 w-5" /> WhatsApp
      </Button>
      <Button onClick={() => handleCommChoice('sms')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5">
        <MessageSquare className="h-5 w-5" /> Standard SMS
      </Button>
    </div>
  );

  const prayerCustomizationBody = (
      <div className="space-y-6 text-left">
          <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Prayer Focus</label>
              <div className="flex flex-wrap gap-2">
                  {prayerTemplates.map(t => (
                      <Button 
                          key={t.id} 
                          variant="outline" 
                          size="sm" 
                          className="rounded-full h-8 px-4 text-[9px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 hover:text-primary"
                          onClick={() => soul && setCustomMessageText(resolveTemplate(t.text, soul))}
                      >
                          {t.label}
                      </Button>
                  ))}
              </div>
          </div>
            <div className="space-y-2">
                <Label htmlFor="custom-prayer-text" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Customize Message</Label>
                <Textarea 
                    id="custom-prayer-text"
                    value={customMessageText}
                    onChange={e => setCustomMessageText(e.target.value)}
                    className="min-h-[200px] rounded-2xl bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6"
                />
            </div>
            <Button 
                onClick={() => handlePrayerCustomizationConfirm(customMessageText)} 
                disabled={!customMessageText.trim()} 
                className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest"
            >
                CONTINUE TO CHANNEL
            </Button>
      </div>
  );

  const helpNeedBody = (
      <div className="space-y-6 text-left">
          <div className="space-y-2">
              <Label htmlFor="help-note-text" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Support Details</Label>
              <Textarea 
                  id="help-note-text"
                  placeholder="e.g. Provided food items, helped with bill..." 
                  onChange={e => setCustomMessageText(e.target.value)} 
                  className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner"
              />
          </div>
          <Button onClick={() => handleHelpNeedConfirm(customMessageText)} className="w-full h-12 rounded-xl font-bold">Confirm Service</Button>
      </div>
  );

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
                            <DialogHeader className="sr-only text-left"><DialogTitle className="text-left">Soul Photo</DialogTitle></DialogHeader>
                            <div className="relative h-full w-full flex items-center justify-center p-4 text-left">
                                <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-left">
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
                <div className="flex items-center justify-between text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Spiritual Identity</p>
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
                <div className="flex items-center justify-between text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2 text-left">
                        <History className="h-3.5 w-3.5 text-left" /> Interaction History
                    </p>
                    <Button variant="ghost" className="h-6 text-[8px] font-black uppercase text-primary hover:bg-primary/5" onClick={() => onViewHistory(soul)}>
                        View All
                    </Button>
                </div>
                <div className="space-y-4 pl-1 text-left">
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
                        <div className="py-4 text-center border border-dashed rounded-xl bg-muted/5 text-left">
                            <p className="text-sm text-muted-foreground/40 italic">No interactions recorded.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3 p-5 bg-muted/20 rounded-[2rem] border-2 border-dashed border-primary/10 shadow-inner text-left">
                <div className="flex items-center justify-between text-left">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-1 text-left">
                        <ClipboardList className="h-3.5 w-3.5 text-left" /> Assessed Needs
                    </p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 text-left" onClick={() => onAssess(soul)}>
                        <Edit className="h-4 w-4 text-left" />
                    </Button>
                </div>
                {soul.needsAssessment ? (
                    <div className="space-y-4 text-left">
                        {soul.needsAssessment.generalImpression && <p className="text-xs text-muted-foreground italic leading-relaxed text-balance text-left">&ldquo;{soul.needsAssessment.generalImpression}&rdquo;</p>}
                        
                        <div className="grid grid-cols-2 gap-3 text-left">
                            {soul.needsAssessment.emotionalNeeds && (
                                <div className="space-y-1 text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-red-500/10 text-red-600 border-none px-1.5 uppercase font-black text-left">Emotional</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left">{soul.needsAssessment.emotionalNeeds}</p>
                                </div>
                            )}
                            {soul.needsAssessment.physicalNeeds && (
                                <div className="space-y-1 text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-amber-500/10 text-amber-600 border-none px-1.5 uppercase font-black text-left">Physical</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left">{soul.needsAssessment.physicalNeeds}</p>
                                </div>
                            )}
                            {soul.needsAssessment.financialNeeds && (
                                <div className="space-y-1 text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-green-500/10 text-green-600 border-none px-1.5 uppercase font-black text-left">Financial</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left">{soul.needsAssessment.financialNeeds}</p>
                                </div>
                            )}
                            {soul.needsAssessment.socialNeeds && (
                                <div className="space-y-1 text-left">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-indigo-500/10 text-indigo-600 border-none px-1.5 uppercase font-black text-left">Social</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 text-left">{soul.needsAssessment.socialNeeds}</p>
                                </div>
                            )}
                        </div>

                        {soul.needsAssessment.followUpPlan && (
                            <div className="pt-2 border-t border-primary/10 text-left">
                                <p className="text-[8px] font-black uppercase text-primary/60 mb-1 flex items-center gap-1.5 text-left">
                                    <Target className="h-2.5 w-2.5 text-left" /> Strategy
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed italic text-left">{soul.needsAssessment.followUpPlan}</p>
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
                <Button variant="ghost" className="w-full h-11 text-destructive font-bold uppercase tracking-widest text-[10px]" onClick={() => onDelete(soul)}>
                    <Trash2 className="mr-2 h-4 w-4" /> DELETE RECORD
                </Button>
            </div>
        </CardContent>
      </Card>

      <Dialog open={isPrayerCustomizationOpen} onOpenChange={setIsPrayerCustomizationOpen}>
          <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl text-left">
              <div className="p-8 border-b bg-muted/10 text-left">
                  <DialogHeader>
                      <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Kingdom Intercession</DialogTitle>
                      <DialogDescription className="text-sm font-medium text-left">Draft a powerful prayer for {soul.firstName}.</DialogDescription>
                  </DialogHeader>
              </div>
              <div className="p-8 space-y-6 text-left">
                {prayerCustomizationBody}
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isCommChannelDialogOpen} onOpenChange={setIsCommChannelDialogOpen}>
        <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center text-left">
          <DialogHeader className="text-center space-y-2">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-center">
                  <MessageSquare className="h-7 w-7 text-primary" />
              </div>
            <DialogTitle className="text-2xl font-black font-headline uppercase text-center">Message Hub</DialogTitle>
            <DialogDescription className="text-sm font-medium text-center">How would you like to encourage {soul.firstName}?</DialogDescription>
          </DialogHeader>
          {commBody}
        </DialogContent>
      </Dialog>

      <Dialog open={isHelpNeedDialogOpen} onOpenChange={setIsHelpNeedDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
          <div className="p-8 border-b bg-muted/10 text-left">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Support Provided</DialogTitle>
              <DialogDescription className="text-sm font-medium text-left">Describe how you supported {soul.firstName}.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6 text-left">
            {helpNeedBody}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareTargetDialogOpen} onOpenChange={setIsShareTargetDialogOpen}>
        <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-left">
          <DialogHeader className="text-center space-y-2 text-left">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-center">
                  <Share className="h-7 w-7 text-primary" />
              </div>
            <DialogTitle className="text-2xl font-black font-headline uppercase text-center">Share Details</DialogTitle>
            <DialogDescription className="text-sm font-medium text-center">Where would you like to share {soul.firstName}'s info?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-6 text-left">
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
              <div className="p-8 border-b bg-muted/10 text-left text-left">
                  <DialogHeader className="text-left text-left">
                      <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Select Partner</DialogTitle>
                      <DialogDescription className="text-sm font-medium text-left text-left">Which partner should receive these details?</DialogDescription>
                  </DialogHeader>
              </div>
              <div className="p-6 text-left">
                {partnerSelectionBody}
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
        <Card onClick={onClick} className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-b-2 sm:border-b shadow-none bg-card/50 backdrop-blur-sm transition-all duration-300 cursor-pointer hover:bg-primary/[0.02] text-left">
            <div className="flex items-center justify-between p-4 gap-4 text-left">
                <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                    <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 text-left")}>
                        <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-left">
                            {soul.firstName?.charAt(0) || 'S'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2 text-left flex-wrap">
                            <p className="font-bold truncate text-[13px] sm:text-base leading-tight capitalize tracking-tight text-left">
                              {soul.firstName || 'Unknown'} {soul.lastName || ''}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center mt-1.5 text-left">
                            <Badge className={cn("h-5 px-1.5 text-[9px] uppercase font-black tracking-widest text-left", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                            {soul.fellowshipName && <Badge variant="secondary" className="h-5 px-1.5 text-[8px] uppercase font-black tracking-tighter bg-primary/5 text-primary border-primary/20 shrink-0 text-left">Fellowship</Badge>}
                        </div>
                    </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-20 text-left" />
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
            className={cn("border-b hover:bg-muted/30 transition-colors cursor-pointer text-left", isSelected && "bg-primary/[0.03]")}
            onClick={() => onSelect()}
        >
            <TableCell className="font-medium p-4 text-left">
                <div className="flex items-center gap-4 text-left">
                    <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 text-left")}>
                        <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-left">
                            {soul.firstName?.charAt(0) || 'S'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-left">
                        <div className="font-black text-xs sm:text-sm md:text-base truncate capitalize tracking-tight text-left">
                            {soul.firstName} {soul.lastName}
                        </div>
                        {soul.church && <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 font-medium truncate opacity-70 text-left"><Church className="h-3 w-3 shrink-0 text-left" />{soul.church}</div>}
                    </div>
                </div>
            </TableCell>
        </TableRow>
    );
});
SoulTableRow.displayName = "SoulTableRow";

export function SoulsWonTable({ souls, loading, selectedId, onSelect, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit, onDelete, onAssess, onAddChild }: {
  souls: Soul[];
  allSouls: Soul[];
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
  onAddChild: (p1: Soul, p2?: Soul | null) => void;
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
        <div className="space-y-4 text-left">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border-b last:border-0 bg-card/50 backdrop-blur-sm rounded-xl text-left">
                    <Skeleton className="h-12 w-12 rounded-full text-left" />
                    <div className="space-y-2 flex-1 text-left"><Skeleton className="h-5 w-3/4 text-left" /><Skeleton className="h-4 w-1/2 text-left" /></div>
                    <Skeleton className="h-9 w-24 rounded-xl text-left" />
                </div>
            ))}
        </div>
    )
  }
  
  if (souls.length === 0) {
    return (
        <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm border-2 border-dashed text-left">
            <CardContent className="text-left">
                <div className="text-center py-24 flex flex-col items-center text-left">
                    <div className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-primary/20 text-left">
                        <HeartHandshake className="h-10 w-10 text-primary opacity-40 text-left" />
                    </div>
                    <h3 className="text-xl font-black font-headline uppercase tracking-tight text-left">Your Harvest Field</h3>
                    <p className="text-sm text-muted-foreground italic font-medium max-w-[280px] leading-relaxed opacity-60 text-balance text-center text-left">The souls you lead to Christ will appear here for collaborative discipleship and strategic follow-up.</p>
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
    <div className="flex flex-col lg:flex-row gap-8 items-start text-left">
        <div className="flex-1 w-full text-left">
            {isMobile ? (
                <div className="space-y-px text-left">
                    {souls.map((soul) => (
                        <SoulCard key={soul.id} soul={soul} onClick={() => onSelect(soul.id)} />
                    ))}
                </div>
            ) : (
                <Card className="rounded-none sm:rounded-[2rem] border-x-0 sm:border-x shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden text-left">
                    <CardHeader className="p-8 border-b bg-muted/5 text-left text-left">
                        <CardTitle className="text-2xl font-black font-headline tracking-tight flex items-center gap-3 uppercase text-left text-left">
                            <Heart className="h-6 w-6 text-primary fill-current text-left text-left" />
                            Harvest Dashboard
                        </CardTitle>
                        <CardDescription className="text-base font-medium text-left text-left">Keep track of spiritual development and community integration.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 text-left text-left">
                        <div className="overflow-x-auto text-left text-left">
                            <Table className="text-left text-left">
                                <TableHeader className="bg-muted/10 text-left">
                                    <TableRow className="hover:bg-transparent text-left">
                                        <TableHead className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Soul Identity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="text-left text-left">
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

        <Sheet open={!!selectedId && !!selectedSoul && (isMobile || window.innerWidth < 1024)} onOpenChange={(open) => !open && onSelect(null)}>
            <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                    <SheetHeader className="text-left flex-shrink-0 text-left">
                        <div className="flex items-center gap-2 mb-2 text-left">
                            <Sparkles className="h-4 w-4 text-primary text-left" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Identity Hub</span>
                        </div>
                        <SheetTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left text-left">
                            {selectedSoul?.firstName} {selectedSoul?.lastName}
                        </SheetTitle>
                        <SheetDescription className="text-sm font-medium mt-1 text-left">Full spiritual snapshot for the harvest workforce.</SheetDescription>
                    </SheetHeader>
                </div>
                <ScrollArea className="flex-grow min-h-0 text-left">
                    <div className="p-6 pb-24 text-left">
                        {profileView}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>

        <div className="hidden lg:block w-[320px] shrink-0 sticky top-24 text-left">
            <AnimatePresence>
                {selectedSoul ? (
                    <motion.div
                        key={selectedId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6 text-left"
                    >
                        {profileView}
                        <p className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.3em] text-center">
                            {selectedSoul.firstName} {selectedSoul.lastName}
                        </p>
                    </motion.div>
                ) : (
                    <div className="text-center py-20 px-8 border-2 border-dashed rounded-[2rem] bg-muted/5 text-left">
                        <Users className="h-10 w-10 text-muted-foreground opacity-10 mx-auto mb-4 text-left" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center text-balance text-left">Select a record to preview identity</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    </div>
  );
}
