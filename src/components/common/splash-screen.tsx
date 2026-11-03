'use client';

import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '../ui/button';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

const splashScriptures = [
  "Are you BornAgain? Make known among the nations what He has done.",
  "I will speak of Your statutes before kings and will not be put to shame.",
  "Publish His glorious deeds among the nations. Tell everyone about the amazing things He does.",
  "For we cannot help speaking about what we have seen and heard.",
  "Go home to your own people and tell them how much the Lord has done for you."
];

/**
 * @fileOverview A high-fidelity splash screen for the BornAgain platform.
 */

interface SplashScreenProps {
  onDismiss?: () => void;
}

export function SplashScreen({ onDismiss }: SplashScreenProps) {
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');
  const logoUrl = logo?.imageUrl;
  const [activeScripture, setActiveScripture] = useState(splashScriptures[0]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * splashScriptures.length);
    setActiveScripture(splashScriptures[randomIndex]);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background p-6 text-left"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-8 w-full max-w-sm text-left"
      >
        <div className="relative text-left">
            <motion.div 
                animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, 2, -2, 0]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
                <Avatar className="h-32 w-32 sm:h-48 sm:w-48 shadow-2xl ring-8 ring-primary/10 border-4 border-background text-left">
                  <AvatarImage src={logoUrl} alt="BornAgain Logo" className="text-left" />
                  <AvatarFallback className="text-4xl bg-primary/10 text-primary font-black text-left">B</AvatarFallback>
                </Avatar>
            </motion.div>
            <motion.div 
                className="absolute -top-4 -right-4 h-12 w-12 bg-primary/20 rounded-full blur-2xl animate-pulse text-left"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
            />
        </div>
        
        <div className="text-center space-y-4 text-left">
            <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                className="text-muted-foreground uppercase font-black tracking-[0.2em] text-[10px] sm:text-xs max-w-[280px] mx-auto leading-relaxed text-center text-left"
            >
                {activeScripture}
            </motion.p>
            <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.1, duration: 1 }}
                className="text-primary font-black uppercase tracking-[0.1em] text-[9px] sm:text-[10px] px-4 text-center text-left"
            >
                When you share your story, the Glory goes to Jesus.
            </motion.p>
        </div>

        {onDismiss && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.4, duration: 1 }}
            className="w-auto pt-4 text-left"
          >
            <Button 
              onClick={onDismiss}
              className="w-auto h-11 px-10 rounded-full font-black tracking-widest uppercase shadow-xl shadow-primary/20 text-[10px] group text-left border-2 border-primary/20 hover:scale-105 transition-transform"
            >
              WITNESS THE GLORY
            </Button>
          </motion.div>
        )}
      </motion.div>

      <div className="absolute bottom-12 flex flex-col items-center gap-4 text-left">
          <div className="flex gap-2 text-left">
              {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                        opacity: [0.2, 1, 0.2],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    className="h-1.5 w-1.5 rounded-full bg-primary text-left"
                  />
              ))}
          </div>
          <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] flex items-center gap-2 text-left">
            <Sparkles className="h-3 w-3 text-left" />
            BornAgain Network Active
          </p>
      </div>
    </motion.div>
  );
}
