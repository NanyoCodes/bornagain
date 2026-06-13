'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, CheckCircle2, Info, Share, PlusSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export function PwaInstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');

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
              description: "Tap 'Share' and then 'Add to Home Screen' in Safari.",
          });
      } else {
          toast({
            title: "Installation Required",
            description: "Please open your browser menu and select 'Install App' or 'Add to Home Screen'.",
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
    <Card className="rounded-none sm:rounded-3xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b overflow-hidden bg-card/50 backdrop-blur-sm">
      <CardHeader className="p-6 sm:p-8">
        <CardTitle className="flex items-center gap-2 text-lg font-black font-headline uppercase tracking-tight">
          <Smartphone className="h-5 w-5 text-primary" /> 
          App Installation
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm font-medium">
          Install Testify on your phone for the best Kingdom experience.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 sm:p-8 pt-0 space-y-8">
        {isInstalled ? (
          <div className="flex items-center gap-4 text-green-600 font-bold bg-green-50 dark:bg-green-950/20 p-6 rounded-[2rem] border-2 border-dashed border-green-200 dark:border-green-900 animate-in fade-in zoom-in duration-500 shadow-inner">
            <CheckCircle2 className="h-8 w-8 shrink-0" />
            <div className="space-y-1">
                <p className="text-base font-black uppercase tracking-tight">Kingdom Ready</p>
                <p className="text-[10px] uppercase tracking-widest opacity-70">App is successfully installed</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-muted/20 rounded-[2rem] border-2 border-dashed border-muted-foreground/10">
                <div className="relative shrink-0">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-background shadow-xl">
                        <AvatarImage src={logo?.imageUrl} alt="Testify Logo" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary">T</AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full flex items-center justify-center border-2 border-background shadow-lg">
                        <Download className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                </div>
                <div className="space-y-2 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-primary font-black text-[10px] uppercase tracking-[0.3em]">
                        <Info className="h-4 w-4" />
                        Kingdom Identity
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium text-balance">
                        Add Testify to your home screen to access the harvest field instantly with your unique spiritual identity.
                    </p>
                </div>
            </div>

            {isIos ? (
                <div className="space-y-6 p-6 sm:p-8 bg-muted/30 rounded-[2rem] border-2 border-dashed border-primary/10 animate-in slide-in-from-bottom-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-primary" /> 
                        iPhone Setup
                    </h4>
                    <div className="space-y-6">
                        <div className="flex items-center gap-5">
                            <div className="h-12 w-12 rounded-2xl bg-background flex items-center justify-center border shadow-xl shrink-0">
                                <Share className="h-6 w-6 text-primary" />
                            </div>
                            <p className="text-sm font-bold text-muted-foreground leading-snug">
                                1. Tap the <span className="text-foreground font-black">Share</span> icon at the bottom of Safari.
                            </p>
                        </div>
                        <div className="flex items-center gap-5">
                            <div className="h-12 w-12 rounded-2xl bg-background flex items-center justify-center border shadow-xl shrink-0">
                                <PlusSquare className="h-6 w-6 text-primary" />
                            </div>
                            <p className="text-sm font-bold text-muted-foreground leading-snug">
                                2. Scroll down and tap <span className="text-foreground font-black">"Add to Home Screen"</span>.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <Button 
                        onClick={handleInstallClick} 
                        className="w-full font-black h-14 rounded-2xl shadow-xl shadow-primary/20 tracking-[0.2em] uppercase py-4"
                        variant="default"
                    >
                        <Download className="mr-2 h-5 w-5" />
                        INSTALL APP
                    </Button>
                    
                    {!deferredPrompt && (
                        <div className="p-5 bg-muted/20 rounded-2xl border border-dashed text-center">
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-relaxed text-balance">
                                Use <span className="text-foreground">Google Chrome</span> on Android to enable one-tap installation.
                            </p>
                        </div>
                    )}
                </div>
            )}
            
            <p className="text-[9px] text-center text-muted-foreground font-black uppercase tracking-[0.4em] opacity-30">
                PWA Version 1.2.0 • Mobilizing the Body
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
