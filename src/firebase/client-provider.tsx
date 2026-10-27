'use client';

/**
 * @fileOverview This file provides the global Firebase client-side context.
 * It ensures that Firebase services are initialized and that authentication
 * persistence is set to 'local' so users remain logged in across sessions.
 */

import { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { initializeFirebase } from './init';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { FirebaseProvider } from './provider';
import { useUser } from './auth/use-user';
import { useDoc } from './firestore/use-doc';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';
import { BirthdayChecker } from '@/components/common/birthday-checker';
import { PushNotificationManager } from '@/components/common/push-notification-manager';

const { app, auth, firestore, storage, messaging } = initializeFirebase();

interface ProfileContextValue {
  userProfile: UserProfile | null;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextValue>({ userProfile: null, loading: true });

export function useUserProfile() {
  return useContext(ProfileContext);
}

function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  
  const userDocRef = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid]);

  const { data: userProfile, loading } = useDoc<UserProfile>(userDocRef);

  // Memoize context value to prevent infinite render loops
  const contextValue = useMemo(() => ({ userProfile, loading }), [userProfile, loading]);

  return (
    <ProfileContext.Provider value={contextValue}>
      <BirthdayChecker />
      <PushNotificationManager />
      {children}
    </ProfileContext.Provider>
  );
}

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [isPersistenceSet, setIsPersistenceSet] = useState(false);

  useEffect(() => {
    const configureAuth = async () => {
      if (auth) {
        try {
          // Explicitly set persistence to local so the app remembers the user
          await setPersistence(auth, browserLocalPersistence);
        } catch (err) {
          console.error('Failed to set auth persistence:', err);
        } finally {
          setIsPersistenceSet(true);
        }
      } else {
        setIsPersistenceSet(true);
      }
    };

    configureAuth();
  }, []);

  // Memoize context value to prevent infinite render loops in child components
  const firebaseValue = useMemo(() => ({ app, auth, firestore, storage, messaging }), []);

  // We wait for persistence to be configured before rendering the app
  // to prevent potential session loss or race conditions on the first load.
  if (!isPersistenceSet) {
    return null; 
  }

  return (
    <FirebaseProvider value={firebaseValue}>
      <ProfileProvider>
        <FirebaseErrorListener />
        {children}
      </ProfileProvider>
    </FirebaseProvider>
  );
}
