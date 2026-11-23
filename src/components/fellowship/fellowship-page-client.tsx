'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDoc, useUser, useCollection, useUserProfile, useFirestore } from '@/firebase';
import type { Fellowship, UserProfile, FellowshipMember, Soul, DailyDevotional, TestimonyComment } from '@/lib/types';
import { 
    doc, 
    collection, 
    query, 
    orderBy, 
    where, 
    writeBatch, 
    serverTimestamp, 
    updateDoc, 
    arrayRemove, 
    increment, 
    deleteField, 
    setDoc, 
    limit, 
    arrayUnion 
} from 'firebase/firestore';
import { 
    Loader2, 
    ArrowLeft, 
    Users, 
    Calendar, 
    PlayCircle, 
    History, 
    PlusCircle, 
    MessagesSquare, 
    Sparkles, 
    UserMinus, 
    Trash2, 
    BookOpen, 
    Quote, 
    Edit, 
    CalendarClock, 
    ChevronLeft, 
    ChevronRight, 
    CalendarDays, 
    HandHeart, 
    ChevronDown, 
    Share2, 
    UserPlus, 
    PartyPopper, 
    MessageSquare, 
    X,
    Target,
    LogOut,
    Heart,
    MapPin
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, parseISO, isSameDay, subDays, addDays } from 'date-fns';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import NextLink from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn, safeToDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';

const devotionalSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(100),
  scripture: z.string().min(3, "Scripture is required.").max(100),
  text: z.string().min(20, "Devotional text is too short.").max(5000),
  prayer: z.string().max(1000).optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date."),
});

const LogSoulFormLazy = dynamic(() => import('@/components/souls/log-soul-form').then(m => m.LogSoulForm), { ssr: false });
const ViewHistoryDialogLazy = dynamic(() => import('@/components/souls/view-history-dialog').then(m => m.ViewHistoryDialog), { ssr: false });
const LogFollowUpDialogLazy = dynamic(() => import('@/components/souls/log-follow-up-dialog').then(m => m.LogFollowUpDialog), { ssr: false });
const CommentSectionLazy = dynamic(() => import('@/components/testimonies/comment-section').then(m => m.CommentSection), { ssr: false });

function LiveMemberAvatar({ userId, fallbackUrl, fallbackInitials, className }: { userId: string, fallbackUrl?: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userRef = useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const currentPhotoUrl = profile?.photoURL || fallbackUrl;
    
    return (
        <Avatar className={className}>
            <AvatarImage src={currentPhotoUrl} className="object-cover" />
            <AvatarFallback className="font-bold bg-primary/10 text-primary">{fallbackInitials}</AvatarFallback>
        </Avatar>
    );
}

function FullDevotionalDialog({ 
    devotional, 
    children,
    fellowshipId,
    commentCount = 0,
    supporters = [],
    inspiredBy = [],
    connectedBy = [],
    onReaction,
    isProcessingReaction
}: { 
    devotional: DailyDevotional, 
    children: React.ReactNode,
    fellowshipId: string,
    commentCount?: number,
    supporters?: string[],
    inspiredBy?: string[],
    connectedBy?: string[],
    onReaction: (type: 'amen' | 'inspired' | 'celebrate', e: React.MouseEvent) => void,
    isProcessingReaction: string | null
}) {
    const { user } = useUser();
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const commentsRef = useRef<HTMLDivElement>(null);
    useEffect(() => setMounted(true), []);

    const hasAmened = user ? supporters.includes(user.uid) : false;
    const hasInspired = user ? inspiredBy.includes(user.uid) : false;
    const hasCelebrated = user ? connectedBy.includes(user.uid) : false;

    const commentPath = `fellowships/${fellowshipId}/devotionals/${devotional.scheduledDate}/comments`;

    const scrollToComments = (e: React.MouseEvent) => {
        e.stopPropagation();
        commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const stopPropagation = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    if (!mounted) return <>{children}</>;

    const content = (
        <div className="space-y-8 text-left" onClick={stopPropagation}>
            <div className="bg-primary/5 rounded-[2rem] p-8 sm:p-12 border-2 border-dashed border-primary/20 relative shadow-inner overflow-hidden">
                <Quote className="absolute top-6 right-8 h-12 w-12 opacity-10 rotate-12" />
                <p className="text-xl sm:text-2xl font-serif italic leading-relaxed text-left text-balance relative z-10 break-words">{devotional.text}</p>
                <p className="text-xs sm:text-sm font-black uppercase text-primary/80 text-right mt-10 tracking-widest border-t border-primary/10 pt-4 relative z-10">— {devotional.scripture}</p>
            </div>
            
            {devotional.prayer && (
                <div className="bg-muted/30 rounded-[2rem] p-8 sm:p-10 border border-muted-foreground/10 shadow-sm relative overflow-hidden text-left">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <HandHeart className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">PRAYER FOR TODAY</span>
                    </div>
                    <p className="text-lg sm:text-xl font-medium leading-relaxed italic text-muted-foreground text-balance break-words">
                        &ldquo;{devotional.prayer}&rdquo;
                    </p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-dashed pt-8">
                <div className="flex items-center justify-center gap-3 bg-muted/30 px-4 py-2 rounded-full border border-dashed w-fit">
                    <Sparkles className="h-4 w-4 text-primary fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Messenger: {devotional.authorName}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-center w-full sm:w-auto">
                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        <Button 
                            onClick={(e) => onReaction('amen', e)} 
                            disabled={isProcessingReaction !== null || !user} 
                            variant="outline" 
                            size="sm" 
                            className={cn("h-9 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest bg-background", hasAmened && "bg-primary/10 border-primary/30 text-primary")}
                        >
                            {isProcessingReaction === 'amen' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HandHeart className={cn("h-3.5 w-3.5", hasAmened && "fill-current")} />}
                            <span>Amen</span>
                        </Button>
                        <Button 
                            onClick={(e) => onReaction('inspired', e)} 
                            disabled={isProcessingReaction !== null || !user} 
                            variant="outline" 
                            size="sm" 
                            className={cn("h-9 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest bg-background", hasInspired && "bg-chart-3/10 border-chart-3/30 text-chart-3")}
                        >
                            {isProcessingReaction === 'inspired' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className={cn("h-3.5 w-3.5", hasInspired && "fill-current")} />}
                            <span>Hallelujah</span>
                        </Button>
                        <Button 
                            onClick={(e) => onReaction('celebrate', e)} 
                            disabled={isProcessingReaction !== null || !user} 
                            variant="outline" 
                            size="sm" 
                            className={cn("h-9 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest bg-background", hasCelebrated && "bg-blue-500/10 border-blue-500/30 text-blue-500")}
                        >
                            {isProcessingReaction === 'celebrate' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PartyPopper className={cn("h-3.5 w-3.5", hasCelebrated && "fill-current")} />}
                            <span>Celebrate</span>
                        </Button>
                    </div>

                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest bg-muted/20 border-primary/20 hover:bg-muted/30 transition-all active:scale-95 px-6 shadow-sm"
                        onClick={scrollToComments}
                    >
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <span>{commentCount} Response{commentCount !== 1 ? 's' : ''}</span>
                    </Button>
                </div>
            </div>

            <div ref={commentsRef} className="border-t border-dashed pt-8">
                <div className="flex items-center gap-3 mb-6 px-1">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">GATHERED RESPONSES</span>
                </div>
                <CommentSectionLazy path={commentPath} inline />
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild onClick={stopPropagation}>{children}</SheetTrigger>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                        <SheetHeader className="text-left flex-shrink-0 p-0">
                            <SheetTitle className="text-2xl font-black font-headline uppercase leading-tight break-words flex items-center gap-3 text-balance">
                                <MessageSquare className="h-6 w-6 text-primary shrink-0" />
                                {devotional.title}
                            </SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1">Word for {format(parseISO(devotional.scheduledDate), 'PPPP')}</SheetDescription>
                        </SheetHeader>
                    </div>
                    <ScrollArea className="flex-grow">
                        <div className="p-8 pb-32">
                            {content}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild onClick={stopPropagation}>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl text-left flex flex-col max-h-[90dvh]">
                <div className="p-8 border-b bg-muted/10 shrink-0">
                    <div className="flex items-center gap-3 mb-2">
                        <Target className="h-5 w-5 text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Mission Overview</span>
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight break-words flex items-center gap-3 text-balance">{devotional.title}</DialogTitle>
                        <DialogDescription className="text-sm font-medium mt-1">Daily Word • {format(parseISO(devotional.scheduledDate), 'PPPP')}</DialogDescription>
                    </DialogHeader>
                </div>
                <div className="flex-1 min-h-0">
                  <ScrollArea className="h-full">
                      <div className="p-8">
                          {content}
                      </div>
                  </ScrollArea>
                </div>
                <div className="p-6 border-t bg-muted/5 flex justify-end gap-3 shrink-0">
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-full px-8 font-bold">Close Word</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function FellowshipPageClient({ fellowshipId }: { fellowshipId: string }) {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { userProfile, loading: profileLoading } = useUserProfile();
    const isMobile = useIsMobile();
    const { toast } = useToast();
    const [mounted, setMounted] = useState(false);

    const [historySoulId, setHistorySoulId] = useState<string | null>(null);
    const [followUpSoulId, setFollowUpSoulId] = useState<string | null>(null);
    const [isLogSoulOpen, setIsLogSoulOpen] = useState(false);
    
    const [viewDate, setViewDate] = useState(new Date());
    const [isDevotionalDialogOpen, setIsDevotionalDialogOpen] = useState(false);
    const [isSavingDevotional, setIsSavingDevotional] = useState(false);
    const [isScheduleViewOpen, setIsScheduleViewOpen] = useState(false);
    const [isProcessingReaction, setIsProcessingReaction] = useState<string | null>(null);
    const [isChatLoading, setIsChatLoading] = useState(false);
    
    const [memberToRemove, setMemberToRemove] = useState<FellowshipMember | null>(null);
    const [soulToUnassign, setSoulToUnassign] = useState<Soul | null>(null);
    const [isProcessingRemoval, setIsProcessingRemoval] = useState(false);

    const commentsAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setMounted(true); }, []);

    const fellowshipDocRef = useMemo(() => (firestore && fellowshipId) ? doc(firestore, 'fellowships', fellowshipId) : null, [firestore, fellowshipId]);
    const { data: fellowship, loading: fellowshipLoading, error: fellowshipError } = useDoc<Fellowship>(fellowshipDocRef);

    const isMember = useMemo(() => (user && fellowship?.memberIds?.includes(user.uid)) || false, [user, fellowship?.memberIds]);
    const isOrganizer = useMemo(() => (user && fellowship?.organizerId === user.uid) || false, [user, fellowship?.organizerId]);

    const viewDateStr = format(viewDate, 'yyyy-MM-dd');
    const isViewingToday = isSameDay(viewDate, new Date());
    
    const activeDevotionalRef = useMemo(() => (firestore && fellowshipId) ? doc(firestore, 'fellowships', fellowshipId, 'devotionals', viewDateStr) : null, [firestore, fellowshipId, viewDateStr]);
    const { data: activeDevotional, loading: devoLoading } = useDoc<DailyDevotional>(activeDevotionalRef);

    const membersQuery = useMemo(() => (firestore && fellowshipId && (isMember || isOrganizer)) ? query(collection(firestore, 'fellowships', fellowshipId, 'members'), orderBy('joinedAt', 'desc')) : null, [firestore, fellowshipId, isMember, isOrganizer]);
    const { data: members, loading: loadingMembers } = useCollection<FellowshipMember>(membersQuery);

    const soulsQuery = useMemo(() => {
        if (!firestore || !fellowshipId || !(isMember || isOrganizer) || !fellowship) return null;
        const field = fellowship.groupType === 'Association' ? 'associationId' : 'fellowshipId';
        return query(collection(firestore, 'souls'), where(field, '==', fellowshipId));
    }, [firestore, fellowshipId, isMember, isOrganizer, fellowship]);
    const { data: assignedSouls, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

    const activeSoul = useMemo(() => {
        const id = historySoulId || followUpSoulId;
        return assignedSouls?.find(s => s.id === id) || null;
    }, [historySoulId, followUpSoulId, assignedSouls]);

    const form = useForm<z.infer<typeof devotionalSchema>>({
        resolver: zodResolver(devotionalSchema),
        defaultValues: { title: '', scripture: '', text: '', prayer: '', scheduledDate: viewDateStr },
    });

    const handleSaveDevotional = async (values: z.infer<typeof devotionalSchema>) => {
        if (!user || !firestore || !fellowship || !userProfile) return;
        setIsSavingDevotional(true);
        const ref = doc(firestore, 'fellowships', fellowshipId, 'devotionals', values.scheduledDate);
        const data: any = { ...values, authorId: user.uid, authorName: `${userProfile.firstName} ${userProfile.lastName}`, updatedAt: serverTimestamp() };
        if (!activeDevotional) { data.createdAt = serverTimestamp(); data.supporters = []; data.inspiredBy = []; data.connectedBy = []; }
        setDoc(ref, data, { merge: true }).then(() => { toast({ title: 'Published' }); setIsDevotionalDialogOpen(false); }).catch(e => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ref.path, operation: 'write', requestResourceData: data }, user))).finally(() => setIsSavingDevotional(false));
    };

    const handleOpenGroupChat = async () => {
        if (!user || !firestore || !userProfile || !fellowship) return;
        if (fellowship.hasGroupChat) {
            router.push(`/chats/${fellowshipId}`);
        } else if (isOrganizer) {
            setIsChatLoading(true);
            const batch = writeBatch(firestore);
            const chatRef = doc(firestore, 'chats', fellowshipId);
            const info: any = {};
            members?.forEach(m => info[m.userId] = { firstName: m.firstName, lastName: m.lastName, photoURL: m.photoURL || '' });
            batch.set(chatRef, { participantIds: fellowship.memberIds, participantInfo: info, fellowshipId, campaignTitle: fellowship.name, lastUpdatedAt: serverTimestamp(), isGroupChat: true, hasMessages: false }, { merge: true });
            batch.update(doc(firestore, 'fellowships', fellowshipId), { hasGroupChat: true });
            batch.commit().then(() => router.push(`/chats/${fellowshipId}`)).finally(() => setIsChatLoading(false));
        }
    };

    const handleDeleteMember = async () => {
        if (!user || !firestore || !memberToRemove) return;
        setIsProcessingRemoval(true);
        const batch = writeBatch(firestore);
        batch.delete(doc(firestore, 'fellowships', fellowshipId, 'members', memberToRemove.userId));
        batch.update(doc(firestore, 'fellowships', fellowshipId), { memberIds: arrayRemove(memberToRemove.userId), memberCount: increment(-1) });
        batch.delete(doc(firestore, 'users', memberToRemove.userId, 'joinedFellowships', fellowshipId));
        batch.commit().then(() => { setMemberToRemove(null); toast({ title: "Removed" }); }).finally(() => setIsProcessingRemoval(false));
    };

    const handleRemoveSoul = async () => {
        if (!user || !firestore || !soulToUnassign) return;
        setIsProcessingRemoval(true);
        const batch = writeBatch(firestore);
        const field = fellowship?.groupType === 'Association' ? 'associationId' : 'fellowshipId';
        const nameField = fellowship?.groupType === 'Association' ? 'associationName' : 'fellowshipName';
        const up = { [field]: deleteField(), [nameField]: deleteField(), updatedAt: serverTimestamp() };
        batch.update(doc(firestore, 'souls', soulToUnassign.id), up);
        batch.update(doc(firestore, 'users', soulToUnassign.userId, 'souls', soulToUnassign.id), up);
        batch.commit().then(() => { setSoulToUnassign(null); toast({ title: "Unassigned" }); }).finally(() => setIsProcessingRemoval(false));
    };

    const handleReaction = (type: 'amen' | 'inspired' | 'celebrate', e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user || !firestore || !activeDevotional) return;
        const supporters = activeDevotional.supporters || [];
        const inspiredBy = activeDevotional.inspiredBy || [];
        const connectedBy = activeDevotional.connectedBy || [];
        const hasReacted = (type === 'amen' && supporters.includes(user.uid)) || (type === 'inspired' && inspiredBy.includes(user.uid)) || (type === 'celebrate' && connectedBy.includes(user.uid));
        setIsProcessingReaction(type);
        const ref = doc(firestore, 'fellowships', fellowshipId, 'devotionals', viewDateStr);
        const field = type === 'amen' ? 'supporters' : type === 'inspired' ? 'inspiredBy' : 'connectedBy';
        updateDoc(ref, { [field]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid) }).finally(() => setIsProcessingReaction(null));
    }

    if (fellowshipLoading || profileLoading || soulsLoading || loadingMembers || devoLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
    if (fellowshipError || !fellowship || fellowship.status === 'deleted') return <div className="text-center p-12"><h2>Not Found</h2></div>;

    return (
        <div className="space-y-6 md:space-y-10 w-full max-w-6xl mx-auto pt-4 text-left">
            <div className="flex flex-col gap-5 px-4 sm:px-0">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10"><ArrowLeft className="h-5 w-5"/></Button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-headline uppercase truncate">{fellowship.name}</h1>
                        <div className="flex items-center gap-2 mt-1"><Badge variant="secondary" className="uppercase font-bold text-[10px] h-5">{fellowship.groupType}</Badge></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="rounded-none sm:rounded-[2.5rem] bg-primary text-primary-foreground overflow-hidden border-none shadow-xl border-b-8 border-b-white/10">
                        <CardHeader className="p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 opacity-80"><BookOpen className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">DEVOTIONAL</span></div>
                                <CardTitle className="text-2xl sm:text-3xl font-black font-headline uppercase leading-tight truncate">{activeDevotional?.title || 'No Word Today'}</CardTitle>
                                <p className="text-[10px] font-bold uppercase opacity-70 mt-2">{format(viewDate, 'EEEE, MMMM d')}</p>
                            </div>
                            {isOrganizer && <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl bg-white/10 border-white/20 text-white" onClick={() => setIsDevotionalDialogOpen(true)}><Edit className="h-5 w-5" /></Button>}
                        </CardHeader>
                        <CardContent className="px-6 sm:p-10 pb-10">
                            {activeDevotional ? (
                                <div className="space-y-6">
                                    <div className="bg-black/20 rounded-[2rem] p-6 sm:p-10 border border-white/10 relative overflow-hidden">
                                        <Quote className="absolute top-4 right-6 h-10 w-10 opacity-5" />
                                        <p className="text-lg sm:text-xl font-serif italic leading-relaxed text-justify">{activeDevotional.text}</p>
                                        <p className="text-xs font-black uppercase text-right mt-6 tracking-widest opacity-80">— {activeDevotional.scripture}</p>
                                    </div>
                                    {activeDevotional.prayer && <div className="bg-white/10 rounded-2xl p-6 border border-dashed border-white/20"><p className="text-sm italic">&ldquo;{activeDevotional.prayer}&rdquo;</p></div>}
                                    <div className="flex items-center gap-3 pt-4">
                                        <Button onClick={(e) => handleReaction('amen', e)} disabled={isProcessingReaction !== null} variant="outline" size="sm" className={cn("rounded-full h-8 gap-2 bg-white/5 border-white/10 text-white", (activeDevotional.supporters || []).includes(user?.uid || '') && "bg-white/20")}>{isProcessingReaction === 'amen' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HandHeart className="h-3.5 w-3.5" />} AMEN</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-white/5 rounded-3xl border-2 border-dashed border-white/10">
                                    <p className="text-sm opacity-50 italic text-center">No spiritual guidance Arranged for this date.</p>
                                    {isOrganizer && <Button variant="secondary" className="mt-6 h-11 px-8 rounded-xl font-black uppercase" onClick={() => setIsDevotionalDialogOpen(true)}>PUBLISH WORD</Button>}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-none sm:rounded-[2.5rem] border-none shadow-sm bg-background border overflow-hidden">
                        <CardHeader className="p-8 border-b bg-muted/5">
                            <CardTitle className="flex items-center justify-between text-base sm:text-lg font-black uppercase">
                                <span className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Directory</span>
                                <Badge variant="secondary">{(members?.length || 0) + (assignedSouls?.length || 0)}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {(isMember || isOrganizer) ? (
                                <Tabs defaultValue="believers">
                                    <TabsList className="flex w-full bg-muted/10 h-12 p-0 rounded-none border-b">
                                        <TabsTrigger value="believers" className="flex-1 text-xs font-bold h-full rounded-none">Believers ({members?.length || 0})</TabsTrigger>
                                        <TabsTrigger value="souls" className="flex-1 text-xs font-bold h-full rounded-none">Converts ({assignedSouls?.length || 0})</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="believers" className="p-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {members?.map(m => (
                                                <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/5 group">
                                                    <LiveMemberAvatar userId={m.userId} fallbackInitials={m.firstName?.charAt(0)} className="h-10 w-10 border shadow-sm" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-sm uppercase tracking-tight truncate">{m.firstName} {m.lastName}</p>
                                                        {m.userId === fellowship.organizerId && <span className="text-[8px] font-black uppercase text-primary">Organizer</span>}
                                                    </div>
                                                    {isOrganizer && m.userId !== user?.uid && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-40 hover:opacity-100" onClick={() => setMemberToRemove(m)}><UserMinus className="h-4 w-4" /></Button>}
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="souls" className="p-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {assignedSouls?.map(s => (
                                                <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl border bg-primary/5">
                                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20"><Heart className="h-5 w-5 text-primary fill-current" /></div>
                                                    <div className="flex-1 min-w-0">
                                                        <button onClick={() => setHistorySoulId(s.id)} className="font-black text-sm uppercase truncate hover:text-primary transition-colors text-left w-full">{s.firstName} {s.lastName}</button>
                                                        <div className="flex items-center gap-2 mt-0.5"><Badge variant="secondary" className="h-4 text-[7px] font-black uppercase">{s.status}</Badge></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            ) : <div className="p-12 text-center text-muted-foreground italic">Join this group to access the directory.</div>}
                        </CardContent>
                    </Card>

                    <div ref={commentsAreaRef} className="pt-8">
                        <Card className="rounded-none sm:rounded-[2rem] border-none shadow-sm overflow-hidden bg-background">
                            <CommentSectionLazy path={`fellowships/${fellowshipId}/devotionals/${viewDateStr}/comments`} inline />
                        </Card>
                    </div>
                </div>

                <div className="space-y-8 px-4 sm:px-0">
                    <Card className="rounded-3xl border shadow-sm bg-background border-b-8 border-b-primary/10">
                        <CardHeader className="pb-3"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Gathering Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-2xl bg-muted/20 border border-dashed"><p className="text-[8px] font-black uppercase text-muted-foreground mb-1">Schedule</p><p className="font-black text-sm">{fellowship.schedule}</p></div>
                            <div className="p-4 rounded-2xl bg-muted/20 border border-dashed"><p className="text-[8px] font-black uppercase text-muted-foreground mb-1">Area</p><p className="font-black text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {fellowship.location}</p></div>
                            {(isMember || isOrganizer) && fellowship.streamUrl && <Button asChild className="w-full h-12 font-black rounded-xl shadow-lg"><NextLink href={fellowship.streamUrl} target="_blank" className="flex items-center justify-center"><PlayCircle className="mr-2 h-5 w-5" />JOIN MEETING</NextLink></Button>}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {isDevotionalDialogOpen && (
                <Dialog open={isDevotionalDialogOpen} onOpenChange={setIsDevotionalDialogOpen}>
                    <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
                        <div className="p-8 border-b bg-muted/10 shrink-0"><DialogHeader><DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Daily Word Hub</DialogTitle><DialogDescription className="text-sm font-medium mt-1">Publish spiritual nourishment for your group.</DialogDescription></DialogHeader></div>
                        <ScrollArea className="flex-1 min-h-0 p-8">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleSaveDevotional)} className="space-y-6">
                                    <FormField control={form.control} name="scheduledDate" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} className="h-12 rounded-xl bg-muted/20 border-none" /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Favor & Grace" {...field} className="h-12 rounded-xl bg-muted/20 border-none font-bold" /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="scripture" render={({ field }) => (<FormItem><FormLabel>Scripture</FormLabel><FormControl><Input placeholder="e.g., Psalm 23:1" {...field} className="h-12 rounded-xl bg-muted/20 border-none" /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="text" render={({ field }) => (<FormItem><FormLabel>Message</FormLabel><FormControl><Textarea placeholder="Share the revelation..." className="min-h-[120px] rounded-xl bg-muted/20 border-none text-base" {...field} /></FormControl></FormItem>)} />
                                    <Button type="submit" disabled={isSavingDevotional} className="w-full h-14 rounded-2xl font-black shadow-xl uppercase tracking-widest">{isSavingDevotional && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}PUBLISH WORD</Button>
                                </form>
                            </Form>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )}

            <ViewHistoryDialogLazy soul={activeSoul} isOpen={!!historySoulId} onOpenChange={(open) => !open && setHistorySoulId(null)} />
            <LogFollowUpDialogLazy soul={activeSoul} isOpen={!!followUpSoulId} onOpenChange={(open) => !open && setFollowUpSoulId(null)} onFollowUpLogged={() => setFollowUpSoulId(null)} userProfile={userProfile} />
            
            <Drawer open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
                <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10"><DrawerHeader><DrawerTitle className="text-2xl font-black font-headline">Log Convert</DrawerTitle><DrawerDescription className="text-sm font-medium mt-1">Record a new life won to this community.</DrawerDescription></DrawerHeader></div>
                    <ScrollArea className="flex-1 min-h-0 p-8"><LogSoulFormLazy onSoulLogged={() => setIsLogSoulOpen(false)} fellowships={[]} campaigns={[]} defaultFellowship={fellowship?.groupType === 'Fellowship' ? fellowship : undefined} defaultAssociation={fellowship?.groupType === 'Association' ? fellowship : undefined} /></ScrollArea>
                </DrawerContent>
            </Drawer>

            <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
                <AlertDialogContent className="rounded-3xl p-8">
                    <AlertDialogHeader><AlertDialogTitle>Remove Member?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to remove {memberToRemove?.firstName} from this community?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter className="mt-6"><AlertDialogCancel disabled={isProcessingRemoval} className="rounded-xl h-11 font-bold">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteMember} disabled={isProcessingRemoval} className="bg-destructive hover:bg-destructive/90 rounded-xl h-11 font-bold">{isProcessingRemoval && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm Removal</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!soulToUnassign} onOpenChange={(open) => !open && setSoulToUnassign(null)}>
                <AlertDialogContent className="rounded-3xl p-8">
                  <AlertDialogHeader><AlertDialogTitle>Unassign Convert?</AlertDialogTitle><AlertDialogDescription>Remove {soulToUnassign?.firstName} from this shared list?</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter className="gap-3 mt-6">
                    <AlertDialogCancel className="rounded-xl h-11 font-bold">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemoveSoul} disabled={isProcessingRemoval} className="bg-destructive hover:bg-destructive/90 rounded-xl h-11 font-bold">{isProcessingRemoval && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm Unassign</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

