'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Newspaper, 
  Target, 
  UserPlus, 
  Users, 
  ArrowRight, 
  Sparkles, 
  Flame, 
  Globe, 
  Quote,
  Loader2,
  Instagram,
  Award,
  ShieldCheck,
  Zap,
  HeartHandshake
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Testimony } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';

const features = [
  {
    title: "Share Miracles",
    description: "Post your testimonies to the global feed. Every shared story is a weapon that overcomes the enemy.",
    icon: Newspaper,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10"
  },
  {
    title: "Mission Campaigns",
    description: "Organize and join soul-winning campaigns in your city. Mobilize with real-time field coordination.",
    icon: Target,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10"
  },
  {
    title: "Log the Harvest",
    description: "Track every convert you lead to Christ. Never lose a new brother or sister in the follow-up process.",
    icon: UserPlus,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10"
  },
  {
    title: "Kingdom Circles",
    description: "Connect converts to fellowship groups and find accountability partners to stay sharp in the field.",
    icon: Users,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10"
  }
];

export default function LandingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');

  // Redirect away if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/testimonies');
    }
  }, [user, authLoading, router]);

  const testimoniesQuery = useMemo(() => (
    firestore ? query(collection(firestore, 'testimonies'), orderBy('createdAt', 'desc'), limit(3)) : null
  ), [firestore]);
  
  const { data: testimonies, loading: loadingTestimonies } = useCollection<Testimony>(testimoniesQuery);

  // Return a clean loader if we're authenticated or still checking, 
  // preventing the landing page from flickering.
  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-primary/30 overflow-x-hidden relative">
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {logo && (
              <Avatar className="h-10 w-10 sm:h-11 sm:w-11">
                <AvatarImage src={logo.imageUrl} alt="Logo" />
                <AvatarFallback>T</AvatarFallback>
              </Avatar>
            )}
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" asChild className="hidden sm:inline-flex font-bold">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="rounded-full px-4 font-black tracking-widest uppercase text-[10px] sm:text-xs h-9">
              <Link href="/signup">Join Movement</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-16">
        <section className="relative h-[85vh] min-h-[500px] flex items-center overflow-hidden bg-zinc-950">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
            <div className="max-w-3xl space-y-8 text-center sm:text-left">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <Badge className="bg-primary text-primary-foreground mb-4 px-4 py-1 rounded-full font-black uppercase tracking-[0.2em] text-[10px]">
                  GLORIFYING GOD
                </Badge>
                <h1 className="text-4xl sm:text-6xl md:text-8xl font-black font-headline text-white leading-[1.1] sm:leading-[0.9] tracking-tighter">
                  Testify the <br className="hidden sm:block" />
                  Greatness of GOD.<br className="hidden sm:block" />
                  <span className="text-primary">Join the Harvest.</span>
                </h1>
                <p className="mt-6 text-lg sm:text-xl text-white/80 font-medium max-w-xl italic leading-relaxed">
                  "And they overcame him by the blood of the Lamb, and by the word of their testimony..." — Revelation 12:11
                </p>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="h-12 px-8 text-base font-black rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-widest">
                  <Link href="/signup">Get Started Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-bold rounded-2xl bg-white/5 backdrop-blur-md border-white/20 text-white hover:bg-white/10">
                  <Link href="/about">Our Mission</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6 text-left">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black font-headline uppercase">Our Mission</h2>
                  </div>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Testify is built for believers to share the greatness of Jesus Christ who gave his life as an offering to reconcile the world to GOD.
                  </p>
                </div>
              </div>
              <Card className="rounded-[2.5rem] border-l-8 border-l-primary bg-muted/20 border-none shadow-sm overflow-hidden text-left">
                   <CardContent className="p-10">
                      <p className="italic text-muted-foreground text-lg leading-relaxed">
                        "I believe technology is a divine gift for this final harvest. Seeing the need for accountability in evangelism, I was led to create a space where every miracle is recorded for God's glory."
                      </p>
                      <p className="mt-6 text-sm font-black uppercase tracking-widest text-primary">— Nanyo Theophilus</p>
                   </CardContent>
                </Card>
            </div>
          </div>
        </section>

        <section className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl sm:text-5xl font-black font-headline tracking-tight uppercase">Kingdom Ready Workforce</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Equipping believers with the tools needed to fulfill the Great Commission.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((f, i) => (
                <Card key={i} className="rounded-[2rem] border-none shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 duration-300 text-left">
                  <CardHeader className="p-8">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", f.bgColor)}>
                      <f.icon className={cn("h-6 w-6", f.color)} />
                    </div>
                    <CardTitle className="text-xl font-black font-headline uppercase">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-8 pb-8">
                    <p className="text-muted-foreground leading-relaxed text-sm">{f.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-muted/50 border-t py-16 text-left">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 sm:col-span-2 space-y-6">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                {logo && (
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={logo.imageUrl} alt="Logo" />
                    <AvatarFallback>T</AvatarFallback>
                  </Avatar>
                )}
              </Link>
              <p className="text-muted-foreground text-sm max-w-sm italic">
                Testify is built for believers to share the greatness of Jesus Christ.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Platform</h4>
              <ul className="space-y-3">
                <li><Link href="/testimonies" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold">Glory Feed</Link></li>
                <li><Link href="/campaigns" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold">Mission Hub</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Ministry</h4>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold">Our Story</Link></li>
                <li><Link href="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="h-px w-full bg-muted opacity-50 mb-8" />
          <div className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            © {new Date().getFullYear()} TESTIFY GLOBAL. Built for the Great Commission.
          </div>
        </div>
      </footer>
    </div>
  );
}
