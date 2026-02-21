
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
    // If there's no docRef or we are still authenticating,
    // we shouldn't proceed.
    if (!docRef || authLoading) {
      setLoading(authLoading);
      if (!authLoading) setData(null);
      return;
    }

    // This is a specific guard for docRefs that might be created
    // before the user ID is available, but auth is otherwise "loaded".
    if (!user) {
      setLoading(false);
      setData(null);
      return;
    }

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
        setData(null);
        setLoading(false);
      }
    );

    // Clean up the listener when the component unmounts or dependencies change.
    return () => unsubscribe();
  }, [docRef, options?.snapshotOptions, user, authLoading]);

  return { data, loading, error };
}

    