'use client';

import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

/**
 * @fileOverview A high-fidelity splash screen for the Testify platform.
 * Displays the logo and mission statement with elegant animations.
 */

export function SplashScreen() {
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');
  const logoUrl = logo?.imageUrl;

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background p-6"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-8"
      >
        <div className="relative">
            <motion.div 
                animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, 2, -2, 0]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
                <Avatar className="h-32 w-32 sm:h-48 sm:w-48 shadow-2xl ring-8 ring-primary/10 border-4 border-background">
                  <AvatarImage src={logoUrl} alt="Testify Logo" />
                  <AvatarFallback className="text-4xl bg-primary/10 text-primary font-black">T</AvatarFallback>
                </Avatar>
            </motion.div>
            <motion.div 
                className="absolute -top-4 -right-4 h-12 w-12 bg-primary/20 rounded-full blur-2xl animate-pulse"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
            />
        </div>
        
        <div className="text-center space-y-4">
            <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                className="text-4xl sm:text-6xl font-black font-headline tracking-tighter text-primary uppercase"
            >
                Testify
            </motion.h1>
            <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.2, duration: 1 }}
                className="text-muted-foreground uppercase font-black tracking-[0.4em] text-[10px] sm:text-xs max-w-[280px] mx-auto leading-relaxed"
            >
                Empowering the Harvest through Technology
            </motion.p>
        </div>
      </motion.div>

      <div className="absolute bottom-16 flex flex-col items-center gap-4">
          <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                        opacity: [0.2, 1, 0.2],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    className="h-1.5 w-1.5 rounded-full bg-primary"
                  />
              ))}
          </div>
          <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">Kingdom Network Active</p>
      </div>
    </motion.div>
  );
}
