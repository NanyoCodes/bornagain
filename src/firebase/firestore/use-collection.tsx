'use client';

import { useState, useEffect, useRef } from 'react';
import type { Query, DocumentData, SnapshotOptions, FirestoreError } from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

interface UseCollectionOptions {
  snapshotOptions?: SnapshotOptions;
}

export function useCollection<T extends { id: string }>(
  query: Query<DocumentData> | null,
  options?: UseCollectionOptions
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  
  // Ref to hold a map of previous data by ID for stable object references
  const dataMapRef = useRef<Map<string, T>>(new Map());

  useEffect(() => {
    if (!query) {
      setLoading(false);
      setData(null);
      dataMapRef.current.clear(); // Clear the ref when there's no query
      return;
    }

    setLoading(true);
    
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const newDocs = snapshot.docs;
        const currentMap = dataMapRef.current;
        const newMap = new Map<string, T>();

        const result = newDocs.map(doc => {
          const newDocData = { id: doc.id, ...doc.data(options?.snapshotOptions) } as T;
          const oldDocData = currentMap.get(doc.id);
          
          // A cheap way to deep compare. Not perfect for objects with functions or undefined, but good for Firestore data.
          if (oldDocData && JSON.stringify(oldDocData) === JSON.stringify(newDocData)) {
            newMap.set(doc.id, oldDocData); // Preserve old object identity
            return oldDocData;
          } else {
            newMap.set(doc.id, newDocData); // Use new object
            return newDocData;
          }
        });
        
        dataMapRef.current = newMap;
        setData(result);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: (query as any)._query?.path?.canonicalString() ?? 'unknown collection',
            operation: 'list',
          });
          errorEmitter.emit('permission-error', permissionError);
        } else {
          // For other types of Firestore errors (e.g., network, invalid query)
          console.error("Firestore error in useCollection:", err);
        }
        
        setError(err);
        setData(null);
        setLoading(false);
      }
    );

    // Clean up the listener when the component unmounts or dependencies change.
    return () => {
      unsubscribe();
      dataMapRef.current.clear();
    };
  }, [query, options?.snapshotOptions]);

  return { data, loading, error };
}
