'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';

const variants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -15 },
};

const transitionWords = [
  "PRAY",
  "TESTIFY",
  "STUDY THE WORD",
  "TEACH",
  "LOVE",
  "FORGIVE",
  "REPENT",
  "SING",
  "SMILE",
];

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [word, setWord] = useState('');

  useEffect(() => {
    // This effect runs on the client after hydration to avoid hydration mismatch
    const randomWord = transitionWords[Math.floor(Math.random() * transitionWords.length)];
    setWord(randomWord);
  }, [pathname]);

  return (
    // This outer div will contain the word as a background element
    <div className="relative">
      <div className="fixed inset-0 z-0 flex items-center justify-center p-8 bg-background">
        <div className="text-center max-w-2xl">
          <Flame className="mx-auto h-12 w-12 text-primary mb-6" />
          <p className="text-4xl md:text-5xl font-headline font-bold tracking-wider uppercase text-muted-foreground">
            {word}
          </p>
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
          transition={{ type: 'easeInOut', duration: 0.4 }}
          className="relative z-10 bg-background" // Give content a background to hide the transition screen underneath
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
