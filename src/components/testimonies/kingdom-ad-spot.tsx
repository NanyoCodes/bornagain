
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, CalendarDays, ArrowRight, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from 'next/link';

interface KingdomAdSpotProps {
    type: 'business' | 'event';
}

/**
 * @fileOverview Concise ad spots for Kingdom businesses and missions.
 * Refined to be much more compact with a horizontal layout and reduced footprint.
 */
export function KingdomAdSpot({ type }: KingdomAdSpotProps) {
    const isBusiness = type === 'business';
    
    return (
        <Card className="rounded-none sm:rounded-2xl border-y sm:border border-border border-x-0 sm:border-x border-t-4 border-t-primary shadow-none sm:shadow-md bg-[#09090b] overflow-hidden group text-left transition-all duration-300 hover:border-primary/20">
            <CardContent className="p-0 text-left">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 text-left">
                    <div className="flex items-center gap-4 min-w-0 flex-1 text-left">
                        <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110 duration-500",
                            isBusiness 
                                ? "bg-gradient-to-br from-indigo-600 to-purple-600" 
                                : "bg-gradient-to-br from-orange-600 to-red-600"
                        )}>
                            {isBusiness ? (
                                <Store className="h-6 w-6 text-white" />
                            ) : (
                                <CalendarDays className="h-6 w-6 text-white" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-2 mb-0.5 text-left">
                                <Sparkles className="h-3 w-3 text-primary animate-pulse text-left" />
                                <h3 className="text-sm font-black uppercase tracking-tight text-white truncate text-left">
                                    {isBusiness ? "Kingdom Enterprise" : "Kingdom Mission"}
                                </h3>
                            </div>
                            <p className="text-[10px] sm:text-xs text-zinc-400 font-medium leading-tight truncate italic text-left">
                                {isBusiness 
                                    ? "Empowering the Body through economic unity."
                                    : "Mobilize the saints for your next outreach."}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto text-left">
                        <div className="hidden md:flex flex-col items-end text-right">
                             <div className="flex items-center gap-1 text-[8px] text-zinc-500 font-black uppercase tracking-[0.2em] text-right">
                                <Info className="h-2.5 w-2.5 text-primary/40 text-left" />
                                SPONSORED
                            </div>
                        </div>
                        <Button asChild size="sm" className="flex-1 sm:flex-none h-9 px-6 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 text-center">
                            <Link href="/contact" className="text-center text-left">
                                {isBusiness ? "BOOST BUSINESS" : "FEATURE EVENT"}
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
