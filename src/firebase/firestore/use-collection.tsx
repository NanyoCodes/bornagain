
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
    // It uses internal properties of the Firestore SDK.
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
    // This guard ensures that we do not attempt to subscribe to a query
    // until the user is fully authenticated.
    if (!query || authLoading || !user) {
      setData(null);
      setLoading(false);
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
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query, options?.snapshotOptions, authLoading, user]);

  return { data, loading, error };
}
