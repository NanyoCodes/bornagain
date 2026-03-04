
"use client";

import * as React from "react";
import { format } from "date-fns";
import { MoreHorizontal, Church, BookOpen, HandHelping, Loader2, UserPlus, Edit, MapPin, Mail, Phone, ChevronDown } from "lucide-react";
import type { Soul, FollowUpStatus, FollowUpLogItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "../ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useFirestore, useUser } from "@/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { EditSoulForm } from "./edit-soul-form";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Badge } from "../ui/badge";

const statusOptions: FollowUpStatus[] = ['New', 'Contacted', 'Attending Church', 'In Bible Study', 'Established'];

const getStatusClasses = (status: FollowUpStatus | undefined): string => {
    if (!status) return 'bg-secondary text-secondary-foreground border-border';
    switch (status) {
        case 'New':
            return 'bg-[hsl(var(--status-new)/0.1)] text-[hsl(var(--status-new))] border-[hsl(var(--status-new)/0.2)]';
        case 'Contacted':
            return 'bg-[hsl(var(--status-contacted)/0.1)] text-[hsl(var(--status-contacted))] border-[hsl(var(--status-contacted)/0.2)]';
        case 'Attending Church':
            return 'bg-[hsl(var(--status-attending-church)/0.1)] text-[hsl(var(--status-attending-church))] border-[hsl(var(--status-attending-church)/0.2)]';
        case 'In Bible Study':
            return 'bg-[hsl(var(--status-bible-study)/0.1)] text-[hsl(var(--status-bible-study))] border-[hsl(var(--status-bible-study)/0.2)]';
        case 'Established':
            return 'bg-[hsl(var(--status-established)/0.1)] text-[hsl(var(--status-established))] border-[hsl(var(--status-established)/0.2)]';
        default:
            return 'bg-secondary text-secondary-foreground border-border';
    }
}


// --- LogFollowUpDialog Component Definition ---
const followUpIdeas = [
    { id: 'invite-service', label: 'Invited to small group/service' },
    { id: 'connect-leader', label: 'Connected with a leader/mentor' },
    { id: 'share-resources', label: 'Shared new believer resources' },
    { id: 'pray-needs', label: 'Prayed for their specific needs' },
    { id: 'schedule-meeting', label: 'Scheduled a follow-up meeting' },
];

const logFollowUpFormSchema = z.object({
    checklist: z.array(z.string()).optional(),
    note: z.string().min(1, { message: "A note is required." }),
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
      checklist: [],
      note: '',
    },
  });

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
        checklist: values.checklist || [],
      };

      await updateDoc(soulRef, {
        followUpLog: arrayUnion(newLogEntry),
      });

      toast({
        title: 'Follow-up Logged',
        description: `A new entry has been added for ${soul.name}.`,
      });
      setIsOpen(false);
      form.reset();
    } catch (error: any) {
      console.error('Error logging follow-up: ', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not log follow-up.' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Log Follow-up for {soul.name}</DialogTitle>
                <DialogDescription>
                    Select the actions you took and add any relevant notes.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="checklist"
                        render={() => (
                            <FormItem>
                                <div className="mb-4">
                                    <Label className="text-base">Follow-up Checklist</Label>
                                </div>
                                {followUpIdeas.map((item) => (
                                    <FormField
                                        key={item.id}
                                        control={form.control}
                                        name="checklist"
                                        render={({ field }) => {
                                            return (
                                                <FormItem
                                                    key={item.id}
                                                    className="flex flex-row items-start space-x-3 space-y-0"
                                                >
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(item.label)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...(field.value || []), item.label])
                                                                    : field.onChange(field.value?.filter((value) => value !== item.label));
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <Label className="font-normal">{item.label}</Label>
                                                </FormItem>
                                            );
                                        }}
                                    />
                                ))}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="note"
                        render={({ field }) => (
                            <FormItem>
                                <Label>Additional Notes (Required)</Label>
                                <FormControl>
                                    <Textarea placeholder="e.g., They are struggling with..." {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
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
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Follow-up History for {soul.name}</DialogTitle>
          <DialogDescription>A complete log of all follow-up interactions.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
                {soul.followUpLog && [...soul.followUpLog].reverse().map((log, index) => (
                    <div key={index}>
                        <p className="font-semibold text-sm mb-2">
                           {log.date ? format(log.date.toDate(), "PPP 'at' p") : 'Date not available'}
                        </p>
                        <div className="pl-4 border-l-2 space-y-3">
                            {log.checklist && log.checklist.length > 0 && (
                                <ul className="space-y-1 list-disc list-inside">
                                    {log.checklist.map((item, i) => (
                                        <li key={i} className="text-sm">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {log.note && (
                                <blockquote className="text-sm text-muted-foreground italic">
                                    &ldquo;{log.note}&rdquo;
                                </blockquote>
                            )}
                             {(!log.checklist || log.checklist.length === 0) && !log.note && (
                                 <p className="text-sm text-muted-foreground italic">No details recorded for this entry.</p>
                             )}
                        </div>
                         {index < soul.followUpLog.length - 1 && <Separator className="mt-6" />}
                    </div>
                ))}
                 {(!soul.followUpLog || soul.followUpLog.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-8">No follow-up history recorded yet.</p>
                )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

type ProcessedSoul = Soul & { _wonAt: Date };

type SoulsWonTableProps = {
  souls: ProcessedSoul[];
  onUpdateSoul: (soulId: string, data: Partial<Soul>) => void;
  loading: boolean;
};

function SoulCard({ soul, onUpdateSoul }: { soul: ProcessedSoul, onUpdateSoul: SoulsWonTableProps['onUpdateSoul'] }) {
    const { toast } = useToast();
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

    const handleStatusChange = (soulId: string, newStatus: FollowUpStatus) => {
        onUpdateSoul(soulId, { status: newStatus });
        toast({ title: "Status Updated", description: `Status updated to ${newStatus}.` });
    };

    const handleCheckboxChange = (soulId: string, field: 'attendingChurch' | 'inBibleStudy' | 'attendingPrayer', checked: boolean) => {
        onUpdateSoul(soulId, { [field]: checked });
        const activity = field === 'attendingChurch' ? 'Church Attendance' : field === 'inBibleStudy' ? 'Bible Study' : 'Prayer Meeting';
        toast({ title: "Follow-up Updated", description: `Follow-up status for ${activity} has been updated.` });
    };

    return (
        <Card>
            <Collapsible>
                <CollapsibleTrigger className="group w-full p-4 text-left">
                     <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold">{soul.name}</p>
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
                                {soul.locationWon && <div className="flex items-center gap-1 pt-1"><MapPin className="h-4 w-4" /> {soul.locationWon}</div>}
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
                                        <DialogDescription>Make changes to the record for {soul.name}.</DialogDescription>
                                    </DialogHeader>
                                    <EditSoulForm soul={soul} onSoulUpdated={() => setIsEditDialogOpen(false)} />
                                </DialogContent>
                            </Dialog>
                        </div>

                         <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={soul.status} onValueChange={(value: FollowUpStatus) => handleStatusChange(soul.id, value)}>
                                <SelectTrigger className={cn("font-semibold", getStatusClasses(soul.status))}>
                                    <SelectValue placeholder="Set status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Follow-up Milestones</Label>
                            <div className="space-y-3 rounded-md border p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Church className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-sm font-medium">Attending Church</span>
                                    </div>
                                    <Checkbox checked={soul.attendingChurch} onCheckedChange={(checked) => handleCheckboxChange(soul.id, 'attendingChurch', !!checked)} />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-sm font-medium">In Bible Study</span>
                                    </div>
                                    <Checkbox checked={soul.inBibleStudy} onCheckedChange={(checked) => handleCheckboxChange(soul.id, 'inBibleStudy', !!checked)} />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <HandHelping className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-sm font-medium">Attending Prayer</span>
                                    </div>
                                    <Checkbox checked={soul.attendingPrayer} onCheckedChange={(checked) => handleCheckboxChange(soul.id, 'attendingPrayer', !!checked)} />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between text-sm text-muted-foreground pt-4">
                            <span>{soul.source} {soul.sourceDetails ? `(${soul.sourceDetails})` : ''}</span>
                            <span>{format(soul._wonAt, "PPP")}</span>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}

export function SoulsWonTable({ souls, onUpdateSoul, loading }: SoulsWonTableProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);
  const [editingSoul, setEditingSoul] = React.useState<Soul | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);


  const handleStatusChange = (soulId: string, newStatus: FollowUpStatus) => {
    onUpdateSoul(soulId, { status: newStatus });
    toast({ title: "Status Updated", description: `Status updated to ${newStatus}.` });
  };

  const handleCheckboxChange = (soulId: string, field: 'attendingChurch' | 'inBibleStudy' | 'attendingPrayer', checked: boolean) => {
    onUpdateSoul(soulId, { [field]: checked });
    const activity = field === 'attendingChurch' ? 'Church Attendance' : field === 'inBibleStudy' ? 'Bible Study' : 'Prayer Meeting';
    toast({ title: "Follow-up Updated", description: `Follow-up status for ${activity} has been updated.` });
  };

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
            {souls.map((soul) => <SoulCard key={soul.id} soul={soul} onUpdateSoul={onUpdateSoul} />)}
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
              <TableHead>Location Won</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead>Won At</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {souls.map((soul) => (
              <TableRow key={soul.id}>
                <TableCell className="font-medium">
                  <div>{soul.name}</div>
                  {soul.church && <div className="text-xs text-muted-foreground flex items-center gap-1"><Church className="h-3 w-3" />{soul.church}</div>}
                </TableCell>
                <TableCell>
                  {soul.email && <div>{soul.email}</div>}
                  {soul.phone && <div className="text-xs text-muted-foreground">{soul.phone}</div>}
                </TableCell>
                <TableCell>
                  {soul.locationWon || '-'}
                </TableCell>
                <TableCell>
                  <Select value={soul.status} onValueChange={(value: FollowUpStatus) => handleStatusChange(soul.id, value)}>
                      <SelectTrigger className={cn("w-[150px] h-8 font-semibold", getStatusClasses(soul.status))}>
                          <SelectValue placeholder="Set status" />
                      </SelectTrigger>
                      <SelectContent>
                          {statusOptions.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={soul.attendingChurch ? 'secondary' : 'ghost'}
                                        size="icon"
                                        className={cn('h-8 w-8', soul.attendingChurch && 'border border-green-500/50')}
                                        onClick={() => handleCheckboxChange(soul.id, 'attendingChurch', !soul.attendingChurch)}
                                    >
                                        <Church className={cn('h-4 w-4', soul.attendingChurch ? 'text-green-600' : 'text-muted-foreground')} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Attending Church</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={soul.inBibleStudy ? 'secondary' : 'ghost'}
                                        size="icon"
                                        className={cn('h-8 w-8', soul.inBibleStudy && 'border border-green-500/50')}
                                        onClick={() => handleCheckboxChange(soul.id, 'inBibleStudy', !soul.inBibleStudy)}
                                    >
                                        <BookOpen className={cn('h-4 w-4', soul.inBibleStudy ? 'text-green-600' : 'text-muted-foreground')} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>In Bible Study</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={soul.attendingPrayer ? 'secondary' : 'ghost'}
                                        size="icon"
                                        className={cn('h-8 w-8', soul.attendingPrayer && 'border border-green-500/50')}
                                        onClick={() => handleCheckboxChange(soul.id, 'attendingPrayer', !soul.attendingPrayer)}
                                    >
                                        <HandHelping className={cn('h-4 w-4', soul.attendingPrayer ? 'text-green-600' : 'text-muted-foreground')} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Attending Prayer Meetings</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </TableCell>
                <TableCell>{format(soul._wonAt, "PPP")}</TableCell>
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
                       <DropdownMenuItem onSelect={() => {
                          setEditingSoul(soul);
                          setIsEditDialogOpen(true);
                       }}>
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
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
            setEditingSoul(null);
        }
    }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Soul Details</DialogTitle>
                <DialogDescription>Make changes to the record for {editingSoul?.name}.</DialogDescription>
            </DialogHeader>
            {editingSoul && <EditSoulForm soul={editingSoul} onSoulUpdated={() => setIsEditDialogOpen(false)} />}
        </DialogContent>
    </Dialog>
    </>
  );
}
