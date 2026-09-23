'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
 * Optimized with deep logical equality checks and ref-based stabilization to prevent infinite re-subscription loops.
 */
export function useDoc<T>(
  docRef: DocumentReference<DocumentData> | null,
  options?: UseDocOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const { user } = useUser();
  
  // Stabilize the document reference logically without triggering extra state updates
  const stableRef = useRef<DocumentReference<DocumentData> | null>(null);
  if (docRef === null) {
      stableRef.current = null;
  } else if (!stableRef.current || !refEqual(docRef, stableRef.current)) {
      stableRef.current = docRef;
  }

  // Stabilize options to prevent loops when inline objects are passed
  const snapshotOptionsJson = JSON.stringify(options?.snapshotOptions);
  const stableOptions = useMemo(() => options?.snapshotOptions, [snapshotOptionsJson]);

  useEffect(() => {
    const currentRef = stableRef.current;
    if (!currentRef) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const unsubscribe = onSnapshot(
      currentRef,
      (doc) => {
        const newDocData = doc.exists()
          ? ({
              id: doc.id,
              ...doc.data(stableOptions),
            } as T)
          : null;

        setData(newDocData);
        setLoading(false);
        setError(null);
      },
      async (err) => {
        if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: currentRef.path,
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
  }, [stableRef.current, user?.uid, stableOptions]);

  return { data, loading, error };
}
