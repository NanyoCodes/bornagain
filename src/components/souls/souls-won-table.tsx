
"use client";

import * as React from "react";
import { format } from "date-fns";
import { MoreHorizontal, Church, UserPlus, Edit, MapPin, Mail, Phone, ChevronDown, BookOpen, Heart, Users } from "lucide-react";
import type { Soul, FollowUpStatus, FollowUpLogItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "../ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useFirestore, useUser } from "@/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { EditSoulForm } from "./edit-soul-form";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const statusOptions: FollowUpStatus[] = ['New', 'Contacted', 'Established'];
const actionItems = [
  { id: 'prayed_together', label: 'Prayed together' },
  { id: 'studied_bible', label: 'Studied Bible' },
  { id: 'shared_meal', label: 'Shared a meal' },
  { id: 'visited_home', label: 'Visited their home' },
  { id: 'introduced_friend', label: 'Introduced to a friend' },
  { id: 'gave_gift', label: 'Gave a gift' },
];

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


// --- LogFollowUpDialog Component Definition ---
const logFollowUpFormSchema = z.object({
    note: z.string().min(1, { message: "A note is required." }),
    status: z.enum(statusOptions),
    attendingChurch: z.boolean(),
    inBibleStudy: z.boolean(),
    attendingPrayer: z.boolean(),
    inServiceDepartment: z.boolean(),
    actions: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
    if (data.status === 'Established') {
        if (!data.attendingChurch) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Required for 'Established' status.",
                path: ['attendingChurch']
            });
        }
        if (!data.inServiceDepartment) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Required for 'Established' status.",
                path: ['inServiceDepartment']
            });
        }
    }
});


function LogFollowUpDialog({ soul, children }: { soul: Soul; children: React.ReactNode; }) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  const form = useForm<z.infer<typeof logFollowUpFormSchema>>({
    resolver: zodResolver(logFollowUpFormSchema),
    defaultValues: {
      note: '',
      status: soul.status,
      attendingChurch: soul.attendingChurch || false,
      inBibleStudy: soul.inBibleStudy || false,
      attendingPrayer: soul.attendingPrayer || false,
      inServiceDepartment: soul.inServiceDepartment || false,
      actions: [],
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
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
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }
    
    setIsLoading(true);

    try {
      const soulRef = doc(firestore, `users/${user.uid}/souls`, soul.id);
      
      const newLogEntry: FollowUpLogItem = {
        date: new Date() as any,
        note: values.note || '',
        actions: values.actions || [],
      };

      await updateDoc(soulRef, {
        followUpLog: arrayUnion(newLogEntry),
        status: values.status,
        attendingChurch: values.attendingChurch,
        inBibleStudy: values.inBibleStudy,
        attendingPrayer: values.attendingPrayer,
        inServiceDepartment: values.inServiceDepartment,
      });

      toast({
        title: 'Follow-up Logged',
        description: `A new entry has been added for ${soul.firstName} ${soul.lastName}.`,
      });
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error logging follow-up: ', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not log follow-up.' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isLoading) { setIsOpen(open); } }}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Log Follow-up for {soul.firstName} {soul.lastName}</DialogTitle>
                <DialogDescription>
                    Record your interaction and update their progress.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="note"
                        render={({ field }) => (
                            <FormItem>
                                <Label>Notes (Required)</Label>
                                <FormControl>
                                    <Textarea placeholder="e.g., They are struggling with..." {...field} value={field.value ?? ''} />
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
                                <Label>Update Status</Label>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className={cn("font-semibold", getStatusClasses(field.value as FollowUpStatus))}>
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
                                                        <FormLabel className="font-normal text-sm">
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

                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Log
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
}

// --- ViewHistoryDialog Component Definition ---
function ViewHistoryDialog({ soul, children }: { soul: Soul; children: React.ReactNode; }) {
  const sortedHistory = React.useMemo(() => {
    if (!soul.followUpLog || soul.followUpLog.length === 0) return [];
    return [...soul.followUpLog].sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate().getTime() : 0;
      const dateB = b.date?.toDate ? b.date.toDate().getTime() : 0;
      return dateB - dateA;
    });
  }, [soul.followUpLog]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Follow-up History for {soul.firstName} {soul.lastName}</DialogTitle>
          <DialogDescription>A complete log of all follow-up interactions.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
                {sortedHistory.length > 0 ? sortedHistory.map((log, index) => (
                    <div key={index}>
                        <p className="font-semibold text-sm mb-2">
                           {log.date ? format(log.date.toDate(), "PPP 'at' p") : 'Date not available'}
                        </p>
                        <div className="pl-4 border-l-2 space-y-3">
                           {log.actions && log.actions.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {log.actions.map(actionId => {
                                        const action = actionItems.find(a => a.id === actionId);
                                        return action ? (
                                            <Badge key={actionId} variant="secondary">{action.label}</Badge>
                                        ) : null;
                                    })}
                                </div>
                            )}
                           {log.note ? (
                                <blockquote className="text-sm text-muted-foreground italic">
                                    &ldquo;{log.note}&rdquo;
                                </blockquote>
                            ) : (
                                 <p className="text-sm text-muted-foreground italic">No details recorded for this entry.</p>
                             )}
                        </div>
                         {index < sortedHistory.length - 1 && <Separator className="mt-6" />}
                    </div>
                )) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No follow-up history recorded yet.</p>
                )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SoulCard({ soul }: { soul: Soul }) {
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    
    const latestFollowUp = React.useMemo(() => {
        if (!soul.followUpLog || soul.followUpLog.length === 0) return null;
        // This is a more performant way to find the latest item than sorting the whole array
        return soul.followUpLog.reduce((latest, current) => {
            if (!latest.date?.toDate) return current;
            if (!current.date?.toDate) return latest;
            return current.date.toDate() > latest.date.toDate() ? current : latest;
        });
    }, [soul.followUpLog]);

    const wonAt = React.useMemo(() => soul.wonAt?.toDate ? soul.wonAt.toDate() : new Date(), [soul.wonAt]);
    
    const locationWonString = React.useMemo(() => {
        if (!soul.locationWon) return null;
        return [soul.locationWon.city, soul.locationWon.state, soul.locationWon.country].filter(Boolean).join(', ');
    }, [soul.locationWon]);

    return (
        <Card>
            <Collapsible>
                <CollapsibleTrigger className="group w-full p-4 text-left">
                     <div className="flex items-center justify-between">
                        <div className="min-w-0">
                            <p className="font-semibold truncate">{soul.firstName || 'Unknown'} {soul.lastName || ''}</p>
                            <Badge className={cn("mt-1", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                        </div>
                        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                    <div className="border-t pt-4 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="text-sm text-muted-foreground space-y-1">
                                {soul.email && <div className="truncate flex items-center gap-2"><Mail className="h-4 w-4"/>{soul.email}</div>}
                                {soul.phone && <div className="truncate flex items-center gap-2 mt-1"><Phone className="h-4 w-4"/>{soul.phone}</div>}
                                {soul.church && <div className="flex items-center gap-1 pt-2"><Church className="h-4 w-4" /> {soul.church}</div>}
                                {locationWonString && <div className="flex items-center gap-1 pt-1"><MapPin className="h-4 w-4" /> {locationWonString}</div>}
                            </div>
                            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            <Edit className="mr-2 h-4 w-4"/>
                                            Edit
                                        </DropdownMenuItem>
                                    </DialogTrigger>
                                    <LogFollowUpDialog soul={soul}>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Log Follow-up</DropdownMenuItem>
                                    </LogFollowUpDialog>
                                    <ViewHistoryDialog soul={soul}>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>View History</DropdownMenuItem>
                                    </ViewHistoryDialog>
                                </DropdownMenuContent>
                                </DropdownMenu>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Edit Soul Details</DialogTitle>
                                        <DialogDescription>Make changes to the record for {soul.firstName} {soul.lastName}.</DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[70vh] overflow-y-auto pr-2">
                                        <EditSoulForm soul={soul} onSoulUpdated={() => setIsEditDialogOpen(false)} />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                        
                        <div className="space-y-3 pt-4 border-t">
                            <Label>Follow-up</Label>
                            <div className="border rounded-lg p-4 space-y-4">
                               {latestFollowUp ? (
                                    <div className="text-sm">
                                        <p className="font-semibold text-muted-foreground">Latest Log: {format(latestFollowUp.date.toDate(), "PPP")}</p>
                                        {latestFollowUp.actions && latestFollowUp.actions.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {latestFollowUp.actions.map(actionId => {
                                                    const action = actionItems.find(a => a.id === actionId);
                                                    return action ? <Badge key={actionId} variant="secondary" className="text-xs font-normal">{action.label}</Badge> : null
                                                })}
                                            </div>
                                        )}
                                        <p className="italic line-clamp-2 mt-2">&ldquo;{latestFollowUp.note}&rdquo;</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No follow-up logged yet.</p>
                                )}
                                <div className="flex gap-2 w-full">
                                    <LogFollowUpDialog soul={soul}>
                                        <Button size="sm" className="w-full">Log Follow-up</Button>
                                    </LogFollowUpDialog>
                                    <ViewHistoryDialog soul={soul}>
                                        <Button size="sm" variant="outline" className="w-full">View History</Button>
                                    </ViewHistoryDialog>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between text-sm text-muted-foreground pt-4">
                            <span>{soul.source} {soul.sourceDetails ? `(${soul.sourceDetails})` : ''}</span>
                            <span>{format(wonAt, "PPP")}</span>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}

function SoulTableRow({ soul, onEditClick }: { soul: Soul, onEditClick: (soul: Soul) => void }) {
    const latestFollowUp = React.useMemo(() => {
        if (!soul.followUpLog || soul.followUpLog.length === 0) return null;
        return soul.followUpLog.reduce((latest, current) => {
            const latestTime = latest.date?.toDate ? latest.date.toDate().getTime() : 0;
            const currentTime = current.date?.toDate ? current.date.toDate().getTime() : 0;
            return currentTime > latestTime ? current : latest;
        });
    }, [soul.followUpLog]);

    const wonAt = React.useMemo(() => soul.wonAt?.toDate ? soul.wonAt.toDate() : new Date(), [soul.wonAt]);

    return (
        <TableRow>
            <TableCell className="font-medium">
                <div>{soul.firstName || 'Unknown'} {soul.lastName || ''}</div>
                {soul.church && <div className="text-xs text-muted-foreground flex items-center gap-1"><Church className="h-3 w-3" />{soul.church}</div>}
            </TableCell>
            <TableCell>
                {soul.email && <div>{soul.email}</div>}
                {soul.phone && <div className="text-xs text-muted-foreground">{soul.phone}</div>}
            </TableCell>
            <TableCell>
                <Badge className={cn("w-[150px] justify-center", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
            </TableCell>
            <TableCell>
                {latestFollowUp ? (
                    <div className="text-xs space-y-1">
                        <div className="text-muted-foreground font-semibold">
                            {format(latestFollowUp.date.toDate(), "PPP")}
                        </div>
                        {latestFollowUp.actions && latestFollowUp.actions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {latestFollowUp.actions.map(actionId => {
                                    const action = actionItems.find(a => a.id === actionId);
                                    return action ? <Badge key={actionId} variant="secondary" className="font-normal">{action.label}</Badge> : null
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-xs text-muted-foreground">No logs</div>
                )}
            </TableCell>
            <TableCell>{format(wonAt, "PPP")}</TableCell>
            <TableCell>
                <div>{soul.source}</div>
                {soul.sourceDetails && <div className="text-xs text-muted-foreground">{soul.sourceDetails}</div>}
            </TableCell>
            <TableCell>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => onEditClick(soul)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <LogFollowUpDialog soul={soul}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Log Follow-up</DropdownMenuItem>
                        </LogFollowUpDialog>
                        <ViewHistoryDialog soul={soul}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>View History</DropdownMenuItem>
                        </ViewHistoryDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
}

type SoulsWonTableProps = {
  souls: Soul[];
  loading: boolean;
};

export function SoulsWonTable({ souls, loading }: SoulsWonTableProps) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);
  const [editingSoul, setEditingSoul] = React.useState<Soul | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  
  const handleEditClick = React.useCallback((soul: Soul) => {
    setEditingSoul(soul);
    setIsEditDialogOpen(true);
  }, []);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (loading || !mounted) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full max-w-sm" />
            </CardHeader>
            <CardContent className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-2">
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-24" />
                    </div>
                ))}
            </CardContent>
        </Card>
    )
  }
  
  if (souls.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Follow-up Dashboard</CardTitle>
                <CardDescription>
                A list of souls won. Keep track of their spiritual journey.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-12 flex flex-col items-center">
                    <UserPlus className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Records Found</h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                        No souls match your current search. Try changing your filters or add a new soul to your list.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
  }

  if (isMobile) {
      return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Follow-up Dashboard</CardTitle>
                    <CardDescription>
                    A list of souls won. Keep track of their spiritual journey.
                    </CardDescription>
                </CardHeader>
            </Card>
            {souls.map((soul) => <SoulCard key={soul.id} soul={soul} />)}
        </div>
      )
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Follow-up Dashboard</CardTitle>
        <CardDescription>
          A list of souls won. Keep track of their spiritual journey.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Follow-up</TableHead>
              <TableHead>Won At</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {souls.map((soul) => (
              <SoulTableRow key={soul.id} soul={soul} onEditClick={handleEditClick} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Soul Details</DialogTitle>
                <DialogDescription>Make changes to the record for {editingSoul?.firstName} {editingSoul?.lastName}.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto pr-2">
              {editingSoul && <EditSoulForm soul={editingSoul} onSoulUpdated={() => { setIsEditDialogOpen(false); setEditingSoul(null); }} />}
            </div>
        </DialogContent>
    </Dialog>
    </>
  );
}

    