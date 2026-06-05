'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay"
import React, { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Testimony } from '@/lib/types';
import { Card, CardContent } from '../ui/card';
import { Quote, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const scriptures = [
  {
    text: "And they overcame him by the blood of the Lamb, and by the word of their testimony; and they loved not their lives unto the death.",
    reference: "Revelation 12:11"
  },
  {
    text: "All the believers were one in heart and mind. No one claimed that any of their possessions was their own, but they shared everything they had.",
    reference: "Acts 4:32"
  }
];

function SplashScreen({ logoUrl }: { logoUrl?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background p-6"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-8"
      >
        <div className="relative">
            <motion.div 
                animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, 2, -2, 0]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
                <Avatar className="h-32 w-32 sm:h-48 sm:w-48 shadow-2xl ring-8 ring-primary/10 border-4 border-background">
                  <AvatarImage src={logoUrl} alt="Testify Logo" />
                  <AvatarFallback className="text-4xl bg-primary/10 text-primary font-black">T</AvatarFallback>
                </Avatar>
            </motion.div>
            <motion.div 
                className="absolute -top-4 -right-4 h-12 w-12 bg-primary/20 rounded-full blur-2xl animate-pulse"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
            />
        </div>
        
        <div className="text-center space-y-4">
            <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                className="text-4xl sm:text-6xl font-black font-headline tracking-tighter text-primary uppercase"
            >
                Testify
            </motion.h1>
            <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.2, duration: 1 }}
                className="text-muted-foreground uppercase font-black tracking-[0.4em] text-[10px] sm:text-xs max-w-[280px] mx-auto leading-relaxed"
            >
                Empowering the Harvest through Technology
            </motion.p>
        </div>
      </motion.div>

      <div className="absolute bottom-16 flex flex-col items-center gap-4">
          <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                        opacity: [0.2, 1, 0.2],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    className="h-1.5 w-1.5 rounded-full bg-primary"
                  />
              ))}
          </div>
          <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">Kingdom Network Active</p>
      </div>
    </motion.div>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');
  const gospelCollage = PlaceHolderImages.find((img) => img.id === 'gospel-collage');
  const gospelCollageUrl = gospelCollage?.imageUrl || '';

  const firestore = useFirestore();
  const testimoniesQuery = useMemo(() => (firestore ? query(collection(firestore, 'testimonies'), orderBy('createdAt', 'desc'), limit(3)) : null), [firestore]);
  const { data: testimonies, loading } = useCollection<Testimony>(testimoniesQuery);
  
  const plugin = React.useRef(Autoplay({ delay: 6000, stopOnInteraction: true }))

  const [showSplash, setShowSplash] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('auth_splash_shown');
    if (!hasSeenSplash) {
      setShowSplash(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem('auth_splash_shown', 'true');
        setContentVisible(true);
      }, 10000); // Set to 10 seconds
      return () => clearTimeout(timer);
    } else {
      setContentVisible(true);
    }
  }, []);

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      <AnimatePresence>
        {showSplash && (
          <SplashScreen logoUrl={logo?.imageUrl} />
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: contentVisible ? 1 : 0 }}
        transition={{ duration: 1 }}
        className="relative w-full min-h-screen"
      >
        {/* Background Gospel Image Overlay */}
        <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
            style={{ 
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url(${gospelCollageUrl})`,
            }}
            data-ai-hint="bible scriptures"
        />

        <div className="relative z-10 w-full lg:grid lg:grid-cols-2 min-h-screen bg-transparent">
            <div className="flex flex-col p-6 sm:p-12 overflow-y-auto bg-background/95 backdrop-blur-md lg:bg-background/85 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <div className="mx-auto w-full max-w-[320px] space-y-6">
                {logo && (
                    <div className="flex justify-start w-full mb-8">
                    <Link href="/">
                        <Avatar className="h-16 w-16 border shadow-sm">
                        <AvatarImage src={logo.imageUrl} alt={logo.description} />
                        <AvatarFallback>T</AvatarFallback>
                        </Avatar>
                    </Link>
                    </div>
                )}
                
                {children}
                
                <div className="mt-8 space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 text-center">GLOBAL TESTIMONIES</h3>
                    <div className="space-y-3">
                        {loading ? (
                            <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin opacity-20" /></div>
                        ) : testimonies?.map((t) => (
                            <Card key={t.id} className="bg-muted/10 border-none shadow-none">
                                <CardContent className="p-3">
                                    <p className="text-xs text-muted-foreground line-clamp-2 italic">"{t.content}"</p>
                                    <p className="text-[9px] font-bold mt-1 uppercase text-muted-foreground/60">— {t.authorFirstName} {t.authorLastName?.charAt(0)}.</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <footer className="text-center text-[9px] uppercase tracking-widest text-muted-foreground/40 mt-8 pt-8 border-t border-muted/20">
                    <div className="flex justify-center gap-4 mb-4 flex-wrap">
                        <Link href="/about" className="hover:text-primary transition-colors">About</Link>
                        <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
                        <Link href="/guide" className="hover:text-primary transition-colors">App Guide</Link>
                        <Link href="/resources" className="hover:text-primary transition-colors">Resources</Link>
                        <Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms</Link>
                        <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
                    </div>
                    <p>© {new Date().getFullYear()} TESTIFY GLOBAL</p>
                </footer>
            </div>
            </div>
            
            <div className="hidden lg:flex flex-col items-center justify-center p-12 text-foreground relative overflow-hidden bg-black/40 backdrop-blur-sm border-l border-white/5">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
            
            <div className="space-y-4 mb-12 z-10 text-center">
                <h1 className="text-5xl font-bold font-headline text-white shadow-sm">Testify</h1>
                <p className="text-white/80 max-w-md text-lg">Share Testimonies. Win Souls. Spread Jesus Christ.</p>
                <p className="text-primary font-black tracking-[0.3em] uppercase text-xs">GLORIFYING GOD</p>
            </div>

            <Carousel plugins={[plugin.current]} className="w-full max-w-lg z-10">
                <CarouselContent>
                {scriptures.map((scripture, index) => (
                    <CarouselItem key={index}>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 p-10 rounded-3xl text-center space-y-6 shadow-2xl">
                        <Quote className="h-8 w-8 text-primary opacity-50 mx-auto" />
                        <p className="text-2xl font-medium italic text-white">"{scripture.text}"</p>
                        <p className="text-white/60 font-bold tracking-wider">— {scripture.reference}</p>
                    </div>
                    </CarouselItem>
                ))}
                </CarouselContent>
            </Carousel>
            </div>
        </div>
      </motion.div>
    </div>
  );
}
