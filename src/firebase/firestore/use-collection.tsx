'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  onSnapshot, 
  queryEqual, 
  type Query, 
  type DocumentData, 
  type SnapshotOptions, 
  type FirestoreError 
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';
import { useUser } from '../auth/use-user';

interface UseCollectionOptions {
  snapshotOptions?: SnapshotOptions;
}

/**
 * useCollection Hook
 * Optimized with deep logical equality checks and ref-based stabilization to prevent infinite re-subscription loops.
 */
export function useCollection<T extends { id: string }>(
  query: Query<DocumentData> | null,
  options?: UseCollectionOptions
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const { user } = useUser();
  
  // Stabilize the query reference logically without triggering extra state updates
  const stableQuery = useRef<Query<DocumentData> | null>(null);
  if (query === null) {
      stableQuery.current = null;
  } else if (!stableQuery.current || !queryEqual(query, stableQuery.current)) {
      stableQuery.current = query;
  }

  // Stabilize options to prevent loops when inline objects are passed
  const snapshotOptionsJson = JSON.stringify(options?.snapshotOptions);
  const stableOptions = useMemo(() => options?.snapshotOptions, [snapshotOptionsJson]);

  useEffect(() => {
    const currentQuery = stableQuery.current;
    if (!currentQuery) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const unsubscribe = onSnapshot(
      currentQuery,
      (snapshot) => {
        const result: T[] = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(stableOptions) 
        } as T));
        
        setData(result);
        setLoading(false);
        setError(null);
      },
      async (err) => {
        if (err.code === 'permission-denied') {
          // Attempt to extract the path for better debugging
          let path = 'unknown path';
          try {
              if ((currentQuery as any).path) {
                  path = (currentQuery as any).path;
              } else if ((currentQuery as any)._query?.path) {
                  path = (currentQuery as any)._query.path.canonicalString();
              }
          } catch (e) {}

          const permissionError = new FirestorePermissionError({
            path,
            operation: 'list',
          }, user);
          errorEmitter.emit('permission-error', permissionError);
        }
        
        setError(err);
        setData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [stableQuery.current, user?.uid, stableOptions]);

  return { data, loading, error };
}
