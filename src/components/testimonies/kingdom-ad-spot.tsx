
'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, CalendarDays, ArrowRight, Info, Sparkles } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";
import Link from 'next/link';

interface KingdomAdSpotProps {
    type: 'business' | 'event';
}

/**
 * @fileOverview High-fidelity ad spots for Kingdom businesses and missions.
 * Refined to remove redundant headers and provide an immersive visual experience.
 */
export function KingdomAdSpot({ type }: KingdomAdSpotProps) {
    const adImage = PlaceHolderImages.find(img => img.id === 'ad-placeholder-1');
    const isBusiness = type === 'business';
    
    return (
        <Card className="rounded-none sm:rounded-[3rem] border-y sm:border border-border border-x-0 sm:border-x border-t-[6px] border-t-primary shadow-none sm:shadow-2xl bg-[#09090b] overflow-hidden group text-left transition-all duration-500 hover:scale-[1.01] hover:border-primary/20">
            <CardContent className="p-0 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 text-left">
                    <div className="relative aspect-video md:aspect-auto h-full min-h-[220px] bg-zinc-900 overflow-hidden text-left">
                        {adImage && (
                            <Image 
                                src={adImage.imageUrl} 
                                alt="Kingdom Spotlight" 
                                fill 
                                className="object-cover opacity-50 transition-transform duration-[2000ms] group-hover:scale-125 text-left"
                                unoptimized
                                data-ai-hint={adImage.imageHint}
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent text-left" />
                        <div className="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors duration-500 text-left" />
                        
                        <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2 text-left shadow-2xl">
                            <Sparkles className="h-4 w-4 text-primary animate-pulse text-left" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest text-left">KINGDOM SPOTLIGHT</span>
                        </div>
                    </div>
                    <div className="p-8 sm:p-12 flex flex-col justify-center space-y-6 bg-gradient-to-br from-[#121217] to-[#09090b] text-left relative">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity duration-700 text-left">
                            {isBusiness ? <Store className="h-48 w-48 text-primary" /> : <CalendarDays className="h-48 w-48 text-primary" />}
                        </div>
                        
                        <div className="space-y-3 text-left relative z-10">
                            <div className="flex items-center gap-3 mb-2 text-left">
                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-left">
                                    {isBusiness ? <Store className="h-4 w-4 text-primary text-left" /> : <CalendarDays className="h-4 w-4 text-primary text-left" />}
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-black font-headline uppercase tracking-tighter text-white leading-none text-left text-balance">
                                    {isBusiness ? "Kingdom Enterprise" : "Kingdom Mission"}
                                </h3>
                            </div>
                            <p className="text-base sm:text-lg text-zinc-400 font-medium leading-relaxed italic text-left text-balance border-l-2 border-primary/20 pl-6">
                                {isBusiness 
                                    ? "Empowering the Body through economic unity. Feature your business, ministry, or project to a global community dedicated to the King."
                                    : "Mobilize the saints for your next conference, worship night, or outreach. Share your event with a global community of soul-winners."}
                            </p>
                        </div>
                        
                        <div className="pt-4 text-left relative z-10">
                            <Button asChild size="lg" className="w-full h-16 rounded-[1.5rem] font-black shadow-2xl shadow-primary/30 uppercase tracking-[0.2em] group/btn bg-primary text-white hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-95 text-center">
                                <Link href="/contact" className="flex items-center justify-center w-full text-center">
                                    {isBusiness ? "BOOST MY BUSINESS" : "FEATURE MY EVENT"}
                                    <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover/btn:translate-x-2 text-left" />
                                </Link>
                            </Button>
                        </div>
                        
                        <div className="flex flex-col items-center gap-4 pt-4 text-left relative z-10">
                            <div className="h-px w-20 bg-white/10 text-left" />
                            <div className="flex items-center gap-2.5 text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] text-center text-left">
                                <Info className="h-4 w-4 text-primary/40 text-left" />
                                SPONSORED VISION
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
