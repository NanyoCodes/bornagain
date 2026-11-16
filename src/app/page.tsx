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
  Trophy,
  Droplets,
  Map,
  Check,
  BookMarked
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
import { BibleGameCard } from '@/components/testimonies/bible-game-card';

const features = [
  {
    title: "NEW CREATION TESTIMONIES",
    description: "Share the miracles that confirm your new life. Your testimony is the evidence of being BornAgain, encouraging others to seek the light.",
    icon: Newspaper,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    link: "/testimonies",
  },
  {
    title: "Kingdom Missions",
    description: "Launch campaigns to bring others into the family. Coordinate your workforce to ensure every soul is nurtured into a deep relationship with Christ.",
    icon: Target,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    link: "/campaigns",
  },
  {
    title: "Strategic Territories",
    description: "Identify regional hurdles to the Gospel. Connect with the global Body to provide Kingdom solutions for specific lands and cities.",
    icon: Map,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    link: "/territories",
  },
  {
    title: "Victory Circles",
    description: "A sanctuary for transparency. Find community-driven solutions for the struggles that keep believers from walking in their full power.",
    icon: ShieldCheck,
    color: "text-indigo-600",
    bgColor: "bg-indigo-600/10",
    link: "/victory-hub",
  },
  {
    title: "Provision Hub",
    description: "Practical love for the brethren. Coordinate physical support and meals through verified Kingdom vendors for those in the new birth journey.",
    icon: Utensils,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    link: "/marketplace",
  },
  {
    title: "Kindness Center",
    description: "Tokens of love. Send Bibles, spiritual care packages, and gifts to nurture the souls you have lead to being BornAgain.",
    icon: Gift,
    color: "text-purple-600",
    bgColor: "bg-purple-600/10",
    link: "/marketplace/gifts",
  },
  {
    title: "The Daily Altar",
    description: "Walk in the Spirit daily. Track your Prayer and Word study habits to stay equipped for the Great Commission.",
    icon: Zap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    link: "/growth",
  },
  {
    title: "Identity Alliance",
    description: "Partner with other BornAgain believers for high-fidelity growth and mutual accountability in the Kingdom.",
    icon: HeartHandshake,
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    link: "/accountability",
  }
];

const historicalFacts = [
  {
    title: "The New Birth",
    description: "Jesus answered, 'Truly, truly, I say to you, unless one is born of water and the Spirit, he cannot enter the kingdom of God.'",
    icon: Award,
    ref: "John 3:5"
  },
  {
    title: "A New Creation",
    description: "Therefore, if anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come.",
    icon: History,
    ref: "2 Corinthians 5:17"
  },
  {
    title: "The Care Mandate",
    description: "The 1st-century church exploded because they cared for one another as brothers and sisters in the new birth.",
    icon: Globe,
    ref: "Acts 2:44-45"
  }
];

const stats = [
    { label: "Global Presence", value: "190+ Nations", desc: "One Body, One Spirit", icon: Globe },
    { label: "New Life Velocity", value: "UNLIMITED", desc: "Redeemed Daily", icon: Flame },
    { label: "Love Index", value: "Infinite", desc: "The Bond of Perfection", icon: HeartHandshake },
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-primary/30 overflow-x-hidden relative text-left">
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left">
            {logo && (
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse" />
                <Avatar className="h-10 w-10 sm:h-11 sm:w-11 border-2 border-primary/20 shadow-sm transition-transform hover:scale-105 active:scale-95 text-left relative z-10">
                  <AvatarImage src={logo.imageUrl} alt="BornAgain Global Logo" className="object-cover text-left" />
                  <AvatarFallback className="text-left font-black">B</AvatarFallback>
                </Avatar>
              </div>
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
        <section className="relative h-[85vh] min-h-[500px] flex items-center justify-center overflow-hidden bg-zinc-950">
          <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-zinc-950 to-zinc-950" />
             <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(249,116,22,0.4),transparent_50%)]" />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full text-center text-left">
            <div className="max-w-4xl mx-auto space-y-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <div className="flex justify-center mb-4">
                  <Badge className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-primary/20 border-none">
                    ENTER THE NEW LIFE
                  </Badge>
                </div>
                <h1 className="text-4xl sm:text-6xl md:text-8xl font-black font-headline text-white leading-[1.1] tracking-tighter text-balance text-center">
                  Are you Born Again?
                </h1>
                <h2 className="text-primary text-sm sm:text-lg md:text-xl block mt-6 uppercase tracking-wider font-black px-4 text-center">
                   The global Christian community and evangelism platform. Experience the joy of being BornAgain and reconciling the world to God.
                </h2>
                <p className="mt-8 text-sm sm:text-lg text-white/60 font-medium max-xl mx-auto italic leading-relaxed text-pretty text-center">
                  "Truly, truly, I say to you, unless one is born again he cannot see the kingdom of God." — John 3:3
                </p>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button asChild size="sm" className="h-10 px-8 text-[11px] font-black rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-widest bg-primary hover:bg-primary/90 flex items-center justify-center text-center">
                  <Link href="/signup">I AM READY <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-10 px-8 text-[11px] font-bold rounded-2xl bg-white/5 backdrop-blur-md border-white/20 text-white hover:bg-white/10 flex items-center justify-center text-center">
                  <Link href="/about">OUR MISSION</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-background text-left">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8 text-left">
                <Badge variant="outline" className="text-primary border-primary/20 font-black uppercase tracking-widest text-[10px] px-3 py-1">Spiritual Foundation</Badge>
                <h2 className="text-4xl sm:text-5xl font-black font-headline uppercase leading-tight tracking-tighter text-left">What does it mean to be <span className="text-primary">BornAgain</span>?</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed font-medium text-left">
                  <p>
                    Being "BornAgain" is more than a religious label; it is a profound spiritual transformation. It is the moment when a person experiences a spiritual rebirth through faith in Jesus Christ, as described in the Gospel of John.
                  </p>
                  <p>
                    This new birth marks the beginning of a life as a "New Creation." At BornAgain Global, we provide the platform for you to walk out this identity, connect with fellow believers, and fulfill the Great Commission through coordinated evangelism and heartfelt testimony.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 text-left">
                  <div className="space-y-2 text-left">
                    <h3 className="font-black text-foreground uppercase tracking-tight flex items-center gap-2 text-left">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Spiritual Rebirth
                    </h3>
                    <p className="text-xs text-left">The awakening of the spirit to a relationship with the Father.</p>
                  </div>
                  <div className="space-y-2 text-left">
                    <h3 className="font-black text-foreground uppercase tracking-tight flex items-center gap-2 text-left">
                      <Target className="h-4 w-4 text-primary" />
                      Kingdom Purpose
                    </h3>
                    <p className="text-xs text-left">Activating your assignment in the harvest field of souls.</p>
                  </div>
                </div>
              </div>
              <div className="relative text-left">
                <div className="absolute -inset-4 bg-primary/20 rounded-[3rem] blur-3xl opacity-20 animate-pulse text-left" />
                <Card className="rounded-[3rem] border-none shadow-2xl overflow-hidden bg-card/50 backdrop-blur-xl relative z-10 border-t-8 border-t-primary/20 text-left">
                  <CardContent className="p-8 sm:p-12 space-y-6 text-left">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-left">
                      <BookMarked className="h-8 w-8 text-primary text-left" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-left">The Scriptural Anchor</h3>
                    <blockquote className="border-l-4 border-primary/40 pl-6 py-2 italic text-lg text-muted-foreground leading-relaxed text-left">
                      "Therefore, if anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come."
                    </blockquote>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary text-left">— 2 Corinthians 5:17</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 relative overflow-hidden bg-muted/30 text-left">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,116,22,0.05),transparent_40%)]" />
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center gap-12 text-left">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="space-y-8 max-w-4xl text-center text-left"
                    >
                        <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 px-4 py-1.5 rounded-full font-black uppercase tracking-[0.2em] text-[10px] mx-auto">
                            THE COMPASSIONATE NETWORK
                        </Badge>
                        <h3 className="text-4xl sm:text-6xl font-black font-headline uppercase leading-[0.9] tracking-tighter text-balance text-center text-left">
                            Nurture the Harvest.<br/>
                            <span className="text-primary">With Love.</span>
                        </h3>
                        <div className="space-y-6 text-center text-left">
                            <p className="text-lg sm:text-2xl text-muted-foreground font-medium leading-relaxed italic border-x-4 border-primary/20 px-8 text-center text-balance text-left">
                                BornAgain Global helps you look after those you lead to Christ. We provide the heartbeat of care for your family, your friends, and the global harvest.
                            </p>
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full text-left">
                        {stats.map((stat, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className={cn(
                                    "p-8 rounded-[2.5rem] bg-card border shadow-xl flex flex-col items-center justify-center group hover:border-primary/40 transition-all h-[220px]"
                                )}
                            >
                                <div className="space-y-4 text-center text-left">
                                    <div className="flex items-center justify-center gap-2 text-left">
                                        <stat.icon className="h-6 w-6 text-primary text-left" />
                                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] text-left"> {stat.label}</p>
                                    </div>
                                    <p className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-foreground text-left"> {stat.value}</p>
                                    <Badge variant="outline" className="border-primary/20 text-primary text-[8px] px-2 uppercase font-black text-left"> {stat.desc}</Badge>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>

        <section className="py-24 bg-zinc-950 text-white relative overflow-hidden text-left">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center text-left">
                <Gamepad2 className="h-[40rem] w-[40rem] text-primary text-left" />
            </div>
            <div className="max-w-7xl mx-auto px-6 relative z-10 text-left">
                <div className="flex flex-col items-center gap-12 text-left">
                    <div className="space-y-8 max-w-3xl mx-auto text-center text-left">
                        <div className="space-y-4 text-left">
                            <Badge variant="outline" className="text-primary border-primary/20 font-black uppercase tracking-widest text-[10px] px-3 py-1 mx-auto block w-fit text-left">Kingdom Arena</Badge>
                            <h3 className="text-4xl sm:text-6xl font-black font-headline uppercase leading-tight tracking-tighter text-center text-balance text-left">Empower Your Loved Ones</h3>
                            <p className="text-zinc-400 text-lg leading-relaxed italic font-medium text-center text-balance text-left">
                                Use the Word Arena to challenge and sharpen those you care about. Bible study becomes a collaborative act of love for every BornAgain believer.
                            </p>
                        </div>
                        <Button asChild size="lg" className="h-12 px-10 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/30 bg-primary text-white hover:bg-primary/90 flex items-center justify-center text-center mx-auto text-left">
                            <Link href="/signup" className="text-center text-left">START THE CHALLENGE <ChevronRight className="ml-2 h-4 w-4 text-left" /></Link>
                        </Button>
                    </div>
                    <div className="w-full max-w-2xl mx-auto text-left">
                         <BibleGameCard />
                    </div>
                </div>
            </div>
        </section>

        <section className="py-24 bg-background text-left">
          <div className="max-w-7xl mx-auto px-6 text-left">
            <div className="text-center mb-20 space-y-4 text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4 mx-auto text-left"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary text-left">Redeemed Workforce</span>
              </motion.div>
              <h3 className="text-4xl sm:text-6xl font-black font-headline tracking-tight uppercase text-balance text-center text-left">The Caretaker Toolkit</h3>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty font-medium italic text-center text-left">
                Equipping the redeemed to follow up and look after the harvest with intentional love.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
                {features.map((feature, i) => {
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className="rounded-[2.5rem] border-none shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col h-full overflow-hidden bg-card/50 backdrop-blur-sm group border-b-8 border-b-primary/5 text-left">
                                <CardHeader className="p-8 pb-4 flex flex-col items-center text-center text-left">
                                    <div className={cn("h-14 w-14 rounded-[1.25rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 text-left", feature.bgColor)}>
                                        <feature.icon className={cn("h-7 w-7", feature.color)} />
                                    </div>
                                    <h4 className="text-xl font-black uppercase tracking-tight leading-tight mt-6 group-hover:text-primary transition-colors text-center text-left">{feature.title}</h4>
                                </CardHeader>
                                <CardContent className="p-8 pb-8 flex-grow text-center text-left">
                                    <p className="text-muted-foreground text-sm leading-relaxed font-medium text-left">
                                        {feature.description}
                                    </p>
                                </CardContent>
                                <CardFooter className="px-8 pb-8 pt-0 mt-auto justify-center text-center text-left">
                                    <Button variant="ghost" size="icon" asChild className="rounded-full text-primary hover:bg-primary/5 transition-all group/btn flex items-center justify-center text-center text-left">
                                        <Link href={feature.link} className="text-left">
                                            <ArrowRight className="h-5 w-5 transition-transform group-hover/btn:translate-x-1 text-left" />
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

        <section className="py-24 bg-zinc-950 text-white relative overflow-hidden text-left">
            <div className="max-w-7xl mx-auto px-6 text-left">
                <div className="text-center mb-20 space-y-4 text-left">
                    <h3 className="text-4xl sm:text-6xl font-black font-headline uppercase tracking-tighter text-center text-left">Legacy of Compassion</h3>
                    <p className="text-zinc-400 text-lg max-w-2xl mx-auto italic font-medium text-center text-left">"Carry each other’s burdens, and in this way you will fulfill the law of Christ."</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center text-left">
                    {historicalFacts.map((fact, i) => (
                        <div key={i} className="space-y-6 flex flex-col items-center text-center text-left">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl text-left">
                                <fact.icon className="h-8 w-8 text-primary text-left" />
                            </div>
                            <div className="space-y-3 text-center text-left text-left">
                                <h4 className="text-xl font-black uppercase tracking-tight text-center text-left">{fact.title}</h4>
                                <p className="text-sm text-zinc-400 leading-relaxed font-medium text-balance text-center text-left">{fact.description}</p>
                                <Badge variant="outline" className="mt-2 border-primary/20 text-primary uppercase font-bold tracking-widest text-[9px] mx-auto flex items-center justify-center w-fit text-left"> {fact.ref}</Badge>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-24 p-8 sm:p-16 rounded-[3rem] bg-gradient-to-br from-primary/20 to-zinc-900 border border-white/5 shadow-2xl text-center space-y-8 relative overflow-hidden text-left">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,116,22,0.1),transparent_70%)] text-left" />
                    <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center mx-auto shadow-xl relative z-10 text-center text-left">
                        <Heart className="h-8 w-8 text-white text-left" />
                    </div>
                    <div className="space-y-4 relative z-10 text-center text-left">
                        <h3 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-center text-left">Caring for the One</h3>
                        <p className="text-zinc-400 max-w-2xl mx-auto text-sm sm:text-lg leading-relaxed font-medium italic text-pretty text-center text-left">
                            True spiritual success is measured by the depth of your care for those who are BornAgain. BornAgain makes it easy to stay present in the lives of your family and friends.
                        </p>
                    </div>
                    <div className="flex justify-center relative z-10 items-center text-left text-left">
                        <Button asChild size="lg" className="rounded-full h-11 px-12 font-black uppercase tracking-widest text-[10px] shadow-xl bg-white text-primary hover:bg-zinc-100 transition-all flex items-center justify-center text-center text-left">
                            <Link href="/signup" className="text-center text-left">JOIN THE MISSION OF LOVE</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>

        <section className="py-24 bg-primary/5 border-y border-primary/10 relative overflow-hidden text-left">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center text-left">
                <ShieldCheck className="h-[40rem] w-[40rem] text-primary text-left" />
            </div>
            <div className="max-w-7xl mx-auto px-6 relative z-10 text-left">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center text-left">
                    <div className="order-2 lg:order-1 text-left">
                        <div className="relative group text-left">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-600 rounded-[3rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 text-left"></div>
                            <Card className="relative rounded-[3rem] border-none shadow-2xl bg-card overflow-hidden text-left">
                                <CardContent className="p-8 sm:p-12 space-y-6 text-left">
                                    <div className="flex items-center gap-4 mb-6 text-left">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-left">
                                            <Zap className="h-6 w-6 text-primary text-left" />
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-left">Pure Spiritual Deposit</h3>
                                    </div>
                                    <p className="text-muted-foreground leading-relaxed font-medium text-lg italic text-balance text-left">
                                        "The media space is often a source of noise and comparison. BornAgain deposits more of God into your spirit and leaves less room for the confusion of the world."
                                    </p>
                                    <div className="flex items-center gap-3 pt-4 text-left">
                                        <CheckCircle2 className="h-5 w-5 text-primary text-left" />
                                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-left">Digital Sanctuary</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                    <div className="space-y-8 order-1 lg:order-2 text-left">
                        <Badge variant="outline" className="text-primary border-primary/20 font-black uppercase tracking-widest text-[10px] px-3 py-1 text-left">Kingdom Focus</Badge>
                        <h2 className="text-4xl sm:text-5xl font-black font-headline uppercase leading-tight tracking-tighter text-left">Less Confusion.<br/><span className="text-primary">More of God.</span></h2>
                        <p className="text-muted-foreground text-lg leading-relaxed font-medium text-left">
                            Starve the spirit of confusion that plagues the modern media space. BornAgain provides a direct conduit to raw testimonies of God's power and coordinated Kingdom effort.
                        </p>
                        <ul className="space-y-4 text-left">
                            {[
                                "Starve the distraction, feed your purpose.",
                                "Victory reports that build your faith.",
                                "Coordinated missions over endless scrolling.",
                                "A sanctuary for the global redeemed."
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3 group text-left">
                                    <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 group-hover:bg-primary transition-colors text-left text-left">
                                        <Check className="h-3 w-3 text-primary group-hover:text-white text-left" />
                                    </div>
                                    <span className="text-sm sm:text-base font-bold text-muted-foreground group-hover:text-foreground transition-colors text-left">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <section className="py-24 relative overflow-hidden bg-background text-left">
          <div className="absolute top-0 right-0 p-24 opacity-[0.03] pointer-events-none text-primary text-left text-left" />
          
          <div className="max-w-7xl mx-auto px-6 text-left text-left">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center text-left text-left">
              <div className="space-y-10 text-center lg:text-left text-left text-left text-left">
                <div className="space-y-6 text-center lg:text-left text-left text-left">
                  <Badge variant="outline" className="text-primary border-primary/20 font-black uppercase tracking-widest text-[10px] px-3 py-1 mx-auto lg:mx-0 flex items-center justify-center w-fit text-left text-left">The Compassionate Altar</Badge>
                  <h3 className="text-4xl sm:text-6xl font-black font-headline leading-tight uppercase tracking-tighter text-balance text-center lg:text-left text-left text-left">Witness the Glory</h3>
                  <p className="text-muted-foreground text-lg sm:text-xl leading-relaxed max-md mx-auto lg:mx-0 italic font-medium text-center lg:text-left text-left text-left">
                    Read how believers are following up on their harvest and sharing miracles of being BornAgain.
                  </p>
                </div>
                
                <div className="flex justify-center lg:justify-start text-left text-left">
                    <Button asChild size="sm" variant="outline" className="h-9 rounded-full font-bold border-primary/20 text-primary hover:bg-primary/5 px-8 w-full sm:w-auto uppercase tracking-widest flex items-center justify-center text-center text-left text-left">
                        <Link href="/testimonies" className="text-center text-left text-left">VIEW FEED</Link>
                    </Button>
                </div>
              </div>

              <div className="space-y-6 text-left text-left text-left text-left">
                {loadingTestimonies ? (
                  <div className="flex justify-center text-left text-left text-left text-left"><Loader2 className="h-8 w-8 animate-spin opacity-20 text-left text-left text-left" /></div>
                ) : testimonies?.map((t, idx) => (
                  <motion.div 
                    key={t.id}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="rounded-[2.5rem] border-none shadow-lg bg-card/50 backdrop-blur-sm group hover:bg-primary/5 transition-colors overflow-hidden text-left text-left text-left">
                      <CardContent className="p-8 flex gap-6 text-left text-left text-left text-left">
                        <Quote className="h-10 w-10 text-primary opacity-20 shrink-0 mt-1 text-left text-left" />
                        <div className="min-w-0 flex-1 text-left text-left text-left">
                          <p className="text-sm sm:text-lg italic text-muted-foreground line-clamp-3 leading-relaxed mb-6 font-medium text-left text-left text-left">
                            "{t.content}"
                          </p>
                          <div className="flex items-center gap-4 text-left text-left text-left">
                            <Avatar className="h-11 w-11 border-2 border-background shadow-md shrink-0 text-left text-left">
                                <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary font-black uppercase text-left text-left text-left"> {t.authorFirstName?.charAt(0)}{t.authorLastName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 text-left text-left text-left">
                              <p className="text-[11px] font-black uppercase tracking-tight truncate text-left text-left text-left">{t.authorFirstName} {t.authorLastName?.charAt(0)}.</p>
                              <p className="text-[9px] font-bold text-primary uppercase tracking-widest truncate text-left text-left text-left">{t.category}</p>
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

        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden text-left">
          <div className="absolute inset-0 opacity-10 pointer-events-none text-left text-left">
            <div className="absolute inset-0 grid grid-cols-6 gap-8 rotate-12 -translate-y-1/4 text-left text-left text-left">
              {[...Array(24)].map((_, i) => (
                <Globe key={i} className="h-24 w-24 text-left text-left" />
              ))}
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 text-center relative z-10 text-left text-left text-left">
            <div className="max-w-3xl mx-auto space-y-10 text-center text-left text-left">
              <h2 className="text-4xl sm:text-6xl font-black font-headline leading-[0.9] uppercase tracking-tighter text-balance text-center text-left text-left">
                Are you ready to join the global workforce?
              </h2>
              <p className="text-lg sm:text-2xl text-primary-foreground/90 font-medium leading-relaxed italic text-pretty text-center text-left text-left text-left">
                Join the app dedicated to those who are BornAgain. Manage your spiritual influence and record the greatness of God together.
              </p>
              <div className="flex justify-center pt-4 items-center text-left text-left">
                <Button asChild size="sm" className="h-10 px-8 text-[10px] font-black bg-white text-primary hover:bg-white/90 rounded-2xl shadow-2xl uppercase tracking-widest w-full sm:w-auto mx-auto flex items-center justify-center text-center text-left text-left">
                  <Link href="/signup" className="text-center text-left text-left">START CARING TODAY <ArrowRight className="ml-3 h-6 w-6 text-left text-left" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-muted/50 border-t py-20 text-left">
        <div className="max-w-7xl mx-auto px-8 text-left text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-16 mb-16 text-left text-left">
            <div className="col-span-1 sm:col-span-2 space-y-8 text-left text-left">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left text-left">
                {logo && (
                  <Avatar className="h-14 w-14 border-2 border-primary/20 text-left text-left text-left">
                    <AvatarImage src={logo.imageUrl} alt={logo.description} className="object-cover text-left text-left" />
                    <AvatarFallback className="text-left text-left font-black">B</AvatarFallback>
                  </Avatar>
                )}
              </Link>
              <p className="text-muted-foreground text-sm font-medium leading-relaxed italic text-pretty max-sm text-left text-left text-left">
                BornAgain Global is the heart center for the redeemed to care for family, friends, and the global harvest while sharing the greatness of Jesus Christ.
              </p>
            </div>

            <div className="space-y-6 text-left text-left text-left">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary text-left text-left">Platform</h4>
              <ul className="space-y-4 text-left text-left">
                <li><Link href="/testimonies" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Miracle Feed</Link></li>
                <li><Link href="/campaigns" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Mission Hub</Link></li>
                <li><Link href="/growth" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Love Growth</Link></li>
                <li><Link href="/fellowships" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Community Hubs</Link></li>
              </ul>
            </div>

            <div className="space-y-6 text-left text-left text-left">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary text-left text-left">Ministry</h4>
              <ul className="space-y-4 text-left text-left">
                <li><Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Our Vision</Link></li>
                <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Partner with us</Link></li>
                <li><Link href="/guide" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Care Guide</Link></li>
                <li><Link href="/resources" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Growth Assets</Link></li>
                <li><Link href="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Terms</Link></li>
                <li><Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="h-px w-full bg-muted opacity-50 mb-10 text-left text-left" />
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-left text-left">
            <p className="text-center md:text-left uppercase text-left">© {new Date().getFullYear()} BORN AGAIN GLOBAL. Built for the Harvest.</p>
            <div className="flex gap-8 text-left">
              <Link href="/terms-of-service" className="hover:text-primary transition-colors text-left text-left">Terms</Link>
              <Link href="/privacy-policy" className="hover:text-primary transition-colors text-left text-left">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
