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

export function useDoc<T>(
  docRef: DocumentReference<DocumentData> | null,
  options?: UseDocOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const { user } = useUser();
  
  const [activeRef, setActiveRef] = useState<DocumentReference<DocumentData> | null>(null);

  useEffect(() => {
    if (!docRef) {
      if (activeRef !== null) setActiveRef(null);
      return;
    }

    if (!activeRef || !refEqual(docRef, activeRef)) {
      setActiveRef(docRef);
    }
  }, [docRef, activeRef]);

  useEffect(() => {
    if (!activeRef) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    
    const unsubscribe = onSnapshot(
      activeRef,
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
              path: activeRef.path,
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
  }, [activeRef, user, options?.snapshotOptions]);

  return { data, loading, error };
}
