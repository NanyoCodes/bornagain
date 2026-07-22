'use client';

import * as React from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { Soul, UserProfile } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Users, History, Sparkles, MessageSquare, Clock } from 'lucide-react';
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
 * @fileOverview Identifies Kingdom mobilizers reaching the same soul and displays their history.
 */
export function MutualConnectBadge({ soul }: { soul: Soul }) {
  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const [mutualRecords, setMutualRecords] = React.useState<MutualRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (!firestore || !currentUser || (!soul.phone && !soul.email)) return;

    const fetchMutual = async () => {
      setLoading(true);
      try {
        const soulsRef = collection(firestore, 'souls');
        let q;
        
        // Priority check based on phone, fallback to email
        if (soul.phone) {
          q = query(soulsRef, where('phone', '==', soul.phone));
        } else if (soul.email) {
          q = query(soulsRef, where('email', '==', soul.email));
        } else {
            return;
        }

        const snapshot = await getDocs(q);
        const soulsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Soul));
        
        // Extract other users' records
        const others = soulsData.filter(s => s.userId !== currentUser.uid);
        
        if (others.length === 0) {
            setMutualRecords([]);
            return;
        }

        // Fetch profiles for these users
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
        console.warn("Mutual check sync skipped:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchMutual();
  }, [firestore, currentUser, soul.phone, soul.email, soul.id]);

  if (loading || mutualRecords.length === 0) return null;

  const uniqueUserCount = new Set(mutualRecords.map(r => r.user.id)).size;

  return (
    <>
      <Badge 
        variant="outline" 
        className="h-5 px-1.5 gap-1 bg-primary/5 text-primary border-primary/20 animate-in fade-in zoom-in shrink-0 cursor-pointer hover:bg-primary/10 transition-colors"
        onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
        }}
      >
        <Users className="h-3 w-3" />
        <span className="text-[9px] font-black">{uniqueUserCount}</span>
      </Badge>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
            <div className="p-8 border-b bg-muted/10">
                <div className="flex items-center gap-3 mb-2 text-left">
                    <Sparkles className="h-5 w-5 text-primary text-left" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left">Mutual Kingdom Effort</span>
                </div>
                <DialogHeader className="text-left">
                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Collective Harvest</DialogTitle>
                    <DialogDescription className="text-sm font-medium text-left">
                        Showing {uniqueUserCount} other believers following up with {soul.firstName}.
                    </DialogDescription>
                </DialogHeader>
            </div>
            
            <ScrollArea className="max-h-[60vh] text-left">
                <div className="p-6 sm:p-8 space-y-10 text-left">
                    {mutualRecords.map((record, idx) => {
                        const history = [...(record.soul.followUpLog || [])].sort((a, b) => {
                            const dateB = safeToDate(b.date)?.getTime() ?? 0;
                            const dateA = safeToDate(a.date)?.getTime() ?? 0;
                            return dateB - dateA;
                        });

                        return (
                            <div key={`${record.user.id}-${idx}`} className="space-y-6 text-left">
                                <div className="flex items-center gap-4 text-left">
                                    <Avatar className="h-12 w-12 border-2 border-primary/10 shadow-sm shrink-0 text-left">
                                        <AvatarImage src={record.user.photoURL} className="text-left" />
                                        <AvatarFallback className="font-black bg-primary/5 text-primary text-left">
                                            {record.user.firstName?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1 text-left">
                                        <p className="font-black text-base uppercase tracking-tight truncate text-left">
                                            {record.user.firstName} {record.user.lastName}
                                        </p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left">
                                            Mobilizer Area: {record.user.location?.city || 'Global Network'}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="h-5 px-2 text-[8px] font-black uppercase tracking-tighter shrink-0 text-left">
                                        {record.soul.status}
                                    </Badge>
                                </div>

                                <div className="pl-6 border-l-4 border-primary/20 space-y-8 ml-6 text-left">
                                    <h4 className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2 text-left">
                                        <History className="h-3 w-3 text-left" /> Shared History
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
                                                <div className="bg-muted/30 rounded-2xl p-4 border shadow-inner text-left">
                                                    {log.actions && log.actions.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mb-3 text-left">
                                                            {log.actions.map(aId => {
                                                                const action = actionItems.find(a => a.id === aId);
                                                                return action ? (
                                                                    <Badge key={aId} variant="outline" className="h-4 px-1.5 text-[7px] font-bold uppercase bg-background border-primary/10 text-left">{action.label}</Badge>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                    )}
                                                    <p className="text-xs sm:text-sm text-muted-foreground italic leading-relaxed text-left">
                                                        &ldquo;{log.note || 'Interaction logged.'}&rdquo;
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="py-4 bg-muted/10 rounded-xl border border-dashed text-center text-left">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-40 text-left">No detailed logs shared yet.</p>
                                        </div>
                                    )}
                                </div>
                                {idx < mutualRecords.length - 1 && <Separator className="mt-8 opacity-50 text-left" />}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>

            <div className="p-8 border-t bg-muted/5 flex justify-center text-center text-left">
                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] leading-relaxed max-w-sm text-center">
                    "Two are better than one... for if they fall, the one will lift up his fellow." — Ecclesiastes 4:9
                </p>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
