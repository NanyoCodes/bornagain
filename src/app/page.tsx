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
import { Separator } from '@/components/ui/separator';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Testimony } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';

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
        {/* Hero Section */}
        <section className="relative h-[85vh] min-h-[500px] flex items-center overflow-hidden bg-zinc-950 text-left">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent text-left" />
          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full text-left">
            <div className="max-w-4xl space-y-8 text-center sm:text-left text-left">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-left">
                <Badge className="bg-primary text-primary-foreground mb-4 px-4 py-1 rounded-full font-black uppercase tracking-[0.2em] text-[10px] text-left">
                  SHARING GOD'S GOODNESS
                </Badge>
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-headline text-white leading-[1.1] sm:leading-[0.9] tracking-tighter text-balance text-left">
                  Testify of His Power.<br className="hidden sm:block text-left" />
                  Organize the Harvest.<br className="hidden sm:block text-left" />
                  <span className="text-primary text-left">Glorify the King.</span>
                </h1>
                <p className="mt-6 text-lg sm:text-xl text-white/80 font-medium max-w-2xl italic leading-relaxed text-pretty text-left">
                  "And they overcame him by the blood of the Lamb, and by the word of their testimony..." — Revelation 12:11
                </p>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-4 text-left">
                <Button asChild size="lg" className="h-14 px-8 text-base font-black rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-widest text-left">
                  <Link href="/signup" className="text-left">GET STARTED <ArrowRight className="ml-2 h-5 w-5 text-left" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 px-8 text-base font-bold rounded-2xl bg-white/5 backdrop-blur-md border-white/20 text-white hover:bg-white/10 text-left">
                  <Link href="/about" className="text-left">OUR MISSION</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Glory Feed Section */}
        <section className="py-24 relative overflow-hidden bg-background text-left">
          <div className="absolute top-0 right-0 p-24 opacity-[0.03] pointer-events-none text-primary text-left">
            <Flame className="h-64 w-64 text-left" />
          </div>
          
          <div className="max-w-7xl mx-auto px-6 text-left">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center text-left">
              <div className="space-y-8 text-center lg:text-left text-left">
                <div className="space-y-4 text-left">
                  <Badge variant="outline" className="text-primary border-primary/20 font-black uppercase tracking-widest text-[10px] px-3 py-1 text-left">The Digital Altar</Badge>
                  <h2 className="text-4xl sm:text-6xl font-black font-headline leading-tight uppercase tracking-tighter text-balance text-left">See God In Action</h2>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto lg:mx-0 text-left">
                    Your testimony is a weapon. Share the miracles God is performing in your life and be strengthened by the stories of believers from around the world.
                  </p>
                </div>
                
                <Button asChild size="lg" variant="outline" className="h-12 rounded-full font-bold border-primary/20 text-primary hover:bg-primary/5 px-8 w-full sm:w-auto text-left">
                  <Link href="/testimonies" className="text-left">VIEW GLORY FEED</Link>
                </Button>
              </div>

              <div className="space-y-6 text-left">
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
                    <Card className="rounded-[2rem] border-none shadow-lg bg-card/50 backdrop-blur-sm group hover:bg-primary/5 transition-colors overflow-hidden text-left">
                      <CardContent className="p-6 flex gap-4 text-left">
                        <Quote className="h-8 w-8 text-primary opacity-20 shrink-0 mt-1 text-left" />
                        <div className="min-w-0 text-left">
                          <p className="text-sm sm:text-base italic text-muted-foreground line-clamp-2 leading-relaxed mb-4 text-left">
                            "{t.content}"
                          </p>
                          <div className="flex items-center gap-3 text-left">
                            <Avatar className="h-10 w-10 border shrink-0 text-left">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-black uppercase text-left">{t.authorFirstName?.charAt(0)}{t.authorLastName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 text-left">
                              <p className="text-xs font-black uppercase tracking-tight truncate text-left">{t.authorFirstName} {t.authorLastName?.charAt(0)}.</p>
                              <p className="text-[9px] font-bold text-primary uppercase tracking-widest truncate text-left">{t.category}</p>
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

        {/* Victory Hub Section */}
        <section className="py-24 bg-muted/20 text-left">
          <div className="max-w-7xl mx-auto px-6 text-left">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center text-left">
                <div className="relative text-left order-2 lg:order-1">
                    <Card className="rounded-[3rem] border-none shadow-2xl bg-card overflow-hidden text-left">
                        <div className="p-8 sm:p-12 space-y-6 text-left">
                            <div className="flex items-center gap-3 text-left">
                                <Badge className="bg-primary text-white font-black uppercase text-[10px] text-left">COMMUNAL VICTORY</Badge>
                            </div>
                            <h3 className="text-2xl font-black font-headline uppercase text-left">Breaking Strongholds</h3>
                            <p className="text-lg text-muted-foreground leading-relaxed italic text-left">
                                "Naming my struggle in the circle was terrifying, but the responses of prayer and specific armor from the Word gave me the breakthrough I needed."
                            </p>
                            <div className="pt-4 flex items-center gap-3 text-left">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-left"><ShieldCheck className="h-5 w-5 text-primary text-left" /></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-left">Choice-Based Anonymity</span>
                            </div>
                        </div>
                    </Card>
                </div>
              <div className="space-y-8 text-left order-1 lg:order-2">
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-left">
                      <Zap className="h-6 w-6 text-primary text-left" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black font-headline uppercase text-left">Victory circles</h2>
                  </div>
                  <p className="text-muted-foreground text-lg leading-relaxed text-balance text-left">
                    We overcome by the blood of the Lamb and the word of our testimony. Join a Victory Circle to find strength in transparency and access the communal Armor of the Word.
                  </p>
                </div>
                <div className="flex flex-col gap-4 text-left">
                    <div className="flex items-start gap-4 text-left">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-1 text-left" />
                        <p className="text-sm text-muted-foreground font-medium text-left">Choose between posting as yourself or remaining anonymous for sensitive challenges.</p>
                    </div>
                    <div className="flex items-start gap-4 text-left">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-1 text-left" />
                        <p className="text-sm text-muted-foreground font-medium text-left">Access shared supply: Video sermons, articles, and bibles specifically for your struggle.</p>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Provision Hub Section */}
        <section className="py-24 bg-background text-left">
          <div className="max-w-7xl mx-auto px-6 text-left">
            <div className="text-center mb-16 space-y-4 text-left text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-4 text-left">
                    <Store className="h-3 w-3 text-left" /> Provision & Kindness
                </div>
              <h2 className="text-3xl sm:text-5xl font-black font-headline tracking-tight uppercase text-balance text-center text-left">Practical Love in Action</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-center text-left">
                Evangelism meets provision. Our Hubs connect believers to Kingdom-aligned vendors to share meals and kindness.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                <Card className="rounded-[2.5rem] border-none shadow-lg bg-muted/20 group hover:shadow-2xl transition-all text-left">
                    <CardHeader className="p-8 sm:p-10 text-left">
                        <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-left">
                            <Utensils className="h-6 w-6 text-blue-600 text-left" />
                        </div>
                        <CardTitle className="text-2xl font-black font-headline uppercase text-left">Provision Hub</CardTitle>
                        <CardDescription className="text-base text-left">Share a physical meal with a convert or a brother in need. Order from local outlets for delivery directly to their location.</CardDescription>
                    </CardHeader>
                    <CardFooter className="p-0 border-t border-white/10 text-left">
                        <Button asChild variant="ghost" className="w-full h-14 rounded-none font-black uppercase text-xs tracking-widest text-left">
                            <Link href="/marketplace" className="text-left">Enter Provision Hub <ArrowRight className="ml-2 h-4 w-4 text-left" /></Link>
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="rounded-[2.5rem] border-none shadow-lg bg-muted/20 group hover:shadow-2xl transition-all text-left">
                    <CardHeader className="p-8 sm:p-10 text-left">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-left">
                            <Gift className="h-6 w-6 text-indigo-600 text-left" />
                        </div>
                        <CardTitle className="text-2xl font-black font-headline uppercase text-left">Kindness Center</CardTitle>
                        <CardDescription className="text-base text-left">Nourish the soul with spiritual gifts. Send Bibles, devotionals, or tokens of love through verified Kingdom partners.</CardDescription>
                    </CardHeader>
                    <CardFooter className="p-0 border-t border-white/10 text-left">
                        <Button asChild variant="ghost" className="w-full h-14 rounded-none font-black uppercase text-xs tracking-widest text-left">
                            <Link href="/marketplace/gifts" className="text-left">Enter Kindness Center <ArrowRight className="ml-2 h-4 w-4 text-left" /></Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
          </div>
        </section>

        {/* Daily Disciplines & Coordination Section */}
        <section className="py-24 bg-muted/30 text-left">
          <div className="max-w-7xl mx-auto px-6 text-left">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
              {/* Daily Disciplines */}
              <Card className="rounded-[2.5rem] border-none shadow-lg bg-card/80 backdrop-blur-sm text-left">
                <CardHeader className="p-8 pb-4 text-left">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4 text-left">
                    <Zap className="h-6 w-6 text-amber-500 text-left" />
                  </div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-left">Daily Disciplines</CardTitle>
                  <CardDescription className="font-medium text-sm leading-relaxed text-left">Build unshakeable consistency. Track your Prayer, Word Study, and Church Attendance daily.</CardDescription>
                </CardHeader>
                <CardFooter className="p-8 pt-0 text-left">
                  <Button asChild variant="link" className="p-0 h-auto font-black uppercase tracking-widest text-[10px] text-primary text-left">
                    <Link href="/growth" className="text-left">Explore Growth Tracks <ArrowRight className="ml-2 h-3 w-3 text-left" /></Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Kingdom Conversations */}
              <Card className="rounded-[2.5rem] border-none shadow-lg bg-card/80 backdrop-blur-sm text-left">
                <CardHeader className="p-8 pb-4 text-left">
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 text-left">
                    <MessagesSquare className="h-6 w-6 text-blue-500 text-left" />
                  </div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-left">Unified Coordination</CardTitle>
                  <CardDescription className="font-medium text-sm leading-relaxed text-left">Stay connected with your mission team, accountability partners, and Kingdom vendors through secure, real-time chat.</CardDescription>
                </CardHeader>
                <CardFooter className="p-8 pt-0 text-left">
                  <Button asChild variant="link" className="p-0 h-auto font-black uppercase tracking-widest text-[10px] text-primary text-left">
                    <Link href="/chats" className="text-left text-left">View Messages <ArrowRight className="ml-2 h-3 w-3 text-left" /></Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Accountability */}
              <Card className="rounded-[2.5rem] border-none shadow-lg bg-card/80 backdrop-blur-sm text-left">
                <CardHeader className="p-8 pb-4 text-left">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4 text-left">
                    <HeartHandshake className="h-6 w-6 text-indigo-600 text-left" />
                  </div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-left">Iron Sharpens Iron</CardTitle>
                  <CardDescription className="font-medium text-sm leading-relaxed text-left">Connect with accountability partners. Nudge each other to stay sharp and maintain your spiritual fire.</CardDescription>
                </CardHeader>
                <CardFooter className="p-8 pt-0 text-left">
                  <Button asChild variant="link" className="p-0 h-auto font-black uppercase tracking-widest text-[10px] text-primary text-left">
                    <Link href="/accountability" className="text-left text-left">Find a Partner <ArrowRight className="ml-2 h-3 w-3 text-left" /></Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* Strategic Mobilization Section */}
        <section className="py-24 bg-zinc-950 text-white text-left">
          <div className="max-w-7xl mx-auto px-6 text-left">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center text-left">
                <div className="space-y-12 text-left">
                    <div className="space-y-4 text-left">
                        <h2 className="text-3xl sm:text-5xl font-black font-headline uppercase text-left">The Strategic Harvest</h2>
                        <p className="text-zinc-400 text-lg leading-relaxed text-balance text-left">
                            Map your impact and preserve the harvest. Assign your converts to fellowships based on where they reside to ensure perpetual local care.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                        <div className="space-y-4 text-left">
                            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-left"><Target className="h-5 w-5 text-white text-left" /></div>
                            <h4 className="text-lg font-bold uppercase text-left">Mission Hub</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed text-left">Organize city-wide outreach using real-time field coordination and demographic tracking.</p>
                        </div>
                        <div className="space-y-4 text-left">
                            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-left"><Users className="h-5 w-5 text-white text-left" /></div>
                            <h4 className="text-lg font-bold uppercase text-left">Fellowship Hub</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed text-left">Nurture converts in small groups. Feed them daily spiritual nourishment via the group devotional hub.</p>
                        </div>
                    </div>
                </div>
                <div className="bg-zinc-900/50 p-8 sm:p-12 rounded-[3rem] border border-white/10 space-y-8 text-left">
                    <div className="flex items-center gap-3 text-left">
                        <Sparkles className="h-5 w-5 text-primary text-left" />
                        <h3 className="text-xl font-bold uppercase tracking-tight text-left">Discipleship Cycle</h3>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed text-left">
                        Every convert is a future host. We encourage all souls to create accounts, enabling them to eventually host their own fellowships or lead city-wide campaigns. The harvest is anchored by those who reside in the land.
                    </p>
                    <Separator className="bg-white/10 text-left" />
                    <div className="flex items-center justify-between text-left">
                        <div className="text-left text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary text-left">Become a Host</p>
                            <p className="text-sm font-bold text-left">Start a Fellowship Today</p>
                        </div>
                        <Button asChild size="icon" className="h-12 w-12 rounded-full text-left"><Link href="/signup" className="text-left text-left"><PlusCircle className="h-6 w-6 text-left" /></Link></Button>
                    </div>
                </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden text-left">
          <div className="absolute inset-0 opacity-10 pointer-events-none text-left">
            <div className="absolute inset-0 grid grid-cols-6 gap-8 rotate-12 -translate-y-1/4 text-left">
              {[...Array(24)].map((_, i) => (
                <Globe key={i} className="h-24 w-24 text-left" />
              ))}
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 text-center relative z-10 text-left">
            <div className="max-w-3xl mx-auto space-y-8 text-left">
              <h2 className="text-4xl sm:text-6xl font-black font-headline leading-tight uppercase tracking-tighter text-balance text-center text-left">
                The Harvest is Plentiful. Ready to Labor?
              </h2>
              <p className="text-lg sm:text-xl text-primary-foreground/90 font-medium leading-relaxed italic text-pretty text-center text-left">
                Join thousands of believers using technology to fulfill the Great Commission. 
                Record miracles, reach cities, and track the greatness of God.
              </p>
              <div className="flex justify-center pt-4 text-left">
                <Button asChild size="lg" className="h-14 px-10 text-base font-black bg-white text-primary hover:bg-white/90 rounded-2xl shadow-2xl uppercase tracking-widest w-full sm:w-auto text-left">
                  <Link href="/signup" className="text-left text-left">START TESTIFYING <ArrowRight className="ml-3 h-6 w-6 text-left" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
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
              <p className="text-muted-foreground text-sm max-w-sm font-medium leading-relaxed italic text-pretty text-left">
                Testify is built for believers to share the greatness of Jesus Christ who gave his life as an offering to reconcile the world to GOD.
              </p>
              <div className="flex gap-4 text-left">
                <Button variant="outline" size="icon" asChild className="rounded-full h-10 w-10 bg-background border-muted hover:border-primary/50 transition-colors shadow-sm text-left">
                  <Link href="https://instagram.com/testifyglobal2026" target="_blank" rel="noopener noreferrer" className="text-left">
                    <Instagram className="h-4 w-4 text-left" />
                    <span className="sr-only">Instagram</span>
                  </Link>
                </Button>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary text-left">Platform</h4>
              <ul className="space-y-3 text-left">
                <li><Link href="/testimonies" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Glory Feed</Link></li>
                <li><Link href="/campaigns" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Mission Hub</Link></li>
                <li><Link href="/growth" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Harvest Progress</Link></li>
                <li><Link href="/fellowships" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Directory</Link></li>
              </ul>
            </div>

            <div className="space-y-4 text-left">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary text-left">Ministry</h4>
              <ul className="space-y-3 text-left">
                <li><Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Our Story</Link></li>
                <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Partner With Us</Link></li>
                <li><Link href="/guide" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">App Guide</Link></li>
                <li><Link href="/resources" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Resources</Link></li>
                <li><Link href="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Terms</Link></li>
                <li><Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors font-semibold text-left">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="h-px w-full bg-muted opacity-50 mb-8 text-left" />
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-left">
            <p className="text-center md:text-left text-left">© {new Date().getFullYear()} TESTIFY GLOBAL. Built for the Great Commission.</p>
            <div className="flex gap-6 text-left">
              <Link href="/terms-of-service" className="hover:text-primary transition-colors text-left">Terms</Link>
              <Link href="/privacy-policy" className="hover:text-primary transition-colors text-left">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
