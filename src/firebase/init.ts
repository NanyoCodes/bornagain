import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, type Firestore, getFirestore as getExistingFirestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getMessaging, type Messaging } from 'firebase/messaging';
import { firebaseConfig } from './config';

type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
  messaging: Messaging | null;
};

// Use a module-level variable to store the initialized services as a singleton.
let firebaseServices: FirebaseServices | null = null;

/**
 * initializeFirebase
 * Implements a robust singleton pattern to prevent "INTERNAL ASSERTION FAILED" errors.
 * Forces long-polling and disables auto-detection for compatibility with proxied workstation environments.
 */
export function initializeFirebase(): FirebaseServices {
  // Return existing services if already initialized on the client to avoid "ID: ca9" assertion failures.
  if (typeof window !== 'undefined' && firebaseServices) {
    return firebaseServices;
  }
  
  const existingApps = getApps();
  const app = existingApps.length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  let firestore: Firestore;
  
  if (typeof window !== 'undefined') {
    // On the client, we must ensure initializeFirestore is only called once per app instance.
    try {
      // experimentalForceLongPolling is the robust fix for connectivity timeouts in proxied environments.
      // experimentalAutoDetectLongPolling: false is crucial to prevent the ID: ca9 assertion error.
      firestore = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: false,
      });
    } catch (e: any) {
      // If Firestore is already initialized, initializeFirestore throws an error.
      // We then get the existing instance.
      firestore = getExistingFirestore(app);
    }
  } else {
    // On the server (SSR), use standard initialization.
    firestore = getExistingFirestore(app);
  }

  const auth = getAuth(app);
  const storage = getStorage(app);
  
  // Messaging only works in the browser and if supported
  let messaging: Messaging | null = null;
  if (typeof window !== 'undefined') {
      try {
          messaging = getMessaging(app);
      } catch (err) {
          console.warn("Firebase Messaging initialization failed. Likely unsupported in this browser environment.", err);
      }
  }
  
  const services = { app, auth, firestore, storage, messaging };

  if (typeof window !== 'undefined') {
    firebaseServices = services;
  }

  return services;
}