
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { doc, serverTimestamp, writeBatch, arrayUnion, query, collection, orderBy, getDocs, addDoc, getDoc, updateDoc } from 'firebase/firestore';
import type { UserProfile, Soul, Chat } from '@/lib/types';
import { isToday, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
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
  Share,
  Smartphone,
  ChevronDown,
  HeartHandshake,
  X
} from 'lucide-react';
import { cn, safeToDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { actionItems, prayerTemplates } from '@/lib/follow-up-data';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

function SoulSelectionDialog({ 
  isOpen, 
  onOpenChange, 
  souls, 
  onSelect,
  actionLabel,
  isLoading
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  souls: Soul[] | null; 
  onSelect: (soul: Soul) => void;
  actionLabel: string;
  isLoading: boolean;
}) {
    const isMobile = useIsMobile();
    const [search, setSearch] = useState('');
    const filteredSouls = useMemo(() => {
        if (!souls) return [];
        if (!search) return souls;
        const term = search.toLowerCase();
        return souls.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(term));
    }, [souls, search]);

    const header = (
        <div className="p-8 border-b bg-muted/10 text-left">
            <DialogHeader className="text-left">
                <DialogTitle className="text-2xl font-black font-headline uppercase">Who did you {actionLabel.toLowerCase()}?</DialogTitle>
                <DialogDescription className="text-sm font-medium">Select a convert to link this action to their record.</DialogDescription>
                <div className="flex items-center gap-2 mt-4 text-left sm:hidden">
                    <ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" />
                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Swipe down to close</span>
                </div>
            </DialogHeader>
        </div>
    );

    const body = (
        <div className="p-6 space-y-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                <Input 
                    placeholder="Search by name..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)}
                    className="rounded-2xl h-12 pl-10 bg-muted/20 border-none shadow-inner text-base"
                />
            </div>
            <ScrollArea className="h-[40vh] border rounded-3xl bg-muted/5">
                <div className="p-2 space-y-1.5">
                    {filteredSouls.length > 0 ? (
                        filteredSouls.map(soul => (
                            <Button 
                                key={soul.id} 
                                variant="ghost" 
                                className="w-full justify-start h-16 px-4 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all gap-4 group flex flex-row items-center border bg-card/50"
                                onClick={() => onSelect(soul)}
                                disabled={isLoading}
                            >
                                <Avatar className="h-10 w-10 border-2 group-hover:border-primary/20 transition-colors shadow-sm text-left">
                                    <AvatarFallback className="font-bold bg-primary/5">{soul.firstName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="text-left min-w-0 flex-1">
                                    <p className="font-black text-sm uppercase tracking-tight truncate leading-tight">{soul.firstName} {soul.lastName}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{soul.status}</p>
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
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                                {search ? "No matches found" : "Log your first soul to begin tracking"}
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onOpenChange}>
                <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    {header}
                    <div className="flex-grow overflow-hidden">{body}</div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
                {header}
                {body}
            </DialogContent>
        </Dialog>
    );
}

export function RelationshipTrackerCard() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const router = useRouter();

  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [isSoulDialogOpen, setIsSoulDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  const [isCommChannelDialogOpen, setIsCommChannelDialogOpen] = useState(false);
  const [isPrayerCustomizationOpen, setIsPrayerCustomizationOpen] = useState(false);
  const [isHelpNeedDialogOpen, setIsHelpNeedDialogOpen] = useState(false);
  const [isShareTargetDialogOpen, setIsShareTargetDialogOpen] = useState(false);
  const [isPartnerSelectionDialogOpen, setIsPartnerSelectionDialogOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [activeSoul, setActiveSoul] = useState<Soul | null>(null);

  const { userProfile, loading: profileLoading } = useUserProfile();

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'souls'), orderBy("wonAt", "desc"));
  }, [user?.uid, firestore]);
  const { data: souls, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

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

  const resolveTemplate = useCallback((template: string, targetSoul: Soul) => {
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

  const finalizeLog = async (soul: Soul, actionId: string, noteAddendum: string = '') => {
    if (!user || !firestore) return;
    
    setTogglingId(actionId);
    const action = actionItems.find(a => a.id === actionId);
    if (!action) return;

    const today = new Date();
    const dateString = format(today, 'yyyy-MM-dd');
    const batch = writeBatch(firestore);

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

    const memberName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || user.displayName || 'Member';
    const logEntry = {
        date: new Date(), 
        note: `Logged via Kingdom Connections: ${action.label}${noteAddendum ? ` - ${noteAddendum}` : ''}`,
        actions: [actionId],
        memberId: user.uid,
        memberName: memberName,
    };

    const soulUserRef = doc(firestore, `users/${user.uid}/souls`, soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);
    
    batch.update(soulUserRef, {
        followUpLog: arrayUnion(logEntry),
        lastUpdatedAt: serverTimestamp(),
    });
    batch.update(globalSoulRef, {
        followUpLog: arrayUnion(logEntry),
        lastUpdatedAt: serverTimestamp(),
    });

    try {
        await batch.commit();
        setCompletedToday(newCompleted);
        toast({ title: 'Kingdom Impact Saved!' });
    } catch (err) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: soulUserRef.path, operation: 'update' }, user));
    } finally {
        setTogglingId(null);
    }
  };

  const handleActionClick = (id: string) => {
      setSelectedActionId(id);
      setIsSoulDialogOpen(true);
  };

  const handleSoulSelected = (soul: Soul) => {
    setActiveSoul(soul);
    setIsSoulDialogOpen(false);

    if (!selectedActionId) return;

    if (['phone_call', 'text_message', 'prayed_together'].includes(selectedActionId)) {
        if (!soul.phone) {
            toast({ variant: 'destructive', title: 'Phone Missing', description: `Please save a number for ${soul.firstName} first.` });
            return;
        }
    }

    switch (selectedActionId) {
        case 'prayed_together':
            setCustomText(resolveTemplate(prayerTemplates[0].text, soul));
            setIsPrayerCustomizationOpen(true);
            break;
        case 'text_message':
            setIsCommChannelDialogOpen(true);
            break;
        case 'introduced_friend':
            setIsShareTargetDialogOpen(true);
            break;
        case 'phone_call':
            finalizeLog(soul, selectedActionId, 'Dialer initiated');
            window.location.href = `tel:${soul.phone}`;
            break;
        case 'helped_with_need':
            setIsHelpNeedDialogOpen(true);
            break;
        case 'shared_meal':
        case 'gave_gift':
            const mPath = selectedActionId === 'shared_meal' ? '/marketplace' : '/marketplace/gifts';
            router.push(`${mPath}?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}&actionId=${selectedActionId}`);
            break;
        default:
            finalizeLog(soul, selectedActionId);
    }
  };

  const handleCommChoice = (channel: 'whatsapp' | 'sms') => {
      if (!activeSoul?.phone || !selectedActionId) return;
      const cleanPhone = activeSoul.phone.replace(/\+/g, '').replace(/\D/g, '');
      const message = customText || `Hi ${activeSoul.firstName}, just thinking of you!`;
      
      if (channel === 'whatsapp') {
          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
      } else {
          window.location.href = `sms:${activeSoul.phone}?body=${encodeURIComponent(message)}`;
      }
      
      finalizeLog(activeSoul, selectedActionId, `Sent via ${channel.toUpperCase()}`);
      setIsCommChannelDialogOpen(false);
      setCustomText('');
  };

  const handleShareToWhatsApp = () => {
    if (!activeSoul) return;
    const wonAt = safeToDate(activeSoul.wonAt);
    const details = `Introduction to ${activeSoul.firstName}, a new soul won for the Kingdom! 🎊\n\nStatus: ${activeSoul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\n\nSupport their growth on Testify: ${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(details)}`, '_blank');
    finalizeLog(activeSoul, 'introduced_friend', 'Shared via WhatsApp External');
    setIsShareTargetDialogOpen(false);
  };

  const handleShareToPartner = async (partner: UserProfile['accountabilityPartners'][0]) => {
      if (!user || !firestore || !activeSoul || !userProfile) return;
      const wonAt = safeToDate(activeSoul.wonAt);
      const text = `SHARING SOUL DATA: ${activeSoul.firstName} ${activeSoul.lastName}\nStatus: ${activeSoul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\n\nLet's coordinate follow-up on Testify.`;
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
          
          finalizeLog(activeSoul, 'introduced_friend', `Shared with partner: ${partner.firstName}`);
          setIsPartnerSelectionDialogOpen(false);
          setIsShareTargetDialogOpen(false);
          router.push(`/dashboard/chats/${chatId}`);
      } catch (e) {
          toast({ variant: 'destructive', title: 'Share Failed' });
      }
  };

  const handleHelpNeedConfirm = (note: string) => {
      if (!activeSoul) return;
      finalizeLog(activeSoul, 'helped_with_need', `Service: ${note}`);
      setIsHelpNeedDialogOpen(false);
  }

  const uniquePartners = useMemo(() => {
    const partnersList = userProfile?.accountabilityPartners || [];
    const uniqueMap = new Map();
    partnersList.forEach(p => {
        if (p.userId) {
          if (!uniqueMap.has(p.userId) || (!uniqueMap.get(p.userId).photoURL && p.photoURL)) {
            uniqueMap.set(p.userId, p);
          }
        }
    });
    return Array.from(uniqueMap.values());
  }, [userProfile?.accountabilityPartners]);

  const activeActionLabel = useMemo(() => 
    actionItems.find(a => a.id === selectedActionId)?.label || "Connect with", 
  [selectedActionId]);

  if (userLoading || profileLoading || soulsLoading) {
    return (
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b text-left">
        <CardHeader className="p-4 sm:p-6 text-left">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 px-4 sm:px-6 pb-6 text-left">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b overflow-hidden relative group/card text-left">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover/card:opacity-[0.05] transition-opacity text-left">
          <Users className="h-32 w-32 text-primary rotate-12" />
        </div>

        <CardHeader className="p-4 sm:p-6 pb-4 relative z-10 text-left">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between text-left">
              <div className="space-y-1">
                  <CardTitle className="text-base sm:text-lg font-black font-headline uppercase tracking-tight flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Kingdom Connections
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60">Daily Relational Efforts</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                {currentDate && (
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    {format(currentDate, 'PPPP')}
                  </div>
                )}
              </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-2 relative z-10">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {actionItems.map(action => {
                  const isCompleted = completedToday.includes(action.id);
                  const Icon = iconMap[action.id] || Heart;
                  return (
                      <TooltipProvider key={action.id}>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <motion.div whileTap={{ scale: 0.95 }} whileHover={{ y: -2 }} className="w-full">
                                      <Button
                                          variant="outline"
                                          className={cn(
                                              "relative flex flex-col items-center justify-center gap-2 p-3 h-24 w-full text-center transition-all duration-300 rounded-3xl border-2 overflow-hidden",
                                              isCompleted 
                                                  ? "bg-primary/5 border-primary/40 shadow-inner ring-1 ring-primary/10" 
                                                  : "bg-background/40 hover:bg-muted/50 hover:border-primary/20"
                                          )}
                                          onClick={() => handleActionClick(action.id)}
                                          disabled={togglingId === action.id}
                                      >
                                          <AnimatePresence>
                                              {isCompleted && (
                                                  <motion.div 
                                                      initial={{ scale: 0, opacity: 0 }}
                                                      animate={{ scale: 1, opacity: 1 }}
                                                      exit={{ scale: 0, opacity: 0 }}
                                                      className="absolute top-2 right-2 bg-primary rounded-full p-0.5 shadow-lg z-20 text-left"
                                                  >
                                                      <CheckCircle2 className="h-3 w-3 text-primary-foreground fill-current" />
                                                  </motion.div>
                                              )}
                                          </AnimatePresence>

                                          <div className={cn(
                                              "h-8 w-8 rounded-2xl flex items-center justify-center transition-all duration-500",
                                              isCompleted ? "bg-primary/20 scale-110 shadow-lg" : "bg-muted/30"
                                          )}>
                                              <Icon className={cn("h-4 w-4 transition-all")} />
                                          </div>
                                          <div className="space-y-0.5 min-w-0 w-full text-center">
                                              <span className={cn(
                                                  "text-[9px] font-black uppercase tracking-tight block truncate text-center",
                                                  isCompleted ? "text-primary" : "text-foreground"
                                              )}>
                                                  {action.label}
                                              </span>
                                          </div>
                                      </Button>
                                  </motion.div>
                              </TooltipTrigger>
                              <TooltipContent className="rounded-xl border-primary/20 shadow-xl" side="bottom">
                                  <p className="text-[10px] font-bold uppercase text-primary text-center">Kingdom Action</p>
                                  <p className="text-xs font-medium max-w-[150px] leading-relaxed italic text-center">{action.label}</p>
                              </TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                  );
              })}
          </div>
        </CardContent>
        <CardFooter className="px-4 sm:px-6 pb-6 pt-4 flex flex-col gap-4 border-t mt-4 bg-muted/5 text-left">
              <Button asChild variant="default" className="w-full font-black h-12 rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase text-xs sm:text-sm">
                  <Link href="/souls-won">
                      <UserPlus className="mr-2 h-4 w-4" />
                      MANAGE SOULS WON
                  </Link>
              </Button>
              <p className="text-[8px] text-center text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-40 text-center w-full">
                  Unity • Growth • Love
              </p>
        </CardFooter>
      </Card>

      <SoulSelectionDialog 
          isOpen={isSoulDialogOpen} 
          onOpenChange={setIsSoulDialogOpen} 
          souls={souls} 
          onSelect={handleSoulSelected} 
          actionLabel={activeActionLabel}
          isLoading={togglingId !== null}
      />

      <Drawer open={isCommChannelDialogOpen} onOpenChange={setIsCommChannelDialogOpen}>
          <DrawerContent className="p-0 rounded-t-[2.5rem] h-auto pb-12 text-left">
              <div className="p-8 border-b shrink-0 bg-muted/10">
                  <DrawerHeader className="text-center space-y-2">
                      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-center">
                          <MessageSquare className="h-7 w-7 text-primary" />
                      </div>
                      <DrawerTitle className="text-2xl font-black font-headline uppercase text-center">Message Hub</DrawerTitle>
                      <DrawerDescription className="text-sm font-medium text-center">How would you like to encourage {activeSoul?.firstName}?</DrawerDescription>
                      <div className="flex items-center justify-center gap-2 mt-4 text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center">Swipe down to close</span></div>
                  </DrawerHeader>
              </div>
              <div className="p-8 flex flex-col gap-3">
                  <Button onClick={() => handleCommChoice('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20">
                      <WhatsAppIcon className="h-5 w-5" /> WhatsApp
                  </Button>
                  <Button onClick={() => handleCommChoice('sms')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5">
                      <MessageSquare className="h-5 w-5" /> Standard SMS
                  </Button>
              </div>
          </DrawerContent>
      </Drawer>

      <Drawer open={isPrayerCustomizationOpen} onOpenChange={setIsPrayerCustomizationOpen}>
          <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
              <div className="p-8 border-b shrink-0 bg-muted/10">
                  <DrawerHeader className="text-left flex-shrink-0">
                      <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Kingdom Intercession</DrawerTitle>
                      <DrawerDescription className="text-sm font-medium mt-1 text-left">Draft a powerful prayer for {activeSoul?.firstName}.</DrawerDescription>
                      <div className="flex items-center gap-2 mt-4"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Swipe down to close</span></div>
                  </DrawerHeader>
              </div>
              <ScrollArea className="flex-grow p-8">
                  <div className="space-y-6">
                      <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Prayer Focus</label>
                          <div className="flex flex-wrap gap-2">
                              {prayerTemplates.map(t => (
                                  <Button 
                                      key={t.id} 
                                      variant="outline" 
                                      size="sm" 
                                      className="rounded-full h-8 px-4 text-[9px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 hover:text-primary"
                                      onClick={() => activeSoul && setCustomText(resolveTemplate(t.text, activeSoul))}
                                  >
                                      {t.label}
                                  </Button>
                              ))}
                          </div>
                      </div>

                      <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Customize Your Prayer</Label>
                          <Textarea 
                              value={customText}
                              onChange={e => setCustomText(e.target.value)}
                              className="min-h-[200px] rounded-2xl bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6"
                          />
                      </div>

                      <Button 
                          onClick={() => {
                              setIsPrayerCustomizationOpen(false);
                              setTimeout(() => setIsCommChannelDialogOpen(true), 100);
                          }} 
                          disabled={!customText.trim()} 
                          className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest"
                      >
                          CONTINUE TO CHANNEL
                      </Button>
                  </div>
              </ScrollArea>
          </DrawerContent>
      </Drawer>

      <Drawer open={isHelpNeedDialogOpen} onOpenChange={setIsHelpNeedDialogOpen}>
          <DrawerContent className="h-auto max-h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
              <div className="p-8 border-b shrink-0 bg-muted/10">
                  <DrawerHeader className="text-left flex-shrink-0">
                      <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Support Provided</DrawerTitle>
                      <DrawerDescription className="text-sm font-medium mt-1 text-left">Describe how you supported {activeSoul?.firstName}.</DrawerDescription>
                      <div className="flex items-center gap-2 mt-4 text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Swipe down to close</span></div>
                  </DrawerHeader>
              </div>
              <div className="p-8 space-y-6">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Support Details</Label>
                      <Textarea 
                          placeholder="e.g. Provided food items, helped with bill..." 
                          onChange={e => setCustomText(e.target.value)}
                          className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner"
                      />
                  </div>
                  <Button onClick={() => handleHelpNeedConfirm(customText)} className="w-full h-14 rounded-2xl font-black shadow-lg uppercase tracking-widest">CONFIRM SERVICE</Button>
              </div>
          </DrawerContent>
      </Drawer>

      <Drawer open={isShareTargetDialogOpen} onOpenChange={setIsShareTargetDialogOpen}>
          <DrawerContent className="p-0 rounded-t-[2.5rem] h-auto pb-12 text-left">
              <div className="p-8 border-b shrink-0 bg-muted/10">
                  <DrawerHeader className="text-center space-y-2 text-left">
                      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-center">
                          <Share className="h-7 w-7 text-primary" />
                      </div>
                      <DrawerTitle className="text-2xl font-black font-headline uppercase text-center">Share Details</DrawerTitle>
                      <DrawerDescription className="text-sm font-medium text-center">Where would you like to share {activeSoul?.firstName}'s info?</DrawerDescription>
                      <div className="flex items-center justify-center gap-2 mt-4 text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center">Swipe down to close</span></div>
                  </DrawerHeader>
              </div>
              <div className="p-8 flex flex-col gap-3">
                  <Button onClick={handleShareToWhatsApp} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20">
                      <WhatsAppIcon className="h-5 w-5" /> WhatsApp External
                  </Button>
                  <Button onClick={() => { setIsShareTargetDialogOpen(false); setTimeout(() => setIsPartnerSelectionDialogOpen(true), 100); }} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5">
                      <HeartHandshake className="h-5 w-5" /> Partner on App
                  </Button>
              </div>
          </DrawerContent>
      </Drawer>

      <Drawer open={isPartnerSelectionDialogOpen} onOpenChange={setIsPartnerSelectionDialogOpen}>
          <DrawerContent className="h-auto max-h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
              <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                  <DrawerHeader className="text-left flex-shrink-0 text-left">
                      <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Select Partner</DrawerTitle>
                      <DrawerDescription className="text-sm font-medium mt-1 text-left">Which partner should receive these details?</DrawerDescription>
                      <div className="flex items-center gap-2 mt-4 text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Swipe down to close</span></div>
                  </DrawerHeader>
              </div>
              <div className="p-8">
                  <ScrollArea className="h-64">
                        <div className="space-y-2">
                            {uniquePartners.map(p => (
                                <Button 
                                    key={p.userId} 
                                    variant="ghost" 
                                    className="w-full justify-start h-14 rounded-xl gap-4 hover:bg-primary/5 group"
                                    onClick={() => handleShareToPartner(p)}
                                >
                                    <Avatar className="h-8 w-8 border shrink-0">
                                        <AvatarImage src={p.photoURL} className="object-cover" />
                                        <AvatarFallback className="font-bold text-[10px]">{p.firstName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-bold text-sm group-hover:text-primary transition-colors">{p.firstName} {p.lastName}</span>
                                </Button>
                            ))}
                            {uniquePartners.length === 0 && (
                                <p className="text-center text-xs text-muted-foreground py-12">No partners found. Connect with some in Settings!</p>
                            )}
                        </div>
                    </ScrollArea>
              </div>
          </DrawerContent>
      </Drawer>
    </>
  );
}
