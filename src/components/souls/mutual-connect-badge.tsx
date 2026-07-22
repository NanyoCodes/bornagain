'use client';

import * as React from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Soul } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * @fileOverview Identifies and counts unique Kingdom mobilizers reaching the same soul.
 */
export function MutualConnectBadge({ soul }: { soul: Soul }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [count, setCount] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!firestore || !user || (!soul.phone && !soul.email)) return;

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
        // Extract unique mobilizers (userIds) to avoid counting duplicates from the same user
        const uniqueMobilizers = new Set(snapshot.docs.map(doc => doc.data().userId));
        setCount(uniqueMobilizers.size);
      } catch (e) {
        console.warn("Mutual check sync skipped:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchMutual();
  }, [firestore, user, soul.phone, soul.email]);

  if (loading || count <= 1) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="h-5 px-1.5 gap-1 bg-primary/5 text-primary border-primary/20 animate-in fade-in zoom-in shrink-0 cursor-help"
            onClick={(e) => e.stopPropagation()}
          >
            <Users className="h-3 w-3" />
            <span className="text-[9px] font-black">{count}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="rounded-xl border-primary/20 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <p className="text-[10px] font-bold uppercase tracking-tight">
            {count} Kingdom Mobilizers reaching this soul
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
