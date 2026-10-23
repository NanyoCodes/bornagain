'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, CalendarDays, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';

interface KingdomAdSpotProps {
    type: 'business' | 'event';
}

/**
 * @fileOverview Refined ad spots for Kingdom businesses and missions.
 * Increased visual size for better premium presence within the shared feed.
 */
export function KingdomAdSpot({ type }: KingdomAdSpotProps) {
    const isBusiness = type === 'business';
    const firestore = useFirestore();

    const adsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'ads'),
            where('status', '==', 'active'),
            where('type', '==', isBusiness ? 'business' : 'event'),
            limit(1)
        );
    }, [firestore, isBusiness]);

    const { data: userAds, loading } = useCollection<any>(adsQuery);
    const activeAd = userAds?.[0];

    if (loading) {
        return (
            <Card className="rounded-none sm:rounded-2xl border-y sm:border border-border h-32 animate-pulse bg-muted/20 mx-4 sm:mx-0 text-left" />
        );
    }

    return (
        <Card className="rounded-none sm:rounded-[3rem] border-y sm:border border-border border-x-0 sm:border-x border-t-8 border-t-primary shadow-2xl bg-[#09090b] overflow-hidden group text-left transition-all duration-500 hover:border-primary/40 mx-4 sm:mx-0 text-left">
            <CardContent className="p-0 text-left">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-8 sm:p-10 text-left">
                    <div className="flex items-center gap-6 min-w-0 flex-1 text-left">
                        <div className={cn(
                            "h-20 w-20 sm:h-24 sm:w-24 rounded-[2rem] flex items-center justify-center shrink-0 shadow-2xl transition-transform group-hover:scale-110 duration-700 text-left",
                            isBusiness 
                                ? "bg-gradient-to-br from-indigo-600 to-purple-600" 
                                : "bg-gradient-to-br from-orange-600 to-red-600"
                        )}>
                            {isBusiness ? (
                                <Store className="h-10 w-10 text-white text-left" />
                            ) : (
                                <CalendarDays className="h-10 w-10 text-white text-left" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-2 mb-2 text-left">
                                <Sparkles className="h-5 w-5 text-primary animate-pulse text-left" />
                                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white truncate text-left">
                                    {activeAd?.title || (isBusiness ? "Kingdom Enterprise" : "Kingdom Mission")}
                                </h3>
                            </div>
                            <p className="text-sm sm:text-base text-zinc-400 font-medium leading-relaxed italic text-left">
                                {activeAd?.description || (isBusiness 
                                    ? "Empowering the Body through economic unity and professional Kingdom service."
                                    : "Mobilize the saints for your next outreach and spread the light of Jesus.")}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center sm:items-end gap-3 shrink-0 text-left w-full sm:w-auto">
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] text-center sm:text-right text-left">
                            <Info className="h-3 w-3 text-primary/60 text-left" />
                            SPONSORED MISSION
                        </div>
                        <Button asChild size="lg" className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/30 bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 text-center text-left w-full sm:w-auto">
                            <Link href={activeAd?.url || "/contact"} className="text-center text-left">
                                {isBusiness ? "BOOST NOW" : "JOIN MISSION"}
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
