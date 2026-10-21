'use client';

import React from 'react';
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
 * @fileOverview High-fidelity ad spots for Kingdom businesses and missions.
 * Refined to be more compact with reduced button size and height as requested.
 */
export function KingdomAdSpot({ type }: KingdomAdSpotProps) {
    const isBusiness = type === 'business';
    
    return (
        <Card className="rounded-none sm:rounded-[2.5rem] border-y sm:border border-border border-x-0 sm:border-x border-t-[6px] border-t-primary shadow-none sm:shadow-xl bg-[#09090b] overflow-hidden group text-left transition-all duration-500 hover:border-primary/20">
            <CardContent className="p-0 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 text-left">
                    <div className={cn(
                        "relative aspect-video md:aspect-auto h-full min-h-[180px] overflow-hidden text-left transition-all duration-700",
                        isBusiness 
                            ? "bg-gradient-to-br from-indigo-600 via-purple-600 to-primary" 
                            : "bg-gradient-to-br from-orange-600 via-rose-600 to-red-600"
                    )}>
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500 text-left" />
                        
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 text-left shadow-2xl">
                            <Sparkles className="h-3 w-3 text-primary animate-pulse text-left" />
                            <span className="text-[9px] font-black text-white uppercase tracking-widest text-left">KINGDOM SPOTLIGHT</span>
                        </div>

                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-left">
                            {isBusiness ? (
                                <Store className="h-24 w-24 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-1000 text-left" />
                            ) : (
                                <CalendarDays className="h-24 w-24 text-white/10 -rotate-12 group-hover:rotate-0 transition-transform duration-1000 text-left" />
                            )}
                        </div>
                    </div>
                    <div className="p-6 sm:p-10 flex flex-col justify-center space-y-5 bg-gradient-to-br from-[#121217] to-[#09090b] text-left relative">
                        <div className="space-y-2.5 text-left relative z-10 text-left">
                            <div className="flex items-center gap-2 mb-1 text-left">
                                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-left text-left">
                                    {isBusiness ? <Store className="h-3.5 w-3.5 text-primary text-left text-left" /> : <CalendarDays className="h-3.5 w-3.5 text-primary text-left text-left" />}
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tighter text-white leading-none text-left text-balance text-left">
                                    {isBusiness ? "Kingdom Enterprise" : "Kingdom Mission"}
                                </h3>
                            </div>
                            <p className="text-sm sm:text-base text-zinc-400 font-medium leading-relaxed italic text-left text-balance border-l-2 border-primary/20 pl-4 text-left">
                                {isBusiness 
                                    ? "Empowering the Body through economic unity. Feature your business, ministry, or project to a global community."
                                    : "Mobilize the saints for your next conference, worship night, or outreach. Share your event with a global community."}
                            </p>
                        </div>
                        
                        <div className="pt-2 text-left relative z-10 text-left">
                            <Button asChild size="lg" className="w-full h-12 rounded-2xl font-black shadow-xl shadow-primary/30 uppercase tracking-[0.2em] group/btn bg-primary text-white hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-95 text-center text-left">
                                <Link href="/contact" className="flex items-center justify-center w-full text-center text-left">
                                    {isBusiness ? "BOOST MY BUSINESS" : "FEATURE MY EVENT"}
                                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover/btn:translate-x-1.5 text-left text-left" />
                                </Link>
                            </Button>
                        </div>
                        
                        <div className="flex flex-col items-center gap-3 pt-2 text-left relative z-10 text-left">
                            <div className="h-px w-16 bg-white/10 text-left text-left" />
                            <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em] text-center text-left">
                                <Info className="h-3 w-3 text-primary/40 text-left text-left" />
                                SPONSORED VISION
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
