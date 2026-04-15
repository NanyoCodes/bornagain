
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { welcomeScriptures } from '@/lib/verses';

const variants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -15 },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [verse, setVerse] = useState({ text: '', verse: '' });

  useEffect(() => {
    // This effect runs on the client after hydration to avoid hydration mismatch
    const randomVerse = welcomeScriptures[Math.floor(Math.random() * welcomeScriptures.length)];
    setVerse({
      text: randomVerse.text.replace(/\{name\},?\s?/g, ''),
      verse: randomVerse.verse,
    });
  }, [pathname]);

  return (
    // This outer div will contain the verse as a background element
    <div className="relative">
      <div className="fixed inset-0 z-0 flex items-center justify-center p-8 bg-background">
        <div className="text-center max-w-2xl">
          <Flame className="mx-auto h-12 w-12 text-primary mb-6" />
          <blockquote className="space-y-4">
            <p className="text-xl md:text-2xl font-serif italic text-muted-foreground">"{verse.text}"</p>
            <footer className="text-base text-muted-foreground/80 font-sans not-italic">- {verse.verse}</footer>
          </blockquote>
        </div>
      </div>
      
      <AnimatePresence
        mode="wait"
        initial={false}
        onExitComplete={() => window.scrollTo(0, 0)}
      >
        <motion.div
          key={pathname}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ type: 'easeInOut', duration: 1.5 }}
          className="relative z-10 bg-background" // Give content a background to hide the verse screen underneath
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
