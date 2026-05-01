'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { Soul, Fellowship } from '@/lib/types';
import { haversineDistance } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface AssignFellowshipDialogProps {
  soul: Soul | null;
  fellowships: Fellowship[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignFellowship: (soul: Soul, fellowshipId: string) => void;
  isAssigning: string | null;
}

export function AssignFellowshipDialog({ soul, fellowships, isOpen, onOpenChange, onAssignFellowship, isAssigning }: AssignFellowshipDialogProps) {
  const [country, setCountry] = React.useState<string>('');
  const [state, setState] = React.useState<string>('');
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
  }, [fellowships, soul, country, state]);

  React.useEffect(() => {
    if (isOpen && soul) {
        setCountry(soul.locationWon?.country || '');
        setState('');
    }
  }, [isOpen, soul]);

  if (!soul) {
    return null;
  }

  const content = (
    <>
      <div className="grid grid-cols-2 gap-4 py-4">
        <Select value={country || 'all'} onValueChange={(val) => { setCountry(val === 'all' ? '' : val); setState(''); }}>
          <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
          <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={state || 'all'} onValueChange={(val) => setState(val === 'all' ? '' : val)} disabled={!country}>
          <SelectTrigger><SelectValue placeholder="Select State/Province" /></SelectTrigger>
          <SelectContent>
              <SelectItem value="all">All States/Provinces</SelectItem>
              {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <ScrollArea className={cn("border rounded-md", isMobile ? "h-[50vh]" : "h-72")}>
          <div className="p-2 space-y-2">
              {filteredAndSortedFellowships.length > 0 ? (
                  filteredAndSortedFellowships.map(f => (
                      <Card key={f.id} className={cn("transition-colors", soul.fellowshipId === f.id && "bg-muted")}>
                          <CardContent className="p-3 flex items-center justify-between">
                              <div className="min-w-0 pr-4">
                                  <p className="font-semibold truncate">{f.name}</p>
                                  <p className="text-sm text-muted-foreground truncate">{f.location}</p>
                                  {f.distance !== null ? <p className="text-xs text-primary">{f.distance.toFixed(1)} km away</p> : null}
                              </div>
                              {soul.fellowshipId === f.id ? (
                                  <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onAssignFellowship(soul, 'none')}
                                      disabled={!!isAssigning}
                                      className="shrink-0"
                                  >
                                      {isAssigning === 'none' ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Unassign'}
                                  </Button>
                              ) : (
                                  <Button
                                      size="sm"
                                      onClick={() => onAssignFellowship(soul, f.id)}
                                      disabled={!!isAssigning}
                                      className="shrink-0"
                                  >
                                      {isAssigning === f.id ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Assign'}
                                  </Button>
                              )}
                          </CardContent>
                      </Card>
                  ))
              ) : (
                  <div className="text-center text-muted-foreground py-10">
                      <p>No fellowships match your filters.</p>
                  </div>
              )}
          </div>
      </ScrollArea>
    </>
  );

  if (mounted && isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90dvh] flex flex-col">
          <SheetHeader className="text-left">
            <SheetTitle>Assign Fellowship for {soul.firstName}</SheetTitle>
            <SheetDescription>Filter by location and select a fellowship to assign this soul to.</SheetDescription>
          </SheetHeader>
          <div className="flex-grow overflow-hidden pt-4">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Fellowship for {soul?.firstName}</DialogTitle>
          <DialogDescription>Filter by location and select a fellowship to assign this soul to.</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
