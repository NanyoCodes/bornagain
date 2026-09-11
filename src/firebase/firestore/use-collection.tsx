'use client';

import { useState, useEffect, useRef } from 'react';
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
 * Optimized with deep logical equality checks to prevent infinite re-subscription loops
 * that occur when query objects are recreated on every render.
 */
export function useCollection<T extends { id: string }>(
  query: Query<DocumentData> | null,
  options?: UseCollectionOptions
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const { user } = useUser();
  
  // 1. Stabilize the query reference using logical equality
  const [stableQuery, setStableQuery] = useState<Query<DocumentData> | null>(query);

  useEffect(() => {
    if (!query) {
      if (stableQuery !== null) setStableQuery(null);
    } else if (!stableQuery || !queryEqual(query, stableQuery)) {
      setStableQuery(query);
    }
  }, [query, stableQuery]);

  // 2. Handle subscription only when the logical query actually changes
  useEffect(() => {
    if (!stableQuery) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const unsubscribe = onSnapshot(
      stableQuery,
      (snapshot) => {
        const result: T[] = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(options?.snapshotOptions) 
        } as T));
        
        setData(result);
        setLoading(false);
        setError(null);
      },
      async (err) => {
        if (err.code === 'permission-denied') {
          // Attempt to extract the path from the query object (internal API check)
          const path = (stableQuery as any)._query?.path?.canonicalString() || 'unknown path';
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
  }, [stableQuery, user, options?.snapshotOptions]);

  return { data, loading, error };
}
