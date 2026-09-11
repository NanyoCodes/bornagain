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
  
  const activeQuery = useRef<Query<DocumentData> | null>(null);

  useEffect(() => {
    if (!query) {
      setData(null);
      setLoading(false);
      return;
    }

    // Check if the new query is logically equal to the current subscription
    // This is critical to avoid infinite re-renders when query objects are recreated.
    if (activeQuery.current && queryEqual(query, activeQuery.current)) {
      return;
    }

    activeQuery.current = query;
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
          const permissionError = new FirestorePermissionError({
            path: (query as any)._query?.path?.canonicalString() ?? 'unknown collection',
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
