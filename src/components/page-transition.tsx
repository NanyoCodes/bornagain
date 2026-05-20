'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';

const variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const kingdomTaglines = [
  "Preparing your mission field...",
  "Connecting the global Body of Christ...",
  "Gathering the testimonies of the saints...",
  "Mobilizing the harvest workforce...",
  "Recording today's miracles...",
  "Equipping the saints for every good work...",
  "Strengthening community bonds...",
  "Glorifying God through every soul won...",
  "The harvest is plenteous...",
  "Faith expressed through technology...",
  "Building the Kingdom, one life at a time...",
  "Strengthening your hands for the work...",
  "Readying the tools for the Gospel...",
  "Walking in the light of His Word...",
  "The workers are being sent...",
  "Recording the goodness of the Lord...",
];

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tagline, setTagline] = useState("");

  useEffect(() => {
    // Choose a random tagline on every path change
    const randomIndex = Math.floor(Math.random() * kingdomTaglines.length);
    setTagline(kingdomTaglines[randomIndex]);
  }, [pathname]);

  return (
    <div className="relative h-full w-full">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ 
            type: 'spring',
            stiffness: 260,
            damping: 30,
            duration: 0.2
          }}
          className="relative z-10 bg-background h-full flex flex-col"
        >
          {/* Subtle tagline overlay during transition exit */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50 pointer-events-none"
          >
             <div className="text-center space-y-4 px-6 max-w-sm">
                <p className="text-primary font-headline text-2xl italic animate-pulse leading-tight">
                    {tagline}
                </p>
                <div className="h-1 w-24 bg-primary/10 rounded-full mx-auto overflow-hidden">
                    <motion.div 
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                        className="h-full w-1/2 bg-primary rounded-full"
                    />
                </div>
             </div>
          </motion.div>
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
