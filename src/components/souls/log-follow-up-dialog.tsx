"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { doc, arrayUnion, writeBatch, serverTimestamp } from "firebase/firestore";
import { useFirestore, useUser, useDoc } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";
import { actionItems, statusOptions } from "@/lib/follow-up-data";
import type { Soul, FollowUpStatus, UserProfile } from "@/lib/types";
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
  CheckCircle2
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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

  const currentUserRef = React.useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: fetchedProfile } = useDoc<UserProfile>(currentUserRef);
  const userProfile = providedProfile || fetchedProfile;

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
      // Only reset the form when the dialog opens or the soul ID changes.
      form.reset({
        note: form.getValues('note') || '',
        status: soul.status || 'New',
        attendingChurch: soul.attendingChurch || false,
        inBibleStudy: soul.inBibleStudy || false,
        attendingPrayer: soul.attendingPrayer || false,
        inServiceDepartment: soul.inServiceDepartment || false,
        actions: form.getValues('actions') || [],
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

  const formBody = (
    <Form {...form}>
        <form id="log-follow-up-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Spiritual Status</label>
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
            
            <div className="space-y-3">
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
                                                onClick={() => {
                                                    const nextValue = isSelected
                                                        ? field.value?.filter(v => v !== item.id)
                                                        : [...(field.value || []), item.id];
                                                    field.onChange(nextValue);
                                                }}
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
                                                    {isSelected && (item.id === 'shared_meal' || item.id === 'gave_gift') && (
                                                        <button 
                                                            type="button" 
                                                            className="text-[8px] font-black uppercase text-primary underline animate-in fade-in slide-in-from-bottom-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const path = item.id === 'shared_meal' ? '/dashboard/marketplace' : '/dashboard/marketplace/gifts';
                                                                router.push(`${path}?soulId=${soul?.id}&soulName=${encodeURIComponent(soul?.firstName || '')}&actionId=${item.id}`);
                                                                onOpenChange(false);
                                                            }}
                                                        >
                                                            GO TO HUB
                                                        </button>
                                                    )}
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
                     <AccordionTrigger className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:no-underline">Growth Milestones</AccordionTrigger>
                     <AccordionContent>
                        <div className="space-y-2 pt-2 pb-4">
                            <FormField
                                control={form.control}
                                name="attendingChurch"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-xl p-3 hover:bg-background/50 transition-colors">
                                        <FormLabel className="font-bold text-sm flex items-center gap-2.5 cursor-pointer"><Church className="h-4 w-4 text-primary" />Attending Church</FormLabel>
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
                                        <FormLabel className="font-bold text-sm flex items-center gap-2.5 cursor-pointer"><BookOpen className="h-4 w-4 text-primary" />In Bible Study</FormLabel>
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
        </form>
    </Form>
  );

  if (!mounted) return null;

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
          {soul && (
            <>
              <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                <SheetHeader className="text-left">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Harvest Follow-up</span>
                    </div>
                    <SheetTitle className="text-2xl font-black font-headline leading-tight">Log: {soul.firstName}</SheetTitle>
                    <SheetDescription className="text-sm font-medium mt-1">Record the latest spiritual development.</SheetDescription>
                </SheetHeader>
              </div>
              <ScrollArea className="flex-grow px-8">
                <div className="py-6">
                    {formBody}
                </div>
              </ScrollArea>
              <div className="p-8 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm">
                <Button type="submit" form="log-follow-up-form" disabled={isLoading} className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    SAVE INTERACTION
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh] p-0 rounded-3xl overflow-hidden">
        {soul && (
          <>
            <div className="p-6 border-b shrink-0 bg-muted/10">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold font-headline">Log Follow-up for {soul.firstName}</DialogTitle>
                    <DialogDescription className="text-sm font-medium">Record this interaction in the shared history.</DialogDescription>
                </DialogHeader>
            </div>
            <ScrollArea className="flex-grow px-6">
                <div className="py-6">
                    {formBody}
                </div>
            </ScrollArea>
            <div className="p-6 border-t shrink-0">
                <DialogFooter>
                    <Button type="submit" form="log-follow-up-form" disabled={isLoading} className="w-full h-12 rounded-2xl font-bold">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Interaction
                    </Button>
                </DialogFooter>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
