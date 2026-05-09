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
import { Quote } from 'lucide-react';

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

function PublicTestimonyFeed() {
    const firestore = useFirestore();
    const testimoniesQuery = useMemo(() => query(collection(firestore, 'testimonies'), orderBy('createdAt', 'desc'), limit(3)), [firestore]);
    const { data: testimonies, loading } = useCollection<Testimony>(testimoniesQuery);

    if (loading || !testimonies || testimonies.length === 0) return null;

    return (
        <div className="mt-12 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/60 text-center">GLOBAL TESTIMONIES</h3>
            <div className="grid gap-4">
                {testimonies.map((t) => (
                    <Card key={t.id} className="bg-muted/30 border-none shadow-none">
                        <CardContent className="p-4 flex gap-4">
                            <Quote className="h-5 w-5 text-primary shrink-0 opacity-50" />
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground line-clamp-3 italic">"{t.content}"</p>
                                <p className="text-xs font-semibold">— {t.authorFirstName} {t.authorLastName?.charAt(0)}.</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');
  const authBackground = PlaceHolderImages.find((img) => img.id === 'auth-background');
  
  const plugin = React.useRef(
    Autoplay({ delay: 7000, stopOnInteraction: true })
  )

  return (
    <div className="w-full lg:grid lg:grid-cols-2 min-h-screen">
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-xs gap-6">
            <div className="flex flex-col items-start justify-start w-full mb-4">
                {logo && (
                    <Avatar className="h-20 w-20 mb-4 border-2 border-primary/20 shadow-sm">
                        <AvatarImage src={logo.imageUrl} alt={logo.description} />
                        <AvatarFallback>T</AvatarFallback>
                    </Avatar>
                )}
            </div>
            {children}
            
            <PublicTestimonyFeed />
        </div>
         <footer className="text-center text-sm text-muted-foreground mt-12 pb-8">
            <div className="flex justify-center gap-4">
              <Link href="/terms-of-service" className="hover:underline">
                Terms of Service
              </Link>
              <Link href="/privacy-policy" className="hover:underline">
                Privacy Policy
              </Link>
            </div>
          </footer>
      </div>
      <div className="hidden lg:flex flex-col items-start justify-center p-12 md:p-24 text-white relative overflow-hidden">
        {authBackground && (
            <Image
            src={authBackground.imageUrl}
            alt={authBackground.description}
            fill
            style={{ objectFit: 'cover' }}
            className="-z-10"
            data-ai-hint={authBackground.imageHint}
            priority
            />
        )}
        <div className="absolute inset-0 bg-black/60 -z-10" />
        
        <div className="space-y-4 mb-12 z-10">
            <h1 className="text-4xl font-bold">Welcome to Testify</h1>
            <p className="text-zinc-300 max-w-md">
                A platform for believers to share testimonies, organize soul-winning campaigns, and track evangelism progress.
            </p>
             <p className="text-zinc-400">Join thousands of others in this digital revival.</p>
        </div>

        <Carousel
          plugins={[plugin.current]}
          className="w-full max-w-md"
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
        >
          <CarouselContent>
            {scriptures.map((scripture, index) => (
              <CarouselItem key={index}>
                <div className="bg-zinc-900/50 backdrop-blur-sm p-8 rounded-2xl space-y-4 relative z-10 shadow-lg">
                  <p className="text-xl font-semibold leading-relaxed">"{scripture.text}"</p>
                  <p className="text-right text-zinc-400">- {scripture.reference}</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
}
