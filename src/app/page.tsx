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

  // Silent redirect for authenticated users
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/testimonies');
    }
  }, [user, authLoading, router]);

  const testimoniesQuery = useMemo(() => (
    firestore ? query(collection(firestore, 'testimonies'), orderBy('createdAt', 'desc'), limit(3)) : null
  ), [firestore]);
  
  const { data: testimonies, loading: loadingTestimonies } = useCollection<Testimony>(testimoniesQuery);

  // Return a clean loader during auth check and redirection to prevent flickering
  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-left">
        <Loader2 className="h-10 w-10 animate-spin text-primary text-left" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-primary/30 overflow-x-hidden relative text-left">
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b text-left">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between text-left">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left">
            {logo && (
              <Avatar className="h-10 w-10 sm:h-11 sm:w-11 text-left">
                <AvatarImage src={logo.imageUrl} alt="Logo" className="text-left" />
                <AvatarFallback className="text-left">T</AvatarFallback>
              </Avatar>
            )}
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 text-left">
            <Button variant="ghost" asChild className="hidden sm:inline-flex font-bold text-left">
              <Link href="/login" className="text-left">Sign In</Link>
            </Button>
            <Button asChild className="rounded-full px-4 font-black tracking-widest uppercase text-[10px] sm:text-xs h-9 text-left">
              <Link href="/signup" className="text-left">Join Movement</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-16 text-left">
        <section className="relative h-[85vh] min-h-[500px] flex items-center overflow-hidden bg-zinc-950 text-left">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent text-left" />
          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full text-left">
            <div className="max-w-3xl space-y-8 text-center sm:text-left text-left">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-left">
                <Badge className="bg-primary text-primary-foreground mb-4 px-4 py-1 rounded-full font-black uppercase tracking-[0.2em] text-[10px] text-left">
                  GLORIFYING GOD
                </Badge>
                <h1 className="text-4xl sm:text-6xl md:text-8xl font-black font-headline text-white leading-[1.1] sm:leading-[0.9] tracking-tighter text-balance text-left">
                  Testify the <br className="hidden sm:block text-left" />
                  Greatness of GOD.<br className="hidden sm:block text-left" />
                  <span className="text-primary text-left">Join the Harvest.</span>
                </h1>
                <p className="mt-6 text-lg sm:text-xl text-white/80 font-medium max-w-xl italic leading-relaxed text-pretty text-left">
                  "And they overcame him by the blood of the Lamb, and by the word of their testimony..." — Revelation 12:11
                </p>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-4 text-left">
                <Button asChild size="lg" className="h-12 px-8 text-base font-black rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-widest text-left">
                  <Link href="/signup" className="text-left">Get Started Free <ArrowRight className="ml-2 h-5 w-5 text-left" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-bold rounded-2xl bg-white/5 backdrop-blur-md border-white/20 text-white hover:bg-white/10 text-left">
                  <Link href="/about" className="text-left">Our Mission</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-background text-left">
          <div className="max-w-7xl mx-auto px-6 text-left">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 text-left">
              <div className="space-y-8 text-left">
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-left">
                      <Globe className="h-5 w-5 text-primary text-left" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black font-headline uppercase text-left">Our Mission</h2>
                  </div>
                  <p className="text-muted-foreground text-lg leading-relaxed text-pretty text-left">
                    Testify is built for believers to share the greatness of Jesus Christ who gave his life as an offering to reconcile the world to GOD.
                  </p>
                </div>
              </div>
              <Card className="rounded-[2.5rem] border-l-8 border-l-primary bg-muted/20 border-none shadow-sm overflow-hidden text-left">
                   <CardContent className="p-10 text-left">
                      <p className="italic text-muted-foreground text-lg leading-relaxed text-justify text-left">
                        "I believe technology is a divine gift for this final harvest. Seeing the need for accountability in evangelism, I was led to create a space where every miracle is recorded for God's glory."
                      </p>
                      <p className="mt-6 text-sm font-black uppercase tracking-widest text-primary text-left">— Nanyo Theophilus</p>
                   </CardContent>
                </Card>
            </div>
          </div>
        </section>

        <section className="py-24 bg-muted/30 text-left">
          <div className="max-w-7xl mx-auto px-6 text-left">
            <div className="text-center mb-16 space-y-4 text-left">
              <h2 className="text-3xl sm:text-5xl font-black font-headline tracking-tight uppercase text-balance text-left">Kingdom Ready Workforce</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-left">
                Equipping believers with the tools needed to fulfill the Great Commission in a digital age.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
              {features.map((f, i) => (
                <Card key={i} className="rounded-[2rem] border-none shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 duration-300 text-left">
                  <CardHeader className="p-8 text-left">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", f.bgColor)}>
                      <f.icon className={cn("h-6 w-6", f.color)} />
                    </div>
                    <CardTitle className="text-xl font-black font-headline uppercase text-left">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-8 pb-8 text-left">
                    <p className="text-muted-foreground leading-relaxed text-sm text-left">{f.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-muted/50 border-t py-16 text-left">
        <div className="max-w-7xl mx-auto px-8 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 mb-12 text-left">
            <div className="col-span-1 sm:col-span-2 space-y-6 text-left">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left">
                {logo && (
                  <Avatar className="h-12 w-12 text-left">
                    <AvatarImage src={logo.imageUrl} alt="Logo" className="text-left" />
                    <AvatarFallback className="text-left">T</AvatarFallback>
                  </Avatar>
                )}
              </Link>
              <p className="text-muted-foreground text-sm max-w-sm italic text-left">
                Testify is built for believers to share the greatness of Jesus Christ.
              </p>
            </div>
            <div className="space-y-4 text-left">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary text-left">Platform</h4>
              <ul className="space-y-3 text-left">
                <li><Link href="/testimonies" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Glory Feed</Link></li>
                <li><Link href="/campaigns" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Mission Hub</Link></li>
              </ul>
            </div>
            <div className="space-y-4 text-left">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary text-left">Ministry</h4>
              <ul className="space-y-3 text-left">
                <li><Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Our Story</Link></li>
                <li><Link href="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="h-px w-full bg-muted opacity-50 mb-8 text-left" />
          <div className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-left">
            © {new Date().getFullYear()} TESTIFY GLOBAL. Built for the Great Commission.
          </div>
        </div>
      </footer>
    </div>
  );
}