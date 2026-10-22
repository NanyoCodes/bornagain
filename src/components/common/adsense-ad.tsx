'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '../ui/card';
import { ShieldCheck } from 'lucide-react';

type AdsenseAdProps = {
  adSlot: string;
  className?: string;
};

/**
 * @fileOverview Standard component for Google AdSense banners.
 * Configured for non-intrusive integration into the Kingdom feed.
 * Includes status checks to prevent multiple injection errors.
 */
export function AdsenseAd({ adSlot, className }: AdsenseAdProps) {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle && adRef.current) {
        // Ensure we only push once per slot instance in the DOM
        if (!adRef.current.getAttribute('data-adsbygoogle-status')) {
          (window as any).adsbygoogle.push({});
        }
      }
    } catch (err) {
      console.error("AdSense injection error:", err);
    }
  }, [adSlot]);

  return (
    <Card className={cn(
        "w-full overflow-hidden border-none shadow-none bg-transparent flex flex-col items-center justify-center min-h-[100px] py-4 px-4 sm:px-0 text-left",
        className
    )}>
      <div className="w-full flex items-center justify-center gap-2 mb-2 opacity-20 text-left">
          <ShieldCheck className="h-3 w-3 text-left" />
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-left text-left">Kingdom Partner Network</span>
      </div>
      <div className="w-full max-w-2xl bg-muted/20 rounded-xl overflow-hidden text-left">
        <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-5186166468494737"
            data-ad-slot={adSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
        />
      </div>
    </Card>
  );
}
