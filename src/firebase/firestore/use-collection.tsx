'use client';

import { useState, useEffect } from 'react';
import type { Query, DocumentData, SnapshotOptions, FirestoreError } from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

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

  useEffect(() => {
    if (!query) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const result: T[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(options?.snapshotOptions) } as T));
        setData(result);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: (query as any)._query?.path?.canonicalString() ?? 'unknown collection',
            operation: 'list',
          });
          errorEmitter.emit('permission-error', permissionError);
        } else {
          console.error("Firestore error in useCollection:", err);
        }
        
        setError(err);
        setData(null);
        setLoading(false);
      }
    );

    // Clean up the listener when the component unmounts or dependencies change.
    return () => unsubscribe();
  // The dependency array is intentionally simple. We don't want to re-run this effect
  // for every change in snapshotOptions, as that would re-create the listener.
  // The options are passed directly to `doc.data()`, which uses them on-the-fly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return { data, loading, error };
}
