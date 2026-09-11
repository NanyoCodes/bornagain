'use client';

import { useState, useEffect, useRef } from 'react';
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
    // We use a defensive check for isEqual to avoid TypeErrors in proxied environments
    if (activeRef.current && (docRef as any).isEqual && (docRef as any).isEqual(activeRef.current)) {
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
      (err) => {
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
  }, [docRef, user, JSON.stringify(options?.snapshotOptions)]);

  return { data, loading, error };
}
