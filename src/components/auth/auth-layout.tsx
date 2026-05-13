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
    text: "All the believers were one in heart and mind. No one claimed that any of their possessions was their own, but they shared everything they had. With great power the apostles continued to testify to the resurrection of the Lord Jesus, and abundant grace was upon them all.",
    reference: "Acts 4:32-33"
  }
];

const collageImages = [
    "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=1000&auto=format&fit=crop", // Calvary Cross
    "https://images.unsplash.com/photo-1510531704581-5b2870972060?q=80&w=1000&auto=format&fit=crop", // Worship
    "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=1000&auto=format&fit=crop", // Bible
    "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?q=80&w=1000&auto=format&fit=crop", // Light
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
            <div className="flex justify-start w-full mb-8">
                {logo && (
                    <Link href="/">
                        <Avatar className="h-20 w-20 border-2 border-primary/10 shadow-sm rounded-xl">
                            <AvatarImage src={logo.imageUrl} alt="Testify" />
                            <AvatarFallback>T</AvatarFallback>
                        </Avatar>
                    </Link>
                )}
            </div>
            
            {children}
            
            <div className="mt-8 space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">GLOBAL TESTIMONIES</h3>
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin opacity-20" /></div>
                    ) : testimonies?.map((t) => (
                        <Card key={t.id} className="bg-muted/10 border-none shadow-none">
                            <CardContent className="p-3">
                                <p className="text-xs text-muted-foreground line-clamp-2 italic italic">"{t.content}"</p>
                                <p className="text-[9px] font-bold mt-1 uppercase text-muted-foreground/60">— {t.authorFirstName} {t.authorLastName?.charAt(0)}.</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <footer className="text-center text-[9px] uppercase tracking-widest text-muted-foreground/40 mt-8 pt-8 border-t">
                <div className="flex justify-center gap-6 mb-4">
                    <Link href="/terms-of-service" className="hover:text-primary">Terms</Link>
                    <Link href="/privacy-policy" className="hover:text-primary">Privacy</Link>
                </div>
                <p>© {new Date().getFullYear()} TESTIFY GLOBAL</p>
            </footer>
        </div>
      </div>
      
      <div className="hidden lg:flex flex-col items-center justify-center p-12 text-white relative overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-2 p-2 opacity-30">
            {collageImages.map((src, idx) => (
                <div key={idx} className="relative w-full h-full overflow-hidden rounded-xl">
                    <Image src={src} alt="Christian imagery" fill className="object-cover" priority data-ai-hint="jesus cross" />
                </div>
            ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        
        <div className="space-y-4 mb-12 z-10 text-center">
            <h1 className="text-5xl font-bold font-headline">Testify</h1>
            <p className="text-zinc-300 max-w-md text-lg">A global platform for believers to share God's work.</p>
            <p className="text-zinc-500 font-medium tracking-wide uppercase">GLORIFYING GOD</p>
        </div>

        <Carousel plugins={[plugin.current]} className="w-full max-w-lg z-10">
          <CarouselContent>
            {scriptures.map((scripture, index) => (
              <CarouselItem key={index}>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-10 rounded-3xl text-center space-y-6">
                  <Quote className="h-8 w-8 text-primary opacity-50 mx-auto" />
                  <p className="text-2xl font-medium italic">"{scripture.text}"</p>
                  <p className="text-zinc-400 font-bold tracking-wider">— {scripture.reference}</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
}