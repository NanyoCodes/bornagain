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
  Heart,
  BookOpen,
  Quote,
  Loader2,
  ChevronRight
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
  const heroImage = PlaceHolderImages.find((img) => img.id === 'gospel-collage');

  // Redirect authenticated users
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard/testimonies');
    }
  }, [user, authLoading, router]);

  const testimoniesQuery = useMemo(() => (
    firestore ? query(collection(firestore, 'testimonies'), orderBy('createdAt', 'desc'), limit(3)) : null
  ), [firestore]);
  
  const { data: testimonies, loading: loadingTestimonies } = useCollection<Testimony>(testimoniesQuery);

  if (authLoading || (user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-primary/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {logo && (
              <Avatar className="h-9 w-9">
                <AvatarImage src={logo.imageUrl} alt="Testify Logo" />
                <AvatarFallback>T</AvatarFallback>
              </Avatar>
            )}
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild className="hidden sm:inline-flex font-bold">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="rounded-full px-6 font-black tracking-widest uppercase">
              <Link href="/signup">Join Movement</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-16">
        {/* Hero Section */}
        <section className="relative h-[85vh] min-h-[600px] flex items-center overflow-hidden">
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.8)), url(${heroImage?.imageUrl})`,
            }}
            data-ai-hint="bible scriptures"
          />
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-3xl space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Badge className="bg-primary text-primary-foreground mb-4 px-4 py-1 rounded-full font-black uppercase tracking-[0.2em] text-[10px]">
                  Glorifying God Through Technology
                </Badge>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-headline text-white leading-[0.9] tracking-tighter">
                  Share Your Story.<br />
                  <span className="text-primary">Join the Harvest.</span>
                </h1>
                <p className="mt-6 text-lg md:text-xl text-white/80 font-medium max-w-xl leading-relaxed italic">
                  "And they overcame him by the blood of the Lamb, and by the word of their testimony..." — Revelation 12:11
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button asChild size="lg" className="h-14 px-10 text-lg font-black rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-widest">
                  <Link href="/signup">
                    Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 px-10 text-lg font-bold rounded-2xl bg-white/5 backdrop-blur-md border-white/20 text-white hover:bg-white/10">
                  <Link href="/about">Our Mission</Link>
                </Button>
              </motion.div>
            </div>
          </div>

          <div className="absolute bottom-12 left-0 right-0 z-10 flex justify-center">
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-white/40 flex flex-col items-center gap-2"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Explore</span>
              <div className="h-px w-px bg-white/20" />
            </motion.div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-5xl font-black font-headline tracking-tight uppercase">Kingdom Ready Workforce</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Testify equips believers with the tools needed to fulfill the Great Commission in a digital age.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, i) => (
                <Card key={i} className="rounded-3xl border-none shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 duration-300">
                  <CardHeader>
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", feature.bgColor)}>
                      <feature.icon className={cn("h-6 w-6", feature.color)} />
                    </div>
                    <CardTitle className="text-xl font-black font-headline uppercase tracking-tight">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed font-medium text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Glory Feed Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-24 opacity-5 pointer-events-none">
            <Flame className="h-64 w-64 text-primary" />
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <Badge variant="outline" className="text-primary border-primary/20 font-black uppercase tracking-widest text-[10px] px-3 py-1">The Digital Altar</Badge>
                  <h2 className="text-4xl md:text-6xl font-black font-headline leading-none uppercase tracking-tighter">See God <br />In Action</h2>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                    Miracles aren't just for the Bible. Read real-time stories from believers around the world seeing the power of Jesus Christ today.
                  </p>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-4xl font-black font-headline text-primary">10k+</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Souls Won</p>
                  </div>
                  <div className="h-10 w-px bg-muted" />
                  <div className="text-center">
                    <p className="text-4xl font-black font-headline text-primary">500+</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Campaigns</p>
                  </div>
                  <div className="h-10 w-px bg-muted" />
                  <div className="text-center">
                    <p className="text-4xl font-black font-headline text-primary">150+</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nations</p>
                  </div>
                </div>

                <Button asChild size="lg" variant="outline" className="h-12 rounded-full font-bold border-primary/20 text-primary hover:bg-primary/5 px-8">
                  <Link href="/testimonies">View Glory Feed</Link>
                </Button>
              </div>

              <div className="space-y-4">
                {loadingTestimonies ? (
                  <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>
                ) : testimonies?.map((t, idx) => (
                  <motion.div 
                    key={t.id}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="rounded-3xl border-none shadow-lg bg-card/50 backdrop-blur-sm group hover:bg-primary/5 transition-colors">
                      <CardContent className="p-6 flex gap-4">
                        <Quote className="h-8 w-8 text-primary opacity-20 shrink-0" />
                        <div>
                          <p className="text-sm sm:text-base italic text-muted-foreground line-clamp-3 leading-relaxed mb-4">
                            "{t.content}"
                          </p>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">{t.authorFirstName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-black uppercase tracking-tight">{t.authorFirstName} {t.authorLastName?.charAt(0)}.</p>
                              <p className="text-[9px] font-bold text-primary uppercase tracking-widest">{t.category}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute inset-0 grid grid-cols-6 gap-4 rotate-12 -translate-y-1/2">
              {[...Array(24)].map((_, i) => (
                <Globe key={i} className="h-24 w-24" />
              ))}
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="max-w-3xl mx-auto space-y-8">
              <h2 className="text-4xl md:text-6xl font-black font-headline leading-tight uppercase tracking-tighter">
                The Harvest is Plentiful.<br />
                Ready to Labor?
              </h2>
              <p className="text-lg md:text-xl text-primary-foreground/80 font-medium leading-relaxed italic">
                Join thousands of believers who are using technology to fulfill the mission of Jesus Christ. 
                Record miracles, reach cities, and track the greatness of God.
              </p>
              <div className="flex justify-center pt-4">
                <Button asChild size="lg" className="h-16 px-12 text-xl font-black bg-white text-primary hover:bg-white/90 rounded-2xl shadow-2xl uppercase tracking-widest">
                  <Link href="/signup">
                    START TESTIFYING <ArrowRight className="ml-3 h-6 w-6" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2 space-y-6">
              <Link href="/" className="flex items-center gap-2">
                {logo && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={logo.imageUrl} alt="Logo" />
                    <AvatarFallback>T</AvatarFallback>
                  </Avatar>
                )}
              </Link>
              <p className="text-muted-foreground text-sm max-w-sm font-medium leading-relaxed italic">
                Testify is built for believers to share the greatness of Jesus Christ who gave his life as an offering to reconcile the world to GOD.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10 bg-background border-muted hover:border-primary/50 transition-colors">
                  <Globe className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10 bg-background border-muted hover:border-primary/50 transition-colors">
                  <Users className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10 bg-background border-muted hover:border-primary/50 transition-colors">
                  <Flame className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Platform</h4>
              <ul className="space-y-3">
                <li><Link href="/testimonies" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Glory Feed</Link></li>
                <li><Link href="/campaigns" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Mission Hub</Link></li>
                <li><Link href="/progress" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Harvest Progress</Link></li>
                <li><Link href="/fellowships" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Directory</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Ministry</h4>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Our Story</Link></li>
                <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Partner With Us</Link></li>
                <li><Link href="/guide" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">App Guide</Link></li>
                <li><Link href="/resources" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Resources</Link></li>
                <li><Link href="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Terms</Link></li>
                <li><Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <Separator className="bg-muted opacity-50" />
          
          <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            <p>© {new Date().getFullYear()} TESTIFY GLOBAL. Built for the Great Commission.</p>
            <div className="flex gap-6">
              <Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms</Link>
              <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const Separator = ({ className }: { className?: string }) => (
  <div className={cn("h-px w-full bg-border", className)} />
);
