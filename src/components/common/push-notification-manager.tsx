'use client';

import { useEffect, useState } from 'react';
import { onMessage } from 'firebase/messaging';
import { useMessaging, useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useFcmToken } from '@/hooks/use-fcm-token';
import { Bell, Sparkles, X, ShieldCheck, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Manages foreground push notifications and permission requests.
 */
export function PushNotificationManager() {
  const messaging = useMessaging();
  const { toast } = useToast();
  const token = useFcmToken(); // This hook handles background token sync
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      
      // If permission is already granted, we don't need the prompt
      if (Notification.permission === 'default') {
        // Only show prompt after a short delay for better UX
        const timer = setTimeout(() => setShowPrompt(true), 10000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  useEffect(() => {
    if (!messaging) return;

    // Listen for foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      toast({
        title: payload.notification?.title || 'Kingdom Alert',
        description: payload.notification?.body || 'A new update is available in the Kingdom Network.',
      });
    });

    return () => unsubscribe();
  }, [messaging, toast]);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);
      
      if (result === 'granted') {
        toast({ title: 'Notifications Enabled!', description: 'You will now receive Kingdom alerts on this device.' });
        // The page will need to reload or wait for useFcmToken to pick up the change
        window.location.reload();
      } else {
        toast({ variant: 'destructive', title: 'Permission Denied', description: 'Alerts are disabled for this device.' });
      }
    } catch (err) {
      console.error('Permission request failed:', err);
    }
  };

  if (!showPrompt || permission !== 'default') return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 z-[100] animate-in slide-in-from-bottom-10 duration-700 text-left">
        <Card className="max-w-sm rounded-[2rem] shadow-2xl border-primary/20 bg-background/95 backdrop-blur-xl overflow-hidden text-left">
            <CardContent className="p-6 space-y-6 text-left">
                <div className="flex items-start gap-4 text-left">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 text-left">
                        <Bell className="h-6 w-6 text-primary animate-pulse text-left" />
                    </div>
                    <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2 mb-1 text-left">
                            <ShieldCheck className="h-3 w-3 text-primary text-left" />
                            <span className="text-[9px] font-black uppercase text-primary tracking-[0.2em] text-left">Kingdom Alert</span>
                        </div>
                        <h4 className="font-black text-sm uppercase tracking-tight text-left">Stay Connected</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium text-balance text-left">
                            Enable push notifications to receive real-time updates on your missions, partners, and shared miracles.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 text-left">
                    <Button variant="ghost" size="sm" onClick={() => setShowPrompt(false)} className="flex-1 rounded-xl h-10 font-bold text-left text-left">Later</Button>
                    <Button onClick={requestPermission} size="sm" className="flex-1 rounded-xl h-10 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 text-center text-left">
                        <Sparkles className="mr-1.5 h-3 w-3 text-left" />
                        ENABLE ALERTS
                    </Button>
                </div>
            </CardContent>
            <div className="absolute top-2 right-2 text-left">
                <Button variant="ghost" size="icon" onClick={() => setShowPrompt(false)} className="h-6 w-6 rounded-full opacity-30 text-left">
                    <X className="h-3 w-3 text-left" />
                </Button>
            </div>
        </Card>
    </div>
  );
}
