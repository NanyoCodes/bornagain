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
  ShieldCheck,
  Zap,
  HeartHandshake,
  Store,
  Gift,
  MapPin,
  CheckCircle2,
  BookOpen,
  Utensils,
  PlusCircle,
  MessagesSquare,
  TrendingUp,
  Heart
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

const features = [
  {
    title: "Glory Feed",
    description: "Share and read real-time miracle stories. Your testimony is a weapon that overcomes the enemy.",
    icon: Newspaper,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    link: "/testimonies"
  },
  {
    title: "Mission Hub",
    description: "Organize evangelism campaigns. Coordinate your team in the field with real-time tracking.",
    icon: Target,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    link: "/campaigns"
  },
  {
    title: "Victory Circles",
    description: "Find communal solutions for spiritual breakthroughs. Bring struggles into the Light and overcome together.",
    icon: ShieldCheck,
    color: "text-indigo-600",
    bgColor: "bg-indigo-600/10",
    link: "/victory-hub"
  },
  {
    title: "Provision Hub",
    description: "Support brethren with physical meals through the Meals Center. Practical love in action.",
    icon: Utensils,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    link: "/marketplace"
  },
  {
    title: "Kindness Center",
    description: "Send spiritual gifts, Bibles, and tokens of encouragement to nourish the souls in your harvest.",
    icon: Gift,
    color: "text-purple-600",
    bgColor: "bg-purple-600/10",
    link: "/marketplace/gifts"
  },
  {
    title: "Daily Disciplines",
    description: "Build spiritual strength with Prayer, Word study, and Church trackers. Consistency is power.",
    icon: Zap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    link: "/growth"
  },
  {
    title: "Fellowship Groups",
    description: "Connect converts to local or virtual fellowships for long-term growth and discipleship.",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    link: "/fellowships"
  },
  {
    title: "Intercession",
    description: "Share prayer requests and stand in agreement with the global Body of Christ.",
    icon: HeartHandshake,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    link: "/testimonies?tab=prayers"
  }
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
    <div className="flex flex-col min-h-screen bg-background selection:bg-primary/30 overflow-x-hidden relative text-left">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b text-left">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between text-left">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left text-left">
            {logo && (
              <Avatar className="h-10 w-10 sm:h-11 sm:w-11 text-left text-left">
                <AvatarImage src={logo.imageUrl} alt={logo.description} className="text-left text-left" />
                <AvatarFallback className="text-left text-left">T</AvatarFallback>
              </Avatar>
            )}
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 text-left text-left">
            <Button variant="ghost" asChild className="hidden sm:inline-flex font-bold text-left text-left">
              <Link href="/login" className="text-left text-left">Sign In</Link>
            </Button>
            <Button asChild className="rounded-full px-4 font-black tracking-widest uppercase text-[10px] sm:text-xs h-9 text-left text-left">
              <Link href="/signup" className="text-left text-left">Join Movement</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-16 text-left text-left">
        {/* Hero Section */}
        <section className="relative h-[85vh] min-h-[500px] flex items-center overflow-hidden bg-zinc-950 text-left text-left">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent text-left text-left" />
          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full text-left text-left">
            <div className="max-w-4xl space-y-8 text-center sm:text-left text-left text-left">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-left text-left text-left">
                <Badge className="bg-primary text-primary-foreground mb-4 px-4 py-1 rounded-full font-black uppercase tracking-[0.2em] text-[10px] text-left text-left text-left">
                  SHARING GOD'S GOODNESS
                </Badge>
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-headline text-white leading-[1.1] sm:leading-[0.9] tracking-tighter text-balance text-left text-left text-left">
                  Testify of His Power.<br className="hidden sm:block text-left text-left" />
                  Organize the Harvest.<br className="hidden sm:block text-left text-left" />
                  <span className="text-primary text-left text-left text-left">Glorify the King.</span>
                </h1>
                <p className="mt-6 text-lg sm:text-xl text-white/80 font-medium max-w-2xl italic leading-relaxed text-pretty text-left text-left text-left">
                  "And they overcame him by the blood of the Lamb, and by the word of their testimony..." — Revelation 12:11
                </p>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-4 text-left text-left text-left">
                <Button asChild size="lg" className="h-14 px-8 text-base font-black rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-widest text-left text-left text-left">
                  <Link href="/signup" className="text-left text-left text-left">GET STARTED <ArrowRight className="ml-2 h-5 w-5 text-left text-left text-left" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 px-8 text-base font-bold rounded-2xl bg-white/5 backdrop-blur-md border-white/20 text-white hover:bg-white/10 text-left text-left text-left">
                  <Link href="/about" className="text-left text-left text-left text-left">OUR MISSION</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center text-left text-left">
            <div className="flex gap-2 text-left text-left text-left">
                {[...Array(24)].map((_, i) => (
                    <div key={i} className="h-1.5 w-1.5 rounded-full bg-white/20 text-left text-left text-left" />
                ))}
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-24 bg-muted/30 text-left text-left text-left">
          <div className="max-w-7xl mx-auto px-6 text-left text-left text-left">
            <div className="text-center mb-16 space-y-4 text-left text-left text-left text-left">
              <h2 className="text-4xl sm:text-6xl font-black font-headline tracking-tight uppercase text-balance text-center text-left text-left text-left">Kingdom Ready Workforce</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty font-medium text-center text-left text-left text-left">
                Testify equips believers with the tools needed to fulfill the Great Commission in a digital age.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left text-left text-left">
                {features.map((feature, i) => (
                    <Card key={i} className="rounded-[2.5rem] border-none shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full text-left text-left text-left">
                        <CardHeader className="p-8 pb-4 text-left text-left text-left">
                            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center mb-4 text-left text-left text-left text-left", feature.bgColor)}>
                                <feature.icon className={cn("h-6 w-6 text-left text-left text-left text-left", feature.color)} />
                            </div>
                            <CardTitle className="text-xl font-black uppercase tracking-tight text-left text-left text-left text-left">{feature.title}</CardTitle>
                            <CardDescription className="font-medium text-sm leading-relaxed text-left text-left text-left text-left text-left">{feature.description}</CardDescription>
                        </CardHeader>
                        <CardFooter className="p-8 pt-0 mt-auto text-left text-left text-left text-left text-left">
                            <Button variant="link" asChild className="p-0 text-primary font-bold text-left text-left text-left text-left text-left">
                                <Link href={feature.link} className="text-left text-left text-left text-left text-left text-left">Open Hub <ArrowRight className="ml-1.5 h-3 w-3 text-left text-left text-left text-left text-left" /></Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
          </div>
        </section>

        {/* Glory Feed Section */}
        <section className="py-24 relative overflow-hidden bg-background text-left text-left text-left">
          <div className="absolute top-0 right-0 p-24 opacity-[0.03] pointer-events-none text-primary text-left text-left text-left" />
          
          <div className="max-w-7xl mx-auto px-6 text-left text-left text-left">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center text-left text-left text-left">
              <div className="space-y-8 text-center lg:text-left text-left text-left text-left">
                <div className="space-y-4 text-left text-left text-left text-left text-left">
                  <Badge variant="outline" className="text-primary border-primary/20 font-black uppercase tracking-widest text-[10px] px-3 py-1 text-left text-left text-left text-left text-left">The Digital Altar</Badge>
                  <h2 className="text-4xl sm:text-6xl font-black font-headline leading-tight uppercase tracking-tighter text-balance text-center text-left text-left text-left text-left text-left text-left">See God In Action</h2>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto lg:mx-0 text-left text-left text-left text-left text-left text-left">
                    Miracles aren't just for the Bible. Read real-time stories from believers around the world seeing the power of Jesus Christ today.
                  </p>
                </div>
                
                <Button asChild size="lg" variant="outline" className="h-12 rounded-full font-bold border-primary/20 text-primary hover:bg-primary/5 px-8 w-full sm:w-auto text-left text-left text-left text-left text-left text-left">
                  <Link href="/testimonies" className="text-left text-left text-left text-left text-left text-left text-left">VIEW GLORY FEED</Link>
                </Button>
              </div>

              <div className="space-y-6 text-left text-left text-left">
                {loadingTestimonies ? (
                  <div className="flex justify-center text-left text-left text-left text-left text-left text-left text-left"><Loader2 className="h-8 w-8 animate-spin opacity-20 text-left text-left text-left text-left text-left text-left text-left" /></div>
                ) : testimonies?.map((t, idx) => (
                  <motion.div 
                    key={t.id}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="text-left text-left text-left text-left text-left"
                  >
                    <Card className="rounded-[2rem] border-none shadow-lg bg-card/50 backdrop-blur-sm group hover:bg-primary/5 transition-colors overflow-hidden text-left text-left text-left text-left text-left">
                      <CardContent className="p-6 flex gap-4 text-left text-left text-left text-left text-left">
                        <Quote className="h-8 w-8 text-primary opacity-20 shrink-0 mt-1 text-left text-left text-left text-left text-left" />
                        <div className="min-w-0 text-left text-left text-left text-left text-left">
                          <p className="text-sm sm:text-base italic text-muted-foreground line-clamp-2 leading-relaxed mb-4 text-left text-left text-left text-left text-left text-left">
                            "{t.content}"
                          </p>
                          <div className="flex items-center gap-3 text-left text-left text-left text-left text-left text-left">
                            <Avatar className="h-10 w-10 border shrink-0 text-left text-left text-left text-left text-left text-left">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-black uppercase text-left text-left text-left text-left text-left text-left">{t.authorFirstName?.charAt(0)}{t.authorLastName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 text-left text-left text-left text-left text-left text-left text-left">
                              <p className="text-xs font-black uppercase tracking-tight text-left text-left text-left text-left text-left text-left text-left text-left">{t.authorFirstName} {t.authorLastName?.charAt(0)}.</p>
                              <p className="text-[9px] font-bold text-primary uppercase tracking-widest truncate text-left text-left text-left text-left text-left text-left text-left text-left">{t.category}</p>
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
        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden text-left text-left text-left">
          <div className="absolute inset-0 opacity-10 pointer-events-none text-left text-left text-left">
            <div className="absolute inset-0 grid grid-cols-6 gap-8 rotate-12 -translate-y-1/4 text-left text-left text-left">
              {[...Array(24)].map((_, i) => (
                <Globe key={i} className="h-24 w-24 text-left text-left text-left" />
              ))}
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 text-center relative z-10 text-left text-left text-left">
            <div className="max-w-3xl mx-auto space-y-8 text-left text-left text-left text-left">
              <h2 className="text-4xl sm:text-6xl font-black font-headline leading-tight uppercase tracking-tighter text-balance text-center text-left text-left text-left text-left text-left text-left">
                The Harvest is Plentiful. Ready to Labor?
              </h2>
              <p className="text-lg sm:text-xl text-primary-foreground/90 font-medium leading-relaxed italic text-pretty text-center text-left text-left text-left text-left text-left text-left">
                Join thousands of believers who are using technology to fulfill the mission of Jesus Christ. 
                Record miracles, reach cities, and track the greatness of God.
              </p>
              <div className="flex justify-center pt-4 text-left text-left text-left text-left text-left text-left">
                <Button asChild size="lg" className="h-14 px-10 text-base font-black bg-white text-primary hover:bg-white/90 rounded-2xl shadow-2xl uppercase tracking-widest w-full sm:w-auto text-left text-left text-left text-left text-left text-left">
                  <Link href="/signup" className="text-left text-left text-left text-left text-left text-left text-left">START TESTIFYING <ArrowRight className="ml-3 h-6 w-6 text-left text-left text-left text-left text-left text-left" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 border-t py-16 text-left text-left">
        <div className="max-w-7xl mx-auto px-8 text-left text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 mb-12 text-left text-left">
            <div className="col-span-1 sm:col-span-2 space-y-6 text-left text-left">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left text-left">
                {logo && (
                  <Avatar className="h-12 w-12 text-left text-left">
                    <AvatarImage src={logo.imageUrl} alt="Logo" className="text-left text-left" />
                    <AvatarFallback className="text-left text-left">T</AvatarFallback>
                  </Avatar>
                )}
              </Link>
              <p className="text-muted-foreground text-sm max-w-sm font-medium leading-relaxed italic text-pretty text-left text-left">
                Testify is built for believers to share the greatness of Jesus Christ who gave his life as an offering to reconcile the world to GOD.
              </p>
              <div className="flex gap-4 text-left text-left">
                <Button variant="outline" size="icon" asChild className="rounded-full h-10 w-10 bg-background border-muted hover:border-primary/50 transition-colors shadow-sm text-left text-left text-left">
                  <Link href="https://instagram.com/testifyglobal2026" target="_blank" rel="noopener noreferrer" className="text-left text-left text-left">
                    <Instagram className="h-4 w-4 text-left text-left text-left" />
                    <span className="sr-only text-left text-left text-left">Instagram</span>
                  </Link>
                </Button>
              </div>
            </div>

            <div className="space-y-4 text-left text-left">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary text-left text-left">Platform</h4>
              <ul className="space-y-3 text-left text-left">
                <li><Link href="/testimonies" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Glory Feed</Link></li>
                <li><Link href="/campaigns" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Mission Hub</Link></li>
                <li><Link href="/growth" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Harvest Progress</Link></li>
                <li><Link href="/fellowships" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Directory</Link></li>
              </ul>
            </div>

            <div className="space-y-4 text-left text-left">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary text-left text-left">Ministry</h4>
              <ul className="space-y-3 text-left text-left">
                <li><Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Our Story</Link></li>
                <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Partner With Us</Link></li>
                <li><Link href="/guide" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">App Guide</Link></li>
                <li><Link href="/resources" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Resources</Link></li>
                <li><Link href="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Terms</Link></li>
                <li><Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left text-left">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="h-px w-full bg-muted opacity-50 mb-8 text-left text-left" />
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-left text-left">
            <p className="text-center md:text-left text-left text-left">© {new Date().getFullYear()} TESTIFY GLOBAL. Built for the Great Commission.</p>
            <div className="flex gap-6 text-left text-left">
              <Link href="/terms-of-service" className="hover:text-primary transition-colors text-left text-left">Terms</Link>
              <Link href="/privacy-policy" className="hover:text-primary transition-colors text-left text-left">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}