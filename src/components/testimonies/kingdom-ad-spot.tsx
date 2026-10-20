'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, CalendarDays, Megaphone, ArrowRight, Quote, Sparkles } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";

interface KingdomAdSpotProps {
    type: 'business' | 'event';
}

export function KingdomAdSpot({ type }: KingdomAdSpotProps) {
    const adImage = PlaceHolderImages.find(img => img.id === 'ad-placeholder-1');
    const isBusiness = type === 'business';
    
    return (
        <Card className="rounded-none sm:rounded-[2.5rem] border-y sm:border border-border border-x-0 sm:border-x border-t-4 border-t-primary/40 shadow-none sm:shadow-lg bg-[#1c1c21] overflow-hidden group">
            <div className="p-4 sm:p-6 pb-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Megaphone className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Kingdom Spotlight</span>
                </div>
                <Badge variant="outline" className="h-5 px-2 text-[8px] font-black uppercase tracking-widest bg-background/50 border-primary/20 text-primary">SPONSORED</Badge>
            </div>
            
            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="relative aspect-video md:aspect-auto h-full min-h-[180px] bg-zinc-900 overflow-hidden">
                        {adImage && (
                            <Image 
                                src={adImage.imageUrl} 
                                alt="Spotlight" 
                                fill 
                                className="object-cover opacity-60 transition-transform duration-1000 group-hover:scale-110"
                                unoptimized
                                data-ai-hint={adImage.imageHint}
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute top-4 left-4 bg-primary/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                            <span className="text-[8px] font-black text-white uppercase tracking-widest">Recommended</span>
                        </div>
                    </div>
                    <div className="p-8 sm:p-10 flex flex-col justify-center space-y-5 bg-gradient-to-br from-[#1c1c21] to-[#09090b]">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2.5 mb-2">
                                {isBusiness ? <Store className="h-5 w-5 text-primary" /> : <CalendarDays className="h-5 w-5 text-primary" />}
                                <h3 className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-white leading-none">
                                    {isBusiness ? "Kingdom Business" : "Community Event"}
                                </h3>
                            </div>
                            <p className="text-sm sm:text-base text-zinc-400 font-medium leading-relaxed italic">
                                {isBusiness 
                                    ? "Support your brethren! Explore high-quality services and products offered by believers dedicated to the King."
                                    : "Join the gathering! Experience collective worship, spiritual breakthrough, and community fellowship."}
                            </p>
                        </div>
                        
                        <div className="pt-2">
                            <Button className="w-full h-14 rounded-2xl font-black shadow-xl shadow-primary/20 uppercase tracking-[0.2em] group/btn bg-primary text-white hover:bg-primary/90">
                                {isBusiness ? "EXPLORE SERVICES" : "LEARN MORE"}
                                <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
                            </Button>
                        </div>
                        
                        <div className="flex flex-col items-center gap-2 pt-2">
                            <div className="h-px w-12 bg-white/10" />
                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.4em] text-center">
                                Economic Unity • Body of Christ
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
