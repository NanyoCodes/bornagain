'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '../ui/card';
import { DollarSign } from 'lucide-react';

type AdsenseAdProps = {
  adSlot: string;
  adFormat?: string;
  style?: React.CSSProperties;
  className?: string;
};

const AdsenseAd = ({ adSlot, adFormat = 'auto', style, className }: AdsenseAdProps) => {
  const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  useEffect(() => {
    try {
      // @ts-ignore
      if (window.adsbygoogle) {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err: any) {
      // This error is common in development with React's StrictMode and Fast Refresh.
      // It happens when the component re-renders and tries to push an ad to an
      // already filled slot. We can safely ignore this specific error message.
      if (!err.message.includes("already have ads in them")) {
        console.error('AdSense error:', err);
      }
    }
  }, [adSlot]);

  if (!ADSENSE_CLIENT_ID || ADSENSE_CLIENT_ID === 'ca-pub-YOUR_PUBLISHER_ID') {
    return null; 
  }

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <Card className={cn("w-full flex justify-center items-center bg-muted/30 rounded-lg border min-h-[300px] p-2 relative", className)}>
        {isDevelopment && (
            <div className="text-center text-muted-foreground z-0 space-y-2">
                <DollarSign className="h-12 w-12 mx-auto" />
                <p className="font-semibold mt-2">Advertisement</p>
                <p className="text-xs max-w-xs mx-auto">(Live ads will appear here in the deployed app. They are often blocked in development.)</p>
            </div>
        )}
        <ins
            className='adsbygoogle'
            style={{ display: 'block', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, ...style }}
            data-ad-client={ADSENSE_CLIENT_ID}
            data-ad-slot={adSlot}
            data-ad-format={adFormat}
            data-full-width-responsive="true"
        />
    </Card>
  );
};

export default AdsenseAd;
