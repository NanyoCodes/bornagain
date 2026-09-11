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

export function useDoc<T>(
  docRef: DocumentReference<DocumentData> | null,
  options?: UseDocOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const { user } = useUser();
  
  // Use a ref to track the actual reference instance to prevent infinite loops
  const activeRef = useRef<DocumentReference<DocumentData> | null>(null);

  useEffect(() => {
    if (!docRef) {
      setLoading(false);
      setData(null);
      return;
    }

    // Check if the new ref is logically equal to the current subscription
    // using the SDK's refEqual utility to prevent unnecessary re-runs.
    if (activeRef.current && refEqual(docRef, activeRef.current)) {
      return;
    }

    activeRef.current = docRef;
    setLoading(true);
    
    const unsubscribe = onSnapshot(
      docRef,
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
              path: docRef.path,
              operation: 'get',
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Firestore error in useDoc:", err);
        }
        
        setError(err);
        setData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [docRef, user, options?.snapshotOptions]);

  return { data, loading, error };
}
