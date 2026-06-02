'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Filter, Info, MapPin, UserPlus, UserMinus } from 'lucide-react';
import type { Soul, Fellowship } from '@/lib/types';
import { haversineDistance } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AssignFellowshipDialogProps {
  soul: Soul | null;
  fellowships: Fellowship[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignGroup: (soul: Soul, fellowshipId: string, groupType: 'Fellowship' | 'Association') => void;
}

export function AssignFellowshipDialog({ soul, fellowships, isOpen, onOpenChange, onAssignGroup }: AssignFellowshipDialogProps) {
  const [country, setCountry] = React.useState<string>('');
  const [state, setState] = React.useState<string>('');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const countries = React.useMemo(() => {
    const fellowshipLocations = fellowships.map(f => f.location).filter(Boolean) as string[];
    const set = new Set(fellowshipLocations.map(loc => loc.split(',').pop()?.trim()).filter(Boolean));
    return Array.from(set).sort();
  }, [fellowships]);
  
  const states = React.useMemo(() => {
    if (!country) return [];
    const fellowshipLocations = fellowships
      .map(f => f.location)
      .filter((loc): loc is string => !!loc && loc.toLowerCase().includes(country.toLowerCase()));
      
    const stateSet = new Set<string>();
    fellowshipLocations.forEach(loc => {
        const parts = loc.split(',').map(p => p.trim());
        if (parts.length > 1 && parts[parts.length - 1].toLowerCase() === country.toLowerCase()) {
            if(parts[parts.length - 2]) {
              stateSet.add(parts[parts.length - 2]);
            }
        }
    });

    return Array.from(stateSet).sort();
  }, [fellowships, country]);

  const filteredAndSortedFellowships = React.useMemo(() => {
    const soulLocation = soul?.locationWon;
    let filtered = fellowships;

    if (country) {
      filtered = filtered.filter(f => f.location && f.location.toLowerCase().includes(country.toLowerCase()));
    }
    if (state) {
      filtered = filtered.filter(f => f.location && f.location.toLowerCase().includes(state.toLowerCase()));
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(f => (f.groupType || 'Fellowship') === typeFilter);
    }
    
    const fellowshipsWithDistance = filtered.map(f => {
      const distance = (soulLocation?.latitude && soulLocation?.longitude && f.latitude && f.longitude)
        ? haversineDistance({ lat: soulLocation.latitude, lng: soulLocation.longitude }, { lat: f.latitude, lng: f.longitude })
        : null;
      return { ...f, distance };
    });

    return fellowshipsWithDistance.sort((a, b) => {
        if (a.distance !== null && b.distance !== null) {
            return a.distance - b.distance;
        }
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
        return a.name.localeCompare(b.name);
    });
  }, [fellowships, soul, country, state, typeFilter]);

  React.useEffect(() => {
    if (isOpen && soul) {
        setCountry(soul.locationWon?.country || '');
        setState('');
        setTypeFilter('all');
    }
  }, [isOpen, soul?.id]);

  const hasAssignedFellowship = React.useMemo(() => {
    if (!soul?.fellowshipId) return false;
    return fellowships.some(f => f.id === soul.fellowshipId && (f.groupType || 'Fellowship') === 'Fellowship');
  }, [soul?.fellowshipId, fellowships]);

  const hasAssignedAssociation = React.useMemo(() => {
    if (!soul?.associationId) return false;
    return fellowships.some(f => f.id === soul.associationId && f.groupType === 'Association');
  }, [soul?.associationId, fellowships]);

  if (!soul) {
    return null;
  }

  const listContent = (
    <div className="p-3 sm:p-4 space-y-3">
        {filteredAndSortedFellowships.length > 0 ? (
            filteredAndSortedFellowships.map(f => {
                const groupType = f.groupType || 'Fellowship';
                const isCurrentlyAssigned = groupType === 'Association' ? soul.associationId === f.id : soul.fellowshipId === f.id;
                const typeAlreadyHasAssignment = groupType === 'Association' ? hasAssignedAssociation : hasAssignedFellowship;
                const isDisabled = !isCurrentlyAssigned && typeAlreadyHasAssignment;

                return (
                <Card key={f.id} className={cn(
                  "transition-all duration-300 shadow-none border-2 rounded-[1.25rem] sm:rounded-2xl overflow-hidden", 
                  isCurrentlyAssigned ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20" : "bg-card border-transparent hover:border-primary/10 hover:shadow-md"
                )}>
                    <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3 sm:gap-4">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <p className="font-black text-[11px] sm:text-sm truncate leading-tight flex-1 min-w-[60px]">{f.name}</p>
                              <Badge variant="outline" className={cn("shrink-0 text-[7px] sm:text-[8px] px-1.5 h-3.5 sm:h-4 uppercase font-bold tracking-tighter sm:tracking-widest bg-background/50 leading-none", groupType === 'Association' ? "border-blue-500/20 text-blue-600" : "border-primary/20 text-primary")}>
                                  {groupType}
                              </Badge>
                            </div>
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground line-clamp-1 flex items-center gap-1 font-medium">
                              <MapPin className="h-2.5 w-2.5 shrink-0 text-primary/60" />
                              {f.location}
                            </p>
                            {f.distance !== null ? <p className="text-[8px] sm:text-[9px] text-primary font-black mt-1 uppercase tracking-widest sm:tracking-[0.2em]">{f.distance.toFixed(1)} km away</p> : null}
                        </div>
                        <div className="shrink-0">
                          {isCurrentlyAssigned ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={(e) => { e.stopPropagation(); onAssignGroup(soul, 'none', groupType); }}
                                        className="h-8 w-8 sm:h-9 sm:w-9 text-destructive hover:bg-destructive/10 rounded-full transition-all active:scale-90"
                                    >
                                        <UserMinus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        <span className="sr-only">Unassign</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p className="text-[10px] sm:text-xs">Unassign from this {groupType}</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                          ) : (
                              <TooltipProvider>
                                <Tooltip open={isDisabled ? undefined : false}>
                                  <TooltipTrigger asChild>
                                    <div className="inline-block">
                                      <Button
                                          type="button"
                                          size="icon"
                                          onClick={(e) => { e.stopPropagation(); onAssignGroup(soul, f.id, groupType); }}
                                          disabled={isDisabled}
                                          className="h-8 w-8 sm:h-9 sm:w-9 rounded-full shadow-md transition-all active:scale-90"
                                      >
                                          <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                          <span className="sr-only">Assign</span>
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[200px] rounded-xl p-3 border-primary/20 shadow-xl" side="left">
                                    {isDisabled ? (
                                      <p className="text-[10px] font-bold leading-tight uppercase tracking-tight text-center">Already assigned to a {groupType}.<br/><span className="text-primary">Unassign it first.</span></p>
                                    ) : (
                                      <p className="text-[10px] sm:text-xs">Assign to this {groupType}</p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                          )}
                        </div>
                    </CardContent>
                </Card>
            )})
        ) : (
            <div className="text-center text-muted-foreground py-24 sm:py-32 px-8 flex flex-col items-center">
                <div className="h-16 w-16 sm:h-20 sm:w-20 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                  <Filter className="h-8 w-8 opacity-10" />
                </div>
                <p className="text-base font-black uppercase tracking-tight opacity-50">No groups found</p>
                <p className="text-xs mt-2 italic leading-relaxed text-muted-foreground/60 max-w-[200px] mx-auto text-balance">Adjust your filters or start a new group in this area.</p>
            </div>
        )}
    </div>
  );

  const filterContent = (
    <div className="space-y-4 pt-4 shrink-0 px-1">
      <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-start gap-3">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1.5 font-medium leading-relaxed text-balance">
          <p>Assign this convert to a Fellowship for discipleship and an Association for group activity.</p>
          <p className="font-black text-foreground/80 uppercase text-[10px] tracking-wider">Note: Unassign current group before switching.</p>
        </div>
      </div>

      <Tabs value={typeFilter} onValueChange={setTypeFilter} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-11 rounded-2xl bg-muted/30 p-1">
          <TabsTrigger value="all" className="text-xs rounded-xl font-bold">All</TabsTrigger>
          <TabsTrigger value="Fellowship" className="text-xs rounded-xl font-bold">Fellowships</TabsTrigger>
          <TabsTrigger value="Association" className="text-xs rounded-xl font-bold">Associations</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Country</label>
          <Select value={country || 'all'} onValueChange={(val) => { setCountry(val === 'all' ? '' : val); setState(''); }}>
            <SelectTrigger className="h-11 text-sm rounded-2xl bg-muted/20 border-none font-medium transition-colors hover:bg-muted/30">
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl max-h-[300px]">
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">State</label>
          <Select value={state || 'all'} onValueChange={(val) => setState(val === 'all' ? '' : val)} disabled={!country}>
            <SelectTrigger className="h-11 text-sm rounded-2xl bg-muted/20 border-none font-medium transition-colors hover:bg-muted/30">
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl max-h-[300px]">
                <SelectItem value="all">All States</SelectItem>
                {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  if (mounted && isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
          <div className="p-8 border-b flex-shrink-0 bg-muted/10">
            <SheetHeader className="text-left">
                <SheetTitle className="text-2xl font-black font-headline tracking-tight leading-tight">Assign Community</SheetTitle>
                <SheetDescription className="text-sm font-medium mt-1">Placing {soul.firstName} in local Fellowship and Associations.</SheetDescription>
            </SheetHeader>
          </div>
          <ScrollArea className="flex-grow overflow-hidden px-8 pb-8">
            <div className="flex flex-col gap-4 min-h-0 h-full">
              {filterContent}
              <div className="flex-grow min-h-0">
                {listContent}
              </div>
            </div>
            <div className="h-20 shrink-0" />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl shadow-2xl border-none">
        <div className="p-8 border-b shrink-0 bg-muted/5">
            <DialogHeader>
                <DialogTitle className="text-2xl sm:text-3xl font-black font-headline tracking-tight">Assign Group: {soul?.firstName}</DialogTitle>
                <DialogDescription className="text-sm sm:text-base font-medium">
                    Manage Fellowship and Association placement for this record.
                </DialogDescription>
            </DialogHeader>
        </div>
        <div className="flex-grow min-h-0 p-6 sm:p-8 overflow-hidden">
          <div className="flex flex-col h-full gap-4">
            {filterContent}
            <ScrollArea className="border rounded-[1.5rem] sm:rounded-[2.5rem] bg-muted/5 flex-grow h-72">
              {listContent}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
