'use client';

import { initializeFirebase } from '.';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { FirebaseProvider } from './provider';

const { app, auth, firestore } = initializeFirebase();

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseProvider value={{ app, auth, firestore }}>
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
}
