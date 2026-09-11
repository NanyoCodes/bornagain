'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

  const testimoniesQuery = useMemo(() => (
    firestore ? query(collection(firestore, 'testimonies'), orderBy('createdAt', 'desc'), limit(3)) : null
  ), [firestore]);
  
  const { data: testimonies, loading: loadingTestimonies } = useCollection<Testimony>(testimoniesQuery);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const isLoggedIn = !!user;

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-primary/30 overflow-x-hidden relative">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between text-left">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {logo && (
              <Avatar className="h-10 w-10 sm:h-11 sm:w-11">
                <AvatarImage src={logo.imageUrl} alt="Testify Logo" />
                <AvatarFallback>T</AvatarFallback>
              </Avatar>
            )}
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            {!isLoggedIn ? (
                <>
                    <Button variant="ghost" asChild className="hidden sm:inline-flex font-bold">
                        <Link href="/login">Sign In</Link>
                    </Button>
                    <Button asChild className="rounded-full px-3 sm:px-4 font-black tracking-widest uppercase text-[10px] sm:text-xs h-8 sm:h-9">
                        <Link href="/signup">Join Movement</Link>
                    </Button>
                </>
            ) : null}
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-16">
        {/* Hero Section */}
        <section className="relative h-[85vh] min-h-[500px] sm:min-h-[600px] flex items-center overflow-hidden bg-zinc-950">
          <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-3xl space-y-6 sm:space-y-8 text-center sm:text-left text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Badge className="bg-primary text-primary-foreground mb-4 px-3 sm:px-4 py-1 rounded-full font-black uppercase tracking-[0.2em] text-[9px] sm:text-[10px] whitespace-nowrap">
                  GLORIFYING GOD
                </Badge>
                <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-headline text-white leading-[1.1] sm:leading-[0.9] tracking-tighter text-balance text-left">
                  Testify the <br className="hidden sm:block" />
                  Greatness of GOD.<br className="hidden sm:block" />
                  <span className="text-primary">Join the Harvest.</span>
                </h1>
                <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-white/80 font-medium max-w-xl leading-relaxed italic text-pretty text-left">
                  "And they overcame him by the blood of the Lamb, and by the word of their testimony..." — Revelation 12:11
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4"
              >
                <Button asChild size="lg" className="h-10 px-6 text-sm sm:text-base font-black rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-widest w-full sm:w-auto text-left">
                  <Link href="/signup" className="text-left">
                    Get Started Free <ArrowRight className="ml-2 h-5 w-5 text-left" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-10 px-6 text-sm sm:text-base font-bold rounded-2xl bg-white/5 backdrop-blur-md border-white/20 text-white hover:bg-white/10 w-full sm:w-auto text-left">
                  <Link href="/about" className="text-left">Our Mission</Link>
                </Button>
              </motion.div>
            </div>
          </div>

          <div className="absolute bottom-8 sm:bottom-12 left-0 right-0 z-10 flex justify-center text-left">
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-white/40 flex flex-col items-center gap-2 text-left"
            >
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-center">Explore</span>
              <div className="h-px w-px bg-white/20 text-left" />
            </motion.div>
          </div>
        </section>

        {/* Mission & Vision Section */}
        <section className="py-16 sm:py-24 relative overflow-hidden bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 text-left">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-8 text-left"
              >
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black font-headline uppercase tracking-tight text-left">Our Mission</h2>
                  </div>
                  <p className="text-muted-foreground text-base sm:text-lg leading-relaxed font-medium text-pretty text-left">
                    Testify is built for believers to share the greatness of Jesus Christ who gave his life as an offering to reconcile the world to GOD so that the kingdom of GOD will be built on Earth.
                  </p>
                </div>

                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-left">
                      <Sparkles className="h-5 w-5 text-primary text-left" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black font-headline uppercase tracking-tight text-left">Our Vision</h2>
                  </div>
                  <p className="text-muted-foreground text-base sm:text-lg leading-relaxed font-medium text-pretty text-left">
                    Testify exists to help believers overcome sin, grow in Christ, and become living testimonies through the transforming power of God's Word and the Holy Spirit. We believe lasting discipline is born not merely from stronger willpower, but from deeper revelation of who God is and who we are in Christ.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6 text-left"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-left">
                    <Award className="h-5 w-5 text-primary text-left" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black font-headline uppercase tracking-tight text-left">Founder's Story</h2>
                </div>
                <Card className="rounded-[2.5rem] border-l-8 border-l-primary bg-muted/20 border-none shadow-sm relative overflow-hidden text-left">
                   <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none text-left">
                      <Quote className="h-24 w-24 text-primary text-left" />
                   </div>
                   <CardContent className="p-8 sm:p-10 text-left">
                      <p className="italic text-muted-foreground text-base sm:text-lg leading-relaxed text-left text-left">
                        "I believe that technology is a divine gift for this final harvest. Seeing the need for accountability and collective encouragement in evangelism, I was led to create a space where every soul won is celebrated and every miracle is recorded for God's glory. God is great, and His power in Jesus Christ is moving through the earth like never before. Testify is a testimony in itself of God's provision for His people."
                      </p>
                      <p className="mt-6 text-sm font-black uppercase tracking-widest text-primary text-left">— Nanyo Theophilus</p>
                   </CardContent>
                </Card>
              </motion.div>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left text-left">
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 className="space-y-3 text-left"
               >
                 <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-left">
                   <ShieldCheck className="h-4 w-4 text-primary text-left" /> Moderation
                 </h3>
                 <p className="text-xs text-muted-foreground leading-relaxed font-medium text-left">
                   Faith-aligned content only. All posts are screened to ensure a respectful, edifying environment for the Body of Christ.
                 </p>
               </motion.div>
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: 0.1 }}
                 className="space-y-3 text-left"
               >
                 <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-left">
                   <Zap className="h-4 w-4 text-primary text-left" /> Integrity
                 </h3>
                 <p className="text-xs text-muted-foreground leading-relaxed font-medium text-left text-left">
                   We prioritize community verification and accountability to ensure shared miracle stories are genuine and God-glorifying.
                 </p>
               </motion.div>
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: 0.2 }}
                 className="space-y-3 text-left"
               >
                 <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-left text-left text-left">
                   <HeartHandshake className="h-4 w-4 text-primary text-left" /> Partnerships
                 </h3>
                 <p className="text-xs text-muted-foreground leading-relaxed font-medium text-left text-left text-left">
                   Working with local churches and missionary groups to provide reporting tools for outreach teams globally.
                 </p>
               </motion.div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-16 sm:py-24 bg-muted/30 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16 space-y-4">
              <h2 className="text-3xl sm:text-5xl font-black font-headline tracking-tight uppercase text-balance text-left text-left">Kingdom Ready Workforce</h2>
              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto text-pretty font-medium text-left text-left">
                Testify equips believers with the tools needed to fulfill the Great Commission in a digital age.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-left">
              {features.map((feature, i) => (
                <Card key={i} className="rounded-[2rem] border-none shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 duration-300 text-left">
                  <CardHeader className="p-6 sm:p-8 text-left text-left">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", feature.bgColor)}>
                      <feature.icon className={cn("h-6 w-6", feature.color)} />
                    </div>
                    <CardTitle className="text-xl font-black font-headline uppercase tracking-tight text-left text-left text-left">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 sm:px-8 pb-8 text-left text-left text-left">
                    <p className="text-muted-foreground leading-relaxed font-medium text-sm sm:text-base text-left text-left text-left">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Glory Feed Section */}
        <section className="py-16 sm:py-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-24 opacity-[0.03] pointer-events-none text-primary text-left">
            <Flame className="h-64 w-64 text-left" />
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-center text-left">
              <div className="space-y-6 sm:space-y-8 text-center lg:text-left text-left">
                <div className="space-y-4 text-left text-left">
                  <Badge variant="outline" className="text-primary border-primary/20 font-black uppercase tracking-widest text-[9px] sm:text-[10px] px-3 py-1 text-left">The Digital Altar</Badge>
                  <h2 className="text-3xl sm:text-5xl md:text-6xl font-black font-headline leading-tight sm:leading-none uppercase tracking-tighter text-balance text-left">See God <br className="hidden sm:block" />In Action</h2>
                  <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0 font-medium text-left">
                    Miracles aren't just for the Bible. Read real-time stories from believers around the world seeing the power of Jesus Christ today.
                  </p>
                </div>
                
                <Button asChild size="lg" variant="outline" className="h-9 rounded-full font-bold border-primary/20 text-primary hover:bg-primary/5 px-4 w-full sm:w-auto text-left">
                  <Link href="/testimonies" className="text-left">View Glory Feed</Link>
                </Button>
              </div>

              <div className="space-y-4 sm:space-y-6 text-left">
                {loadingTestimonies ? (
                  <div className="flex justify-center text-left"><Loader2 className="h-8 w-8 animate-spin opacity-20 text-left" /></div>
                ) : testimonies?.map((t, idx) => (
                  <motion.div 
                    key={t.id}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="text-left"
                  >
                    <Card className="rounded-[1.5rem] sm:rounded-[2rem] border-none shadow-lg bg-card/50 backdrop-blur-sm group hover:bg-primary/5 transition-colors overflow-hidden text-left">
                      <CardContent className="p-5 sm:p-6 flex gap-4 text-left">
                        <Quote className="h-6 w-6 sm:h-8 sm:w-8 text-primary opacity-20 shrink-0 mt-1 text-left" />
                        <div className="min-w-0 text-left">
                          <p className="text-sm sm:text-base italic text-muted-foreground line-clamp-2 leading-relaxed mb-4 text-left">
                            "{t.content}"
                          </p>
                          <div className="flex items-center gap-3 text-left text-left">
                            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border shrink-0 text-left text-left text-left text-left">
                              <AvatarImage src={t.authorAvatarUrl || undefined} className="object-cover text-left text-left text-left" />
                              <AvatarFallback className="text-[10px] sm:text-xs bg-primary/10 text-primary font-black uppercase text-left text-left text-left">{t.authorFirstName?.charAt(0)}{t.authorLastName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 text-left">
                              <p className="text-[10px] sm:text-xs font-black uppercase tracking-tight truncate text-left text-left text-left">{t.authorFirstName} {t.authorLastName?.charAt(0)}.</p>
                              <p className="text-[8px] sm:text-[9px] font-bold text-primary uppercase tracking-widest truncate text-left text-left text-left text-left">{t.category}</p>
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
        <section className="py-20 sm:py-24 bg-primary text-primary-foreground relative overflow-hidden text-left">
          <div className="absolute inset-0 opacity-10 pointer-events-none text-left">
            <div className="absolute inset-0 grid grid-cols-4 sm:grid-cols-6 gap-8 rotate-12 -translate-y-1/4">
              {[...Array(24)].map((_, i) => (
                <Globe key={i} className="h-16 w-16 sm:h-24 sm:w-24 text-left" />
              ))}
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 text-left">
            <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 text-left">
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-black font-headline leading-tight uppercase tracking-tighter text-balance text-left">
                The Harvest is Plentiful.<br className="hidden sm:block" />
                Ready to Labor?
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-primary-foreground/90 font-medium leading-relaxed italic text-pretty text-left">
                Join thousands of believers who are using technology to fulfill the mission of Jesus Christ. 
                Record miracles, reach cities, and track the greatness of God.
              </p>
              <div className="flex justify-center pt-2 sm:pt-4 text-left">
                <Button asChild size="lg" className="h-10 px-8 text-base font-black bg-white text-primary hover:bg-white/90 rounded-2xl shadow-2xl uppercase tracking-widest w-full sm:w-auto text-left">
                  <Link href="/signup" className="text-left text-left text-left">
                    START TESTIFYING <ArrowRight className="ml-3 h-5 w-5 sm:h-6 sm:w-6 text-left" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 border-t py-12 sm:py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 sm:col-span-2 space-y-6 text-left">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                {logo && (
                  <Avatar className="h-12 w-12 text-left text-left text-left">
                    <AvatarImage src={logo.imageUrl} alt="Logo" />
                    <AvatarFallback>T</AvatarFallback>
                  </Avatar>
                )}
              </Link>
              <p className="text-muted-foreground text-sm max-w-sm font-medium leading-relaxed italic text-pretty text-left">
                Testify is built for believers to share the greatness of Jesus Christ who gave his life as an offering to reconcile the world to GOD.
              </p>
              <div className="flex gap-4 text-left">
                <Button variant="outline" size="icon" asChild className="rounded-full h-10 w-10 bg-background border-muted hover:border-primary/50 transition-colors shadow-sm text-left text-left">
                  <Link href="https://instagram.com/testifyglobal2026" target="_blank" rel="noopener noreferrer">
                    <Instagram className="h-4 w-4 text-left" />
                    <span className="sr-only text-left">Instagram</span>
                  </Link>
                </Button>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary text-left">Platform</h4>
              <ul className="space-y-3 text-left">
                <li><Link href="/testimonies" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Glory Feed</Link></li>
                <li><Link href="/campaigns" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Mission Hub</Link></li>
                <li><Link href="/growth" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Harvest Progress</Link></li>
                <li><Link href="/fellowships" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Directory</Link></li>
              </ul>
            </div>

            <div className="space-y-4 text-left">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary text-left text-left">Ministry</h4>
              <ul className="space-y-3 text-left">
                <li><Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Our Story</Link></li>
                <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left text-left">Partner With Us</Link></li>
                <li><Link href="/guide" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left text-left">App Guide</Link></li>
                <li><Link href="/resources" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left text-left text-left">Resources</Link></li>
                <li><Link href="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left text-left text-left">Terms</Link></li>
                <li><Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left text-left text-left">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="h-px w-full bg-muted opacity-50 mb-8" />
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-left">
            <p className="text-center md:text-left text-left text-left">© {new Date().getFullYear()} TESTIFY GLOBAL. Built for the Great Commission.</p>
            <div className="flex gap-6 text-left">
              <Link href="/terms-of-service" className="hover:text-primary transition-colors text-left text-left">Terms</Link>
              <Link href="/privacy-policy" className="hover:text-primary transition-colors text-left text-left">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
