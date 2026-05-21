'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Filter, Info, MapPin } from 'lucide-react';
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
  }, [isOpen, soul]);

  if (!soul) {
    return null;
  }

  const hasAssignedFellowship = !!soul.fellowshipId;
  const hasAssignedAssociation = !!soul.associationId;

  const content = (
    <div className="flex flex-col h-full gap-4">
      <div className="space-y-4 pt-4 shrink-0 px-1">
        <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 flex items-start gap-3">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-[11px] sm:text-xs text-muted-foreground space-y-1">
            <p>Assign to one Fellowship and one Association.</p>
            <p className="font-bold text-foreground/80">Unassign the current group before switching.</p>
          </div>
        </div>

        <Tabs value={typeFilter} onValueChange={setTypeFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9 sm:h-10">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="Fellowship" className="text-xs">Fellowships</TabsTrigger>
            <TabsTrigger value="Association" className="text-xs">Associations</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Country</label>
            <Select value={country || 'all'} onValueChange={(val) => { setCountry(val === 'all' ? '' : val); setState(''); }}>
              <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm"><SelectValue placeholder="Select Country" /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">State</label>
            <Select value={state || 'all'} onValueChange={(val) => setState(val === 'all' ? '' : val)} disabled={!country}>
              <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm"><SelectValue placeholder="Select State" /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <ScrollArea className={cn("border rounded-lg bg-muted/5 flex-grow", isMobile ? "min-h-0" : "h-72")}>
          <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
              {filteredAndSortedFellowships.length > 0 ? (
                  filteredAndSortedFellowships.map(f => {
                      const groupType = f.groupType || 'Fellowship';
                      const isCurrentlyAssigned = groupType === 'Association' ? soul.associationId === f.id : soul.fellowshipId === f.id;
                      const typeAlreadyHasAssignment = groupType === 'Association' ? hasAssignedAssociation : hasAssignedFellowship;
                      const isDisabled = !isCurrentlyAssigned && typeAlreadyHasAssignment;

                      return (
                      <Card key={f.id} className={cn("transition-colors shadow-none border", isCurrentlyAssigned ? "bg-primary/5 border-primary/30" : "bg-card")}>
                          <CardContent className="p-3 flex items-center justify-between gap-3 sm:gap-4">
                              <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                    <p className="font-bold text-xs sm:text-sm truncate">{f.name}</p>
                                    <Badge variant="outline" className={cn("text-[8px] sm:text-[9px] px-1 h-3.5 sm:h-4 uppercase font-bold tracking-tight bg-background/50", groupType === 'Association' ? "border-blue-500/20 text-blue-600" : "border-primary/20 text-primary")}>
                                        {groupType}
                                    </Badge>
                                  </div>
                                  <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate flex items-center gap-1">
                                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                                    {f.location}
                                  </p>
                                  {f.distance !== null ? <p className="text-[9px] sm:text-[10px] text-primary font-bold mt-1 uppercase tracking-tighter">{f.distance.toFixed(1)} km away</p> : null}
                              </div>
                              <div className="shrink-0">
                                {isCurrentlyAssigned ? (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onAssignGroup(soul, 'none', groupType)}
                                        className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs border-destructive/30 text-destructive hover:bg-destructive/10 font-bold"
                                    >
                                        Unassign
                                    </Button>
                                ) : (
                                    <TooltipProvider>
                                      <Tooltip open={isDisabled ? undefined : false}>
                                        <TooltipTrigger asChild>
                                          <div className="inline-block">
                                            <Button
                                                size="sm"
                                                onClick={() => onAssignGroup(soul, f.id, groupType)}
                                                disabled={isDisabled}
                                                className="h-7 sm:h-8 px-2 sm:px-4 text-[10px] sm:text-xs font-bold"
                                            >
                                                Assign
                                            </Button>
                                          </div>
                                        </TooltipTrigger>
                                        {isDisabled && (
                                          <TooltipContent className="max-w-[150px]">
                                            <p className="text-[10px] leading-tight">Already assigned to a {groupType}. Unassign it first.</p>
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    </TooltipProvider>
                                )}
                              </div>
                          </CardContent>
                      </Card>
                  )})
              ) : (
                  <div className="text-center text-muted-foreground py-12 px-6">
                      <Filter className="h-8 w-8 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">No groups found</p>
                      <p className="text-xs mt-1">Try adjusting your filters.</p>
                  </div>
              )}
          </div>
      </ScrollArea>
    </div>
  );

  if (mounted && isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-2xl">
          <div className="p-6 border-b flex-shrink-0 bg-muted/10">
            <SheetHeader className="text-left">
                <SheetTitle className="text-xl font-bold font-headline">Assign Group: {soul.firstName}</SheetTitle>
                <SheetDescription className="text-xs">Manage community placement for this convert.</SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-grow overflow-hidden px-6 pb-4">
            {content}
          </div>
          <div className="p-4 border-t shrink-0 flex justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground text-xs uppercase font-bold tracking-widest">
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold font-headline">Assign Group: {soul?.firstName}</DialogTitle>
          <DialogDescription>
            Manage Fellowship and Association placement for this record.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}