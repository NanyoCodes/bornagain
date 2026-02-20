
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
  const { user, loading: authLoading } = useUser(); // Get auth loading state
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    // Wait until authentication is resolved and a query is provided.
    if (authLoading || !query) {
      // If auth is loading, we are definitely in a loading state.
      // If there's no query, we are not loading data for that query.
      setLoading(authLoading);
      setData(null);
      return;
    }

    // At this point, auth is resolved. If there is no user, they are logged out.
    // Don't attempt to fetch data that requires authentication.
    if (!user) {
      setLoading(false);
      setData(null);
      // We can optionally set an error here, but for now, just returning is fine
      // as components should handle the null data state.
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
  }, [query, user, authLoading, options?.snapshotOptions]); // Add authLoading to dependencies

  return { data, loading, error };
}
