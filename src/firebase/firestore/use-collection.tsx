'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Query, DocumentData, SnapshotOptions, FirestoreError } from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';

interface UseCollectionOptions {
  snapshotOptions?: SnapshotOptions;
}

// Custom hook to memoize Firestore queries
const useMemoizedQuery = (query: Query<DocumentData> | null): Query<DocumentData> | null => {
  const queryKey = query ? JSON.stringify({ path: query.path, filters: (query as any)._query.filters, orderBy: (query as any)._query.orderBy }) : null;

  return useMemo(() => {
    return query;
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
        console.error("Firestore Error in useCollection:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedQuery, options?.snapshotOptions]);

  return { data, loading, error };
}
