'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import React, { useMemo } from 'react';

const variants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -15 },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Use memo to ensure the transition wrapper only responds to actual path changes
  return (
    <div className="relative h-full">
      <AnimatePresence
        mode="wait"
        initial={false}
      >
        <motion.div
          key={pathname}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ type: 'easeInOut', duration: 0.3 }}
          className="relative z-10 bg-background h-full flex flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
