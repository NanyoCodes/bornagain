'use client';

import { useState, useEffect, useRef } from 'react';
import type { Query, DocumentData, SnapshotOptions, FirestoreError } from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';
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
  
  // Use a ref to track the actual query instance to prevent infinite loops
  // if the query is created inline in a component.
  const activeQuery = useRef<Query<DocumentData> | null>(null);

  useEffect(() => {
    if (!query) {
      setData(null);
      setLoading(false);
      return;
    }

    // Check if the new query is logically equal to the current subscription
    if (activeQuery.current && query.isEqual(activeQuery.current)) {
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
      (err) => {
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: (query as any)._query?.path?.canonicalString() ?? 'unknown collection',
            operation: 'list',
          }, user);
          errorEmitter.emit('permission-error', permissionError);
        } else {
          console.error("Firestore error in useCollection:", err);
        }
        
        setError(err);
        setData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
    // Stringify options to ensure stable dependency check
  }, [query, user, JSON.stringify(options?.snapshotOptions)]);

  return { data, loading, error };
}
