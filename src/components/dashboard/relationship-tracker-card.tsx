'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { doc, serverTimestamp, writeBatch, arrayUnion, query, collection, orderBy, addDoc, getDoc, updateDoc, where, getDocs } from 'firebase/firestore';
import type { UserProfile, Soul, Chat, SoulRelationship } from '@/lib/types';
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
  Send,
  Share2,
  Share,
  X,
  HeartHandshake
} from 'lucide-react';
import { cn, safeToDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { actionItems } from '@/lib/follow-up-data';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

function SoulSelectionDialog({ 
  isOpen, 
  onOpenChange, 
  souls, 
  onSelect,
  onShare,
  actionLabel,
  isLoading
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  souls: Soul[] | null; 
  onSelect: (soul: Soul) => void;
  onShare: (soul: Soul) => void;
  actionLabel: string;
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
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-8 border-b bg-muted/10">
                    <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase">Who did you {actionLabel.toLowerCase()}?</DialogTitle>
                    <DialogDescription className="text-sm font-medium">Select a convert to link this action to their record.</DialogDescription>
                </DialogHeader>
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
                                filteredSouls.map(soul => {
                                    const isShareAction = actionLabel === 'Introduce to a friend';
                                    return (
                                        <Button 
                                            key={soul.id} 
                                            variant="ghost" 
                                            className="w-full justify-start h-16 px-4 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all gap-4 group"
                                            onClick={() => isShareAction ? onShare(soul) : onSelect(soul)}
                                            disabled={isLoading}
                                        >
                                            <Avatar className="h-10 w-10 border-2 group-hover:border-primary/20 transition-colors shadow-sm">
                                                <AvatarFallback className="font-bold bg-primary/5">{soul.firstName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="text-left min-w-0 flex-1">
                                                <p className="font-black text-sm truncate uppercase tracking-tight">{soul.firstName} {soul.lastName}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">{soul.status}</p>
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-muted/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                {isShareAction ? <Share2 className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                                            </div>
                                        </Button>
                                    );
                                })
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
            </DialogContent>
        </Dialog>
    );
}

function CommChannelDialog({ 
  isOpen, 
  onOpenChange, 
  soul, 
  onChoice,
  isPrayerMode
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  soul: Soul | null; 
  onChoice: (channel: 'whatsapp' | 'sms') => void; 
  isPrayerMode?: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none rotate-12">
            <Send className="h-24 w-24 text-primary" />
        </div>
        <DialogHeader className="text-center space-y-2">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                {isPrayerMode ? <Sparkles className="h-7 w-7 text-primary" /> : <MessageSquare className="h-7 w-7 text-primary" />}
            </div>
          <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase">{isPrayerMode ? 'Send Prayer' : 'Message Hub'}</DialogTitle>
          <DialogDescription className="text-sm font-medium">How would you like to encourage {soul?.firstName}?</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-6">
          <Button onClick={() => onChoice('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20">
            <WhatsAppIcon className="h-5 w-5" /> WhatsApp
          </Button>
          <Button onClick={() => onChoice('sms')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5">
            <MessageSquare className="h-5 w-5" /> Standard SMS
          </Button>
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-6 font-bold uppercase tracking-widest opacity-40">Choose your platform</p>
      </DialogContent>
    </Dialog>
  );
}

function ShareTargetDialog({ 
  isOpen, 
  onOpenChange, 
  soul, 
  onChoice 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  soul: Soul | null; 
  onChoice: (target: 'whatsapp' | 'partner') => void; 
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
            <Share2 className="h-24 w-24 text-primary" />
        </div>
        <DialogHeader className="text-center space-y-2">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Share className="h-7 w-7 text-primary" />
            </div>
          <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase">Share Details</DialogTitle>
          <DialogDescription className="text-sm font-medium">Where would you like to share {soul?.firstName}'s info?</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-6">
          <Button onClick={() => onChoice('whatsapp')} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20">
            <WhatsAppIcon className="h-5 w-5" /> WhatsApp External
          </Button>
          <Button onClick={() => onChoice('partner')} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5">
            <HeartHandshake className="h-5 w-5" /> Partner on App
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HelpNeedNoteDialog({
  isOpen,
  onOpenChange,
  soul,
  onConfirm,
  isLoading
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  soul: Soul | null;
  onConfirm: (note: string) => void;
  isLoading: boolean;
}) {
  const [note, setNote] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isOpen) setNote('');
  }, [isOpen]);

  const content = (
      <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Details of Support</Label>
              <Textarea 
                  placeholder="e.g., Provided groceries, assisted with transportation..." 
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner text-base"
              />
          </div>
          <Button 
              onClick={() => onConfirm(note)} 
              disabled={isLoading || !note.trim()} 
              className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest"
          >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Act of Kindness
          </Button>
      </div>
  );

  if (isMobile) {
      return (
          <Sheet open={isOpen} onOpenChange={onOpenChange}>
              <SheetContent side="bottom" className="h-auto max-h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                  <div className="p-8 border-b shrink-0 bg-muted/10">
                      <SheetHeader className="text-left">
                          <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Kingdom Kindness</SheetTitle>
                          <SheetDescription className="text-sm font-medium mt-1">How did you help {soul?.firstName} today?</SheetDescription>
                      </SheetHeader>
                  </div>
                  <ScrollArea className="flex-grow">
                      {content}
                  </ScrollArea>
              </SheetContent>
          </Sheet>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-8 border-b bg-muted/10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Kingdom Kindness</DialogTitle>
            <DialogDescription className="text-sm font-medium">How did you help {soul?.firstName} today?</DialogDescription>
          </DialogHeader>
        </div>
        {content}
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
  
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [pendingActions, setPendingActions] = useState<string[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [isSoulDialogOpen, setIsSoulDialogOpen] = useState(false);
  
  const [isCommChannelDialogOpen, setIsCommChannelDialogOpen] = useState(false);
  const [commTargetSoul, setCommTargetSoul] = useState<Soul | null>(null);

  const [isShareTargetDialogOpen, setIsShareTargetDialogOpen] = useState(false);
  const [isPartnerSelectionDialogOpen, setIsPartnerSelectionDialogOpen] = useState(false);
  const [sharingSoul, setSharingSoul] = useState<Soul | null>(null);

  const [isHelpNeedDialogOpen, setIsHelpNeedDialogOpen] = useState(false);
  const [helpNeedTargetSoul, setHelpNeedTargetSoul] = useState<Soul | null>(null);

  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  const { userProfile, loading: profileLoading } = useUserProfile();

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'souls'), orderBy("wonAt", "desc"));
  }, [user?.uid, firestore]);
  const { data: souls, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

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
        } catch (e) {}
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

  const performLogging = async (soul: Soul, actionId: string, customNote?: string) => {
      if (!user || !firestore) return;

      const action = actionItems.find(a => a.id === actionId);
      if (!action) return;

      const today = new Date();
      const dateString = format(today, 'yyyy-MM-dd');
      const batch = writeBatch(firestore);

      const isProvisionAction = actionId === 'shared_meal' || actionId === 'gave_gift';

      // 1. Update user's daily discipline (habit tracking) - SKIP for pending provisions
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

      // 2. Update soul's history
      const memberName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || user.displayName || 'Member';
      const logEntry = {
          date: new Date(), 
          note: customNote 
              ? `Logged via Kingdom Connections: ${action.label}. Note: ${customNote}`
              : isProvisionAction 
                  ? `Initiated ${action.label} via Kingdom Connections` 
                  : `Logged via Kingdom Connections: ${action.label}`,
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

          if (isProvisionAction) {
              if (typeof window !== 'undefined') {
                  const key = `testify_pending_provisions_${user.uid}`;
                  const stored = localStorage.getItem(key);
                  let provisions = [];
                  try {
                      provisions = stored ? JSON.parse(stored) : [];
                      if (!Array.isArray(provisions)) provisions = [];
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
              toast({ title: 'Opening Hub...', description: `Finish act of kindness for ${soul.firstName}.` });
          } else {
              toast({ title: 'Kingdom Impact Saved!', description: `Logged '${action.label}' for ${soul.firstName}.` });
          }
      } catch (err: any) {
          const permissionError = new FirestorePermissionError({
              path: `BATCH_WRITE:RELATION_TRACKER:${soul.id}`,
              operation: 'write',
          }, user);
          errorEmitter.emit('permission-error', permissionError);
      }
  };

  const handleSoulSelected = async (soul: Soul) => {
    if (!user || !firestore || !selectedActionId) return;
    
    const isCommAction = selectedActionId === 'phone_call' || selectedActionId === 'text_message' || selectedActionId === 'prayed_together';
    if (isCommAction && !soul.phone) {
        toast({
            variant: 'destructive',
            title: 'Phone Number Missing',
            description: `You haven't saved a phone number for ${soul.firstName}. Please add one in 'Souls Won' to use this feature.`,
        });
        setIsSoulDialogOpen(false);
        return;
    }

    setIsSoulDialogOpen(false);

    if (selectedActionId === 'helped_with_need') {
        setHelpNeedTargetSoul(soul);
        setIsHelpNeedDialogOpen(true);
        return;
    }

    if (selectedActionId === 'text_message' || selectedActionId === 'prayed_together') {
        setCommTargetSoul(soul);
        setIsCommChannelDialogOpen(true);
        return;
    }
    
    if (selectedActionId === 'phone_call') {
        await performLogging(soul, 'phone_call');
        window.location.href = `tel:${soul.phone}`;
        return;
    }

    setTogglingId(selectedActionId);
    await performLogging(soul, selectedActionId);
    setTogglingId(null);
  };

  const handleHelpNeedConfirm = async (note: string) => {
      if (!helpNeedTargetSoul || !selectedActionId) return;
      setTogglingId(selectedActionId);
      setIsHelpNeedDialogOpen(false);
      await performLogging(helpNeedTargetSoul, selectedActionId, note);
      setTogglingId(null);
      setHelpNeedTargetSoul(null);
  };

  const handleCommChoice = (channel: 'whatsapp' | 'sms') => {
      if (!commTargetSoul || !commTargetSoul.phone) return;
      
      const soul = commTargetSoul;
      const cleanPhone = soul.phone.replace(/\+/g, '').replace(/\D/g, '');
      
      let message = `Hi ${soul.firstName}, I'm thinking of you today and praying for you. God bless you!`;
      if (selectedActionId === 'prayed_together') {
          message = `Hi ${soul.firstName}, I just spent a moment praying for you. May God's grace and peace be with you today!`;
      }
      
      const messageText = encodeURIComponent(message);
      
      performLogging(soul, selectedActionId!).then(() => {
          if (channel === 'whatsapp') {
              window.open(`https://wa.me/${cleanPhone}?text=${messageText}`, '_blank');
          } else {
              window.location.href = `sms:${soul.phone}?body=${messageText}`;
          }
      });
      
      setIsCommChannelDialogOpen(false);
      setCommTargetSoul(null);
  };

  const handleShareSoul = (soul: Soul) => {
      setSharingSoul(soul);
      setIsSoulDialogOpen(false);
      setIsShareTargetDialogOpen(true);
  };

  const handleShareToWhatsApp = () => {
      if (!sharingSoul) return;
      const wonAt = safeToDate(sharingSoul.wonAt);
      const details = `Here is a soul I'm following up with on Testify:\nName: ${sharingSoul.firstName} ${sharingSoul.lastName}\nStatus: ${sharingSoul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\nLet's keep them in our prayers.`;
      window.open(`https://wa.me/?text=${encodeURIComponent(details)}`, '_blank');
      setIsShareTargetDialogOpen(false);
      setSharingSoul(null);
  };

  const handleShareToPartner = async (partner: UserProfile['accountabilityPartners'][0]) => {
      if (!user || !firestore || !sharingSoul || !userProfile) return;

      const wonAt = safeToDate(sharingSoul.wonAt);
      const text = `SHARING SOUL DATA:\nName: ${sharingSoul.firstName} ${sharingSoul.lastName}\nStatus: ${sharingSoul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\nRelationship: ${sharingSoul.relationship || 'Outreach'}\nLet's keep them in our prayers and coordinate follow-up.`;

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
          
          // Log the action in tracker progress
          performLogging(sharingSoul, 'introduced_friend');

          setIsPartnerSelectionDialogOpen(false);
          setIsShareTargetDialogOpen(false);
          setSharingSoul(null);

          // Redirect to the chat
          router.push(`/dashboard/chats/${chatId}`);
      } catch (e) {
          toast({ variant: 'destructive', title: 'Share Failed' });
      }
  };

  const uniquePartners = useMemo(() => {
    const partners = userProfile?.accountabilityPartners || [];
    const uniqueMap = new Map();
    partners.forEach(p => {
        if (p.userId && !uniqueMap.has(p.userId)) {
            uniqueMap.set(p.userId, p);
        }
    });
    return Array.from(uniqueMap.values());
  }, [userProfile?.accountabilityPartners]);

  const activeActionLabel = useMemo(() => 
    actionItems.find(a => a.id === selectedActionId)?.label || "Connect with", 
  [selectedActionId]);

  if (userLoading || profileLoading || soulsLoading) {
    return (
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b">
        <CardHeader className="p-4 sm:p-6">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 px-4 sm:px-6 pb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b overflow-hidden relative group/card">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover/card:opacity-[0.05] transition-opacity">
          <Users className="h-32 w-32 text-primary rotate-12" />
        </div>

        <CardHeader className="p-4 sm:p-6 pb-4 relative z-10 min-h-[5.5rem]">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
              <div className="space-y-1">
                  <CardTitle className="text-base sm:text-lg font-black font-headline uppercase tracking-tight flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      KINGDOM SOULS FOLLOW-UP
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60">Daily Relational Efforts</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                {currentDate ? (
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    {format(currentDate, 'PPPP')}
                  </div>
                ) : <div className="h-6 w-32 bg-muted/20 rounded-full animate-pulse" />}
              </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-2 relative z-10">
          <LayoutGroup>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {actionItems.map(action => {
                    const isPending = pendingActions.includes(action.id);
                    const isCompleted = completedToday.includes(action.id);
                    const Icon = iconMap[action.id] || Heart;
                    const isToggling = togglingId === action.id;
                    
                    const buttonEl = (
                        <motion.div layout whileTap={{ scale: 0.95 }} whileHover={isMobile ? {} : { y: -2 }} className="w-full h-24">
                            <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                    "relative flex flex-col items-center justify-center gap-2 p-3 h-full w-full text-center transition-all duration-300 rounded-3xl border-2 overflow-hidden",
                                    isCompleted 
                                        ? "bg-primary/[0.03] border-primary/40 shadow-inner ring-1 ring-primary/10" 
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
                                            className="absolute top-2 right-2 bg-primary rounded-full p-0.5 shadow-lg z-20"
                                        >
                                            <CheckCircle2 className="h-3 w-3 text-primary-foreground fill-current" />
                                        </motion.div>
                                    )}
                                    {isPending && !isCompleted && !isToggling && (
                                        <motion.div 
                                            key="pending-icon"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="absolute top-2 right-2 bg-amber-500 rounded-full p-0.5 shadow-lg z-20"
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
                                        <Icon className={cn("h-4 w-4 transition-all", isCompleted ? "text-primary fill-current" : isPending ? "text-amber-600 animate-pulse" : "text-primary/60")} />
                                    )}
                                </div>
                                
                                <div className="space-y-0.5 min-w-0 w-full text-center px-1">
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-tight block truncate",
                                        isCompleted ? "text-primary" : "text-foreground"
                                    )}>
                                        {action.label}
                                    </span>
                                    <div className="h-2.5 flex items-center justify-center">
                                        {isPending && !isCompleted && !isToggling && (
                                            <span className="text-[8px] font-black uppercase text-amber-600/60 leading-none">Pending Hub</span>
                                        )}
                                    </div>
                                </div>
                            </Button>
                        </motion.div>
                    );

                    if (isMobile) return <div key={action.id}>{buttonEl}</div>;

                    return (
                        <TooltipProvider key={action.id}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    {buttonEl}
                                </TooltipTrigger>
                                <TooltipContent className="rounded-xl border-primary/20 shadow-xl" side="bottom">
                                    <p className="text-[10px] font-bold uppercase text-primary">Kingdom Action</p>
                                    <p className="text-xs font-medium max-w-[150px] leading-relaxed italic">{action.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                })}
            </div>
          </LayoutGroup>
        </CardContent>
        <CardFooter className="px-4 sm:px-6 pb-6 pt-4 flex flex-col gap-4 border-t mt-4 bg-muted/5">
              <Button asChild variant="default" className="w-full font-black h-12 rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase text-xs sm:text-sm">
                  <Link href="/dashboard/souls-won">
                      <UserPlus className="mr-2 h-4 w-4" />
                      MANAGE SOULS WON
                  </Link>
              </Button>
              <p className="text-[8px] text-center text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-40">
                  Unity • Growth • Love
              </p>
        </CardFooter>
      </Card>

      <SoulSelectionDialog 
          isOpen={isSoulDialogOpen} 
          onOpenChange={setIsSoulDialogOpen} 
          souls={souls} 
          onSelect={handleSoulSelected} 
          onShare={handleShareSoul}
          actionLabel={activeActionLabel}
          isLoading={togglingId !== null}
      />

      <CommChannelDialog
        isOpen={isCommChannelDialogOpen}
        onOpenChange={setIsCommChannelDialogOpen}
        soul={commTargetSoul}
        onChoice={handleCommChoice}
        isPrayerMode={selectedActionId === 'prayed_together'}
      />

      <ShareTargetDialog 
          isOpen={isShareTargetDialogOpen} 
          onOpenChange={setIsShareTargetDialogOpen} 
          soul={sharingSoul} 
          onChoice={(choice) => {
              if (choice === 'whatsapp') handleShareToWhatsApp();
              else setIsPartnerSelectionDialogOpen(true);
          }} 
      />

      <HelpNeedNoteDialog
        isOpen={isHelpNeedDialogOpen}
        onOpenChange={setIsHelpNeedDialogOpen}
        soul={helpNeedTargetSoul}
        onConfirm={handleHelpNeedConfirm}
        isLoading={togglingId !== null}
      />

      <Dialog open={isPartnerSelectionDialogOpen} onOpenChange={setIsPartnerSelectionDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
              <div className="p-8 border-b bg-muted/10">
                  <DialogHeader>
                      <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Select Partner</DialogTitle>
                      <DialogDescription className="text-sm font-medium">Which partner should receive these details?</DialogDescription>
                  </DialogHeader>
              </div>
              <div className="p-6">
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
                                    <AvatarImage src={p.photoURL} />
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
          </DialogContent>
      </Dialog>
    </>
  );
}
