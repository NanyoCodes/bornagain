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
import { SplashScreen } from '../common/splash-screen';

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
    // Show splash if it hasn't been shown in the last 12 hours
    const SPLASH_COOLDOWN = 12 * 60 * 60 * 1000; // 12 hours
    const lastShown = localStorage.getItem('testify_splash_last_shown');
    const now = Date.now();

    if (!lastShown || now - parseInt(lastShown, 10) > SPLASH_COOLDOWN) {
      setShowSplash(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
        localStorage.setItem('testify_splash_last_shown', now.toString());
        setContentVisible(true);
      }, 3000); //snappier splash
      return () => clearTimeout(timer);
    } else {
      setContentVisible(true);
    }
  }, []);

  const handleDismissSplash = () => {
    setShowSplash(false);
    localStorage.setItem('testify_splash_last_shown', Date.now().toString());
    setContentVisible(true);
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden text-left">
      <AnimatePresence>
        {showSplash && (
          <SplashScreen onDismiss={handleDismissSplash} />
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: contentVisible ? 1 : 0 }}
        transition={{ duration: 1 }}
        className="relative w-full min-h-screen text-left"
      >
        {/* Background Gospel Image Overlay */}
        <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
            style={{ 
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url(${gospelCollageUrl})`,
            }}
            data-ai-hint="bible scriptures"
        />

        <div className="relative z-10 w-full lg:grid lg:grid-cols-2 min-h-screen bg-transparent text-left">
            <div className="flex flex-col p-6 sm:p-12 overflow-y-auto bg-background/95 backdrop-blur-md lg:bg-background/85 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-left">
            <div className="mx-auto w-full max-w-[340px] space-y-6 text-left">
                {logo && (
                    <div className="flex justify-start w-full mb-8 text-left">
                    <Link href="/">
                        <Avatar className="h-20 w-20 border shadow-sm ring-4 ring-primary/10 text-left">
                        <AvatarImage src={logo.imageUrl} alt="BornAgain" className="text-left" />
                        <AvatarFallback className="text-left font-black">B</AvatarFallback>
                        </Avatar>
                    </Link>
                    </div>
                )}
                
                {children}
                
                <div className="mt-8 space-y-4 text-left">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 text-center">GLOBAL TESTIMONIES</h3>
                    <div className="space-y-3 text-left">
                        {loading ? (
                            <div className="flex justify-center text-left"><Loader2 className="h-5 w-5 animate-spin opacity-20 text-left" /></div>
                        ) : testimonies?.map((t) => (
                            <Card key={t.id} className="bg-muted/10 border-none shadow-none text-left">
                                <CardContent className="p-3 text-left">
                                    <p className="text-xs text-muted-foreground line-clamp-2 italic text-left">"{t.content}"</p>
                                    <p className="text-[9px] font-bold mt-1 uppercase text-muted-foreground/60 text-left">— {t.authorFirstName} {t.authorLastName?.charAt(0)}.</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <footer className="text-center text-[9px] uppercase tracking-widest text-muted-foreground/40 mt-8 pt-8 border-t border-muted/20 text-left">
                    <div className="flex justify-center gap-4 mb-4 flex-wrap text-left">
                        <Link href="/about" className="hover:text-primary transition-colors text-left">About</Link>
                        <Link href="/contact" className="hover:text-primary transition-colors text-left">Contact</Link>
                        <Link href="/guide" className="hover:text-primary transition-colors text-left">App Guide</Link>
                        <Link href="/resources" className="hover:text-primary transition-colors text-left">Resources</Link>
                        <Link href="/terms-of-service" className="hover:text-primary transition-colors text-left">Terms</Link>
                        <Link href="/privacy-policy" className="hover:text-primary transition-colors text-left">Privacy</Link>
                    </div>
                    <p className="text-left">© {new Date().getFullYear()} BornAgain GLOBAL</p>
                </footer>
            </div>
            </div>
            
            <div className="hidden lg:flex flex-col items-center justify-center p-12 text-foreground relative overflow-hidden bg-black/40 backdrop-blur-sm border-l border-white/5 text-left">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent text-left" />
            
            <div className="space-y-4 mb-12 z-10 text-center text-left">
                <h1 className="text-5xl font-bold font-headline text-white shadow-sm text-left text-center">BornAgain</h1>
                <p className="text-white/80 max-w-md text-lg text-left text-center">Share Testimonies. Win Souls. Spread Jesus Christ.</p>
                <p className="text-primary font-black tracking-[0.3em] uppercase text-xs text-left text-center">GLORIFYING GOD</p>
            </div>

            <Carousel plugins={[plugin.current]} className="w-full max-w-lg z-10 text-left">
                <CarouselContent className="text-left">
                {scriptures.map((scripture, index) => (
                    <CarouselItem key={index} className="text-left">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 p-10 rounded-3xl text-center space-y-6 shadow-2xl text-left">
                        <Quote className="h-8 w-8 text-primary opacity-50 mx-auto text-left" />
                        <p className="text-2xl font-medium italic text-white text-left text-center">"{scripture.text}"</p>
                        <p className="text-white/60 font-bold tracking-wider text-left text-center">— {scripture.reference}</p>
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
