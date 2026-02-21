
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
    // If there's no query or we are still authenticating,
    // we shouldn't proceed.
    if (!query || authLoading) {
      setLoading(authLoading);
      if (!authLoading) setData(null);
      return;
    }
    
    // This is a specific guard for queries that might be created
    // before the user ID is available, but auth is otherwise "loaded".
    // It prevents a query from running with an undefined UID.
    if (!user) {
        setLoading(false);
        setData(null);
        return;
    }

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
          path: (query as any)._query?.path?.canonicalString() ?? 'unknown collection',
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
  }, [query, options?.snapshotOptions, user, authLoading]);

  return { data, loading, error };
}

    