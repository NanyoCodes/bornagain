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
  
  // Use a state to store the "active" query that we are subscribed to.
  // This allows us to compare the incoming query logically using queryEqual.
  const [activeQuery, setActiveQuery] = useState<Query<DocumentData> | null>(null);

  useEffect(() => {
    if (!query) {
      if (activeQuery !== null) setActiveQuery(null);
      return;
    }

    // Check if the new query is logically equal to the current subscription.
    // This prevents infinite loops when query objects are recreated on every render.
    if (!activeQuery || !queryEqual(query, activeQuery)) {
      setActiveQuery(query);
    }
  }, [query, activeQuery]);

  useEffect(() => {
    if (!activeQuery) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const unsubscribe = onSnapshot(
      activeQuery,
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
          const path = (activeQuery as any)._query?.path?.canonicalString() ?? 'unknown collection';
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
  }, [activeQuery, user, options?.snapshotOptions]);

  return { data, loading, error };
}
