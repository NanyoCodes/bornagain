'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  onSnapshot, 
  refEqual, 
  type DocumentReference, 
  type DocumentData, 
  type SnapshotOptions, 
  type FirestoreError 
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';
import { useUser } from '../auth/use-user';

interface UseDocOptions {
  snapshotOptions?: SnapshotOptions;
}

/**
 * useDoc Hook
 * Stabilized with refEqual to prevent infinite re-render cycles when doc references are created inline.
 */
export function useDoc<T>(
  docRef: DocumentReference<DocumentData> | null,
  options?: UseDocOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const { user } = useUser();
  
  // 1. Stabilize the reference
  const [memoizedRef, setMemoizedRef] = useState<DocumentReference<DocumentData> | null>(docRef);

  useEffect(() => {
    if (!docRef) {
      setMemoizedRef(null);
    } else if (!memoizedRef || !refEqual(docRef, memoizedRef)) {
      setMemoizedRef(docRef);
    }
  }, [docRef, memoizedRef]);

  // 2. Handle subscription
  useEffect(() => {
    if (!memoizedRef) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    
    const unsubscribe = onSnapshot(
      memoizedRef,
      (doc) => {
        const newDocData = doc.exists()
          ? ({
              id: doc.id,
              ...doc.data(options?.snapshotOptions),
            } as T)
          : null;

        setData(newDocData);
        setLoading(false);
        setError(null);
      },
      async (err) => {
        if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: memoizedRef.path,
              operation: 'get',
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        }
        
        setError(err);
        setData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedRef, user, options?.snapshotOptions]);

  return { data, loading, error };
}
