'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, CheckCircle2, Info, Share, PlusSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function PwaInstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);

    // iOS detection logic
    const isIosDevice = typeof window !== 'undefined' && 
      (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    setIsIos(isIosDevice);

    // Check if app is already installed or running in standalone mode
    if (
      typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://')
      )
    ) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast({
        title: "App Installed!",
        description: "Testify has been successfully added to your home screen.",
      });
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIos) {
          toast({
              title: "iOS Installation",
              description: "Tap 'Share' and then 'Add to Home Screen'.",
          });
      } else {
          toast({
            title: "Installation Instructions",
            description: "To install, open your browser menu and select 'Install App' or 'Add to Home Screen'.",
          });
      }
      return;
    }

    // Show the prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast({
        title: "Installing...",
        description: "Testify is being added to your device.",
      });
    }
    
    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
  };

  if (!mounted) return null;

  return (
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b overflow-hidden">
      <CardHeader className="p-6">
        <CardTitle className="flex items-center gap-2 text-lg font-black font-headline uppercase tracking-tight">
          <Smartphone className="h-5 w-5 text-primary" /> 
          App Installation
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm font-medium">
          Install Testify on your phone for the best Kingdom experience.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-6">
        {isInstalled ? (
          <div className="flex items-center gap-3 text-green-600 font-bold bg-green-50 dark:bg-green-950/30 p-5 rounded-2xl border-2 border-dashed border-green-200 dark:border-green-900 animate-in fade-in zoom-in duration-500">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <div className="space-y-0.5">
                <p className="text-sm">App Installed Successfully</p>
                <p className="text-[10px] uppercase tracking-widest opacity-70">Kingdom Ready</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-primary/5 rounded-2xl p-5 border-2 border-dashed border-primary/20 space-y-3">
                <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.2em]">
                    <Info className="h-3.5 w-3.5" />
                    Why Install?
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    Get a dedicated home screen icon, immersive full-screen mode, and a faster connection to the global harvest network.
                </p>
            </div>

            {isIos ? (
                <div className="space-y-5 p-5 bg-muted/30 rounded-2xl border border-dashed animate-in slide-in-from-bottom-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Smartphone className="h-3.5 w-3.5" /> 
                        iPhone Instructions
                    </h4>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border shadow-sm shrink-0">
                                <Share className="h-5 w-5 text-primary" />
                            </div>
                            <p className="text-xs font-medium text-muted-foreground leading-snug">
                                1. Tap the <span className="font-bold text-foreground">Share</span> button at the bottom of Safari.
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border shadow-sm shrink-0">
                                <PlusSquare className="h-5 w-5 text-primary" />
                            </div>
                            <p className="text-xs font-medium text-muted-foreground leading-snug">
                                2. Scroll down and tap <span className="font-bold text-foreground">"Add to Home Screen"</span>.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <Button 
                        onClick={handleInstallClick} 
                        className="w-full font-black h-12 rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase py-3"
                        variant={deferredPrompt ? "default" : "outline"}
                    >
                        <Download className="mr-2 h-5 w-5" />
                        {deferredPrompt ? "INSTALL NOW" : "CHECK COMPATIBILITY"}
                    </Button>
                    
                    {!deferredPrompt && (
                        <div className="p-4 bg-muted/20 rounded-xl border text-center">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter leading-relaxed">
                                Use <span className="font-black text-foreground">Google Chrome</span> on Android to enable one-tap installation.
                            </p>
                        </div>
                    )}
                </div>
            )}
            
            <p className="text-[9px] text-center text-muted-foreground font-bold uppercase tracking-widest opacity-50">
                PWA Version 1.2.0 • Mobilizing the Body
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
