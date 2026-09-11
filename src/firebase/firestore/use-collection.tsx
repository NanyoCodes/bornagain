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

export function useCollection<T extends { id: string }>(
  query: Query<DocumentData> | null,
  options?: UseCollectionOptions
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const { user } = useUser();
  
  // Use a ref to track the current query to avoid infinite loops
  // with logically identical but referentially different queries.
  const queryRef = useRef<Query<DocumentData> | null>(null);

  useEffect(() => {
    if (!query) {
      setData(null);
      setLoading(false);
      queryRef.current = null;
      return;
    }

    // Identify if the new query is logically equivalent to the current one
    // This is the critical fix for "Maximum update depth exceeded" errors
    if (queryRef.current && queryEqual(query, queryRef.current)) {
      return;
    }

    queryRef.current = query;
    setLoading(true);
    
    const unsubscribe = onSnapshot(
      query,
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
          // Attempt to extract the path from the internal query object for debugging context
          const path = (query as any)._query?.path?.canonicalString() || 'unknown path';
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
  }, [query, user, options?.snapshotOptions]);

  return { data, loading, error };
}
