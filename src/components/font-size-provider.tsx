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

  useEffect(() => {
    setMounted(true);
    const savedSize = localStorage.getItem('app-font-size') as FontSize;
    if (savedSize && ['sm', 'base', 'lg', 'xl'].includes(savedSize)) {
      setFontSizeState(savedSize);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    localStorage.setItem('app-font-size', fontSize);
    
    const sizeMap: Record<FontSize, string> = {
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
    };
    
    root.style.fontSize = sizeMap[fontSize];
  }, [fontSize, mounted]);

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
