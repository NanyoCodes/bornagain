'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Home, Sparkles, Target, Compass } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * @fileOverview High-fidelity 404 Not Found page.
 * Leverages the Kingdom theme to turn a technical error into a spiritual reflection.
 */
export default function NotFound() {
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-4 overflow-hidden text-left">
      {/* Background Decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center overflow-hidden">
          <div className="grid grid-cols-4 gap-24 rotate-12">
              {[...Array(16)].map((_, i) => (
                  <Compass key={i} className="h-48 w-48 text-primary" />
              ))}
          </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-card/50 backdrop-blur-xl border-t-8 border-t-primary/20 text-left">
          <CardHeader className="flex flex-col items-center gap-6 p-8 pb-4 text-left">
              {logo && (
                  <motion.div
                    animate={{ 
                        scale: [1, 1.05, 1],
                        rotate: [0, 2, -2, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Avatar className="h-28 w-28 shadow-2xl ring-8 ring-primary/10 border-4 border-background">
                        <AvatarImage src={logo.imageUrl} alt="Testify" className="object-cover" />
                        <AvatarFallback className="text-4xl font-black bg-primary/10 text-primary">T</AvatarFallback>
                    </Avatar>
                  </motion.div>
              )}
            <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Kingdom Station</span>
                </div>
                <CardTitle className="text-5xl font-black font-headline uppercase tracking-tighter">404</CardTitle>
                <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Identity or Station Lost</p>
            </div>
          </CardHeader>

          <CardContent className="p-8 pt-4 text-center space-y-6">
            <p className="text-muted-foreground leading-relaxed font-medium italic text-balance">
              The record you seek has either moved to a new mission station or does not exist in our current harvest field.
            </p>

            <div className="relative p-8 rounded-[2rem] bg-primary/5 border-2 border-dashed border-primary/20 shadow-inner overflow-hidden group">
                <Sparkles className="absolute top-2 right-4 h-12 w-12 opacity-5 rotate-12 group-hover:scale-110 transition-transform" />
                <p className="text-lg font-serif italic leading-relaxed text-foreground relative z-10 text-balance">
                    &ldquo;For the Son of Man came to seek and to save the lost.&rdquo;
                </p>
                <p className="text-[10px] font-black uppercase text-primary text-right mt-4 tracking-widest">— Luke 19:10</p>
            </div>
          </CardContent>

          <CardFooter className="p-8 pt-0 flex flex-col gap-3">
            <Button asChild size="lg" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 text-xs sm:text-sm active:scale-95 transition-all text-center">
              <Link href="/">
                <Home className="mr-3 h-5 w-5" />
                RETURN TO HOME
              </Link>
            </Button>
            <Button variant="ghost" asChild className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] text-muted-foreground hover:text-primary transition-colors text-center">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {currentYear && (
          <p className="mt-8 text-center text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/30 px-6">
              © {currentYear} TESTIFY GLOBAL • BUILT FOR THE GREAT COMMISSION
          </p>
        )}
      </motion.div>
    </div>
  );
}
