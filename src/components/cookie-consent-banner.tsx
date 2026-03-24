'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Cookie } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // This code runs only on the client
    const consent = localStorage.getItem('cookie_consent');
    if (consent !== 'accepted') {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg',
        'data-[state=visible]:animate-in data-[state=hidden]:animate-out',
        'data-[state=hidden]:slide-out-to-bottom data-[state=visible]:slide-in-from-bottom',
        'transition-all duration-500'
      )}
      data-state={isVisible ? 'visible' : 'hidden'}
    >
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Cookie className="h-5 w-5 shrink-0" />
          <p>
            We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies. See our{' '}
            <Link href="/privacy-policy" className="underline font-semibold hover:text-primary">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <Button onClick={handleAccept} size="sm" className="w-full sm:w-auto shrink-0">
          Accept
        </Button>
      </div>
    </div>
  );
}
