'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  ShieldCheck,
  Zap,
  HeartHandshake,
  Gift,
  MapPin,
  Utensils,
  BookOpen,
  Gamepad2,
  Award,
  History,
  Scale,
  ChevronRight,
  ChevronDown,
  PlusCircle,
  TrendingUp,
  Heart,
  MessagesSquare,
  Crosshair,
  Sun,
  Activity,
  HandHeart,
  Search,
  CheckCircle2,
  Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Testimony } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { BibleGameCard } from '@/components/testimonies/bible-game-card';

const features = [
  {
    title: "TESTIMONIES",
    description: "Share real time miracles. Your testimony is a weapon that overcomes the enemy. No cap.",
    icon: Newspaper,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    link: "/testimonies",
  },
  {
    title: "Mission Ops",
    description: "Launch evangelism campaigns. Coordinate your squad in the field with real time tracking.",
    icon: Target,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    link: "/campaigns",
  },
  {
    title: "Victory Circles",
    description: "Find community driven solutions for spiritual breakthroughs. Overcome strongholds together.",
    icon: ShieldCheck,
    color: "text-indigo-600",
    bgColor: "bg-indigo-600/10",
    link: "/victory-hub",
  },
  {
    title: "Provision Hub",
    description: "Practical love. Support the brethren with physical meals through the Meals Center.",
    icon: Utensils,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    link: "/marketplace",
  },
  {
    title: "Kindness Center",
    description: "Gifts, Bibles, and spiritual tokens to nourish the souls in your harvest.",
    icon: Gift,
    color: "text-purple-600",
    bgColor: "bg-purple-600/10",
    link: "/marketplace/gifts",
  },
  {
    title: "Daily Flow",
    description: "Prayer, Word, and Church trackers. Consistency is the ultimate Kingdom flex.",
    icon: Zap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    link: "/growth",
  },
  {
    title: "The Alliance",
    description: "Partner with believers for high fidelity growth and shared spiritual history.",
    icon: HeartHandshake,
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    link: "/accountability",
  },
  {
    title: "Intercession",
    description: "Global agreement. Lift up prayer requests with the entire Kingdom Network.",
    icon: HandHeart,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    link: "/testimonies?tab=prayers",
  }
];

const historicalFacts = [
  {
    title: "Ebenezer Protocol",
    description: "Ancient believers established stones of help—physical testimonies to ensure miracles were never forgotten.",
    icon: History,
    ref: "1 Samuel 7:12"
  },
  {
    title: "Viral Gospel",
    description: "The 1st century church exploded because regular people shared their lived evidence of Christ.",
    icon: Globe,
    ref: "Acts 4:20"
  },
  {
    title: "The Gratitude Shift",
    description: "Living in gratitude is not just a vibe—it is a spiritual engine that unlocks Kingdom productivity.",
    icon: Zap,
    ref: "Psalm 100:4"
  }
];

const stats = [
    { label: "The Global Grid", value: "190+ Nations", desc: "One Body, Many Stations", icon: Globe },
    { label: "Miracle Velocity", value: "UNLIMITED", desc: "Daily Proclamations", icon: Flame },
    { label: "Unity Index", value: "Unlimited", desc: "Open to All Seekers", icon: HeartHandshake },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/testimonies');
    }
  }, [user, authLoading, router]);

  const testimoniesQuery = useMemo(() => (
    firestore ? query(collection(firestore, 'testimonies'), orderBy('createdAt', 'desc'), limit(3)) : null
  ), [firestore]);
  
  const { data: testimonies, loading: loadingTestimonies } = useCollection<Testimony>(testimoniesQuery);

  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-left">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-primary/30 overflow-x-hidden relative text-center">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left">
            {logo && (
              <Avatar className="h-10 w-10 sm:h-11 sm:w-11 border-2 border-primary/20">
                <AvatarImage src={logo.imageUrl} alt={logo.description} className="object-cover" />
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
        {/* Hero Section */}
        <section className="relative h-[85vh] min-h-[500px] flex items-center justify-center overflow-hidden bg-zinc-950">
          <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-zinc-950 to-zinc-950" />
             <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(249,116,22,0.4),transparent_50%)]" />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full text-center">
            <div className="max-w-4xl mx-auto space-y-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <Badge className="bg-primary text-primary-foreground mb-4 px-4 py-1.5 rounded-full font-black uppercase tracking-[0.2em] text-[10px] mx-auto">
                  PROCLAIMING GOD'S GOODNESS
                </Badge>
                <h1 className="text-4xl sm:text-6xl md:text-8xl font-black font-headline text-white leading-[0.9] tracking-tighter text-balance text-center">
                  Testify the GREATNESS OF GOD.<br className="hidden sm:block" />
                  <span className="text-primary"> Glorify the King!</span>
                </h1>
                <p className="mt-8 text-sm sm:text-lg text-white/60 font-medium max-w-xl mx-auto italic leading-relaxed text-pretty text-center">
                  "And they overcame him by the blood of the Lamb, and by the word of their testimony..." — Revelation 12:11
                </p>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="h-16 px-10 text-base font-black rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-widest bg-primary hover:bg-primary/90">
                  <Link href="/signup">GET STARTED <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-16 px-10 text-base font-bold rounded-2xl bg-white/5 backdrop-blur-md border-white/20 text-white hover:bg-white/10">
                  <Link href="/about">THE VISION</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="flex flex-col items-center gap-2 px-6"
            >
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-white/40 text-center text-balance max-w-lg">
                    "Go into all the world and preach the gospel to all creation."
                </p>
                <div className="h-px w-12 bg-primary/40" />
                <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">Mark 16:15</p>
            </motion.div>
          </div>
        </section>

        {/* Universal Sanctuary Section */}
        <section className="py-24 relative overflow-hidden bg-background">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,116,22,0.05),transparent_40%)]" />
            <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                <div className="flex flex-col items-center gap-12">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="space-y-6 max-w-4xl"
                    >
                        <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 px-4 py-1.5 rounded-full font-black uppercase tracking-[0.2em] text-[10px] mx-auto">
                            THE GLOBAL SANCTUARY
                        </Badge>
                        <h2 className="text-4xl sm:text-6xl font-black font-headline uppercase leading-[0.9] tracking-tighter text-balance text-center">
                            No Gatekeeping.<br/>
                            <span className="text-primary">Just God.</span>
                        </h2>
                        <p className="text-lg sm:text-xl text-muted-foreground font-medium leading-relaxed italic border-x-4 border-primary/20 px-8 text-center">
                            We are not here for the tradition we are here for the Transformation. Testify is the open access hub for every believer, from every corner of the planet. 
                        </p>
                        <p className="text-sm sm:text-base text-zinc-500 font-bold uppercase tracking-widest text-center">
                            One Body. One Spirit. Many Nations.
                        </p>
                    </motion.div>

                    <div className="max-w-2xl mx-auto space-y-8">
                        <div className="group relative p-8 rounded-[2.5rem] bg-muted/30 border-2 border-dashed border-primary/20 transition-all hover:bg-muted/40">
                            <h3 className="text-xl font-black uppercase tracking-tight flex items-center justify-center gap-3 mb-4 text-center">
                                <Sparkles className="h-6 w-6 text-primary" />
                                Vibe Check: Inclusive
                            </h3>
                            <p className="text-muted-foreground leading-relaxed font-medium text-pretty text-center">
                                Testify is a sanctuary for all believers regardless of denomination or tradition. We welcome non christians and seekers alike who want to see and know what God is doing in the world today. This is an invitation to witness the irrefutable evidence of the Living God.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                        {stats.map((stat, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className={cn(
                                    "p-8 rounded-[2.5rem] bg-card border shadow-xl flex flex-col items-center justify-center group hover:border-primary/40 transition-all h-[220px]",
                                    i === 0 && "lg:col-span-1"
                                )}
                            >
                                <div className="space-y-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <stat.icon className="h-6 w-6 text-primary" />
                                        <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">{stat.label}</h4>
                                    </div>
                                    <p className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-foreground">{stat.value}</p>
                                    <Badge variant="outline" className="border-primary/20 text-primary text-[8px] px-2 uppercase font-black">{stat.desc}</Badge>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>

        {/* Kingdom Arena Section */}
        <section className="py-24 bg-zinc-950 text-white relative overflow-hidden text-center">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                <Gamepad2 className="h-[40rem] w-[40rem] text-primary" />
            </div>
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center gap-12">
                    <div className="space-y-8 max-w-3xl">
                        <div className="space-y-4">
                            <Badge variant="outline" className="text-primary border-primary/20 font-black uppercase tracking-widest text-[10px] px-3 py-1 mx-auto">Kingdom Arena</Badge>
                            <h2 className="text-4xl sm:text-6xl font-black font-headline uppercase leading-tight tracking-tighter text-center">Exercise Your Spirit</h2>
                            <p className="text-zinc-400 text-lg leading-relaxed italic font-medium text-center">
                                Sharpen your knowledge of the Word through interactive challenges. Experience the Arena lobby below and join the global leaderboard.
                            </p>
                        </div>
                        <Button asChild size="lg" className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/30 bg-primary text-white hover:bg-primary/90 mx-auto">
                            <Link href="/signup">JOIN THE ARENA <ChevronRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </div>
                    <div className="w-full max-w-2xl mx-auto">
                         <BibleGameCard />
                    </div>
                </div>
            </div>
        </section>

        {/* Feature Grid */}
        <section className="py-24 bg-muted/30 text-center">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20 space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4 mx-auto"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Main Mission: Proclaim</span>
              </motion.div>
              <h2 className="text-4xl sm:text-6xl font-black font-headline tracking-tight uppercase text-balance text-center">The Laborer Toolkit</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty font-medium italic text-center">
                Advanced tech for the ancient mission. Organize the harvest with intentionality.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, i) => {
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className="rounded-[2.5rem] border-none shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col h-full overflow-hidden bg-card/50 backdrop-blur-sm group border-b-8 border-b-primary/5">
                                <CardHeader className="p-8 pb-4 items-center">
                                    <div className={cn("h-14 w-14 rounded-[1.25rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500", feature.bgColor)}>
                                        <feature.icon className={cn("h-7 w-7", feature.color)} />
                                    </div>
                                    <h3 className="text-xl font-black uppercase tracking-tight leading-tight mt-6 group-hover:text-primary transition-colors text-center">{feature.title}</h3>
                                </CardHeader>
                                <CardContent className="px-8 pb-8 flex-grow text-center">
                                    <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                                        {feature.description}
                                    </p>
                                </CardContent>
                                <CardFooter className="px-8 pb-8 pt-0 mt-auto justify-center">
                                    <Button variant="ghost" size="icon" asChild className="rounded-full text-primary hover:bg-primary/5 transition-all group/btn">
                                        <Link href={feature.link}>
                                            <ArrowRight className="h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
          </div>
        </section>

        {/* Legacy of Testimony Section */}
        <section className="py-24 bg-zinc-950 text-white relative overflow-hidden text-center">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-20 space-y-4">
                    <h2 className="text-4xl sm:text-6xl font-black font-headline uppercase tracking-tighter text-center">The Legacy of Proclamation</h2>
                    <p className="text-zinc-400 text-lg max-w-2xl mx-auto italic font-medium text-center">"And they overcame him by the blood of the Lamb and by the word of their testimony..."</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {historicalFacts.map((fact, i) => (
                        <div key={i} className="space-y-6 flex flex-col items-center">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
                                <fact.icon className="h-8 w-8 text-primary" />
                            </div>
                            <div className="space-y-3 text-center">
                                <h4 className="text-xl font-black uppercase tracking-tight">{fact.title}</h4>
                                <p className="text-sm text-zinc-400 leading-relaxed font-medium text-balance">{fact.description}</p>
                                <Badge variant="outline" className="mt-2 border-primary/20 text-primary uppercase font-bold tracking-widest text-[9px] mx-auto">{fact.ref}</Badge>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-24 p-8 sm:p-16 rounded-[3rem] bg-gradient-to-br from-primary/20 to-zinc-900 border border-white/5 shadow-2xl text-center space-y-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,116,22,0.1),transparent_70%)]" />
                    <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center mx-auto shadow-xl relative z-10">
                        <Scale className="h-8 w-8 text-white" />
                    </div>
                    <div className="space-y-4 relative z-10">
                        <h3 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-center">Main Character Energy: Gratitude</h3>
                        <p className="text-zinc-400 max-w-2xl mx-auto text-sm sm:text-lg leading-relaxed font-medium italic text-pretty text-center">
                            When we live in gratitude to God, we are naturally empowered to live out our best virtues. Gratitude is not just a feeling it is the engine of Kingdom productivity and relational integrity.
                        </p>
                    </div>
                    <Button asChild size="lg" className="rounded-full h-14 px-12 font-black uppercase tracking-widest text-xs relative z-10 shadow-xl bg-white text-primary hover:bg-zinc-100 mx-auto">
                        <Link href="/signup">JOIN THE HARVEST</Link>
                    </Button>
                </div>
            </div>
        </section>

        {/* Glory Feed Section */}
        <section className="py-24 relative overflow-hidden bg-background text-center">
          <div className="absolute top-0 right-0 p-24 opacity-[0.03] pointer-events-none text-primary" />
          
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-10 text-center lg:text-left">
                <div className="space-y-6">
                  <Badge variant="outline" className="text-primary border-primary/20 font-black uppercase tracking-widest text-[10px] px-3 py-1 mx-auto lg:mx-0">The Digital Altar</Badge>
                  <h2 className="text-4xl sm:text-6xl font-black font-headline leading-tight uppercase tracking-tighter text-balance text-center lg:text-left">See God In Action</h2>
                  <p className="text-muted-foreground text-lg sm:text-xl leading-relaxed max-w-md mx-auto lg:mx-0 italic font-medium text-center lg:text-left">
                    Miracles are not just for history. Witness God moving through the global community right now.
                  </p>
                </div>
                
                <Button asChild size="lg" variant="outline" className="h-14 rounded-full font-bold border-primary/20 text-primary hover:bg-primary/5 px-10 w-full sm:w-auto uppercase tracking-widest mx-auto lg:mx-0">
                  <Link href="/testimonies">VIEW FEED</Link>
                </Button>
              </div>

              <div className="space-y-6">
                {loadingTestimonies ? (
                  <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>
                ) : testimonies?.map((t, idx) => (
                  <motion.div 
                    key={t.id}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="rounded-[2.5rem] border-none shadow-lg bg-card/50 backdrop-blur-sm group hover:bg-primary/5 transition-colors overflow-hidden">
                      <CardContent className="p-8 flex gap-6 text-left">
                        <Quote className="h-10 w-10 text-primary opacity-20 shrink-0 mt-1" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm sm:text-lg italic text-muted-foreground line-clamp-3 leading-relaxed mb-6 font-medium">
                            "{t.content}"
                          </p>
                          <div className="flex items-center gap-4">
                            <Avatar className="h-11 w-11 border-2 border-background shadow-md shrink-0">
                              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary font-black uppercase text-center flex items-center justify-center h-full w-full">{t.authorFirstName?.charAt(0)}{t.authorLastName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 text-left">
                              <p className="text-[11px] font-black uppercase tracking-tight truncate">{t.authorFirstName} {t.authorLastName?.charAt(0)}.</p>
                              <p className="text-[9px] font-bold text-primary uppercase tracking-widest truncate">{t.category}</p>
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
        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden text-center">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute inset-0 grid grid-cols-6 gap-8 rotate-12 -translate-y-1/4">
              {[...Array(24)].map((_, i) => (
                <Globe key={i} className="h-24 w-24" />
              ))}
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
            <div className="max-w-3xl mx-auto space-y-10">
              <h2 className="text-4xl sm:text-6xl font-black font-headline leading-[0.9] uppercase tracking-tighter text-balance text-center">
                The Harvest is Plentiful. Ready to Labor?
              </h2>
              <p className="text-lg sm:text-2xl text-primary-foreground/90 font-medium leading-relaxed italic text-pretty text-center">
                Join thousands of believers who are using technology to fulfill the mission of Jesus Christ. 
                Record miracles, reach cities, and track the greatness of God.
              </p>
              <div className="flex justify-center pt-4">
                <Button asChild size="lg" className="h-16 px-14 text-base font-black bg-white text-primary hover:bg-white/90 rounded-2xl shadow-2xl uppercase tracking-widest w-full sm:w-auto mx-auto">
                  <Link href="/signup">START TESTIFYING <ArrowRight className="ml-3 h-6 w-6" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 border-t py-20 text-center sm:text-left">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-16 mb-16">
            <div className="col-span-1 sm:col-span-2 space-y-8 text-center sm:text-left">
              <Link href="/" className="flex items-center justify-center sm:justify-start gap-2 hover:opacity-80 transition-opacity">
                {logo && (
                  <Avatar className="h-14 w-14 border-2 border-primary/20">
                    <AvatarImage src={logo.imageUrl} alt="Logo" className="object-cover" />
                    <AvatarFallback>T</AvatarFallback>
                  </Avatar>
                )}
              </Link>
              <p className="text-muted-foreground text-sm font-medium leading-relaxed italic text-pretty max-w-sm mx-auto sm:mx-0 text-center sm:text-left">
                Testify is the open access hub for believers to share the greatness of Jesus Christ, who gave his life to reconcile the world to God.
              </p>
            </div>

            <div className="space-y-6 text-center sm:text-left">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Platform</h4>
              <ul className="space-y-4">
                <li><Link href="/testimonies" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold">Testimonies</Link></li>
                <li><Link href="/campaigns" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold">Mission Hub</Link></li>
                <li><Link href="/growth" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold">Harvest Progress</Link></li>
                <li><Link href="/fellowships" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold">Directory</Link></li>
              </ul>
            </div>

            <div className="space-y-6 text-center sm:text-left">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Ministry</h4>
              <ul className="space-y-4">
                <li><Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold">Our Story</Link></li>
                <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold">Partner With Us</Link></li>
                <li><Link href="/guide" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold">App Guide</Link></li>
                <li><Link href="/resources" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold">Resources</Link></li>
                <li><Link href="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold">Terms</Link></li>
                <li><Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="h-px w-full bg-muted opacity-50 mb-10" />
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-center">
            <p className="text-center md:text-left uppercase">© {new Date().getFullYear()} TESTIFY GLOBAL. Built for the Great Commission.</p>
            <div className="flex gap-8 justify-center sm:justify-end">
              <Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms</Link>
              <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}