
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, CalendarDays, Info, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';

interface KingdomAdSpotProps {
    type: 'business' | 'event';
}

/**
 * @fileOverview High-fidelity, responsive ad spot for Kingdom businesses and missions.
 * Redesigned for premium visibility within the global testimony feed.
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
            <Card className="rounded-none sm:rounded-[2rem] border-y sm:border border-border h-32 animate-pulse bg-muted/20 mx-0 sm:mx-0 text-left mb-6" />
        );
    }

    return (
        <Card className="rounded-none sm:rounded-[3rem] border-y sm:border border-border border-x-0 sm:border-x border-t-8 border-t-primary shadow-2xl bg-[#09090b] overflow-hidden group text-left transition-all duration-500 hover:border-primary/40 mx-0 sm:mx-0 w-full mb-6">
            <CardContent className="p-0 text-left">
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 p-8 sm:p-10 text-left">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 min-w-0 flex-1 text-center sm:text-left">
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
                            <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2 mb-2 text-left">
                                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white truncate max-w-full text-left">
                                    {activeAd?.title || (isBusiness ? "Kingdom Enterprise" : "Kingdom Mission")}
                                </h3>
                                <Badge variant="outline" className="h-5 px-2 text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20 shrink-0">Premium</Badge>
                            </div>
                            <p className="text-sm sm:text-base text-zinc-400 font-medium leading-relaxed italic text-balance text-center sm:text-left">
                                {activeAd?.description || (isBusiness 
                                    ? "Empowering the Body through economic unity and professional Kingdom service."
                                    : "Mobilize the saints for your next outreach and spread the light of Jesus.")}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center sm:items-end gap-4 shrink-0 w-full sm:w-auto text-left border-t sm:border-none pt-6 sm:pt-0">
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] text-left">
                            <Info className="h-3 w-3 text-primary/60 text-left" />
                            SPONSORED MISSION
                        </div>
                        <Button asChild size="lg" className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/30 bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 text-center w-full sm:w-auto">
                            <Link href={activeAd?.url || "/contact"} className="flex items-center justify-center gap-2">
                                BOOST MISSION
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
