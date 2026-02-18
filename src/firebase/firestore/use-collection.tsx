
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Query, DocumentData, SnapshotOptions, FirestoreError } from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

interface UseCollectionOptions {
  snapshotOptions?: SnapshotOptions;
}

function getQueryPath(q: Query<DocumentData>): string {
    // This is a hack to get the path from a query.
    // It uses internal properties of the Firestore SDK.
    // This might break in future versions of the SDK.
    return (q as any)._query?.path?.canonicalString() ?? '';
}

// Custom hook to memoize Firestore queries
const useMemoizedQuery = (query: Query<DocumentData> | null): Query<DocumentData> | null => {
  const queryKey = query ? JSON.stringify({ path: getQueryPath(query), filters: (query as any)._query.filters, orderBy: (query as any)._query.orderBy }) : null;

  return useMemo(() => {
    return query;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);
};


export function useCollection<T extends { id: string }>(
  query: Query<DocumentData> | null,
  options?: UseCollectionOptions
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  const memoizedQuery = useMemoizedQuery(query);

  useEffect(() => {
    if (!memoizedQuery) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
        memoizedQuery,
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
          path: getQueryPath(memoizedQuery),
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedQuery, options?.snapshotOptions]);

  return { data, loading, error };
}
