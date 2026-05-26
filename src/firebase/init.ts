import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
};

// Use a module-level variable to store the initialized services.
// This is a more robust singleton pattern for Next.js hot-reloading.
let firebaseServices: FirebaseServices | null = null;

export function initializeFirebase(): FirebaseServices {
  if (firebaseServices) {
    return firebaseServices;
  }
  
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  
  // Use initializeFirestore to enable experimentalForceLongPolling.
  // This is a critical fix for "Could not reach backend" errors in proxied environments.
  const firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
  
  const storage = getStorage(app);
  
  firebaseServices = { app, auth, firestore, storage };

  return firebaseServices;
}
