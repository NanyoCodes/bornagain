'use client';

import { SearchProvider } from '@/context/search-context';

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return (
      <SearchProvider>
        <div className="h-dvh">
            {children}
        </div>
      </SearchProvider>
    );
}
