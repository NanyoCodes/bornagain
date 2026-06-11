'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection, useUserProfile } from '@/firebase';
import type { Fellowship, UserProfile, FellowshipMember, Soul, DailyDevotional, Campaign, TestimonyComment } from '@/lib/types';
import { doc, collection, query, orderBy, where, writeBatch, serverTimestamp, updateDoc, arrayRemove, increment, deleteField, setDoc, limit, arrayUnion } from 'firebase/firestore';
import { Loader2, ArrowLeft, Users, Calendar, PlayCircle, MapPin, Heart, Phone, Mail, Church, History, PlusCircle, Award, MessagesSquare, User, Info, Sparkles, UserMinus, Trash2, BookOpen, Quote, Edit, CalendarClock, ChevronLeft, ChevronRight, CalendarDays, HandHeart, ChevronDown, Share2, UserPlus, PartyPopper, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { useIsMobile } from '@/hooks/use-mobile';
import { format, addDays, isSameDay, subDays, parseISO } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { LogFollowUpDialog } from '@/components/souls/log-follow-up-dialog';
import { ViewHistoryDialog } from '@/components/souls/view-history-dialog';
import { actionItems } from '@/lib/follow-up-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { LogSoulForm } from '@/components/souls/log-soul-form';
import { CommentSection } from '../testimonies/comment-section';
import NextLink from 'next/link';

const devotionalSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(100),
  scripture: z.string().min(3, "Scripture is required.").max(100),
  text: z.string().min(20, "Devotional text is too short.").max(5000),
  prayer: z.string().max(1000).optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date."),
});

function FullDevotionalDialog({ 
    devotional, 
    children,
    fellowshipId,
    commentCount = 0,
    supporters = [],
    inspiredBy = [],
    connectedBy = []
}: { 
    devotional: DailyDevotional, 
    children: React.ReactNode,
    fellowshipId: string,
    commentCount?: number,
    supporters?: string[],
    inspiredBy?: string[],
    connectedBy?: string[]
}) {
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const totalReactions = (supporters?.length || 0) + (inspiredBy?.length || 0) + (connectedBy?.length || 0);
    const commentPath = `fellowships/${fellowshipId}/devotionals/${devotional.scheduledDate}/comments`;

    if (!mounted) return <>{children}</>;

    const content = (
        <div className="space-y-8">
            <div className="bg-primary/5 rounded-[2rem] p-8 sm:p-12 border-2 border-dashed border-primary/20 relative shadow-inner overflow-hidden">
                <Quote className="absolute top-6 right-8 h-12 w-12 opacity-10 rotate-12" />
                <p className="text-xl sm:text-2xl font-serif italic leading-relaxed text-justify text-balance relative z-10 break-words [overflow-wrap:anywhere]">{devotional.text}</p>
                <p className="text-xs sm:text-sm font-black uppercase text-primary/80 text-right mt-10 tracking-widest border-t border-primary/10 pt-4 relative z-10 break-words [overflow-wrap:anywhere]">— {devotional.scripture}</p>
            </div>
            
            {devotional.prayer && (
                <div className="bg-muted/30 rounded-[2rem] p-8 sm:p-10 border border-muted-foreground/10 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <HandHeart className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">PRAYER FOR TODAY</span>
                    </div>
                    <p className="text-lg sm:text-xl font-medium leading-relaxed italic text-muted-foreground text-balance break-words [overflow-wrap:anywhere]">
                        &ldquo;{devotional.prayer}&rdquo;
                    </p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-dashed pt-8">
                <div className="flex items-center justify-center gap-3 bg-muted/30 px-4 py-2 rounded-full border border-dashed w-fit">
                    <Sparkles className="h-4 w-4 text-primary fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Messenger: {devotional.authorName}</span>
                </div>

                <div className="flex items-center gap-4 flex-wrap justify-center">
                    {totalReactions > 0 && (
                        <div className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                            <div className="flex items-center -space-x-1.5">
                                {supporters.length > 0 && <div className="bg-primary rounded-full p-1 border-2 border-background shadow-sm"><HandHeart className="h-2.5 w-2.5 text-primary-foreground fill-current" /></div>}
                                {inspiredBy.length > 0 && <div className="bg-chart-3 rounded-full p-1 border-2 border-background shadow-sm"><Sparkles className="h-2.5 w-2.5 text-white fill-current" /></div>}
                                {connectedBy.length > 0 && <div className="bg-blue-500 rounded-full p-1 border-2 border-background shadow-sm"><PartyPopper className="h-2.5 w-2.5 text-white" /></div>}
                            </div>
                            <span className="text-[10px] font-black text-primary">{totalReactions} Reactions</span>
                        </div>
                    )}
                    
                    <Sheet open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                        <SheetTrigger asChild>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 rounded-full gap-2 font-bold uppercase text-[10px] tracking-widest bg-muted/40 border-muted-foreground/10 hover:bg-muted/60 transition-all active:scale-95"
                            >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>{commentCount} Response{commentCount !== 1 ? 's' : ''}</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] border-t-4 border-t-primary/20">
                            <div className="p-8 border-b shrink-0 bg-muted/10">
                                <SheetHeader className="text-left flex-shrink-0">
                                    <SheetTitle className="text-2xl font-black font-headline uppercase leading-tight flex items-center gap-3">
                                        <MessageSquare className="h-6 w-6 text-primary" />
                                        Gathered Responses
                                    </SheetTitle>
                                    <SheetDescription className="text-xs font-bold uppercase tracking-widest">PRAYERS & AGREEMENT ON THIS WORD</SheetDescription>
                                </SheetHeader>
                            </div>
                            <div className="flex-grow min-h-0">
                                <CommentSection path={commentPath} />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild onClick={(e) => e.stopPropagation()}>{children}</SheetTrigger>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                        <SheetHeader className="text-left flex-shrink-0">
                            <SheetTitle className="text-2xl font-black font-headline uppercase leading-tight break-words [overflow-wrap:anywhere] flex items-center gap-3 text-balance">
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
            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                <div className="p-8 border-b bg-muted/10">
                    <div className="flex items-center gap-3 mb-2">
                        <Target className="h-5 w-5 text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Mission Overview</span>
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black font-headline uppercase leading-tight break-words [overflow-wrap:anywhere] flex items-center gap-3 text-balance">
                            <MessageSquare className="h-6 w-6 text-primary shrink-0" />
                            {devotional.title}
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium mt-1">Daily Word • {format(parseISO(devotional.scheduledDate), 'PPPP')}</DialogDescription>
                    </DialogHeader>
                </div>
                <ScrollArea className="max-h-[70vh]">
                    <div className="p-8">
                        {content}
                    </div>
                </ScrollArea>
                <div className="p-6 border-t bg-muted/5 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-full px-8 font-bold">Close Word</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function FellowshipPageClient() {
    const router = useRouter();
    const params = useParams();
    const fellowshipId = params.fellowshipId as string;
    const firestore = useFirestore();
    const { user } = useUser();
    const { userProfile, loading: profileLoading } = useUserProfile();
    const isMobile = useIsMobile();
    const { toast } = useToast();
    const [mounted, setMounted] = useState(false);

    const [selectedSoulId, setSelectedSoulId] = useState<string | null>(null);
    const [isSoulDetailsOpen, setIsSoulDetailsOpen] = useState(false);
    const [isLogFollowUpOpen, setIsLogFollowUpOpen] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isLogSoulOpen, setIsLogSoulOpen] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    
    const [viewDate, setViewDate] = useState(new Date());
    const [isDevotionalDialogOpen, setIsDevotionalDialogOpen] = useState(false);
    const [isSavingDevotional, setIsSavingDevotional] = useState(false);
    const [isScheduleViewOpen, setIsScheduleViewOpen] = useState(false);
    const [isProcessingReaction, setIsProcessingReaction] = useState<string | null>(null);
    
    const [memberToRemove, setMemberToRemove] = useState<FellowshipMember | null>(null);
    const [soulToUnassign, setSoulToUnassign] = useState<Soul | null>(null);
    const [isProcessingRemoval, setIsProcessingRemoval] = useState(false);

    const devotionalTextRef = useRef<HTMLParagraphElement>(null);
    const [isDevotionalTruncated, setIsDevotionalTruncated] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const fellowshipDocRef = useMemo(() => {
        if (!firestore || !fellowshipId) return null;
        return doc(firestore, 'fellowships', fellowshipId);
    }, [firestore, fellowshipId]);
    const { data: fellowship, loading: fellowshipLoading, error: fellowshipError } = useDoc<Fellowship>(fellowshipDocRef);

    const isMember = useMemo(() => {
        if (!user || !fellowship || !fellowship.memberIds) return false;
        return fellowship.memberIds.includes(user.uid);
    }, [user, fellowship?.memberIds]);

    const isOrganizer = useMemo(() => {
        if (!user || !fellowship) return false;
        return fellowship.organizerId === user.uid;
    }, [user, fellowship?.organizerId]);

    const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
    const viewDateStr = format(viewDate, 'yyyy-MM-dd');
    const isViewingToday = isSameDay(viewDate, new Date());
    
    const commentPath = useMemo(() => `fellowships/${fellowshipId}/devotionals/${viewDateStr}/comments`, [fellowshipId, viewDateStr]);
    
    const activeDevotionalRef = useMemo(() => {
        if (!firestore || !fellowshipId) return null;
        return doc(firestore, 'fellowships', fellowshipId, 'devotionals', viewDateStr);
    }, [firestore, fellowshipId, viewDateStr]);
    const { data: activeDevotional, loading: devoLoading } = useDoc<DailyDevotional>(activeDevotionalRef);

    const commentsQuery = useMemo(() => {
        if (!firestore || !fellowshipId || !activeDevotional) return null;
        return query(collection(firestore, commentPath), orderBy('createdAt', 'asc'));
    }, [firestore, fellowshipId, commentPath, activeDevotional]);
    const { data: comments } = useCollection<TestimonyComment>(commentsQuery);
    const commentCount = comments?.length || 0;

    const supporters = activeDevotional?.supporters || [];
    const inspiredBy = activeDevotional?.inspiredBy || [];
    const connectedBy = activeDevotional?.connectedBy || [];
    const hasAmened = user ? supporters.includes(user.uid) : false;
    const hasInspired = user ? inspiredBy.includes(user.uid) : false;
    const hasCelebrated = user ? connectedBy.includes(user.uid) : false;

    useEffect(() => {
        if (activeDevotional) {
            const checkTruncation = () => {
                if (devotionalTextRef.current) {
                    setIsDevotionalTruncated(
                        devotionalTextRef.current.scrollHeight > devotionalTextRef.current.clientHeight
                    );
                }
            };
            setTimeout(checkTruncation, 100);
            window.addEventListener('resize', checkTruncation);
            return () => window.removeEventListener('resize', checkTruncation);
        }
    }, [activeDevotional]);

    const scheduledDevotionalsQuery = useMemo(() => {
        if (!firestore || !fellowshipId) return null;
        return query(collection(firestore, 'fellowships', fellowshipId, 'devotionals'), orderBy('scheduledDate', 'asc'), limit(60));
    }, [firestore, fellowshipId]);
    const { data: scheduledDevotionals, loading: loadingSchedule } = useCollection<DailyDevotional>(scheduledDevotionalsQuery);

    const form = useForm<z.infer<typeof devotionalSchema>>({
        resolver: zodResolver(devotionalSchema),
        defaultValues: {
            title: '',
            scripture: '',
            text: '',
            prayer: '',
            scheduledDate: viewDateStr,
        },
    });

    const handleEditDevotional = (devo: DailyDevotional) => {
        form.reset({
            title: devo.title,
            scripture: devo.scripture,
            text: devo.text,
            prayer: devo.prayer || '',
            scheduledDate: devo.scheduledDate,
        });
    };

    const handleShare = async () => {
        if (!fellowship) return;
        const shareUrl = window.location.href;
        let shareText = `Join the '${fellowship.name}' fellowship on Testify!`;
        
        if (activeDevotional) {
            shareText = `Read today's word: '${activeDevotional.title}' in the '${fellowship.name}' fellowship on Testify!`;
        }

        const shareData = {
          title: fellowship.name,
          text: shareText,
          url: shareUrl,
        };

        try {
          if (navigator && navigator.share) {
            await navigator.share(shareData);
          } else {
            throw new Error('Native share not supported');
          }
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            try {
              await navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`);
              toast({ title: 'Link Copied!', description: 'Fellowship link has been copied to your clipboard.' });
            } catch (clipErr) {
              console.error("Clipboard fallback failed", clipErr);
            }
        }
    };

    const membersQuery = useMemo(() => {
        if (!firestore || !fellowshipId || !(isMember || isOrganizer)) return null;
        return query(collection(firestore, 'fellowships', fellowshipId, 'members'), orderBy('joinedAt', 'desc'));
    }, [firestore, fellowshipId, isMember, isOrganizer]);
    const { data: members, loading: loadingMembers } = useCollection<FellowshipMember>(membersQuery);

    const soulsQuery = useMemo(() => {
        if (!firestore || !fellowshipId || !(isMember || isOrganizer) || !fellowship) return null;
        const soulQueryField = fellowship.groupType === 'Association' ? 'associationId' : 'fellowshipId';
        return query(collection(firestore, 'souls'), where(soulQueryField, '==', fellowshipId));
    }, [firestore, fellowshipId, isMember, isOrganizer, fellowship?.groupType]);
    const { data: assignedSouls, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

    const activeSoul = useMemo(() => {
        if (!selectedSoulId || !assignedSouls) return null;
        return assignedSouls.find(s => s.id === selectedSoulId) || null;
    }, [selectedSoulId, assignedSouls]);

    const handleSaveDevotional = async (values: z.infer<typeof devotionalSchema>) => {
        if (!user || !firestore || !fellowship) return;
        setIsSavingDevotional(true);

        const devotionalRef = doc(firestore, 'fellowships', fellowshipId, 'devotionals', values.scheduledDate);
        
        const devotionalData: any = {
            title: values.title,
            text: values.text,
            scripture: values.scripture,
            prayer: values.prayer || '',
            scheduledDate: values.scheduledDate,
            authorId: user.uid,
            authorName: `${userProfile?.firstName} ${userProfile?.lastName}`,
            updatedAt: serverTimestamp(),
        };

        if (!activeDevotional || activeDevotional.scheduledDate !== values.scheduledDate) {
            devotionalData.createdAt = serverTimestamp();
            devotionalData.supporters = [];
            devotionalData.inspiredBy = [];
            devotionalData.connectedBy = [];
        }

        setDoc(devotionalRef, devotionalData, { merge: true })
            .then(() => {
                toast({ 
                    title: 'Success', 
                    description: `Devotional for ${format(new Date(values.scheduledDate), 'MMM d')} is set.` 
                });
                setIsDevotionalDialogOpen(false);
            })
            .catch(async (serverError: any) => {
                if (serverError.code === 'permission-denied') {
                  const permissionError = new FirestorePermissionError({ 
                      path: devotionalRef.path, 
                      operation: 'write',
                      requestResourceData: devotionalData
                  }, user);
                  errorEmitter.emit('permission-error', permissionError);
                } else {
                  toast({
                    variant: 'destructive',
                    title: 'Update Failed',
                    description: serverError.message || 'An unexpected error occurred.'
                  });
                }
            })
            .finally(() => {
                setIsSavingDevotional(false);
            });
    };

    const handleReaction = (type: 'amen' | 'inspired' | 'celebrate') => {
        if (!user || !firestore || !activeDevotional) return;
        const hasReacted = (type === 'amen' && hasAmened) || (type === 'inspired' && hasInspired) || (type === 'celebrate' && hasCelebrated);
        setIsProcessingReaction(type);
        
        const devoRef = doc(firestore, 'fellowships', fellowshipId, 'devotionals', viewDateStr);
        const field = type === 'amen' ? 'supporters' : type === 'inspired' ? 'inspiredBy' : 'connectedBy';
        const updatePayload = { [field]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid) };
        
        updateDoc(devoRef, updatePayload)
            .catch(() => {
                const permissionError = new FirestorePermissionError({ path: devoRef.path, operation: 'update', requestResourceData: updatePayload }, user);
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => setIsProcessingReaction(null));
    }

    const handleDeleteMember = async () => {
        if (!user || !firestore || !fellowship || !isOrganizer || !memberToRemove) return;
        setIsProcessingRemoval(true);
        
        const memberId = memberToRemove.userId;
        const batch = writeBatch(firestore);
        
        batch.delete(doc(firestore, 'fellowships', fellowshipId, 'members', memberId));
        batch.update(doc(firestore, 'fellowships', fellowshipId), {
            memberIds: arrayRemove(memberId),
            memberCount: increment(-1)
        });
        batch.delete(doc(firestore, 'users', memberId, 'fellowships', fellowshipId));

        try {
            await batch.commit();
            setMemberToRemove(null);
            toast({ title: "Member Removed" });
        } catch (e) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `fellowships/${fellowshipId}/members/${memberId}`, operation: 'delete' }, user));
        } finally {
            setIsProcessingRemoval(false);
        }
    };

    const handleRemoveSoul = async () => {
        if (!user || !firestore || !fellowship || !isOrganizer || !soulToUnassign) return;
        setIsProcessingRemoval(true);

        const soul = soulToUnassign;
        const batch = writeBatch(firestore);
        const groupTypeField = fellowship?.groupType === 'Association' ? 'associationId' : 'fellowshipId';
        const groupTypeNameField = fellowship?.groupType === 'Association' ? 'associationName' : 'fellowshipName';

        const update = {
            [groupTypeField]: deleteField(),
            [groupTypeNameField]: deleteField(),
            updatedAt: serverTimestamp()
        };

        batch.update(doc(firestore, 'souls', soul.id), update);
        batch.update(doc(firestore, 'users', soul.userId, 'souls', soul.id), update);

        try {
            await batch.commit();
            setSoulToUnassign(null);
            toast({ title: "Convert Unassigned" });
        } catch (e) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `souls/${soul.id}`, operation: 'update' }, user));
        } finally {
            setIsProcessingRemoval(false);
        }
    };

    const handleStartGroupChat = async () => {
        if (!user || !firestore || !fellowship || !members) return;
        setIsChatLoading(true);
        
        const participantIds = fellowship.memberIds;
        const participantInfo: { [key: string]: any } = {};
        members.forEach(m => {
            participantInfo[m.userId] = {
                firstName: m.firstName,
                lastName: m.lastName,
                photoURL: m.photoURL || '',
            };
        });

        const batch = writeBatch(firestore);
        const chatDocRef = doc(firestore, 'chats', fellowshipId);
        
        batch.set(chatDocRef, {
            participantIds,
            participantInfo,
            fellowshipId: fellowshipId,
            campaignTitle: fellowship.name,
            lastUpdatedAt: serverTimestamp(),
            isGroupChat: true,
            hasMessages: false,
        }, { merge: true });

        const fellowshipRef = doc(firestore, 'fellowships', fellowshipId);
        batch.update(fellowshipRef, { hasGroupChat: true });

        try {
            await batch.commit();
            router.push(`/dashboard/chats/${fellowshipId}`);
        } catch (e) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `chats/${fellowshipId}`, operation: 'create' }, user));
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleDateNav = (direction: 'prev' | 'next') => {
        setViewDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1));
    };

    const loading = fellowshipLoading || profileLoading || loadingMembers || soulsLoading || devoLoading;

    if (loading) return <div className="flex items-center justify-center h-full py-20"><Loader2 className="animate-spin text-primary" /></div>;
    if (fellowshipError || !fellowship || fellowship.status === 'deleted') return <div className="text-center p-12"><Loader2 className="mx-auto h-12 w-12 opacity-20" /><h2 className="mt-4 text-xl font-bold">Group Not Found</h2><Button asChild variant="outline" className="mt-4"><NextLink href="/dashboard/fellowship">Return to Directory</NextLink></Button></div>;

    const ScheduleList = (
        <div className="space-y-4">
            {loadingSchedule ? (
                <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>
            ) : scheduledDevotionals && scheduledDevotionals.length > 0 ? (
                <div className="grid gap-3">
                    {scheduledDevotionals.map(devo => {
                        const isSelected = isSameDay(parseISO(devo.scheduledDate), viewDate);
                        return (
                            <button
                                key={devo.scheduledDate}
                                onClick={() => { setViewDate(parseISO(devo.scheduledDate)); setIsScheduleViewOpen(false); }}
                                className={cn(
                                    "text-left p-4 rounded-2xl border transition-all relative overflow-hidden group",
                                    isSelected ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20" : "bg-card hover:bg-muted/30 hover:border-primary/10"
                                )}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">{format(parseISO(devo.scheduledDate), 'EEEE, MMM d')}</span>
                                    {isSameDay(parseISO(devo.scheduledDate), new Date()) && <Badge className="bg-white text-primary h-4 px-1.5 font-black uppercase text-[7px] tracking-widest animate-pulse border-none">Today</Badge>}
                                </div>
                                <p className="font-bold text-sm truncate pr-6 break-words [overflow-wrap:anywhere]">{devo.title}</p>
                                <p className="text-[9px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter italic break-words [overflow-wrap:anywhere]">Ref: {devo.scripture}</p>
                                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="py-16 text-center text-muted-foreground italic border-2 border-dashed rounded-3xl">
                    <CalendarDays className="h-10 w-10 mx-auto opacity-10 mb-4" />
                    <p className="text-sm font-medium">No future words scheduled yet.</p>
                </div>
            )}
        </div>
    );

    const HeaderActions = (
        <div className="flex items-center gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={handleShare}
                            className="h-9 w-9 sm:h-12 sm:w-12 rounded-full shadow-lg transition-all active:scale-90 bg-background border-primary/20 text-primary/60 hover:text-primary hover:bg-primary/5"
                        >
                            <Share2 className="h-4 w-4 sm:h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-[10px] font-bold uppercase">Share Fellowship</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {(isMember || isOrganizer) && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant={fellowship.hasGroupChat ? "default" : "outline"}
                                size="icon" 
                                onClick={fellowship.hasGroupChat ? () => router.push(`/dashboard/chats/${fellowshipId}`) : handleStartGroupChat}
                                disabled={isChatLoading || (!fellowship.hasGroupChat && isOrganizer && (!members || members.length < 2))}
                                className={cn(
                                    "h-9 w-9 sm:h-12 sm:w-12 rounded-full shadow-lg transition-all active:scale-90 relative shrink-0",
                                    fellowship.hasGroupChat && "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                                )}
                            >
                                {isChatLoading ? <Loader2 className="h-4 w-4 sm:h-5 w-5 animate-spin" /> : <MessagesSquare className="h-4 w-4 sm:h-5 w-5" />}
                                {!fellowship.hasGroupChat && isOrganizer && members && members.length >= 2 && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                    </span>
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{fellowship.hasGroupChat ? "Open Group Chat" : isOrganizer ? "Start Group Chat" : "Chat coming soon"}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    );

    return (
        <div className="space-y-6 md:space-y-10 w-full max-w-6xl mx-auto pt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-4 sm:px-0">
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 h-9 w-9 sm:h-12 sm:w-12 rounded-full border bg-background shadow-sm hover:bg-muted/50">
                        <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6"/>
                        <span className="sr-only">Back</span>
                    </Button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl md:text-4xl font-black font-headline tracking-tight truncate leading-tight uppercase text-balance break-words [overflow-wrap:anywhere]">{fellowship.name}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="uppercase font-bold tracking-[0.2em] text-[8px] sm:text-[10px] px-2 h-5 shrink-0">{fellowship.groupType || 'Fellowship'}</Badge>
                            <span className="text-[9px] sm:xs text-muted-foreground font-medium uppercase tracking-widest opacity-60 truncate">Global Community</span>
                        </div>
                    </div>
                </div>
                <div className="flex w-full sm:w-auto justify-end sm:ml-auto">
                    {HeaderActions}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
                <div className="space-y-8 lg:col-span-2">
                    <Card className="rounded-none sm:rounded-[2.5rem] border-x-0 sm:border-x shadow-none sm:shadow-xl border-none bg-primary text-primary-foreground overflow-hidden border-b-8 border-b-white/10">
                        <CardHeader className="p-6 sm:p-10 pb-6 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="flex items-center justify-center h-5 w-5 bg-white/10 rounded-full">
                                        <BookOpen className="h-3 w-3 opacity-80" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-0.3em opacity-80">DEVOTIONAL FOR TODAY</span>
                                    {isViewingToday && (
                                        <Badge className="bg-white text-primary h-4 px-1.5 font-black uppercase text-[7px] tracking-widest animate-pulse border-none">
                                            Today
                                        </Badge>
                                    )}
                                </div>
                                <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-black font-headline tracking-tight uppercase leading-tight sm:leading-none break-words [overflow-wrap:anywhere] text-balance flex items-center gap-3">
                                    <MessageSquare className="h-6 w-6 opacity-40 shrink-0" />
                                    {activeDevotional?.title || (devoLoading ? 'Checking...' : (fellowship?.groupType === 'Association' ? 'Association Word' : 'The Living Word'))}
                                </CardTitle>
                                <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] opacity-70 mt-2">
                                    {format(viewDate, 'EEEE, MMMM d, yyyy')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                className="h-10 w-10 sm:h-14 sm:w-14 rounded-[1.25rem] bg-white/10 border-white/20 hover:bg-white/20 text-white shadow-xl"
                                                onClick={() => setIsScheduleViewOpen(true)}
                                            >
                                                <CalendarClock className="h-5 w-5 sm:h-6 sm:w-6" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p className="text-[10px] font-bold uppercase">View Schedule</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                {(isMember || isOrganizer) && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="h-10 w-10 sm:h-14 sm:w-14 rounded-[1.25rem] bg-white/10 border-white/20 hover:bg-white/20 text-white shadow-xl"
                                                    onClick={() => {
                                                        if (activeDevotional) {
                                                            handleEditDevotional(activeDevotional);
                                                        } else {
                                                            form.reset({
                                                                title: '',
                                                                scripture: '',
                                                                text: '',
                                                                prayer: '',
                                                                scheduledDate: viewDateStr,
                                                            });
                                                        }
                                                        setIsDevotionalDialogOpen(true);
                                                    }}
                                                >
                                                    <Edit className="h-5 w-5 sm:h-6 sm:w-6" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p className="text-[10px] font-bold uppercase">{activeDevotional ? 'Arrange Word' : 'Publish Word'}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="px-6 sm:px-10 pt-0 pb-8 sm:pb-12 space-y-8">
                            {devoLoading ? (
                                <div className="py-20 flex flex-col items-center gap-4">
                                    <Loader2 className="h-10 w-10 animate-spin opacity-20" />
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-20">Accessing Records...</p>
                                </div>
                            ) : activeDevotional ? (
                                <div className="space-y-8">
                                    <div className="bg-black/60 rounded-[2rem] p-6 sm:p-12 border border-white/20 relative shadow-2xl group overflow-hidden">
                                        <div className="absolute -top-6 -right-6 h-24 w-24 bg-white/5 rounded-full blur-2xl" />
                                        <Quote className="absolute top-6 right-8 h-12 w-12 opacity-10 rotate-12 transition-transform group-hover:scale-110" />
                                        <div className="space-y-1">
                                            <p 
                                                ref={devotionalTextRef}
                                                className="text-lg sm:text-2xl font-serif italic leading-relaxed text-justify text-balance relative z-10 break-words [overflow-wrap:anywhere] text-white font-medium line-clamp-[12] sm:line-clamp-6"
                                            >
                                                {activeDevotional.text}
                                            </p>
                                            {isDevotionalTruncated && (
                                                <FullDevotionalDialog 
                                                    devotional={activeDevotional}
                                                    fellowshipId={fellowshipId}
                                                    commentCount={commentCount}
                                                    supporters={supporters}
                                                    inspiredBy={inspiredBy}
                                                    connectedBy={connectedBy}
                                                >
                                                    <button className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em] hover:text-white transition-colors relative z-20 mt-6 flex items-center gap-1.5 border border-white/20 px-4 py-1.5 rounded-full bg-white/5 shadow-lg">
                                                        READ FULL WORD <ChevronDown className="h-3 w-3" />
                                                    </button>
                                                </FullDevotionalDialog>
                                            )}
                                        </div>
                                        <p className="text-xs sm:text-sm font-black uppercase text-white text-right mt-10 tracking-widest border-t border-white/20 pt-4 relative z-10 break-words [overflow-wrap:anywhere]">— {activeDevotional.scripture}</p>
                                    </div>
                                    
                                    {activeDevotional.prayer && (
                                        <div className="bg-white/15 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-10 border border-dashed border-white/30 relative group/prayer overflow-hidden">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/20 flex items-center justify-center">
                                                    <HandHeart className="h-4 w-4 text-white" />
                                                </div>
                                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-0.3em text-white/90">PRAYER FOR TODAY</span>
                                            </div>
                                            <p className="text-base sm:text-lg font-medium text-white leading-relaxed text-justify italic break-words [overflow-wrap:anywhere] text-balance">
                                                {activeDevotional.prayer}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                                            <div className="flex items-center gap-1.5 sm:gap-3">
                                                <Button onClick={() => handleReaction('amen')} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("h-9 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all", hasAmened && "bg-white/20 border-white/30")}>
                                                    {isProcessingReaction === 'amen' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HandHeart className={cn("h-3.5 w-3.5", hasAmened && "fill-current")} />}
                                                    <span>Amen</span>
                                                </Button>
                                                <Button onClick={() => handleReaction('inspired')} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("h-9 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all", hasInspired && "bg-white/20 border-white/30")}>
                                                    {isProcessingReaction === 'inspired' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className={cn("h-3.5 w-3.5", hasInspired && "fill-current")} />}
                                                    <span>Hallelujah</span>
                                                </Button>
                                                <Button onClick={() => handleReaction('celebrate')} disabled={isProcessingReaction !== null || !user} variant="ghost" size="sm" className={cn("h-9 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all", hasCelebrated && "bg-white/20 border-white/30")}>
                                                    {isProcessingReaction === 'celebrate' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PartyPopper className={cn("h-3.5 w-3.5", hasCelebrated && "fill-current")} />}
                                                    <span>Celebrate</span>
                                                </Button>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className={cn("h-9 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all", isCommentsOpen && "bg-white/20 border-white/30")}
                                                onClick={() => setIsCommentsOpen(true)}
                                            >
                                                <MessageSquare className="h-3.5 w-3.5" />
                                                <span>{commentCount} Response{commentCount !== 1 && 's'}</span>
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                                        <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-full border border-white/10">
                                            <Sparkles className="h-4 w-4 text-white fill-current" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white truncate max-w-[200px]">Messenger: {activeDevotional.authorName}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 bg-white/10 rounded-2xl p-1.5 border border-white/10 shadow-2xl w-full sm:w-auto">
                                            <Button variant="ghost" className="flex-1 sm:flex-none h-10 px-4 text-white hover:bg-white/10 rounded-xl gap-2 font-black text-[10px] uppercase tracking-widest" onClick={() => handleDateNav('prev')}>
                                                <ChevronLeft className="h-4 w-4" /> Prev
                                            </Button>
                                            <Separator orientation="vertical" className="h-6 bg-white/20" />
                                            <Button variant="ghost" className="flex-1 sm:flex-none h-10 px-4 text-white hover:bg-white/10 rounded-xl gap-2 font-black text-[10px] uppercase tracking-widest" onClick={() => handleDateNav('next')}>
                                                Next <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {!isViewingToday && (
                                        <Button 
                                            variant="ghost" 
                                            className="w-full text-[11px] font-black uppercase tracking-0.3em text-white/60 hover:text-white hover:bg-white/10 h-10 rounded-2xl border border-white/10 border-dashed"
                                            onClick={() => setViewDate(new Date())}
                                        >
                                            <CalendarDays className="mr-2 h-4 w-4" /> Jump to Today
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-20 sm:py-24 bg-white/5 rounded-[2.5rem] border-2 border-dashed border-white/10 mx-auto flex flex-col items-center px-8 shadow-inner">
                                    <BookOpen className="h-16 w-16 opacity-10 mb-6" />
                                    <h4 className="text-xl font-black uppercase tracking-tight opacity-40">Spiritual Silence</h4>
                                    <p className="text-sm font-medium opacity-40 mt-2 italic max-w-sm text-balance leading-relaxed">
                                        No word arranged for {isViewingToday ? 'today' : format(viewDate, 'MMM d')} yet.
                                    </p>
                                    
                                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-12 w-full sm:w-auto">
                                          <Button variant="outline" className="bg-white/5 border-white/10 text-white rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-[10px] shadow-lg order-2 sm:order-1" onClick={() => handleDateNav('prev')}><ChevronLeft className="mr-2 h-4 w-4" /> PREVIOUS</Button>
                                          
                                          {(isMember || isOrganizer) && (
                                              <Button 
                                                  variant="secondary" 
                                                  className="font-black rounded-2xl h-12 px-10 shadow-2xl text-[10px] uppercase tracking-[0.2em] order-1 sm:order-2"
                                                  onClick={() => {
                                                      form.reset({
                                                          title: '',
                                                          scripture: '',
                                                          text: '',
                                                          prayer: '',
                                                          scheduledDate: viewDateStr,
                                                      });
                                                      setIsDevotionalDialogOpen(true);
                                                  }}
                                              >
                                                  PUBLISH WORD
                                              </Button>
                                          )}

                                          <Button variant="outline" className="bg-white/5 border-white/10 text-white rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-[10px] shadow-lg order-3" onClick={() => handleDateNav('next')}>NEXT <ChevronRight className="ml-2 h-4 w-4" /></Button>
                                      </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-none sm:rounded-[2.5rem] border-x-0 sm:border-x shadow-none sm:shadow-sm border-none bg-muted/20">
                        <CardHeader className="p-6 sm:p-10">
                            <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">About this Group</CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 sm:p-10 pb-8 sm:pb-12">
                            <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap font-medium text-balance break-words [overflow-wrap:anywhere]">
                                {fellowship.description}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-none sm:rounded-[2.5rem] border-x-0 sm:border-x shadow-none sm:shadow-sm border-none bg-background border border-muted-foreground/10 overflow-hidden">
                        <CardHeader className="p-6 sm:p-10 border-b bg-muted/5">
                            <CardTitle className="flex items-center justify-between text-base sm:text-lg font-black uppercase tracking-[0.1em]">
                                <span className="flex items-center gap-2.5">
                                    <Users className="h-5 w-5 text-primary" />
                                    Directory
                                </span>
                                <Badge variant="secondary" className="rounded-full px-3 h-6 font-bold">{(members?.length || 0) + (assignedSouls?.length || 0)}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                           {(isMember || isOrganizer) ? (
                               <Tabs defaultValue="believers" className="w-full">
                                    <TabsList className="flex w-full bg-muted/10 h-14 p-0 rounded-none border-b overflow-x-auto no-scrollbar">
                                        <TabsTrigger value="believers" className="flex-1 text-xs sm:text-sm font-bold h-full rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none border-r last:border-r-0 truncate px-4">Believers ({members?.length || 0})</TabsTrigger>
                                        <TabsTrigger value="souls" className="flex-1 text-xs sm:text-sm font-bold h-full rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none border-r last:border-r-0 truncate px-4">Converts ({assignedSouls?.length || 0})</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="believers" className="mt-0 p-4 sm:p-10">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {members?.map(member => (
                                                <div key={member.id} className="flex items-center gap-4 p-4 rounded-2xl border bg-muted/5 transition-all hover:bg-muted/10 group min-w-0">
                                                    <NextLink 
                                                        href={member.userId === user?.uid ? '/dashboard/profile' : `/dashboard/profile/${member.userId}`} 
                                                        className="flex items-center gap-4 flex-1 min-w-0 group/member"
                                                    >
                                                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border shadow-sm shrink-0 transition-transform group-hover/member:scale-105">
                                                            <AvatarImage src={member.photoURL} className="object-cover" />
                                                            <AvatarFallback className="text-xs sm:text-sm font-black bg-primary/10 text-primary">{member.firstName?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-black truncate text-sm sm:text-base leading-tight break-words [overflow-wrap:anywhere] uppercase tracking-tight group-hover/member:text-primary transition-colors">{member.firstName} {member.lastName}</p>
                                                            {member.userId === fellowship.organizerId && <span className="text-[8px] font-black uppercase text-primary tracking-[0.15em] block mt-1">Organizer</span>}
                                                        </div>
                                                    </NextLink>
                                                    {isOrganizer && member.userId !== user?.uid && (
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive opacity-40 hover:opacity-100 hover:bg-destructive/10 rounded-full" onClick={() => setMemberToRemove(member)}><UserMinus className="h-4 w-4" /></Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="souls" className="mt-0 p-4 sm:p-10">
                                        <div className="flex items-center justify-between mb-6 px-1">
                                            <div className="flex items-center gap-2">
                                                <Heart className="h-4 w-4 text-primary" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Assigned Converts</span>
                                            </div>
                                            <Button onClick={() => setIsLogSoulOpen(true)} size="sm" className="h-8 px-4 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-md transition-transform active:scale-95">
                                                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                                                Log Soul
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {assignedSouls && assignedSouls.length > 0 ? assignedSouls.map(soul => (
                                                <div key={soul.id} className="flex items-center gap-4 p-4 rounded-2xl border bg-primary/5 transition-all hover:bg-muted/10 group min-w-0">
                                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20"><Heart className="h-5 w-5 text-primary fill-current" /></div>
                                                    <div className="flex-1 min-w-0">
                                                        <button 
                                                            onClick={() => { setSelectedSoulId(soul.id); setIsSoulDetailsOpen(true); }}
                                                            className="font-black truncate text-sm sm:text-base leading-tight break-words [overflow-wrap:anywhere] uppercase tracking-tight hover:text-primary transition-colors text-left w-full"
                                                        >
                                                            {soul.firstName} {soul.lastName}
                                                        </button>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge className="h-4 text-[8px] sm:text-[9px] font-black uppercase tracking-widest" variant="secondary">{soul.status}</Badge>
                                                            <button 
                                                                onClick={() => { setSelectedSoulId(soul.id); setIsLogFollowUpOpen(true); }}
                                                                className="text-[8px] font-black uppercase text-primary/60 hover:text-primary transition-colors hover:underline tracking-tighter"
                                                            >
                                                                Log Follow-up
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <Button variant="outline" size="sm" className="h-8 sm:h-9 text-[10px] sm:text-[11px] font-black uppercase tracking-widest px-4 rounded-xl shadow-sm" onClick={() => { setSelectedSoulId(soul.id); setIsSoulDetailsOpen(true); }}>Details</Button>
                                                </div>
                                            )) : (
                                                <div className="col-span-full py-12 text-center flex flex-col items-center">
                                                    <Heart className="h-10 w-10 text-muted-foreground opacity-10 mb-4" />
                                                    <p className="text-xs text-muted-foreground italic max-w-xs mx-auto">No converts have been assigned to this group yet.</p>
                                                    <Button variant="outline" size="sm" className="mt-4 h-8 rounded-xl font-bold text-[10px] uppercase" onClick={() => setIsLogSoulOpen(true)}>Log First Soul</Button>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                               </Tabs>
                           ) : (
                               <div className="p-16 sm:p-24 text-center bg-muted/30 flex flex-col items-center">
                                   <div className="h-16 w-16 sm:h-20 sm:w-20 bg-muted/20 rounded-full flex items-center justify-center mb-8">
                                       <Users className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground opacity-20" />
                                   </div>
                                   <p className="text-xs sm:text-base text-muted-foreground italic px-12 leading-relaxed font-medium max-w-md mx-auto text-balance">Join this community to access the shared directory and spiritual history.</p>
                               </div>
                           )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8 flex flex-col px-4 sm:px-0 pb-32">
                    <Card className="rounded-[1.5rem] sm:rounded-[2.5rem] shadow-sm border-none bg-background border border-muted-foreground/10 overflow-hidden border-b-8 border-b-primary/10">
                        <CardHeader className="p-6 sm:p-8 pb-3 sm:pb-4">
                            <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5"><Calendar className="h-4 w-4 text-primary"/> Gathering Details</CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 sm:px-8 pb-8 sm:pb-10 space-y-5 sm:space-y-6 pt-2">
                            {fellowship.schedule && (
                                <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-dashed">
                                    <p className="font-black text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Schedule</p>
                                    <p className="text-foreground font-black text-xs sm:text-base leading-tight text-balance break-words [overflow-wrap:anywhere]">{fellowship.schedule}</p>
                                </div>
                            )}
                            {fellowship.location && (
                                <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-dashed">
                                    <p className="font-black text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Primary Location</p>
                                    <p className="text-foreground font-black text-xs sm:text-base flex items-start gap-2 leading-tight break-words [overflow-wrap:anywhere] text-balance">
                                        <MapPin className="h-4 w-4 sm:h-5 w-5 text-primary shrink-0 mt-0.5" /> {fellowship.location}
                                    </p>
                                </div>
                            )}
                            
                            {(isMember || isOrganizer) && fellowship.streamUrl && (
                                <Button asChild className="w-full h-14 sm:h-16 font-black rounded-2xl shadow-xl transition-all active:scale-95 text-sm sm:text-base uppercase tracking-widest">
                                    <NextLink href={fellowship.streamUrl} target="_blank" rel="noopener noreferrer">
                                        <PlayCircle className="mr-3 h-5 sm:h-6 w-5 sm:w-6" />
                                        ENTER MEETING
                                    </NextLink>
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-[1.5rem] sm:rounded-[2.5rem] shadow-sm border-none bg-background border border-muted-foreground/10 border-b-8 border-b-primary/5">
                        <CardHeader className="p-6 sm:p-8 pb-3 sm:pb-4">
                            <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Organizer</CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 sm:px-8 pb-8 sm:pb-12 pt-2">
                            <NextLink href={isOrganizer ? '/dashboard/profile' : `/dashboard/profile/${fellowship.organizerId}`} className="flex items-center gap-4 group bg-muted/20 p-4 sm:p-5 rounded-2xl border border-dashed transition-all hover:bg-muted/40 hover:border-primary/20 min-w-0 shadow-inner">
                                <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-primary/20 shadow-sm shrink-0">
                                    <AvatarFallback className="font-black text-sm sm:text-base bg-primary/10 text-primary">{fellowship.organizerName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <span className="font-black text-xs sm:text-base group-hover:text-primary transition-colors truncate block leading-tight uppercase tracking-tight">
                                        {fellowship.organizerName}
                                    </span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge className="h-4 sm:h-5 text-[7px] sm:text-[8px] uppercase font-black tracking-widest px-2" variant={isOrganizer ? "default" : "secondary"}>{isOrganizer ? "YOU" : "LEADER"}</Badge>
                                    </div>
                                </div>
                            </NextLink>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {mounted && isMobile ? (
                <Sheet open={isDevotionalDialogOpen} onOpenChange={setIsDevotionalDialogOpen}>
                    <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                        <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                            <SheetHeader className="text-left flex-shrink-0">
                                <SheetTitle className="text-2xl font-black font-headline">Devotional Hub</SheetTitle>
                                <SheetDescription className="text-sm font-medium mt-1">Arrange the Word and Prayer for your group.</SheetDescription>
                            </SheetHeader>
                        </div>
                        <ScrollArea className="flex-grow">
                            <div className="p-8 space-y-10">
                                <Form {...form}>
                                    <form id="devotional-form-mobile" onSubmit={form.handleSubmit(handleSaveDevotional)} className="space-y-6">
                                        <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pin to Date</FormLabel>
                                                <FormControl><Input type="date" min={todayStr} {...field} className="h-12 rounded-2xl bg-muted/20 border-none font-bold" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="title" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Title</FormLabel>
                                                <FormControl><Input placeholder="e.g., Favor & Grace" {...field} className="h-12 rounded-2xl bg-muted/20 border-none font-bold" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="scripture" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Primary Scripture</FormLabel>
                                                <FormControl><Input placeholder="e.g., Psalm 23:1" {...field} className="h-12 rounded-2xl bg-muted/20 border-none font-bold" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="text" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Message Content</FormLabel>
                                                <FormControl><Textarea placeholder="Share the revelation..." className="min-h-[120px] rounded-2xl bg-muted/20 border-none text-base" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="prayer" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Prayer for Today</FormLabel>
                                                <FormControl><Textarea placeholder="Type a guided prayer..." className="min-h-[100px] rounded-2xl bg-muted/20 border-none text-base" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <Button type="submit" form="devotional-form-mobile" disabled={isSavingDevotional} className="w-full h-14 font-black shadow-xl rounded-2xl tracking-widest uppercase">
                                            {isSavingDevotional && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {activeDevotional && activeDevotional.scheduledDate === form.getValues('scheduledDate') ? 'UPDATE WORD' : 'PUBLISH WORD'}
                                        </Button>
                                    </form>
                                </Form>
                            </div>
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
            ) : (
                <Dialog open={isDevotionalDialogOpen} onOpenChange={setIsDevotionalDialogOpen}>
                    <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[2rem] shadow-2xl border-none">
                        <div className="p-8 border-b bg-muted/10">
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-black font-headline tracking-tight uppercase">Devotional Hub</DialogTitle>
                                <DialogDescription className="text-base font-medium">Prepare and schedule spiritual nourishment for your group.</DialogDescription>
                            </DialogHeader>
                        </div>
                        <ScrollArea className="max-h-[75vh]">
                            <div className="p-8">
                                <Form {...form}>
                                    <form id="devotional-form-desktop" onSubmit={form.handleSubmit(handleSaveDevotional)} className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pin to Date</FormLabel>
                                                    <FormControl><Input type="date" min={todayStr} {...field} className="h-11 rounded-xl bg-muted/20 border-none font-bold" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="title" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Title</FormLabel>
                                                    <FormControl><Input placeholder="e.g., Power of Prayer" {...field} className="h-11 rounded-xl bg-muted/20 border-none font-bold" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="scripture" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Primary Scripture</FormLabel>
                                                <FormControl><Input placeholder="e.g., Matthew 6:33" {...field} className="h-11 rounded-xl bg-muted/20 border-none font-bold" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="text" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Message Content</FormLabel>
                                                <FormControl><Textarea placeholder="Type the daily word here..." className="min-h-[120px] rounded-xl bg-muted/20 border-none text-base" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="prayer" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Prayer for Today</FormLabel>
                                                <FormControl><Textarea placeholder="Add a guided prayer..." className="min-h-[100px] rounded-xl bg-muted/20 border-none text-base" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <Button type="submit" form="devotional-form-desktop" disabled={isSavingDevotional} className="w-full h-12 rounded-xl font-black shadow-xl tracking-widest uppercase">
                                            {isSavingDevotional && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {activeDevotional && activeDevotional.scheduledDate === form.getValues('scheduledDate') ? 'UPDATE WORD' : 'PUBLISH WORD'}
                                        </Button>
                                    </form>
                                </Form>
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )}

            {mounted && isMobile ? (
                <>
                <Sheet open={isScheduleViewOpen} onOpenChange={setIsScheduleViewOpen}>
                    <SheetContent side="bottom" className="h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                        <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                            <SheetHeader className="text-left flex-shrink-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <CalendarClock className="h-4 w-4 text-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Spiritual Schedule</span>
                                </div>
                                <SheetTitle className="text-2xl font-black font-headline">Planned Word</SheetTitle>
                                <SheetDescription className="text-sm font-medium mt-1">Browse scheduled meditations for this group.</SheetDescription>
                            </SheetHeader>
                        </div>
                        <ScrollArea className="flex-grow px-8 pt-6">
                            {ScheduleList}
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
                <Sheet open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                    <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] border-t-4 border-t-primary/20">
                        <div className="p-8 border-b shrink-0 bg-muted/10">
                            <SheetHeader className="text-left flex-shrink-0">
                                <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight flex items-center gap-3">
                                    <MessageSquare className="h-6 w-6 text-primary shrink-0" />
                                    Gathered Responses
                                </SheetTitle>
                                <SheetDescription className="text-xs font-bold uppercase tracking-widest">PRAYERS & AGREEMENT FOR {viewDateStr}</SheetDescription>
                            </SheetHeader>
                        </div>
                        <div className="flex-grow min-h-0">
                            <CommentSection path={commentPath} />
                        </div>
                    </SheetContent>
                </Sheet>
                </>
            ) : (
                <>
                <Dialog open={isScheduleViewOpen} onOpenChange={setIsScheduleViewOpen}>
                    <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
                        <div className="p-8 border-b bg-muted/10">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Spiritual Schedule</DialogTitle>
                                <DialogDescription className="text-sm font-medium">Peek ahead at scheduled meditations.</DialogDescription>
                            </DialogHeader>
                        </div>
                        <ScrollArea className="max-h-[60vh] p-6">
                            {ScheduleList}
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
                <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                    <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh] p-0 overflow-hidden rounded-3xl border-t-4 border-t-primary/20">
                        <div className="p-8 border-b shrink-0 bg-muted/10">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight flex items-center gap-3">
                                    <MessageSquare className="h-6 w-6 text-primary shrink-0" />
                                    Gathered Responses
                                </DialogTitle>
                                <SheetDescription className="text-xs font-bold uppercase tracking-widest">COMMUNITY RESPONSES TO THIS WORD</SheetDescription>
                            </DialogHeader>
                        </div>
                        <div className="flex-1 min-h-0">
                            <CommentSection path={commentPath} />
                        </div>
                    </DialogContent>
                </Dialog>
                </>
            )}

            <ViewHistoryDialog 
                soul={activeSoul}
                isOpen={isSoulDetailsOpen}
                onOpenChange={setIsSoulDetailsOpen}
            />

            <LogFollowUpDialog 
                soul={activeSoul}
                isOpen={isLogFollowUpOpen}
                onOpenChange={setIsLogFollowUpOpen}
                onFollowUpLogged={() => {
                    setIsLogFollowUpOpen(false);
                }}
                userProfile={userProfile}
            />
            
            {mounted && isMobile ? (
                <Sheet open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
                    <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                        <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                            <SheetHeader className="text-left">
                                <SheetTitle className="text-2xl font-black font-headline">Log Group Convert</SheetTitle>
                                <SheetDescription className="text-sm font-medium mt-1">Record a new life won directly to this community.</SheetDescription>
                            </SheetHeader>
                        </div>
                        <ScrollArea className="flex-grow">
                            <div className="p-8">
                                <LogSoulForm 
                                    onSoulLogged={() => { setIsLogSoulOpen(false); }} 
                                    fellowships={[]} 
                                    campaigns={[]} 
                                    defaultFellowship={fellowship?.groupType === 'Fellowship' ? fellowship : undefined}
                                    defaultAssociation={fellowship?.groupType === 'Association' ? fellowship : undefined}
                                />
                            </div>
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
            ) : (
                <Dialog open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Log Convert to {fellowship.name}</DialogTitle>
                            <DialogDescription>Record a new life won. This convert will be automatically assigned to this group.</DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[70vh] overflow-y-auto pr-2">
                            <LogSoulForm 
                                onSoulLogged={() => { setIsLogSoulOpen(false); }} 
                                fellowships={[]} 
                                campaigns={[]} 
                                defaultFellowship={fellowship?.groupType === 'Fellowship' ? fellowship : undefined}
                                defaultAssociation={fellowship?.groupType === 'Association' ? fellowship : undefined}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
                <AlertDialogContent className="rounded-3xl p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black font-headline">Remove Member?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium">
                            Are you sure you want to remove {memberToRemove?.firstName} from this community?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 mt-6">
                        <AlertDialogCancel disabled={isProcessingRemoval} className="rounded-2xl h-12 font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteMember} disabled={isProcessingRemoval} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold">
                            {isProcessingRemoval && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Removal
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!soulToUnassign} onOpenChange={(open) => !open && setSoulToUnassign(null)}>
                <AlertDialogContent className="rounded-3xl p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black font-headline">Unassign Convert?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium">
                            Remove {soulToUnassign?.firstName} from this shared list?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 mt-6">
                        <AlertDialogCancel className="rounded-2xl h-12 font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveSoul} disabled={isProcessingRemoval} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold">
                            {isProcessingRemoval && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Unassign
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
