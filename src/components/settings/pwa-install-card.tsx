'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, CheckCircle2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PwaInstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);

    // Check if app is already installed or running in standalone mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://')
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
      toast({
        title: "Installation Instructions",
        description: "To install, tap the Share button in your browser and select 'Add to Home Screen'.",
      });
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
    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="h-5 w-5 text-primary" /> 
          App Installation
        </CardTitle>
        <CardDescription>
          Install Testify on your device for a faster, app-like experience.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isInstalled ? (
          <div className="flex items-center gap-3 text-green-600 font-bold bg-green-50 dark:bg-green-950/30 p-4 rounded-xl border border-green-200 dark:border-green-900">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="text-sm">Testify is successfully installed on this device.</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/20 rounded-xl p-4 border space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <Info className="h-3.5 w-3.5" />
                    Why Install?
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Installing Testify gives you a dedicated home screen icon, immersive full-screen mode, and a faster connection to the global harvest network.
                </p>
            </div>
            
            <Button 
                onClick={handleInstallClick} 
                className="w-full sm:w-auto font-black h-11 px-8 rounded-full shadow-md"
                variant={deferredPrompt ? "default" : "outline"}
            >
              <Download className="mr-2 h-4 w-4" />
              {deferredPrompt ? "SPEEDY INSTALL" : "ADD TO HOME SCREEN"}
            </Button>
            
            {!deferredPrompt && (
              <p className="text-[10px] text-muted-foreground italic px-1">
                Note: If using iOS/Safari, please use the browser's "Share" menu and select "Add to Home Screen" manually.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
