"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { cn } from "@/lib/utils";
import { actionItems, statusOptions } from "@/lib/follow-up-data";
import type { Soul, FollowUpLogItem, FollowUpStatus } from "@/lib/types";
import { Church, BookOpen, Heart, Users, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useIsMobile } from "@/hooks/use-mobile";

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
            return 'bg-[hsl(var(--status-new)/0.1)] text-[hsl(var(--status-new))] border-[hsl(var(--status-new)/0.2)]';
        case 'Contacted':
            return 'bg-[hsl(var(--status-contacted)/0.1)] text-[hsl(var(--status-contacted))] border-[hsl(var(--status-contacted)/0.2)]';
        case 'Established':
            return 'bg-[hsl(var(--status-established)/0.1)] text-[hsl(var(--status-established))] border-[hsl(var(--status-established)/0.2)]';
        default:
            return 'bg-secondary text-secondary-foreground border-border';
    }
}

interface LogFollowUpDialogProps {
  soul: Soul | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onFollowUpLogged: () => void;
}

export function LogFollowUpDialog({ soul, isOpen, onOpenChange, onFollowUpLogged }: LogFollowUpDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = React.useState(false);
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

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
        status: soul.status,
        attendingChurch: soul.attendingChurch || false,
        inBibleStudy: soul.inBibleStudy || false,
        attendingPrayer: soul.attendingPrayer || false,
        inServiceDepartment: soul.inServiceDepartment || false,
        actions: [],
      });
    }
  }, [isOpen, soul, form]);

  async function onSubmit(values: z.infer<typeof logFollowUpFormSchema>) {
    if (!user || !firestore || !soul) {
      toast({ variant: 'destructive', title: 'Error' });
      return;
    }
    
    setIsLoading(true);

    const soulRef = doc(firestore, `users/${user.uid}/souls`, soul.id);
    const newLogEntry: FollowUpLogItem = {
        date: new Date() as any,
        note: values.note || '',
        actions: values.actions || [],
    };
    const updatePayload = {
        followUpLog: arrayUnion(newLogEntry),
        status: values.status,
        attendingChurch: values.attendingChurch,
        inBibleStudy: values.inBibleStudy,
        attendingPrayer: values.attendingPrayer,
        inServiceDepartment: values.inServiceDepartment,
    };
    
    try {
        await updateDoc(soulRef, updatePayload);
        toast({
            title: 'Follow-up Logged',
            description: `A new entry has been added for ${soul.firstName} ${soul.lastName}.`,
        });
        onFollowUpLogged();
    } catch (err: any) {
        console.error("Failed to log follow-up:", err);
        if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: soulRef.path,
                operation: 'update',
                requestResourceData: updatePayload,
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: err.message || "Could not log follow-up.",
            });
        }
    } finally {
        setIsLoading(false);
    }
  }

  const formBody = (
    <Form {...form}>
        <form id="log-follow-up-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g., They are struggling with..." {...field} className="text-base" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Update Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger className={cn("font-semibold text-base", getStatusClasses(field.value as FollowUpStatus))}>
                                    <SelectValue placeholder="Set status" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {statusOptions.map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="actions">
                    <AccordionTrigger className="text-sm font-medium">Actions Taken</AccordionTrigger>
                    <AccordionContent>
                        <FormField
                            control={form.control}
                            name="actions"
                            render={() => (
                                <FormItem className="space-y-3 pt-4">
                                    <FormDescription>
                                        Select all relationship-building actions taken during this follow-up.
                                    </FormDescription>
                                    <div className="grid grid-cols-2 gap-4">
                                        {actionItems.map((item) => (
                                        <FormField
                                            key={item.id}
                                            control={form.control}
                                            name="actions"
                                            render={({ field }) => {
                                            return (
                                                <FormItem
                                                key={item.id}
                                                className="flex flex-row items-start space-x-3 space-y-0"
                                                >
                                                <FormControl>
                                                    <Checkbox
                                                    checked={field.value?.includes(item.id)}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                        ? field.onChange([...(field.value || []), item.id])
                                                        : field.onChange(
                                                            field.value?.filter(
                                                                (value) => value !== item.id
                                                            )
                                                            )
                                                    }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm cursor-pointer">
                                                    {item.label}
                                                </FormLabel>
                                                </FormItem>
                                            )
                                            }}
                                        />
                                        ))}
                                    </div>
                                </FormItem>
                            )}
                        />
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="progress">
                     <AccordionTrigger className="text-sm font-medium">Progress Update</AccordionTrigger>
                     <AccordionContent>
                        <div className="space-y-1 pt-4">
                             <p className="text-sm text-muted-foreground pb-2">
                                Update their progress on key spiritual disciplines.
                            </p>
                            <FormField
                                control={form.control}
                                name="attendingChurch"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-md p-2 -mx-2 hover:bg-muted/50">
                                        <div>
                                            <FormLabel className="font-normal flex items-center gap-2 cursor-pointer"><Church className="h-4 w-4" />Attending Church</FormLabel>
                                            <FormMessage className="text-xs" />
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="inServiceDepartment"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-md p-2 -mx-2 hover:bg-muted/50">
                                        <div>
                                            <FormLabel className="font-normal flex items-center gap-2 cursor-pointer"><Users className="h-4 w-4" />In Service Department</FormLabel>
                                            <FormMessage className="text-xs" />
                                        </div>
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
                                    <FormItem className="flex flex-row items-center justify-between rounded-md p-2 -mx-2 hover:bg-muted/50">
                                        <FormLabel className="font-normal flex items-center gap-2 cursor-pointer"><BookOpen className="h-4 w-4" />In Bible Study</FormLabel>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="attendingPrayer"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-md p-2 -mx-2 hover:bg-muted/50">
                                        <FormLabel className="font-normal flex items-center gap-2 cursor-pointer"><Heart className="h-4 w-4" />Attending Prayer</FormLabel>
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
        <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0">
          {soul && (
            <>
              <div className="p-6 border-b flex-shrink-0">
                <SheetHeader className="text-left flex-shrink-0">
                    <SheetTitle>Log Follow-up: {soul.firstName}</SheetTitle>
                    <SheetDescription>Record your interaction and update their progress.</SheetDescription>
                </SheetHeader>
              </div>
              <div className="flex-grow overflow-y-auto px-6 py-4">
                {formBody}
              </div>
              <div className="p-6 border-t flex-shrink-0">
                <Button type="submit" form="log-follow-up-form" disabled={isLoading} className="w-full h-12 text-lg">
                    {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Save Follow-up
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isLoading) { onOpenChange(open); } }}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
        {soul && (
          <>
            <DialogHeader>
                <DialogTitle>Log Follow-up for {soul.firstName} {soul.lastName}</DialogTitle>
                <DialogDescription>
                    Record your interaction and update their progress.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto -mx-6 px-6">
                {formBody}
            </div>
            <DialogFooter className="flex-shrink-0 pt-4 border-t">
                <Button type="submit" form="log-follow-up-form" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Log
                </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
