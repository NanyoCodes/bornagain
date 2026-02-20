'use client';

import { useState, useEffect } from 'react';
import type { DocumentReference, DocumentData, SnapshotOptions, FirestoreError } from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';
import { useUser } from '../auth/use-user';

interface UseDocOptions {
  snapshotOptions?: SnapshotOptions;
}

export function useDoc<T>(
  docRef: DocumentReference<DocumentData> | null,
  options?: UseDocOptions
) {
  const { user, loading: authLoading } = useUser();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    // While authentication is loading, we are in a loading state.
    if (authLoading) {
      setLoading(true);
      return;
    }

    // Once authentication is resolved, if there's no user or no docRef,
    // we can stop loading and conclude there's no data.
    if (!user || !docRef) {
      setLoading(false);
      setData(null);
      return;
    }

    // If we have a user and a docRef, start fetching data.
    setLoading(true);

    const unsubscribe = onSnapshot(
      docRef,
      (doc) => {
        if (doc.exists()) {
          setData({
            id: doc.id,
            ...doc.data(options?.snapshotOptions),
          } as T);
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        
        setError(err);
        setData(null); // Clear data on error
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [docRef, user, authLoading, options?.snapshotOptions]);

  return { data, loading, error };
}
