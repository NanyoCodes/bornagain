'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, CalendarDays, ArrowRight, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';

interface KingdomAdSpotProps {
    type: 'business' | 'event';
}

/**
 * @fileOverview Refined ad spots for Kingdom businesses and missions.
 * Redesigned for better visual weight and clear sponsorship labeling.
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
            <Card className="rounded-none sm:rounded-2xl border-y sm:border border-border h-24 animate-pulse bg-muted/20 mx-4 sm:mx-0 text-left" />
        );
    }

    return (
        <Card className="rounded-none sm:rounded-[2.5rem] border-y sm:border border-border border-x-0 sm:border-x border-t-4 border-t-primary shadow-lg bg-[#09090b] overflow-hidden group text-left transition-all duration-300 hover:border-primary/20 text-left">
            <CardContent className="p-0 text-left">
                <div className="flex flex-row items-center justify-between gap-4 p-4 sm:p-5 text-left">
                    <div className="flex items-center gap-4 min-w-0 flex-1 text-left">
                        <div className={cn(
                            "h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl transition-transform group-hover:scale-110 duration-500 text-left",
                            isBusiness 
                                ? "bg-gradient-to-br from-indigo-600 to-purple-600" 
                                : "bg-gradient-to-br from-orange-600 to-red-600"
                        )}>
                            {isBusiness ? (
                                <Store className="h-6 w-6 text-white text-left" />
                            ) : (
                                <CalendarDays className="h-6 w-6 text-white text-left" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-2 mb-1 text-left">
                                <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse text-left" />
                                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white truncate text-left">
                                    {activeAd?.title || (isBusiness ? "Kingdom Enterprise" : "Kingdom Mission")}
                                </h3>
                            </div>
                            <p className="text-[10px] sm:text-xs text-zinc-400 font-medium leading-relaxed truncate italic text-left">
                                {activeAd?.description || (isBusiness 
                                    ? "Empowering the Body through economic unity."
                                    : "Mobilize the saints for your next outreach.")}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 shrink-0 text-left">
                        <div className="flex items-center gap-1.5 text-[8px] text-zinc-500 font-black uppercase tracking-[0.2em] text-right text-left">
                            <Info className="h-2.5 w-2.5 text-primary/40 text-left" />
                            SPONSORED
                        </div>
                        <Button asChild size="sm" className="h-9 px-6 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-xl shadow-primary/30 bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 text-center text-left">
                            <Link href={activeAd?.url || "/contact"} className="text-center text-left">
                                {isBusiness ? "BOOST" : "MISSION"}
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
