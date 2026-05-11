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
    "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=1000&auto=format&fit=crop", // Happy group
    "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=1000&auto=format&fit=crop", // Smiling friends
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1000&auto=format&fit=crop", // Joyful group
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000&auto=format&fit=crop", // Laughing people
];

function PublicTestimonyFeed() {
    const firestore = useFirestore();
    const testimoniesQuery = useMemo(() => query(collection(firestore, 'testimonies'), orderBy('createdAt', 'desc'), limit(3)), [firestore]);
    const { data: testimonies, loading } = useCollection<Testimony>(testimoniesQuery);

    return (
        <div className="mt-8 space-y-4 w-full">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 text-center">GLOBAL TESTIMONIES</h3>
            <div className="grid gap-3">
                {loading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/20" />
                    </div>
                ) : testimonies && testimonies.length > 0 ? (
                    testimonies.map((t) => (
                        <Card key={t.id} className="bg-muted/10 border-none shadow-none transition-opacity duration-500 animate-in fade-in">
                            <CardContent className="p-3 flex gap-3">
                                <Quote className="h-3 w-3 text-primary shrink-0 opacity-40 mt-1" />
                                <div className="space-y-0.5 overflow-hidden">
                                    <p className="text-xs text-muted-foreground line-clamp-2 italic leading-relaxed">"{t.content}"</p>
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">— {t.authorFirstName} {t.authorLastName?.charAt(0)}.</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <p className="text-center text-[10px] text-muted-foreground/40 italic">Waiting for the Word to spread...</p>
                )}
            </div>
        </div>
    );
}

function PhotoCollage() {
    return (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-2 p-2 opacity-40">
            {collageImages.map((src, idx) => (
                <div key={idx} className="relative w-full h-full overflow-hidden rounded-xl border border-white/5 shadow-2xl">
                    <Image
                        src={src}
                        alt={`Happy community members ${idx + 1}`}
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
            ))}
        </div>
    );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');
  
  const plugin = React.useRef(
    Autoplay({ delay: 6000, stopOnInteraction: true })
  )

  return (
    <div className="w-full lg:grid lg:grid-cols-2 min-h-screen bg-background">
      <div className="flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-[320px] gap-6 py-8">
            <div className="flex flex-col items-center sm:items-start justify-start w-full mb-2">
                {logo && (
                    <Link href="/">
                        <Avatar className="h-14 w-14 mb-6 border-2 border-primary/10 shadow-sm transition-transform hover:scale-105 active:scale-95">
                            <AvatarImage src={logo.imageUrl} alt="Testify" />
                            <AvatarFallback>T</AvatarFallback>
                        </Avatar>
                    </Link>
                )}
            </div>
            
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {children}
            </div>
            
            <PublicTestimonyFeed />

            <footer className="text-center text-[9px] uppercase tracking-widest text-muted-foreground/40 mt-8 space-y-4">
                <div className="flex justify-center gap-6">
                    <Link href="/terms-of-service" className="hover:text-primary transition-colors">
                        Terms
                    </Link>
                    <Link href="/privacy-policy" className="hover:text-primary transition-colors">
                        Privacy
                    </Link>
                </div>
                <p>© {new Date().getFullYear()} TESTIFY GLOBAL</p>
            </footer>
        </div>
      </div>
      
      <div className="hidden lg:flex flex-col items-start justify-center p-12 md:p-24 text-white relative overflow-hidden bg-zinc-950">
        <PhotoCollage />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent z-0" />
        
        <div className="space-y-4 mb-12 z-10 animate-in fade-in slide-in-from-left-8 duration-1000">
            <h1 className="text-5xl font-bold tracking-tight font-headline">Welcome to Testify</h1>
            <p className="text-zinc-300 max-w-md text-lg leading-relaxed">
                A global platform for believers to share testimonies, organize soul-winning campaigns, and track evangelism progress.
            </p>
             <p className="text-zinc-500 font-medium tracking-wide">JOIN THE DIGITAL REVIVAL</p>
        </div>

        <Carousel
          plugins={[plugin.current]}
          className="w-full max-w-lg z-10"
        >
          <CarouselContent>
            {scriptures.map((scripture, index) => (
              <CarouselItem key={index}>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-10 rounded-3xl space-y-6 shadow-2xl">
                  <Quote className="h-8 w-8 text-primary opacity-50" />
                  <p className="text-2xl font-medium leading-relaxed italic">"{scripture.text}"</p>
                  <p className="text-right text-zinc-400 font-bold tracking-wider">— {scripture.reference}</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
}