'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';

const variants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -15 },
};

const kingdomTaglines = [
  "Recording the miracles of today...",
  "The harvest is plenteous...",
  "Equipping the saints for the harvest...",
  "Glorifying God through technology...",
  "Strengthening the global Body of Christ...",
  "Sharing the goodness of Jesus...",
  "Mobilizing the workforce for the Kingdom...",
  "Building the Kingdom on Earth...",
  "Faith expressed through technology...",
];

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tagline, setTagline] = useState("");

  useEffect(() => {
    // Choose a random tagline on every path change
    setTagline(kingdomTaglines[Math.floor(Math.random() * kingdomTaglines.length)]);
  }, [pathname]);

  return (
    <div className="relative h-full">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ type: 'easeInOut', duration: 0.3 }}
          className="relative z-10 bg-background h-full flex flex-col"
        >
          {/* Subtle tagline overlay during transition exit */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-background z-50 pointer-events-none"
          >
             <p className="text-primary font-headline text-xl italic animate-pulse px-6 text-center">{tagline}</p>
          </motion.div>
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}