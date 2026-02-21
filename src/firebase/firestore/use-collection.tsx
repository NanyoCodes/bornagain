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

function getQueryPath(q: Query<DocumentData>): string {
    // This is a hack to get the path from a query.
    // This might break in future versions of the SDK.
    return (q as any)._query?.path?.canonicalString() ?? '';
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
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user || !query) {
      setLoading(false);
      setData(null);
      return;
    }
    
    setLoading(true);
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const result: T[] = [];
        snapshot.forEach((doc) => {
          result.push({
            id: doc.id,
            ...doc.data(options?.snapshotOptions),
          } as T);
        });
        setData(result);
        setLoading(false);
        setError(null);
      },
      (err) => {
        const permissionError = new FirestorePermissionError({
          path: getQueryPath(query),
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        
        setError(err);
        setData(null); // Clear data on error
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query, user?.uid, authLoading, options?.snapshotOptions]);

  return { data, loading, error };
}
