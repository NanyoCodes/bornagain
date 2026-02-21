'use client';

import { useState, useEffect } from 'react';
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
  const { user, loading: authLoading } = useUser();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    // While authentication is loading, we are in a loading state.
    if (authLoading) {
      setLoading(true);
      return;
    }

    // If authentication is finished but there is no user, or if no query is provided,
    // we should not fetch data.
    if (!user || !query) {
      setLoading(false);
      setData(null);
      return;
    }

    // A user and query are available, so we can attempt to fetch data.
    setLoading(true);
    
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const result: T[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(options?.snapshotOptions),
        } as T));
        setData(result);
        setLoading(false);
        setError(null);
      },
      (err) => {
        // This is the error path.
        const permissionError = new FirestorePermissionError({
          path: (query as any)._query?.path?.canonicalString() ?? 'unknown',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        
        setError(err);
        setData(null);
        setLoading(false);
      }
    );

    // Clean up the listener when the component unmounts or dependencies change.
    return () => unsubscribe();
  }, [user?.uid, query, authLoading, options?.snapshotOptions]);

  return { data, loading, error };
}
