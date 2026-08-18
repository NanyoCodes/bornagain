'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Cookie } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * @fileOverview A high-fidelity cookie consent banner for the Testify platform.
 * Allows users to explicitly accept or reject cookies for privacy compliance.
 */
export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already made a choice
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem('cookie_consent', 'rejected');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-[100] p-6 bg-background/95 backdrop-blur-md border shadow-2xl rounded-3xl max-w-md border-primary/10',
        'animate-in fade-in slide-in-from-bottom-10 duration-700'
      )}
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
             <Cookie className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-sm uppercase tracking-tight">Cookie Preferences</h4>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium text-balance">
              We use cookies to personalize your Kingdom experience and analyze platform traffic. You can choose to accept or reject them. 
              Read our <Link href="/privacy-policy" className="underline font-bold hover:text-primary">Privacy Policy</Link>.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleReject} 
            variant="outline" 
            size="sm" 
            className="flex-1 h-10 rounded-xl font-bold border-muted-foreground/20"
          >
            Reject
          </Button>
          <Button 
            onClick={handleAccept} 
            size="sm" 
            className="flex-1 h-10 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
          >
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
}
