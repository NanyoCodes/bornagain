'use client';

import * as React from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import type { Soul, UserProfile } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Users, History, Sparkles, Clock, Target, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { actionItems } from '@/lib/follow-up-data';
import { Separator } from '@/components/ui/separator';

interface MutualRecord {
    user: UserProfile;
    soul: Soul;
}

/**
 * @fileOverview Identifies Kingdom mobilizers reaching the same soul through multi-vector intelligence (Name, Nickname, Phone, Email).
 */
export function MutualConnectBadge({ soul }: { soul: Soul }) {
  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const [mutualRecords, setMutualRecords] = React.useState<MutualRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  const fetchMutual = React.useCallback(async () => {
      if (!firestore || !currentUser) return;
      setLoading(true);
      try {
        const soulsRef = collection(firestore, 'souls');
        const queryPromises = [];
        
        // Intelligence Vector 1: Phone (Unique Identifier)
        if (soul.phone && soul.phone.length > 5) {
          queryPromises.push(getDocs(query(soulsRef, where('phone', '==', soul.phone), limit(10))));
        }
        
        // Intelligence Vector 2: Email (Unique Identifier)
        if (soul.email && soul.email.includes('@')) {
          queryPromises.push(getDocs(query(soulsRef, where('email', '==', soul.email), limit(10))));
        }

        // Intelligence Vector 3: Strict Name Match
        if (soul.firstName && soul.lastName && soul.firstName.length > 1) {
            queryPromises.push(getDocs(query(soulsRef, 
                where('firstName', '==', soul.firstName), 
                where('lastName', '==', soul.lastName),
                limit(10)
            )));
        }

        // Intelligence Vector 4: Nickname (Social Identifier)
        if (soul.nickname && soul.nickname.length > 2) {
            queryPromises.push(getDocs(query(soulsRef, where('nickname', '==', soul.nickname), limit(10))));
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
                // Ensure we are identifying other people's records only
                if (s.userId !== currentUser.uid) {
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

        // Parallel hydration of mobilizer profiles
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
  }, [firestore, currentUser, soul.phone, soul.email, soul.firstName, soul.lastName, soul.nickname]);

  React.useEffect(() => {
    fetchMutual();
  }, [fetchMutual]);

  if (loading || mutualRecords.length === 0) return null;

  const uniqueUserCount = new Set(mutualRecords.map(r => r.user.id)).size;

  return (
    <>
      <Badge 
        variant="outline" 
        className="h-8 px-3 gap-2 bg-primary/10 text-primary border-primary/30 animate-in fade-in zoom-in shrink-0 cursor-pointer hover:bg-primary/20 transition-all shadow-sm ring-1 ring-primary/5 active:scale-95"
        onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
        }}
      >
        <Users className="h-4 w-4" />
        <span className="text-[11px] font-black tracking-widest">{uniqueUserCount}</span>
      </Badge>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl text-left">
            <div className="p-8 border-b bg-muted/10">
                <div className="flex items-center gap-3 mb-2 text-left">
                    <Sparkles className="h-5 w-5 text-primary text-left" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left">Mutual Kingdom Effort</span>
                </div>
                <DialogHeader className="text-left">
                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Collective Harvest Intelligence</DialogTitle>
                    <DialogDescription className="text-sm font-medium text-left">
                        We found {uniqueUserCount} other {uniqueUserCount === 1 ? 'believer' : 'believers'} with a matching record for {soul.firstName}.
                    </DialogDescription>
                </DialogHeader>
            </div>
            
            <ScrollArea className="max-h-[60vh] text-left">
                <div className="p-6 sm:p-10 space-y-12 text-left">
                    {mutualRecords.map((record, idx) => {
                        const history = [...(record.soul.followUpLog || [])].sort((a, b) => {
                            const dateB = safeToDate(b.date)?.getTime() ?? 0;
                            const dateA = safeToDate(a.date)?.getTime() ?? 0;
                            return dateB - dateA;
                        });

                        return (
                            <div key={`${record.user.id}-${idx}`} className="space-y-6 text-left">
                                <div className="flex items-center gap-4 text-left">
                                    <Avatar className="h-14 w-14 border-2 border-primary/10 shadow-lg shrink-0 text-left">
                                        <AvatarImage src={record.user.photoURL} className="object-cover text-left" />
                                        <AvatarFallback className="font-black bg-primary/5 text-primary text-left">
                                            {record.user.firstName?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1 text-left">
                                        <p className="font-black text-lg uppercase tracking-tight truncate text-left">
                                            {record.user.firstName} {record.user.lastName}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1 text-left">
                                            <MapPin className="h-3 w-3 text-primary opacity-60 text-left" />
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left">
                                                Mobilizer Station: {record.user.location?.city || 'Global Network'}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="h-6 px-3 text-[9px] font-black uppercase tracking-widest shrink-0 text-left">
                                        {record.soul.status}
                                    </Badge>
                                </div>

                                <div className="pl-6 border-l-4 border-primary/20 space-y-8 ml-7 text-left">
                                    <h4 className="text-[10px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2 text-left">
                                        <History className="h-3.5 w-3.5 text-left" /> Partner Log History
                                    </h4>
                                    {history.length > 0 ? history.map((log, lIdx) => {
                                        const date = safeToDate(log.date);
                                        return (
                                            <div key={lIdx} className="relative text-left">
                                                <div className="flex items-center gap-2 mb-2 text-left">
                                                    <Clock className="h-3 w-3 text-muted-foreground opacity-40 text-left" />
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 text-left">
                                                        {date ? format(date, "MMM d, yyyy 'at' p") : 'Recently'}
                                                    </p>
                                                </div>
                                                <div className="bg-muted/30 rounded-[1.5rem] p-5 border shadow-inner text-left">
                                                    {log.actions && log.actions.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mb-3 text-left">
                                                            {log.actions.map(aId => {
                                                                const action = actionItems.find(a => a.id === aId);
                                                                return action ? (
                                                                    <Badge key={aId} variant="outline" className="h-4 px-1.5 text-[8px] font-black uppercase bg-background border-primary/10 text-left">{action.label}</Badge>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                    )}
                                                    <p className="text-sm text-muted-foreground italic font-medium leading-relaxed text-left">
                                                        &ldquo;{log.note || 'Interaction logged.'}&rdquo;
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="py-8 bg-muted/10 rounded-[1.5rem] border-2 border-dashed text-center text-left">
                                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-40 text-left">No detailed logs found.</p>
                                        </div>
                                    )}
                                </div>
                                {idx < mutualRecords.length - 1 && <Separator className="mt-10 opacity-50 text-left" />}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>

            <div className="p-8 border-t bg-muted/5 flex justify-center text-center text-left">
                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] leading-relaxed max-w-sm text-center">
                    "Iron sharpens iron, and one man sharpens another." — Proverbs 27:17
                </p>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}