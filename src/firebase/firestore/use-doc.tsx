'use client';

import { useState, useEffect } from 'react';
import type { DocumentReference, DocumentData, SnapshotOptions, FirestoreError } from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

interface UseDocOptions {
  snapshotOptions?: SnapshotOptions;
}

export function useDoc<T>(
  docRef: DocumentReference<DocumentData> | null,
  options?: UseDocOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!docRef) {
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
        // In many cases, a permission-denied error is thrown during page transitions
        // or logouts when a listener is being cleaned up. We can often ignore these
        // as they are part of the normal component lifecycle. We'll log a warning
        // but won't throw a blocking error.
        if (err.code === 'permission-denied') {
            console.warn(`Firestore permission denied on doc listener for path: ${docRef.path}. This might be a transient error during navigation or logout.`);
        } else {
            const permissionError = new FirestorePermissionError({
              path: docRef.path,
              operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        
        setError(err);
        setData(null);
        setLoading(false);
      }
    );

    // Clean up the listener when the component unmounts or dependencies change.
    return () => unsubscribe();
  }, [docRef, options?.snapshotOptions]);

  return { data, loading, error };
}
