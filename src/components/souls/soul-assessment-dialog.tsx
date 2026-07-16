
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  Sparkles, 
  Heart, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Zap,
  Target
} from 'lucide-react';
import type { Soul, SoulNeedsAssessment } from '@/lib/types';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const assessmentSchema = z.object({
  generalImpression: z.string().max(1000).optional(),
  followUpPlan: z.string().max(1000).optional(),
  emotionalNeeds: z.string().max(500).optional(),
  physicalNeeds: z.string().max(500).optional(),
  financialNeeds: z.string().max(500).optional(),
  socialNeeds: z.string().max(500).optional(),
  otherNeeds: z.string().max(500).optional(),
});

interface SoulAssessmentDialogProps {
  soul: Soul | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SoulAssessmentDialog({ soul, isOpen, onOpenChange }: SoulAssessmentDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof assessmentSchema>>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      generalImpression: soul?.needsAssessment?.generalImpression || '',
      followUpPlan: soul?.needsAssessment?.followUpPlan || '',
      emotionalNeeds: soul?.needsAssessment?.emotionalNeeds || '',
      physicalNeeds: soul?.needsAssessment?.physicalNeeds || '',
      financialNeeds: soul?.needsAssessment?.financialNeeds || '',
      socialNeeds: soul?.needsAssessment?.socialNeeds || '',
      otherNeeds: soul?.needsAssessment?.otherNeeds || '',
    },
  });

  React.useEffect(() => {
    if (isOpen && soul) {
      form.reset({
        generalImpression: soul.needsAssessment?.generalImpression || '',
        followUpPlan: soul.needsAssessment?.followUpPlan || '',
        emotionalNeeds: soul.needsAssessment?.emotionalNeeds || '',
        physicalNeeds: soul.needsAssessment?.physicalNeeds || '',
        financialNeeds: soul.needsAssessment?.financialNeeds || '',
        socialNeeds: soul.needsAssessment?.socialNeeds || '',
        otherNeeds: soul.needsAssessment?.otherNeeds || '',
      });
    }
  }, [isOpen, soul, form]);

  const onSubmit = async (values: z.infer<typeof assessmentSchema>) => {
    if (!user || !firestore || !soul) return;
    setIsSubmitting(true);

    const soulRef = doc(firestore, `users/${soul.userId}/souls`, soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);

    const assessment: SoulNeedsAssessment = {
      ...values,
      updatedAt: serverTimestamp() as any,
    };

    try {
      await updateDoc(soulRef, { needsAssessment: assessment });
      await updateDoc(globalSoulRef, { needsAssessment: assessment });
      
      toast({ title: 'Assessment Saved', description: `Needs recorded for ${soul.firstName}.` });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Update Failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = `Needs Assessment: ${soul?.firstName}`;
  const description = "Analyze the convert's current state and prepare a follow-up strategy.";

  const content = (
    <div className="p-6 sm:p-8 space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 px-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Soul Impression</h3>
              </div>
              <FormField
                control={form.control}
                name="generalImpression"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-widest ml-1">Spiritual State</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What do you think about their current spiritual climate?" 
                        className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="followUpPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-widest ml-1">Follow-up Strategy</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="How ought this soul to be followed up?" 
                        className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="opacity-50" />

            <div className="space-y-4">
               <div className="flex items-center gap-2.5 px-1">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Identifying Gaps</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="emotionalNeeds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                           <Heart className="h-3 w-3 text-red-500" /> Emotional
                        </FormLabel>
                        <FormControl>
                          <Textarea placeholder="Lacks peace, joy..." className="rounded-xl bg-muted/20 border-none shadow-inner min-h-[80px]" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="physicalNeeds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                           <Zap className="h-3 w-3 text-amber-500" /> Physical
                        </FormLabel>
                        <FormControl>
                          <Textarea placeholder="Health challenges, strength..." className="rounded-xl bg-muted/20 border-none shadow-inner min-h-[80px]" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="financialNeeds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                           <ShieldCheck className="h-3 w-3 text-blue-500" /> Financial
                        </FormLabel>
                        <FormControl>
                          <Textarea placeholder="Financial lack, unemployment..." className="rounded-xl bg-muted/20 border-none shadow-inner min-h-[80px]" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="socialNeeds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                           <Users className="h-3 w-3 text-indigo-500" /> Social
                        </FormLabel>
                        <FormControl>
                          <Textarea placeholder="Lacks community, isolation..." className="rounded-xl bg-muted/20 border-none shadow-inner min-h-[80px]" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
              </div>

              <FormField
                control={form.control}
                name="otherNeeds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest ml-1">Other Areas</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any other specific needs identified..." className="rounded-xl bg-muted/20 border-none shadow-inner min-h-[80px]" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full h-14 rounded-2xl font-black shadow-xl shadow-primary/20 tracking-widest uppercase"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Assessment
          </Button>
        </form>
      </Form>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
          <div className="p-8 border-b shrink-0 bg-muted/10">
            <SheetHeader className="text-left">
              <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">{title}</SheetTitle>
              <SheetDescription className="text-sm font-medium mt-1">{description}</SheetDescription>
            </SheetHeader>
          </div>
          <ScrollArea className="flex-grow min-h-0">
            {content}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
        <div className="p-8 border-b shrink-0 bg-muted/10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">{title}</DialogTitle>
            <DialogDescription className="text-sm font-medium">{description}</DialogDescription>
          </DialogHeader>
        </div>
        <ScrollArea className="flex-grow min-h-0">
          {content}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
