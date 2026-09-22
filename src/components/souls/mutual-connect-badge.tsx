'use client';

import * as React from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import type { Soul, UserProfile } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Users, History, Sparkles, Clock, MapPin, X, ArrowRight, BookOpen, Utensils, Home, Gift, Phone, MessageSquare, Heart, Calendar, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { actionItems } from '@/lib/follow-up-data';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import Image from 'next/image';

interface MutualRecord {
    user: UserProfile;
    soul: Soul;
}

const iconMap: Record<string, any> = {
    'prayed_together': Sparkles,
    'studied_bible': BookOpen,
    'shared_meal': Utensils,
    'visited_home': Home,
    'introduced_friend': Users,
    'gave_gift': Gift,
    'phone_call': Phone,
    'text_message': MessageSquare,
    'helped_with_need': Heart,
    'invited_to_event': Calendar,
};

export function MutualConnectBadge({ soul }: { soul: Soul }) {
  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const [mutualRecords, setMutualRecords] = React.useState<MutualRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const fetchMutual = React.useCallback(async () => {
      if (!firestore || !currentUser) return;
      setLoading(true);
      try {
        const soulsRef = collection(firestore, 'souls');
        const queryPromises = [];
        
        if (soul.phone && soul.phone.length > 5) {
          queryPromises.push(getDocs(query(soulsRef, where('phone', '==', soul.phone), limit(10))));
        }
        
        if (soul.email && soul.email.includes('@')) {
          queryPromises.push(getDocs(query(soulsRef, where('email', '==', soul.email), limit(10))));
        }

        if (soul.firstName && soul.lastName && soul.firstName.length > 1) {
            queryPromises.push(getDocs(query(soulsRef, 
                where('firstName', '==', soul.firstName), 
                where('lastName', '==', soul.lastName),
                limit(10)
            )));
        }

        if (queryPromises.length === 0) {
            setMutualRecords([]);
            setLoading(false);
            return;
        }

        const snapshots = await Promise.all(queryPromises);
        const soulsMap = new Map<string, Soul>();
        
        snapshots.forEach(snap => {
            snap.docs.forEach(d => {
                const s = { id: d.id, ...d.data() } as Soul;
                if (s.userId !== currentUser.uid && !s.isHistoryPrivate) {
                     soulsMap.set(d.id, s);
                }
            });
        });

        const others = Array.from(soulsMap.values());
        
        if (others.length === 0) {
            setMutualRecords([]);
            setLoading(false);
            return;
        }

        const records: MutualRecord[] = [];
        const userCache = new Map<string, UserProfile>();

        for (const s of others) {
            let profile = userCache.get(s.userId);
            if (!profile) {
                const pDoc = await getDoc(doc(firestore, 'users', s.userId));
                if (pDoc.exists()) {
                    profile = { id: pDoc.id, ...pDoc.data() } as UserProfile;
                    userCache.set(s.userId, profile);
                }
            }
            if (profile) {
                records.push({ user: profile, soul: s });
            }
        }
        
        setMutualRecords(records);
      } catch (e) {
        console.warn("Mutual intelligence lookup failed:", e);
      } finally {
        setLoading(false);
      }
  }, [firestore, currentUser, soul.phone, soul.email, soul.firstName, soul.lastName]);

  React.useEffect(() => {
    fetchMutual();
  }, [fetchMutual]);

  if (loading || mutualRecords.length === 0) return null;

  const uniqueUserCount = new Set(mutualRecords.map(r => r.user.id)).size;

  const titleText = "Mutual Kingdom Effort";
  const descText = `Collective Harvest Intelligence: We found ${uniqueUserCount} other ${uniqueUserCount === 1 ? 'believer' : 'believers'} with a matching record for ${soul.firstName}.`;

  const innerContent = (
    <div className="space-y-8 sm:space-y-12 text-left">
        {mutualRecords.map((record, idx) => {
            const history = [...(record.soul.followUpLog || [])].sort((a, b) => {
                const dateB = safeToDate(b.date)?.getTime() ?? 0;
                const dateA = safeToDate(a.date)?.getTime() ?? 0;
                return dateB - dateA;
            });

            const profileUrl = `/profile/${record.user.id}`;

            return (
                <div key={`${record.user.id}-${idx}`} className="space-y-6 text-left">
                    <div className="flex items-center gap-3 sm:gap-4 text-left">
                        <Link href={profileUrl} onClick={(e) => e.stopPropagation()} className="shrink-0 group">
                            <Avatar className="h-10 w-10 sm:h-14 sm:w-14 border-2 border-primary/10 shadow-lg group-hover:scale-105 transition-transform text-left">
                                <AvatarImage src={record.user.photoURL} className="object-cover" />
                                <AvatarFallback className="font-black bg-primary/5 text-primary text-center flex items-center justify-center w-full h-full text-[10px] sm:text-base">
                                    {record.user.firstName?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                        </Link>
                        <div className="min-w-0 flex-1 text-left">
                            <Link href={profileUrl} onClick={(e) => e.stopPropagation()} className="hover:underline decoration-primary/30 text-left">
                                <p className="font-black text-sm sm:text-lg uppercase tracking-tight truncate text-left">
                                    {record.user.firstName} {record.user.lastName}
                                </p>
                            </Link>
                            <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1 text-left">
                                <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary opacity-60 text-left" />
                                <p className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate text-left">
                                    Station: {record.user.location?.city || 'Global Network'}
                                </p>
                            </div>
                        </div>
                        <Badge variant="secondary" className="h-5 sm:h-6 px-1.5 sm:px-3 text-[7px] sm:text-[9px] font-black uppercase tracking-widest shrink-0 text-left">
                            {record.soul.status}
                        </Badge>
                    </div>

                    <div className="pl-4 sm:pl-6 border-l-4 border-primary/20 space-y-6 sm:space-y-8 ml-5 sm:ml-7 text-left text-left">
                        <h4 className="text-[8px] sm:text-[10px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2 text-left text-left">
                            <History className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-left text-left" /> Partner Log History
                        </h4>
                        {history.length > 0 ? history.map((log, lIdx) => {
                            const date = safeToDate(log.date);
                            return (
                                <div key={lIdx} className="relative text-left">
                                    <div className="flex justify-between items-start mb-3 flex-wrap gap-2 text-left">
                                        <div className="flex items-center gap-2 text-left">
                                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground opacity-40 text-left" />
                                            <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 text-left">
                                                {date ? format(date, "MMM d, p") : 'Recently'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-muted/30 rounded-[1rem] sm:rounded-[1.5rem] p-3 sm:p-5 border shadow-inner text-left text-left">
                                        {log.actions && log.actions.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-2 sm:mb-3 text-left">
                                                {log.actions.map(aId => {
                                                    const action = actionItems.find(a => a.id === aId);
                                                    return action ? (
                                                        <Badge key={aId} variant="outline" className="h-3.5 sm:h-4 px-1 sm:px-1.5 text-[7px] sm:text-[8px] font-black uppercase bg-background border-primary/10 text-left">{action.label}</Badge>
                                                    ) : null;
                                                })}
                                            </div>
                                        )}
                                        <p className="text-xs sm:text-sm text-muted-foreground italic font-medium leading-relaxed text-left text-left">
                                            &ldquo;{log.note || 'Interaction logged.'}&rdquo;
                                        </p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="py-6 sm:py-8 bg-muted/10 rounded-[1rem] sm:rounded-[1.5rem] border-2 border-dashed text-center text-left">
                                <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-40 text-left">No detailed logs found.</p>
                            </div>
                        )}
                    </div>
                    {idx < mutualRecords.length - 1 && <Separator className="mt-8 sm:mt-10 opacity-50" />}
                </div>
            );
        })}
        <div className="p-8 border-t bg-muted/5 flex flex-col items-center text-center shrink-0 gap-4 text-left">
             <div className="p-4 bg-primary/5 rounded-2xl border border-dashed border-primary/20 flex items-center gap-3 text-left">
                <Lock className="h-4 w-4 text-primary text-left" />
                <p className="text-[10px] font-bold text-primary uppercase text-left">You can lock your interaction history from others</p>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] leading-relaxed max-w-sm text-left">
                "Iron sharpens iron, and one man sharpens another." — Proverbs 27:17
            </p>
        </div>
    </div>
  );

  return (
    <>
      <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Badge 
                    variant="outline" 
                    className="h-8 px-3 gap-2 bg-primary/10 text-primary border-primary/30 animate-in fade-in zoom-in shrink-0 cursor-pointer hover:bg-primary/20 transition-all shadow-sm ring-1 ring-primary/5 active:scale-95 text-left"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(true);
                    }}
                >
                    <Users className="h-4 w-4 text-left" />
                    <span className="text-[11px] font-black tracking-widest text-left">{uniqueUserCount}</span>
                </Badge>
            </TooltipTrigger>
            <TooltipContent className="rounded-xl border-primary/20 shadow-xl max-w-[200px] p-3 text-left">
                <p className="text-[10px] font-bold uppercase text-center leading-tight text-left">
                    {uniqueUserCount} Mutual Connections<br/>
                    <span className="text-primary mt-1 block text-left">you can lock your interaction history from others</span>
                </p>
            </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {mounted && (
        isMobile ? (
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
                <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                        <DrawerHeader className="text-left flex-shrink-0 text-left">
                            <div className="flex items-center gap-3 mb-2 text-left">
                                <Sparkles className="h-5 w-5 text-primary text-left" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left">Mutual effort</span>
                            </div>
                            <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-balance text-left">{titleText}</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium mt-1 text-left text-left">{descText}</DrawerDescription>
                        </DrawerHeader>
                    </div>
                    <ScrollArea className="flex-grow min-h-0 text-left">
                        <div className="p-6 text-left">
                            {innerContent}
                        </div>
                    </ScrollArea>
                </DrawerContent>
            </Drawer>
        ) : (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90dvh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col text-left">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left">
                        <DialogHeader className="text-left text-left text-left">
                            <div className="flex items-center gap-3 mb-2 text-left text-left text-left">
                                <Sparkles className="h-5 w-5 text-primary text-left text-left" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left text-left">Mutual effort</span>
                            </div>
                            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-balance text-left text-left text-left">{titleText}</DialogTitle>
                            <DialogDescription className="text-sm font-medium mt-1 text-left text-left text-left">{descText}</DialogDescription>
                        </DialogHeader>
                    </div>
                    <ScrollArea className="flex-grow min-h-0 text-left text-left">
                        <div className="p-8 text-left text-left">
                            {innerContent}
                        </div>
                    </ScrollArea>
                    <DialogFooter className="p-6 border-t bg-muted/5 shrink-0 text-left text-left">
                        <Button variant="outline" className="rounded-full px-8 text-left text-left" onClick={() => setIsOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
      )}
    </>
  );
}
