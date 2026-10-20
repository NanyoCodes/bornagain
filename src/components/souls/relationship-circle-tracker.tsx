'use client';

import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
    Users, 
    Heart, 
    PlusCircle, 
    Home, 
    Sparkles, 
    ArrowRight, 
    Target,
    ChevronDown,
    X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn, safeToDate } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import type { Soul, Campaign, Fellowship, SoulRelationship } from '@/lib/types';
import { LogSoulForm } from './log-soul-form';

const ViewHistoryDialogLazy = dynamic(() => import('./view-history-dialog').then(m => m.ViewHistoryDialog), { ssr: false });

function CategorySoulList({ souls, onSelectSoul }: { souls: Soul[], onSelectSoul: (soul: Soul) => void }) {
  if (!souls || souls.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-muted-foreground italic text-left">No souls logged in this category yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-4 text-left">
      {souls.map((soul) => {
        const wonAt = safeToDate(soul.wonAt);
        return (
          <Button 
            key={soul.id} 
            variant="ghost"
            onClick={() => onSelectSoul(soul)}
            className="flex flex-row items-center justify-between p-2.5 sm:p-4 rounded-2xl hover:bg-primary/5 transition-all border bg-background/50 group w-full text-left h-auto active:scale-[0.98]"
          >
            <div className="flex flex-row items-center gap-3 min-w-0 flex-1 text-left">
                <Avatar className="h-10 w-10 border shadow-sm shrink-0 group-hover:border-primary/30 transition-colors text-left">
                  <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                  <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-left">{soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left ml-1 sm:ml-2">
                <div className="flex items-center gap-2 text-left flex-wrap">
                    <p className="font-black text-[13px] sm:text-sm uppercase tracking-tight text-left">{soul.firstName} {soul.lastName}</p>
                    <Badge variant="outline" className={cn("text-[8px] h-4 px-1 uppercase font-black tracking-tighter shrink-0 text-left bg-background/50")}>{soul.status}</Badge>
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 text-left">
                    Won {wonAt ? format(wonAt, 'PPP') : 'Recently'}
                </p>
                </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 text-left" />
          </Button>
        );
      })}
    </div>
  );
}

export function RelationshipCircleTracker({ 
  souls,
  campaigns,
  fellowships,
  className
}: { 
  souls: Soul[],
  campaigns: Campaign[],
  fellowships: Fellowship[],
  className?: string
}) {
    const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
    const [isLogSoulOpen, setIsLogSoulOpen] = useState(false);
    const [detailedSoul, setDetailedSoul] = useState<Soul | null>(null);
    const isMobile = useIsMobile();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const stats = useMemo(() => {
        const family = souls.filter(s => s.relationship === 'Family');
        const friends = souls.filter(s => ['Friend', 'Colleague', 'Neighbor'].includes(s.relationship || ''));
        const outreach = souls.filter(s => ['Stranger', 'Other'].includes(s.relationship || '') || !s.relationship);
        
        return {
            family: { count: family.length, list: family },
            friends: { count: friends.length, list: friends },
            outreach: { count: outreach.length, list: outreach },
        };
    }, [souls]);

    const activeCategorySouls = useMemo(() => {
        if (!selectedCategoryName) return [];
        if (selectedCategoryName === 'Family') return stats.family.list;
        if (selectedCategoryName === 'Friends') return stats.friends.list;
        if (selectedCategoryName === 'Outreach') return stats.outreach.list;
        return [];
    }, [selectedCategoryName, stats]);

    const handleCategoryClick = (name: string) => {
        setSelectedCategoryName(name);
    };

    const handleOpenLogFromCircle = (e: React.MouseEvent, name: string) => {
        e.stopPropagation();
        setSelectedCategoryName(name);
        setIsLogSoulOpen(true);
    };

    const relationshipType = useMemo(() => {
        const map: Record<string, SoulRelationship> = {
            'Family': 'Family',
            'Friends': 'Friend',
            'Outreach': 'Stranger'
        };
        return map[selectedCategoryName || ''] || 'Other';
    }, [selectedCategoryName]);

    if (!mounted) return null;

    const dialogContent = selectedCategoryName && (
        <>
            {isMobile ? (
                <Drawer open={!!selectedCategoryName && !isLogSoulOpen} onOpenChange={(open) => !open && setSelectedCategoryName(null)}>
                    <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
                        <div className="p-6 sm:p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left">
                            <div className="flex items-center justify-between gap-4 text-left text-left">
                                <div className="min-w-0 text-left text-left">
                                    <div className="flex items-center gap-2 mb-2 text-left text-left text-left">
                                        <Users className="h-4 w-4 text-primary text-left text-left" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left text-left">Directory</span>
                                    </div>
                                    <DrawerTitle className="text-xl sm:text-2xl font-black font-headline uppercase leading-tight text-left text-left text-left">{selectedCategoryName} Circle</DrawerTitle>
                                    <DrawerDescription className="text-xs sm:text-sm font-medium mt-1 text-left text-left text-left">Viewing all converts in your {selectedCategoryName.toLowerCase()} group.</DrawerDescription>
                                </div>
                                <div className="flex gap-2 shrink-0 text-left text-left text-left">
                                    <Button 
                                        onClick={(e) => handleOpenLogFromCircle(e, selectedCategoryName)}
                                        size="icon"
                                        className="rounded-full shadow-lg h-10 w-10 text-left text-left"
                                        title={`Log ${selectedCategoryName}`}
                                    >
                                        <PlusCircle className="h-5 w-5 text-left text-left text-left" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 shrink-0 border bg-background shadow-sm text-muted-foreground/60 text-left text-left" onClick={() => setSelectedCategoryName(null)}>
                                        <X className="h-5 w-5 text-left text-left" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="flex-grow overflow-hidden relative text-left text-left">
                            <ScrollArea className="h-full px-4 sm:px-8 pt-6 text-left text-left">
                                <CategorySoulList souls={activeCategorySouls} onSelectSoul={setDetailedSoul} />
                                <div className="h-24 text-left text-left text-left" />
                            </ScrollArea>
                        </div>
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={!!selectedCategoryName && !isLogSoulOpen} onOpenChange={(open) => !open && setSelectedCategoryName(null)}>
                    <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left text-left">
                        <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left">
                            <div className="flex items-center justify-between gap-4 text-left text-left text-left text-left">
                                <div className="min-w-0 text-left text-left">
                                    <DialogHeader className="text-left p-0 text-left text-left text-left">
                                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left">{selectedCategoryName} Directory</DialogTitle>
                                        <DialogDescription className="text-sm font-medium text-left text-left text-left">Souls won within your {selectedCategoryName.toLowerCase()} circle.</DialogDescription>
                                    </DialogHeader>
                                </div>
                                <div className="flex gap-2 shrink-0 text-left text-left text-left">
                                    <Button 
                                        onClick={(e) => handleOpenLogFromCircle(e, selectedCategoryName)}
                                        size="icon"
                                        className="rounded-full shadow-lg h-10 w-10 text-left text-left"
                                        title={`Log ${selectedCategoryName}`}
                                    >
                                        <PlusCircle className="h-5 w-5 text-left text-left text-left" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 shrink-0 border bg-background shadow-sm text-muted-foreground/60 text-left text-left" onClick={() => setSelectedCategoryName(null)}>
                                        <X className="h-5 w-5 text-left text-left" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <ScrollArea className="max-h-[60vh] p-6 text-left text-left text-left text-left text-left text-left">
                            <CategorySoulList souls={activeCategorySouls} onSelectSoul={setDetailedSoul} />
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );

    const logSoulView = isLogSoulOpen && (
        isMobile ? (
            <Drawer open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
                <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left text-left">
                        <DrawerHeader className="text-left p-0 text-left text-left text-left">
                            <DrawerTitle className="text-2xl font-black font-headline text-left text-left text-left">Log {selectedCategoryName} Soul</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium mt-1 text-left text-left text-left">Record a new life won in your {selectedCategoryName?.toLowerCase()} circle.</DrawerDescription>
                        </DrawerHeader>
                    </div>
                    <ScrollArea className="flex-grow overflow-y-auto p-8 text-left text-left">
                        <LogSoulForm 
                            onSoulLogged={() => setIsLogSoulOpen(false)} 
                            fellowships={fellowships} 
                            campaigns={campaigns}
                            defaultRelationship={relationshipType}
                        />
                    </ScrollArea>
                </DrawerContent>
            </Drawer>
        ) : (
            <Dialog open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
                <DialogContent className="sm:max-w-lg text-left text-left text-left">
                    <DialogHeader className="text-left text-left text-left">
                        <DialogTitle className="text-left text-left text-left">Log {selectedCategoryName} Soul</DialogTitle>
                        <DialogDescription className="text-left text-left text-left">Record a new life won in your {selectedCategoryName?.toLowerCase()} circle.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto pr-2 text-left text-left text-left">
                        <LogSoulForm 
                            onSoulLogged={() => setIsLogSoulOpen(false)} 
                            fellowships={fellowships} 
                            campaigns={campaigns}
                            defaultRelationship={relationshipType}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        )
    );

    return (
        <>
            <Card className={cn("overflow-hidden border-none shadow-sm bg-card/50 backdrop-blur-sm text-left text-left", className)}>
                <CardHeader className="pb-3 text-left text-left">
                    <CardTitle className="text-lg flex items-center gap-2 text-left text-left">
                        <Home className="h-5 w-5 text-primary text-left text-left" />
                        Relationship Circle Tracker
                    </CardTitle>
                    <CardDescription className="font-medium text-left text-left text-left">
                        Ensuring your closest circles are saved and nurtured in faith.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-left text-left">
                    <div className="grid grid-cols-3 gap-2 text-left text-left">
                        <div 
                            className="p-3 rounded-2xl bg-muted/30 border text-center space-y-1 cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all active:scale-95 group shadow-sm text-left text-left text-left"
                            onClick={() => handleCategoryClick('Family')}
                        >
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter group-hover:text-primary text-center">Family</p>
                            <p className="text-xl font-black text-primary text-center text-left text-left text-left">{stats.family.count}</p>
                        </div>
                        <div 
                            className="p-3 rounded-2xl bg-muted/30 border text-center space-y-1 cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all active:scale-95 group shadow-sm text-left text-left text-left"
                            onClick={() => handleCategoryClick('Friends')}
                        >
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter group-hover:text-primary text-center">Friends</p>
                            <p className="text-xl font-black text-primary text-center text-left text-left text-left">{stats.friends.count}</p>
                        </div>
                        <div 
                            className="p-3 rounded-2xl bg-muted/30 border text-center space-y-1 cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all active:scale-95 group shadow-sm text-left text-left text-left"
                            onClick={() => handleCategoryClick('Outreach')}
                        >
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter group-hover:text-primary text-center">Outreach</p>
                            <p className="text-xl font-black text-foreground text-center text-left text-left text-left">{stats.outreach.count}</p>
                        </div>
                    </div>

                    {stats.family.count === 0 && (
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3 shadow-inner text-left text-left text-left">
                            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5 text-left text-left text-left" />
                            <p className="text-xs text-primary font-medium leading-relaxed text-left text-left text-left">
                                Have you shared the Gospel with your household? Log your family members here to prioritize their spiritual growth.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
            {dialogContent}
            {logSoulView}
            <ViewHistoryDialogLazy soul={detailedSoul} isOpen={!!detailedSoul} onOpenChange={(open) => !open && setDetailedSoul(null)} />
        </>
    );
}