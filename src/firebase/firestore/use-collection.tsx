'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Query, DocumentData, SnapshotOptions, FirestoreError } from 'firebase/firestore';
import { onSnapshot, type DocumentChange } from 'firebase/firestore';
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

  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      setData(null);
      isInitialLoad.current = true;
      return;
    }

    setLoading(true);
    
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        if (isInitialLoad.current) {
          // On the first load, populate the entire dataset
          const initialData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(options?.snapshotOptions) } as T));
          setData(initialData);
          isInitialLoad.current = false;
        } else {
          // On subsequent updates, process only the changes
          setData(prevData => {
            if (!prevData) return []; // Should not happen after initial load, but for type safety
            
            const newData = [...prevData];
            const changes = snapshot.docChanges();

            for (const change of changes) {
              const changeData = { id: change.doc.id, ...change.doc.data(options?.snapshotOptions) } as T;
              const index = newData.findIndex(item => item.id === change.doc.id);

              switch (change.type) {
                case 'added':
                  // This handles new documents added to the collection that match the query.
                  // It also handles the local echo of a newly created document.
                  if (index === -1) {
                    newData.push(changeData);
                  }
                  break;
                case 'modified':
                  // An existing document was modified
                  if (index !== -1) {
                    newData[index] = changeData;
                  }
                  break;
                case 'removed':
                  // A document was deleted
                  if (index !== -1) {
                    newData.splice(index, 1);
                  }
                  break;
              }
            }
            return newData;
          });
        }
        
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
        isInitialLoad.current = true;
      }
    );

    // Clean up the listener when the component unmounts or dependencies change.
    return () => {
      unsubscribe();
      isInitialLoad.current = true; // Reset on query change
    };
  // The dependency array is intentionally simple. We don't want to re-run this effect
  // for every change in snapshotOptions, as that would re-create the listener.
  // The options are passed directly to `doc.data()`, which uses them on-the-fly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return { data, loading, error };
}
