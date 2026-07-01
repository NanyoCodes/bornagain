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
let firebaseServices: FirebaseServices | null = null;

export function initializeFirebase(): FirebaseServices {
  // Return existing services if already initialized on the client.
  if (typeof window !== 'undefined' && firebaseServices) {
    return firebaseServices;
  }
  
  const existingApps = getApps();
  const app = existingApps.length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  let firestore: Firestore;
  // Firestore must be initialized before other services that might implicitly call getFirestore()
  if (typeof window !== 'undefined') {
    try {
      // Attempt to initialize with long polling for proxy/station compatibility.
      // This is a known fix for "INTERNAL ASSERTION FAILED" in proxied environments.
      // experimentalAutoDetectLongPolling: false ensures we don't try standard transport first.
      firestore = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: false,
      });
    } catch (e: any) {
      // If Firestore is already initialized, initializeFirestore throws an error.
      // We then get the existing instance.
      firestore = getFirestore(app);
    }
  } else {
    // On the server (SSR), use standard initialization.
    firestore = getFirestore(app);
  }

  const auth = getAuth(app);
  
  // Correctly passing the storage bucket URL with gs:// prefix to resolve permission issues.
  // Standard Firebase Storage initialization requires the full bucket URL for custom configurations.
  const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
  
  const services = { app, auth, firestore, storage };

  if (typeof window !== 'undefined') {
    firebaseServices = services;
  }

  return services;
}
