'use client';

import { useState, useEffect } from 'react';
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
 * Optimized with deep logical equality checks to prevent infinite re-subscription loops.
 */
export function useDoc<T>(
  docRef: DocumentReference<DocumentData> | null,
  options?: UseDocOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const { user } = useUser();
  
  // 1. Stabilize the document reference
  const [stableRef, setStableRef] = useState<DocumentReference<DocumentData> | null>(docRef);

  useEffect(() => {
    if (!docRef) {
      if (stableRef !== null) setStableRef(null);
    } else if (!stableRef || !refEqual(docRef, stableRef)) {
      setStableRef(docRef);
    }
  }, [docRef, stableRef]);

  // 2. Handle subscription
  useEffect(() => {
    if (!stableRef) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    
    const unsubscribe = onSnapshot(
      stableRef,
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
              path: stableRef.path,
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
  }, [stableRef, user, options?.snapshotOptions]);

  return { data, loading, error };
}
