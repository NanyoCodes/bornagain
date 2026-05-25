
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
import React, { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Testimony } from '@/lib/types';
import { Card, CardContent } from '../ui/card';
import { Quote, Loader2 } from 'lucide-react';

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
  const firestore = useFirestore();
  const testimoniesQuery = useMemo(() => (firestore ? query(collection(firestore, 'testimonies'), orderBy('createdAt', 'desc'), limit(3)) : null), [firestore]);
  const { data: testimonies, loading } = useCollection<Testimony>(testimoniesQuery);
  
  const plugin = React.useRef(Autoplay({ delay: 6000, stopOnInteraction: true }))

  return (
    <div className="w-full lg:grid lg:grid-cols-2 min-h-screen bg-background">
      <div className="flex flex-col p-6 sm:p-12 overflow-y-auto">
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

            <footer className="text-center text-[9px] uppercase tracking-widest text-muted-foreground/40 mt-8 pt-8 border-t">
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
      
      <div className="hidden lg:flex flex-col items-center justify-center p-12 text-foreground relative overflow-hidden bg-transparent border-l">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
        
        <div className="space-y-4 mb-12 z-10 text-center">
            <h1 className="text-5xl font-bold font-headline">Testify</h1>
            <p className="text-muted-foreground max-w-md text-lg">Share Testimonies. Win Souls. Spread Jesus Christ.</p>
            <p className="text-primary font-black tracking-[0.3em] uppercase text-xs">GLORIFYING GOD</p>
        </div>

        <Carousel plugins={[plugin.current]} className="w-full max-w-lg z-10">
          <CarouselContent>
            {scriptures.map((scripture, index) => (
              <CarouselItem key={index}>
                <div className="bg-muted/10 backdrop-blur-md border border-border/50 p-10 rounded-3xl text-center space-y-6">
                  <Quote className="h-8 w-8 text-primary opacity-50 mx-auto" />
                  <p className="text-2xl font-medium italic">"{scripture.text}"</p>
                  <p className="text-muted-foreground font-bold tracking-wider">— {scripture.reference}</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
}
