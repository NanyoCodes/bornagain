'use client';

import { createContext, useContext, useMemo, useEffect } from 'react';
import { initializeFirebase } from './init';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { FirebaseProvider } from './provider';
import { useUser } from './auth/use-user';
import { useDoc } from './firestore/use-doc';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';

const { app, auth, firestore, storage } = initializeFirebase();

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

  return (
    <ProfileContext.Provider value={{ userProfile, loading }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (auth) {
      setPersistence(auth, browserLocalPersistence).catch((err) => {
        console.error('Failed to set auth persistence:', err);
      });
    }
  }, []);

  return (
    <FirebaseProvider value={{ app, auth, firestore, storage }}>
      <ProfileProvider>
        <FirebaseErrorListener />
        {children}
      </ProfileProvider>
    </FirebaseProvider>
  );
}
