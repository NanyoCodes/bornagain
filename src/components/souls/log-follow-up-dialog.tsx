"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { doc, arrayUnion, writeBatch, serverTimestamp, collection, query, where, getDocs, addDoc, getDoc, updateDoc } from "firebase/firestore";
import { useFirestore, useUser, useDoc } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, safeToDate } from "@/lib/utils";
import { actionItems, statusOptions, prayerTemplates } from "@/lib/follow-up-data";
import type { Soul, FollowUpStatus, UserProfile, Chat } from "@/lib/types";
import { 
  Church, 
  BookOpen, 
  Heart, 
  Users, 
  Loader2, 
  Sparkles, 
  ArrowRight, 
  Utensils, 
  Home, 
  Gift, 
  Phone, 
  MessageSquare, 
  Calendar,
  CheckCircle2,
  Send,
  X,
  Share2,
  Share,
  HeartHandshake,
  Hourglass,
  ChevronDown
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Label } from "../ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

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

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

const logFollowUpFormSchema = z.object({
  note: z.string().optional(),
  status: z.enum(statusOptions),
  attendingChurch: z.boolean(),
  inBibleStudy: z.boolean(),
  attendingPrayer: z.boolean(),
  inServiceDepartment: z.boolean(),
  actions: z.array(z.string()).optional(),
});

const getStatusClasses = (status: FollowUpStatus | undefined): string => {
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

interface LogFollowUpDialogProps {
  soul: Soul | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onFollowUpLogged: () => void;
  userProfile?: UserProfile | null;
}

export function LogFollowUpDialog({ soul, isOpen, onOpenChange, onFollowUpLogged, userProfile: providedProfile }: LogFollowUpDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

  const [isCommChannelDialogOpen, setIsCommChannelDialogOpen] = React.useState(false);
  const [isHelpNeedDialogOpen, setIsHelpNeedDialogOpen] = React.useState(false);
  const [isShareTargetDialogOpen, setIsShareTargetDialogOpen] = React.useState(false);
  const [isPartnerSelectionDialogOpen, setIsPartnerSelectionDialogOpen] = React.useState(false);
  const [isPrayerCustomizationOpen, setIsPrayerCustomizationOpen] = React.useState(false);
  const [customPrayerText, setCustomPrayerText] = React.useState('');
  const [clickedActionId, setClickedActionId] = React.useState<string | null>(null);

  const currentUserRef = React.useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: fetchedProfile } = useDoc<UserProfile>(currentUserRef);
  const userProfile = providedProfile || fetchedProfile;

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

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<z.infer<typeof logFollowUpFormSchema>>({
    resolver: zodResolver(logFollowUpFormSchema),
    defaultValues: {
      note: '',
      status: 'New',
      attendingChurch: false,
      inBibleStudy: false,
      attendingPrayer: false,
      inServiceDepartment: false,
      actions: [],
    },
  });
  
  React.useEffect(() => {
    if (isOpen && soul) {
      form.reset({
        note: '',
        status: soul.status === 'New' ? 'Contacted' : (soul.status || 'New'),
        attendingChurch: soul.attendingChurch || false,
        inBibleStudy: soul.inBibleStudy || false,
        attendingPrayer: soul.attendingPrayer || false,
        inServiceDepartment: soul.inServiceDepartment || false,
        actions: [],
      });
    }
  }, [isOpen, soul?.id, form]);

  async function onSubmit(values: z.infer<typeof logFollowUpFormSchema>) {
    if (!user || !firestore || !soul) return;
    
    setIsLoading(true);

    const soulRef = doc(firestore, `users/${soul.userId}/souls`, soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);

    const memberName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || user.displayName || 'Member';

    const newLogEntry = {
        date: new Date(), 
        note: values.note || '',
        actions: values.actions || [],
        memberId: user.uid,
        memberName: memberName,
    };

    const updatePayload = {
        followUpLog: arrayUnion(newLogEntry),
        status: values.status,
        attendingChurch: values.attendingChurch,
        inBibleStudy: values.inBibleStudy,
        attendingPrayer: values.attendingPrayer,
        inServiceDepartment: values.inServiceDepartment,
        lastUpdatedAt: serverTimestamp(),
    };
    
    try {
        const batch = writeBatch(firestore);
        batch.update(soulRef, updatePayload);
        batch.update(globalSoulRef, updatePayload);

        await batch.commit();

        toast({ title: 'Follow-up Logged', description: 'Your interaction has been saved to the history.' });
        onFollowUpLogged();
        form.reset();
        setClickedActionId(null);
    } catch (err: any) {
        console.error("Failed to log follow-up:", err);
        const permissionError = new FirestorePermissionError({
            path: soulRef.path,
            operation: 'update',
            requestResourceData: updatePayload,
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsLoading(false);
    }
  }

  const handleActionToggle = (actionId: string) => {
      if (!soul) return;
      const currentActions = form.getValues('actions') || [];
      const isSelected = currentActions.includes(actionId);

      if (isSelected) {
          form.setValue('actions', currentActions.filter(id => id !== actionId));
          return;
      }

      setClickedActionId(actionId);

      if (actionId === 'phone_call' || actionId === 'text_message' || actionId === 'prayed_together') {
          if (!soul.phone) {
              toast({ variant: 'destructive', title: 'Phone Missing', description: `Please save a number for ${soul.firstName} first.` });
              return;
          }
      }

      if (actionId === 'prayed_together') {
          setCustomPrayerText(resolveTemplate(prayerTemplates[0].text, soul));
          setIsPrayerCustomizationOpen(true);
      } else if (actionId === 'text_message') {
          setIsCommChannelDialogOpen(true);
      } else if (actionId === 'introduced_friend') {
          setIsShareTargetDialogOpen(true);
      } else if (actionId === 'phone_call') {
          window.location.href = `tel:${soul.phone}`;
          form.setValue('actions', [...currentActions, actionId]);
      } else if (actionId === 'helped_with_need') {
          setIsHelpNeedDialogOpen(true);
      } else {
          form.setValue('actions', [...currentActions, actionId]);
      }
  };

  const handlePrayerCustomizationConfirm = (text: string) => {
      setCustomPrayerText(text);
      setIsPrayerCustomizationOpen(false);
      requestAnimationFrame(() => {
          setIsCommChannelDialogOpen(true);
      });
  };

  const handleCommChoice = (channel: 'whatsapp' | 'sms') => {
      if (!soul?.phone || !clickedActionId) return;
      const cleanPhone = soul.phone.replace(/\+/g, '').replace(/\D/g, '');
      
      let message = customPrayerText || `Hi ${soul.firstName}, I'm thinking of you today and praying for you. God bless you!`;
      
      const messageText = encodeURIComponent(message);
      
      if (channel === 'whatsapp') {
          window.open(`https://wa.me/${cleanPhone}?text=${messageText}`, '_blank');
      } else {
          window.location.href = `sms:${soul.phone}?body=${messageText}`;
      }
      
      const current = form.getValues('actions') || [];
      form.setValue('actions', [...current, clickedActionId]);
      setIsCommChannelDialogOpen(false);
      setCustomPrayerText('');
  };

  const handleHelpNeedConfirm = (note: string) => {
      const currentNote = form.getValues('note') || '';
      const finalNote = currentNote ? `${currentNote}\n\nAct of Kindness: ${note}` : `Act of Kindness: ${note}`;
      form.setValue('note', finalNote);
      
      const currentActions = form.getValues('actions') || [];
      form.setValue('actions', [...currentActions, 'helped_with_need']);
      setIsHelpNeedDialogOpen(false);
  };

  const handleShareToWhatsApp = () => {
      if (!soul) return;
      const wonAt = safeToDate(soul.wonAt);
      const details = `Here is a soul I'm following up with on Testify:\nName: ${soul.firstName} ${soul.lastName}\nStatus: ${soul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\nLet's keep them in our prayers.`;
      
      window.open(`https://wa.me/?text=${encodeURIComponent(details)}`, '_blank');

      const current = form.getValues('actions') || [];
      form.setValue('actions', [...current, 'introduced_friend']);
      setIsShareTargetDialogOpen(false);
  };

  const handleShareToPartner = async (partner: UserProfile['accountabilityPartners'][0]) => {
      if (!user || !firestore || !soul || !userProfile) return;

      const wonAt = safeToDate(soul.wonAt);
      const text = `SHARING SOUL DATA:\nName: ${soul.firstName} ${soul.lastName}\nStatus: ${soul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\nRelationship: ${soul.relationship || 'Outreach'}\nLet's keep them in our prayers and coordinate follow-up.`;

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
          
          const current = form.getValues('actions') || [];
          form.setValue('actions', [...current, 'introduced_friend']);

          setIsPartnerSelectionDialogOpen(false);
          setIsShareTargetDialogOpen(false);
          router.push(`/dashboard/chats/${chatId}`);
      } catch (e) {
          toast({ variant: 'destructive', title: 'Share Failed' });
      }
  };

  const uniquePartners = React.useMemo(() => {
    const partners = userProfile?.accountabilityPartners || [];
    const uniqueMap = new Map();
    partners.forEach(p => {
        if (p.userId && !uniqueMap.has(p.userId)) {
            uniqueMap.set(p.userId, p);
        }
    });
    return Array.from(uniqueMap.values());
  }, [userProfile?.accountabilityPartners]);

  const formBody = (
    <Form {...form}>
        <div className="space-y-6 text-left">
            <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Interaction Notes</label>
                <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Textarea placeholder="Describe the spiritual interaction..." {...field} className="text-base min-h-[120px] rounded-2xl bg-muted/20" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Soul Status</label>
                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className={cn("font-bold text-base h-12 rounded-2xl", getStatusClasses(field.value as FollowUpStatus))}>
                                        <SelectValue placeholder="Set status" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-2xl">
                                    {statusOptions.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <div className="space-y-3 text-left">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Relationship Actions</label>
                <FormField
                    control={form.control}
                    name="actions"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                {actionItems.map((item) => {
                                    const isSelected = field.value?.includes(item.id);
                                    const Icon = iconMap[item.id] || Heart;
                                    return (
                                        <motion.div key={item.id} whileTap={{ scale: 0.95 }} className="w-full">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={cn(
                                                    "relative flex flex-col items-center justify-center gap-2 p-3 h-24 w-full text-center transition-all duration-300 rounded-3xl border-2 overflow-hidden",
                                                    isSelected 
                                                        ? "bg-primary/5 border-primary/40 shadow-inner ring-1 ring-primary/10" 
                                                        : "bg-background/40 hover:bg-muted/50 hover:border-primary/20"
                                                )}
                                                onClick={() => handleActionToggle(item.id)}
                                            >
                                                <AnimatePresence>
                                                    {isSelected && (
                                                        <motion.div 
                                                            initial={{ scale: 0, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            exit={{ scale: 0, opacity: 0 }}
                                                            className="absolute top-2 right-2 bg-primary rounded-full p-0.5 shadow-lg z-20"
                                                        >
                                                            <CheckCircle2 className="h-3 w-3 text-primary-foreground fill-current" />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                <div className={cn(
                                                    "h-8 w-8 rounded-2xl flex items-center justify-center transition-all duration-500",
                                                    isSelected ? "bg-primary/20 scale-110 shadow-lg" : "bg-muted/30"
                                                )}>
                                                    <Icon className={cn("h-4 w-4 transition-all", isSelected ? "text-primary fill-current" : "text-primary/60")} />
                                                </div>
                                                
                                                <div className="space-y-0.5 min-w-0 w-full">
                                                    <span className={cn(
                                                        "text-[9px] font-black uppercase tracking-tight block truncate",
                                                        isSelected ? "text-primary" : "text-foreground"
                                                    )}>
                                                        {item.label}
                                                    </span>
                                                </div>
                                            </Button>
                                        </motion.div>
                                    );
                                })}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <Accordion type="single" collapsible className="w-full space-y-3">
                <AccordionItem value="progress" className="border rounded-2xl overflow-hidden px-4 bg-muted/10">
                     <AccordionTrigger className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:no-underline text-left">Growth Milestones</AccordionTrigger>
                     <AccordionContent>
                        <div className="space-y-2 pt-2 pb-4 text-left">
                            <FormField
                                control={form.control}
                                name="attendingChurch"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-xl p-3 hover:bg-background/50 transition-colors">
                                        <FormLabel className="font-bold text-sm flex items-center gap-2.5 cursor-pointer text-left"><Church className="h-4 w-4 text-primary" />Attending Church</FormLabel>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="inBibleStudy"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-xl p-3 hover:bg-background/50 transition-colors">
                                        <FormLabel className="font-bold text-sm flex items-center gap-2.5 cursor-pointer text-left"><BookOpen className="h-4 w-4 text-primary" />In Bible Study</FormLabel>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                     </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    </Form>
  );

  const prayerContent = (
    <div className="space-y-6 text-left">
        <div className="space-y-3 text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Prayer Focus</label>
            <div className="flex flex-wrap gap-2 text-left">
                {prayerTemplates.map(t => (
                    <Button 
                        key={t.id} 
                        variant="outline" 
                        size="sm" 
                        className="rounded-full h-8 px-4 text-[9px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 hover:text-primary text-left"
                        onClick={() => soul && setCustomPrayerText(resolveTemplate(t.text, soul))}
                    >
                        {t.label}
                    </Button>
                ))}
            </div>
        </div>

        <div className="space-y-2 text-left">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Customize Your Prayer</Label>
            <Textarea 
                value={customPrayerText}
                onChange={e => setCustomPrayerText(e.target.value)}
                className="min-h-[200px] rounded-2xl bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6 text-left"
            />
        </div>

        <Button 
            onClick={() => handlePrayerCustomizationConfirm(customPrayerText)} 
            disabled={!customPrayerText.trim()} 
            className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest"
        >
            CONTINUE TO CHANNEL
        </Button>
    </div>
  );

  const PrayerCustomizationDialog = isMobile ? (
    <Drawer open={isPrayerCustomizationOpen} onOpenChange={setIsPrayerCustomizationOpen}>
        <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
            <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                <DrawerHeader className="text-left flex-shrink-0">
                    <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Kingdom Intercession</DrawerTitle>
                    <DrawerDescription className="text-sm font-medium mt-1 text-left">Draft a powerful prayer for {soul?.firstName}.</DrawerDescription>
                    <div className="flex items-center gap-2 mt-4 text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Swipe down to close</span></div>
                </DrawerHeader>
            </div>
            <ScrollArea className="flex-grow p-8">
                {prayerContent}
            </ScrollArea>
        </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={isPrayerCustomizationOpen} onOpenChange={setIsPrayerCustomizationOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl text-left">
            <div className="p-8 border-b bg-muted/10 text-left">
                <DialogHeader className="text-left">
                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Kingdom Intercession</DialogTitle>
                    <DialogDescription className="text-sm font-medium">Draft a powerful prayer for {soul?.firstName}.</DialogDescription>
                </DialogHeader>
            </div>
            <div className="p-8">
                {prayerContent}
            </div>
        </DialogContent>
    </Dialog>
  );

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

  const CommDialog = isMobile ? (
    <Drawer open={isCommChannelDialogOpen} onOpenChange={setIsCommChannelDialogOpen}>
      <DrawerContent className="p-0 rounded-t-[2.5rem] h-auto pb-12 text-left">
        <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
            <DrawerHeader className="text-center space-y-2">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-center text-left">
                    <MessageSquare className="h-7 w-7 text-primary" />
                </div>
                <DrawerTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center">Message Hub</DrawerTitle>
                <DrawerDescription className="text-sm font-medium text-center">How would you like to encourage {soul?.firstName}?</DrawerDescription>
                <div className="flex items-center justify-center gap-2 mt-4 text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center">Swipe down to close</span></div>
            </DrawerHeader>
        </div>
        <div className="p-8">
            {commBody}
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={isCommChannelDialogOpen} onOpenChange={setIsCommChannelDialogOpen}>
      <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center text-left">
        <DialogHeader className="text-center space-y-2 text-left">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-center">
                <MessageSquare className="h-7 w-7 text-primary" />
            </div>
          <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center">Message Hub</DialogTitle>
          <DialogDescription className="text-sm font-medium text-center">How would you like to encourage {soul?.firstName}?</DialogDescription>
        </DialogHeader>
        {commBody}
      </DialogContent>
    </Dialog>
  );

  const helpContent = (
    <div className="space-y-6 text-left">
      <div className="space-y-2 text-left">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Support Details</Label>
          <Textarea 
              placeholder="e.g. Provided food items, helped with bill..." 
              onChange={e => setCustomPrayerText(e.target.value)}
              className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner"
          />
      </div>
      <Button onClick={() => handleHelpNeedConfirm(customPrayerText)} className="w-full h-14 rounded-2xl font-black shadow-lg uppercase tracking-widest">CONFIRM SERVICE</Button>
    </div>
  );

  const NeedDialog = isMobile ? (
    <Drawer open={isHelpNeedDialogOpen} onOpenChange={setIsHelpNeedDialogOpen}>
      <DrawerContent className="h-auto max-h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
        <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
            <DrawerHeader className="text-left flex-shrink-0">
                <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Support Provided</DrawerTitle>
                <DrawerDescription className="text-sm font-medium mt-1 text-left">Describe how you supported {soul?.firstName}.</DrawerDescription>
                <div className="flex items-center gap-2 mt-4 text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-left">Swipe down to close</span></div>
            </DrawerHeader>
        </div>
        <div className="p-8">
            {helpContent}
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={isHelpNeedDialogOpen} onOpenChange={setIsHelpNeedDialogOpen}>
      <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
        <div className="p-8 border-b bg-muted/10">
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Support Provided</DialogTitle>
            <DialogDescription className="text-sm font-medium text-left">Describe how you supported {soul?.firstName}.</DialogDescription>
          </DialogHeader>
        </div>
        <div className="p-8">
            {helpContent}
        </div>
      </DialogContent>
    </Dialog>
  );

  const shareTargetBody = (
    <div className="flex flex-col gap-3 pt-6 text-left">
      <Button onClick={handleShareToWhatsApp} className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20">
        <WhatsAppIcon className="h-5 w-5" /> WhatsApp External
      </Button>
      <Button onClick={() => { setIsShareTargetDialogOpen(false); setTimeout(() => setIsPartnerSelectionDialogOpen(true), 100); }} variant="outline" className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5">
        <HeartHandshake className="h-5 w-5" /> Partner on App
      </Button>
    </div>
  );

  const ShareTargetDialogEl = isMobile ? (
    <Drawer open={isShareTargetDialogOpen} onOpenChange={setIsShareTargetDialogOpen}>
      <DrawerContent className="p-0 rounded-t-[2.5rem] h-auto pb-12 text-left">
        <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
            <DrawerHeader className="text-center space-y-2 text-left">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-center text-left">
                    <Share className="h-7 w-7 text-primary" />
                </div>
                <DrawerTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center">Share Details</DrawerTitle>
                <DrawerDescription className="text-sm font-medium text-center">Where would you like to share {soul?.firstName}'s info?</DrawerDescription>
                <div className="flex items-center justify-center gap-2 mt-4 text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center">Swipe down to close</span></div>
            </DrawerHeader>
        </div>
        <div className="p-8">
            {shareTargetBody}
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={isShareTargetDialogOpen} onOpenChange={setIsShareTargetDialogOpen}>
      <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-left">
        <DialogHeader className="text-center space-y-2 text-left">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-center text-left">
                <Share className="h-7 w-7 text-primary" />
            </div>
          <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center">Share Details</DialogTitle>
          <DialogDescription className="text-sm font-medium text-center">Where would you like to share {soul?.firstName}'s info?</DialogDescription>
        </DialogHeader>
        {shareTargetBody}
      </DialogContent>
    </Dialog>
  );

  const partnerSelectionBody = (
    <ScrollArea className="h-64 text-left">
        <div className="space-y-2 text-left">
            {uniquePartners.map(p => (
                <Button 
                    key={p.userId} 
                    variant="ghost" 
                    className="w-full justify-start h-14 rounded-xl gap-4 hover:bg-primary/5 group text-left"
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
                <p className="text-center text-xs text-muted-foreground py-12">No partners found. Connect with some in Settings!</p>
            )}
        </div>
    </ScrollArea>
  );

  const PartnerSelectionDialog = isMobile ? (
    <Drawer open={isPartnerSelectionDialogOpen} onOpenChange={setIsPartnerSelectionDialogOpen}>
        <DrawerContent className="h-auto max-h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
            <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                <DrawerHeader className="text-left flex-shrink-0 text-left">
                    <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Select Partner</DrawerTitle>
                    <DrawerDescription className="text-sm font-medium mt-1 text-left">Which partner should receive these details?</DrawerDescription>
                    <div className="flex items-center gap-2 mt-4 text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-left">Swipe down to close</span></div>
                </DrawerHeader>
            </div>
            <div className="p-8">
                {partnerSelectionBody}
            </div>
        </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={isPartnerSelectionDialogOpen} onOpenChange={setIsPartnerSelectionDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left">
            <div className="p-8 border-b bg-muted/10 text-left text-left text-left">
                <DialogHeader className="text-left text-left text-left text-left">
                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Select Partner</DialogTitle>
                    <DialogDescription className="text-sm font-medium text-left text-left">Which partner should receive these details?</DialogDescription>
                </DialogHeader>
            </div>
            <div className="p-6 text-left text-left">
                {partnerSelectionBody}
            </div>
        </DialogContent>
    </Dialog>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
          {soul && (
            <>
              <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                <SheetHeader className="text-left text-left">
                    <div className="flex items-center gap-2 mb-2 text-left">
                        <Sparkles className="h-4 w-4 text-primary text-left" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Harvest Follow-up</span>
                    </div>
                    <SheetTitle className="text-2xl font-black font-headline leading-tight text-left">Log: {soul.firstName}</SheetTitle>
                    <SheetDescription className="text-sm font-medium mt-1 text-left">Record the latest spiritual development.</SheetDescription>
                </SheetHeader>
              </div>
              <ScrollArea className="flex-grow px-8 text-left">
                <div className="py-6 text-left">
                    {formBody}
                </div>
              </ScrollArea>
              <div className="p-8 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm text-left">
                <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isLoading} className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase text-left">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}
                    SAVE INTERACTION
                </Button>
              </div>
              {PrayerCustomizationDialog}
              {CommDialog}
              {NeedDialog}
              {ShareTargetDialogEl}
              {PartnerSelectionDialog}
            </>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh] p-0 rounded-3xl overflow-hidden text-left">
          {soul && (
            <>
              <div className="p-6 border-b shrink-0 bg-muted/10 text-left">
                  <DialogHeader className="text-left">
                      <DialogTitle className="text-2xl font-bold font-headline text-left">Log Follow-up for {soul.firstName}</DialogTitle>
                      <DialogDescription className="text-sm font-medium text-left">Record this interaction in the shared history.</DialogDescription>
                  </DialogHeader>
              </div>
              <ScrollArea className="flex-grow px-6 text-left">
                  <div className="py-6 text-left">
                      {formBody}
                  </div>
              </ScrollArea>
              <div className="p-6 border-t shrink-0 text-left text-left">
                  <DialogFooter className="text-left text-left">
                      <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isLoading} className="w-full h-12 rounded-2xl font-bold text-left text-left">
                          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}
                          Save Interaction
                      </Button>
                  </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {PrayerCustomizationDialog}
      {CommDialog}
      {NeedDialog}
      {ShareTargetDialogEl}
      {PartnerSelectionDialog}
    </>
  );
}
