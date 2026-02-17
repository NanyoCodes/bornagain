"use client";

import * as React from "react";
import { format } from "date-fns";
import { MoreHorizontal, Church, BookOpen, HandHelping } from "lucide-react";
import type { Soul, FollowUpStatus } from "@/lib/types";

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


type SoulsWonTableProps = {
  souls: Soul[];
  onUpdateSoul: (soulId: string, data: Partial<Soul>) => void;
  loading: boolean;
};

const statusOptions: FollowUpStatus[] = ['New', 'Contacted', 'Attending Church', 'In Bible Study', 'Established'];

export function SoulsWonTable({ souls, onUpdateSoul, loading }: SoulsWonTableProps) {
  const { toast } = useToast();

  const handleStatusChange = (soulId: string, newStatus: FollowUpStatus) => {
    onUpdateSoul(soulId, { status: newStatus });
    toast({ title: "Status Updated", description: `Status updated to ${newStatus}.` });
  };

  const handleCheckboxChange = (soulId: string, field: 'attendingChurch' | 'inBibleStudy' | 'attendingPrayer', checked: boolean) => {
    onUpdateSoul(soulId, { [field]: checked });
    const activity = field === 'attendingChurch' ? 'Church Attendance' : field === 'inBibleStudy' ? 'Bible Study' : 'Prayer Meeting';
    toast({ title: "Follow-up Updated", description: `Follow-up status for ${activity} has been updated.` });
  };

  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Follow-up Dashboard</CardTitle>
                <CardDescription>
                A list of souls won. Keep track of their spiritual journey.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                            <Skeleton className="h-8 w-24" />
                            <Skeleton className="h-8 w-24" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
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
            {souls.length > 0 ? (
              souls.map((soul) => (
                <TableRow key={soul.id}>
                  <TableCell className="font-medium">
                    <div>{soul.name}</div>
                    <div className="text-xs text-muted-foreground">{soul.contact}</div>
                  </TableCell>
                  <TableCell>
                    <Select value={soul.status} onValueChange={(value: FollowUpStatus) => handleStatusChange(soul.id, value)}>
                        <SelectTrigger className="w-[150px] h-8">
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
                    <TooltipProvider>
                      <div className="flex items-center gap-3">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <Checkbox checked={soul.attendingChurch} onCheckedChange={(checked) => handleCheckboxChange(soul.id, 'attendingChurch', !!checked)} />
                                    <Church className="h-4 w-4 text-muted-foreground" />
                                </label>
                            </TooltipTrigger>
                            <TooltipContent>Attending Church</TooltipContent>
                        </Tooltip>
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <Checkbox checked={soul.inBibleStudy} onCheckedChange={(checked) => handleCheckboxChange(soul.id, 'inBibleStudy', !!checked)} />
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                </label>
                            </TooltipTrigger>
                            <TooltipContent>In Bible Study</TooltipContent>
                        </Tooltip>
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <Checkbox checked={soul.attendingPrayer} onCheckedChange={(checked) => handleCheckboxChange(soul.id, 'attendingPrayer', !!checked)} />
                                    <HandHelping className="h-4 w-4 text-muted-foreground" />
                                </label>
                            </TooltipTrigger>
                            <TooltipContent>Attending Prayer Meetings</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>{soul.wonAt ? format(soul.wonAt.toDate(), "PPP") : ''}</TableCell>
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
                        <DropdownMenuItem>Log Follow-up Note</DropdownMenuItem>
                        <DropdownMenuItem>View History</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center"
                >
                  No souls logged yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
