'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, CalendarDays, Megaphone, ArrowRight, Quote, Sparkles, MessageSquare, Info } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";
import Link from 'next/link';

interface KingdomAdSpotProps {
    type: 'business' | 'event';
}

export function KingdomAdSpot({ type }: KingdomAdSpotProps) {
    const adImage = PlaceHolderImages.find(img => img.id === 'ad-placeholder-1');
    const isBusiness = type === 'business';
    
    return (
        <Card className="rounded-none sm:rounded-[2.5rem] border-y sm:border border-border border-x-0 sm:border-x border-t-4 border-t-primary/40 shadow-none sm:shadow-lg bg-[#1c1c21] overflow-hidden group text-left">
            <div className="p-4 sm:p-6 pb-4 border-b border-white/5 flex items-center justify-between bg-black/20 text-left">
                <div className="flex items-center gap-2.5 text-left">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-left">
                        <Megaphone className="h-4 w-4 text-primary text-left" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 text-left">Kingdom Spotlight</span>
                </div>
                <Badge variant="outline" className="h-5 px-2 text-[8px] font-black uppercase tracking-widest bg-background/50 border-primary/20 text-primary text-left">FEATURED VISION</Badge>
            </div>
            
            <CardContent className="p-0 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 text-left">
                    <div className="relative aspect-video md:aspect-auto h-full min-h-[180px] bg-zinc-900 overflow-hidden text-left">
                        {adImage && (
                            <Image 
                                src={adImage.imageUrl} 
                                alt="Kingdom Spotlight" 
                                fill 
                                className="object-cover opacity-60 transition-transform duration-1000 group-hover:scale-110 text-left"
                                unoptimized
                                data-ai-hint={adImage.imageHint}
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent text-left" />
                        <div className="absolute top-4 left-4 bg-primary/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 text-left">
                            <Sparkles className="h-3 w-3 text-primary animate-pulse text-left" />
                            <span className="text-[8px] font-black text-white uppercase tracking-widest text-left">Kingdom Mindset</span>
                        </div>
                    </div>
                    <div className="p-8 sm:p-10 flex flex-col justify-center space-y-5 bg-gradient-to-br from-[#1c1c21] to-[#09090b] text-left">
                        <div className="space-y-2 text-left">
                            <div className="flex items-center gap-2.5 mb-2 text-left">
                                {isBusiness ? <Store className="h-5 w-5 text-primary text-left" /> : <CalendarDays className="h-5 w-5 text-primary text-left" />}
                                <h3 className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-white leading-none text-left">
                                    {isBusiness ? "Kingdom Enterprise" : "Kingdom Mission"}
                                </h3>
                            </div>
                            <p className="text-sm sm:text-base text-zinc-400 font-medium leading-relaxed italic text-left">
                                {isBusiness 
                                    ? "Empowering the Body through economic unity. Feature your business, ministry, or project to a global community dedicated to the King."
                                    : "Mobilize the saints for your next conference, worship night, or outreach. Share your event with a global community of soul-winners."}
                            </p>
                        </div>
                        
                        <div className="pt-2 text-left">
                            <Button asChild className="w-full h-14 rounded-2xl font-black shadow-xl shadow-primary/20 uppercase tracking-[0.2em] group/btn bg-primary text-white hover:bg-primary/90 text-center">
                                <Link href="/contact" className="flex items-center justify-center w-full text-center">
                                    {isBusiness ? "BOOST MY BUSINESS" : "FEATURE MY EVENT"}
                                    <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover/btn:translate-x-1 text-left" />
                                </Link>
                            </Button>
                        </div>
                        
                        <div className="flex flex-col items-center gap-3 pt-2 text-left">
                            <div className="h-px w-12 bg-white/10 text-left" />
                            <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em] text-center text-left">
                                <Info className="h-3 w-3 text-left" />
                                ALL VISIONARY PROJECTS WELCOME
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
