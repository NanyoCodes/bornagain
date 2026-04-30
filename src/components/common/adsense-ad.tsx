'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { DollarSign, ShieldCheck } from 'lucide-react';

type AdProvider = 'google' | 'custom' | 'other';

type AdsenseAdProps = {
  adSlot: string;
  adFormat?: string;
  style?: React.CSSProperties;
  className?: string;
  provider?: AdProvider;
};

/**
 * @fileOverview Flexible Ad component supporting Google AdSense and custom providers.
 */
const AdsenseAd = ({ adSlot, adFormat = 'auto', style, className, provider = 'google' }: AdsenseAdProps) => {
  const RAW_ADSENSE_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const ADSENSE_CLIENT_ID = RAW_ADSENSE_ID?.startsWith('ca-') ? RAW_ADSENSE_ID : `ca-${RAW_ADSENSE_ID}`;
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (provider === 'google' && RAW_ADSENSE_ID) {
      try {
        // @ts-ignore
        if (window.adsbygoogle) {
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch (err: any) {
        // Silently ignore errors related to multiple pushes or already-filled slots
        // which are common during React re-renders or navigations.
      }
    }
  }, [adSlot, provider, RAW_ADSENSE_ID]);

  const isGoogleConfigured = RAW_ADSENSE_ID && RAW_ADSENSE_ID !== 'ca-pub-YOUR_PUBLISHER_ID';

  return (
    <Card className={cn("w-full flex flex-col justify-center items-center bg-muted/20 rounded-lg border min-h-[350px] relative overflow-hidden", className)}>
      <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider bg-background/50 px-2 py-0.5 rounded-full z-10">
        <ShieldCheck className="h-3 w-3" />
        Sponsored
      </div>

      {provider === 'google' && isGoogleConfigured ? (
        <ins
          className='adsbygoogle'
          style={{ display: 'block', width: '100%', height: '100%', ...style }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={adSlot}
          data-ad-format={adFormat}
          data-full-width-responsive="true"
          // Hints for targeted content
          data-ad-channel="christian-content"
          data-ad-type="image_text"
        />
      ) : provider === 'custom' ? (
        <div className="text-center p-6 space-y-4">
           <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
             <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Custom Partner Ad</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
              Custom partner ad space.
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center p-6 space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
             <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Christian Partner Ad</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
              {isDevelopment 
                ? "This space is reserved for a relevant Christian advertisement." 
                : "Promoting faith-based initiatives and community growth."}
            </p>
          </div>
          {isDevelopment && !isGoogleConfigured && provider === 'google' && (
             <p className="text-[10px] text-destructive bg-destructive/10 p-1 rounded font-code">
               NEXT_PUBLIC_ADSENSE_CLIENT_ID not set
             </p>
          )}
        </div>
      )}
    </Card>
  );
};

export default AdsenseAd;
