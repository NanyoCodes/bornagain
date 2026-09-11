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
 * Stabilized with logical equality checks to prevent infinite re-subscription loops.
 */
export function useCollection<T extends { id: string }>(
  query: Query<DocumentData> | null,
  options?: UseCollectionOptions
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const { user } = useUser();
  
  // 1. Stabilize the query reference to prevent infinite effect triggers
  const [memoizedQuery, setMemoizedQuery] = useState<Query<DocumentData> | null>(query);

  useEffect(() => {
    if (!query) {
      setMemoizedQuery(null);
    } else if (!memoizedQuery || !queryEqual(query, memoizedQuery)) {
      setMemoizedQuery(query);
    }
  }, [query, memoizedQuery]);

  // 2. Handle subscription only when the logical query actually changes
  useEffect(() => {
    if (!memoizedQuery) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const unsubscribe = onSnapshot(
      memoizedQuery,
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
          const path = (memoizedQuery as any)._query?.path?.canonicalString() || 'unknown path';
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
  }, [memoizedQuery, user, options?.snapshotOptions]);

  return { data, loading, error };
}
