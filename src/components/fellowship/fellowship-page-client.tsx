'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection, useUserProfile } from '@/firebase';
import type { Fellowship, UserProfile, FellowshipMember, Soul, DailyDevotional } from '@/lib/types';
import { doc, collection, query, orderBy, where, writeBatch, serverTimestamp, updateDoc, arrayRemove, increment, deleteField } from 'firebase/firestore';
import { Loader2, ArrowLeft, Users, Calendar, PlayCircle, MapPin, Heart, Phone, Mail, Church, History, PlusCircle, Award, MessagesSquare, User, Info, Sparkles, UserMinus, Trash2, BookOpen, Quote, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { LogFollowUpDialog } from '@/components/souls/log-follow-up-dialog';
import { actionItems, statusOptions } from '@/lib/follow-up-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
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
} from "@/components/ui/alert-dialog";
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';

const devotionalSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(100),
  scripture: z.string().min(3, "Scripture is required.").max(100),
  text: z.string().min(20, "Devotional text is too short.").max(5000),
});

function SoulWinnerInfo({ userId }: { userId: string }) {
    const firestore = useFirestore();
    const winnerRef = useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: winnerProfile, loading } = useDoc<UserProfile>(winnerRef);

    if (loading) return <Skeleton className="h-4 w-24" />;
    if (!winnerProfile) return <span className="text-muted-foreground italic text-xs">Original winner unknown</span>;

    return (
        <Link href={`/dashboard/profile/${userId}`} className="text-primary font-medium hover:underline inline-flex items-center gap-1 min-w-0">
            <Award className="h-3 w-3 shrink-0" />
            <span className="truncate">{winnerProfile.firstName} {winnerProfile.lastName}</span>
        </Link>
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
    const [mounted, setMounted] = useState(false);

    const [selectedSoulId, setSelectedSoulId] = useState<string | null>(null);
    const [isSoulDetailsOpen, setIsSoulDetailsOpen] = useState(false);
    const [isLogFollowUpOpen, setIsLogFollowUpOpen] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isDevotionalDialogOpen, setIsDevotionalDialogOpen] = useState(false);
    const [isSavingDevotional, setIsSavingDevotional] = useState(false);
    
    const [memberToRemove, setMemberToRemove] = useState<FellowshipMember | null>(null);
    const [soulToUnassign, setSoulToUnassign] = useState<Soul | null>(null);
    const [isProcessingRemoval, setIsProcessingRemoval] = useState(false);

    const fellowshipDocRef = useMemo(() => {
        if (!firestore || !fellowshipId) return null;
        return doc(firestore, 'fellowships', fellowshipId);
    }, [firestore, fellowshipId]);
    const { data: fellowship, loading: fellowshipLoading, error: fellowshipError } = useDoc<Fellowship>(fellowshipDocRef);

    const organizerDocRef = useMemo(() => {
        if (!fellowship?.organizerId || !firestore) return null;
        return doc(firestore, 'users', fellowship.organizerId);
    }, [fellowship?.organizerId, firestore]);
    const { data: organizer, loading: organizerLoading } = useDoc<UserProfile>(organizerDocRef);

    const isMember = useMemo(() => {
        if (!user || !fellowship) return false;
        return fellowship.memberIds?.includes(user.uid) || false;
    }, [user, fellowship]);

    const isOrganizer = useMemo(() => {
        if (!user || !fellowship) return false;
        return fellowship.organizerId === user.uid;
    }, [user, fellowship]);

    const form = useForm<z.infer<typeof devotionalSchema>>({
        resolver: zodResolver(devotionalSchema),
        defaultValues: {
            title: fellowship?.dailyDevotional?.title || '',
            scripture: fellowship?.dailyDevotional?.scripture || '',
            text: fellowship?.dailyDevotional?.text || '',
        },
    });

    useEffect(() => {
        if (fellowship?.dailyDevotional) {
            form.reset({
                title: fellowship.dailyDevotional.title,
                scripture: fellowship.dailyDevotional.scripture,
                text: fellowship.dailyDevotional.text,
            });
        }
    }, [fellowship?.dailyDevotional, form]);

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

    const totalDirectoryCount = (members?.length || 0) + (assignedSouls?.length || 0);

    const handleSaveDevotional = async (values: z.infer<typeof devotionalSchema>) => {
        if (!user || !firestore || !fellowship || !isOrganizer) return;
        setIsSavingDevotional(true);

        const fellowshipRef = doc(firestore, 'fellowships', fellowshipId);
        const devotionalData: DailyDevotional = {
            ...values,
            authorId: user.uid,
            authorName: `${userProfile?.firstName} ${userProfile?.lastName}`,
            createdAt: serverTimestamp() as any,
        };

        try {
            await updateDoc(fellowshipRef, { dailyDevotional: devotionalData });
            toast({ title: 'Devotional Posted', description: 'Your daily word has been shared with the group.' });
            setIsDevotionalDialogOpen(false);
        } catch (e) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: fellowshipRef.path, operation: 'update' }, user));
        } finally {
            setIsSavingDevotional(false);
        }
    };

    const handleRemoveMember = async () => {
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
        const groupTypeField = fellowship.groupType === 'Association' ? 'associationId' : 'fellowshipId';
        const groupTypeNameField = fellowship.groupType === 'Association' ? 'associationName' : 'fellowshipName';

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

    useEffect(() => { setMounted(true); }, []);

    if (loading || !mounted) {
        return (
            <div className="flex items-center justify-center h-full py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (fellowshipError || !fellowship || fellowship.status === 'deleted') {
        return (
            <div className="text-center py-12 flex flex-col items-center px-4">
                <Users className="h-16 w-16 text-muted-foreground opacity-20" />
                <h3 className="mt-4 text-xl font-bold font-headline">Group Not Found</h3>
                <p className="mt-2 text-sm text-muted-foreground px-6 leading-relaxed">
                   This group may have been removed or the link is incorrect.
                </p>
                <Button asChild variant="outline" className="mt-6 rounded-full font-bold">
                    <Link href="/dashboard/fellowship"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory</Link>
                </Button>
            </div>
        );
    }

    const soulDetailsContent = activeSoul ? (
      <div className="space-y-8 pt-4 pb-24 sm:pb-6">
          <div className="flex items-center gap-4 border-2 rounded-[2rem] sm:rounded-[2.5rem] p-6 bg-muted/20 border-dashed">
              <div className="h-12 w-12 sm:h-14 sm:w-14 border-2 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Heart className="h-6 w-6 sm:h-7 sm:w-7 text-primary fill-current" />
              </div>
              <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-black font-headline truncate leading-tight text-balance">{activeSoul.firstName} {activeSoul.lastName}</h3>
                  <Badge className={cn("mt-1.5 h-5 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest")} variant="secondary">{activeSoul.status}</Badge>
              </div>
              <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={() => setIsLogFollowUpOpen(true)} size="icon" className="shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-2xl shadow-lg transition-transform active:scale-90">
                            <PlusCircle className="h-5 w-5" />
                            <span className="sr-only">Log Follow-up</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Log Follow-up</p>
                    </TooltipContent>
                </Tooltip>
              </TooltipProvider>
          </div>

          <div className="grid gap-8">
              <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Context & Accountability</h4>
                  <div className="space-y-3 px-1">
                      <div className="text-sm flex items-center gap-3 p-4 rounded-[1.5rem] bg-background border shadow-sm min-w-0">
                          <span className="font-bold text-muted-foreground text-[9px] sm:text-[10px] uppercase tracking-widest shrink-0 ml-1">Won By:</span>
                          <SoulWinnerInfo userId={activeSoul.userId} />
                      </div>
                      {activeSoul.email && (
                          <div className="flex items-center gap-3 text-sm p-4 rounded-[1.5rem] bg-background border shadow-sm min-w-0">
                              <Mail className="h-4 w-4 text-primary shrink-0" />
                              <a href={`mailto:${activeSoul.email}`} className="hover:underline truncate text-sm font-medium">{activeSoul.email}</a>
                          </div>
                      )}
                      {activeSoul.phone && (
                          <div className="flex items-center gap-3 text-sm p-4 rounded-[1.5rem] bg-background border shadow-sm min-w-0">
                              <Phone className="h-4 w-4 text-primary shrink-0" />
                              <a href={`tel:${activeSoul.phone}`} className="hover:underline text-sm font-medium">{activeSoul.phone}</a>
                          </div>
                      )}
                      {activeSoul.church && (
                          <div className="flex items-start gap-3 text-sm p-4 rounded-[1.5rem] bg-background border shadow-sm min-w-0">
                              <Church className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span className="leading-snug text-sm font-medium line-clamp-2">Attends: {activeSoul.church}</span>
                          </div>
                      )}
                  </div>
              </div>

              <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-2">
                      <History className="h-3.5 w-3.5" /> Interaction History
                  </h4>
                  <div className="border rounded-[1.5rem] sm:rounded-[2rem] bg-muted/10 overflow-hidden shadow-inner mx-1">
                      {activeSoul.followUpLog && activeSoul.followUpLog.length > 0 ? (
                          <div className="divide-y max-h-[40vh] sm:max-h-[50vh] overflow-y-auto overscroll-contain">
                              {[...activeSoul.followUpLog].reverse().map((log, i) => {
                                  const date = safeToDate(log.date);
                                  return (
                                      <div key={i} className="p-4 sm:p-5 text-xs space-y-3 bg-background/50">
                                          <div className="flex justify-between items-center text-muted-foreground mb-1">
                                              <span className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-primary/70">{date ? format(date, 'MMM d, yyyy') : 'N/A'}</span>
                                              {log.memberName && (
                                                <span className="text-[8px] sm:text-[9px] font-bold bg-muted px-2 py-0.5 rounded-full border truncate max-w-[100px] sm:max-w-[120px] uppercase tracking-tighter">By {log.memberName}</span>
                                              )}
                                          </div>
                                          {log.actions && log.actions.length > 0 && (
                                              <div className="flex flex-wrap gap-1.5 py-1">
                                                  {log.actions.map(id => {
                                                      const action = actionItems.find(a => a.id === id);
                                                      return action ? <Badge key={id} variant="outline" className="text-[8px] sm:text-[9px] px-1.5 sm:px-2 h-4 uppercase font-bold tracking-tight leading-none bg-background/80">{action.label}</Badge> : null;
                                                  })}
                                              </div>
                                          )}
                                          {log.note && <p className="italic text-muted-foreground leading-relaxed text-xs sm:text-sm text-balance">&ldquo;{log.note}&rdquo;</p>}
                                      </div>
                                  );
                              })}
                          </div>
                      ) : (
                          <div className="text-center py-16 sm:py-20 text-xs text-muted-foreground italic px-10 space-y-3">
                              <Info className="h-8 w-8 mx-auto opacity-10" />
                              <p>No shared interactions yet.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
    ) : null;

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-32">
            <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-0">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full border bg-background shadow-sm hover:bg-muted/50">
                    <ArrowLeft className="h-4 w-4 sm:h-5 w-5"/>
                    <span className="sr-only">Back</span>
                </Button>
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl md:text-4xl font-black font-headline tracking-tight truncate leading-tight uppercase text-balance">{fellowship.name}</h1>
                    <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="uppercase font-bold tracking-[0.2em] text-[8px] sm:text-[10px] px-2 h-5 shrink-0">{fellowship.groupType || 'Fellowship'}</Badge>
                        <span className="text-[9px] sm:text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60 truncate">Global Community</span>
                    </div>
                </div>

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
                                    {isChatLoading ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <MessagesSquare className="h-4 w-4 sm:h-5 sm:w-5" />}
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="space-y-6 sm:space-y-8 flex flex-col order-first lg:order-last px-4 sm:px-0">
                    <Card className="rounded-[1.5rem] sm:rounded-[2.5rem] shadow-sm border-none bg-background border border-muted-foreground/10 overflow-hidden">
                        <CardHeader className="p-5 sm:p-8 pb-2 sm:pb-3">
                            <CardTitle className="text-[10px] sm:text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4 text-primary"/> Gathering Details</CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 sm:px-8 pb-6 sm:pb-8 space-y-4 sm:space-y-5 pt-1 sm:pt-2">
                            {fellowship.schedule && (
                                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-muted/30 border border-dashed">
                                    <p className="font-black text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1 sm:mb-1.5">Schedule</p>
                                    <p className="text-foreground font-bold text-xs sm:text-sm leading-tight text-balance">{fellowship.schedule}</p>
                                </div>
                            )}
                            {fellowship.location && (
                                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-muted/30 border border-dashed">
                                    <p className="font-black text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1 sm:mb-1.5">Location Area</p>
                                    <p className="text-foreground font-bold text-xs sm:text-sm flex items-start gap-1.5 leading-tight break-words text-balance">
                                        <MapPin className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary shrink-0 mt-0.5" /> {fellowship.location}
                                    </p>
                                </div>
                            )}
                            
                            {(isMember || isOrganizer) && fellowship.streamUrl && (
                                <Button asChild className="w-full h-12 sm:h-14 font-black rounded-2xl shadow-md transition-transform active:scale-95 text-sm sm:text-base">
                                    <Link href={fellowship.streamUrl} target="_blank" rel="noopener noreferrer">
                                        <PlayCircle className="mr-2 h-4 sm:h-5 w-4 sm:w-5" />
                                        GATHER ONLINE
                                    </Link>
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-[1.5rem] sm:rounded-[2.5rem] shadow-sm border-none bg-background border border-muted-foreground/10">
                        <CardHeader className="p-5 sm:p-8 pb-2 sm:pb-3">
                            <CardTitle className="text-[10px] sm:text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Lead Organizer</CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 sm:px-8 pb-6 sm:pb-8 pt-1 sm:pt-2">
                            <Link href={isOrganizer ? '/dashboard/profile' : `/dashboard/profile/${fellowship.organizerId}`} className="flex items-center gap-3 sm:gap-4 group bg-muted/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-dashed transition-all hover:bg-muted/40 hover:border-primary/20 min-w-0">
                                <Avatar className="h-9 w-9 sm:h-11 sm:w-11 border-2 border-primary/20 shadow-sm shrink-0">
                                    <AvatarFallback className="font-black text-xs sm:text-sm bg-primary/10 text-primary">{fellowship.organizerName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <span className="font-black text-xs sm:text-base group-hover:text-primary transition-colors truncate block leading-tight">
                                        {fellowship.organizerName}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Badge className="h-3.5 sm:h-4 text-[6px] sm:text-[7px] uppercase font-black tracking-widest px-1 sm:px-1.5" variant={isOrganizer ? "default" : "secondary"}>{isOrganizer ? "YOU" : "LEADER"}</Badge>
                                    </div>
                                </div>
                            </Link>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6 sm:order-last lg:order-first px-0 sm:px-0">
                    {/* Daily Devotional Section */}
                    <Card className="rounded-none sm:rounded-[2.5rem] border-x-0 sm:border-x shadow-none sm:shadow-lg border-none bg-primary text-primary-foreground overflow-hidden">
                        <CardHeader className="p-6 sm:p-10 pb-4 flex flex-row items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <BookOpen className="h-4 w-4 opacity-80" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Daily Devotional</span>
                                </div>
                                <CardTitle className="text-2xl sm:text-3xl font-black font-headline tracking-tight uppercase leading-tight">
                                    {fellowship.dailyDevotional?.title || 'The Daily Word'}
                                </CardTitle>
                            </div>
                            {isOrganizer && (
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white/10 border-white/20 hover:bg-white/20 text-white shrink-0"
                                    onClick={() => setIsDevotionalDialogOpen(true)}
                                >
                                    <Edit className="h-5 w-5" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="px-6 sm:p-10 pt-0 pb-8 sm:pb-10 space-y-6">
                            {fellowship.dailyDevotional ? (
                                <>
                                    <div className="bg-white/5 rounded-[1.5rem] p-6 sm:p-8 border border-white/10 relative shadow-inner group">
                                        <Quote className="absolute top-4 right-6 h-10 w-10 opacity-10 rotate-12 transition-transform group-hover:scale-110" />
                                        <p className="text-lg sm:text-xl font-serif italic leading-relaxed text-justify text-balance">&ldquo;{fellowship.dailyDevotional.text}&rdquo;</p>
                                        <p className="text-[10px] sm:text-xs font-black uppercase text-white/60 text-right mt-6 tracking-widest">— {fellowship.dailyDevotional.scripture}</p>
                                    </div>
                                    <div className="flex items-center justify-between pt-2">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="h-3.5 w-3.5 opacity-60" />
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Shared by {fellowship.dailyDevotional.authorName}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-10 sm:py-16 bg-white/5 rounded-[2rem] border-2 border-dashed border-white/10 mx-auto flex flex-col items-center">
                                    <BookOpen className="h-10 w-10 opacity-20 mb-4" />
                                    <p className="text-sm sm:text-base font-medium opacity-60 px-8 italic">No word shared for today yet.</p>
                                    {isOrganizer && (
                                        <Button 
                                            variant="secondary" 
                                            className="mt-6 font-black rounded-xl h-10 px-8"
                                            onClick={() => setIsDevotionalDialogOpen(true)}
                                        >
                                            POST TODAY'S WORD
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-none sm:rounded-[2.5rem] border-x-0 sm:border-x shadow-none sm:shadow-sm border-none bg-muted/20">
                        <CardHeader className="p-6 sm:p-8">
                            <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">About this Group</CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 sm:px-8 pb-8">
                            <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap font-medium text-balance">
                                {fellowship.description}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-none sm:rounded-[2.5rem] border-x-0 sm:border-x shadow-none sm:shadow-sm border-none bg-background border border-muted-foreground/10 overflow-hidden">
                        <CardHeader className="p-6 sm:p-8 border-b bg-muted/5">
                            <CardTitle className="flex items-center justify-between text-base sm:text-lg font-black uppercase tracking-[0.1em]">
                                <span className="flex items-center gap-2.5">
                                    <Users className="h-5 w-5 text-primary" />
                                    Directory
                                </span>
                                <Badge variant="secondary" className="rounded-full px-3 h-6 font-bold">{totalDirectoryCount}</Badge>
                            </CardTitle>
                             <CardDescription className="text-[11px] sm:text-sm font-medium mt-2 leading-relaxed text-balance">
                                {isMember || isOrganizer 
                                    ? "Collaborative view of believers and converts working the harvest." 
                                    : "Join to access the directory and participate in follow-up."}
                             </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                           {(isMember || isOrganizer) ? (
                               <Tabs defaultValue="believers" className="w-full">
                                    <TabsList className="flex w-full bg-muted/10 h-14 p-0 rounded-none border-b overflow-x-auto no-scrollbar">
                                        <TabsTrigger value="believers" className="flex-1 text-xs sm:text-sm font-bold h-full rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none border-r last:border-r-0 truncate px-4">Believers ({members?.length || 0})</TabsTrigger>
                                        <TabsTrigger value="souls" className="flex-1 text-xs sm:text-sm font-bold h-full rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none border-r last:border-r-0 truncate px-4">Converts ({assignedSouls?.length || 0})</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="believers" className="mt-0 p-4 sm:p-8">
                                        {loadingMembers ? (
                                            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
                                        ) : members && members.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                {members.map(member => (
                                                    <div key={member.id} className="flex items-center gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border bg-muted/5 transition-all hover:bg-muted/10 group min-w-0">
                                                        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border shadow-sm shrink-0">
                                                            <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary">{member.firstName?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold truncate text-xs sm:text-sm leading-tight">{member.firstName} {member.lastName}</p>
                                                            {member.userId === fellowship.organizerId && <span className="text-[8px] font-black uppercase text-primary tracking-widest block mt-0.5">Organizer</span>}
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity" title="View Profile">
                                                                <Link href={`/dashboard/profile/${member.userId}`}><User className="h-4 w-4" /></Link>
                                                            </Button>
                                                            {isOrganizer && member.userId !== user?.uid && (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    onClick={() => setMemberToRemove(member)}
                                                                    title="Remove Member"
                                                                >
                                                                    <UserMinus className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-12 italic px-8">No other believers joined yet.</p>
                                        )}
                                    </TabsContent>
                                    <TabsContent value="souls" className="mt-0 p-4 sm:p-8">
                                        {soulsLoading ? (
                                            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
                                        ) : assignedSouls && assignedSouls.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                {assignedSouls.map(soul => (
                                                    <div key={soul.id} className="flex items-center gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border bg-primary/5 border-primary/10 transition-all hover:bg-primary/[0.08] group min-w-0">
                                                        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                                                            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-primary fill-current" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold truncate text-xs sm:text-sm leading-tight">{soul.firstName} {soul.lastName}</p>
                                                            <Badge className="mt-1 h-3.5 text-[7px] sm:text-[8px] uppercase tracking-tighter" variant="secondary">{soul.status}</Badge>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                className="h-7 sm:h-8 text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 sm:px-3 rounded-xl shadow-sm"
                                                                onClick={() => {
                                                                    setSelectedSoulId(soul.id);
                                                                    setIsSoulDetailsOpen(true);
                                                                }}
                                                            >
                                                                Details
                                                            </Button>
                                                            {isOrganizer && (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    onClick={() => setSoulToUnassign(soul)}
                                                                    title="Unassign Soul"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-12 sm:p-16 text-center bg-muted/30 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-dashed mx-auto flex flex-col items-center">
                                                <Heart className="h-8 w-8 text-muted-foreground/10 mb-3" />
                                                <p className="text-xs sm:text-sm text-muted-foreground italic px-6 sm:px-10 leading-relaxed font-medium text-balance">No converts assigned to this group yet.</p>
                                            </div>
                                        )}
                                    </TabsContent>
                               </Tabs>
                           ) : (
                               <div className="p-16 sm:p-20 text-center bg-muted/30 flex flex-col items-center">
                                   <div className="h-12 w-12 sm:h-16 sm:w-16 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                                       <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground opacity-20" />
                                   </div>
                                   <p className="text-xs sm:text-sm text-muted-foreground italic px-10 sm:px-12 leading-relaxed font-medium max-w-sm mx-auto text-balance">Join this fellowship to collaborate on follow-up and view the member directory.</p>
                               </div>
                           )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Devotional Dialog */}
            {isOrganizer && (
                mounted && isMobile ? (
                    <Sheet open={isDevotionalDialogOpen} onOpenChange={setIsDevotionalDialogOpen}>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                                <SheetHeader className="text-left">
                                    <SheetTitle className="text-2xl font-black font-headline">Post Today's Word</SheetTitle>
                                    <SheetDescription className="text-sm font-medium">Share a devotional to encourage the group.</SheetDescription>
                                </SheetHeader>
                            </div>
                            <ScrollArea className="flex-grow p-8">
                                <Form {...form}>
                                    <form id="devotional-form-mobile" onSubmit={form.handleSubmit(handleSaveDevotional)} className="space-y-6">
                                        <FormField control={form.control} name="title" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Devotional Title</FormLabel>
                                                <FormControl><Input placeholder="e.g., Walking in Favor" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="scripture" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Main Scripture</FormLabel>
                                                <FormControl><Input placeholder="e.g., Psalm 23:1" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="text" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Message Content</FormLabel>
                                                <FormControl><Textarea placeholder="Type the daily word here..." className="min-h-[200px]" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </form>
                                </Form>
                            </ScrollArea>
                            <div className="p-8 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm">
                                <Button type="submit" form="devotional-form-mobile" disabled={isSavingDevotional} className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase">
                                    {isSavingDevotional && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    PUBLISH WORD
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                ) : (
                    <Dialog open={isDevotionalDialogOpen} onOpenChange={setIsDevotionalDialogOpen}>
                        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-3xl shadow-2xl">
                            <div className="p-6 border-b bg-muted/10">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold font-headline">Share Daily Devotional</DialogTitle>
                                    <DialogDescription className="text-sm font-medium">Encourage your group members with a daily word.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="max-h-[70vh] p-6">
                                <Form {...form}>
                                    <form id="devotional-form-desktop" onSubmit={form.handleSubmit(handleSaveDevotional)} className="space-y-6">
                                        <FormField control={form.control} name="title" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Devotional Title</FormLabel>
                                                <FormControl><Input placeholder="e.g., Faith that Moves Mountains" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="scripture" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Primary Scripture</FormLabel>
                                                <FormControl><Input placeholder="e.g., John 3:16" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="text" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Your Message</FormLabel>
                                                <FormControl><Textarea placeholder="Share the revelation..." className="min-h-[150px]" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </form>
                                </Form>
                            </ScrollArea>
                            <DialogFooter className="p-6 border-t">
                                <Button type="submit" form="devotional-form-desktop" disabled={isSavingDevotional} className="w-full h-12 rounded-xl font-bold">
                                    {isSavingDevotional && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Publish Devotional
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )
            )}

            {isMobile ? (
              <Sheet open={isSoulDetailsOpen} onOpenChange={setIsSoulDetailsOpen}>
                  <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                      <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                        <SheetHeader className="text-left">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Heart className="h-4 w-4 text-primary fill-current" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Harvest Detail</span>
                            </div>
                            <SheetTitle className="text-2xl font-black font-headline tracking-tight leading-tight">Journey Record</SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1">Tracking spiritual growth and shared follow-up log.</SheetDescription>
                        </SheetHeader>
                      </div>
                      <div className="flex-grow overflow-hidden relative">
                        <ScrollArea className="h-full px-8 pb-32">
                            {soulDetailsContent}
                        </ScrollArea>
                      </div>
                  </SheetContent>
              </Sheet>
            ) : (
              <Dialog open={isSoulDetailsOpen} onOpenChange={setIsSoulDetailsOpen}>
                  <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl shadow-2xl">
                      <div className="p-6 border-b flex-shrink-0 bg-muted/10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black font-headline">Journey Details</DialogTitle>
                            <DialogDescription className="text-sm font-medium">Collaborative spiritual tracking.</DialogDescription>
                        </DialogHeader>
                      </div>
                      <ScrollArea className="flex-grow min-h-0 px-6">
                        {soulDetailsContent}
                      </ScrollArea>
                  </DialogContent>
              </Dialog>
            )}

            <LogFollowUpDialog 
                soul={activeSoul}
                isOpen={isLogFollowUpOpen}
                onOpenChange={setIsLogFollowUpOpen}
                onFollowUpLogged={() => {
                    setIsLogFollowUpOpen(false);
                }}
                userProfile={userProfile}
            />

            {/* Member Removal Confirmation */}
            <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
                <AlertDialogContent className="rounded-3xl p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black font-headline">Remove Member?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium">
                            Are you sure you want to remove {memberToRemove?.firstName} {memberToRemove?.lastName} from this group? They will lose access to the shared directory and chat.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel disabled={isProcessingRemoval} className="rounded-2xl h-11 font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveMember} disabled={isProcessingRemoval} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-11 font-bold">
                            {isProcessingRemoval && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Removal
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Soul Unassignment Confirmation */}
            <AlertDialog open={!!soulToUnassign} onOpenChange={(open) => !open && setSoulToUnassign(null)}>
                <AlertDialogContent className="rounded-3xl p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black font-headline">Unassign Convert?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium">
                            Are you sure you want to remove {soulToUnassign?.firstName} from this group? This convert will no longer appear in the shared follow-up list for this {fellowship.groupType.toLowerCase()}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel disabled={isProcessingRemoval} className="rounded-2xl h-11 font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveSoul} disabled={isProcessingRemoval} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-11 font-bold">
                            {isProcessingRemoval && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Unassign
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
