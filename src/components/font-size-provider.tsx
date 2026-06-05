'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type FontSize = 'sm' | 'base' | 'lg' | 'xl';

interface FontSizeContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>('base');
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedSize = localStorage.getItem('app-font-size') as FontSize;
    if (savedSize && ['sm', 'base', 'lg', 'xl'].includes(savedSize)) {
      setFontSizeState(savedSize);
    }

    // Detect initial screen size and listen for changes
    const mql = window.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    localStorage.setItem('app-font-size', fontSize);
    
    /**
     * Scaling Matrix
     * Optimized to ensure 'Large' and 'XL' are readable but not intrusive on mobile.
     */
    const sizeMap: Record<FontSize, { mobile: string; desktop: string }> = {
      sm: { mobile: '13px', desktop: '14px' },
      base: { mobile: '15px', desktop: '16px' },
      lg: { mobile: '16.5px', desktop: '18px' },
      xl: { mobile: '18px', desktop: '21px' },
    };
    
    const targetSize = isMobile ? sizeMap[fontSize].mobile : sizeMap[fontSize].desktop;
    root.style.fontSize = targetSize;
  }, [fontSize, mounted, isMobile]);

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize: setFontSizeState }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}
