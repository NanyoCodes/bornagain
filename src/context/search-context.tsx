'use client';

import React, { createContext, useState, useContext, Dispatch, SetStateAction } from 'react';

interface SearchContextType {
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  searchPlaceholder: string;
  setSearchPlaceholder: Dispatch<SetStateAction<string>>;
  isSearchVisible: boolean;
  setIsSearchVisible: Dispatch<SetStateAction<boolean>>;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchPlaceholder, setSearchPlaceholder] = useState('Search...');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const value = {
    searchTerm,
    setSearchTerm,
    searchPlaceholder,
    setSearchPlaceholder,
    isSearchVisible,
    setIsSearchVisible,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
