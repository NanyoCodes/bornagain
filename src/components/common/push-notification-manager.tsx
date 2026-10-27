'use client';

import { useEffect, useState } from 'react';
import { onMessage } from 'firebase/messaging';
import { useMessaging } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useFcmToken } from '@/hooks/use-fcm-token';
import { Bell, Sparkles, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Manages foreground push notifications and permission requests.
 */
export function PushNotificationManager() {
  const messaging = useMessaging();
  const { toast } = useToast();
  const token = useFcmToken();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
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
      }
    } catch (err) {
      console.error('Permission request failed:', err);
    }
  };

  if (!showPrompt || permission !== 'default') return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 z-[100] animate-in slide-in-from-bottom-10 duration-700">
        <Card className="max-w-sm rounded-3xl shadow-2xl border-primary/20 bg-background/95 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6 space-y-6">
                <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                        <Bell className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-black text-sm uppercase tracking-tight">Stay Connected</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                            Enable push notifications to receive real-time updates on your missions, partners, and shared miracles.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowPrompt(false)} className="flex-1 rounded-xl h-10 font-bold">Later</Button>
                    <Button onClick={requestPermission} size="sm" className="flex-1 rounded-xl h-10 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
                        <Sparkles className="mr-1.5 h-3 w-3" />
                        ENABLE ALERTS
                    </Button>
                </div>
            </CardContent>
            <div className="absolute top-2 right-2">
                <Button variant="ghost" size="icon" onClick={() => setShowPrompt(false)} className="h-6 w-6 rounded-full opacity-30">
                    <X className="h-3 w-3" />
                </Button>
            </div>
        </Card>
    </div>
  );
}
