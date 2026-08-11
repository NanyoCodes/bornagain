'use client';

/**
 * @fileOverview This layout wrapper removed unnecessary legacy dashboard structure
 * to provide a clean takeover view for the Bible module.
 */

export default function BibleTakeoverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh w-full">
        {children}
    </div>
  );
}
