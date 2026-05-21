
'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Filter } from 'lucide-react';
import type { Soul, Fellowship } from '@/lib/types';
import { haversineDistance } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AssignFellowshipDialogProps {
  soul: Soul | null;
  fellowships: Fellowship[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignGroup: (soul: Soul, fellowshipId: string, groupType: 'Fellowship' | 'Association') => void;
  isAssigning: string | null;
}

export function AssignFellowshipDialog({ soul, fellowships, isOpen, onOpenChange, onAssignGroup, isAssigning }: AssignFellowshipDialogProps) {
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

  const content = (
    <div className="flex flex-col h-full gap-4">
      <div className="space-y-4 pt-4 shrink-0">
        <Tabs value={typeFilter} onValueChange={setTypeFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="Fellowship">Fellowships</TabsTrigger>
            <TabsTrigger value="Association">Associations</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Country</label>
            <Select value={country || 'all'} onValueChange={(val) => { setCountry(val === 'all' ? '' : val); setState(''); }}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select Country" /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">State/Province</label>
            <Select value={state || 'all'} onValueChange={(val) => setState(val === 'all' ? '' : val)} disabled={!country}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select State" /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <ScrollArea className={cn("border rounded-lg bg-muted/5 flex-grow", isMobile ? "min-h-0" : "h-72")}>
          <div className="p-3 space-y-3">
              {filteredAndSortedFellowships.length > 0 ? (
                  filteredAndSortedFellowships.map(f => {
                      const groupType = f.groupType || 'Fellowship';
                      const isAssigned = groupType === 'Association' ? soul.associationId === f.id : soul.fellowshipId === f.id;

                      return (
                      <Card key={f.id} className={cn("transition-colors shadow-none", isAssigned && "bg-primary/5 border-primary/20")}>
                          <CardContent className="p-3 flex items-center justify-between gap-4">
                              <div className="min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <p className="font-bold text-sm truncate">{f.name}</p>
                                    <Badge variant="secondary" className="text-[9px] px-1.5 h-4 uppercase font-bold tracking-tight bg-background border">
                                        {groupType}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground truncate">{f.location}</p>
                                  {f.distance !== null ? <p className="text-[10px] text-primary font-medium mt-1">{f.distance.toFixed(1)} km away</p> : null}
                              </div>
                              {isAssigned ? (
                                  <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onAssignGroup(soul, 'none', groupType)}
                                      disabled={!!isAssigning}
                                      className="shrink-0 h-8 text-xs border-destructive/20 text-destructive hover:bg-destructive/10"
                                  >
                                      {isAssigning === f.id ? <Loader2 className="h-3 w-3 animate-spin"/> : 'Unassign'}
                                  </Button>
                              ) : (
                                  <Button
                                      size="sm"
                                      onClick={() => onAssignGroup(soul, f.id, groupType)}
                                      disabled={!!isAssigning}
                                      className="shrink-0 h-8 text-xs font-bold"
                                  >
                                      {isAssigning === f.id ? <Loader2 className="h-3 w-3 animate-spin"/> : 'Assign'}
                                  </Button>
                              )}
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
        <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-2xl">
          <div className="p-6 border-b flex-shrink-0 bg-muted/10">
            <SheetHeader className="text-left">
                <SheetTitle className="text-xl font-bold font-headline">Assign Group: {soul.firstName}</SheetTitle>
                <SheetDescription className="text-xs">You can assign to 1 fellowship and 1 association.</SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-grow overflow-hidden px-6 pb-6">
            {content}
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
            You can assign to 1 fellowship and 1 association.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
